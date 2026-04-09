import { Request, Response } from 'express';
import { OrderService } from '@/services/v1/order.service';
import { SocketController } from '@/controllers/v1/socket.controller';
import { sendSuccessResponse } from '@/utils/response.handler';
import { TokenUtil } from '@/utils/token';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/utils/errors';

export class TelegramConfirmController {
  static async confirm(req: Request, res: Response): Promise<void> {
    const { orderId, telegramId, phone, fullName } = req.body;

    const updatedOrder = await OrderService.confirmOrder(
      orderId,
      String(telegramId),
      phone,
      fullName,
    );

    // Emit token + confirmation to the table's socket room
    const io = SocketController.getIO();
    if (io) {
      io.of('/socket').to(`table:${updatedOrder.tableId}`).emit('order:confirmed', {
        orderId: updatedOrder.id,
        status: 'CONFIRMED',
        etaMinutes: updatedOrder.etaMinutes,
        clientId: (updatedOrder as any).clientId,
        token: (updatedOrder as any).token,
        tokenExpiresAt: (updatedOrder as any).tokenExpiresAt ?? null,
        phone: updatedOrder.phone,
      });
      console.log(`📡 Socket emitted order:confirmed to table:${updatedOrder.tableId}`);
    }

    sendSuccessResponse(res, updatedOrder);
  }

  static async getToken(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const existingToken = order.token;
    if (existingToken) {
      const decoded: any = TokenUtil.decodeToken(existingToken) || {};
      const exp = decoded.exp ? decoded.exp * 1000 : null;
      if (exp && exp > Date.now()) {
        return sendSuccessResponse(res, { token: existingToken, tokenExpiresAt: new Date(exp).toISOString() });
      }
    }

    // Token missing or expired — try to regenerate using order phone -> client
    if (!order.phone) {
      throw new NotFoundError('Order has no phone to regenerate token');
    }

    const client = await prisma.client.findUnique({ where: { phoneNumber: order.phone } });
    if (!client) {
      throw new NotFoundError('Client not found for this order');
    }

    const tokenPayload = {
      sub: client.id,
      type: 'CLIENT',
      role: 'CLIENT',
      clientId: client.id,
      phone: client.phoneNumber,
      fullName: client.fullName,
    } as any;

    const token = TokenUtil.generateToken(tokenPayload as any);
    const decoded2: any = TokenUtil.decodeToken(token) || {};
    const tokenExpiresAt = decoded2.exp ? new Date(decoded2.exp * 1000).toISOString() : null;

    await prisma.order.update({ where: { id }, data: { token } });

    return sendSuccessResponse(res, { token, tokenExpiresAt });
  }
}
