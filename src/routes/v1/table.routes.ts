import { TableController } from '@/controllers/v1/table.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { Router } from 'express';

const tableRoutes = Router();

// Public routes (biznes stollarini ko'rish)
tableRoutes.get(
  '/',
  asyncHandler(TableController.getByFilter.bind(TableController)),
);
tableRoutes.get(
  '/:id',
  asyncHandler(TableController.getById.bind(TableController)),
);
tableRoutes.get(
  '/business/:businessId',
  asyncHandler(TableController.getByBusiness.bind(TableController)),
);

// Protected routes (faqat BUSINESS uchun)
tableRoutes.post(
  '/',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(TableController.create.bind(TableController)),
);
tableRoutes.patch(
  '/:id',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(TableController.update.bind(TableController)),
);
tableRoutes.delete(
  '/:id',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireBusiness.bind(AuthMiddleware),
  asyncHandler(TableController.delete.bind(TableController)),
);

export { tableRoutes };
