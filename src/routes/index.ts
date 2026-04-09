import { AuthMiddleware } from '@/middleware/auth.middleware';
import { Router } from 'express';
import authRoutes from './auth';
import adminRoutes from './admin';
import telegramRoutes from './telegram';
import {
  bookingRoutes,
  businessRoutes,
  notificationRoutes,
  reviewRoutes,
  serviceRoutes,
  staffRoutes,
  tableRoutes,
  workingHoursRoutes,
  orderRoutes,
} from './v1';
import socketIoRoutes from './v1/socket-io.route';

const router = Router();

// Admin routes - protected by authentication
router.use('/api/v1/admin', adminRoutes);

// Mount business routes directly under /api/v1 to match API documentation
router.use('/api/v1/business', businessRoutes);

// Protected routes - har bir route o'zi authenticate middleware'ni qo'shadi
// Alohida path bilan qo'shiladi (route conflict bo'lmasligi uchun)
// Service routes birinchi qo'shiladi (route matching muammosini oldini olish uchun)
router.use('/api/v1/service', serviceRoutes);
router.use('/api/v1/staff', staffRoutes);
router.use('/api/v1/table', tableRoutes);
router.use('/api/v1/working-hours', workingHoursRoutes);
router.use('/api/v1/booking', bookingRoutes);
router.use('/api/v1/notification', notificationRoutes);
router.use('/api/v1/review', reviewRoutes);
router.use('/api/v1/orders', orderRoutes);
router.use('/api/v1/socket', socketIoRoutes);
// Public routes - keyin qo'shiladi (route matching muammosini oldini olish uchun)
// Create a separate route for public staff access
router.use('/api/v1/public', businessRoutes, reviewRoutes);

// Add public staff routes without authentication
router.get(
  '/api/v1/public/staff/business/:businessId',
  AuthMiddleware.optionalAuth.bind(AuthMiddleware),
  (req, res, next) => {
    // Import the controller dynamically to avoid circular dependencies
    import('@/controllers/v1/staff.controller')
      .then(({ StaffController }) => {
        StaffController.getByBusiness(req, res).catch(next);
      })
      .catch(next);
  },
);

// Add public service routes without authentication
router.get(
  '/api/v1/public/service',
  AuthMiddleware.optionalAuth.bind(AuthMiddleware),
  (req, res, next) => {
    // Import the controller dynamically to avoid circular dependencies
    import('@/controllers/v1/service.controller')
      .then(({ ServiceController }) => {
        ServiceController.getByFilter(req, res).catch(next);
      })
      .catch(next);
  },
);

router.use('/auth', authRoutes);
router.use('/api/telegram', telegramRoutes);

export default router;
