import { UserType } from '@/generated/prisma';
import { isStandardPayload } from '@/types/auth.types';
import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from '@/types/auth.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export class AdminMiddleware {
  static requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message:
          'Please provide a valid JWT token in the Authorization header.',
      });
      return;
    }

    if (!isStandardPayload(req.user) || req.user.userType !== UserType.ADMIN) {
      res.status(403).json({
        error: 'Access denied. Admin account required',
        message: `This endpoint requires an ADMIN account`,
        details: {
          receivedUserType: isStandardPayload(req.user)
            ? req.user.userType
            : 'CLIENT',
          expectedUserType: UserType.ADMIN,
        },
      });
      return;
    }

    next();
  }
}
