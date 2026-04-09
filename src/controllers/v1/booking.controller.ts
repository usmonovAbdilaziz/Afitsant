import { BookingService } from '@/services/v1/booking.service';
import { BookingProgressService } from '@/services/v1/booking-progress.service';
import { prisma } from '@/lib/prisma';
import {
  isClientPayload,
  isStaffPayload,
  isStandardPayload,
  type JwtPayload,
} from '@/types/auth.types';
import {
  sendConflictResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNoContentResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
  sendValidationError,
  sendForbiddenResponse,
} from '@/utils/response.handler';
import {
  availableSlotsSchema,
  bookingListQuerySchema,
  bookingFilterSchema,
  clientCancellationResponseSchema,
  createClientBookingSchema,
  staffRoleBookingsQuerySchema,
  updateBookingItemStatusSchema,
  updateBookingSchema,
  updateBookingStatusSchema,
} from '@/validators/booking.validators';
import type { Request, Response } from 'express';

const normalizeStaffPosition = (position?: string | null) => {
  const normalized = String(position || '').trim().toUpperCase();
  if (normalized === 'CHEF') {
    return 'COOK';
  }
  return normalized === 'BARMAN' ? 'BARMEN' : normalized;
};

export class BookingController {
  static async create(req: Request, res: Response): Promise<void> {
    console.log(
      `[+] BookingController.create START. URL: ${req.url}, Method: ${req.method}. req.user:`,
      req.user,
    );
    console.log('[+] BookingController.create - incoming body:', req.body);
    const { tableId } = req.body;

    if (!req.user) {
      console.log(`[+] No req.user found, triggering telegram flow.`);
      if (!tableId) {
        return sendValidationError(res, 'Client token or tableId required', []);
      }

      try {
        const { OrderSessionService } =
          await import('@/services/v1/order-session.service');
        const sessionResult =
          await OrderSessionService.createOrderSession(tableId);

        console.log(`[+] Returning 403 with session result:`, sessionResult);
        // Return 401/403 with the telegram URL for frontend to redirect
        res.status(403).json({
          success: false,
          error: 'Authentication required',
          data: sessionResult,
          message: 'Please authenticate via Telegram to complete booking',
        });
        return;
      } catch (error: any) {
        console.error(`[-] Error starting order session:`, error);
        return sendErrorResponse(
          res,
          error.message || 'Failed to initialize session',
        );
      }
    }

    console.log(`[+] Validating body...`);
    const validation = createClientBookingSchema.safeParse({
      ...req.body,
      idempotencyKey: req.header('Idempotency-Key') ?? req.body?.idempotencyKey,
    });

    if (!validation.success) {
      try {
        console.error(
          '[!] createClientBookingSchema validation errors:',
          validation.error.issues,
        );
      } catch (err) {
        console.error('[!] Failed to log validation error details', err);
      }
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    try {
      let clientId: string | null = null;

      if (isClientPayload(req.user)) {
        clientId = req.user.clientId;
      } else if (
        isStandardPayload(req.user) &&
        (req.user.role === 'CLIENT' || req.user.role === 'ADMIN')
      ) {
        const user = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { phoneNumber: true, fullName: true },
        });

        if (!user) {
          return sendNotFoundResponse(res, 'User not found');
        }

        const client = await prisma.client.upsert({
          where: { phoneNumber: user.phoneNumber },
          update: { fullName: user.fullName },
          create: {
            phoneNumber: user.phoneNumber,
            fullName: user.fullName,
          },
        });

        clientId = client.id;
      }

      if (!clientId) {
        return sendValidationError(res, 'Client token required', []);
      }

      const booking = await BookingService.createClientBooking(
        clientId,
        validation.data,
      );
      sendCreatedResponse(res, booking);
    } catch (error: any) {
      if (error.name === 'ConflictError') {
        return sendConflictResponse(res, error.message);
      }
      if (error.name === 'NotFoundError') {
        return sendNotFoundResponse(res, error.message);
      }
      console.error('Error creating booking:', error);
      sendErrorResponse(
        res,
        error.message || 'Band qilishda xatolik yuz berdi',
      );
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const booking = await BookingService.getById(id);
    if (!booking) {
      return sendNotFoundResponse(res, 'Booking not found');
    }

    sendSuccessResponse(res, booking);
  }

  static async getByFilter(req: Request, res: Response): Promise<void> {
    const payload = req.user;

    let resolvedClientId: string | undefined;

    if (payload && isClientPayload(payload)) {
      resolvedClientId = payload.clientId;
    }

    const query = resolvedClientId
      ? { ...req.query, clientId: resolvedClientId }
      : req.query;

    const validation = bookingFilterSchema.safeParse(query);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const bookings = await BookingService.getByFilter(validation.data);
    sendSuccessResponse(res, bookings);
  }

  static async getClientBookings(req: Request, res: Response): Promise<void> {
    const { clientId } = req.params;
    const payload = req.user as JwtPayload | undefined;

    if (payload && isClientPayload(payload) && payload.clientId !== clientId) {
      return sendValidationError(
        res,
        'Access denied. You can only view your own bookings.',
        [],
      );
    }

    if (payload && isStandardPayload(payload) && payload.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { phoneNumber: true },
      });

