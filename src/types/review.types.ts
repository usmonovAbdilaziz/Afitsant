import type { Review } from '@/generated/prisma/client';

export interface CreateReviewDto {
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

export interface ReviewResponse extends Omit<
  Review,
  'createdAt' | 'updatedAt'
> {
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    fullName: string;
    profilePhoto: string | null;
  };
  staff?: {
    id: string;
    fullName: string;
    position: string;
    profilePhoto: string | null;
  };
}

export interface BusinessRatingStats {
  businessId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
