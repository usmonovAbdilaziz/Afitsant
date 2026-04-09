import type { Business } from '@/generated/prisma/client';

export interface BusinessDiscoveryRequest {
  latitude: number;
  longitude: number;
  radius?: number;
  businessType?: string;
  city?: string;
  staffName?: string;
  clientGender?: 'MALE' | 'FEMALE' | 'OTHER';
  limit?: number;
  offset?: number;
}

export interface BusinessDiscoveryResponse extends Omit<
  Business,
  'createdAt' | 'updatedAt'
> {
  distance: number;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
  children?: Business[];
}

export interface NearbyBusinessResponse {
  businesses: BusinessDiscoveryResponse[];
  total: number;
}
