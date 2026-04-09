import { z } from '@/utils/zod-openapi';

const baseTableFields = {
  tableNumber: z.number().int().min(1, 'Table number must be at least 1'),
  tableColumns: z.string().optional(),
};

export const createTableSchema = z.object({
  businessId: z.string().cuid('Invalid business ID format'),
  ...baseTableFields,
});

export const updateTableSchema = z
  .object(baseTableFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

export const getTableSchema = z.object({
  id: z.string().cuid('Invalid table ID format'),
});

export const tableFilterSchema = z.object({
  businessId: z.string().cuid('Invalid business ID format').optional(),
});
