import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Platform Security
  APP_ENCRYPTION_KEY: z.string().length(32, 'APP_ENCRYPTION_KEY must be exactly 32 characters for AES-256'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  
  // Google OAuth App Credentials
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_REDIRECT_URI: z.string().url('GOOGLE_REDIRECT_URI must be a valid URL'),
  
  // Notion OAuth App Credentials
  NOTION_CLIENT_ID: z.string().min(1, 'NOTION_CLIENT_ID is required'),
  NOTION_CLIENT_SECRET: z.string().min(1, 'NOTION_CLIENT_SECRET is required'),
  NOTION_REDIRECT_URI: z.string().url('NOTION_REDIRECT_URI must be a valid URL'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  GOOGLE_PUBSUB_TOPIC: z.string().optional(),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  
  return result.data;
};

export const env = parseEnv();
