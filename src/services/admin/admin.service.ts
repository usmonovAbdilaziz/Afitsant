import { prisma } from '@/lib/prisma';
import { UserType } from '@/generated/prisma';
import type {
  User,
  Business,
  Staff,
  Service,
  Booking,
  Review,
} from '@/generated/prisma/client';
import {
  EntityNotFoundError,
  AdminOperationError,
  ValidationError,
} from '@/utils/admin.errors';

export class AdminService {
  // ==================== USER MANAGEMENT ====================

  static async getAllUsers(): Promise<User[]> {
    return await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        business: true,
      },
    });
  }

  static async updateUser(id: string, data: Partial<User>): Promise<User> {
    // Prevent changing sensitive fields
    const { id: _, userType, ...safeUpdateData } = data;

    try {
      return await prisma.user.update({
        where: { id },
        data: safeUpdateData,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('User', id);
      }
      throw error;
    }
  }

  static async deleteUser(id: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new EntityNotFoundError('User', id);
    }

    // Prevent deleting admin users
    if (user.userType === UserType.ADMIN) {
      throw new AdminOperationError('delete user', 'Cannot delete admin users');
    }

    try {
      await prisma.user.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('User', id);
      }
      throw error;
    }
  }

  static async makeUserAdmin(userId: string): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { userType: UserType.ADMIN },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('User', userId);
      }
      throw error;
    }
  }

  static async updateUserRole(userId: string, role: string): Promise<User> {
    // Validate role
    if (!Object.values(UserType).includes(role as UserType)) {
      throw new ValidationError('role', 'Invalid user type');
    }

    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { userType: role as UserType },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('User', userId);
      }
      throw error;
    }
  }

  static async disableUser(userId: string): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('User', userId);
      }
      throw error;
    }
  }

  static async enableUser(userId: string): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('User', userId);
      }
      throw error;
    }
  }

  // ==================== BUSINESS MANAGEMENT ====================

  static async getAllBusinesses(): Promise<(Business & { user: User })[]> {
    return await prisma.business.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getBusinessById(id: string): Promise<
    | (Business & {
        user: User;
        services: Service[];
        staff: Staff[];
        workingHours: any[];
        reviews: Review[];
      })
    | null
  > {
    const include = {
      user: true,
      services: true,
      staff: true,
      workingHours: true,
      reviews: true,
    };

    const byId = await prisma.business.findUnique({
      where: { id },
      include,
    });

    if (byId) return byId;

    return await prisma.business.findUnique({
      where: { userId: id },
      include,
    });
  }

  static async updateBusiness(
    id: string,
    data: Partial<Business>,
  ): Promise<Business> {
    // Prevent changing sensitive fields
    const { id: _, userId, ...safeUpdateData } = data;

    try {
      const business = await prisma.business.findFirst({
        where: {
          OR: [{ id }, { userId: id }],
        },
        select: { id: true },
      });

      if (!business) {
        throw new EntityNotFoundError('Business', id);
      }

      return await prisma.business.update({
        where: { id: business.id },
        data: safeUpdateData,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Business', id);
      }
      throw error;
    }
  }

  static async updateBusinessApprovalStatus(
    id: string,
    isApproved: boolean,
  ): Promise<Business> {
    try {
      const business = await prisma.business.findFirst({
        where: {
          OR: [{ id }, { userId: id }],
        },
        select: { id: true },
      });

      if (!business) {
        throw new EntityNotFoundError('Business', id);
      }

      return await prisma.business.update({
        where: { id: business.id },
        data: { isApproved },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Business', id);
      }
      throw error;
    }
  }

  static async deleteBusiness(id: string): Promise<void> {
    const business = await prisma.business.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
      },
      select: { id: true },
    });

    if (!business) {
      throw new EntityNotFoundError('Business', id);
    }

    try {
      await prisma.business.delete({
        where: { id: business.id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Business', id);
      }
      throw error;
    }
  }

  // ==================== STAFF MANAGEMENT ====================

  static async getAllStaff(): Promise<(Staff & { business: Business })[]> {
    return await prisma.staff.findMany({
      include: {
        business: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getStaffById(id: string): Promise<
    | (Staff & {
        business: Business;
        services: any[];
        workingHours: any[];
        bookings: Booking[];
      })
    | null
  > {
    return await prisma.staff.findUnique({
      where: { id },
      include: {
        business: true,
        services: true,
        workingHours: true,
        bookings: true,
      },
    });
  }

  static async updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
    // Prevent changing sensitive fields
    const { id: _, businessId, ...safeUpdateData } = data;

    try {
      return await prisma.staff.update({
        where: { id },
        data: safeUpdateData,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Staff', id);
      }
      throw error;
    }
  }

  static async deleteStaff(id: string): Promise<void> {
    const staff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new EntityNotFoundError('Staff', id);
    }

    try {
      await prisma.staff.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Staff', id);
      }
      throw error;
    }
  }

  // ==================== SERVICE MANAGEMENT ====================

  static async getAllServices(): Promise<(Service & { business: Business })[]> {
    return await prisma.service.findMany({
      include: {
        business: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getServiceById(id: string): Promise<
    | (Service & {
        business: Business;
        staff: any[];
        bookings: Booking[];
      })
    | null
  > {
    return await prisma.service.findUnique({
      where: { id },
      include: {
        business: true,
        staff: true,
        bookings: true,
      },
    });
  }

  static async updateService(
    id: string,
    data: Partial<Service>,
  ): Promise<Service> {
    // Prevent changing sensitive fields
    const { id: _, businessId, ...safeUpdateData } = data;

    try {
      return await prisma.service.update({
        where: { id },
        data: safeUpdateData,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Service', id);
      }
      throw error;
    }
  }

  static async deleteService(id: string): Promise<void> {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new EntityNotFoundError('Service', id);
    }

    try {
      await prisma.service.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Service', id);
      }
      throw error;
    }
  }

  // ==================== BOOKING MANAGEMENT ====================

  static async getAllBookings(): Promise<
    (Booking & {
      client: User;
      service: Service;
      staff: Staff | null;
    })[]
  > {
    return await prisma.booking.findMany({
      include: {
        client: true,
        service: true,
        staff: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getBookingById(id: string): Promise<
    | (Booking & {
        client: User;
        service: Service;
        staff: Staff | null;
      })
    | null
  > {
    return await prisma.booking.findUnique({
      where: { id },
      include: {
        client: true,
        service: true,
        staff: true,
      },
    });
  }

  static async updateBooking(
    id: string,
    data: Partial<Booking>,
  ): Promise<Booking> {
    // Prevent changing sensitive fields
    const { id: _, clientId, serviceId, staffId, ...safeUpdateData } = data;

    try {
      return await prisma.booking.update({
        where: { id },
        data: safeUpdateData,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Booking', id);
      }
      throw error;
    }
  }

  static async deleteBooking(id: string): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new EntityNotFoundError('Booking', id);
    }

    try {
      await prisma.booking.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Booking', id);
      }
      throw error;
    }
  }

  // ==================== REVIEW MANAGEMENT ====================

  static async getAllReviews(): Promise<
    (Review & { client: User; business: Business })[]
  > {
    return await prisma.review.findMany({
      include: {
        client: true,
        business: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getReviewById(
    id: string,
  ): Promise<(Review & { client: User; business: Business }) | null> {
    return await prisma.review.findUnique({
      where: { id },
      include: {
        client: true,
        business: true,
      },
    });
  }

  static async updateReview(
    id: string,
    data: Partial<Review>,
  ): Promise<Review> {
    // Prevent changing sensitive fields
    const { id: _, clientId, businessId, ...safeUpdateData } = data;

    try {
      return await prisma.review.update({
        where: { id },
        data: safeUpdateData,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Review', id);
      }
      throw error;
    }
  }

  static async deleteReview(id: string): Promise<void> {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new EntityNotFoundError('Review', id);
    }

    try {
      await prisma.review.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Review', id);
      }
      throw error;
    }
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  static async getAllNotifications(): Promise<any[]> {
    return await prisma.notification.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getNotificationById(id: string): Promise<any | null> {
    return await prisma.notification.findUnique({
      where: { id },
    });
  }

  static async updateNotification(
    id: string,
    data: Partial<any>,
  ): Promise<any> {
    // Prevent changing sensitive fields
    const { id: _, userId, ...safeUpdateData } = data;

    try {
      return await prisma.notification.update({
        where: { id },
        data: safeUpdateData,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Notification', id);
      }
      throw error;
    }
  }

  static async deleteNotification(id: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new EntityNotFoundError('Notification', id);
    }

    try {
      await prisma.notification.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new EntityNotFoundError('Notification', id);
      }
      throw error;
    }
  }
}
