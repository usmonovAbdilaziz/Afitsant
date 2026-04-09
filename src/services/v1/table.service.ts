import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  CreateTableDto,
  TableFilterDto,
  TableResponse,
  UpdateTableDto,
} from '@/types/table.types';
import { NotFoundError, ConflictError } from '@/utils/errors';

export class TableService {
  static async create(data: CreateTableDto): Promise<TableResponse> {
    // Business mavjudligini tekshirish
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
    });

    if (!business) {
      throw new NotFoundError('Business not found');
    }

    // Stol raqami takrorlanmasligini tekshirish
    const existingTable = await prisma.table.findFirst({
      where: {
        businessId: data.businessId,
        tableNumber: data.tableNumber,
        tableColumns: data.tableColumns,
      },
    });

    if (existingTable) {
      throw new ConflictError(
        `Table number ${data.tableNumber} already exists in this business`,
      );
    }

    const table = await prisma.table.create({
      data: {
        businessId: data.businessId,
        tableNumber: data.tableNumber,
        tableColumns: data.tableColumns,
        status: data.status,
      },
    });

    return this.transformResponse(table);
  }

  static async getById(id: string): Promise<TableResponse | null> {
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    if (!table) {
      return null;
    }

    return this.transformResponse(table);
  }

  static async getByFilter(filter: TableFilterDto): Promise<TableResponse[]> {
    const where: Prisma.TableWhereInput = {};

    if (filter.businessId) {
      where.businessId = filter.businessId;
    }

    const tables = await prisma.table.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
      orderBy: { tableNumber: 'asc' },
    });

    return tables.map((t) => this.transformResponse(t));
  }

  static async getByBusinessId(businessId: string): Promise<TableResponse[]> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const tables = await prisma.table.findMany({
      where: { businessId },
      orderBy: { tableNumber: 'asc' },
    });

    return tables.map((t) => this.transformResponse(t));
  }

  static async update(
    id: string,
    data: UpdateTableDto,
  ): Promise<TableResponse> {
    const existing = await prisma.table.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Table not found');
    }

    // Agar stol raqami o'zgartirilayotgan bo'lsa, takrorlanmasligini tekshirish
    if (data.tableNumber && data.tableNumber !== existing.tableNumber) {
      const duplicate = await prisma.table.findFirst({
        where: {
          businessId: existing.businessId,
          tableNumber: data.tableNumber,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictError(
          `Table number ${data.tableNumber} already exists in this business`,
        );
      }
    }

    const table = await prisma.table.update({
      where: { id },
      data: {
        tableNumber: data.tableNumber,
        tableColumns: data.tableColumns,
      },
    });

    return this.transformResponse(table);
  }

  static async delete(id: string): Promise<void> {
    const existing = await prisma.table.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Table not found');
    }

    // Agar stolda aktiv bronlar bo'lsa, o'chirishni taqiqlash
    const activeBookings = await prisma.booking.count({
      where: {
        tableId: id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        priceStatus: {
          not: 'COMPLETED',
        },
      },
    });

    if (activeBookings > 0) {
      throw new ConflictError(
        'Cannot delete table with active bookings. Cancel or complete bookings first.',
      );
    }

    await prisma.table.delete({ where: { id } });
  }

  private static transformResponse(table: any): TableResponse {
    return {
      id: table.id,
      businessId: table.businessId,
      tableNumber: table.tableNumber,
      tableColumns: table.tableColumns,
      status: table.status,
      createdAt: table.createdAt.toISOString(),
      updatedAt: table.updatedAt.toISOString(),
    };
  }
}
