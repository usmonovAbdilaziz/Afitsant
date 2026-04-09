import type {
  Booking,
  BookingItemStatus,
  BookingProgressStatus,
  BookingStatus,
  OrderStatus,
  PriceStatus,
} from '@/generated/prisma/client';

export interface CreateBookingOrderItemDto {
  menuItemId?: string;
  serviceId?: string;
  nameSnapshot?: string;
  serviceName?: string;
  priceSnapshot: number;
  qty: number;
  prepTimeSnapshot?: number;
}

export interface CreateBookingOrderDto {
  tableId?: string;
  status?: OrderStatus;
  totalPrice?: number;
  etaMinutes?: number;
  telegramId?: string;
  phone?: string;
  token?: string;
  items: CreateBookingOrderItemDto[];
}

export interface CreateBookingDto {
  clientId: string;
  businessId: string;
  serviceId: string;
  staffId: string;
  tableId: string;
  bookingDate?: Date;
  startTime?: string;
  endTime?: string;
  notes?: string;
  order?: CreateBookingOrderDto;
}

export interface CreateCartBookingDto {
  clientId: string;
  businessId: string;
  tableId: string;
  notes?: string;
  order: CreateBookingOrderDto;
}

export interface ClientBookingItemInput {
  productId: string;
  qty: number;
  priceSnapshot?: number;
  note?: string;
}

export interface CreateClientBookingDto {
  tableId: string;
  items: ClientBookingItemInput[];
  note?: string;
  idempotencyKey?: string;
}

export interface BookingListQueryDto {
  status?: BookingStatus;
  priceStatus?: PriceStatus;
  progressStatus?: BookingProgressStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  size?: number;
}

export interface BookingItemResponse {
  id: string;
  productId: string;
  qty: number;
  priceSnapshot: number;
  durationSnapshot?: number;
  note?: string | null;
  createdAt: string;
  status?: BookingItemStatus;
  responsiblePosition?: string | null;
  startedAt?: string | null;
  readyAt?: string | null;
  preparedByStaffId?: string | null;
  preparedByName?: string | null;
  preparedByRole?: string | null;
  product?: {
    id: string;
    name: string;
    price: number;
    businessId: string;
    duration?: number;
    category?: string;
    type?: string;
  };
}

export interface PaginatedBookingListResponse {
  items: BookingResponse[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}
export interface StaffAvailability {
    id: string;
    businessId: string | null;
    clientId: string;
    serviceId: string;
    staffId: string | null;
    tableId: string | null;
    status: BookingStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

export interface UpdateBookingDto {
  bookingDate?: Date;
  startTime?: string;
  endTime?: string;
  status?: BookingStatus;
  cancellationReason?: string;
  cancel_staff?: boolean;
  cancel_client?: boolean;
  notes?: string;
}

export interface StaffCancelDto {
  cancellationReason: string;
}

export interface BookingResponse {
  id: string;
  businessId: string;
  clientId: string;
  serviceId: string;
  staffId: string;
  tableId: string;
  priceStatus: Booking['priceStatus'];
  price: string;
  idempotencyKey: string | null;
  notes: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  confirmedByType: string | null;
  confirmedByName: string | null;
  confirmedByUserId: string | null;
  confirmedByStaffId: string | null;
  progressStatus: BookingProgressStatus;
  readyForDeliveryAt: string | null;
  deliveryClaimedAt: string | null;
  deliveryAssignedStaffId: string | null;
  deliveryAssignedRole: string | null;
  deliveryAssignedName: string | null;
  deliveredAt: string | null;
  deliveredByStaffId: string | null;
  deliveredByRole: string | null;
  deliveredByName: string | null;
  preparationDelayWarningSentAt: string | null;
  deliveryClaimWarningSentAt: string | null;
  estimatedDurationMinutes?: number;
  estimatedReadyAt?: string | null;
  isDelayedPreparation?: boolean;
  isDelayedDeliveryClaim?: boolean;
  outstandingPreparationRoles?: string[];
  client?: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
    username?: string | null;
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
  };
  table?: {
    id: string;
    tableNumber: number;
    tableColumns?: string | null;
    businessId?: string;
  };
  items?: BookingItemResponse[];
}

export interface BookingFilterDto {
  businessId?: string;
  clientId?: string;
  serviceId?: string;
  staffId?: string;
  tableId?: string;
  notes?: string;
  status?: BookingStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  staffId?: string;
  staffName?: string;
}

export interface AvailableSlotsRequest {
  serviceId: string;
  staffId?: string;
  date: Date;
}

export interface AvailableSlotsResponse {
  date: string;
  slots: AvailableSlot[];
}