      if (!user) {
        return sendNotFoundResponse(res, 'User not found');
      }

      const client = await prisma.client.findUnique({
        where: { phoneNumber: user.phoneNumber },
        select: { id: true },
      });

      if (!client || client.id !== clientId) {
        return sendValidationError(
          res,
          'Access denied. Only the owner or ADMIN can view these bookings.',
          [],
        );
      }
    }

    const validation = bookingListQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const bookings = await BookingService.getClientBookingsPaginated(
      clientId,
      validation.data,
    );
    sendSuccessResponse(res, bookings);
  }

  static async update(req: Request, res: Response): Promise<void> {
    const validation = updateBookingSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const booking = await BookingService.update(req.params.id, validation.data);
    sendSuccessResponse(res, booking);
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const validation = updateBookingStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    try {
      const booking = await BookingService.updateStatus(
        id,
        validation.data.status,
        req.user,
        (req as any).staff,
      );
      sendSuccessResponse(res, booking);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return sendNotFoundResponse(res, error.message);
      }
      if (error.name === 'ConflictError') {
        return sendConflictResponse(res, error.message);
      }
      if (error.name === 'AuthorizationError') {
        return sendForbiddenResponse(res, error.message);
      }
      if (error.name === 'ValidationError') {
        return sendValidationError(res, error.message, []);
      }
      sendErrorResponse(
        res,
        error.message || 'Failed to update booking status',
      );
    }
  }

  static async updateItemStatus(req: Request, res: Response): Promise<void> {
    const validation = updateBookingItemStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((issue) => issue.message),
      );
    }

    try {
      const booking = await BookingProgressService.updateBookingItemStatus(
        req.params.id,
        req.params.itemId,
        validation.data.status,
        (req as any).staff,
      );
      sendSuccessResponse(res, booking);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return sendNotFoundResponse(res, error.message);
      }
      if (error.name === 'ConflictError') {
        return sendConflictResponse(res, error.message);
      }
      if (error.name === 'AuthorizationError') {
        return sendForbiddenResponse(res, error.message);
      }
      sendErrorResponse(res, error.message || 'Failed to update booking item');
    }
  }

  static async claimDelivery(req: Request, res: Response): Promise<void> {
    try {
      const booking = await BookingProgressService.claimDelivery(
        req.params.id,
        (req as any).staff,
      );
      sendSuccessResponse(res, booking);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return sendNotFoundResponse(res, error.message);
      }
      if (error.name === 'ConflictError') {
        return sendConflictResponse(res, error.message);
      }
      if (error.name === 'AuthorizationError') {
        return sendForbiddenResponse(res, error.message);
      }
      sendErrorResponse(res, error.message || 'Failed to claim delivery');
    }
  }

  static async completeDelivery(req: Request, res: Response): Promise<void> {
    try {
      const booking = await BookingProgressService.completeDelivery(
        req.params.id,
        (req as any).staff,
      );
      sendSuccessResponse(res, booking);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return sendNotFoundResponse(res, error.message);
      }
      if (error.name === 'ConflictError') {
        return sendConflictResponse(res, error.message);
      }
      if (error.name === 'AuthorizationError') {
        return sendForbiddenResponse(res, error.message);
      }
      sendErrorResponse(res, error.message || 'Failed to complete delivery');
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await BookingService.delete(req.params.id);
    sendNoContentResponse(res);
  }

  static async getAvailableSlots(req: Request, res: Response): Promise<void> {
    const validation = availableSlotsSchema.safeParse({
      ...req.query,
      date: req.query.date,
    });

    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const slots = await BookingService.getAvailableSlots(validation.data);
    sendSuccessResponse(res, slots);
  }

  static async getBusinessBookings(req: Request, res: Response): Promise<void> {
    const { businessId } = req.params;
    if (
      req.user &&
      isStandardPayload(req.user) &&
      req.user.role === 'BUSINESS' &&
      req.user.businessId &&
      req.user.businessId !== businessId
    ) {
      return sendValidationError(
        res,
        'Access denied. You can only view your own business bookings.',
        [],
      );
    }

    const validation = bookingListQuerySchema.safeParse({
      ...req.query,
      size: (req.query as any).pageSize ?? req.query.size,
    });
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const bookings = await BookingService.getBusinessBookingsPaginated(
      businessId,
      validation.data,
    );
    sendSuccessResponse(res, bookings);
  }

  static async getStaffBookings(req: Request, res: Response): Promise<void> {
    const { staffId } = req.params;
    const validation = bookingListQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const payload = req.user as JwtPayload | undefined;
    const isAdmin =
      payload && isStandardPayload(payload) && payload.role === 'ADMIN';
    const authenticatedStaffId =
      (req as any).staff?.staffId ||
      (payload && isStaffPayload(payload) ? payload.staffId : undefined);

    if (
      !isAdmin &&
      (!authenticatedStaffId || authenticatedStaffId !== staffId)
    ) {
      return sendNotFoundResponse(
        res,
        'Access denied. You can only view your own bookings.',
      );
    }

    const bookings = await BookingService.getStaffBookingsPaginated(
      staffId,
      validation.data,
    );
    sendSuccessResponse(res, bookings);
  }

  static async handleClientCancellationResponse(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { id } = req.params;
    const { response, notes } = req.body;
    if (!req.user || !isStandardPayload(req.user)) {
      return sendValidationError(
        res,
        'Registered account required for this action',
        [],
      );
    }

    const clientId = req.user.userId;

    const validation = clientCancellationResponseSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    try {
      const booking = await BookingService.handleClientCancellationResponse(
        id,
        clientId,
        response,
        notes,
      );
      sendSuccessResponse(res, booking);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return sendNotFoundResponse(res, error.message);
      }
      if (error.name === 'ConflictError') {
        return sendConflictResponse(res, error.message);
      }
      throw error;
    }
  }

  static async confirm(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const booking = await BookingService.updateStatus(
      id,
      'CONFIRMED',
      req.user,
      (req as any).staff,
    );
    sendSuccessResponse(res, booking);
  }

  static async complete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const booking = await BookingService.updateStatus(
      id,
      'COMPLETED',
      req.user,
      (req as any).staff,
    );
    sendSuccessResponse(res, booking);
  }

  static async staffCancel(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    if (!cancellationReason) {
      return sendValidationError(res, 'Cancellation reason is required', []);
    }

    const booking = await BookingService.staffCancel(id, cancellationReason);
    sendSuccessResponse(res, booking);
  }

  static async clientConfirmCancel(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const booking = await BookingService.clientConfirmCancel(id);
    sendSuccessResponse(res, booking);
  }

  static async clientInitiateCancel(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    if (!req.user || !isStandardPayload(req.user)) {
      return sendValidationError(
        res,
        'Registered account required for this action',
        [],
      );
    }

    const clientId = req.user.userId;

    if (!cancellationReason) {
      return sendValidationError(res, 'Cancellation reason is required', []);
    }

    try {
      const booking = await BookingService.clientInitiateCancel(
        id,
        clientId,
        cancellationReason,
      );
      sendSuccessResponse(res, booking);
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.name === 'ConflictError') {
        return sendNotFoundResponse(res, error.message);
      }
      throw error;
    }
  }

  static async handleStaffCancellationResponse(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { id } = req.params;
    const { response, notes } = req.body;
    const staffId = (req as any).staff?.staffId;

    if (!staffId) {
      return sendValidationError(res, 'Staff ID not found in request', []);
    }

    const validation = clientCancellationResponseSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    try {
      const booking = await BookingService.handleStaffCancellationResponse(
        id,
        staffId,
        response,
        notes,
      );
      sendSuccessResponse(res, booking);
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.name === 'ConflictError') {
        return sendNotFoundResponse(res, error.message);
      }
      throw error;
    }
  }

  static async getStaffAvailability(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { staffId, date } = req.query;

    if (!staffId || !date) {
      return sendValidationError(res, 'Staff ID and date are required', []);
    }

    try {
      const availability = await BookingService.getStaffAvailability(
        staffId as string,
        date as string,
      );
      sendSuccessResponse(res, availability);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return sendNotFoundResponse(res, error.message);
      }
      throw error;
    }
  }

  /**
   * GET /booking/staff?type=WAITER&bookingId=...&status=...&page=1&size=10
   *
   * Staff authenticates with their token. The server looks up the staff's
   * position from the DB and applies role-based filtering:
   *   MANAGER / CASHIER  → all bookings for their business
   *   Others             → only their own assigned bookings
   */
  static async getBookingsByStaffRole(
    req: Request,
    res: Response,
  ): Promise<void> {
    const staffPayload = (req as any).staff;

    if (!staffPayload?.staffId) {
      return sendValidationError(res, 'Staff authentication required', []);
    }

    const validation = staffRoleBookingsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    // Fetch staff's actual position from DB
    const staff = await prisma.staff.findUnique({
      where: { id: staffPayload.staffId },
      select: { id: true, position: true, businessId: true, isActive: true },
    });

    if (!staff || !staff.isActive) {
      return sendNotFoundResponse(res, 'Staff not found or inactive');
    }

    if (
      normalizeStaffPosition(staff.position) !==
      normalizeStaffPosition(validation.data.type)
    ) {
      return sendValidationError(
        res,
        'Type parameter does not match your staff position',
        [],
      );
    }

    const isElevated = ['MANAGER', 'CASHIER'].includes(
      normalizeStaffPosition(staff.position),
    );
    const hasPagination =
      Object.prototype.hasOwnProperty.call(req.query, 'page') ||
      Object.prototype.hasOwnProperty.call(req.query, 'size');

    try {
      const bookings = await BookingService.getStaffRoleBookings(
        staff.id,
        staff.businessId,
        staff.position,
        validation.data,
        { unpaginated: !hasPagination },
      );
      sendSuccessResponse(res, bookings);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return sendNotFoundResponse(res, error.message);
      }
      sendErrorResponse(res, error.message || 'Failed to fetch bookings');
    }
  }
}
