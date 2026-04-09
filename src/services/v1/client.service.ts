import type { BookingStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { BookingFilterDto, BookingResponse } from '@/types/booking.types';
import { BookingService } from './booking.service';

export type ClientBookingsQuery = {
  clientId: string;
  status?: BookingStatus;
  startDate?: Date;
  endDate?: Date;
};

export class ClientService {
  static async getClientBusinesses(clientId: string) {
    const bookings = await prisma.booking.findMany({
      where: { clientId },
      select: {
        service: {
          select: {
            business: true,
          },
        },
      },
    });

    const byId = new Map<
      string,
      (typeof bookings)[number]['service']['business']
    >();
    for (const b of bookings) {
      const business = b.service.business;
      if (business && !byId.has(business.id)) {
        byId.set(business.id, business);
      }
    }

    return Array.from(byId.values());
  }

  static async getClientDashboard(clientId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      latestBooking,
      businesses,
    ] = await Promise.all([
      prisma.booking.count({ where: { clientId } }),
      prisma.booking.count({
        where: {
          clientId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          priceStatus: { not: 'COMPLETED' },
          bookingDate: { gte: startOfToday },
        },
      }),
      prisma.booking.count({
        where: {
          clientId,
          OR: [
            { status: 'COMPLETED' },
            { priceStatus: 'COMPLETED' },
            { progressStatus: 'DELIVERED' },
          ],
        },
      }),
      prisma.booking.count({ where: { clientId, status: 'CANCELLED' } }),
      prisma.booking.findFirst({
        where: { clientId },
        orderBy: { bookingDate: 'desc' },
        select: { bookingDate: true },
      }),
      prisma.booking.findMany({
        where: { clientId },
        select: { service: { select: { businessId: true } } },
      }),
    ]);

    const uniqueBusinessIds = new Set<string>();
    for (const b of businesses) {
      uniqueBusinessIds.add(b.service.businessId);
    }

    return {
      totalBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      uniqueBusinesses: uniqueBusinessIds.size,
      latestBookingDate: latestBooking?.bookingDate.toISOString() ?? null,
    };
  }

  static async getClientBookings(
    clientId: string,
    query: ClientBookingsQuery,
  ): Promise<BookingResponse[]> {
    const filter: BookingFilterDto = {
      clientId,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    return BookingService.getByFilter(filter);
  }
}
