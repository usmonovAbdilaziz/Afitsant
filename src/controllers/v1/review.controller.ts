import { ReviewService } from '@/services/v1/review.service';
import {
  sendCreatedResponse,
  sendNoContentResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
  sendValidationError,
} from '@/utils/response.handler';
import {
  businessReviewsSchema,
  createReviewSchema,
  updateReviewSchema,
} from '@/validators/review.validators';
import type { Request, Response } from 'express';

export class ReviewController {
  static async create(req: Request, res: Response): Promise<void> {
    const validation = createReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const clientId = req.user?.userId;
    if (!clientId) {
      return sendValidationError(res, 'User ID not found in request', []);
    }

    const review = await ReviewService.create(clientId, validation.data);
    sendCreatedResponse(res, review);
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const review = await ReviewService.getById(id);
    if (!review) {
      return sendNotFoundResponse(res, 'Review not found');
    }

    sendSuccessResponse(res, review);
  }

  static async getByBusinessId(req: Request, res: Response): Promise<void> {
    const validation = businessReviewsSchema.safeParse({
      businessId: req.params.businessId,
      ...req.query,
    });

    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const reviews = await ReviewService.getByBusinessId(
      validation.data.businessId,
      validation.data.minRating,
      validation.data.limit,
      validation.data.offset,
    );

    sendSuccessResponse(res, reviews);
  }

  static async getBusinessRatingStats(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { businessId } = req.params;
    const stats = await ReviewService.getBusinessRatingStats(businessId);
    sendSuccessResponse(res, stats);
  }

  static async update(req: Request, res: Response): Promise<void> {
    const validation = updateReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const clientId = req.user?.userId;
    if (!clientId) {
      return sendValidationError(res, 'User ID not found in request', []);
    }

    const review = await ReviewService.update(
      req.params.id,
      clientId,
      validation.data,
    );
    sendSuccessResponse(res, review);
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const clientId = req.user?.userId;
    if (!clientId) {
      return sendValidationError(res, 'User ID not found in request', []);
    }

    await ReviewService.deleteByClient(req.params.id, clientId);
    sendNoContentResponse(res);
  }

  static async getByStaffId(req: Request, res: Response): Promise<void> {
    const validation = businessReviewsSchema.safeParse({
      businessId: req.params.staffId, // Using businessId schema field for staffId
      ...req.query,
    });

    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const reviews = await ReviewService.getByStaffId(
      validation.data.businessId, // This is actually staffId
      validation.data.minRating,
      validation.data.limit,
      validation.data.offset,
    );

    sendSuccessResponse(res, reviews);
  }

  static async getStaffRatingStats(req: Request, res: Response): Promise<void> {
    const { staffId } = req.params;
    const stats = await ReviewService.getStaffRatingStats(staffId);
    sendSuccessResponse(res, stats);
  }
}
