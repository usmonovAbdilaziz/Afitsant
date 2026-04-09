import { z } from '@/utils/zod-openapi';

const baseReviewFields = {
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  comment: z
    .string()
    .max(1000, 'Comment must be less than 1000 characters')
    .optional(),
};

export const createReviewSchema = z.object({
  bookingId: z.string().cuid('Invalid booking ID format'),
  ...baseReviewFields,
});

export const updateReviewSchema = z
  .object(baseReviewFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

export const getReviewSchema = z.object({
  id: z.string().cuid('Invalid review ID format'),
});

export const businessReviewsSchema = z.object({
  businessId: z.string().cuid('Invalid business ID format'),
  // Query params arrive as strings — coerce to number to accept numeric query values
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
