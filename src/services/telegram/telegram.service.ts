import { config } from '@/config/env';
import { OrderSessionService } from '@/services/v1/order-session.service';
import redis from '@/utils/redis';
import { Bot, Keyboard } from 'grammy';
import https from 'https';

type PendingSessionPayload = {
  tableId: string;
  orderSessionId?: string;
};

export class TelegramService {
  private static readonly retryDelayMs = 15_000;
  private static bot = new Bot(config.TELEGRAM_BOT_TOKEN || '', {
    client: {
      // Force IPv4 for Telegram API requests on Windows where node-fetch may
      // otherwise stall on address resolution/connection attempts.
      baseFetchConfig: {
        agent: new https.Agent({ family: 4 }),
      },
    },
  });
  private static startPromise: Promise<void> | null = null;
  private static retryTimer: NodeJS.Timeout | null = null;
  private static handlersRegistered = false;

  private static getPendingSessionKey(chatId: number | string): string {
    return `telegram:pending-session:${chatId}`;
  }

  private static parseStartPayload(payload: string): PendingSessionPayload | null {
    const rawPayload = String(payload || '').trim();
    if (!rawPayload) {
      return null;
    }

    if (rawPayload.includes('_')) {
      const [tableId, orderSessionId] = rawPayload.split('_');
      if (tableId && orderSessionId) {
        return { tableId, orderSessionId };
      }
    }

    if (rawPayload.includes('.')) {
      const [tableId, orderSessionId] = rawPayload.split('.');
      if (tableId && orderSessionId) {
        return { tableId, orderSessionId };
      }
    }

    return { tableId: rawPayload };
  }

  static async init() {
    if (!config.TELEGRAM_BOT_TOKEN) {
      console.warn('Telegram bot token is not configured');
      return;
    }

    if (!this.handlersRegistered) {
      this.registerHandlers();
      this.handlersRegistered = true;
    }

    if (this.bot.isRunning() || this.startPromise) {
      return;
    }

    this.clearRetryTimer();
    this.startPromise = this.startInternal().finally(() => {
      this.startPromise = null;
    });
    await this.startPromise;
  }

  private static registerHandlers() {
    this.bot.command('start', async (ctx) => {
      const payload = this.parseStartPayload(String(ctx.match || ''));

      if (!payload) {
        await ctx.reply(
          "Xush kelibsiz. Tasdiqlash uchun iltimos saytdan yuborilgan havoladan kiring.",
        );
        return;
      }

      await redis.set(
        this.getPendingSessionKey(ctx.chat.id),
        JSON.stringify(payload),
        'EX',
        1800,
      );

      const keyboard = new Keyboard()
        .requestContact('Telefon raqamni yuborish')
        .oneTime()
        .resized();

      await ctx.reply(
        "Davom etish uchun telefon raqamingizni Telegram orqali yuboring.",
        { reply_markup: keyboard },
      );
    });

    this.bot.on('message:contact', async (ctx) => {
      const contact = ctx.message.contact;
      if (!contact) {
        await ctx.reply('Telefon raqam topilmadi.');
        return;
      }

      const savedSession = await redis.get(this.getPendingSessionKey(ctx.chat.id));
      if (!savedSession) {
        await ctx.reply(
          "Tasdiqlash sessiyasi topilmadi. Iltimos sayt orqali qaytadan urinib ko'ring.",
          { reply_markup: { remove_keyboard: true } },
        );
        return;
      }

      const payload = JSON.parse(savedSession) as PendingSessionPayload;

      try {
        const verificationPayload = {
          tableId: payload.tableId,
          telegramUserId: String(contact.user_id ?? ctx.from?.id ?? ''),
          username: ctx.from?.username,
          firstName: contact.first_name ?? ctx.from?.first_name,
          lastName: contact.last_name ?? ctx.from?.last_name,
          languageCode: ctx.from?.language_code,
          phone: contact.phone_number,
        };

        if (payload.orderSessionId) {
          await OrderSessionService.verifyOrderSession({
            ...verificationPayload,
            orderSessionId: payload.orderSessionId,
          });
        } else {
          await OrderSessionService.verifyLatestOrderSessionForTable(
            verificationPayload,
          );
        }

        await redis.del(this.getPendingSessionKey(ctx.chat.id));

        await ctx.reply(
          'Telefon raqamingiz tasdiqlandi. Saytga qaytib buyurtmani davom ettirishingiz mumkin.',
          { reply_markup: { remove_keyboard: true } },
        );
      } catch (error: unknown) {
        console.error('Telegram verification failed:', error);
        const message =
          error instanceof Error
            ? error.message
            : "Tasdiqlashda xatolik yuz berdi. Iltimos sayt orqali qaytadan urinib ko'ring.";
        await ctx.reply(
          message,
          { reply_markup: { remove_keyboard: true } },
        );
      }
    });
  }

  private static async startInternal() {
    try {
      const me = await this.bot.api.getMe();
      console.log(`Telegram bot initialized: @${me.username}`);
      if (
        config.TELEGRAM_BOT_USERNAME &&
        config.TELEGRAM_BOT_USERNAME !== me.username
      ) {
        console.warn(
          `TELEGRAM_BOT_USERNAME mismatch: env=@${config.TELEGRAM_BOT_USERNAME}, token=@${me.username}`,
        );
      }
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
      this.scheduleRetry();
      return;
    }

    if (config.NODE_ENV === 'development') {
      try {
        await this.bot.api.deleteWebhook();
        void this.bot
          .start({
            onStart: (botInfo) => {
              console.log(`Telegram bot started (polling mode): @${botInfo.username}`);
            },
          })
          .catch((error) => {
            console.error('Telegram bot polling stopped:', error);
            this.scheduleRetry();
          });
      } catch (error) {
        console.error('Error starting Telegram bot:', error);
        this.scheduleRetry();
      }
    }
  }

  private static clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private static scheduleRetry() {
    if (this.retryTimer || this.bot.isRunning()) {
      return;
    }

    console.warn(
      `Telegram bot will retry in ${this.retryDelayMs / 1000}s. If this keeps happening, check VPN/firewall/ISP access to api.telegram.org.`,
    );

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.init();
    }, this.retryDelayMs);
  }

  static async processUpdate(update: unknown) {
    await this.bot.handleUpdate(update as never);
  }

  static async setWebhook(url: string) {
    return await this.bot.api.setWebhook(url, {
      secret_token: config.TELEGRAM_WEBHOOK_SECRET,
    });
  }

  static async removeWebhook() {
    return await this.bot.api.deleteWebhook();
  }
}
