import { BusinessRepository } from '@/repositories/business.repository';
import type { Business } from '@/generated/prisma/client';
import type {
  BusinessDiscoveryRequest,
  BusinessDiscoveryResponse,
  NearbyBusinessResponse,
} from '@/types/business.types';
import { prisma } from '@/lib/prisma';

export class BusinessService {
  static async discoverNearby(
    request: BusinessDiscoveryRequest,
  ): Promise<NearbyBusinessResponse> {
    const radius = request.radius || 5;
    const limit = 1; // Restriction: Only 1 nearest business
    const offset = request.offset || 0;

    console.log('Discovery request:', {
      latitude: request.latitude,
      longitude: request.longitude,
      radius,
      limit,
      offset,
    });

    // First, if we're filtering by staff name, find businesses that have staff with that name
    let businessIds: string[] | undefined;
    if (request.staffName) {
      const staffMembers = await prisma.staff.findMany({
        where: {
          fullName: {
            contains: request.staffName,
            mode: 'insensitive',
          },
          isActive: true,
        },
        select: {
          businessId: true,
        },
      });

      businessIds = staffMembers.map((staff) => staff.businessId);

      // If no staff found with that name, return empty result
      if (businessIds.length === 0) {
        return {
          businesses: [],
          total: 0,
        };
      }
    }

    const whereClause: {
      isApproved: boolean;
      businessType?: string;
      city?: string;
      id?: { in: string[] };
    } = {
      isApproved: true,
    };

    if (request.businessType) {
      whereClause.businessType = request.businessType;
    }

    if (request.city) {
      whereClause.city = request.city;
    }

    // If we filtered by staff name, also filter businesses by those IDs
    if (businessIds) {
      whereClause.id = { in: businessIds };
    }

    const businesses = await prisma.business.findMany({
      where: whereClause,
      include: {
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    console.log('Total approved businesses in DB:', businesses.length);
    businesses.forEach((b) => {
      console.log(
        `Business: ${b.businessName}, Lat: ${b.latitude}, Lng: ${b.longitude}`,
      );
    });

    const businessesWithDistance = businesses
      .map((business) => {
        const distance = this.calculateDistance(
          request.latitude,
          request.longitude,
          business.latitude,
          business.longitude,
        );

        console.log(
          `Distance to ${business.businessName}: ${distance} km (radius: ${radius} km)`,
        );

        const totalReviews = business.reviews.length;
        const averageRating =
          totalReviews > 0
            ? business.reviews.reduce((sum, r) => sum + r.rating, 0) /
              totalReviews
            : 0;

        return {
          ...business,
          distance,
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
        };
      })
      .filter((b) => b.distance <= radius);

    // Gender-based filtering
    let filteredBusinesses = businessesWithDistance;
    if (request.clientGender && request.clientGender !== 'OTHER') {
      // Filter businesses that have at least one service matching the client's gender
      const businessesWithServices = await Promise.all(
        businessesWithDistance.map(async (business) => {
          const services = await prisma.service.findMany({
            where: {
              businessId: business.id,
              isActive: true,
              gender: request.clientGender,
            },
          });
          return { business, hasMatchingServices: services.length > 0 };
        }),
      );

      filteredBusinesses = businessesWithServices
        .filter((item) => item.hasMatchingServices)
        .map((item) => item.business);
    }

    const sortedBusinesses = filteredBusinesses.sort(
      (a, b) => a.distance - b.distance,
    );

    console.log('Businesses within radius:', businessesWithDistance.length);
    console.log('After gender filter:', filteredBusinesses.length);

    const paginatedBusinesses = sortedBusinesses
      .slice(offset, offset + limit)
      .map((b) => this.transformResponse(b));

    return {
      businesses: paginatedBusinesses,
      total: sortedBusinesses.length,
    };
  }

  static async getById(id: string): Promise<BusinessDiscoveryResponse | null> {
    const business = await BusinessRepository.getBusinessWithBranches(id);
    if (!business) {
      return null;
    }

    const totalReviews = business.reviews?.length ?? 0;
    const averageRating =
      totalReviews > 0
        ? business.reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return this.transformResponse({
      ...business,
      distance: 0,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
    });
  }

  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private static transformResponse(
    business: Business & {
      distance: number;
      averageRating: number;
      totalReviews: number;
      reviews?: unknown[];
      children?: Business[];
    },
  ): BusinessDiscoveryResponse {
    return {
      id: business.id,
      userId: business.userId,
      parentId: business.parentId,
      businessName: business.businessName,
      businessType: business.businessType,
      description: business.description,
      address: business.address,
      city: business.city,
      latitude: business.latitude,
      longitude: business.longitude,
      phone: business.phone,
      isApproved: business.isApproved,
      // optional promo/notification fields
      notification: (business as any).notification ?? null,
      clearNotifData: (business as any).clearNotifData
        ? (business as any).clearNotifData instanceof Date
          ? (business as any).clearNotifData.toISOString()
          : new Date((business as any).clearNotifData).toISOString()
        : null,
      distance: business.distance,
      averageRating: business.averageRating,
      totalReviews: business.totalReviews,
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
      children: business.children,
    };
  }
  static async asyncGetAllBusiness(
    lat?: number,
    lng?: number,
  ): Promise<BusinessDiscoveryResponse[]> {
    const businesses = await prisma.business.findMany({
      where: {
        isApproved: true,
      },
      include: {
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return businesses.map((business) => {
      const totalReviews = business.reviews.length;
      const averageRating =
        totalReviews > 0
          ? business.reviews.reduce((sum, r) => sum + r.rating, 0) /
            totalReviews
          : 0;

      const distance =
        lat !== undefined && lng !== undefined
          ? this.calculateDistance(
              lat,
              lng,
              business.latitude,
              business.longitude,
            )
          : 0;

      return this.transformResponse({
        ...business,
        distance,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
      });
    });
  }

  // Legacy for compatibility
  static async getAllBusiness(lat?: number, lng?: number) {
    return this.asyncGetAllBusiness(lat, lng);
  }
}
