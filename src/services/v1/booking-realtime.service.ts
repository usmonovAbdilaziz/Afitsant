import { SocketController } from '@/controllers/v1/socket.controller';
import { normalizeStaffPosition } from './booking-view.service';

export type BookingRealtimeAction =
  | 'created'
  | 'updated'
  | 'status_updated'
  | 'progress_updated'
  | 'item_updated'
  | 'ready_for_delivery'
  | 'delivery_claimed'
  | 'delivered'
  | 'warning_preparation_delay'
  | 'warning_delivery_unclaimed';

type BookingRealtimeSource = {
  id: string;
  status: string;
  progressStatus?: string | null;
  businessId?: string | null;
  clientId?: string | null;
  staffId?: string | null;
  tableId?: string | null;
  updatedAt?: Date | string | null;
};

export type BookingRealtimePayload = {
  action: BookingRealtimeAction;
  bookingId: string;
  status: string;
  progressStatus: string | null;
  previousStatus?: string | null;
  previousProgressStatus?: string | null;
  businessId: string | null;
  clientId: string | null;
  staffId: string | null;
  tableId: string | null;
  itemId?: string | null;
  targetRoles?: string[];
  warningType?: string | null;
  updatedAt: string;
};

export class BookingRealtimeService {
  private static toIso(value?: Date | string | null): string {
    if (!value) {
      return new Date().toISOString();
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.toISOString();
  }

  private static buildPayload(
    booking: BookingRealtimeSource,
    action: BookingRealtimeAction,
    previousStatus?: string | null,
    options?: {
      previousProgressStatus?: string | null;
      itemId?: string | null;
      targetRoles?: string[];
      warningType?: string | null;
    },
  ): BookingRealtimePayload {
    return {
      action,
      bookingId: booking.id,
      status: booking.status,
      progressStatus: booking.progressStatus ?? null,
      previousStatus: previousStatus ?? null,
      previousProgressStatus: options?.previousProgressStatus ?? null,
      businessId: booking.businessId ?? null,
      clientId: booking.clientId ?? null,
      staffId: booking.staffId ?? null,
      tableId: booking.tableId ?? null,
      itemId: options?.itemId ?? null,
      targetRoles:
        options?.targetRoles
          ?.map((role) => normalizeStaffPosition(role))
          .filter(Boolean) ?? [],
      warningType: options?.warningType ?? null,
      updatedAt: this.toIso(booking.updatedAt),
    };
  }

  private static resolveEventName(action: BookingRealtimeAction): string {
    const map: Record<BookingRealtimeAction, string> = {
      created: 'booking.created',
      updated: 'booking.updated',
      status_updated: 'booking.status_updated',
      progress_updated: 'booking.progress.updated',
      item_updated: 'booking.item.updated',
      ready_for_delivery: 'booking.ready_for_delivery',
      delivery_claimed: 'booking.delivery.claimed',
      delivered: 'booking.delivered',
      warning_preparation_delay: 'booking.warning.preparation_delay',
      warning_delivery_unclaimed: 'booking.warning.delivery_unclaimed',
    };

    return map[action];
  }

  static emit(payload: BookingRealtimePayload): void {
    let io;

    try {
      io = SocketController.getIO();
    } catch (_error) {
      return;
    }

    if (!io) {
      return;
    }

    const namespace = io.of('/socket');
    const eventName = this.resolveEventName(payload.action);

    if (payload.businessId) {
      namespace
        .to(`business:${payload.businessId}`)
        .emit('booking:changed', payload);
      namespace.to(`business:${payload.businessId}`).emit(eventName, payload);
      namespace.to(`business:${payload.businessId}`).emit('booking.progress.updated', payload);
    }

    if (payload.clientId) {
      namespace.to(`client:${payload.clientId}`).emit('booking:changed', payload);
      namespace.to(`client:${payload.clientId}`).emit(eventName, payload);
      namespace.to(`client:${payload.clientId}`).emit('booking.progress.updated', payload);
    }

    namespace.to(`booking:${payload.bookingId}`).emit('booking:changed', payload);
    namespace.to(`booking:${payload.bookingId}`).emit(eventName, payload);

    if (payload.staffId) {
      namespace.to(`staff:${payload.staffId}`).emit('booking:changed', payload);
      namespace.to(`staff:${payload.staffId}`).emit(eventName, payload);
    }

    for (const role of payload.targetRoles ?? []) {
      if (!payload.businessId || !role) {
        continue;
      }

      const room = `staff-role:${payload.businessId}:${role}`;
      namespace.to(room).emit('booking:changed', payload);
      namespace.to(room).emit(eventName, payload);
    }
  }

  static emitFromBooking(
    booking: BookingRealtimeSource,
    options?: {
      action?: BookingRealtimeAction;
      previousStatus?: string | null;
      previousProgressStatus?: string | null;
      itemId?: string | null;
      targetRoles?: string[];
      warningType?: string | null;
    },
  ): void {
    this.emit(
      this.buildPayload(
        booking,
        options?.action ?? 'updated',
        options?.previousStatus,
        {
          previousProgressStatus: options?.previousProgressStatus,
          itemId: options?.itemId,
          targetRoles: options?.targetRoles,
          warningType: options?.warningType,
        },
      ),
    );
  }
}
