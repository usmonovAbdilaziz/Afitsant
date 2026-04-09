import { StaffAuthService } from '@/services/auth/staff-auth.service';
import type { StaffJwtPayload } from '@/types/auth.types';
import {
  sendSuccessResponse,
  sendValidationError,
  sendUnauthorizedResponse,
  sendNotFoundResponse,
} from '@/utils/response.handler';
import type { Request, Response } from 'express';
import { z } from 'zod';

const staffLoginSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

export class StaffAuthController {
  static async login(req: Request, res: Response): Promise<void> {
    const validation = staffLoginSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const result = await StaffAuthService.login(validation.data);
    sendSuccessResponse(res, result);
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    const staffId = (req as RequestWithStaff).staff?.staffId;
    if (!staffId) {
      return sendUnauthorizedResponse(res, 'Staff authentication required');
    }

    const staffData = await StaffAuthService.getStaffById(staffId);
    if (!staffData) {
      return sendNotFoundResponse(res, 'Staff not found');
    }

    sendSuccessResponse(res, staffData);
  }
}

interface RequestWithStaff extends Request {
  staff?: StaffJwtPayload;
}
