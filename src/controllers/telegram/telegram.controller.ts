import { Request, Response } from 'express';
import { TelegramService } from '@/services/telegram/telegram.service';
import {
  sendSuccessResponse,
  sendErrorResponse,
} from '@/utils/response.handler';

export class TelegramController {
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const update = req.body;

      // Process the Telegram update
      await TelegramService.processUpdate(update);

      // Respond immediately to Telegram
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing Telegram webhook:', error);
      res.status(500).send('Error processing update');
    }
  }

  static async setWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookUrl = `${req.protocol}://${req.get('host')}/api/telegram/webhook`;
      const result = await TelegramService.setWebhook(webhookUrl);

      sendSuccessResponse(res, {
        message: 'Webhook set successfully',
        result,
      });
    } catch (error) {
      console.error('Error setting Telegram webhook:', error);
      sendErrorResponse(res, 'Failed to set webhook', 500);
    }
  }

  static async removeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const result = await TelegramService.removeWebhook();

      sendSuccessResponse(res, {
        message: 'Webhook removed successfully',
        result,
      });
    } catch (error) {
      console.error('Error removing Telegram webhook:', error);
      sendErrorResponse(res, 'Failed to remove webhook', 500);
    }
  }
}
