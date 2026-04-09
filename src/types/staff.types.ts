import type { Staff } from '@/generated/prisma/client';

export interface CreateStaffDto {
  businessId: string;
  fullName: string;
  phoneNumber: string;
  position: string;
  profilePhoto?: string;
  isActive?: boolean;
  serviceIds?: string[];
}

export interface UpdateStaffDto {
  fullName?: string;
  phoneNumber?: string;
  position?: string;
  profilePhoto?: string;
  isActive?: boolean;
  serviceIds?: string[];
}

export interface StaffResponse extends Omit<Staff, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  services?: any[];
  reviewCount?: number;
}

export interface AssignServiceDto {
  staffId: string;
  serviceId: string;
}
