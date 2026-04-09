import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z as baseZ, ZodError as BaseZodError } from 'zod';

extendZodWithOpenApi(baseZ);

export const z = baseZ;
export const ZodError = BaseZodError;
