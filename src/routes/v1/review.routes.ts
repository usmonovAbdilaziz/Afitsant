import { ReviewController } from '@/controllers/v1/review.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { Router } from 'express';

const reviewRoutes = Router();

reviewRoutes.get(
  '/business/:businessId',
  asyncHandler(ReviewController.getByBusinessId.bind(ReviewController)),
);
reviewRoutes.get(
  '/business/:businessId/stats',
  asyncHandler(ReviewController.getBusinessRatingStats.bind(ReviewController)),
);
reviewRoutes.get(
  '/:id',
  asyncHandler(ReviewController.getById.bind(ReviewController)),
);

// Staff review routes
reviewRoutes.get(
  '/staff/:staffId',
  asyncHandler(ReviewController.getByStaffId.bind(ReviewController)),
);
reviewRoutes.get(
  '/staff/:staffId/stats',
  asyncHandler(ReviewController.getStaffRatingStats.bind(ReviewController)),
);

reviewRoutes.use(AuthMiddleware.authenticate.bind(AuthMiddleware));

// CLIENT-only routes
// Move client-specific routes to a separate router to avoid blocking BUSINESS users
const clientReviewRoutes = Router();
clientReviewRoutes.use(AuthMiddleware.requireClient.bind(AuthMiddleware));

clientReviewRoutes.post(
  '/',
  asyncHandler(ReviewController.create.bind(ReviewController)),
);
clientReviewRoutes.patch(
  '/:id',
  asyncHandler(ReviewController.update.bind(ReviewController)),
);
clientReviewRoutes.delete(
  '/:id',
  asyncHandler(ReviewController.delete.bind(ReviewController)),
);

// Mount client-specific routes
reviewRoutes.use('/client', clientReviewRoutes);

export { reviewRoutes };
