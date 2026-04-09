import { UserType } from '@/generated/prisma';
import {
  isClientPayload,
  isStandardPayload,
  type JwtPayload,
} from '@/types/auth.types';
import { TokenUtil } from '@/utils/token';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export class AuthMiddleware {
  private static isLikelyJwt(token: string): boolean {
    if (!token) return false;
    if (token === 'null' || token === 'undefined') return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every((p) => p.length > 0);
  }

  static authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'No token provided',
        });
        return;
      }

      const token = authHeader.substring(7).trim();
      if (!AuthMiddleware.isLikelyJwt(token)) {
        res.status(401).json({
          error: 'Invalid token format',
        });
        return;
      }
      const payload = TokenUtil.verifyToken(token);

      req.user = payload;

      next();
    } catch (error) {
      console.log('Token verification error:', error);
      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        res.status(401).json({
          error: 'Invalid token',
        });
        return;
      }

      if (error instanceof Error && error.name === 'TokenExpiredError') {
        res.status(401).json({
          error: 'Token expired',
        });
        return;
      }

      res.status(500).json({
        error: 'Authentication error',
      });
    }
  }

  static requireBusiness(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!req.user || !isStandardPayload(req.user)) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid JWT token in the Authorization header.',
      });
      return;
    }

    if (req.user.role !== UserType.BUSINESS && req.user.role !== UserType.ADMIN) {
      res.status(403).json({
        error: 'Access denied. Business account required.',
        message: `This endpoint requires a BUSINESS account, but received ${req.user.role}`,
      });
      return;
    }

    next();
  }

  static requireClient(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid JWT token in the Authorization header.',
      });
      return;
    }

    // Accept registered CLIENT/ADMIN users and Telegram-confirmed clients
    const isRegisteredClient =
      isStandardPayload(req.user) &&
      (req.user.role === UserType.CLIENT || req.user.role === UserType.ADMIN);
    const isTelegramClient = isClientPayload(req.user);

    if (!isRegisteredClient && !isTelegramClient) {
      res.status(403).json({
        error: 'Access denied. Client account required.',
        message: `This endpoint requires a CLIENT account.`,
      });
      return;
    }

    next();
  }

  static optionalAuth(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        if (AuthMiddleware.isLikelyJwt(token)) {
          const payload = TokenUtil.verifyToken(token);
          req.user = payload;
        }
      }

      next();
    } catch (_error) {
      next();
    }
  }

  static requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || !isStandardPayload(req.user)) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid JWT token in the Authorization header.',
      });
      return;
    }

    if (req.user.userType !== UserType.ADMIN) {
      res.status(403).json({
        error: 'Access denied. Admin account required.',
        message: `This endpoint requires an ADMIN account, but received ${req.user.userType}`,
      });
      return;
    }

    next();
  }

  static requireStaffOrBusiness(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!req.user || !isStandardPayload(req.user)) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid JWT token in the Authorization header.',
      });
      return;
    }

    const allowed = ['STAFF', 'BUSINESS', 'ADMIN'];
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access denied. Staff or Business account required.',
      });
      return;
    }

    next();
  }
}
