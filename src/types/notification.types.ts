import type {
  Notification,
  NotificationStatus,
  NotificationType,
} from '@/generated/prisma/client';

export interface CreateNotificationDto {
  userId: string;
  bookingId?: string;
  type: NotificationType;
  subject: string;
  message: string;
}

export interface NotificationResponse extends Omit<
  Notification,
  'createdAt' | 'updatedAt' | 'sentAt' | 'expiresAt'
> {
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  expiresAt: string | null;
}

export interface SendNotificationResult {
  success: boolean;
  notificationId: string;
  error?: string;
}

export { NotificationStatus, NotificationType };
