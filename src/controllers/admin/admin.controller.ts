import { AdminService } from '@/services/admin/admin.service';
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendNotFoundResponse,
  sendValidationError,
} from '@/utils/response.handler';
import { updateBusinessSchema } from '@/validators/business.validators';
import HttpStatusCode from '@/utils/HttpStatusCode';
import type { Request, Response } from 'express';
import {
  AdminError,
  EntityNotFoundError,
  AdminOperationError,
} from '@/utils/admin.errors';

export class AdminController {
  // ==================== USER MANAGEMENT ====================

  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await AdminService.getAllUsers();
      sendSuccessResponse(res, users);
    } catch (error) {
      console.error('AdminController getAllUsers error:', error);
      sendErrorResponse(res, 'Failed to fetch users', 500);
    }
  }

  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await AdminService.getUserById(id);

      if (!user) {
        sendNotFoundResponse(res, 'User not found');
        return;
      }

      sendSuccessResponse(res, user);
    } catch (error) {
      console.error('AdminController getUserById error:', error);
      sendErrorResponse(res, 'Failed to fetch user', 500);
    }
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const user = await AdminService.updateUser(id, updateData);
      sendSuccessResponse(res, user, HttpStatusCode.OK);
    } catch (error: any) {
      console.error('AdminController updateUser error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to update user', 500);
      }
    }
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteUser(id);
      sendSuccessResponse(res, null, HttpStatusCode.NO_CONTENT);
    } catch (error: any) {
      console.error('AdminController deleteUser error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else if (error instanceof AdminOperationError) {
        sendErrorResponse(res, error.message, error.statusCode);
      } else {
        sendErrorResponse(res, 'Failed to delete user', 500);
      }
    }
  }

  // ==================== BUSINESS MANAGEMENT ====================

  static async getAllBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const businesses = await AdminService.getAllBusinesses();
      sendSuccessResponse(res, businesses);
    } catch (error) {
      console.error('AdminController getAllBusinesses error:', error);
      sendErrorResponse(res, 'Failed to fetch businesses', 500);
    }
  }

  static async getBusinessById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const business = await AdminService.getBusinessById(id);

      if (!business) {
        sendNotFoundResponse(res, 'Business not found');
        return;
      }

      sendSuccessResponse(res, business);
    } catch (error) {
      console.error('AdminController getBusinessById error:', error);
      sendErrorResponse(res, 'Failed to fetch business', 500);
    }
  }

  static async updateBusiness(req: Request, res: Response): Promise<void> {
    const validation = updateBusinessSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i: any) => i.message),
      );
    }

    try {
      const { id } = req.params;
      const business = await AdminService.updateBusiness(id, validation.data);
      sendSuccessResponse(res, business, HttpStatusCode.OK);
    } catch (error: any) {
      console.error('AdminController updateBusiness error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to update business', 500);
      }
    }
  }

  static async updateBusinessApprovalStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;

      // Validate input
      if (typeof isApproved !== 'boolean') {
        sendErrorResponse(res, 'isApproved must be a boolean value', 400);
        return;
      }

      const business = await AdminService.updateBusinessApprovalStatus(
        id,
        isApproved,
      );
      sendSuccessResponse(res, business, HttpStatusCode.OK);
    } catch (error: any) {
      console.error(
        'AdminController updateBusinessApprovalStatus error:',
        error,
      );

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(
          res,
          'Failed to update business approval status',
          500,
        );
      }
    }
  }

  static async deleteBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteBusiness(id);
      sendSuccessResponse(res, null, HttpStatusCode.NO_CONTENT);
    } catch (error: any) {
      console.error('AdminController deleteBusiness error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to delete business', 500);
      }
    }
  }

  // ==================== STAFF MANAGEMENT ====================

  static async getAllStaff(req: Request, res: Response): Promise<void> {
    try {
      const staff = await AdminService.getAllStaff();
      sendSuccessResponse(res, staff);
    } catch (error) {
      console.error('AdminController getAllStaff error:', error);
      sendErrorResponse(res, 'Failed to fetch staff', 500);
    }
  }

  static async getStaffById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const staff = await AdminService.getStaffById(id);

      if (!staff) {
        sendNotFoundResponse(res, 'Staff not found');
        return;
      }

      sendSuccessResponse(res, staff);
    } catch (error) {
      console.error('AdminController getStaffById error:', error);
      sendErrorResponse(res, 'Failed to fetch staff', 500);
    }
  }

  static async updateStaff(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const staff = await AdminService.updateStaff(id, updateData);
      sendSuccessResponse(res, staff, HttpStatusCode.OK);
    } catch (error: any) {
      console.error('AdminController updateStaff error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to update staff', 500);
      }
    }
  }

  static async deleteStaff(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteStaff(id);
      sendSuccessResponse(res, null, HttpStatusCode.NO_CONTENT);
    } catch (error: any) {
      console.error('AdminController deleteStaff error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to delete staff', 500);
      }
    }
  }

  // ==================== SERVICE MANAGEMENT ====================

  static async getAllServices(req: Request, res: Response): Promise<void> {
    try {
      const services = await AdminService.getAllServices();
      sendSuccessResponse(res, services);
    } catch (error) {
      console.error('AdminController getAllServices error:', error);
      sendErrorResponse(res, 'Failed to fetch services', 500);
    }
  }

  static async getServiceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const service = await AdminService.getServiceById(id);

      if (!service) {
        sendNotFoundResponse(res, 'Service not found');
        return;
      }

      sendSuccessResponse(res, service);
    } catch (error) {
      console.error('AdminController getServiceById error:', error);
      sendErrorResponse(res, 'Failed to fetch service', 500);
    }
  }

  static async updateService(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const service = await AdminService.updateService(id, updateData);
      sendSuccessResponse(res, service, HttpStatusCode.OK);
    } catch (error: any) {
      console.error('AdminController updateService error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to update service', 500);
      }
    }
  }

  static async deleteService(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteService(id);
      sendSuccessResponse(res, null, HttpStatusCode.NO_CONTENT);
    } catch (error: any) {
      console.error('AdminController deleteService error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to delete service', 500);
      }
    }
  }

  // ==================== BOOKING MANAGEMENT ====================

  static async getAllBookings(req: Request, res: Response): Promise<void> {
    try {
      const bookings = await AdminService.getAllBookings();
      sendSuccessResponse(res, bookings);
    } catch (error) {
      console.error('AdminController getAllBookings error:', error);
      sendErrorResponse(res, 'Failed to fetch bookings', 500);
    }
  }

  static async getBookingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const booking = await AdminService.getBookingById(id);

      if (!booking) {
        sendNotFoundResponse(res, 'Booking not found');
        return;
      }

      sendSuccessResponse(res, booking);
    } catch (error) {
      console.error('AdminController getBookingById error:', error);
      sendErrorResponse(res, 'Failed to fetch booking', 500);
    }
  }

  static async updateBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const booking = await AdminService.updateBooking(id, updateData);
      sendSuccessResponse(res, booking, HttpStatusCode.OK);
    } catch (error: any) {
      console.error('AdminController updateBooking error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to update booking', 500);
      }
    }
  }

  static async deleteBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteBooking(id);
      sendSuccessResponse(res, null, HttpStatusCode.NO_CONTENT);
    } catch (error: any) {
      console.error('AdminController deleteBooking error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to delete booking', 500);
      }
    }
  }

  // ==================== REVIEW MANAGEMENT ====================

  static async getAllReviews(req: Request, res: Response): Promise<void> {
    try {
      const reviews = await AdminService.getAllReviews();
      sendSuccessResponse(res, reviews);
    } catch (error) {
      console.error('AdminController getAllReviews error:', error);
      sendErrorResponse(res, 'Failed to fetch reviews', 500);
    }
  }

  static async getReviewById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const review = await AdminService.getReviewById(id);

      if (!review) {
        sendNotFoundResponse(res, 'Review not found');
        return;
      }

      sendSuccessResponse(res, review);
    } catch (error) {
      console.error('AdminController getReviewById error:', error);
      sendErrorResponse(res, 'Failed to fetch review', 500);
    }
  }

  static async updateReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const review = await AdminService.updateReview(id, updateData);
      sendSuccessResponse(res, review, HttpStatusCode.OK);
    } catch (error: any) {
      console.error('AdminController updateReview error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to update review', 500);
      }
    }
  }

  static async deleteReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteReview(id);
      sendSuccessResponse(res, null, HttpStatusCode.NO_CONTENT);
    } catch (error: any) {
      console.error('AdminController deleteReview error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to delete review', 500);
      }
    }
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  static async getAllNotifications(req: Request, res: Response): Promise<void> {
    try {
      const notifications = await AdminService.getAllNotifications();
      sendSuccessResponse(res, notifications);
    } catch (error) {
      console.error('AdminController getAllNotifications error:', error);
      sendErrorResponse(res, 'Failed to fetch notifications', 500);
    }
  }

  static async getNotificationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await AdminService.getNotificationById(id);

      if (!notification) {
        sendNotFoundResponse(res, 'Notification not found');
        return;
      }

      sendSuccessResponse(res, notification);
    } catch (error) {
      console.error('AdminController getNotificationById error:', error);
      sendErrorResponse(res, 'Failed to fetch notification', 500);
    }
  }

  static async updateNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const notification = await AdminService.updateNotification(
        id,
        updateData,
      );
      sendSuccessResponse(res, notification, HttpStatusCode.OK);
    } catch (error: any) {
      console.error('AdminController updateNotification error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to update notification', 500);
      }
    }
  }

  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteNotification(id);
      sendSuccessResponse(res, null, HttpStatusCode.NO_CONTENT);
    } catch (error: any) {
      console.error('AdminController deleteNotification error:', error);

      if (error instanceof EntityNotFoundError) {
        sendNotFoundResponse(res, error.message);
      } else {
        sendErrorResponse(res, 'Failed to delete notification', 500);
      }
    }
  }
}
