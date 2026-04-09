import type { Prisma, Service } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  CreateServiceDto,
  ServiceFilterDto,
  ServiceResponse,
  UpdateServiceDto,
} from '@/types/service.types';
import { NotFoundError } from '@/utils/errors';

export class ServiceService {
  static async create(data: CreateServiceDto): Promise<ServiceResponse> {
    // Business mavjudligini tekshirish
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
    });

    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const service = await prisma.service.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        category: data.category as any,
        type: data.type as any,
        description: data.description,
        photoUrl: data.photoUrl,
        duration: data.duration,
        liters: data.liters,
        price: data.price,
        isActive: data.isActive ?? true,
      },
    });

    // Create StaffService records if staffIds provided
    if (data.staffIds && data.staffIds.length > 0) {
      await prisma.staffService.createMany({
        data: data.staffIds.map((staffId) => ({
          staffId,
          serviceId: service.id,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch the service with staff info
    return this.getById(service.id) as Promise<ServiceResponse>;
  }

  static async getById(id: string): Promise<ServiceResponse | null> {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            businessName: true,
          },
        },
        staff: {
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                position: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      return null;
    }

    return this.transformResponse(service);
  }

  static async getByFilter(
    filter: ServiceFilterDto,
  ): Promise<ServiceResponse[]> {
    const where: Prisma.ServiceWhereInput = {};

    if (filter.businessId) {
      where.businessId = filter.businessId;
    }

    if (filter.category) {
      where.category = filter.category as any;
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      where.price = {};
      if (filter.minPrice !== undefined) {
        where.price.gte = filter.minPrice;
      }
      if (filter.maxPrice !== undefined) {
        where.price.lte = filter.maxPrice;
      }
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            businessName: true,
          },
        },
        staff: {
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                position: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services.map((s) => this.transformResponse(s));
  }

  static async update(
    id: string,
    data: UpdateServiceDto,
  ): Promise<ServiceResponse> {
    const existing = await prisma.service.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Service not found');
    }

    await prisma.service.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category as any,
        type: data.type as any,
        description: data.description,
        photoUrl: data.photoUrl,
        duration: data.duration,
        liters: data.liters,
        price: data.price,
        isActive: data.isActive,
      },
    });

    // Update StaffService records if staffIds provided
    if (data.staffIds !== undefined) {
      // Delete existing staff assignments
      await prisma.staffService.deleteMany({
        where: { serviceId: id },
      });

      // Create new staff assignments
      if (data.staffIds.length > 0) {
        await prisma.staffService.createMany({
          data: data.staffIds.map((staffId) => ({
            staffId,
            serviceId: id,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Fetch the service with staff info
    return this.getById(id) as Promise<ServiceResponse>;
  }

  static async delete(id: string): Promise<void> {
    const existing = await prisma.service.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Service not found');
    }

    await prisma.service.delete({ where: { id } });
  }

  private static transformResponse(service: any): ServiceResponse {
    const staffList =
      service.staff?.map((ss: any) => ({
        id: ss.staff.id,
        fullName: ss.staff.fullName,
        position: ss.staff.position,
        profilePhoto: ss.staff.profilePhoto,
      })) || [];

    return {
      id: service.id,
      businessId: service.businessId,
      name: service.name,
      category: service.category,
      type: service.type,
      description: service.description,
      photoUrl: service.photoUrl,
      duration: service.duration,
      liters: service.liters,
      price: service.price,
      isActive: service.isActive,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
      staff: staffList,
    };
  }
}
