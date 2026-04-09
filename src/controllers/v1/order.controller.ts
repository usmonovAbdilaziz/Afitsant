import { Request, Response } from 'express';
import { OrderService } from '@/services/v1/order.service';
import { OrderSessionService } from '@/services/v1/order-session.service';
import { isClientPayload } from '@/types/auth.types';
import {
  sendBadRequestResponse,
  sendConflictResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
  sendUnauthorizedResponse,
} from '@/utils/response.handler';
import { asyncHandler } from '@/utils/asyncHandler';

export class OrderController {
  /**
   * POST /api/v1/orders
   * Authenticated clients (ClientJwtPayload) get their order confirmed immediately.
   * Unauthenticated requests receive a Telegram confirmation URL.
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const { tableId, items } = req.body;

    // Extract clientId from JWT if the caller is a confirmed client
    let clientId: string | undefined;
    if (req.user && isClientPayload(req.user)) {
      clientId = req.user.clientId;
    }

    const result = await OrderService.createOrder(tableId, items, clientId);
    sendSuccessResponse(res, result, 201);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await OrderService.getOrderById(id);
    sendSuccessResponse(res, order);
  });

  static getSessionStatus = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const tableId =
        typeof req.query.tableId === 'string' ? req.query.tableId : '';

      if (!tableId) {
        return sendBadRequestResponse(res, 'tableId is required');
      }

      try {
        const result = await OrderSessionService.getOrderSessionStatus(
          id,
          tableId,
        );
        sendSuccessResponse(res, result);
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          return sendNotFoundResponse(res, error.message);
        }

        if (error.name === 'ConflictError') {
          return sendConflictResponse(res, error.message);
        }

        throw error;
      }
    },
  );

  static getClientOrders = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !isClientPayload(req.user)) {
      return sendUnauthorizedResponse(res, 'Client token required');
    }

    const result = await OrderService.getClientOrders(req.user.clientId);
    sendSuccessResponse(res, result);
  });
}
