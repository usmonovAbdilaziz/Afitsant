import type { Staff } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  AssignServiceDto,
  CreateStaffDto,
  StaffResponse,
  UpdateStaffDto,
} from '@/types/staff.types';
import { ConflictError, NotFoundError } from '@/utils/errors';

export class StaffService {
  static async create(data: CreateStaffDto): Promise<StaffResponse> {
    // Business mavjudligini tekshirish
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
    });

    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const existing = await prisma.staff.findFirst({
      where: {
        businessId: data.businessId,
        phoneNumber: data.phoneNumber,
      },
    });

    if (existing) {
      throw new ConflictError(
        'Staff with this phone number already exists in this business',
      );
    }

    // At least one service is mandatory
    if (!data.serviceIds || data.serviceIds.length === 0) {
      throw new ConflictError(
        'At least one service must be assigned to the staff member',
      );
    }

    const staff = await prisma.$transaction(async (tx) => {
      const newStaff = await tx.staff.create({
        data: {
          businessId: data.businessId,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          position: data.position,
          profilePhoto: data.profilePhoto,
          isActive: data.isActive ?? true,
        },
      });

      // Assign services
      if (data.serviceIds && data.serviceIds.length > 0) {
        await tx.staffService.createMany({
          data: data.serviceIds.map((serviceId) => ({
            staffId: newStaff.id,
            serviceId,
          })),
        });
      }

      return newStaff;
    });

    // Return with services
    return (await this.getById(staff.id)) as StaffResponse;
  }

  static async getById(id: string): Promise<StaffResponse | null> {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        workingHours: true,
        _count: {
          select: { reviews: true },
        },
      },
    });

    if (!staff) {
      return null;
    }

    return this.transformResponse(staff);
  }

  static async getByBusinessId(
    businessId: string,
    isActive?: boolean,
  ): Promise<StaffResponse[]> {
    const where: { businessId: string; isActive?: boolean } = { businessId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const staffs = await prisma.staff.findMany({
      where,
      include: {
        services: {
          include: {
            service: true,
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return staffs.map((s) => this.transformResponse(s));
  }

  static async update(
    id: string,
    data: UpdateStaffDto,
  ): Promise<StaffResponse> {
    const existing = await prisma.staff.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Staff not found');
    }

    if (data.phoneNumber && data.phoneNumber !== existing.phoneNumber) {
      const duplicate = await prisma.staff.findFirst({
        where: {
          businessId: existing.businessId,
          phoneNumber: data.phoneNumber,
        },
      });

      if (duplicate) {
        throw new ConflictError(
          'Staff with this phone number already exists in this business',
        );
      }
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        position: data.position,
        profilePhoto: data.profilePhoto,
        isActive: data.isActive,
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    // Update services if provided
    if (data.serviceIds) {
      // Delete old assignments
      await prisma.staffService.deleteMany({
        where: { staffId: id },
      });

      // Add new assignments
      if (data.serviceIds.length > 0) {
        await prisma.staffService.createMany({
          data: data.serviceIds.map((serviceId) => ({
            staffId: id,
            serviceId,
          })),
        });
      }
    }

    // Fetch again to get updated services or use 'updated' if services were NOT updated manually
    // To be safe and consistent with create, let's fetch getById
    return (await this.getById(id)) as StaffResponse;
  }

  static async delete(id: string): Promise<void> {
    const existing = await prisma.staff.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Staff not found');
    }

    await prisma.staff.delete({ where: { id } });
  }

  static async assignService(data: AssignServiceDto): Promise<void> {
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
    });
    if (!staff) {
      throw new NotFoundError('Staff not found');
    }

    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
    });
    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (staff.businessId !== service.businessId) {
      throw new ConflictError(
        'Staff and service must belong to the same business',
      );
    }

    const existing = await prisma.staffService.findFirst({
      where: {
        staffId: data.staffId,
        serviceId: data.serviceId,
      },
    });

    if (existing) {
      throw new ConflictError('Service already assigned to this staff');
    }

    await prisma.staffService.create({
      data: {
        staffId: data.staffId,
        serviceId: data.serviceId,
      },
    });
  }

  static async removeService(
    staffId: string,
    serviceId: string,
  ): Promise<void> {
    const existing = await prisma.staffService.findFirst({
      where: {
        staffId,
        serviceId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Service assignment not found');
    }

    await prisma.staffService.delete({
      where: {
        id: existing.id,
      },
    });
  }

  private static transformResponse(staff: any): StaffResponse {
    const services = staff.services?.map((s: any) => s.service) || [];
    return {
      id: staff.id,
      businessId: staff.businessId,
      fullName: staff.fullName,
      phoneNumber: staff.phoneNumber,
      position: staff.position,
      profilePhoto: staff.profilePhoto,
      isActive: staff.isActive,
      createdAt: staff.createdAt.toISOString(),
      updatedAt: staff.updatedAt.toISOString(),
      services,
      reviewCount: staff._count?.reviews || 0,
    };
  }

  static async findByCredentials(
    fullName: string,
    phoneNumber: string,
  ): Promise<StaffResponse | null> {
    const staff = await prisma.staff.findFirst({
      where: {
        fullName,
        phoneNumber,
        isActive: true,
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!staff) {
      return null;
    }

    return this.transformResponse(staff);
  }
}
