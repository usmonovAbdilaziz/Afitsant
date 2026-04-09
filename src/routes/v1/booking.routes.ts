import { BookingController } from '@/controllers/v1/booking.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { StaffAuthMiddleware } from '@/middleware/staff-auth.middleware';
import { bookingLimiter } from '@/middleware/rate-limit.middleware';
import { StaffAuthService } from '@/services/auth/staff-auth.service';
import { isStandardPayload } from '@/types/auth.types';
import { asyncHandler } from '@/utils/asyncHandler';
import { TokenUtil } from '@/utils/token';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { UserType } from '@/generated/prisma';

const bookingRoutes = Router();

bookingRoutes.get(
  '/available-slots',
  asyncHandler(BookingController.getAvailableSlots.bind(BookingController)),
);

// Staff-authenticated routes (must be registered BEFORE the user AuthMiddleware)
bookingRoutes.get(
  '/staff/:staffId',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  asyncHandler(BookingController.getStaffBookings.bind(BookingController)),
);

// GET /booking/staff?type=WAITER&bookingId=...&status=...&page=1&size=10
// Staff role-based booking query — MANAGER/CASHIER see all, others see own
bookingRoutes.get(
  '/staff',
  StaffAuthMiddleware.authenticate.bind(StaffAuthMiddleware),
  asyncHandler(BookingController.getBookingsByStaffRole.bind(BookingController)),
);

const authenticateStaffOrBusiness = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No token provided',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const staffPayload = StaffAuthService.verifyStaffToken(token);
    req.staff = staffPayload;
    next();
    return;
  } catch (_error) {
    // ignore and try user token
  }

  try {
    const userPayload = TokenUtil.verifyToken(token);
    req.user = userPayload;

    if (
      !isStandardPayload(userPayload) ||
      (userPayload.userType !== UserType.BUSINESS &&
        userPayload.userType !== UserType.ADMIN)
    ) {
      res.status(403).json({
        success: false,
        error: 'Access denied. Business account required',
      });
      return;
    }

    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};

bookingRoutes.patch(
  '/:id/confirm',
  authenticateStaffOrBusiness,
  asyncHandler(BookingController.confirm.bind(BookingController)),
);

bookingRoutes.patch(
  '/:id/complete',
  authenticateStaffOrBusiness,
  asyncHandler(BookingController.complete.bind(BookingController)),
);

bookingRoutes.patch(
  '/:id/staff-cancel',
  authenticateStaffOrBusiness,
  asyncHandler(BookingController.staffCancel.bind(BookingController)),
);

bookingRoutes.patch(
  '/:id/staff-cancellation-response',
  StaffAuthMiddleware.authenticate.bind(StaffAuthMiddleware),
  asyncHandler(
    BookingController.handleStaffCancellationResponse.bind(BookingController),
  ),
);

bookingRoutes.patch(
  '/:id/status',
  authenticateStaffOrBusiness,
  asyncHandler(BookingController.updateStatus.bind(BookingController)),
);

bookingRoutes.patch(
  '/:id/items/:itemId/progress',
  StaffAuthMiddleware.authenticate.bind(StaffAuthMiddleware),
  asyncHandler(BookingController.updateItemStatus.bind(BookingController)),
);

bookingRoutes.patch(
  '/:id/delivery/claim',
  StaffAuthMiddleware.authenticate.bind(StaffAuthMiddleware),
  asyncHandler(BookingController.claimDelivery.bind(BookingController)),
);

bookingRoutes.patch(
  '/:id/delivery/complete',
  StaffAuthMiddleware.authenticate.bind(StaffAuthMiddleware),
  asyncHandler(BookingController.completeDelivery.bind(BookingController)),
);

// CLIENT-only routes
const clientBookingRoutes = Router();
clientBookingRoutes.use((req, res, next) => {
  if (req.method === 'POST') {
    // Allow unauthenticated POST for the initial booking creation so it can trigger Telegram session 403
    return AuthMiddleware.optionalAuth(req, res, next);
  }
  return AuthMiddleware.authenticate(req, res, () =>
    AuthMiddleware.requireClient(req, res, next),
  );
});

// Booking yaratish - rate limit bilan spam oldini olish
clientBookingRoutes.post(
  '/',
  bookingLimiter,
  asyncHandler(BookingController.create.bind(BookingController)),
);
clientBookingRoutes.get(
  '/',
  asyncHandler(BookingController.getByFilter.bind(BookingController)),
);
clientBookingRoutes.get(
  '/:clientId',
  asyncHandler(BookingController.getClientBookings.bind(BookingController)),
);
clientBookingRoutes.patch(
  '/:id',
  asyncHandler(BookingController.update.bind(BookingController)),
);
clientBookingRoutes.delete(
  '/:id',
  asyncHandler(BookingController.delete.bind(BookingController)),
);
clientBookingRoutes.patch(
  '/:id/cancellation-response',
  asyncHandler(
    BookingController.handleClientCancellationResponse.bind(BookingController),
  ),
);

clientBookingRoutes.patch(
  '/:id/confirm-cancel',
  asyncHandler(BookingController.clientConfirmCancel.bind(BookingController)),
);

clientBookingRoutes.patch(
  '/:id/initiate-cancel',
  asyncHandler(BookingController.clientInitiateCancel.bind(BookingController)),
);

// Mount client-specific routes BEFORE the global authenticate hook!
bookingRoutes.use('/client', clientBookingRoutes);

// Authenticated routes (both CLIENT and BUSINESS)
bookingRoutes.use(AuthMiddleware.authenticate.bind(AuthMiddleware));

// BUSINESS can access their own booking endpoints
bookingRoutes.get(
  '/business/:businessId',
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(BookingController.getBusinessBookings.bind(BookingController)),
);

bookingRoutes.get(
  '/buseness/:businessId',
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(BookingController.getBusinessBookings.bind(BookingController)),
);

// BUSINESS can update booking status for bookings in their business
bookingRoutes.patch(
  '/business/:businessId/:id',
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(BookingController.update.bind(BookingController)),
);

// Get staff availability
bookingRoutes.get(
  '/staff-availability',
  asyncHandler(BookingController.getStaffAvailability.bind(BookingController)),
);

export { bookingRoutes };
