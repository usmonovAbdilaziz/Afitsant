import { prisma } from '@/lib/prisma';
import type {
  StaffAuthResponse,
  StaffLoginDto,
  StaffJwtPayload,
} from '@/types/auth.types';
import { AuthenticationError } from '@/utils/errors';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import { normalizeUzPhone } from '@/utils/phone';

export class StaffAuthService {
  static async login(data: StaffLoginDto): Promise<StaffAuthResponse> {
    try {
      const normalizedPhone = normalizeUzPhone(data.phoneNumber);
      const digitsOnly = (data.phoneNumber || '').replace(/\D/g, '');

      // Find staff by fullName and phoneNumber
      const staff = await prisma.staff.findFirst({
        where: {
          fullName: {
            equals: data.fullName,
            mode: 'insensitive',
          },
          phoneNumber: {
            in: [
              data.phoneNumber,
              normalizedPhone,
              digitsOnly ? `+${digitsOnly}` : undefined,
              digitsOnly || undefined,
            ].filter(Boolean) as string[],
          },
          isActive: true,
        },
        include: {
          business: true,
        },
      });

      if (!staff) {
        throw new AuthenticationError(
          'Invalid credentials or staff account is inactive',
        );
      }

      if (!staff.business) {
        throw new AuthenticationError(
          'Business not found for this staff member',
        );
      }

      // Generate JWT token for staff
      const tokenPayload: StaffJwtPayload = {
        sub: staff.id,
        staffId: staff.id,
        fullName: staff.fullName,
        phoneNumber: staff.phoneNumber,
        businessId: staff.businessId,
        role: 'STAFF',
      };

      const token = jwt.sign(tokenPayload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      });

      return {
        staff: {
          id: staff.id,
          fullName: staff.fullName,
          phoneNumber: staff.phoneNumber,
          position: staff.position,
          profilePhoto: staff.profilePhoto,
          businessId: staff.businessId,
          isActive: staff.isActive,
        },
        business: {
          id: staff.business.id,
          businessName: staff.business.businessName,
          businessType: staff.business.businessType,
          address: staff.business.address,
          city: staff.business.city,
          phone: staff.business.phone,
        },
        token,
      };
    } catch (error) {
      console.error('StaffAuthService login error:', error);
      throw error;
    }
  }

  static verifyStaffToken(token: string): StaffJwtPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as StaffJwtPayload;

      if (decoded.role !== 'STAFF') {
        throw new AuthenticationError('Invalid staff token');
      }

      return decoded;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  static async getStaffById(
    staffId: string,
  ): Promise<StaffAuthResponse | null> {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: {
          business: true,
        },
      });

      if (!staff || !staff.business) {
        return null;
      }

      // Generate new token
      const tokenPayload: StaffJwtPayload = {
        sub: staff.id,
        staffId: staff.id,
        fullName: staff.fullName,
        phoneNumber: staff.phoneNumber,
        businessId: staff.businessId,
        role: 'STAFF',
      };

      const token = jwt.sign(tokenPayload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      });

      return {
        staff: {
          id: staff.id,
          fullName: staff.fullName,
          phoneNumber: staff.phoneNumber,
          position: staff.position,
          profilePhoto: staff.profilePhoto,
          businessId: staff.businessId,
          isActive: staff.isActive,
        },
        business: {
          id: staff.business.id,
          businessName: staff.business.businessName,
          businessType: staff.business.businessType,
          address: staff.business.address,
          city: staff.business.city,
          phone: staff.business.phone,
        },
        token,
      };
    } catch (error) {
      console.error('StaffAuthService getStaffById error:', error);
      throw error;
    }
  }
}
