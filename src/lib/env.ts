import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Cloudinary cloud name is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'Cloudinary API key is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'Cloudinary API secret is required'),
  CLOUDINARY_WEBHOOK_SECRET: z.string().optional(),
  
  // Next.js
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Public Cloudinary cloud name is required'),
  
  // Redis (for rate limiting)
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  
  // Sentry
  SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters').optional(),
  NEXTAUTH_URL: z.string().url('Invalid NextAuth URL').optional(),
  
  // Rate limiting
  UPLOAD_RATE_LIMIT_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('10'),
  UPLOAD_RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('60000'), // 1 minute
  
  // CDN
  CDN_URL: z.string().url('Invalid CDN URL').optional(),
});

// Type for validated environment variables
export type Env = z.infer<typeof envSchema>;

// Validate environment variables
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(
        `Environment validation failed:\n${missingVars.join('\n')}\n\nPlease check your .env.local file.`
      );
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Helper function to check if running in production
export const isProduction = env.NODE_ENV === 'production';

// Helper function to check if development mode
export const isDevelopment = env.NODE_ENV === 'development';

// Export individual validated env vars for convenience
export const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_WEBHOOK_SECRET,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  REDIS_URL,
  SENTRY_DSN,
  NODE_ENV,
  UPLOAD_RATE_LIMIT_REQUESTS,
  UPLOAD_RATE_LIMIT_WINDOW_MS,
  CDN_URL,
} = env;
