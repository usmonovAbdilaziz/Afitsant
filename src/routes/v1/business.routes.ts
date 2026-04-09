import { BusinessController } from '@/controllers/v1/business.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { Router } from 'express';

const businessRoutes = Router();
businessRoutes.get(
  '/all',
  asyncHandler(BusinessController.getAllBusiness.bind(BusinessController)),
);
businessRoutes.get(
  '/',
  asyncHandler(BusinessController.getAllBusiness.bind(BusinessController)),
);
businessRoutes.get(
  '/nearby',
  asyncHandler(BusinessController.discoverNearby.bind(BusinessController)),
);
businessRoutes.get(
  '/:id',
  asyncHandler(BusinessController.getById.bind(BusinessController)),
);

// Allow business owners to update their business (aksiya/notification)
businessRoutes.patch(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireBusiness,
  asyncHandler(BusinessController.updateAksiya.bind(BusinessController)),
);

export { businessRoutes };
