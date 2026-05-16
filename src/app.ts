import routes from '@/routes';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { Prisma } from '@/generated/prisma/client';
import { z, ZodError } from '@/utils/zod-openapi';
import {
  loginSchema,
  registerBusinessSchema,
  registerClientSchema,
} from '@/validators/auth.validators';
import {
  availableSlotsSchema,
  bookingFilterSchema,
  clientBookingsSchema,
  clientCancellationResponseSchema,
  createBookingSchema,
  getBookingSchema,
  updateBookingSchema,
} from '@/validators/booking.validators';
import {
  businessDiscoverySchema,
  updateBusinessSchema,
} from '@/validators/business.validators';
import {
  createReviewSchema,
  businessReviewsSchema,
  getReviewSchema,
  updateReviewSchema,
} from '@/validators/review.validators';
import {
  createServiceSchema,
  getServiceSchema,
  serviceFilterSchema,
  updateServiceSchema,
} from '@/validators/service.validators';
import {
  assignServiceSchema,
  createStaffSchema,
  getStaffSchema,
  updateStaffSchema,
} from '@/validators/staff.validators';
import {
  createTableSchema,
  getTableSchema,
  tableFilterSchema,
  updateTableSchema,
} from '@/validators/table.validators';
import {
  createStaffWorkingHoursSchema,
  createWorkingHoursSchema,
  getWorkingHoursSchema,
  updateWorkingHoursSchema,
} from '@/validators/working-hours.validators';
import { config } from './config/env';
import {
  sendBadRequestResponse,
  sendErrorResponse,
  sendNotFoundResponse,
  sendConflictResponse,
  sendUnauthorizedResponse,
  sendForbiddenResponse,
} from './utils/response.handler';
import {
  AppError,
  ConflictError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from './utils/errors';
import cors from 'cors';
import path from 'path';
// import { generalLimiter } from './middleware/rate-limit.middleware';

const app = express();

// Rate limiting - DDoS va brute-force himoyasi
// app.use(generalLimiter);
app.use(express.json());
app.use((req, res, next) => {
  next();
});
app.use(
  cors({
    origin: config.NODE_ENV === 'production' ? '*' : true,
    credentials: true,
  }),
);
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EasyBooking API',
      version: '1.0.0',
      description: 'API Documentation',
    },
    servers: [
      {
        url: `http://${config.HOST}:${config.PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: [`${process.cwd()}/docs/*.yaml`],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions) as any;

const registry = new OpenAPIRegistry();

registry.register('RegisterClient', registerClientSchema);
registry.register('RegisterBusiness', registerBusinessSchema);
registry.register('Login', loginSchema);

registry.register('CreateBooking', createBookingSchema);
registry.register('UpdateBooking', updateBookingSchema);
registry.register('GetBooking', getBookingSchema);
registry.register('BookingFilter', bookingFilterSchema);
registry.register('AvailableSlots', availableSlotsSchema);
registry.register('ClientBookings', clientBookingsSchema);
registry.register('ClientCancellationResponse', clientCancellationResponseSchema);

registry.register('UpdateBusiness', updateBusinessSchema);
registry.register('BusinessDiscovery', businessDiscoverySchema);

registry.register('CreateService', createServiceSchema);
registry.register('UpdateService', updateServiceSchema);
registry.register('GetService', getServiceSchema);
registry.register('ServiceFilter', serviceFilterSchema);

registry.register('CreateStaff', createStaffSchema);
registry.register('UpdateStaff', updateStaffSchema);
registry.register('GetStaff', getStaffSchema);
registry.register('AssignService', assignServiceSchema);

registry.register('CreateTable', createTableSchema);
registry.register('UpdateTable', updateTableSchema);
registry.register('GetTable', getTableSchema);
registry.register('TableFilter', tableFilterSchema);

registry.register('CreateWorkingHours', createWorkingHoursSchema);
registry.register('CreateStaffWorkingHours', createStaffWorkingHoursSchema);
registry.register('UpdateWorkingHours', updateWorkingHoursSchema);
registry.register('GetWorkingHours', getWorkingHoursSchema);

registry.register('CreateReview', createReviewSchema);
registry.register('UpdateReview', updateReviewSchema);
registry.register('GetReview', getReviewSchema);
registry.register('BusinessReviews', businessReviewsSchema);

const generator = new OpenApiGeneratorV3(registry.definitions);
const generated = generator.generateComponents() as any;
const generatedComponents = (generated.components ?? {}) as any;

const existingComponents = (swaggerDocs.components ?? {}) as any;
const mergeComponentKey = (key: string) => ({
  ...(existingComponents[key] ?? {}),
  ...((generatedComponents[key] ?? {}) as Record<string, unknown>),
});
swaggerDocs.components = {
  ...existingComponents,
  ...generatedComponents,
  schemas: mergeComponentKey('schemas'),
  parameters: mergeComponentKey('parameters'),
  responses: mergeComponentKey('responses'),
  securitySchemes: mergeComponentKey('securitySchemes'),
  requestBodies: mergeComponentKey('requestBodies'),
  headers: mergeComponentKey('headers'),
  examples: mergeComponentKey('examples'),
};
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

app.use(routes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EasyBooking API is running',
    version: '1.0.0',
  });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error caught by global handler:', err);
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);

  if (err instanceof ZodError) {
    sendBadRequestResponse(res, z.treeifyError(err));
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      const field = (err.meta?.target as string[])?.[0] || 'field';
      sendConflictResponse(
        res,
        `A record with this ${field} already exists`,
        409,
      );
      return;
    }
    if (err.code === 'P2025') {
      // Record not found
      sendNotFoundResponse(res, 'Record not found', 404);
      return;
    }
    if (err.code === 'P2003') {
      // Foreign key constraint violation
      sendBadRequestResponse(res, 'Invalid reference', 400);
      return;
    }
    // Other Prisma errors
    console.error('Prisma error:', err.code, err.meta);
    sendErrorResponse(res, 'Database error occurred', 500);
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    sendBadRequestResponse(res, 'Invalid data provided', 400);
    return;
  }

  // Check for AppError by name (in case of serialization issues)
  if (err.name === 'ConflictError' || err instanceof ConflictError) {
    sendConflictResponse(res, err.message, 409);
    return;
  }

  if (err.name === 'ValidationError' || err instanceof ValidationError) {
    sendBadRequestResponse(res, err.message, 400);
    return;
  }

  if (
    err.name === 'AuthenticationError' ||
    err instanceof AuthenticationError
  ) {
    sendUnauthorizedResponse(res, err.message, 401);
    return;
  }

  if (err.name === 'AuthorizationError' || err instanceof AuthorizationError) {
    sendForbiddenResponse(res, err.message, 403);
    return;
  }

  if (err.name === 'NotFoundError' || err instanceof NotFoundError) {
    sendNotFoundResponse(res, err.message, 404);
    return;
  }

  if (err instanceof AppError) {
    sendErrorResponse(res, err.message, err.statusCode);
    return;
  }

  // Unknown error
  console.error('Unhandled error type:', typeof err);
  console.error('Unhandled error constructor:', err.constructor.name);
  sendErrorResponse(res, err.message || 'Something went wrong');
});

app.use((req: Request, res: Response) => {
  sendNotFoundResponse(res, `Cannot ${req.method} ${req.path}`);
});

export default app;
