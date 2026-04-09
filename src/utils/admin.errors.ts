export class AdminError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export class EntityNotFoundError extends AdminError {
  constructor(entity: string, id: string) {
    super(`${entity} with ID ${id} not found`, 'ENTITY_NOT_FOUND', 404);
  }
}

export class AdminOperationError extends AdminError {
  constructor(operation: string, reason: string) {
    super(`Cannot ${operation}: ${reason}`, 'ADMIN_OPERATION_ERROR', 403);
  }
}

export class ValidationError extends AdminError {
  constructor(field: string, reason: string) {
    super(`Invalid ${field}: ${reason}`, 'VALIDATION_ERROR', 400);
  }
}
