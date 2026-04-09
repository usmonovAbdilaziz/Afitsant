import { Request, Response, NextFunction } from 'express';
import { TokenUtil } from '@/utils/token';
import { UserType } from '@/generated/prisma';
import { isClientPayload, isStandardPayload } from '@/types/auth.types';
import { AuthenticationError } from '@/utils/errors';

/**
 * Accepts both registered-user JWTs and guest-client JWTs issued after
 * Telegram order confirmation. Populates `req.user` with the decoded payload.
 */
export const clientAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Token topilmadi');
    }

    const token = authHeader.split(' ')[1];
    if (
      !token ||
      token === 'null' ||
      token === 'undefined' ||
      token.split('.').length !== 3
    ) {
      throw new AuthenticationError('Token formati noto\'g\'ri');
    }
    const payload = TokenUtil.verifyToken(token);

    const isAllowed =
      isClientPayload(payload) ||
      (isStandardPayload(payload) &&
        (payload.userType === UserType.CLIENT ||
          payload.userType === UserType.ADMIN));

    if (!isAllowed) {
      throw new AuthenticationError('Noto\'g\'ri token turi');
    }

    req.user = payload;
    next();
  } catch {
    next(new AuthenticationError('Token xatosi yoki muddati o\'tgan'));
  }
};
