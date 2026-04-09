import { z } from '@/utils/zod-openapi';

const baseServiceFields = {
  name: z.string().min(2, 'Service name must be at least 2 characters'),
  category: z.string({ message: 'Category is required' }),
  type: z.enum(['HOT', 'COLD'], { message: 'Type is required' }),
  description: z.string().optional(),
  duration: z.number().int().min(5, 'Duration must be at least 5 minutes'),
  price: z.number().min(0, 'Price cannot be negative'),
  isActive: z.boolean().optional(),
  photoUrl: z.string().optional(),
  staffIds: z.array(z.string().cuid()).optional(),
  liters: z.array(z.string()).optional(),
};

export const createServiceSchema = z.object({
  businessId: z.string().cuid('Invalid business ID format'),
  ...baseServiceFields,
});

export const updateServiceSchema = z
  .object(baseServiceFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

export const getServiceSchema = z.object({
  id: z.string().cuid('Invalid service ID format'),
});

export const serviceFilterSchema = z.object({
  businessId: z.string().cuid('Invalid business ID format').optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});
