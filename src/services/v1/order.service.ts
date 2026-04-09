import type { ClientJwtPayload } from '@/types/auth.types';
import { config } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { TokenUtil } from '@/utils/token';
import { AppError } from '@/utils/errors';
import { CartService } from './cart.service';
import { BookingRealtimeService } from './booking-realtime.service';

type IncomingItem = {
  serviceId: string;
  qty: number;
  priceSnapshot?: number;
  service?: {
    duration?: number;
    name?: string;
  };
  options?: {
    teaOptions?: {
      teaColor?: string;
      lemon?: boolean;
    };
    liter?: string;
  };
};

export class OrderService {
  private static async clearCartSafely(tableId: string): Promise<void> {
    try {
      await CartService.clearCart(tableId);
    } catch (error) {
      console.error('Failed to clear cart after order creation:', error);
    }
  }

  private static async resolveStaffIdForService(serviceId: string): Promise<string> {
    const linkedStaff = await prisma.staffService.findFirst({
      where: {
        serviceId,
        staff: {
          isActive: true,
        },
      },
      select: {
        staffId: true,
      },
    });

    if (linkedStaff?.staffId) {
      return linkedStaff.staffId;
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { businessId: true },
    });

    if (!service) {
      throw new AppError('Xizmat topilmadi', 404);
    }

