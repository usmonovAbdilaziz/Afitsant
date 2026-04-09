import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('7d'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6374'),
});

const parsedEnv = envSchema.parse(process.env);

export const config = {
  NODE_ENV: parsedEnv.NODE_ENV,
  PORT: parsedEnv.PORT,
  HOST: parsedEnv.HOST,
  DATABASE_URL: parsedEnv.DATABASE_URL,
  JWT_SECRET: parsedEnv.JWT_SECRET,
  JWT_EXPIRES_IN: parsedEnv.JWT_EXPIRES_IN,
  TELEGRAM_BOT_TOKEN: parsedEnv.TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME: parsedEnv.TELEGRAM_BOT_USERNAME,
  TELEGRAM_WEBHOOK_SECRET: parsedEnv.TELEGRAM_WEBHOOK_SECRET,
  REDIS_URL: parsedEnv.REDIS_URL,
  
};
