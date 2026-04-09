import { StaffController } from '@/controllers/v1/staff.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { StaffAuthMiddleware } from '@/middleware/staff-auth.middleware';
import { StaffAuthService } from '@/services/auth/staff-auth.service';
import { isStandardPayload } from '@/types/auth.types';
import { upload } from '@/middleware/upload.middleware';
import { TokenUtil } from '@/utils/token';
import { asyncHandler } from '@/utils/asyncHandler';
import { Router } from 'express';

const staffRoutes = Router();

// Allow either legacy staff token or standard JWT with role STAFF/BUSINESS/ADMIN
const authenticateStaffOrUser = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  try {
    const payload = StaffAuthService.verifyStaffToken(token);
    req.staff = payload;
    return next();
  } catch (_e) {
    try {
      const userPayload = TokenUtil.verifyToken(token);
      req.user = userPayload;
      if (
        !isStandardPayload(userPayload) ||
        !['STAFF', 'BUSINESS', 'ADMIN'].includes(userPayload.role)
      ) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      if (userPayload.role === 'STAFF' && userPayload.staffId) {
        req.staff = {
          staffId: userPayload.staffId,
          businessId: userPayload.businessId || '',
          fullName: '',
          phoneNumber: '',
          role: 'STAFF',
          sub: userPayload.userId,
        };
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  }
};

// Public route (kept for backward compatibility, but /auth/staff/login is preferred)
staffRoutes.get(
  '/login',
  asyncHandler(StaffController.login.bind(StaffController)),
);

// Staff-authenticated routes (staff can manage their own profile)
staffRoutes.get(
  '/me',
  authenticateStaffOrUser,
  asyncHandler(StaffController.getById.bind(StaffController)),
);

staffRoutes.patch(
  '/me',
  authenticateStaffOrUser,
  upload.single('profilePhoto'),
  asyncHandler(StaffController.update.bind(StaffController)),
);

// Business-authenticated routes (business owner can manage staff)
staffRoutes.post(
  '/',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  upload.single('profilePhoto'),
  asyncHandler(StaffController.create.bind(StaffController)),
);

staffRoutes.get(
  '/:id',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  asyncHandler(StaffController.getById.bind(StaffController)),
);

staffRoutes.get(
  '/business/:businessId',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  asyncHandler(StaffController.getByBusiness.bind(StaffController)),
);

staffRoutes.patch(
  '/:id',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  upload.single('profilePhoto'),
  asyncHandler(StaffController.update.bind(StaffController)),
);

staffRoutes.delete(
  '/:id',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(StaffController.delete.bind(StaffController)),
);

staffRoutes.post(
  '/assign-service',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(StaffController.assignService.bind(StaffController)),
);

staffRoutes.delete(
  '/:staffId/services/:serviceId',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(StaffController.removeService.bind(StaffController)),
);

export { staffRoutes };
