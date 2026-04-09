import { ServiceService } from '@/services/v1/service.service';
import {
  sendCreatedResponse,
  sendNoContentResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
  sendValidationError,
} from '@/utils/response.handler';
import {
  createServiceSchema,
  serviceFilterSchema,
  updateServiceSchema,
} from '@/validators/service.validators';
import type { Request, Response } from 'express';

export class ServiceController {
  static async create(req: Request, res: Response): Promise<void> {
    const data = { ...req.body };

    // Handle file upload
    if (req.file) {
      data.photoUrl = `/uploads/${req.file.filename}`;
    } else {
      // Avoid taking "undefined" or "[object FileList]" string from body
      delete data.photoUrl;
    }

    // Coerce types for FormData
    if (typeof data.duration === 'string')
      data.duration = Number(data.duration);
    if (typeof data.price === 'string') data.price = Number(data.price);
    if (typeof data.isActive === 'string')
      data.isActive = data.isActive === 'true';
    // Handle staffIds if it comes as a JSON string
    if (typeof data.staffIds === 'string') {
      try {
        data.staffIds = JSON.parse(data.staffIds);
      } catch (e) {
        // If parsing fails, validation will likely fail later
      }
    }
    if (typeof data.liters === 'string') {
      try {
        data.liters = JSON.parse(data.liters);
      } catch (e) {}
    }

    const validation = createServiceSchema.safeParse(data);
    if (!validation.success) {
      // Clean up uploaded file if validation fails
      // if (req.file) fs.unlink(req.file.path, () => {}); // Optional implementation
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const service = await ServiceService.create(validation.data);

    // Convert to full URL for response if needed
    if (service.photoUrl) {
      const protocol = req.protocol;
      const host = req.get('host');
      service.photoUrl = `${protocol}://${host}${service.photoUrl}`;
    }

    sendCreatedResponse(res, service);
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const service = await ServiceService.getById(id);
    if (!service) {
      return sendNotFoundResponse(res, 'Service not found');
    }

    // Convert to full URL
    if (service.photoUrl && !service.photoUrl.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      service.photoUrl = `${protocol}://${host}${service.photoUrl}`;
    }

    sendSuccessResponse(res, service);
  }

  static async getByFilter(req: Request, res: Response): Promise<void> {
    const validation = serviceFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const services = await ServiceService.getByFilter(validation.data);

    // Convert to full URL for all services
    const servicesWithFullUrl = services.map((service) => {
      if (service.photoUrl && !service.photoUrl.startsWith('http')) {
        const protocol = req.protocol;
        const host = req.get('host');
        return {
          ...service,
          photoUrl: `${protocol}://${host}${service.photoUrl}`,
        };
      }
      return service;
    });

    sendSuccessResponse(res, servicesWithFullUrl);
  }

  static async update(req: Request, res: Response): Promise<void> {
    const data = { ...req.body };

    // Handle file upload
    if (req.file) {
      data.photoUrl = `/uploads/${req.file.filename}`;
    }

    // Coerce types for FormData
    if (typeof data.duration === 'string')
      data.duration = Number(data.duration);
    if (typeof data.price === 'string') data.price = Number(data.price);
    if (typeof data.isActive === 'string')
      data.isActive = data.isActive === 'true';
    if (typeof data.staffIds === 'string') {
      try {
        data.staffIds = JSON.parse(data.staffIds);
      } catch (e) {}
    }
    if (typeof data.liters === 'string') {
      try {
        data.liters = JSON.parse(data.liters);
      } catch (e) {}
    }

    const validation = updateServiceSchema.safeParse(data);
    if (!validation.success) {
      return sendValidationError(
        res,
        'Validation failed',
        validation.error.issues.map((i) => i.message),
      );
    }

    const service = await ServiceService.update(req.params.id, validation.data);
    sendSuccessResponse(res, service);
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await ServiceService.delete(req.params.id);
    sendNoContentResponse(res);
  }
}
