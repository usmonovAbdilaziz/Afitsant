import { z } from '@/utils/zod-openapi';
import { DayOfWeek } from '@/generated/prisma';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const baseWorkingHoursFields = {
  dayOfWeek: z.nativeEnum(DayOfWeek, { message: 'Invalid day of week' }),
  startTime: z
    .union([z.string(), z.null()])
    .optional()
    .refine((val) => !val || val === '' || timeRegex.test(val), {
      message:
        'Invalid time format. Use HH:MM (24-hour format) or empty string for closed days',
    }),
  endTime: z
    .union([z.string(), z.null()])
    .optional()
    .refine((val) => !val || val === '' || timeRegex.test(val), {
      message:
        'Invalid time format. Use HH:MM (24-hour format) or empty string for closed days',
    }),
  dinnerStartTime: z
    .union([z.string(), z.null()])
    .optional()
    .refine((val) => !val || val === '' || timeRegex.test(val), {
      message:
        'Invalid time format. Use HH:MM (24-hour format) or empty string',
    }),
  dinnerEndTime: z
    .union([z.string(), z.null()])
    .optional()
    .refine((val) => !val || val === '' || timeRegex.test(val), {
      message:
        'Invalid time format. Use HH:MM (24-hour format) or empty string',
    }),
  isActive: z.boolean().optional(),
};

export const createWorkingHoursSchema = z
  .object({
    businessId: z.string().cuid('Invalid business ID format'),
    ...baseWorkingHoursFields,
  })
  .refine(
    (data) => {
      // If isActive is false (closed day), validation passes regardless of times
      if (data.isActive === false) {
        return true;
      }
      // If isActive is undefined or true, both times must be provided and valid
      // If both times are empty, null, or undefined, validation fails (unless isActive is false)
      if (
        !data.startTime ||
        !data.endTime ||
        data.startTime === '' ||
        data.endTime === ''
      ) {
        return false;
      }
      // Both times are provided, validate format first
      if (
        typeof data.startTime === 'string' &&
        typeof data.endTime === 'string'
      ) {
        if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
          return false;
        }
        // Both times are provided and valid, validate that end is after start
        const start = data.startTime.split(':').map(Number);
        const end = data.endTime.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        return endMinutes > startMinutes;
      }
      return false;
    },
    {
      message:
        'End time must be after start time, or set isActive to false for closed days',
    },
  )
  .refine(
    (data) => {
      // If isActive is false (closed day), validation passes for dinner times
      if (data.isActive === false) {
        return true;
      }
      // If dinner times are provided, validate they are within working hours
      if (
        data.dinnerStartTime &&
        data.dinnerEndTime &&
        data.dinnerStartTime !== '' &&
        data.dinnerEndTime !== '' &&
        data.startTime &&
        data.endTime &&
        data.startTime !== '' &&
        data.endTime !== '' &&
        typeof data.dinnerStartTime === 'string' &&
        typeof data.dinnerEndTime === 'string' &&
        typeof data.startTime === 'string' &&
        typeof data.endTime === 'string'
      ) {
        // Validate dinner time format
        if (
          !timeRegex.test(data.dinnerStartTime) ||
          !timeRegex.test(data.dinnerEndTime)
        ) {
          return false;
        }
        const dinnerStart = data.dinnerStartTime.split(':').map(Number);
        const dinnerEnd = data.dinnerEndTime.split(':').map(Number);
        const workStart = data.startTime.split(':').map(Number);
        const workEnd = data.endTime.split(':').map(Number);

        const dinnerStartMinutes = dinnerStart[0] * 60 + dinnerStart[1];
        const dinnerEndMinutes = dinnerEnd[0] * 60 + dinnerEnd[1];
        const workStartMinutes = workStart[0] * 60 + workStart[1];
        const workEndMinutes = workEnd[0] * 60 + workEnd[1];

        return (
          dinnerEndMinutes > dinnerStartMinutes &&
          dinnerStartMinutes >= workStartMinutes &&
          dinnerEndMinutes <= workEndMinutes
        );
      }
      return true;
    },
    {
      message:
        'Dinner time must be within working hours and end time must be after start time',
    },
  );

export const createStaffWorkingHoursSchema = z
  .object({
    staffId: z.string().cuid('Invalid staff ID format'),
    ...baseWorkingHoursFields,
  })
  .refine(
    (data) => {
      // If both times are empty (closed day), validation passes
      if (data.startTime === '' && data.endTime === '') {
        return true;
      }
      // If one is empty but not both, validation fails
      if (data.startTime === '' || data.endTime === '') {
        return false;
      }
      // Both times are provided, validate that end is after start
      const start = data.startTime?.split(':').map(Number) ?? [];
      const end = data.endTime?.split(':').map(Number) ?? [];
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return endMinutes > startMinutes;
    },
    {
      message:
        'End time must be after start time, or both must be empty for closed days',
    },
  );

export const updateWorkingHoursSchema = z
  .object({
    startTime: z
      .union([z.string(), z.null()])
      .optional()
      .refine(
        (val) =>
          !val ||
          val === '' ||
          (typeof val === 'string' && timeRegex.test(val)),
        {
          message:
            'Invalid time format. Use HH:MM (24-hour format) or empty string',
        },
      ),
    endTime: z
      .union([z.string(), z.null()])
      .optional()
      .refine(
        (val) =>
          !val ||
          val === '' ||
          (typeof val === 'string' && timeRegex.test(val)),
        {
          message:
            'Invalid time format. Use HH:MM (24-hour format) or empty string',
        },
      ),
    dinnerStartTime: z
      .union([z.string(), z.null()])
      .optional()
      .refine(
        (val) =>
          !val ||
          val === '' ||
          (typeof val === 'string' && timeRegex.test(val)),
        {
          message:
            'Invalid time format. Use HH:MM (24-hour format) or empty string',
        },
      ),
    dinnerEndTime: z
      .union([z.string(), z.null()])
      .optional()
      .refine(
        (val) =>
          !val ||
          val === '' ||
          (typeof val === 'string' && timeRegex.test(val)),
        {
          message:
            'Invalid time format. Use HH:MM (24-hour format) or empty string',
        },
      ),
    isActive: z.boolean().optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

export const getWorkingHoursSchema = z.object({
  id: z.string().cuid('Invalid working hours ID format'),
});
