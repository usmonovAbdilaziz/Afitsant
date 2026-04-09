import type { Prisma, Review } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  BusinessRatingStats,
  CreateReviewDto,
  ReviewResponse,
  UpdateReviewDto,
} from '@/types/review.types';
import { ConflictError, NotFoundError } from '@/utils/errors';

export class ReviewService {
  static async create(
    clientId: string,
    data: CreateReviewDto,
  ): Promise<ReviewResponse> {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: {
        id: true,
        clientId: true,
        staffId: true,
        status: true,
        priceStatus: true,
        progressStatus: true,
        service: {
          select: {
            businessId: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.clientId !== clientId) {
      throw new ConflictError('You can only review your own bookings');
    }

    const normalizedStatus = String(booking.status || '').toUpperCase();
    const normalizedPriceStatus = String(booking.priceStatus || '').toUpperCase();
    const normalizedProgressStatus = String(booking.progressStatus || '').toUpperCase();

    if (
      normalizedStatus !== 'COMPLETED' &&
      normalizedPriceStatus !== 'COMPLETED' &&
      normalizedProgressStatus !== 'DELIVERED'
    ) {
      throw new ConflictError('You can only review delivered bookings');
    }

    if (!booking.staffId) {
      throw new ConflictError('This booking has no staff assigned');
    }

    const existing = await prisma.review.findFirst({
      where: {
        clientId,
        staffId: booking.staffId,
      },
    });

    if (existing) {
      throw new ConflictError('You have already reviewed this staff');
    }

    const reviewData: Prisma.ReviewCreateInput = {
      client: { connect: { id: clientId } },
      business: { connect: { id: booking.service.businessId } },
      staff: { connect: { id: booking.staffId } },
      rating: data.rating,
      comment: data.comment,
    };

    const review = await prisma.review.create({
      data: reviewData,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true,
          },
        },
        staff: {
          select: {
            id: true,
            fullName: true,
            position: true,
            profilePhoto: true,
          },
        },
      },
    });

    return this.transformResponse(review);
  }

  static async getClientReviewForStaff(
    clientId: string,
    staffId: string,
  ): Promise<ReviewResponse | null> {
    const review = await prisma.review.findFirst({
      where: {
        clientId,
        staffId,
      },
    });

    return review ? this.transformResponse(review) : null;
  }

  static async getById(id: string): Promise<ReviewResponse | null> {
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true,
          },
        },
        staff: {
          select: {
            id: true,
            fullName: true,
            position: true,
            profilePhoto: true,
          },
        },
      },
    });

    if (!review) {
      return null;
    }

    return this.transformResponse(review);
  }

  static async getByBusinessId(
    businessId: string,
    minRating?: number,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ReviewResponse[]> {
    const where: Prisma.ReviewWhereInput = { businessId };

    if (minRating !== undefined) {
      where.rating = { gte: minRating };
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true,
          },
        },
        staff: {
          select: {
            id: true,
            fullName: true,
            position: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return reviews.map((r) => this.transformResponse(r));
  }

  static async getBusinessRatingStats(
    businessId: string,
  ): Promise<BusinessRatingStats> {
    const reviews = await prisma.review.findMany({
      where: { businessId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const ratingDistribution = {
      1: reviews.filter((r) => r.rating === 1).length,
      2: reviews.filter((r) => r.rating === 2).length,
      3: reviews.filter((r) => r.rating === 3).length,
      4: reviews.filter((r) => r.rating === 4).length,
      5: reviews.filter((r) => r.rating === 5).length,
    };

    return {
      businessId,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
    };
  }

  static async update(
    id: string,
    clientId: string,
    data: UpdateReviewDto,
  ): Promise<ReviewResponse> {
    const existing = await prisma.review.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Review not found');
    }

    if (existing.clientId !== clientId) {
      throw new NotFoundError('Review not found');
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true,
          },
        },
        staff: {
          select: {
            id: true,
            fullName: true,
            position: true,
            profilePhoto: true,
          },
        },
      },
    });

    return this.transformResponse(updated);
  }

  static async deleteByClient(id: string, clientId: string): Promise<void> {
    const existing = await prisma.review.findUnique({ where: { id } });

    if (!existing || existing.clientId !== clientId) {
      throw new NotFoundError('Review not found');
    }

    await prisma.review.delete({ where: { id } });
  }

  static async getByStaffId(
    staffId: string,
    minRating?: number,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ReviewResponse[]> {
    const where: Prisma.ReviewWhereInput = { staffId };

    if (minRating !== undefined) {
      where.rating = { gte: minRating };
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true,
          },
        },
        staff: {
          select: {
            id: true,
            fullName: true,
            position: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return reviews.map((r) => this.transformResponse(r));
  }

  static async getStaffRatingStats(
    staffId: string,
  ): Promise<BusinessRatingStats> {
    const reviews = await prisma.review.findMany({
      where: { staffId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const ratingDistribution = {
      1: reviews.filter((r) => r.rating === 1).length,
      2: reviews.filter((r) => r.rating === 2).length,
      3: reviews.filter((r) => r.rating === 3).length,
      4: reviews.filter((r) => r.rating === 4).length,
      5: reviews.filter((r) => r.rating === 5).length,
    };

    return {
      businessId: staffId, // Using staffId instead of businessId for consistency
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
    };
  }

  private static transformResponse(review: Review): ReviewResponse {
    return {
      id: review.id,
      clientId: review.clientId,
      businessId: review.businessId,
      staffId: review.staffId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }
}
