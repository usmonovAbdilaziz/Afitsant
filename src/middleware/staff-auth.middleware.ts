import type { StaffJwtPayload } from '@/types/auth.types';
import { StaffAuthService } from '@/services/auth/staff-auth.service';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staff?: StaffJwtPayload;
    }
  }
}

export class StaffAuthMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'No token provided',
          message: 'Staff authentication required',
        });
        return;
      }

      const token = authHeader.substring(7);
      const payload = StaffAuthService.verifyStaffToken(token);

      req.staff = payload;
      next();
    } catch (error) {
      console.log('Staff token verification error:', error);

      if (error instanceof Error) {
        if (error.name === 'JsonWebTokenError') {
          res.status(401).json({
            success: false,
            error: 'Invalid token',
          });
          return;
        }

        if (error.name === 'TokenExpiredError') {
          res.status(401).json({
            success: false,
            error: 'Token expired',
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Authentication error',
      });
    }
  }

  static optionalAuth(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = StaffAuthService.verifyStaffToken(token);
        req.staff = payload;
      }

      next();
    } catch (_error) {
      next();
    }
  }
}
