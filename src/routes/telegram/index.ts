import { Router } from 'express';
import { TelegramController } from '@/controllers/telegram/telegram.controller';
import { TelegramConfirmController } from '@/controllers/telegram/telegram-confirm.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { telegramWebhookGuard } from '@/middleware/bot.middleware';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();

// Webhook endpoint for Telegram bot
router.post(
  '/webhook',
  telegramWebhookGuard,
  asyncHandler(TelegramController.handleWebhook.bind(TelegramController)),
);

// Endpoint for setting webhook (admin only)
router.post(
  '/set-webhook',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireAdmin.bind(AuthMiddleware),
  asyncHandler(TelegramController.setWebhook.bind(TelegramController)),
);

// Endpoint for removing webhook (admin only)
router.post(
  '/remove-webhook',
  AuthMiddleware.authenticate.bind(AuthMiddleware),
  AuthMiddleware.requireAdmin.bind(AuthMiddleware),
  asyncHandler(TelegramController.removeWebhook.bind(TelegramController)),
);

router.post(
  '/confirm',
  asyncHandler(TelegramConfirmController.confirm.bind(TelegramConfirmController)),
);

// Allow client to fetch a fresh token for an order if needed (returns new token if expired)
router.get(
  '/order/:id/token',
  asyncHandler(TelegramConfirmController.getToken.bind(TelegramConfirmController)),
);

export default router;
