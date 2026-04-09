import { Router } from 'express';
import { OrderController } from '@/controllers/v1/order.controller';
import { clientAuth } from '@/middleware/client-auth.middleware';
import { AuthMiddleware } from '@/middleware/auth.middleware';

const orderRoutes = Router();

orderRoutes.post(
  '/',
  AuthMiddleware.optionalAuth.bind(AuthMiddleware),
  OrderController.create,
);
orderRoutes.get('/client', clientAuth, OrderController.getClientOrders);
orderRoutes.get('/sessions/:id/status', OrderController.getSessionStatus);
orderRoutes.get('/:id', OrderController.getById);

export { orderRoutes };
