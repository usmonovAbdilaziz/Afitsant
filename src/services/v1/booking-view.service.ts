import type {
  BookingItemStatus,
  BookingProgressStatus,
} from '@/generated/prisma/client';
import type { BookingResponse } from '@/types/booking.types';

const DELIVERY_CLAIM_WARNING_MS = 2 * 60 * 1000;

export const normalizeStaffPosition = (position?: string | null): string => {
  const normalized = String(position || '').trim().toUpperCase();
  if (normalized === 'CHEF') {
    return 'COOK';
  }
  return normalized === 'BARMAN' ? 'BARMEN' : normalized;
};

export const ELEVATED_STAFF_POSITIONS = new Set(['MANAGER', 'CASHIER']);
export const DELIVERY_STAFF_POSITIONS = new Set(['WAITER', 'RUNNER']);
export const MANAGER_STAFF_POSITIONS = new Set(['MANAGER']);

export const getPreparationFallbackPosition = (
  category?: string | null,
): string => {
  const normalizedCategory = String(category || '').trim().toUpperCase();
  return normalizedCategory === 'DRINKS' ? 'BARMEN' : 'COOK';
};

const toIso = (value?: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.toISOString();
};

const toMillis = (value?: Date | string | null): number | null => {
  if (!value) {
    return null;
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
};

export const resolveBookingPrice = (booking: any): string => {
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
};

export const calculateEstimatedDurationMinutes = (booking: any): number => {
  const itemDurations =
    booking?.items?.map((item: any) =>
      Number(
        item.durationSnapshot ?? item.product?.duration ?? booking?.service?.duration ?? 0,
      ),
    ) ?? [];

  const maxItemDuration = itemDurations.reduce(
    (max: number, duration: number) => Math.max(max, duration || 0),
    0,
  );

  return maxItemDuration || Number(booking?.service?.duration || 0) || 0;
};

export const getOutstandingPreparationRoles = (booking: any): string[] => {
  const roles = new Set<string>();

  for (const item of booking?.items ?? []) {
    const itemStatus = String(item?.status || '').toUpperCase();
    if (itemStatus === 'READY' || itemStatus === 'CANCELLED') {
      continue;
    }

    const role = normalizeStaffPosition(
      item?.responsiblePosition ??
        item?.preparedByRole ??
        getPreparationFallbackPosition(item?.product?.category),
    );

    if (role) {
      roles.add(role);
    }
  }

  return Array.from(roles);
};

export const deriveBookingProgressStatus = (
  booking: any,
): BookingProgressStatus => {
  if (String(booking?.status || '').toUpperCase() === 'CANCELLED') {
    return 'CANCELLED';
  }

  if (
    String(booking?.progressStatus || '').toUpperCase() === 'DELIVERED' ||
    String(booking?.status || '').toUpperCase() === 'COMPLETED' ||
    booking?.deliveredAt
  ) {
    return 'DELIVERED';
  }

  if (booking?.deliveryAssignedStaffId || booking?.deliveryClaimedAt) {
    return 'DELIVERING';
  }

  const activeItems = (booking?.items ?? []).filter(
    (item: any) => String(item?.status || '').toUpperCase() !== 'CANCELLED',
  );

  if (activeItems.length > 0) {
    const itemStatuses = activeItems.map((item: any) =>
      String(item?.status || 'PENDING').toUpperCase(),
    );

    if (itemStatuses.every((status: string) => status === 'READY')) {
      return 'READY_FOR_DELIVERY';
    }

    if (
      itemStatuses.some(
        (status: string) => status === 'PREPARING' || status === 'READY',
      )
    ) {
      return 'PREPARING';
    }

    return 'PENDING';
  }

  if (String(booking?.status || '').toUpperCase() === 'CONFIRMED') {
    return 'PREPARING';
  }

  const existingProgressStatus = String(booking?.progressStatus || '').toUpperCase();
  if (
    existingProgressStatus === 'READY_FOR_DELIVERY' ||
    existingProgressStatus === 'DELIVERING'
  ) {
    return existingProgressStatus as BookingProgressStatus;
  }

  return 'PENDING';
};

export const buildBookingMeta = (booking: any) => {
  const now = Date.now();
  const progressStatus = deriveBookingProgressStatus(booking);
  const estimatedDurationMinutes = calculateEstimatedDurationMinutes(booking);
  const createdAtMs = toMillis(booking?.createdAt);
  const estimatedReadyAt =
    createdAtMs != null && estimatedDurationMinutes > 0
      ? new Date(createdAtMs + estimatedDurationMinutes * 60 * 1000).toISOString()
      : null;
  const readyForDeliveryMs = toMillis(booking?.readyForDeliveryAt);
  const isDelayedPreparation =
    progressStatus !== 'CANCELLED' &&
    progressStatus !== 'READY_FOR_DELIVERY' &&
    progressStatus !== 'DELIVERING' &&
    progressStatus !== 'DELIVERED' &&
    estimatedReadyAt != null &&
    new Date(estimatedReadyAt).getTime() <= now;
  const isDelayedDeliveryClaim =
    progressStatus === 'READY_FOR_DELIVERY' &&
    !booking?.deliveryAssignedStaffId &&
    readyForDeliveryMs != null &&
    readyForDeliveryMs + DELIVERY_CLAIM_WARNING_MS <= now;

  return {
    progressStatus,
    estimatedDurationMinutes,
    estimatedReadyAt,
    isDelayedPreparation,
    isDelayedDeliveryClaim,
    outstandingPreparationRoles: getOutstandingPreparationRoles(booking),
  };
};

export const mapBookingResponse = (booking: any): BookingResponse => {
  const meta = buildBookingMeta(booking);

  return {
    id: booking.id,
    businessId: booking.businessId,
    clientId: booking.clientId,
    serviceId: booking.serviceId,
    staffId: booking.staffId,
    tableId: booking.tableId,
    priceStatus: booking.priceStatus,
    price: resolveBookingPrice(booking),
    status: booking.status,
    notes: booking.notes,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    confirmedAt: toIso(booking.confirmedAt),
    confirmedByType: booking.confirmedByType ?? null,
    confirmedByName: booking.confirmedByName ?? null,
    confirmedByUserId: booking.confirmedByUserId ?? null,
    confirmedByStaffId: booking.confirmedByStaffId ?? null,
    progressStatus: meta.progressStatus,
    readyForDeliveryAt: toIso(booking.readyForDeliveryAt),
    deliveryClaimedAt: toIso(booking.deliveryClaimedAt),
    deliveryAssignedStaffId: booking.deliveryAssignedStaffId ?? null,
    deliveryAssignedRole: booking.deliveryAssignedRole ?? null,
    deliveryAssignedName: booking.deliveryAssignedName ?? null,
    deliveredAt: toIso(booking.deliveredAt),
    deliveredByStaffId: booking.deliveredByStaffId ?? null,
    deliveredByRole: booking.deliveredByRole ?? null,
    deliveredByName: booking.deliveredByName ?? null,
    preparationDelayWarningSentAt: toIso(booking.preparationDelayWarningSentAt),
    deliveryClaimWarningSentAt: toIso(booking.deliveryClaimWarningSentAt),
    estimatedDurationMinutes: meta.estimatedDurationMinutes,
    estimatedReadyAt: meta.estimatedReadyAt,
    isDelayedPreparation: meta.isDelayedPreparation,
    isDelayedDeliveryClaim: meta.isDelayedDeliveryClaim,
    outstandingPreparationRoles: meta.outstandingPreparationRoles,
    idempotencyKey: booking.idempotencyKey ?? null,
    client: booking.client,
    service: booking.service,
    staff: booking.staff ?? undefined,
    table: booking.table ?? undefined,
    items:
      booking.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        qty: item.qty,
        priceSnapshot: item.priceSnapshot,
        durationSnapshot: item.durationSnapshot ?? 0,
        note: item.note,
        status: (item.status || 'PENDING') as BookingItemStatus,
        responsiblePosition:
          item.responsiblePosition ??
          getPreparationFallbackPosition(item.product?.category),
        startedAt: toIso(item.startedAt),
        readyAt: toIso(item.readyAt),
        preparedByStaffId: item.preparedByStaffId ?? null,
        preparedByName: item.preparedByName ?? null,
        preparedByRole: item.preparedByRole ?? null,
        createdAt: item.createdAt.toISOString(),
        product: item.product,
      })) ?? [],
  } as BookingResponse;
};
