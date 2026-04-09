import { WorkingHoursController } from '@/controllers/v1/working-hours.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { Router } from 'express';

const workingHoursRoutes = Router();

workingHoursRoutes.get(
  '/business/:businessId',
  asyncHandler(
    WorkingHoursController.getBusinessWorkingHours.bind(WorkingHoursController),
  ),
);
workingHoursRoutes.get(
  '/staff/:staffId',
  asyncHandler(
    WorkingHoursController.getStaffWorkingHours.bind(WorkingHoursController),
  ),
);

// Protected routes (authentication va business authorization kerak)
workingHoursRoutes.use(AuthMiddleware.authenticate.bind(AuthMiddleware));
workingHoursRoutes.use(AuthMiddleware.requireBusiness.bind(AuthMiddleware));

workingHoursRoutes.post(
  '/business',
  asyncHandler(
    WorkingHoursController.createBusinessWorkingHours.bind(
      WorkingHoursController,
    ),
  ),
);
workingHoursRoutes.post(
  '/staff',
  asyncHandler(
    WorkingHoursController.createStaffWorkingHours.bind(WorkingHoursController),
  ),
);

workingHoursRoutes.patch(
  '/business/:id',
  asyncHandler(
    WorkingHoursController.updateBusinessWorkingHours.bind(
      WorkingHoursController,
    ),
  ),
);
workingHoursRoutes.patch(
  '/staff/:id',
  asyncHandler(
    WorkingHoursController.updateStaffWorkingHours.bind(WorkingHoursController),
  ),
);

workingHoursRoutes.delete(
  '/business/:id',
  asyncHandler(
    WorkingHoursController.deleteBusinessWorkingHours.bind(
      WorkingHoursController,
    ),
  ),
);
workingHoursRoutes.delete(
  '/staff/:id',
  asyncHandler(
    WorkingHoursController.deleteStaffWorkingHours.bind(WorkingHoursController),
  ),
);

export { workingHoursRoutes };
