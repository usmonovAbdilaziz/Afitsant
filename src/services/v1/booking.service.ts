import type { Booking, Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  AvailableSlotsRequest,
  AvailableSlotsResponse,
  BookingFilterDto,
  BookingListQueryDto,
  BookingResponse,
  CreateClientBookingDto,
  CreateBookingDto,
  PaginatedBookingListResponse,
  StaffAvailability,
  UpdateBookingDto,
} from '@/types/booking.types';
import {
  ConflictError,
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from '@/utils/errors';
import { BookingRealtimeService } from './booking-realtime.service';
import { BookingProgressService } from './booking-progress.service';
import { NotificationService } from './notification.service';
import {
  DELIVERY_STAFF_POSITIONS,
  mapBookingResponse,
  normalizeStaffPosition as normalizeBookingPosition,
} from './booking-view.service';

export class BookingService {
  private static readonly ELEVATED_STAFF_POSITIONS = new Set([
    'MANAGER',
    'CASHIER',
  ]);

  private static readonly BUSINESS_OWNER_CONFIRMER_TYPE = 'BUSINESS_OWNER';

  private static resolveBookingPrice(booking: any): string {
    if (booking?.price != null) {
      return String(booking.price);
    }

    const total =
      booking?.items?.reduce(
        (sum: number, item: any) =>
          sum + Number(item.priceSnapshot || 0) * Number(item.qty || 0),
        0,
      ) ?? 0;

    return String(total);
  }

  private static bookingListInclude = {
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

  private static async resolvePrimaryStaffId(
    serviceId: string,
  ): Promise<string> {
    const linkedStaff = await prisma.staffService.findFirst({
      where: {
        serviceId,
        staff: {
          isActive: true,
        },
      },
      select: {
        staffId: true,
      },
    });

    if (linkedStaff?.staffId) {
      return linkedStaff.staffId;
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { businessId: true },
    });

    if (!service) {
      throw new NotFoundError('Product not found');
    }

    const fallbackStaff = await prisma.staff.findFirst({
      where: {
        businessId: service.businessId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!fallbackStaff) {
      throw new ConflictError('Active staff not found for this business');
    }

    return fallbackStaff.id;
  }

  private static mapBookingRow(booking: any): BookingResponse {
    return mapBookingResponse(booking);
  }

  private static normalizeStaffPosition(position?: string | null): string {
    return normalizeBookingPosition(position);
  }

  private static isElevatedStaffPosition(position?: string | null): boolean {
    return this.ELEVATED_STAFF_POSITIONS.has(
      this.normalizeStaffPosition(position),
    );
  }

  private static async resolveBookingStatusActor(
    businessId: string,
    userPayload?: any,
    staffPayload?: any,
  ): Promise<{
    confirmedByType: string;
    confirmedByName: string;
    confirmedByUserId: string | null;
    confirmedByStaffId: string | null;
  } | null> {
    if (staffPayload?.staffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: staffPayload.staffId },
        select: {
          id: true,
          fullName: true,
          position: true,
          businessId: true,
          isActive: true,
        },
      });

      const normalizedPosition = this.normalizeStaffPosition(staff?.position);
      if (
        staff?.isActive &&
        normalizedPosition &&
        this.ELEVATED_STAFF_POSITIONS.has(normalizedPosition) &&
        staff.businessId === businessId
      ) {
        return {
          confirmedByType: normalizedPosition,
          confirmedByName: staff.fullName,
          confirmedByUserId: null,
          confirmedByStaffId: staff.id,
        };
      }
    }

    if (
      userPayload?.businessId === businessId &&
      (userPayload?.role === 'BUSINESS' || userPayload?.userType === 'BUSINESS')
    ) {
      const ownerId = userPayload.userId || userPayload.sub || null;
      const owner =
        ownerId == null
          ? null
          : await prisma.user.findUnique({
              where: { id: ownerId },
              select: { id: true, fullName: true },
            });

      return {
        confirmedByType: this.BUSINESS_OWNER_CONFIRMER_TYPE,
        confirmedByName: owner?.fullName || 'Business owner',
        confirmedByUserId: owner?.id || ownerId,
        confirmedByStaffId: null,
      };
    }

    return null;
  }

  private static async getAssignedServiceIdsForStaff(
    staffId: string,
  ): Promise<string[]> {
    const assignments = await prisma.staffService.findMany({
      where: { staffId },
      select: { serviceId: true },
    });

    return assignments.map((assignment) => assignment.serviceId);
  }

  private static scopeBookingForStaff(
      booking: BookingResponse,
      staffId: string,
      assignedServiceIds: readonly string[],
      normalizedPosition: string,
    ): BookingResponse {
    const scopedServiceIds = new Set(assignedServiceIds);
    const scopedItems =
      booking.items?.filter((item) => {
        const responsiblePosition = this.normalizeStaffPosition(
          item.responsiblePosition,
        );
        return (
          scopedServiceIds.has(item.productId) ||
          responsiblePosition === normalizedPosition
        );
      }) ?? [];

    if (scopedItems.length > 0) {
      const scopedPrice = scopedItems.reduce(
        (sum, item) => sum + Number(item.priceSnapshot || 0) * Number(item.qty || 0),
        0,
      );

      return {
        ...booking,
        items: scopedItems,
        price: String(scopedPrice),
      };
    }

    const hasScopedPrimaryService = scopedServiceIds.has(booking.serviceId);
    const isDirectlyAssigned = booking.staffId === staffId;

    if (hasScopedPrimaryService && (booking.items?.length ?? 0) === 0) {
      return {
        ...booking,
        price:
          booking.service?.price != null
            ? String(booking.service.price)
            : booking.price,
      };
    }

      if (isDirectlyAssigned) {
        return booking;
      }

      if (assignedServiceIds.length === 0) {
        return {
          ...booking,
          items: [],
          price: '0',
        };
      }

      return {
        ...booking,
        items: [],
        price: '0',
      };
  }

  private static buildDateWhere(
    query: BookingListQueryDto,
  ): Prisma.BookingWhereInput {
    const where: Prisma.BookingWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.priceStatus) {
      where.priceStatus = query.priceStatus;
    }

    if (query.progressStatus) {
      where.progressStatus = query.progressStatus as never;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = query.dateFrom;
      }
      if (query.dateTo) {
        where.createdAt.lte = query.dateTo;
      }
    }

    return where;
  }

  private static async paginateBookings(
    where: Prisma.BookingWhereInput,
    query: BookingListQueryDto,
  ): Promise<PaginatedBookingListResponse> {
    const prismaAny = prisma as any;
    const page = query.page ?? 1;
    const size = query.size ?? 10;
    const [items, total] = await Promise.all([
      prismaAny.booking.findMany({
        where,
        include: this.bookingListInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      prismaAny.booking.count({ where }),
    ]);

    return {
      items: items.map((item: any) => this.mapBookingRow(item)),
      page,
      size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    };
  }

  static async createClientBooking(
    clientId: string,
    data: CreateClientBookingDto,
  ): Promise<BookingResponse> {
    const table = await prisma.table.findUnique({
      where: { id: data.tableId },
      select: { id: true, businessId: true, status: true },
    });

    if (!table) {
      throw new NotFoundError('Table not found');
    }

    const productIds = Array.from(
      new Set(data.items.map((item) => item.productId)),
    );
    const products = await prisma.service.findMany({
      where: {
        id: { in: productIds },
        businessId: table.businessId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        businessId: true,
        duration: true,
        category: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundError(
        'One or more products were not found for this table',
      );
    }

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );
    const itemProgressSnapshots =
      await BookingProgressService.buildItemProgressSnapshots(productIds);
    const totalPrice = data.items.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundError(`Product not found: ${item.productId}`);
      }

      return sum + Number(item.priceSnapshot ?? product.price) * item.qty;
    }, 0);
    const primaryProduct = productMap.get(data.items[0].productId);

    if (!primaryProduct) {
      throw new NotFoundError('Primary product not found');
    }

    const primaryStaffId = await this.resolvePrimaryStaffId(primaryProduct.id);
    const prismaAny = prisma as any;
    let bookingAction: 'created' | 'updated' = 'created';
    let reusedExistingBooking = false;

    const booking = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;

      if (data.idempotencyKey) {
        const existing = await txAny.booking.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
          include: this.bookingListInclude,
        });

        if (existing) {
          reusedExistingBooking = true;
          return existing;
        }
      }

      // Reuse the latest unpaid bill inside the same business, even if it was
      // already confirmed but not yet paid.
      const existingPendingBooking = await txAny.booking.findFirst({
        where: {
          clientId,
          businessId: table.businessId,
          priceStatus: 'PENDING',
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });

      const newItemsData = data.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new NotFoundError(`Product not found: ${item.productId}`);
        }

        const progressSnapshot = itemProgressSnapshots.get(item.productId);
        return {
          productId: item.productId,
          qty: item.qty,
          priceSnapshot: Number(item.priceSnapshot ?? product.price),
          durationSnapshot: progressSnapshot?.durationSnapshot ?? product.duration,
          responsiblePosition:
            progressSnapshot?.responsiblePosition ?? 'COOK',
          note: item.note,
        };
      });

      if (existingPendingBooking) {
        bookingAction = 'updated';
        // Append items and calculate combined total price
        const existingTotal = existingPendingBooking.items.reduce(
          (sum: number, item: any) =>
            sum + Number(item.priceSnapshot) * item.qty,
          0,
        );
        const newTotal = newItemsData.reduce(
          (sum: number, item: any) => sum + item.priceSnapshot * item.qty,
          0,
        );
        const finalTotal = existingTotal + newTotal;
        const existingItemStatuses = (existingPendingBooking.items ?? []).map(
          (item: any) => String(item.status || 'PENDING').toUpperCase(),
        );
        const nextProgressStatus = existingItemStatuses.some((itemStatus: string) =>
          ['PREPARING', 'READY'].includes(itemStatus),
        )
          ? 'PREPARING'
          : 'PENDING';

        return txAny.booking.update({
          where: { id: existingPendingBooking.id },
          data: {
            price: String(finalTotal),
            priceStatus: 'PENDING',
            status: 'PENDING',
            progressStatus: nextProgressStatus,
            items: {
              create: newItemsData,
            },
            notes: data.note
              ? existingPendingBooking.notes
                ? `${existingPendingBooking.notes}\n${data.note}`
                : data.note
              : existingPendingBooking.notes,
            confirmedAt: null,
            confirmedByType: null,
            confirmedByName: null,
            confirmedByUserId: null,
            confirmedByStaffId: null,
            readyForDeliveryAt: null,
            deliveryClaimedAt: null,
            deliveryAssignedStaffId: null,
            deliveryAssignedRole: null,
            deliveryAssignedName: null,
            deliveredAt: null,
            deliveredByStaffId: null,
            deliveredByRole: null,
            deliveredByName: null,
            preparationDelayWarningSentAt: null,
            deliveryClaimWarningSentAt: null,
            ...(data.idempotencyKey && { idempotencyKey: data.idempotencyKey }),
          },
          include: this.bookingListInclude,
        });
      }

      return txAny.booking.create({
        data: {
          businessId: table.businessId,
          clientId,
          serviceId: primaryProduct.id,
          staffId: primaryStaffId,
          tableId: table.id,
          price: String(totalPrice),
          idempotencyKey: data.idempotencyKey,
          notes: data.note,
          status: 'PENDING',
          items: {
            create: newItemsData,
          },
        },
        include: this.bookingListInclude,
      });
    });

    if (!reusedExistingBooking) {
      BookingRealtimeService.emitFromBooking(booking, {
        action: bookingAction,
        targetRoles: Array.from(
          new Set(
            data.items
              .map((item) => itemProgressSnapshots.get(item.productId)?.responsiblePosition)
              .filter(Boolean) as string[],
          ),
        ),
      });
    }

    return this.mapBookingRow(booking);
  }

  static async getClientBookingsPaginated(
    clientId: string,
    query: BookingListQueryDto,
  ): Promise<PaginatedBookingListResponse> {
    const where: Prisma.BookingWhereInput = {
      clientId,
      ...this.buildDateWhere(query),
    };

    return this.paginateBookings(where, query);
  }

  static async getBusinessBookingsPaginated(
    businessId: string,
    query: BookingListQueryDto,
  ): Promise<PaginatedBookingListResponse> {
    const where: Prisma.BookingWhereInput = {
      businessId,
      ...this.buildDateWhere(query),
    };

    return this.paginateBookings(where, query);
  }

  static async getStaffBookingsPaginated(
    staffId: string,
    query: BookingListQueryDto,
  ): Promise<PaginatedBookingListResponse> {
    const where: Prisma.BookingWhereInput = {
      staffId,
      ...this.buildDateWhere(query),
    };

    return this.paginateBookings(where, query);
  }

  /**
   * Get bookings by staff role.
   *
   * - MANAGER / CASHIER → all bookings for the staff's business
   * - Other roles        → only bookings assigned to the authenticated staff
   *
   * When `bookingId` is provided the method returns a single-item page
   * (still wrapped in PaginatedBookingListResponse for consistency).
   */
  static async getStaffRoleBookings(
    staffId: string,
    businessId: string,
    position: string,
    query: BookingListQueryDto & { bookingId?: string; phoneNumber?: string },
    options?: { unpaginated?: boolean },
  ): Promise<PaginatedBookingListResponse> {
    const normalizedPosition = this.normalizeStaffPosition(position);
    const isElevated = this.isElevatedStaffPosition(position);
    const isDeliveryRole = DELIVERY_STAFF_POSITIONS.has(normalizedPosition);
    const isPreparationRole = ['COOK', 'BARMEN'].includes(normalizedPosition);
    const assignedServiceIds = isElevated
      ? []
      : await this.getAssignedServiceIdsForStaff(staffId);

    const where: Prisma.BookingWhereInput = {
      businessId,
      ...this.buildDateWhere(query),
    };

    if (isDeliveryRole) {
      where.OR = [
        { progressStatus: 'READY_FOR_DELIVERY' as never },
        {
          progressStatus: 'DELIVERING' as never,
          deliveryAssignedStaffId: staffId,
        },
        {
          progressStatus: 'DELIVERED' as never,
          deliveredByStaffId: staffId,
        },
      ];
      } else if (!isElevated) {
        where.OR = [
          { staffId },
          {
            items: {
              some: {
                responsiblePosition: normalizedPosition,
              },
            },
          },
          ...(assignedServiceIds.length > 0
            ? [
                { serviceId: { in: assignedServiceIds } },
                {
                  items: {
                  some: {
                    productId: {
                      in: assignedServiceIds,
                    },
                  },
                },
              },
            ]
          : []),
      ];
    }

    if (query.bookingId) {
      where.id = query.bookingId;
    }

    if (query.phoneNumber) {
      where.client = {
        phoneNumber: {
          contains: query.phoneNumber,
          mode: 'insensitive',
        },
      };
    }

    if (
      isPreparationRole &&
      !query.status &&
      !query.progressStatus &&
      !query.bookingId
    ) {
      where.progressStatus = {
        in: ['PENDING', 'PREPARING', 'READY_FOR_DELIVERY'] as never[],
      };
    }

      const mapForRole = (items: any[]) =>
        items.map((item) => {
          const mapped = this.mapBookingRow(item);
          return isElevated || isDeliveryRole
            ? mapped
            : this.scopeBookingForStaff(
                mapped,
                staffId,
                assignedServiceIds,
                normalizedPosition,
              );
        });

    if (options?.unpaginated) {
      const items = await prisma.booking.findMany({
        where,
        include: this.bookingListInclude,
        orderBy: { createdAt: 'desc' },
      });

      const mapped = mapForRole(items as any[]);
      return {
        items: mapped,
        page: 1,
        size: mapped.length,
        total: mapped.length,
        totalPages: 1,
      };
    }

    const page = query.page ?? 1;
    const size = query.size ?? 10;
    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: this.bookingListInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      items: mapForRole(items as any[]),
      page,
      size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    };
  }

  /**
   * Check if client has a booking within 60 minutes of the given start time
   */
  static async checkClientBookingGap(
    clientId: string,
    bookingDate: Date,
    startTime: string,
  ): Promise<boolean> {
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    try {
      const existingBookings = await prisma.booking.findMany({
        where: {
          clientId,
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
      });

      return false;
    } catch (error) {
      console.error('Error in checkClientBookingGap:', error);
      throw error;
    }
  }

  /**
   * Get staff availability for a specific date
   */

  static async getStaffAvailability(
    staffId: string,
    date: string,
  ): Promise<StaffAvailability[]> {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const next = new Date(target);
    next.setDate(next.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        staffId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
      include: {
        service: { select: { businessId: true, id: true } },
      },
    });

    return bookings.map((b) => ({
      id: b.id,
      businessId: b.service?.businessId ?? null,
      clientId: b.clientId,
      serviceId: b.serviceId,
      staffId: b.staffId ?? null,
      tableId: b.tableId ?? null,
      status: b.status,
      notes: b.notes ?? null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
  }

  /**
   * Booking yaratish - Transaction bilan race condition oldini olish
   * Overlap check va create bitta atomic operatsiya ichida bajariladi
   */
  static async create(data: CreateBookingDto): Promise<BookingResponse> {
    // Client mavjudligini tekshirish
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    // Service mavjudligini tekshirish
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: { business: true },
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (service.businessId !== data.businessId) {
      throw new ConflictError('Business and service must belong together');
    }

    // Table mavjudligini tekshirish
    const table = await prisma.table.findUnique({
      where: { id: data.tableId },
    });

    if (!table) {
      throw new NotFoundError('Table not found');
    }

    if (table.businessId !== data.businessId) {
      throw new ConflictError('Table and business must belong together');
    }

    // Staff mavjudligini tekshirish
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
    });

    if (!staff) {
      throw new NotFoundError('Staff not found');
    }

    if (staff.businessId !== service.businessId) {
      throw new ConflictError(
        'Staff and service must belong to the same business',
      );
    }

    // Client interval tekshiruvi (kamida 1 soat gap)
    const hasClientConflict =
      data.bookingDate && data.startTime
        ? await this.checkClientBookingGap(
            data.clientId,
            data.bookingDate,
            data.startTime,
          )
        : false;

    if (hasClientConflict) {
      throw new ConflictError(
        "Siz har bir bron qilishingiz orasida kamida 1 soat vaqt bo'lishi kerak. Iltimos, boshqa vaqt tanlang.",
      );
    }

    // --- WORKING HOURS VALIDATION ---
    // Fetch working hours for validation
    if (data.bookingDate && data.startTime && data.endTime) {
      const dayOfWeek = [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ][new Date(data.bookingDate).getDay()];

      let workingHours: any = null;
      if (data.staffId) {
        workingHours = await prisma.staffWorkingHours.findFirst({
          where: {
            staffId: data.staffId,
            dayOfWeek: dayOfWeek as any,
            isActive: true,
          },
        });
      }

      if (!workingHours) {
        workingHours = await prisma.workingHours.findFirst({
          where: {
            businessId: service.businessId,
            dayOfWeek: dayOfWeek as any,
            isActive: true,
          },
        });
      }

      if (!workingHours || !workingHours.startTime || !workingHours.endTime) {
        throw new ConflictError('Ushbu kunda ish vaqti belgilanmagan');
      }

      const [startH, startM] = workingHours.startTime.split(':').map(Number);
      const [endH, endM] = workingHours.endTime.split(':').map(Number);
      const workStart = startH * 60 + startM;
      const workEnd = endH * 60 + endM;

      const [reqStartH, reqStartM] = data.startTime.split(':').map(Number);
      const [reqEndH, reqEndM] = data.endTime.split(':').map(Number);
      const reqStart = reqStartH * 60 + reqStartM;
      const reqEnd = reqEndH * 60 + reqEndM;

      if (reqStart < workStart || reqEnd > workEnd) {
        throw new ConflictError('Tanlangan vaqt ish vaqtidan tashqarida');
      }

      // Dinner break check
      if (workingHours.dinnerStartTime && workingHours.dinnerEndTime) {
        const [dsH, dsM] = workingHours.dinnerStartTime.split(':').map(Number);
        const [deH, deM] = workingHours.dinnerEndTime.split(':').map(Number);
        const dinnerStart = dsH * 60 + dsM;
        const dinnerEnd = deH * 60 + deM;

        if (reqStart < dinnerEnd && reqEnd > dinnerStart) {
          throw new ConflictError(
            'Tanlangan vaqt dam olish vaqtiga to‘g‘ri kelmoqda',
          );
        }
      }
    }
    // ---------------------------------

    const orderTableId = data.order?.tableId ?? data.tableId;
    if (orderTableId !== data.tableId) {
      throw new ConflictError('Order tableId must match booking tableId');
    }

    // Transaction ichida overlap check va booking create - race condition ni oldini olish
    const booking = await prisma.$transaction(async (tx) => {
      // Overlap tekshiruvi transaction ichida
      const overlapping = await tx.booking.findFirst({
        where: {
          ...(data.staffId
            ? { staffId: data.staffId }
            : { serviceId: data.serviceId, staffId: data.staffId }),
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
      });

      if (overlapping) {
        throw new ConflictError('Time slot is already booked');
      }

      // Booking yaratish - overlap yo'qligiga ishonch hosil qilgandan keyin
      const orderCreate =
        data.order && data.order.items.length > 0
          ? {
              create: [
                {
                  tableId: orderTableId,
                  status: data.order.status ?? 'PENDING_CONFIRM',
                  totalPrice: data.order.totalPrice ?? 0,
                  etaMinutes: data.order.etaMinutes,
                  telegramId: data.order.telegramId,
                  phone: data.order.phone,
                  token: data.order.token,
                  confirmedAt:
                    data.order.status === 'CONFIRMED' ? new Date() : undefined,
                  items: {
                    create: data.order.items.map((item) => {
                      const menuItemId = item.menuItemId ?? item.serviceId;
                      if (!menuItemId) {
                        throw new ConflictError(
                          'Order item must contain menuItemId or serviceId',
                        );
                      }

                      return {
                        menuItemId,
                        nameSnapshot:
                          item.nameSnapshot ?? item.serviceName ?? 'Service',
                        priceSnapshot: item.priceSnapshot,
                        qty: item.qty,
                        prepTimeSnapshot: item.prepTimeSnapshot ?? 0,
                      };
                    }),
                  },
                },
              ],
            }
          : undefined;

      return await tx.booking.create({
        data: {
          businessId: data.businessId,
          clientId: data.clientId,
          serviceId: data.serviceId,
          staffId: data.staffId,
          tableId: data.tableId,
          price: String(
            data.order?.totalPrice ??
              data.order?.items?.reduce(
                (sum, item) =>
                  sum + Number(item.priceSnapshot || 0) * Number(item.qty || 0),
                0,
              ) ??
              0,
          ),
          notes: data.notes,
          status: data.order?.status === 'CONFIRMED' ? 'CONFIRMED' : undefined,
          ...(orderCreate ? { orders: orderCreate } : {}),
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
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
          orders: {
            include: {
              items: true,
            },
          },
        },
      });
    });

    // Notification transaction tashqarisida - agar xatolik bo'lsa ham booking saqlangan
    if (service.business) {
      await NotificationService.notifyBookingCreated(
        booking.id,
        service.business.userId,
      ).catch((error) => {
        console.error('Failed to send notification:', error);
      });
    }

    BookingRealtimeService.emitFromBooking(booking, {
      action: 'created',
    });

    return this.transformResponse(booking as Booking);
  }

  static async updateStatus(
    id: string,
    status: any,
    userPayload?: any,
    staffPayload?: any,
  ): Promise<BookingResponse> {
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      const err = new Error('Invalid booking status');
      err.name = 'ValidationError';
      throw err;
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        businessId: true,
        status: true,
        priceStatus: true,
        confirmedAt: true,
        progressStatus: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const actor = await this.resolveBookingStatusActor(
      booking.businessId,
      userPayload,
      staffPayload,
    );

    if (!actor) {
      throw new AuthorizationError(
        'Access denied. You do not have permission to update booking status.',
      );
    }

    const normalizedTargetStatus = String(status || '').toUpperCase();
    const isLegacyPaymentCompletion = normalizedTargetStatus === 'COMPLETED';
    const nextBookingStatus = isLegacyPaymentCompletion
      ? String(
          booking.status === 'PENDING' || booking.status === 'COMPLETED'
            ? 'CONFIRMED'
            : booking.status,
        ).toUpperCase()
      : normalizedTargetStatus;
    const shouldCaptureConfirmation =
      nextBookingStatus === 'CONFIRMED' &&
      booking.status !== 'CONFIRMED' &&
      booking.confirmedAt == null;
    const progressUpdateData: Record<string, unknown> = {};
    const bookingUpdateData: Record<string, unknown> = {};

    if (isLegacyPaymentCompletion) {
      if (String(booking.status || '').toUpperCase() === 'CANCELLED') {
        throw new ConflictError('Cancelled booking cannot be marked as paid.');
      }
      if (String(booking.progressStatus || '').toUpperCase() !== 'DELIVERED') {
        throw new ConflictError(
          'Only delivered booking can be marked as paid.',
        );
      }
      bookingUpdateData.priceStatus = 'COMPLETED';
    } else if (normalizedTargetStatus === 'CANCELLED') {
      bookingUpdateData.priceStatus = 'CANCELLED';
    } else if (
      ['PENDING', 'CONFIRMED'].includes(normalizedTargetStatus) &&
      String(booking.priceStatus || '').toUpperCase() !== 'COMPLETED'
    ) {
      bookingUpdateData.priceStatus = 'PENDING';
    }

    if (
      nextBookingStatus === 'CONFIRMED' &&
      String(booking.progressStatus || '').toUpperCase() === 'PENDING'
    ) {
      progressUpdateData.progressStatus = 'PREPARING';
    }

    const shouldCancelPendingItems = nextBookingStatus === 'CANCELLED';
    if (shouldCancelPendingItems) {
      progressUpdateData.progressStatus = 'CANCELLED';
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      if (shouldCancelPendingItems) {
        await tx.bookingItem.updateMany({
          where: {
            bookingId: id,
            status: {
              not: 'READY' as never,
            },
          },
          data: {
            status: 'CANCELLED' as never,
          },
        });
      }

      return tx.booking.update({
        where: { id },
        data: {
          status: nextBookingStatus as never,
          ...bookingUpdateData,
          ...(shouldCaptureConfirmation
            ? {
                confirmedAt: new Date(),
                confirmedByType: actor.confirmedByType,
                confirmedByName: actor.confirmedByName,
                confirmedByUserId: actor.confirmedByUserId,
                confirmedByStaffId: actor.confirmedByStaffId,
              }
            : {}),
          ...progressUpdateData,
        },
        include: this.bookingListInclude,
      });
    });

    BookingRealtimeService.emitFromBooking(updatedBooking, {
      action: 'status_updated',
      previousStatus: booking.status,
      previousProgressStatus: booking.progressStatus ?? null,
      targetRoles: [],
    });

    return this.mapBookingRow(updatedBooking);
  }
  static async getById(id: string): Promise<BookingResponse | null> {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            businessId: true,
            business: {
              select: {
                id: true,
                businessName: true,
                phone: true,
              },
            },
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
      },
    });

    if (!booking) {
      return null;
    }

    return this.transformResponse(booking as Booking);
  }

  static async getByFilter(
    filter: BookingFilterDto,
  ): Promise<BookingResponse[]> {
    const where: Prisma.BookingWhereInput = {};

    if (filter.clientId) {
      where.clientId = filter.clientId;
    }

    if (filter.serviceId) {
      where.serviceId = filter.serviceId;
    }

    if (filter.staffId) {
      where.staffId = filter.staffId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            businessId: true,
            business: {
              select: {
                id: true,
                businessName: true,
                phone: true,
              },
            },
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
      },
    });

    return bookings.map((b) => this.transformResponse(b as any));
  }

  /**
   * Booking yangilash - Transaction bilan race condition oldini olish
   */
  static async update(
    id: string,
    data: UpdateBookingDto,
  ): Promise<BookingResponse> {
    if (typeof (data as any).status !== 'undefined') {
      throw new ValidationError(
        'Booking status can only be updated via the dedicated status endpoint.',
      );
    }
    // Avval mavjudligini tekshirish
    const existing = await prisma.booking.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Booking not found');
    }

    // Vaqt o'zgaryotgan bo'lsa, transaction ichida overlap check + update
    const updated = await prisma.$transaction(async (tx) => {
      const overlapping = await tx.booking.findFirst({
        where: {
          id: { not: id },
          serviceId: existing.serviceId,
          staffId: existing.staffId,
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
      });

      if (overlapping) {
        throw new ConflictError('Time slot is already booked');
      }

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: data.status,
          notes: data.notes,
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true,
              businessId: true,
              business: {
                select: {
                  id: true,
                  userId: true,
                  businessName: true,
                  phone: true,
                },
              },
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
        },
      });

      // After update, check if both flags are true to auto-cancel
      if (updatedBooking.status !== 'CANCELLED') {
        return await tx.booking.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: {
            client: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                duration: true,
                price: true,
                businessId: true,
                business: {
                  select: {
                    id: true,
                    userId: true,
                    businessName: true,
                    phone: true,
                  },
                },
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
          },
        });
      }

      // If the booking was cancelled by business (or just requested), notify the client
      if (data.cancel_staff && updatedBooking.service?.business?.userId) {
        await NotificationService.notifyBookingCancelled(
          id,
          updatedBooking.service.business.userId,
          data.cancellationReason || 'No reason provided',
        ).catch((error) => {
          console.error('Failed to send cancellation notification:', error);
        });
      }

      return updatedBooking;
    });

    // Check if both flags are true to auto-cancel in simple update
    if (updated.status !== 'CANCELLED') {
      const fullyCancelled = await prisma.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
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
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true,
              businessId: true,
              business: {
                select: {
                  id: true,
                  userId: true,
                  businessName: true,
                  phone: true,
                },
              },
            },
          },
        },
      });
      return this.transformResponse(fullyCancelled as Booking);
    }

    // If the booking was cancelled by business (or requested), notify the client
    if (data.cancel_staff && updated.service?.business?.userId) {
      await NotificationService.notifyBookingCancelled(
        id,
        updated.service.business.userId,
        data.cancellationReason || 'No reason provided',
      ).catch((error) => {
        console.error('Failed to send cancellation notification:', error);
      });
    }

    BookingRealtimeService.emitFromBooking(updated, {
      action: existing.status !== updated.status ? 'status_updated' : 'updated',
      previousStatus: existing.status,
    });

    return this.transformResponse(updated as Booking);
  }

  static async delete(id: string): Promise<void> {
    const existing = await prisma.booking.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Booking not found');
    }

    await prisma.booking.delete({ where: { id } });
  }

  static async getBusinessBookings(
    businessId: string,
    filter?: { status?: string },
  ): Promise<BookingResponse[]> {
    const where: Prisma.BookingWhereInput = {
      businessId,
    };

    if (filter?.status) {
      where.status = filter.status as any;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            businessId: true,
            business: {
              select: {
                id: true,
                businessName: true,
                phone: true,
              },
            },
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
      },
    });

    return bookings.map((b) => this.transformResponse(b as any));
  }

  static async getStaffBookings(
    staffId: string,
    filter?: { status?: string; startDate?: Date; endDate?: Date },
  ): Promise<BookingResponse[]> {
    const where: Prisma.BookingWhereInput = {
      staffId,
    };

    if (filter?.status) {
      where.status = filter.status as never;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            businessId: true,
            business: {
              select: {
                id: true,
                businessName: true,
                phone: true,
              },
            },
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
      },
    });

    return bookings.map((b) => this.transformResponse(b as any));
  }

  static async getAvailableSlots(
    request: AvailableSlotsRequest,
  ): Promise<AvailableSlotsResponse> {
    const service = await prisma.service.findUnique({
      where: { id: request.serviceId },
      include: { business: true },
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    const targetDate = new Date(request.date);
    const targetDateStr =
      typeof request.date === 'string'
        ? request.date
        : targetDate.toISOString().split('T')[0];
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const isToday = targetDateStr === todayStr;

    const dayOfWeek = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ][targetDate.getDay()];

    let staffList: { id: string; fullName: string }[] = [];
    let workingHours: any = null;

    if (request.staffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: request.staffId },
        include: { workingHours: true },
      });

      if (!staff) {
        throw new NotFoundError('Staff not found');
      }

      workingHours = staff.workingHours.find(
        (wh) => wh.dayOfWeek === dayOfWeek && wh.isActive,
      );

      staffList = [{ id: staff.id, fullName: staff.fullName }];
    } else {
      // Fetch all staff members for this business who are active and provide this service
      const staffMembers = await prisma.staff.findMany({
        where: {
          businessId: service.businessId,
          isActive: true,
          services: {
            some: {
              serviceId: request.serviceId,
            },
          },
        },
        include: { workingHours: true },
      });

      staffList = staffMembers
        .filter((staff) =>
          staff.workingHours.some(
            (wh) => wh.dayOfWeek === dayOfWeek && wh.isActive,
          ),
        )
        .map((s) => ({ id: s.id, fullName: s.fullName }));

      // For base working hours (if aggregating), we use business hours as fallback
      // but each slot will be checked against each staff's specific working hours if needed.
      // For now, let's get the earliest start and latest end of the business or staff.
      workingHours = await prisma.workingHours.findFirst({
        where: {
          businessId: service.businessId,
          dayOfWeek: dayOfWeek as any,
          isActive: true,
        },
      });

      // If business has no working hours for this day, skip
      if (!workingHours) {
        return {
          date: targetDateStr,
          slots: [],
        };
      }
    }

    if (!workingHours) {
      return {
        date: targetDateStr,
        slots: [],
      };
    }

    // IMPORTANT: Fetch all bookings for the staff list on this date,
    // regardless of the serviceId, to prevent overlaps.
    const existingBookings = await prisma.booking.findMany({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        ...(request.staffId
          ? { staffId: request.staffId }
          : { staffId: { in: staffList.map((s) => s.id) } }),
      },
      select: {
        staffId: true,
      },
    });

    const slots = this.generateTimeSlots(
      workingHours.startTime || '',
      workingHours.endTime || '',
      service.duration,
      'dinnerStartTime' in workingHours
        ? workingHours.dinnerStartTime || undefined
        : undefined,
      'dinnerEndTime' in workingHours
        ? workingHours.dinnerEndTime || undefined
        : undefined,
      isToday,
    );

    const availableSlots = slots.map((slot) => {
      let isAvailable = false;
      let availableStaffId: string | undefined;
      let availableStaffName: string | undefined;

      if (request.staffId) {
        const isBooked = existingBookings.some(
          (booking) => booking.staffId === request.staffId,
        );
        isAvailable = !isBooked;
        availableStaffId = request.staffId;
        availableStaffName = staffList[0]?.fullName;
      } else {
        // Multi-staff aggregation: available if AT LEAST ONE staff is free
        for (const staff of staffList) {
          const isStaffBooked = existingBookings.some(
            (booking) => booking.staffId === staff.id,
          );

          if (!isStaffBooked) {
            isAvailable = true;
            availableStaffId = staff.id;
            availableStaffName = staff.fullName;
            break; // Found one free staff, this slot is available
          }
        }
      }

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: isAvailable,
        ...(availableStaffId
          ? {
              staffId: availableStaffId,
              staffName: availableStaffName,
            }
          : {}),
      };
    });

    return {
      date: targetDate.toISOString(),
      slots: availableSlots,
    };
  }

  private static generateTimeSlots(
    startTime: string,
    endTime: string,
    duration: number,
    dinnerStartTime?: string,
    dinnerEndTime?: string,
    isToday: boolean = false,
  ): Array<{ startTime: string; endTime: string }> {
    const slots: Array<{ startTime: string; endTime: string }> = [];

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Dinner time calculations
    let dinnerStartMinutes = -1;
    let dinnerEndMinutes = -1;

    if (dinnerStartTime && dinnerEndTime) {
      const [dinnerStartH, dinnerStartM] = dinnerStartTime
        .split(':')
        .map(Number);
      const [dinnerEndH, dinnerEndM] = dinnerEndTime.split(':').map(Number);
      dinnerStartMinutes = dinnerStartH * 60 + dinnerStartM;
      dinnerEndMinutes = dinnerEndH * 60 + dinnerEndM;
    }

    // If it's today, calculate the current time in minutes
    let currentDateTimeMinutes = 0;
    if (isToday) {
      const now = new Date();
      currentDateTimeMinutes = now.getHours() * 60 + now.getMinutes();
    }
    // Determine step size (e.g., 15 minutes for better precision)
    const step = 15;

    while (currentMinutes + duration <= endMinutes) {
      const slotStart = currentMinutes;
      const slotEnd = currentMinutes + duration;

      // Skip past time slots if it's today
      if (isToday && slotStart < currentDateTimeMinutes) {
        currentMinutes += step;
        continue;
      }

      // Dinner break check
      if (dinnerStartMinutes !== -1 && dinnerEndMinutes !== -1) {
        if (slotStart < dinnerEndMinutes && slotEnd > dinnerStartMinutes) {
          // Jump to end of dinner break to be more efficient
          currentMinutes = dinnerEndMinutes;
          continue;
        }
      }

      const h = Math.floor(slotStart / 60);
      const m = slotStart % 60;
      const eh = Math.floor(slotEnd / 60);
      const em = slotEnd % 60;

      slots.push({
        startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`,
      });

      currentMinutes += step;
    }

    return slots;
  }

  private static transformResponse(
    booking: Booking & {
      client?: {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string | null;
        telegramUsername: string | null;
      };
      service?: {
        id: string;
        name: string;
        duration: number;
        price: number;
        businessId?: string;
        business?: {
          id: string;
          businessName: string;
          phone: string | null;
        };
      };
      staff?: {
        id: string;
        fullName: string;
        position: string | null;
        phoneNumber: string;
      } | null;
    },
  ): BookingResponse {
    return mapBookingResponse({
      ...booking,
      businessId: booking.service?.businessId ?? booking.businessId,
    });
  }

  /**
   * Handle client response to business-initiated booking cancellation
   * If client confirms cancellation, booking status becomes CANCELLED
   * If client rejects cancellation, booking status remains CONFIRMED
   */
  static async handleClientCancellationResponse(
    id: string,
    clientId: string,
    response: 'CONFIRM_CANCELLATION' | 'REJECT_CANCELLATION',
    notes?: string,
  ): Promise<BookingResponse> {
    // First, verify that the booking belongs to the client
    const existing = await prisma.booking.findUnique({
      where: { id },
      select: {
        clientId: true,
        status: true,
        notes: true,
        service: {
          select: {
            business: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Booking not found');
    }

    if (existing.clientId !== clientId) {
      throw new ConflictError('You are not authorized to modify this booking');
    }

    let updateData: any;

    if (response === 'CONFIRM_CANCELLATION') {
      updateData = {
        cancel_client: true,
        status: 'CANCELLED',
        // Don't override cancellationReason - keep staff's reason
        notes: notes
          ? `Client confirmed staff cancellation. Reason: ${notes}`
          : existing.notes,
      };
    } else {
      // REJECT_CANCELLATION
      updateData = {
        cancel_client: false,
        cancel_staff: false,
        cancellationReason: null,
        notes: notes
          ? `Client rejected staff cancellation. Reason: ${notes}`
          : existing.notes,
      };
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            businessId: true,
            business: {
              select: {
                id: true,
                userId: true,
                businessName: true,
                phone: true,
              },
            },
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
      },
    });

    // If the client responded, notify the business
    if (updated.service?.business?.userId) {
      const message =
        response === 'CONFIRM_CANCELLATION'
          ? `Client confirmed cancellation. ${notes || ''}`
          : `Client REJECTED cancellation. ${notes || ''}`;

      await NotificationService.notifyBookingCancelled(
        id,
        updated.service.business.userId,
        message,
      ).catch((error) => {
        console.error(
          'Failed to send cancellation response notification:',
          error,
        );
      });
    }

    BookingRealtimeService.emitFromBooking(updated, {
      action: existing.status !== updated.status ? 'status_updated' : 'updated',
      previousStatus: existing.status,
    });

    return this.transformResponse(updated as Booking);
  }

  static async confirm(id: string): Promise<BookingResponse> {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: {
        client: true,
        service: {
          include: {
            business: true,
          },
        },
        staff: true,
      },
    });
    return this.transformResponse(booking as any);
  }

  static async complete(id: string): Promise<BookingResponse> {
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        priceStatus: 'COMPLETED',
      },
      include: {
        client: true,
        service: {
          include: {
            business: true,
          },
        },
        staff: true,
      },
    });
    return this.transformResponse(booking as any);
  }

  static async staffCancel(
    id: string,
    reason: string,
  ): Promise<BookingResponse> {
    // Check if client already cancelled
    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundError('Booking not found');

    // If client already cancelled, don't override reason, just confirm

    // Staff is cancelling first - set reason
    const booking = await prisma.booking.update({
      where: { id },
      data: {},
      include: {
        client: true,
        service: {
          include: {
            business: true,
          },
        },
        staff: true,
      },
    });

    if (booking.service?.business?.userId) {
      await NotificationService.notifyBookingCancelled(
        id,
        booking.service.business.userId,
        reason,
      ).catch((err) => console.error('Notification failed:', err));
    }

    return this.transformResponse(booking as any);
  }

  static async clientConfirmCancel(id: string): Promise<BookingResponse> {
    const current = await prisma.booking.findUnique({
      where: { id },
    });

    if (!current) throw new NotFoundError('Booking not found');

    // Client is confirming first
    const booking = await prisma.booking.update({
      where: { id },
      data: {},
      include: {
        client: true,
        service: {
          include: {
            business: true,
          },
        },
        staff: true,
      },
    });

    // If staff hasn't cancelled yet, notify staff about client cancellation request

    return this.transformResponse(booking as any);
  }

  /**
   * Client initiates booking cancellation
   * Sets cancel_client flag and reason, staff needs to confirm
   */
  static async clientInitiateCancel(
    id: string,
    clientId: string,
    reason: string,
  ): Promise<BookingResponse> {
    // Verify booking belongs to client
    const existing = await prisma.booking.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            business: true,
          },
        },
        staff: true,
      },
    });

    if (!existing) throw new NotFoundError('Booking not found');
    if (existing.clientId !== clientId) {
      throw new Error('Unauthorized: This booking does not belong to you');
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {},
      include: {
        client: true,
        service: {
          include: {
            business: true,
          },
        },
        staff: true,
      },
    });

    return this.transformResponse(booking as any);
  }

  /**
   * Staff response to client-initiated booking cancellation
   * If staff confirms cancellation, booking status becomes CANCELLED
   * If staff rejects cancellation, booking status remains CONFIRMED/PENDING
   */
  static async handleStaffCancellationResponse(
    id: string,
    staffId: string,
    response: 'CONFIRM_CANCELLATION' | 'REJECT_CANCELLATION',
    notes?: string,
  ): Promise<BookingResponse> {
    // First, verify that the booking belongs to the staff
    const existing = await prisma.booking.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            business: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!existing) throw new NotFoundError('Booking not found');
    if (existing.staffId !== staffId) {
      throw new Error('Unauthorized: This booking is not assigned to you');
    }
    let updateData: any;

    if (response === 'CONFIRM_CANCELLATION') {
      updateData = {
        cancel_staff: true,
        status: 'CANCELLED',
        // Don't override cancellationReason - keep client's reason
        notes: notes
          ? `Staff confirmed client cancellation. Reason: ${notes}`
          : existing.notes,
      };
    } else {
      // REJECT_CANCELLATION
      updateData = {
        cancel_client: false,
        cancel_staff: false,
        cancellationReason: null,
        notes: notes
          ? `Staff rejected client cancellation. Reason: ${notes}`
          : existing.notes,
      };
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        service: {
          include: {
            business: true,
          },
        },
        staff: true,
      },
    });

    // Notify client about staff response
    if (updated.client?.id) {
      const message =
        response === 'CONFIRM_CANCELLATION'
          ? `Staff confirmed your cancellation request. ${notes || ''}`
          : `Staff REJECTED your cancellation request. ${notes || ''}`;

      // TODO: Add notification to client
      console.log(`Notify client ${updated.client.id}: ${message}`);
    }

    BookingRealtimeService.emitFromBooking(updated, {
      action: existing.status !== updated.status ? 'status_updated' : 'updated',
      previousStatus: existing.status,
    });

    return this.transformResponse(updated as any);
  }
}
