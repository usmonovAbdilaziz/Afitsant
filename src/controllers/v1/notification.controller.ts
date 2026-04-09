import { NotificationService } from '@/services/v1/notification.service';
import {
  sendSuccessResponse,
  sendErrorResponse,
} from '@/utils/response.handler';
import { isStandardPayload } from '@/types/auth.types';
import type { Request, Response } from 'express';
import { PasswordUtil } from '@/utils/password';

export class NotificationController {
  static async getUserNotifications(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user || !isStandardPayload(req.user)) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User ID not found in request',
        });
        return;
      }
      const userId = req.user.userId;
      const notifications =
        await NotificationService.getUserNotifications(userId);
      sendSuccessResponse(res, notifications);
    } catch (error) {
      console.error(
        'NotificationController getUserNotifications error:',
        error,
      );
      sendErrorResponse(res, 'Failed to fetch notifications', 500);
    }
  }

  static async createBusinessNotification(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user || !isStandardPayload(req.user)) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User ID not found in request',
        });
        return;
      }
      const userId = req.user.userId;
      const { subject, message, expirationDate } = req.body;

      if (!subject || !message) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'Subject and message are required',
        });
        return;
      }

      const notificationData = {
        userId: userId, // Use the authenticated user's ID
        subject,
        message,
        type: 'EMAIL' as const, // Default to EMAIL for business-initiated notifications
      };

      const expirationDateObj = expirationDate
        ? new Date(expirationDate)
        : undefined;

      const notification = await NotificationService.createBusinessNotification(
        userId,
        notificationData,
        expirationDateObj,
      );
      sendSuccessResponse(res, notification);
    } catch (error) {
      console.error(
        'NotificationController createBusinessNotification error:',
        error,
      );
      sendErrorResponse(res, 'Failed to create notification', 500);
    }
  }

  static async createReport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !isStandardPayload(req.user)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const userId = req.user.userId;
      const { subject, message } = req.body;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      // Persist report so the sender can view it later
      const { prisma } = await import('@/lib/prisma');

      // Ensure the user exists in the database to avoid FK violations.
      // Try by token userId first, then fall back to the token email if available.
      let senderIdToUse: string | undefined = userId;
      let sender = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

      if (!sender && isStandardPayload(req.user!)) {
        // Try to find by email
        sender = await prisma.user.findUnique({ where: { email: req.user!.email } });
        if (sender) senderIdToUse = sender.id;
      }

      // If sender still not found but we have an email, create a minimal user record.
      if (!sender && isStandardPayload(req.user!)) {
        const email = req.user!.email;
        const localPart = email.split('@')[0] || 'User';
        const generatedPhone = `+unknown-${Date.now()}`;
        const tempPassword = 'TempPass123';
        const hashedPassword = await PasswordUtil.hash(tempPassword);

        sender = await prisma.user.create({
          data: {
            email,
            phoneNumber: generatedPhone,
            password: hashedPassword,
            fullName: localPart,
            gender: 'OTHER',
          },
        });
        senderIdToUse = sender.id;
      }

      if (!sender || !senderIdToUse) {
        res.status(401).json({ error: 'Authentication required', message: 'User not found' });
        return;
      }

      const createdReport = await prisma.report.create({
        data: {
          senderId: senderIdToUse,
          subject: subject || null,
          message,
        },
      });

      // Find all admin users and create notification for each admin
      const admins = await prisma.user.findMany({
        where: { userType: 'ADMIN' },
        select: { id: true },
      });

      const notifications = [];
      if (admins.length > 0) {
        for (const admin of admins) {
          const dto = {
            userId: admin.id,
            type: 'EMAIL' as const,
            subject: subject || 'User report',
            message: `Report from user ${userId}: ${message}`,
          };
          const created = await NotificationService.create(dto as any);
          notifications.push(created);
        }
      }

      sendSuccessResponse(res, { report: createdReport, createdForAdmins: notifications.length });
    } catch (error) {
      try {
        console.error('NotificationController createReport error:', error);
        // Attempt to print full error details
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (logErr) {
        console.error('Failed to stringify error for logging', logErr);
      }
      sendErrorResponse(res, 'Failed to create report', 500);
    }
  }

  static async getMyReports(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !isStandardPayload(req.user)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const userId = req.user.userId;

      const { prisma } = await import('@/lib/prisma');
      // Find reports by senderId OR by sender email (covers fallback-created users)
      const email = req.user.email;
      const reports = await prisma.report.findMany({
        where: {
          OR: [
            { senderId: userId },
            email ? { sender: { email } } : undefined,
          ].filter(Boolean) as any,
        },
        orderBy: { createdAt: 'desc' },
      });

      sendSuccessResponse(res, reports);
    } catch (error) {
      console.error('NotificationController getMyReports error:', error);
      sendErrorResponse(res, 'Failed to fetch reports', 500);
    }
  }

  static async getAllReports(req: Request, res: Response): Promise<void> {
    try {
      const { prisma } = await import('@/lib/prisma');

      const reports = await prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, email: true, phoneNumber: true, fullName: true, userType: true },
          },
        },
      });

      sendSuccessResponse(res, reports);
    } catch (error) {
      console.error('NotificationController getAllReports error:', error);
      sendErrorResponse(res, 'Failed to fetch reports', 500);
    }
  }

  static async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const reportId = req.params.id;
      if (!req.user || !isStandardPayload(req.user)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const requesterId = req.user.userId;
      const requesterType = req.user.userType;

      const { prisma } = await import('@/lib/prisma');

      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { sender: { select: { id: true, email: true } } },
      });
      if (!report) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      // Allow deletion if requester is admin or the sender (match by senderId or sender.email)
      const requesterEmail = isStandardPayload(req.user!) ? req.user!.email : undefined;
      const isOwner = report.senderId === requesterId || (requesterEmail && report.sender?.email === requesterEmail);
      if (requesterType !== 'ADMIN' && !isOwner) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await prisma.report.delete({ where: { id: reportId } });

      sendSuccessResponse(res, { deleted: true });
    } catch (error) {
      console.error('NotificationController deleteReport error:', error);
      sendErrorResponse(res, 'Failed to delete report', 500);
    }
  }
}
