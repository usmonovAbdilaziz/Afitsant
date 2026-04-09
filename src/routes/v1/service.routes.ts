import { ServiceController } from '@/controllers/v1/service.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { upload } from '@/middleware/upload.middleware';
import { Router } from 'express';

const serviceRoutes = Router();

serviceRoutes.get(
  '/',
  asyncHandler(ServiceController.getByFilter.bind(ServiceController)),
);
serviceRoutes.get(
  '/:id',
  asyncHandler(ServiceController.getById.bind(ServiceController)),
);

// Protected routes (faqat BUSINESS uchun)
// POST, PATCH, DELETE uchun authenticate va requireBusiness middleware
serviceRoutes.post(
  '/',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  upload.single('photoUrl'),
  asyncHandler(ServiceController.create.bind(ServiceController)),
);
serviceRoutes.patch(
  '/:id',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  upload.single('photoUrl'),
  asyncHandler(ServiceController.update.bind(ServiceController)),
);
serviceRoutes.delete(
  '/:id',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(ServiceController.delete.bind(ServiceController)),
);

export { serviceRoutes };
