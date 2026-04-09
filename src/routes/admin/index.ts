import { Router } from 'express';
import { AdminController } from '@/controllers/admin/admin.controller';
import { UserManagementController } from '@/controllers/admin/user-management.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { AdminMiddleware } from '@/middleware/admin.middleware';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(AuthMiddleware.authenticate);

// Apply admin middleware to all admin routes (except making a user admin which should be restricted differently)
router.use(AdminMiddleware.requireAdmin);

// ==================== USER MANAGEMENT ROUTES ====================
// Get all users
router.get('/users', asyncHandler(AdminController.getAllUsers));
// Get user by ID
router.get('/users/:id', asyncHandler(AdminController.getUserById));
// Update user by ID
router.patch('/users/:id', asyncHandler(AdminController.updateUser));
// Delete user by ID
router.delete('/users/:id', asyncHandler(AdminController.deleteUser));

// Advanced user management
router.get(
  '/user-management/users/:userId',
  asyncHandler(UserManagementController.getUserById),
);
router.post(
  '/user-management/users/:userId/role',
  asyncHandler(UserManagementController.updateUserRole),
);
router.post(
  '/user-management/users/:userId/disable',
  asyncHandler(UserManagementController.disableUser),
);
router.post(
  '/user-management/users/:userId/enable',
  asyncHandler(UserManagementController.enableUser),
);

// ==================== BUSINESS MANAGEMENT ROUTES ====================
// Get all businesses
router.get('/businesses', asyncHandler(AdminController.getAllBusinesses));
// Get business by ID
router.get('/businesses/:id', asyncHandler(AdminController.getBusinessById));
// Update business by ID
router.patch('/businesses/:id', asyncHandler(AdminController.updateBusiness));
// Update business approval status
router.patch(
  '/businesses/:id/approve',
  asyncHandler(AdminController.updateBusinessApprovalStatus),
);
// Delete business by ID
router.delete('/businesses/:id', asyncHandler(AdminController.deleteBusiness));

// ==================== STAFF MANAGEMENT ROUTES ====================
// Get all staff
router.get('/staff', asyncHandler(AdminController.getAllStaff));
// Get staff by ID
router.get('/staff/:id', asyncHandler(AdminController.getStaffById));
// Update staff by ID
router.patch('/staff/:id', asyncHandler(AdminController.updateStaff));
// Delete staff by ID
router.delete('/staff/:id', asyncHandler(AdminController.deleteStaff));

// ==================== SERVICE MANAGEMENT ROUTES ====================
// Get all services
router.get('/services', asyncHandler(AdminController.getAllServices));
// Get service by ID
router.get('/services/:id', asyncHandler(AdminController.getServiceById));
// Update service by ID
router.patch('/services/:id', asyncHandler(AdminController.updateService));
// Delete service by ID
router.delete('/services/:id', asyncHandler(AdminController.deleteService));

// ==================== BOOKING MANAGEMENT ROUTES ====================
// Get all bookings
router.get('/bookings', asyncHandler(AdminController.getAllBookings));
// Get booking by ID
router.get('/bookings/:id', asyncHandler(AdminController.getBookingById));
// Update booking by ID
router.patch('/bookings/:id', asyncHandler(AdminController.updateBooking));
// Delete booking by ID
router.delete('/bookings/:id', asyncHandler(AdminController.deleteBooking));

// ==================== REVIEW MANAGEMENT ROUTES ====================
// Get all reviews
router.get('/reviews', asyncHandler(AdminController.getAllReviews));
// Get review by ID
router.get('/reviews/:id', asyncHandler(AdminController.getReviewById));
// Update review by ID
router.patch('/reviews/:id', asyncHandler(AdminController.updateReview));
// Delete review by ID
router.delete('/reviews/:id', asyncHandler(AdminController.deleteReview));

// Legacy route for making user admin
router.post(
  '/users/:userId/make-admin',
  asyncHandler(UserManagementController.makeUserAdmin),
);

// ==================== NOTIFICATION MANAGEMENT ROUTES ====================
// Get all notifications
router.get('/notifications', asyncHandler(AdminController.getAllNotifications));
// Get notification by ID
router.get(
  '/notifications/:id',
  asyncHandler(AdminController.getNotificationById),
);
// Update notification by ID
router.patch(
  '/notifications/:id',
  asyncHandler(AdminController.updateNotification),
);
// Delete notification by ID
router.delete(
  '/notifications/:id',
  asyncHandler(AdminController.deleteNotification),
);

export default router;
