import { WorkingHoursService } from '@/services/v1/working-hours.service';
import {
  sendCreatedResponse,
  sendNoContentResponse,
  sendSuccessResponse,
  sendValidationError,
} from '@/utils/response.handler';
import {
  createStaffWorkingHoursSchema,
  createWorkingHoursSchema,
  updateWorkingHoursSchema,
} from '@/validators/working-hours.validators';
import type { Request, Response } from 'express';

export class WorkingHoursController {
  static async createBusinessWorkingHours(
    req: Request,
    res: Response,
  ): Promise<void> {
    const validation = createWorkingHoursSchema.safeParse(req.body);
    if (!validation.success) {
      console.error(
        'createBusinessWorkingHours - validation failed:',
        validation.error.issues,
      );
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const workingHours = await WorkingHoursService.createBusinessWorkingHours(
      validation.data,
    );
    sendCreatedResponse(res, workingHours);
  }

  static async createStaffWorkingHours(
    req: Request,
    res: Response,
  ): Promise<void> {
    const validation = createStaffWorkingHoursSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const workingHours = await WorkingHoursService.createStaffWorkingHours(
      validation.data,
    );
    sendCreatedResponse(res, workingHours);
  }

  static async getBusinessWorkingHours(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { businessId } = req.params;

    const workingHours =
      await WorkingHoursService.getBusinessWorkingHours(businessId);
    sendSuccessResponse(res, workingHours);
  }

  static async getStaffWorkingHours(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { staffId } = req.params;
    const workingHours =
      await WorkingHoursService.getStaffWorkingHours(staffId);
    sendSuccessResponse(res, workingHours);
  }

  static async updateBusinessWorkingHours(
    req: Request,
    res: Response,
  ): Promise<void> {
    const validation = updateWorkingHoursSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const workingHours = await WorkingHoursService.updateBusinessWorkingHours(
      req.params.id,
      validation.data,
    );
    sendSuccessResponse(res, workingHours);
  }

  static async updateStaffWorkingHours(
    req: Request,
    res: Response,
  ): Promise<void> {
    const validation = updateWorkingHoursSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const workingHours = await WorkingHoursService.updateStaffWorkingHours(
      req.params.id,
      validation.data,
    );
    sendSuccessResponse(res, workingHours);
  }

  static async deleteBusinessWorkingHours(
    req: Request,
    res: Response,
  ): Promise<void> {
    await WorkingHoursService.deleteBusinessWorkingHours(req.params.id);
    sendNoContentResponse(res);
  }

  static async deleteStaffWorkingHours(
    req: Request,
    res: Response,
  ): Promise<void> {
    await WorkingHoursService.deleteStaffWorkingHours(req.params.id);
    sendNoContentResponse(res);
  }
}
