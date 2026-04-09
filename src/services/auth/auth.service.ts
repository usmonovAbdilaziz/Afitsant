import { PrismaClient } from '@/generated/prisma/client';
import { UserType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type {
  AuthMeResponse,
  AuthResponse,
  LoginDto,
  RegisterBusinessDto,
  RegisterClientDto,
} from '@/types/auth.types';
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from '@/utils/errors';
import { PasswordUtil } from '@/utils/password';
import { TokenUtil } from '@/utils/token';
import type * as runtime from '@prisma/client/runtime/client';
import { normalizeUzPhone } from '@/utils/phone';

export class AuthService {
  static async registerClient(data: RegisterClientDto): Promise<AuthResponse> {
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
        },
      });

      if (existingUser) {
        throw new ConflictError(
          'User with this email or phone number already exists',
        );
      }

      const passwordValidation = PasswordUtil.validateStrength(data.password);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.message);
      }

      const hashedPassword = await PasswordUtil.hash(data.password);

      const user = await prisma.user.create({
        data: {
          email: data.email,
          phoneNumber: data.phoneNumber,
          password: hashedPassword,
          fullName: data.fullName,
          profilePhoto: data.profilePhoto,
          userType: UserType.CLIENT,
        },
      });

      const token = TokenUtil.generateToken({
        sub: user.id,
        userId: user.id,
        email: user.email,
        userType: user.userType,
        role: user.userType,
        businessId: null,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          userType: user.userType,
          profilePhoto: user.profilePhoto,
        },
        token,
      };
    } catch (error) {
      console.error('AuthService registerClient error:', error);
      throw error;
    }
  }

  static async registerBusiness(
    data: RegisterBusinessDto,
  ): Promise<AuthResponse> {
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
        },
      });
      if (existingUser) {
        throw new ConflictError(
          'User with this email or phone number already exists',
        );
      }

      const passwordValidation = PasswordUtil.validateStrength(data.password);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.message);
      }

      const hashedPassword = await PasswordUtil.hash(data.password);

      const result = await prisma.$transaction(
        async (tx: Omit<PrismaClient, runtime.ITXClientDenyList>) => {
          // Build user data object, only include gender if provided
          const userData: any = {
            email: data.email,
            phoneNumber: data.phoneNumber,
            password: hashedPassword,
            fullName: data.fullName,
            profilePhoto: data.profilePhoto,
            userType: UserType.BUSINESS,
          };

          const user = await tx.user.create({
            data: userData,
          });

          const business = await tx.business.create({
            data: {
              userId: user.id,
              businessName: data.businessName,
              businessType: data.businessType,
              description: data.description,
              address: data.address,
              city: data.city,
              latitude: data.latitude ?? 0,
              longitude: data.longitude ?? 0,
              phone: data.phone,
            },
          });

          return { user, business };
        },
      );

      const token = TokenUtil.generateToken({
        sub: result.user.id,
        userId: result.user.id,
        email: result.user.email,
        userType: result.user.userType,
        role: result.user.userType,
        businessId: result.business.id,
      });

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          phoneNumber: result.user.phoneNumber,
          fullName: result.user.fullName,
          userType: result.user.userType,
          profilePhoto: result.user.profilePhoto,
          business: {
            id: result.business.id,
            businessName: result.business.businessName,
            businessType: result.business.businessType,
            isApproved: result.business.isApproved,
          },
        },
        token,
      };
    } catch (error) {
      console.error('AuthService registerBusiness error:', error);
      throw error;
    }
  }

  static async login(data: LoginDto): Promise<AuthResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: {
          business: true,
        },
      });

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (!user.isActive) {
        throw new AuthenticationError('Account is disabled');
      }

      const isPasswordValid = await PasswordUtil.compare(
        data.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      const token = TokenUtil.generateToken({
        sub: user.id,
        userId: user.id,
        email: user.email,
        userType: user.userType,
        role: user.userType,
        businessId: user.business?.id ?? null,
        staffId: null,
      });

      const response: AuthResponse = {
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          userType: user.userType,
          type: user.userType as any,
          profilePhoto: user.profilePhoto,
        },
        token,
      };

      if (user.business) {
        response.user.business = {
          id: user.business.id,
          businessName: user.business.businessName,
          businessType: user.business.businessType,
          isApproved: user.business.isApproved,
        };
        response.user.businessId = user.business.id;
      }

      // Attach staff metadata if this is a STAFF account (linked by phone number)
      if (user.userType === UserType.STAFF) {
        const staff = await prisma.staff.findFirst({
          where: { phoneNumber: user.phoneNumber },
          select: {
            id: true,
            businessId: true,
          },
        });

        const staffBusinessId = staff?.businessId ?? null;

        response.user.business = response.user.business ?? (staffBusinessId
          ? { id: staffBusinessId, businessName: '', businessType: '', isApproved: true }
          : undefined);
        response.user.businessId = staffBusinessId;
        response.user.staffId = staff?.id ?? null;

        // Regenerate token to include staffId/businessId if found
        const token = TokenUtil.generateToken({
          sub: user.id,
          userId: user.id,
          email: user.email,
          userType: user.userType,
          role: user.userType,
          businessId: response.user.business?.id ?? null,
          staffId: staff?.id ?? null,
        });

        response.token = token;
      }

      return response;
    } catch (error) {
      console.error('AuthService login error:', error);
      throw error;
    }
  }

  static async makeUserAdmin(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { userType: UserType.ADMIN },
      });
    } catch (error) {
      console.error('AuthService makeUserAdmin error:', error);
      throw error;
    }
  }

  static async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          business: true,
        },
      });

      if (!user) {
        return null;
      }

      const response: AuthResponse['user'] = {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        userType: user.userType,
        profilePhoto: user.profilePhoto,
      };

      if (user.business) {
        response.business = {
          id: user.business.id,
          businessName: user.business.businessName,
          businessType: user.business.businessType,
          isApproved: user.business.isApproved,
        };
      }

      return response;
    } catch (error) {
      console.error('AuthService getUserById error:', error);
      throw error;
    }
  }

  /**
   * STAFF login without password: lookup by fullName + phoneNumber + userType=STAFF
   * and return a JWT.
   */
  static async staffLogin(input: {
    fullName: string;
    phoneNumber: string;
  }): Promise<AuthResponse> {
    const phone = normalizeUzPhone(input.phoneNumber);

    const user = await prisma.user.findFirst({
      where: {
        phoneNumber: phone,
        userType: UserType.STAFF,
        isActive: true,
        fullName: {
          equals: input.fullName,
          mode: 'insensitive',
        } as any,
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const staff = await prisma.staff.findFirst({
      where: { phoneNumber: phone },
      select: { id: true, businessId: true },
    });

    const token = TokenUtil.generateToken({
      sub: user.id,
      userId: user.id,
      email: user.email,
      userType: user.userType,
      role: user.userType,
      businessId: staff?.businessId ?? null,
      staffId: staff?.id ?? null,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        userType: user.userType,
        type: user.userType as any,
        businessId: staff?.businessId ?? null,
        staffId: staff?.id ?? null,
        profilePhoto: user.profilePhoto,
      },
      token,
    };
  }

  static async registerStaff(data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    businessId: string;
    position?: string;
  }): Promise<AuthResponse> {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
      },
    });
    if (existingUser) {
      throw new ConflictError('User with this email or phone already exists');
    }

    const passwordValidation = PasswordUtil.validateStrength(data.password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.message);
    }

    const hashedPassword = await PasswordUtil.hash(data.password);

    const existingStaff = await prisma.staff.findFirst({
      where: { phoneNumber: data.phoneNumber, businessId: data.businessId },
    });

    const staff = existingStaff
      ? await prisma.staff.update({
          where: { id: existingStaff.id },
          data: {
            fullName: data.fullName,
            position: data.position ?? existingStaff.position,
            isActive: true,
          },
        })
      : await prisma.staff.create({
          data: {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            businessId: data.businessId,
            position: data.position ?? 'Staff',
          },
        });

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        fullName: data.fullName,
        userType: UserType.STAFF,
      },
    });

    const token = TokenUtil.generateToken({
      sub: user.id,
      userId: user.id,
      email: user.email,
      userType: user.userType,
      role: user.userType,
      businessId: staff.businessId,
      staffId: staff.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        userType: user.userType,
        type: user.userType as any,
        businessId: staff.businessId,
        staffId: staff.id,
        profilePhoto: user.profilePhoto,
      },
      token,
    };
  }

  static async getAuthMe(userId: string): Promise<AuthMeResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        business: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      role: user.userType,
      businessId: user.business?.id ?? null,
      phone: user.phoneNumber,
      fullName: user.fullName,
    };
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isPasswordValid = await PasswordUtil.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Validate new password strength
      const passwordValidation = PasswordUtil.validateStrength(newPassword);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.message);
      }

      // Hash and update new password
      const hashedPassword = await PasswordUtil.hash(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } catch (error) {
      console.error('AuthService changePassword error:', error);
      throw error;
    }
  }

  static async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      profilePhoto?: string;
      telegramUsername?: string;
    },
  ): Promise<AuthResponse['user']> {
    try {
      // Check if email is being changed and if it already exists
      if (data.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: data.email,
            id: { not: userId },
          },
        });
        if (existingUser) {
          throw new ConflictError('Email already in use');
        }
      }

      // Check if phone number is being changed and if it already exists
      if (data.phoneNumber) {
        const existingUser = await prisma.user.findFirst({
          where: {
            phoneNumber: data.phoneNumber,
            id: { not: userId },
          },
        });
        if (existingUser) {
          throw new ConflictError('Phone number already in use');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber,
          profilePhoto: data.profilePhoto,
          telegramUsername: data.telegramUsername,
        },
        include: {
          business: true,
        },
      });

      const response: AuthResponse['user'] = {
        id: updatedUser.id,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        fullName: updatedUser.fullName,
        userType: updatedUser.userType,
        profilePhoto: updatedUser.profilePhoto,
      };

      if (updatedUser.business) {
        response.business = {
          id: updatedUser.business.id,
          businessName: updatedUser.business.businessName,
          businessType: updatedUser.business.businessType,
          isApproved: updatedUser.business.isApproved,
        };
      }

      return response;
    } catch (error) {
      console.error('AuthService updateProfile error:', error);
      throw error;
    }
  }
}
