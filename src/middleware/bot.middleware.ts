import { config } from '@/config/env';
import type { NextFunction, Request, Response } from 'express';

export const telegramWebhookGuard = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!config.TELEGRAM_WEBHOOK_SECRET) {
    next();
    return;
  }

  const secret = req.header('x-telegram-bot-api-secret-token');
  if (secret !== config.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid Telegram webhook secret',
      },
    });
    return;
  }

  next();
};
