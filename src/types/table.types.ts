import type { Table, TableStatus } from '@/generated/prisma/client';

export interface CreateTableDto {
  businessId: string;
  tableNumber: number;
  tableColumns?: string;
  status?: TableStatus;
}

export interface UpdateTableDto {
  tableNumber?: number;
  tableColumns?: string;
  status?: TableStatus;
}

export interface TableResponse extends Omit<Table, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export interface TableFilterDto {
  businessId?: string;
}
