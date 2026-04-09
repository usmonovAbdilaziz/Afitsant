import { prisma } from '@/lib/prisma';
import { AuthService } from '@/services/auth/auth.service';
import { UserType } from '@/generated/prisma';
import {
  isGuestClientPayload,
  isStaffPayload,
  isStandardPayload,
  type JwtPayload,
} from '@/types/auth.types';
import {
  sendCreatedResponse,
  sendForbiddenResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
  sendUnauthorizedResponse,
  sendValidationError,
} from '@/utils/response.handler';
import {
  loginSchema,
  registerBusinessSchema,
  registerClientSchema,
} from '@/validators/auth.validators';
import type { Request, Response } from 'express';
import { z } from 'zod';

export class AuthController {
  static async registerClient(req: Request, res: Response): Promise<void> {
    const registrationData = { ...req.body };

    if (req.file) {
      registrationData.profilePhoto = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const validation = registerClientSchema.safeParse(registrationData);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const result = await AuthService.registerClient(validation.data);
    sendCreatedResponse(res, result);
  }

  static async registerBusiness(req: Request, res: Response): Promise<void> {
    const registrationData = { ...req.body };

    if (req.file) {
      registrationData.profilePhoto = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const validation = registerBusinessSchema.safeParse(registrationData);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const result = await AuthService.registerBusiness(validation.data);
    sendCreatedResponse(res, result);
  }

  static async registerStaff(req: Request, res: Response): Promise<void> {
    const staffRegistration = { ...req.body };

    const validation = z
      .object({
        email: z.string().email(),
        password: z.string().min(7),
        fullName: z.string().min(2),
        phoneNumber: z.string().min(5),
        businessId: z.string().cuid(),
        position: z.string().optional(),
      })
      .safeParse(staffRegistration);

    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const result = await AuthService.registerStaff(validation.data);
    sendCreatedResponse(res, result);
  }

  static async login(req: Request, res: Response): Promise<void> {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const result = await AuthService.login(validation.data);
    sendSuccessResponse(res, result);
  }

  static async staffLogin(req: Request, res: Response): Promise<void> {
    const schema = z.object({
      fullName: z.string().min(1, 'Full name is required'),
      phoneNumber: z.string().min(7, 'Phone number is required'),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    try {
      const result = await AuthService.staffLogin(validation.data);
      sendSuccessResponse(res, result);
    } catch (error: any) {
      return sendUnauthorizedResponse(res, 'Invalid credentials');
    }
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    const payload = (req as RequestWithUser).user;

    if (!payload) {
      return sendUnauthorizedResponse(res);
    }

    if (isStandardPayload(payload)) {
      const user = await AuthService.getAuthMe(payload.userId);
      if (!user) return sendNotFoundResponse(res, 'User not found');

      // Staff registered via /auth/login are represented by a User record + a Staff record.
      // If the Staff record is removed (or disabled), treat the session as invalid so the UI redirects to login.
      if (payload.userType === UserType.STAFF || payload.role === UserType.STAFF) {
        const staffId = payload.staffId;
        if (!staffId) {
          return sendNotFoundResponse(res, 'Staff not found');
        }

        const staff = await prisma.staff.findUnique({
          where: { id: staffId },
          select: {
            id: true,
            businessId: true,
            fullName: true,
            phoneNumber: true,
            position: true,
            isActive: true,
          },
        });

        if (!staff) {
          return sendNotFoundResponse(res, 'Staff not found');
        }

        if (!staff.isActive) {
          return sendForbiddenResponse(res, 'Staff account is inactive');
        }

        return sendSuccessResponse(res, {
          id: staff.id,
          role: 'STAFF',
          businessId: staff.businessId,
          staffId: staff.id,
          phone: staff.phoneNumber,
          fullName: staff.fullName,
          position: staff.position,
        });
      }

      return sendSuccessResponse(res, user);
    }

    if (isStaffPayload(payload)) {
      const staff = await prisma.staff.findUnique({
        where: { id: payload.staffId },
        select: {
          id: true,
          businessId: true,
          fullName: true,
          phoneNumber: true,
          position: true,
          isActive: true,
        },
      });

      if (!staff) return sendNotFoundResponse(res, 'Staff not found');
      if (!staff.isActive) {
        return sendForbiddenResponse(res, 'Staff account is inactive');
      }

      return sendSuccessResponse(res, {
        id: staff.id,
        role: 'STAFF',
        businessId: staff.businessId,
        staffId: staff.id,
        phone: staff.phoneNumber,
        fullName: staff.fullName,
        position: staff.position,
      });
    }

    if (isGuestClientPayload(payload)) {
      const client = await prisma.client.findUnique({
        where: { id: payload.clientId },
        select: { id: true, phoneNumber: true, fullName: true },
      });

      if (!client) return sendNotFoundResponse(res, 'Client not found');

      return sendSuccessResponse(res, {
        id: client.id,
        role: 'CLIENT',
        businessId: null,
        staffId: null,
        phone: client.phoneNumber,
        fullName: client.fullName,
      });
    }

    return sendUnauthorizedResponse(res);
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    const payload = (req as RequestWithUser).user;
    if (!payload || !isStandardPayload(payload)) {
      return sendUnauthorizedResponse(res);
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendValidationError(res, 'Validation failed', [
        'Current password and new password are required',
      ]);
    }

    await AuthService.changePassword(payload.userId, currentPassword, newPassword);
    sendSuccessResponse(res, { message: 'Password changed successfully' });
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    const payload = (req as RequestWithUser).user;
    if (!payload || !isStandardPayload(payload)) {
      return sendUnauthorizedResponse(res);
    }

    const { fullName, email, phoneNumber, profilePhoto, telegramUsername } =
      req.body;

    let photoUrl = profilePhoto;
    if (req.file) {
      photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const updatedUser = await AuthService.updateProfile(payload.userId, {
      fullName,
      email,
      phoneNumber,
      profilePhoto: photoUrl,
      telegramUsername,
    });

    sendSuccessResponse(res, updatedUser);
  }
}

interface RequestWithUser extends Request {
  user?: JwtPayload;
}
