import { StaffService } from '@/services/v1/staff.service';
import type { StaffJwtPayload } from '@/types/auth.types';
import {
  sendCreatedResponse,
  sendNoContentResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
  sendValidationError,
  sendUnauthorizedResponse,
} from '@/utils/response.handler';
import {
  assignServiceSchema,
  createStaffSchema,
  updateStaffSchema,
} from '@/validators/staff.validators';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export class StaffController {
  static async create(req: Request, res: Response): Promise<void> {
    const staffData = { ...req.body };

    // If a file was uploaded, use its path as the profile photo
    if (req.file) {
      staffData.profilePhoto = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Preprocess FormData fields
    if (staffData.isActive === 'true') {
      staffData.isActive = true;
    } else if (staffData.isActive === 'false') {
      staffData.isActive = false;
    }

    // Handle serviceIds from FormData
    if (staffData.serviceIds) {
      if (typeof staffData.serviceIds === 'string') {
        const sid = staffData.serviceIds.trim();
        if (sid.startsWith('[')) {
          try {
            staffData.serviceIds = JSON.parse(sid);
          } catch {
            staffData.serviceIds = [sid];
          }
        } else {
          staffData.serviceIds = [sid];
        }
      }
    }

    // Clean up profilePhoto if it's an empty object or string "undefined"/"null" from FormData
    if (typeof staffData.profilePhoto === 'object' && !req.file) {
      delete staffData.profilePhoto;
    }
    if (
      staffData.profilePhoto === 'undefined' ||
      staffData.profilePhoto === 'null' ||
      staffData.profilePhoto === ''
    ) {
      delete staffData.profilePhoto;
    }

    const validation = createStaffSchema.safeParse(staffData);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const staff = await StaffService.create(validation.data);
    sendCreatedResponse(res, staff);
  }

  static async getById(req: Request, res: Response): Promise<void> {
    // Check if staff is accessing their own profile
    const staffData = (req as RequestWithStaff).staff;
    const requestedId = req.params.id;

    // If staff JWT exists and no id param or accessing /me, return staff's own data
    if (staffData && (!requestedId || requestedId === 'me')) {
      const staff = await StaffService.getById(staffData.staffId);
      if (!staff) {
        return sendNotFoundResponse(res, 'Staff not found');
      }
      return sendSuccessResponse(res, staff);
    }

    // Otherwise, check regular user auth (business owner accessing staff)
    const { id } = req.params;
    const staff = await StaffService.getById(id);
    if (!staff) {
      return sendNotFoundResponse(res, 'Staff not found');
    }

    sendSuccessResponse(res, staff);
  }

  static async getByBusiness(req: Request, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { isActive } = req.query;

    const staffs = await StaffService.getByBusinessId(
      businessId,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );

    sendSuccessResponse(res, staffs);
  }

  static async update(req: Request, res: Response): Promise<void> {
    const staffUpdateData = { ...req.body };

    // If a file was uploaded, use its path as the profile photo
    if (req.file) {
      staffUpdateData.profilePhoto = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Preprocess FormData fields
    if (staffUpdateData.isActive === 'true') {
      staffUpdateData.isActive = true;
    } else if (staffUpdateData.isActive === 'false') {
      staffUpdateData.isActive = false;
    }

    // Handle serviceIds from FormData
    if (staffUpdateData.serviceIds) {
      if (typeof staffUpdateData.serviceIds === 'string') {
        const sid = staffUpdateData.serviceIds.trim();
        if (sid.startsWith('[')) {
          try {
            staffUpdateData.serviceIds = JSON.parse(sid);
          } catch {
            staffUpdateData.serviceIds = [sid];
          }
        } else {
          staffUpdateData.serviceIds = [sid];
        }
      }
    }

    // Clean up profilePhoto if it's an empty object or invalid string
    if (typeof staffUpdateData.profilePhoto === 'object' && !req.file) {
      delete staffUpdateData.profilePhoto;
    }
    if (
      staffUpdateData.profilePhoto === 'undefined' ||
      staffUpdateData.profilePhoto === 'null' ||
      staffUpdateData.profilePhoto === ''
    ) {
      delete staffUpdateData.profilePhoto;
    }

    const validation = updateStaffSchema.safeParse(staffUpdateData);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    // Check if staff is updating their own profile
    const staffData = (req as RequestWithStaff).staff;
    const requestedId = req.params.id;

    let staffId: string;
    if (staffData && (!requestedId || requestedId === 'me')) {
      // Staff updating their own profile
      staffId = staffData.staffId;
    } else {
      // Business owner updating staff profile
      staffId = req.params.id;
    }

    // Delete old photo file if a new one is being uploaded
    if (req.file && staffId) {
      const existingStaff = await StaffService.getById(staffId);
      if (existingStaff?.profilePhoto) {
        try {
          // Extract filename from URL like http://localhost:5000/uploads/filename.jpg
          const oldPhotoUrl = existingStaff.profilePhoto;
          const filename = oldPhotoUrl.split('/uploads/').pop();
          if (filename) {
            const oldPhotoPath = path.join(process.cwd(), 'uploads', filename);
            if (fs.existsSync(oldPhotoPath)) {
              fs.unlinkSync(oldPhotoPath);
            }
          }
        } catch (err) {
          // Log error but don't fail the update
          console.error('Failed to delete old photo:', err);
        }
      }
    }

    const staff = await StaffService.update(staffId, validation.data);
    sendSuccessResponse(res, staff);
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await StaffService.delete(req.params.id);
    sendNoContentResponse(res);
  }

  static async assignService(req: Request, res: Response): Promise<void> {
    const validation = assignServiceSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    await StaffService.assignService(validation.data);
    sendSuccessResponse(res, { message: 'Service assigned successfully' });
  }

  static async removeService(req: Request, res: Response): Promise<void> {
    const { staffId, serviceId } = req.params;
    await StaffService.removeService(staffId, serviceId);
    sendNoContentResponse(res);
  }

  static async login(req: Request, res: Response): Promise<void> {
    const { fullName, phoneNumber } = req.query;

    if (!fullName || !phoneNumber) {
      return sendValidationError(res, 'Validation failed', [
        'fullName and phoneNumber are required',
      ]);
    }

    const staff = await StaffService.findByCredentials(
      fullName as string,
      phoneNumber as string,
    );

    if (!staff) {
      return sendNotFoundResponse(res, 'Staff not found');
    }

    sendSuccessResponse(res, staff);
  }
}

interface RequestWithStaff extends Request {
  staff?: StaffJwtPayload;
}
