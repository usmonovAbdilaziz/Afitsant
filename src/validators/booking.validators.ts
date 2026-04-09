import { z } from '@/utils/zod-openapi';
import {
  BookingItemStatus,
  BookingProgressStatus,
  BookingStatus,
  OrderStatus,
  PriceStatus,
} from '@/generated/prisma';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const baseBookingFields = {
  bookingDate: z.coerce.date({ message: 'Invalid date format' }).optional(),
  startTime: z
    .string()
    .regex(timeRegex, 'Invalid time format. Use HH:MM (24-hour format)')
    .optional(),
  endTime: z
    .string()
    .regex(timeRegex, 'Invalid time format. Use HH:MM (24-hour format)')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
};

const createOrderItemSchema = z
  .object({
    menuItemId: z.string().cuid('Invalid menu item ID format').optional(),
    serviceId: z.string().cuid('Invalid service ID format').optional(),
    nameSnapshot: z.string().min(1).max(255).optional(),
    serviceName: z.string().min(1).max(255).optional(),
    priceSnapshot: z.number().min(0),
    qty: z.number().int().min(1),
    prepTimeSnapshot: z.number().int().min(0).optional(),
  })
  .refine((item) => Boolean(item.menuItemId || item.serviceId), {
    message: 'menuItemId or serviceId is required',
  });

const createOrderSchema = z.object({
  tableId: z.string().cuid('Invalid table ID format').optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  totalPrice: z.number().min(0).optional(),
  etaMinutes: z.number().int().min(0).optional(),
  telegramId: z.string().min(1).optional(),
  phone: z.string().min(3).optional(),
  token: z.string().min(1).optional(),
  items: z.array(createOrderItemSchema).min(1, 'Order items are required'),
});

