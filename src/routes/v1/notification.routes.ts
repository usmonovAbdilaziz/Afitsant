import { NotificationController } from '@/controllers/v1/notification.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { Router } from 'express';

const notificationRoutes = Router();

// Apply authentication middleware to all notification routes
notificationRoutes.use(AuthMiddleware.authenticate.bind(AuthMiddleware));

// Client can access their own notifications
notificationRoutes.get(
  '/client',
  AuthMiddleware.requireClient.bind(AuthMiddleware),
  asyncHandler(
    NotificationController.getUserNotifications.bind(NotificationController),
  ),
);

// Business can access their own notifications
notificationRoutes.get(
  '/business',
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(
    NotificationController.getUserNotifications.bind(NotificationController),
  ),
);

// Business can create notifications for their clients
notificationRoutes.post(
  '/business',
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(
    NotificationController.createBusinessNotification.bind(
      NotificationController,
    ),
  ),
);

// Business can report a problem to admins
notificationRoutes.post(
  '/report',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  asyncHandler(NotificationController.createReport.bind(NotificationController)),
);

// Get reports created by current user
notificationRoutes.get(
  '/report/mine',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  asyncHandler(NotificationController.getMyReports.bind(NotificationController)),
);

// Admin: get all reports
notificationRoutes.get(
  '/report',
  AuthMiddleware.requireAdmin.bind(AuthMiddleware),
  asyncHandler(NotificationController.getAllReports.bind(NotificationController)),
);

// Delete a report (admin or owner)
notificationRoutes.delete(
  '/report/:id',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  asyncHandler(NotificationController.deleteReport.bind(NotificationController)),
);

export { notificationRoutes };
