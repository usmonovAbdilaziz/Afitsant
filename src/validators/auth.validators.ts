import { z } from '@/utils/zod-openapi';

const baseUserFields = {
  email: z.string().email('Invalid email format'),
  phoneNumber: z.string().min(9, 'Phone number must be at least 9 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  profilePhoto: z.string().optional(),
};

export const registerClientSchema = z.object({
  ...baseUserFields,
});

export const registerBusinessSchema = z.object({
  ...baseUserFields,
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
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});
