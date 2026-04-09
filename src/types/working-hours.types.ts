import type {
  DayOfWeek,
  StaffWorkingHours,
  WorkingHours,
} from '@/generated/prisma/client';

export interface CreateWorkingHoursDto {
  businessId: string;
  dayOfWeek: DayOfWeek;
  startTime?: string | null;
  endTime?: string | null;
  dinnerStartTime?: string | null;
  dinnerEndTime?: string | null;
  isActive?: boolean;
}

export interface CreateStaffWorkingHoursDto {
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime?: string | null;
  endTime?: string | null;
  dinnerStartTime?: string | null;
  dinnerEndTime?: string | null;
  isActive?: boolean;
}

export interface UpdateWorkingHoursDto {
  startTime?: string | null;
  endTime?: string | null;
  dinnerStartTime?: string | null;
  dinnerEndTime?: string | null;
  isActive?: boolean;
}

export type WorkingHoursResponse = WorkingHours;

export type StaffWorkingHoursResponse = StaffWorkingHours;
