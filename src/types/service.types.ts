import type { Service } from '@/generated/prisma/client';

export interface StaffInfo {
  id: string;
  fullName: string;
  position: string | null;
  profilePhoto?: string | null;
}

export interface CreateServiceDto {
  businessId: string;
  name: string;
  category: string;
  type: 'HOT' | 'COLD';
  description?: string;
  photoUrl?: string;
  duration: number;
  price: number;
  isActive?: boolean;
  staffIds?: string[];
  liters?: string[];
}

export interface UpdateServiceDto {
  name?: string;
  category?: string;
  type?: 'HOT' | 'COLD';
  description?: string;
  photoUrl?: string;
  duration?: number;
  price?: number;
  isActive?: boolean;
  staffIds?: string[];
  liters?: string[];
}

export interface ServiceResponse extends Omit<
  Service,
  'createdAt' | 'updatedAt'
> {
  createdAt: string;
  updatedAt: string;
  photoUrl: string | null;
  liters: string[];
  staff?: StaffInfo[];
}

export interface ServiceFilterDto {
  businessId?: string;
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
}
