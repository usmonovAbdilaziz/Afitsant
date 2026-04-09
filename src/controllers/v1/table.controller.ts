import { TableService } from '@/services/v1/table.service';
import {
  sendCreatedResponse,
  sendNoContentResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
  sendValidationError,
} from '@/utils/response.handler';
import {
  createTableSchema,
  tableFilterSchema,
  updateTableSchema,
} from '@/validators/table.validators';
import type { Request, Response } from 'express';

export class TableController {
  static async create(req: Request, res: Response): Promise<void> {
    const validation = createTableSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const table = await TableService.create(validation.data);
    sendCreatedResponse(res, table);
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const table = await TableService.getById(id);
    if (!table) {
      return sendNotFoundResponse(res, 'Table not found');
    }

    sendSuccessResponse(res, table);
  }

  static async getByFilter(req: Request, res: Response): Promise<void> {
    const validation = tableFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const tables = await TableService.getByFilter(validation.data);
    sendSuccessResponse(res, tables);
  }

  static async getByBusiness(req: Request, res: Response): Promise<void> {
    const { businessId } = req.params;

    const tables = await TableService.getByBusinessId(businessId);
    sendSuccessResponse(res, tables);
  }

  static async update(req: Request, res: Response): Promise<void> {
    const validation = updateTableSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const table = await TableService.update(req.params.id, validation.data);
    sendSuccessResponse(res, table);
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await TableService.delete(req.params.id);
    sendNoContentResponse(res);
  }
}
