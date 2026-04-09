import { AdminService } from '@/services/admin/admin.service';
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from '@/utils/response.handler';
import type { Request, Response } from 'express';
import HttpStatusCode from '@/utils/HttpStatusCode';
import { EntityNotFoundError, ValidationError } from '@/utils/admin.errors';

export class UserManagementController {
  static async makeUserAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Make user an admin
      const user = await AdminService.makeUserAdmin(userId);

      sendSuccessResponse(res, {
        message: 'User successfully made admin',
        user,
      });
    } catch (error: any) {
      console.error('UserManagementController makeUserAdmin error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to make user admin', 500);
      }
    }
  }

  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      // This will be handled by AdminController.getAllUsers
      // Keeping this here for potential future expansion
      res.status(HttpStatusCode.NOT_IMPLEMENTED).json({
        success: false,
        error: { message: 'Not implemented - use /admin/users endpoint' },
      });
    } catch (error) {
      console.error('UserManagementController getAllUsers error:', error);
      sendErrorResponse(res, 'Failed to fetch users', 500);
    }
  }

  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await AdminService.getUserById(userId);
      if (!user) {
        sendNotFoundResponse(res, 'User not found');
        return;
      }

      sendSuccessResponse(res, user);
    } catch (error) {
      console.error('UserManagementController getUserById error:', error);
      sendErrorResponse(res, 'Failed to fetch user', 500);
    }
  }

  static async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Update user role
      const user = await AdminService.updateUserRole(userId, role);

      sendSuccessResponse(res, {
        message: `User role updated to ${role}`,
        user,
      });
    } catch (error: any) {
      console.error('UserManagementController updateUserRole error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else if (error instanceof ValidationError) {
        sendErrorResponse(res, error.message, error.statusCode);
      } else {
        sendErrorResponse(res, 'Failed to update user role', 500);
      }
    }
  }

  static async disableUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Disable user
      const user = await AdminService.disableUser(userId);

      sendSuccessResponse(res, { message: 'User disabled successfully', user });
    } catch (error: any) {
      console.error('UserManagementController disableUser error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to disable user', 500);
      }
    }
  }

  static async enableUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Enable user
      const user = await AdminService.enableUser(userId);

      sendSuccessResponse(res, { message: 'User enabled successfully', user });
    } catch (error: any) {
      console.error('UserManagementController enableUser error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to enable user', 500);
      }
    }
  }
}
