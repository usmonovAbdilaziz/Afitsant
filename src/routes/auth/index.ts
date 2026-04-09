import { AuthController } from '@/controllers/auth/auth.controller';
import { StaffAuthController } from '@/controllers/auth/staff-auth.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { StaffAuthMiddleware } from '@/middleware/staff-auth.middleware';
import { authLimiter } from '@/middleware/rate-limit.middleware';
import { upload } from '@/middleware/upload.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { Router } from 'express';

const router = Router();

// Auth endpointlarga qattiq rate limit - brute-force himoyasi
router.post(
  '/register/client',
  authLimiter,
  upload.single('profilePhoto'),
  asyncHandler(AuthController.registerClient.bind(AuthController)),
);
router.post(
  '/register/business',
  authLimiter,
  upload.single('profilePhoto'),
  asyncHandler(AuthController.registerBusiness.bind(AuthController)),
);
router.post(
  '/register/staff',
  authLimiter,
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(AuthController.registerStaff.bind(AuthController)),
);
router.post(
  '/login',
  authLimiter,
  asyncHandler(AuthController.login.bind(AuthController)),
);
router.post(
  '/staff-login',
  authLimiter,
  asyncHandler(AuthController.staffLogin.bind(AuthController)),
);

router.get(
  '/me',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  asyncHandler(AuthController.getMe.bind(AuthController)),
);

router.post(
  '/change-password',
  authLimiter,
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  asyncHandler(AuthController.changePassword.bind(AuthController)),
);

router.patch(
  '/update-profile',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  upload.single('profilePhoto'),
  asyncHandler(AuthController.updateProfile.bind(AuthController)),
);

// Staff authentication endpoints
router.post(
  '/staff/login',
  authLimiter,
  asyncHandler(StaffAuthController.login.bind(StaffAuthController)),
);

router.get(
  '/staff/me',
  StaffAuthMiddleware.authenticate.bind(StaffAuthMiddleware),
  asyncHandler(StaffAuthController.getMe.bind(StaffAuthController)),
);

export default router;
