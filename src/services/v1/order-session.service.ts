import { SocketController } from '@/controllers/v1/socket.controller';
import { config } from '@/config/env';
import { prisma } from '@/lib/prisma';
import type { ClientJwtPayload } from '@/types/auth.types';
import { ConflictError, NotFoundError } from '@/utils/errors';
import { TokenUtil } from '@/utils/token';

type VerifyOrderSessionInput = {
  tableId: string;
  orderSessionId: string;
  telegramUserId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  phone: string;
};

type ClientAuthPayload = {
  token: string;
  user: {
    id: string;
    role: 'CLIENT';
    phone: string;
    fullName: string;
  };
  tableId: string;
  orderSessionId: string;
};

export class OrderSessionService {
  private static buildStartPayload(
    tableId: string,
    orderSessionId: string,
  ): string {
    // Telegram deep-link payloads are safest with alnum/underscore chars only.
    return `${tableId}_${orderSessionId}`;
  }

  private static async findActiveSessionByTable(tableId: string) {
    const prismaAny = prisma as any;
    return prismaAny.orderSession.findFirst({
      where: {
        tableId,
        status: 'AWAITING_TELEGRAM',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private static emitAuthToken(data: ClientAuthPayload): void {
    const io = SocketController.getIO();
    if (!io) {
      return;
    }

    io.of('/socket').to(`table:${data.tableId}`).emit('auth:token', data);
  }

  private static buildAuthPayload(input: {
    client: {
      id: string;
      phoneNumber: string;
      fullName: string;
    };
    tableId: string;
    orderSessionId: string;
  }): ClientAuthPayload {
    const tokenPayload: ClientJwtPayload = {
      sub: input.client.id,
      type: 'CLIENT',
      role: 'CLIENT',
      clientId: input.client.id,
      phone: input.client.phoneNumber,
      fullName: input.client.fullName,
    };

    const token = TokenUtil.generateToken(tokenPayload);

    return {
      token,
      user: {
        id: input.client.id,
        role: 'CLIENT',
        phone: input.client.phoneNumber,
        fullName: input.client.fullName,
      },
      tableId: input.tableId,
      orderSessionId: input.orderSessionId,
    };
  }

  static async createOrderSession(tableId: string) {
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true },
    });

    if (!table) {
      throw new NotFoundError('Table not found');
    }

    const prismaAny = prisma as any;
    const session =
      (await this.findActiveSessionByTable(tableId)) ??
      (await prismaAny.orderSession.create({
        data: {
          tableId,
          status: 'AWAITING_TELEGRAM',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      }));

    const startPayload = this.buildStartPayload(tableId, session.id);
    const telegramLink = `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=${startPayload}`;
    const telegramAppLink = `tg://resolve?domain=${config.TELEGRAM_BOT_USERNAME}&start=${startPayload}`;

    return {
      orderSessionId: session.id,
      telegramLink,
      telegramAppLink,
      expiresAt: session.expiresAt,
      status: session.status,
    };
  }

  static async verifyLatestOrderSessionForTable(
    input: Omit<VerifyOrderSessionInput, 'orderSessionId'>,
  ) {
    const session = await this.findActiveSessionByTable(input.tableId);

    if (!session) {
      throw new NotFoundError('Aktiv tasdiqlash sessiyasi topilmadi');
    }

    return this.verifyOrderSession({
      ...input,
      orderSessionId: session.id,
    });
  }

  static async verifyOrderSession(input: VerifyOrderSessionInput) {
    const prismaAny = prisma as any;
    const session = await prismaAny.orderSession.findUnique({
      where: { id: input.orderSessionId },
      include: {
        table: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Order session not found');
    }

    if (session.tableId !== input.tableId) {
      throw new ConflictError('Order session does not belong to this table');
    }

    if (
      session.status === 'EXPIRED' ||
      new Date(session.expiresAt) < new Date()
    ) {
      await prismaAny.orderSession.update({
        where: { id: input.orderSessionId },
        data: { status: 'EXPIRED' },
      });
      throw new ConflictError('Order session expired');
    }

    const fullName =
      [input.firstName, input.lastName].filter(Boolean).join(' ') || 'Mijoz';

    const client = await prisma.client.upsert({
      where: { phoneNumber: input.phone },
      update: {
        fullName,
        username: input.username ?? undefined,
        telegramUserId: input.telegramUserId,
        languageCode: input.languageCode ?? undefined,
      },
      create: {
        phoneNumber: input.phone,
        fullName,
        username: input.username ?? undefined,
        telegramUserId: input.telegramUserId,
        languageCode: input.languageCode ?? undefined,
      },
    });

    await prismaAny.orderSession.update({
      where: { id: input.orderSessionId },
      data: {
        status: 'VERIFIED',
        clientId: client.id,
        telegramUserId: input.telegramUserId,
        telegramUsername: input.username ?? undefined,
        languageCode: input.languageCode ?? undefined,
        phone: input.phone,
        verifiedAt: new Date(),
      },
    });

    const payload = this.buildAuthPayload({
      client: {
        id: client.id,
        phoneNumber: client.phoneNumber,
        fullName: client.fullName,
      },
      tableId: input.tableId,
      orderSessionId: input.orderSessionId,
    });

    this.emitAuthToken(payload);

    return payload;
  }

  static async getOrderSessionStatus(orderSessionId: string, tableId: string) {
    const prismaAny = prisma as any;
    const session = await prismaAny.orderSession.findUnique({
      where: { id: orderSessionId },
      include: {
        client: {
          select: {
            id: true,
            phoneNumber: true,
            fullName: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Order session not found');
    }

    if (session.tableId !== tableId) {
      throw new ConflictError('Order session does not belong to this table');
    }

    const isExpired = new Date(session.expiresAt) < new Date();
    if (isExpired && session.status === 'AWAITING_TELEGRAM') {
      await prismaAny.orderSession.update({
        where: { id: orderSessionId },
        data: { status: 'EXPIRED' },
      });
      session.status = 'EXPIRED';
    }

    if (session.status === 'VERIFIED' && session.client) {
      return {
        status: session.status,
        expiresAt: session.expiresAt,
        verifiedAt: session.verifiedAt,
        ...this.buildAuthPayload({
          client: session.client,
          tableId: session.tableId,
          orderSessionId: session.id,
        }),
      };
    }

    return {
      orderSessionId: session.id,
      tableId: session.tableId,
      status: session.status,
      expiresAt: session.expiresAt,
      verifiedAt: session.verifiedAt,
    };
  }
}
