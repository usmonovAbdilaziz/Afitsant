import type {
  StaffWorkingHours,
  WorkingHours,
} from '@/generated/prisma/client';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  CreateStaffWorkingHoursDto,
  CreateWorkingHoursDto,
  StaffWorkingHoursResponse,
  UpdateWorkingHoursDto,
  WorkingHoursResponse,
} from '@/types/working-hours.types';
import { ConflictError, NotFoundError } from '@/utils/errors';

export class WorkingHoursService {
  static async createBusinessWorkingHours(
    data: CreateWorkingHoursDto,
  ): Promise<WorkingHoursResponse> {
    // Business mavjudligini tekshirish
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
    });

    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const existing = await prisma.workingHours.findFirst({
      where: {
        businessId: data.businessId,
        dayOfWeek: data.dayOfWeek,
      },
    });

    if (existing) {
      throw new ConflictError(
        'Working hours already exist for this day. Use update instead.',
      );
    }

    // Har bir kun uchun alohida record yaratiladi (dushanba ishlab, seshanba ishlamaydigan business uchun ham)
    // isActive field'i orqali kun yopiq yoki ochiq ekanligini aniqlaymiz
    // Barcha time fieldlar null bo'lishi mumkin (default null)
    const workingHours = await prisma.workingHours.create({
      data: {
        businessId: data.businessId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime ?? '',
        endTime: data.endTime ?? '',
        dinnerStartTime: data.dinnerStartTime ?? '',
        dinnerEndTime: data.dinnerEndTime ?? '',
        isActive: data.isActive ?? true, // Use provided isActive value (false for closed days, true for open days)
      },
    });

    return this.transformBusinessResponse(workingHours);
  }

  static async createStaffWorkingHours(
    data: CreateStaffWorkingHoursDto,
  ): Promise<StaffWorkingHoursResponse> {
    // Staff mavjudligini tekshirish
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
    });

    if (!staff) {
      throw new NotFoundError('Staff not found');
    }

    const existing = await prisma.staffWorkingHours.findFirst({
      where: {
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
      },
    });

    if (existing) {
      throw new ConflictError(
        'Working hours already exist for this day. Use update instead.',
      );
    }

    const workingHours = await prisma.staffWorkingHours.create({
      data: {
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime ?? '',
        endTime: data.endTime ?? '',
        isActive: data.isActive ?? true,
      },
    });

    return this.transformStaffResponse(workingHours);
  }

  static async getBusinessWorkingHours(
    businessId: string,
  ): Promise<WorkingHoursResponse[]> {
    const workingHours = await prisma.workingHours.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return workingHours.map((wh) => this.transformBusinessResponse(wh));
  }

  static async getStaffWorkingHours(
    staffId: string,
  ): Promise<StaffWorkingHoursResponse[]> {
    const workingHours = await prisma.staffWorkingHours.findMany({
      where: { staffId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return workingHours.map((wh) => this.transformStaffResponse(wh));
  }

  static async updateBusinessWorkingHours(
    id: string,
    data: UpdateWorkingHoursDto,
  ): Promise<WorkingHoursResponse> {
    const existing = await prisma.workingHours.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Working hours not found');
    }

    const updateData: {
      startTime?: string | null;
      endTime?: string | null;
      dinnerStartTime?: string | null;
      dinnerEndTime?: string | null;
      isActive?: boolean;
    } = {};

    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.dinnerStartTime !== undefined)
      updateData.dinnerStartTime = data.dinnerStartTime;
    if (data.dinnerEndTime !== undefined)
      updateData.dinnerEndTime = data.dinnerEndTime;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.workingHours.update({
      where: { id },
      data: updateData as Prisma.WorkingHoursUpdateInput,
    });

    return this.transformBusinessResponse(updated);
  }

  static async updateStaffWorkingHours(
    id: string,
    data: UpdateWorkingHoursDto,
  ): Promise<StaffWorkingHoursResponse> {
    const existing = await prisma.staffWorkingHours.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Working hours not found');
    }

    const updated = await prisma.staffWorkingHours.update({
      where: { id },
      data: {
        startTime: data?.startTime ?? '',
        endTime: data?.endTime ?? '',
        isActive: data.isActive,
      },
    });

    return this.transformStaffResponse(updated);
  }

  static async deleteBusinessWorkingHours(id: string): Promise<void> {
    const existing = await prisma.workingHours.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Working hours not found');
    }

    await prisma.workingHours.delete({ where: { id } });
  }

  static async deleteStaffWorkingHours(id: string): Promise<void> {
    const existing = await prisma.staffWorkingHours.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Working hours not found');
    }

    await prisma.staffWorkingHours.delete({ where: { id } });
  }

  private static transformBusinessResponse(
    workingHours: WorkingHours,
  ): WorkingHoursResponse {
    return workingHours;
  }

  private static transformStaffResponse(
    workingHours: StaffWorkingHours,
  ): StaffWorkingHoursResponse {
    return workingHours;
  }
}
