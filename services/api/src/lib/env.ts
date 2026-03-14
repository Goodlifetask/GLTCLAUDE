import { z } from 'zod';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
// Load .env from the api service root (works regardless of cwd)
const __envDir = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__envDir, '../../.env'), override: false });

const envSchema = z.object({
  // Server
  NODE_ENV:      z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT:          z.coerce.number().default(3001),
  LOG_LEVEL:     z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  API_URL:       z.string().url(),

  // Database
  DATABASE_URL:  z.string().url(),

  // Redis
  REDIS_URL:     z.string().url(),

  // JWT
  JWT_SECRET:    z.string().min(32),
  JWT_ISSUER:    z.string().default('goodlifetask.com'),
  JWT_AUDIENCE:  z.string().default('goodlifetask-api'),
  ACCESS_TOKEN_TTL:  z.coerce.number().default(900),    // 15 minutes
  REFRESH_TOKEN_TTL: z.coerce.number().default(2592000), // 30 days

  // OAuth
  GOOGLE_CLIENT_ID:     z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  APPLE_CLIENT_ID:      z.string(),
  APPLE_TEAM_ID:        z.string(),
  APPLE_KEY_ID:         z.string(),
  APPLE_PRIVATE_KEY:    z.string(),
  MICROSOFT_CLIENT_ID:      z.string().optional(),
  MICROSOFT_CLIENT_SECRET:  z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY:         z.string(),
  STRIPE_WEBHOOK_SECRET:     z.string(),
  STRIPE_PRO_MONTHLY_PRICE_ID:   z.string(),
  STRIPE_PRO_YEARLY_PRICE_ID:    z.string(),
  STRIPE_TEAM_MONTHLY_PRICE_ID:  z.string(),
  STRIPE_TEAM_YEARLY_PRICE_ID:   z.string(),

  // RevenueCat
  REVENUECAT_WEBHOOK_SECRET: z.string(),

  // Firebase (FCM)
  FIREBASE_PROJECT_ID:       z.string(),
  FIREBASE_SERVICE_ACCOUNT:  z.string(), // JSON string

  // APNs
  APNS_KEY_ID:    z.string(),
  APNS_TEAM_ID:   z.string(),
  APNS_PRIVATE_KEY: z.string(),
  APNS_BUNDLE_ID: z.string().default('com.goodlifetask.app'),
  APNS_PRODUCTION: z.coerce.boolean().default(false),

  // Web Push (VAPID)
  VAPID_PUBLIC_KEY:  z.string(),
  VAPID_PRIVATE_KEY: z.string(),
  VAPID_SUBJECT:     z.string().email(),

  // Email (Resend)
  RESEND_API_KEY:   z.string(),
  EMAIL_FROM:       z.string().email().default('notifications@goodlifetask.com'),
  EMAIL_FROM_NAME:  z.string().default('GoodLifeTask'),

  // AWS S3
  AWS_REGION:            z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID:     z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET_NAME:        z.string(),
  S3_CDN_URL:            z.string().url().optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().length(64), // 32-byte hex key

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Frontend URL (for OAuth redirects, emails)
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL:    z.string().url().default('http://localhost:3002'),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