export const createClientBookingItemSchema = z.object({
  productId: z.string().cuid('Invalid product ID format'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  priceSnapshot: z.number().positive('Price snapshot must be greater than 0').optional(),
  note: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export const createClientBookingSchema = z.object({
  tableId: z.string().cuid('Invalid table ID format'),
  items: z
    .array(createClientBookingItemSchema)
    .min(1, 'At least one booking item is required'),
  note: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  idempotencyKey: z.string().uuid('Invalid idempotency key').optional(),
});

export const bookingListQuerySchema = z.object({
  status: z
    .nativeEnum(BookingStatus, { message: 'Invalid booking status' })
    .optional(),
  priceStatus: z
    .nativeEnum(PriceStatus, { message: 'Invalid booking price status' })
    .optional(),
  dateFrom: z.coerce.date({ message: 'Invalid dateFrom format' }).optional(),
  dateTo: z.coerce.date({ message: 'Invalid dateTo format' }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(10),
});

const createDirectBookingSchema = z
  .object({
    clientId: z.string().cuid('Invalid client ID format'),
    businessId: z.string().cuid('Invalid business ID format'),
    serviceId: z.string().cuid('Invalid service ID format'),
    staffId: z.string().cuid('Invalid staff ID format'),
    tableId: z.string().cuid('Invalid table ID format'),
    ...baseBookingFields,
    order: createOrderSchema.optional(),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) {
        return true;
      }
      const start = data.startTime.split(':').map(Number);
      const end = data.endTime.split(':').map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return endMinutes > startMinutes;
    },
    { message: 'End time must be after start time' },
  )
  .refine(
    (data) => {
      if (!data.bookingDate) {
        return true;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const bookingDate = new Date(data.bookingDate);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate >= today;
    },
    { message: 'Booking date cannot be in the past' },
  )
  .refine(
    (data) => {
      if (!data.order?.tableId) {
        return true;
      }
      return data.order.tableId === data.tableId;
    },
    { message: 'order.tableId must match booking tableId' },
  );

const createCartBookingSchema = z
  .object({
    clientId: z.string().cuid('Invalid client ID format'),
    businessId: z.string().cuid('Invalid business ID format'),
    tableId: z.string().cuid('Invalid table ID format'),
    notes: z
      .string()
      .max(500, 'Notes must be less than 500 characters')
      .optional(),
    order: createOrderSchema,
  })
  .refine(
    (data) => {
      if (!data.order.tableId) {
        return true;
      }
      return data.order.tableId === data.tableId;
    },
    { message: 'order.tableId must match booking tableId' },
  );

export const createBookingSchema = z.union([
  createDirectBookingSchema,
  createCartBookingSchema,
]);

export const updateBookingSchema = z
  .object({
    bookingDate: z.coerce.date({ message: 'Invalid date format' }).optional(),
    startTime: z
      .string()
      .regex(timeRegex, 'Invalid time format. Use HH:MM (24-hour format)')
      .optional(),
    endTime: z
      .string()
      .regex(timeRegex, 'Invalid time format. Use HH:MM (24-hour format)')
      .optional(),
    status: z
      .nativeEnum(BookingStatus, { message: 'Invalid booking status' })
      .optional(),
    cancellationReason: z.string().max(500).optional(),
    cancel_staff: z.boolean().optional(),
    cancel_client: z.boolean().optional(),
    notes: z
      .string()
      .max(500, 'Notes must be less than 500 characters')
      .optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

export const updateBookingStatusSchema = z
  .object({
    status: z.nativeEnum(BookingStatus, { message: 'Invalid booking status' }),
  })
  .strict();

export const updateBookingItemStatusSchema = z
  .object({
    status: z.nativeEnum(BookingItemStatus, {
      message: 'Invalid booking item status',
    }),
  })
  .strict();

export const getBookingSchema = z.object({
  id: z.string().cuid('Invalid booking ID format'),
});

export const bookingFilterSchema = z.object({
  clientId: z.string().cuid('Invalid client ID format').optional(),
  serviceId: z.string().cuid('Invalid service ID format').optional(),
  staffId: z.string().cuid('Invalid staff ID format').optional(),
  status: z
    .nativeEnum(BookingStatus, { message: 'Invalid booking status' })
    .optional(),
  startDate: z.coerce.date({ message: 'Invalid start date format' }).optional(),
  endDate: z.coerce.date({ message: 'Invalid end date format' }).optional(),
});

export const availableSlotsSchema = z.object({
  serviceId: z.string().cuid('Invalid service ID format'),
  staffId: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().cuid('Invalid staff ID format').optional(),
  ),
  date: z.coerce.date({ message: 'Invalid date format' }),
});

export const clientCancellationResponseSchema = z.object({
  response: z.enum(['CONFIRM_CANCELLATION', 'REJECT_CANCELLATION'], {
    message:
      'Response must be either CONFIRM_CANCELLATION or REJECT_CANCELLATION',
  }),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

export const clientBookingsSchema = z.object({
  clientId: z.string().cuid('Invalid client ID format'),
  status: z
    .nativeEnum(BookingStatus, { message: 'Invalid booking status' })
    .optional(),
  startDate: z.coerce.date({ message: 'Invalid start date format' }).optional(),
  endDate: z.coerce.date({ message: 'Invalid end date format' }).optional(),
});

export const staffRoleBookingsQuerySchema = z.object({
  type: z.string().trim().min(1, 'type is required'),
  bookingId: z.string().cuid('Invalid booking ID format').optional(),
  phoneNumber: z.string().optional(),
  status: z
    .nativeEnum(BookingStatus, { message: 'Invalid booking status' })
    .optional(),
  priceStatus: z
    .nativeEnum(PriceStatus, {
      message: 'Invalid booking price status',
    })
    .optional(),
  progressStatus: z
    .nativeEnum(BookingProgressStatus, {
      message: 'Invalid booking progress status',
    })
    .optional(),
  dateFrom: z.coerce.date({ message: 'Invalid dateFrom format' }).optional(),
  dateTo: z.coerce.date({ message: 'Invalid dateTo format' }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(10),
});
