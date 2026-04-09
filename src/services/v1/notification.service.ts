import type { Notification } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  CreateNotificationDto,
  NotificationResponse,
  SendNotificationResult,
} from '@/types/notification.types';
import { NotFoundError } from '@/utils/errors';

export class NotificationService {
  static async create(
    data: CreateNotificationDto,
  ): Promise<NotificationResponse> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        bookingId: data.bookingId,
        type: data.type,
        subject: data.subject,
        message: data.message,
        status: 'PENDING',
      },
    });

    await this.sendNotification(notification.id);

    return this.transformResponse(notification);
  }

  static async getUserNotifications(
    userId: string,
  ): Promise<NotificationResponse[]> {
    const now = new Date();
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((notification) =>
      this.transformResponse(notification),
    );
  }

  static async createBusinessNotification(
    businessUserId: string,
    data: CreateNotificationDto,
    expirationDate?: Date,
  ): Promise<NotificationResponse> {
    // Get the business ID from the user
    const business = await prisma.business.findUnique({
      where: { userId: businessUserId },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    // Get all clients who have booked services from this business
    const clients = await prisma.user.findMany({
      where: {
        bookings: {
          some: {
            service: {
              businessId: business.id,
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        telegramUsername: true,
        phoneNumber: true,
      },
    });

    // Create notifications for each client
    const notifications = [];
    for (const client of clients) {
      // Send email notification if client has email
      if (client.email) {
        const emailNotification = await prisma.notification.create({
          data: {
            userId: client.id,
            bookingId: data.bookingId,
            type: 'EMAIL',
            subject: data.subject,
            message: data.message,
            status: 'PENDING',
            expiresAt: expirationDate,
          },
        });
        notifications.push(emailNotification);
        await this.sendNotification(emailNotification.id);
      }

      // Send Telegram notification if client has Telegram username
      if (client.telegramUsername) {
        const telegramNotification = await prisma.notification.create({
          data: {
            userId: client.id,
            bookingId: data.bookingId,
            type: 'TELEGRAM',
            subject: data.subject,
            message: data.message,
            status: 'PENDING',
            expiresAt: expirationDate,
          },
        });
        notifications.push(telegramNotification);
        await this.sendNotification(telegramNotification.id);
      }
    }

    // Return the first notification as a sample response
    if (notifications.length > 0) {
      return this.transformResponse(notifications[0]);
    }

    // If no clients found, create a notification for the business user
    const notification = await prisma.notification.create({
      data: {
        userId: businessUserId,
        bookingId: data.bookingId,
        type: 'EMAIL',
        subject: data.subject,
        message: data.message,
        status: 'PENDING',
        expiresAt: expirationDate,
      },
    });

    await this.sendNotification(notification.id);
    return this.transformResponse(notification);
  }

  static async sendNotification(
    notificationId: string,
  ): Promise<SendNotificationResult> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: true,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    try {
      switch (notification.type) {
        case 'EMAIL':
          this.sendEmail(notification);
          break;
        case 'SMS':
          this.sendSMS(notification);
          break;
        case 'TELEGRAM':
          this.sendTelegram(notification);
          break;
        case 'PUSH':
          this.sendPush(notification);
          break;
        default:
          throw new Error(
            `Unsupported notification type: ${String(notification.type)}`,
          );
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      return {
        success: true,
        notificationId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          error: errorMessage,
        },
      });

      return {
        success: false,
        notificationId,
        error: errorMessage,
      };
    }
  }

  static async notifyBookingCreated(
    bookingId: string,
    businessUserId: string,
  ): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        service: true,
        staff: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const date = new Date(booking.bookingDate).toLocaleDateString('uz-UZ');
    const subject = 'Yangi booking yaratildi';
    const message = `Yangi booking: ${booking.client.fullName} - ${booking.service.name} - ${date} ${booking.startTime}
Client: ${booking.client.fullName}
Tel: ${booking.client.phoneNumber}
Email: ${booking.client.email}
${booking.client.telegramUsername ? `Telegram: @${booking.client.telegramUsername}` : ''}
${booking.staff ? `Staff: ${booking.staff.fullName}` : ''}
Vaqt: ${date} ${booking.startTime} - ${booking.endTime}`;

    const businessUser = await prisma.user.findUnique({
      where: { id: businessUserId },
    });

    if (businessUser?.email) {
      await this.create({
        userId: businessUserId,
        bookingId,
        type: 'EMAIL',
        subject,
        message,
      });
    }

    if (businessUser?.telegramUsername) {
      await this.create({
        userId: businessUserId,
        bookingId,
        type: 'TELEGRAM',
        subject,
        message,
      });
    }

    if (booking.staffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: booking.staffId },
      });

      if (staff) {
        console.log(`Notification would be sent to staff: ${staff.fullName}`);
      }
    }
  }

  static async notifyBookingCancelled(
    bookingId: string,
    businessUserId: string,
    cancellationReason?: string,
  ): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        service: true,
        staff: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const date = new Date(booking.bookingDate).toLocaleDateString('uz-UZ');
    const subject = 'Bron bekor qilindi';
    const message = `Sizning bron qilingan vaqtingiz bekor qilindi.

Xizmat: ${booking.service.name}
${booking.staff ? `Xodim: ${booking.staff.fullName}\n` : ''}Sana: ${date}
Vaqt: ${booking.startTime} - ${booking.endTime}${cancellationReason ? `\nSabab: ${cancellationReason}` : ''}`;

    // Notify client via email if they have one
    if (booking.client.email) {
      await this.create({
        userId: booking.clientId,
        bookingId,
        type: 'EMAIL',
        subject,
        message,
      });
    }

    // Notify client via Telegram if they have a username
    if (booking.client.telegramUsername) {
      await this.create({
        userId: booking.clientId,
        bookingId,
        type: 'TELEGRAM',
        subject,
        message,
      });
    }
  }

  private static sendEmail(notification: {
    user: { email: string };
    subject: string;
    message: string;
  }): void {
    console.log(`[EMAIL] To: ${notification.user.email}`);
    console.log(`[EMAIL] Subject: ${notification.subject}`);
    console.log(`[EMAIL] Message: ${notification.message}`);
  }

  private static sendSMS(notification: {
    user: { phoneNumber: string };
    message: string;
  }): void {
    console.log(`[SMS] To: ${notification.user.phoneNumber}`);
    console.log(`[SMS] Message: ${notification.message}`);
  }

  private static sendTelegram(notification: {
    user: { telegramUsername: string | null };
    message: string;
  }): void {
    if (!notification.user.telegramUsername) {
      throw new Error('User has no Telegram username');
    }
    console.log(`[TELEGRAM] To: @${notification.user.telegramUsername}`);
    console.log(`[TELEGRAM] Message: ${notification.message}`);
  }

  private static sendPush(notification: {
    user: { id: string };
    subject: string;
    message: string;
  }): void {
    console.log(`[PUSH] To User ID: ${notification.user.id}`);
    console.log(`[PUSH] Title: ${notification.subject}`);
    console.log(`[PUSH] Message: ${notification.message}`);
  }

  private static transformResponse(
    notification: Notification,
  ): NotificationResponse {
    return {
      id: notification.id,
      userId: notification.userId,
      bookingId: notification.bookingId,
      type: notification.type,
      status: notification.status,
      subject: notification.subject,
      message: notification.message,
      error: notification.error,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
      sentAt: notification.sentAt?.toISOString() || null,
      expiresAt: notification.expiresAt?.toISOString() || null,
    };
  }
}