    const fallbackStaff = await prisma.staff.findFirst({
      where: {
        businessId: service.businessId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!fallbackStaff) {
      throw new AppError('Ushbu xizmat uchun hodim topilmadi', 409);
    }

    return fallbackStaff.id;
  }

  private static async createBookingsFromItems(
    tableId: string,
    clientId: string,
    items: Array<{
      serviceId: string;
      qty: number;
      priceSnapshot?: number;
      note?: string;
    }>,
  ): Promise<string[]> {
    const createdBookingIds: string[] = [];

    for (const item of items) {
      const service = await prisma.service.findUnique({
        where: { id: item.serviceId },
        select: { id: true, businessId: true, price: true },
      });

      if (!service) {
        throw new AppError('Xizmat topilmadi', 404);
      }

      const staffId = await this.resolveStaffIdForService(service.id);
      const qty = Math.max(1, Number(item.qty || 1));
      const itemPrice = String(Number(item.priceSnapshot ?? service.price));

      for (let i = 0; i < qty; i += 1) {
        const booking = await prisma.booking.create({
          data: {
            businessId: service.businessId,
            clientId,
            serviceId: service.id,
            staffId,
            tableId,
            price: itemPrice,
            status: 'CONFIRMED',
            notes: item.note,
          },
          select: {
            id: true,
            businessId: true,
            clientId: true,
            staffId: true,
            tableId: true,
            status: true,
            updatedAt: true,
          },
        });

        BookingRealtimeService.emitFromBooking(booking, {
          action: 'created',
        });
        createdBookingIds.push(booking.id);
      }
    }

    return createdBookingIds;
  }

  /**
   * Keep order as pending-telegram container.
   * Confirmed result is represented by Booking records.
   */
  static async createOrder(tableId: string, items: IncomingItem[], clientId?: string) {
    if (!items || items.length === 0) {
      throw new AppError("Savatcha bo'sh", 400);
    }

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true },
    });

    if (!table) {
      throw new AppError('Stol topilmadi', 404);
    }

    const totalPrice = items.reduce(
      (sum: number, item) => sum + Number(item.priceSnapshot || 0) * Number(item.qty || 0),
      0,
    );

    const maxPrepTime = items.reduce(
      (max: number, item) => Math.max(max, Number(item.service?.duration || 0)),
      0,
    );
    const etaMinutes = maxPrepTime + 5;

    // Authenticated client: create bookings immediately, no telegram redirect.
    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) {
        throw new AppError('Mijoz topilmadi', 404);
      }

      const bookingIds = await this.createBookingsFromItems(
        tableId,
        client.id,
        items.map((item) => ({
          serviceId: item.serviceId,
          qty: item.qty,
          priceSnapshot: item.priceSnapshot,
          note: item.service?.name,
        })),
      );

      const tokenPayload: ClientJwtPayload = {
        sub: client.id,
        type: 'CLIENT',
        role: 'CLIENT',
        clientId: client.id,
        phone: client.phoneNumber,
        fullName: client.fullName,
      };
      const token = TokenUtil.generateToken(tokenPayload);

      await this.clearCartSafely(tableId);

      return {
        orderId: bookingIds[0] ?? null,
        confirmed: true,
        clientId: client.id,
        token,
        etaMinutes,
        phone: client.phoneNumber,
        bookingIds,
      };
    }

    // Unauthenticated user: keep pending order then confirm via Telegram.
    const order = await prisma.order.create({
      data: {
        tableId,
        status: 'PENDING_CONFIRM',
        totalPrice,
        etaMinutes,
        items: {
          create: items.map((item) => {
            let name = item.service?.name || 'Service';
            if (item.options?.teaOptions) {
              name += ` (${item.options.teaOptions.teaColor || ''}${item.options.teaOptions.lemon ? ' + Limon' : ''})`;
            }
            if (item.options?.liter) {
              name += ` (${item.options.liter}L)`;
            }

            return {
              menuItemId: item.serviceId,
              nameSnapshot: name,
              priceSnapshot: Number(item.priceSnapshot || 0),
              qty: Number(item.qty || 1),
              prepTimeSnapshot: Number(item.service?.duration || 0),
            };
          }),
        },
      },
      include: { items: true },
    });

    const telegramUrl = `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=o_${order.id}`;
    return { orderId: order.id, telegramUrl };
  }

  static async getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Buyurtma topilmadi', 404);
    }

    return order;
  }

  /**
   * Telegram confirmation:
   * 1) upsert client
   * 2) create booking records from order items
   * 3) mark order confirmed and return token
   */
  static async confirmOrder(
    orderId: string,
    telegramId: string,
    phone: string,
    fullName = 'Mijoz',
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new AppError('Buyurtma topilmadi', 404);
    }

    const client = await prisma.client.upsert({
      where: { phoneNumber: phone },
      update: { fullName, telegramUserId: telegramId },
      create: { phoneNumber: phone, fullName, telegramUserId: telegramId },
    });

    const tokenPayload: ClientJwtPayload = {
      sub: client.id,
      type: 'CLIENT',
      role: 'CLIENT',
      clientId: client.id,
      phone: client.phoneNumber,
      fullName: client.fullName,
    };
    const token = TokenUtil.generateToken(tokenPayload);

    const decoded = TokenUtil.decodeToken(token) as { exp?: number } | null;
    const tokenExpiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : null;

    // Idempotent: already confirmed -> refresh token and return.
    if (order.status === 'CONFIRMED') {
      const refreshed = await prisma.order.update({
        where: { id: orderId },
        data: {
          telegramId,
          phone,
          token,
        },
        include: { items: true },
      });
      return { ...refreshed, token, tokenExpiresAt, clientId: client.id };
    }

    const bookingIds = await this.createBookingsFromItems(
      order.tableId,
      client.id,
      order.items.map((item) => ({
        serviceId: item.menuItemId,
        qty: item.qty,
        priceSnapshot: item.priceSnapshot,
        note: item.nameSnapshot,
      })),
    );

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        bookingId: bookingIds[0] ?? null,
        telegramId,
        phone,
        confirmedAt: new Date(),
        token,
      },
      include: { items: true },
    });

    await this.clearCartSafely(order.tableId);

    return {
      ...updatedOrder,
      token,
      tokenExpiresAt,
      clientId: client.id,
      bookingIds,
    };
  }
  static async getClientOrders(clientId: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new AppError('Mijoz topilmadi', 404);
    }

    return prisma.booking.findMany({
      where: { clientId: client.id },
      include: {
        service: true,
        staff: true,
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
