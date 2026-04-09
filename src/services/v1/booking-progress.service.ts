import type {
  BookingItemStatus,
  BookingProgressStatus,
} from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { BookingResponse } from '@/types/booking.types';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from '@/utils/errors';
import { BookingRealtimeService } from './booking-realtime.service';
import {
  DELIVERY_STAFF_POSITIONS,
  MANAGER_STAFF_POSITIONS,
  buildBookingMeta,
  getPreparationFallbackPosition,
  mapBookingResponse,
  normalizeStaffPosition,
} from './booking-view.service';

type BookingActorSnapshot = {
  staffId: string | null;
  fullName: string | null;
  role: string | null;
};

type ProgressBooking = any;

export class BookingProgressService {
  private static readonly DELIVERY_CLAIM_WINDOW_MS = 2 * 60 * 1000;
  private static readonly MONITOR_INTERVAL_MS = 30 * 1000;
  private static monitorHandle: ReturnType<typeof setInterval> | null = null;

  private static readonly progressBookingInclude = {
    client: {
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        username: true,
      },
    },
    service: {
      select: {
        id: true,
        name: true,
        duration: true,
        price: true,
        businessId: true,
      },
    },
    staff: {
      select: {
        id: true,
        fullName: true,
        position: true,
        phoneNumber: true,
      },
    },
    table: {
      select: {
        id: true,
        tableNumber: true,
        tableColumns: true,
        businessId: true,
      },
    },
    items: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            businessId: true,
            duration: true,
            category: true,
            type: true,
          },
        },
      },
    },
  } as const;

  private static async loadBooking(
    bookingId: string,
    tx: any = prisma,
  ): Promise<ProgressBooking> {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: this.progressBookingInclude,
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return booking;
  }

  private static async getActiveStaffSnapshot(staffId: string) {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        fullName: true,
        businessId: true,
        position: true,
        isActive: true,
      },
    });

    if (!staff || !staff.isActive) {
      throw new AuthorizationError('Staff not found or inactive');
    }

    return staff;
  }

  private static chooseResponsiblePosition(
    positions: string[],
    category?: string | null,
  ): string {
    const fallback = getPreparationFallbackPosition(category);
    const normalizedPositions = Array.from(
      new Set(positions.map((position) => normalizeStaffPosition(position)).filter(Boolean)),
    );

    if (normalizedPositions.includes(fallback)) {
      return fallback;
    }

    return normalizedPositions[0] || fallback;
  }

  static async buildItemProgressSnapshots(productIds: string[]) {
    if (productIds.length === 0) {
      return new Map<
        string,
        { durationSnapshot: number; responsiblePosition: string }
      >();
    }

    const services = await prisma.service.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        duration: true,
        category: true,
        staff: {
          where: {
            staff: {
              isActive: true,
            },
          },
          select: {
            staff: {
              select: {
                position: true,
              },
            },
          },
        },
      },
    });

    return new Map(
      services.map((service) => [
        service.id,
        {
          durationSnapshot: Number(service.duration || 0),
          responsiblePosition: this.chooseResponsiblePosition(
            service.staff.map((item) => item.staff.position),
            service.category,
          ),
        },
      ]),
    );
  }

  private static createActorSnapshot(staff: {
    id: string;
    fullName: string;
    position: string;
  }): BookingActorSnapshot {
    return {
      staffId: staff.id,
      fullName: staff.fullName,
      role: normalizeStaffPosition(staff.position),
    };
  }

  private static async recalculateBookingProgress(
    bookingId: string,
    tx: any = prisma,
  ): Promise<{
    booking: ProgressBooking;
    previousProgressStatus: string | null;
  }> {
    const booking = await this.loadBooking(bookingId, tx);
    const previousProgressStatus = booking.progressStatus ?? null;
    const nextProgressStatus = buildBookingMeta(booking).progressStatus;
    const updateData: Record<string, unknown> = {};

    if (previousProgressStatus !== nextProgressStatus) {
      updateData.progressStatus = nextProgressStatus;
    }

    if (nextProgressStatus === 'READY_FOR_DELIVERY' && !booking.readyForDeliveryAt) {
      updateData.readyForDeliveryAt = new Date();
      updateData.deliveryClaimWarningSentAt = null;
    }

    if (nextProgressStatus === 'PENDING' && booking.readyForDeliveryAt) {
      updateData.readyForDeliveryAt = null;
      updateData.deliveryClaimWarningSentAt = null;
    }

    if (Object.keys(updateData).length === 0) {
      return {
        booking,
        previousProgressStatus,
      };
    }

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: this.progressBookingInclude,
    });

    return {
      booking: updatedBooking,
      previousProgressStatus,
    };
  }

  private static async verifyPreparationAccess(
    staff: {
      id: string;
      businessId: string;
      position: string;
    },
    booking: ProgressBooking,
    item: any,
    tx: any,
  ): Promise<void> {
    if (staff.businessId !== booking.businessId) {
      throw new AuthorizationError('Booking does not belong to your business');
    }

    const serviceAssignment = await tx.staffService.findFirst({
      where: {
        staffId: staff.id,
        serviceId: item.productId,
      },
      select: {
        id: true,
      },
    });

    if (serviceAssignment) {
      return;
    }

    const existingAssignmentsCount = await tx.staffService.count({
      where: { serviceId: item.productId },
    });

    const responsiblePosition = normalizeStaffPosition(
      item.responsiblePosition ??
        item.product?.staff?.[0]?.staff?.position ??
        getPreparationFallbackPosition(item.product?.category),
    );

    if (
      existingAssignmentsCount === 0 &&
      normalizeStaffPosition(staff.position) === responsiblePosition
    ) {
      return;
    }

    throw new AuthorizationError(
      'You can only update preparation items assigned to your services',
    );
  }

  private static validateItemProgressTransition(
    currentStatus: string,
    nextStatus: string,
  ): void {
    const normalizedCurrent = String(currentStatus || 'PENDING').toUpperCase();
    const normalizedNext = String(nextStatus || '').toUpperCase();

    if (normalizedCurrent === normalizedNext) {
      return;
    }

    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PREPARING', 'READY', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[normalizedCurrent]?.includes(normalizedNext)) {
      throw new ConflictError('Invalid preparation status transition');
    }
  }

  static async updateBookingItemStatus(
    bookingId: string,
    itemId: string,
    nextStatus: BookingItemStatus,
    staffPayload: { staffId?: string | null },
  ): Promise<BookingResponse> {
    if (!staffPayload?.staffId) {
      throw new AuthorizationError('Staff authentication required');
    }

    const staff = await this.getActiveStaffSnapshot(staffPayload.staffId);

    const result = await prisma.$transaction(async (tx) => {
      const booking = await this.loadBooking(bookingId, tx);

      if (
        ['CANCELLED', 'COMPLETED'].includes(String(booking.status || '').toUpperCase()) ||
        ['CANCELLED', 'DELIVERED'].includes(
          String(booking.progressStatus || '').toUpperCase(),
        )
      ) {
        throw new ConflictError('Booking is already finalized');
      }

      const item = booking.items.find((entry: any) => entry.id === itemId);
      if (!item) {
        throw new NotFoundError('Booking item not found');
      }

      await this.verifyPreparationAccess(staff, booking, item, tx);
      this.validateItemProgressTransition(item.status, nextStatus);

      const itemUpdateData: Record<string, unknown> = {
        status: nextStatus,
      };

      if (nextStatus === 'PREPARING' && !item.startedAt) {
        itemUpdateData.startedAt = new Date();
      }

      if (nextStatus === 'READY') {
        itemUpdateData.readyAt = new Date();
        itemUpdateData.preparedByStaffId = staff.id;
        itemUpdateData.preparedByName = staff.fullName;
        itemUpdateData.preparedByRole = normalizeStaffPosition(staff.position);
      }

      const updatedItem = await tx.bookingItem.update({
        where: { id: itemId },
        data: itemUpdateData,
      });

      const recalculated = await this.recalculateBookingProgress(bookingId, tx);

      return {
        updatedItem,
        booking: recalculated.booking,
        previousProgressStatus: recalculated.previousProgressStatus,
        responsibleRole: normalizeStaffPosition(
          item.responsiblePosition ??
            getPreparationFallbackPosition(item.product?.category),
        ),
      };
    });

    BookingRealtimeService.emitFromBooking(result.booking, {
      action: 'item_updated',
      itemId: result.updatedItem.id,
      previousProgressStatus: result.previousProgressStatus,
      targetRoles: result.responsibleRole ? [result.responsibleRole] : [],
    });

    if (
      result.previousProgressStatus !== result.booking.progressStatus &&
      result.booking.progressStatus === 'READY_FOR_DELIVERY'
    ) {
      BookingRealtimeService.emitFromBooking(result.booking, {
        action: 'ready_for_delivery',
        previousProgressStatus: result.previousProgressStatus,
        targetRoles: ['MANAGER', 'WAITER', 'RUNNER'],
      });
    } else if (result.previousProgressStatus !== result.booking.progressStatus) {
      BookingRealtimeService.emitFromBooking(result.booking, {
        action: 'progress_updated',
        previousProgressStatus: result.previousProgressStatus,
      });
    }

    return mapBookingResponse(result.booking);
  }

  static async claimDelivery(
    bookingId: string,
    staffPayload: { staffId?: string | null },
  ): Promise<BookingResponse> {
    if (!staffPayload?.staffId) {
      throw new AuthorizationError('Staff authentication required');
    }

    const staff = await this.getActiveStaffSnapshot(staffPayload.staffId);
    const normalizedPosition = normalizeStaffPosition(staff.position);

    if (!DELIVERY_STAFF_POSITIONS.has(normalizedPosition)) {
      throw new AuthorizationError('Only waiter or runner can claim delivery');
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await this.loadBooking(bookingId, tx);
      const currentProgressStatus = buildBookingMeta(booking).progressStatus;

      if (staff.businessId !== booking.businessId) {
        throw new AuthorizationError('Booking does not belong to your business');
      }

      if (currentProgressStatus !== 'READY_FOR_DELIVERY') {
        throw new ConflictError('Booking is not ready for delivery');
      }

      if (booking.deliveryAssignedStaffId) {
        throw new ConflictError('Delivery has already been claimed');
      }

      const actor = this.createActorSnapshot(staff);

      const updateResult = await tx.booking.updateMany({
        where: {
          id: bookingId,
          deliveryAssignedStaffId: null,
          progressStatus: 'READY_FOR_DELIVERY' as never,
        },
        data: {
          progressStatus: 'DELIVERING',
          deliveryAssignedStaffId: actor.staffId,
          deliveryAssignedRole: actor.role,
          deliveryAssignedName: actor.fullName,
          deliveryClaimedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError('Delivery has already been claimed');
      }

      const updatedBooking = await this.loadBooking(bookingId, tx);

      return {
        booking: updatedBooking,
        previousProgressStatus: booking.progressStatus ?? currentProgressStatus,
      };
    });

    BookingRealtimeService.emitFromBooking(result.booking, {
      action: 'delivery_claimed',
      previousProgressStatus: result.previousProgressStatus,
      targetRoles: ['MANAGER', 'WAITER', 'RUNNER'],
    });

    return mapBookingResponse(result.booking);
  }

  static async completeDelivery(
    bookingId: string,
    staffPayload: { staffId?: string | null },
  ): Promise<BookingResponse> {
    if (!staffPayload?.staffId) {
      throw new AuthorizationError('Staff authentication required');
    }

    const staff = await this.getActiveStaffSnapshot(staffPayload.staffId);
    const normalizedPosition = normalizeStaffPosition(staff.position);

    if (!DELIVERY_STAFF_POSITIONS.has(normalizedPosition)) {
      throw new AuthorizationError('Only waiter or runner can complete delivery');
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await this.loadBooking(bookingId, tx);
      const currentProgressStatus = buildBookingMeta(booking).progressStatus;

      if (booking.businessId !== staff.businessId) {
        throw new AuthorizationError('Booking does not belong to your business');
      }

      if (currentProgressStatus !== 'DELIVERING') {
        throw new ConflictError('Booking is not currently being delivered');
      }

      if (booking.deliveryAssignedStaffId !== staff.id) {
        throw new AuthorizationError(
          'Only the assigned waiter or runner can mark delivery as complete',
        );
      }

      const actor = this.createActorSnapshot(staff);
      const updateResult = await tx.booking.updateMany({
        where: {
          id: bookingId,
          deliveryAssignedStaffId: staff.id,
          progressStatus: 'DELIVERING' as never,
        },
        data: {
          progressStatus: 'DELIVERED',
          deliveredAt: new Date(),
          deliveredByStaffId: actor.staffId,
          deliveredByRole: actor.role,
          deliveredByName: actor.fullName,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError('Booking delivery state changed');
      }

      const updatedBooking = await this.loadBooking(bookingId, tx);

      return {
        booking: updatedBooking,
        previousProgressStatus: booking.progressStatus ?? currentProgressStatus,
      };
    });

    BookingRealtimeService.emitFromBooking(result.booking, {
      action: 'delivered',
      previousStatus: result.booking.status,
      previousProgressStatus: result.previousProgressStatus,
      targetRoles: ['MANAGER', 'WAITER', 'RUNNER'],
    });

    return mapBookingResponse(result.booking);
  }

  private static async processPreparationDelayWarnings(): Promise<void> {
    const bookings = await prisma.booking.findMany({
      where: {
        progressStatus: {
          in: ['PENDING', 'PREPARING'],
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: this.progressBookingInclude,
    });

    for (const booking of bookings) {
      const meta = buildBookingMeta(booking);
      if (!meta.isDelayedPreparation || booking.preparationDelayWarningSentAt) {
        continue;
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          preparationDelayWarningSentAt: new Date(),
        },
        include: this.progressBookingInclude,
      });

      BookingRealtimeService.emitFromBooking(updatedBooking, {
        action: 'warning_preparation_delay',
        previousProgressStatus: booking.progressStatus,
        targetRoles: ['MANAGER'],
        warningType: 'PREPARATION_DELAY',
      });
    }
  }

  private static async processDeliveryClaimWarnings(): Promise<void> {
    const threshold = new Date(Date.now() - this.DELIVERY_CLAIM_WINDOW_MS);
    const bookings = await prisma.booking.findMany({
      where: {
        progressStatus: 'READY_FOR_DELIVERY',
        deliveryAssignedStaffId: null,
        readyForDeliveryAt: {
          lte: threshold,
        },
        deliveryClaimWarningSentAt: null,
      },
      include: this.progressBookingInclude,
    });

    for (const booking of bookings) {
      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          deliveryClaimWarningSentAt: new Date(),
        },
        include: this.progressBookingInclude,
      });

      BookingRealtimeService.emitFromBooking(updatedBooking, {
        action: 'warning_delivery_unclaimed',
        previousProgressStatus: booking.progressStatus,
        targetRoles: ['MANAGER'],
        warningType: 'DELIVERY_UNCLAIMED',
      });
    }
  }

  static async processWarningQueues(): Promise<void> {
    await Promise.all([
      this.processPreparationDelayWarnings(),
      this.processDeliveryClaimWarnings(),
    ]);
  }

  static startMonitor(): void {
    if (this.monitorHandle) {
      return;
    }

    void this.processWarningQueues().catch((error) => {
      console.error('Initial booking progress monitor error:', error);
    });

    this.monitorHandle = setInterval(() => {
      void this.processWarningQueues().catch((error) => {
        console.error('Booking progress monitor error:', error);
      });
    }, this.MONITOR_INTERVAL_MS);
  }
}
