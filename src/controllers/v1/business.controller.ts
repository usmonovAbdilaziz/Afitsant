import { BusinessService } from '@/services/v1/business.service';
import {
  sendNotFoundResponse,
  sendSuccessResponse,
  sendValidationError,
  sendErrorResponse,
} from '@/utils/response.handler';
import { businessDiscoverySchema } from '@/validators/business.validators';
import type { Request, Response } from 'express';

export class BusinessController {
  static async discoverNearby(req: Request, res: Response): Promise<void> {
    console.log('Business discovery request query:', req.query);
    console.log('Query types:', {
      latitude: typeof req.query.latitude,
      longitude: typeof req.query.longitude,
      radius: typeof req.query.radius,
      limit: typeof req.query.limit,
    });

    const validation = businessDiscoverySchema.safeParse(req.query);

    if (!validation.success) {
      console.error('Validation errors:', validation.error.issues);
      return sendValidationError(
        res,
        `Validation failed`,
        validation.error.issues.map((i: any) => i.message),
      );
    }

    const result = await BusinessService.discoverNearby(validation.data);
    sendSuccessResponse(res, result);
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const business = await BusinessService.getById(id);
    if (!business) {
      return sendNotFoundResponse(res, 'Business not found');
    }

    sendSuccessResponse(res, business);
  }

  static async getAllBusiness(req: Request, res: Response) {
    try {
      const { latitude, longitude } = req.query;
      const businesses = await BusinessService.getAllBusiness(
        latitude ? parseFloat(latitude as string) : undefined,
        longitude ? parseFloat(longitude as string) : undefined,
      );
      return sendSuccessResponse(res, businesses);
    } catch (error) {
      console.log('get all Business error', error);
      return sendErrorResponse(res, 'Failed to fetch businesses', 500);
    }
  }

  static async updateAksiya(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { clearNotifData, notification } = req.body as {
        clearNotifData?: string | null;
        notification?: string | null;
      };

      // Ensure business exists
      const business = await BusinessService.getById(id);
      if (!business) {
        return sendNotFoundResponse(res, 'Business not found');
      }

      // Ensure requester owns the business or is admin
      const requester = req.user;
      if (!requester) {
        return sendErrorResponse(res, 'Unauthorized', 401);
      }

      // If requester is not admin, verify ownership
      if (requester.userType !== 'ADMIN') {
        // BusinessService.getById returns business.userId as string in transform
        if (business.userId !== requester.userId) {
          return sendErrorResponse(res, 'Forbidden', 403);
        }
      }

      // Prepare update payload
      const updatePayload: any = {};
      if (typeof notification === 'string')
        updatePayload.notification = notification;
      if (clearNotifData === null) {
        updatePayload.clearNotifData = null;
      } else if (typeof clearNotifData === 'string' && clearNotifData) {
        const d = new Date(clearNotifData);
        if (!isNaN(d.getTime())) updatePayload.clearNotifData = d;
      }

      // Use prisma directly to update minimal fields
      const { prisma } = await import('@/lib/prisma');

      const updated = await prisma.business.update({
        where: { id },
        data: updatePayload,
      });

      return sendSuccessResponse(res, updated, 200);
    } catch (error) {
      console.error('BusinessController.updateAksiya error:', error);
      return sendErrorResponse(res, 'Failed to update business', 500);
    }
  }
}
