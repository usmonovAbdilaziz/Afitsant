import { z } from '@/utils/zod-openapi';

const baseStaffFields = {
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(9, 'Phone number must be at least 9 characters'),
  position: z.string().min(2, 'Position is required'),
  profilePhoto: z.string().optional(),
  isActive: z.boolean().optional(),
};

export const createStaffSchema = z.object({
  businessId: z.string().cuid('Invalid business ID format'),
  ...baseStaffFields,
  serviceIds: z
    .array(z.string().cuid('Invalid service ID format'))
    .min(1, 'At least one service is required'),
});

export const updateStaffSchema = z
  .object({
    ...baseStaffFields,
    serviceIds: z
      .array(z.string().cuid('Invalid service ID format'))
      .optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

export const getStaffSchema = z.object({
  id: z.string().cuid('Invalid staff ID format'),
});

export const assignServiceSchema = z.object({
  staffId: z.string().cuid('Invalid staff ID format'),
  serviceId: z.string().cuid('Invalid service ID format'),
});
