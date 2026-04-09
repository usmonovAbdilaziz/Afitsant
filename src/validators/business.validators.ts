import { z } from '@/utils/zod-openapi';

const baseBusinessFields = {
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters'),
  businessType: z.string().min(2, 'Business type is required'),
  description: z.string().optional(),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().min(9, 'Phone number must be at least 9 characters'),
  isApproved: z.boolean().optional(),
};

export const updateBusinessSchema = z
  .object(baseBusinessFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

// Schema for business discovery requests
export const businessDiscoverySchema = z.object({
  latitude: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .refine((val) => val >= -90 && val <= 90, {
      message: 'Latitude must be between -90 and 90',
    }),
  longitude: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .refine((val) => val >= -180 && val <= 180, {
      message: 'Longitude must be between -180 and 180',
    }),
  radius: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .optional()
    .default(10),
  businessType: z.string().optional(),
  city: z.string().optional(),
  staffName: z.string().optional(),
  clientGender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  limit: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .optional()
    .default(20),
  offset: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .optional()
    .default(0),
});
