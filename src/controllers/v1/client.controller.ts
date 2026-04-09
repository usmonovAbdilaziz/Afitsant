import { ClientService } from '@/services/v1/client.service';
import {
  sendNotFoundResponse,
  sendSuccessResponse,
  sendValidationError,
} from '@/utils/response.handler';
import { clientBookingsSchema } from '@/validators/booking.validators';
import type { Request, Response } from 'express';

export class ClientController {
  /**
   * Get client's businesses (businesses they've interacted with)
   */
  static async getClientBusinesses(req: Request, res: Response): Promise<void> {
    const clientId = (req as any).user?.id;

    if (!clientId) {
      return sendNotFoundResponse(res, 'Client not found');
    }

    try {
      const businesses = await ClientService.getClientBusinesses(clientId);
      sendSuccessResponse(res, businesses);
    } catch (error) {
      sendNotFoundResponse(res, 'Failed to get client businesses');
    }
  }

  /**
   * Get client dashboard statistics
   */
  static async getClientDashboard(req: Request, res: Response): Promise<void> {
    const clientId = (req as any).user?.id;

    if (!clientId) {
      return sendNotFoundResponse(res, 'Client not found');
    }

    try {
      const dashboard = await ClientService.getClientDashboard(clientId);
      sendSuccessResponse(res, dashboard);
    } catch (error) {
      sendNotFoundResponse(res, 'Failed to get client dashboard');
    }
  }

  /**
   * Get client's booking history
   */
  static async getClientBookings(req: Request, res: Response): Promise<void> {
    const clientId = (req as any).user?.id;

    if (!clientId) {
      return sendNotFoundResponse(res, 'Client not found');
    }

    const validation = clientBookingsSchema.safeParse(req.query);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i: any) => i.message),
      );
    }

    try {
      const bookings = await ClientService.getClientBookings(
        clientId,
        validation.data,
      );
      sendSuccessResponse(res, bookings);
    } catch (error) {
      sendNotFoundResponse(res, 'Failed to get client bookings');
    }
  }
}
