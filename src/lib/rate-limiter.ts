import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { env, REDIS_URL, UPLOAD_RATE_LIMIT_REQUESTS, UPLOAD_RATE_LIMIT_WINDOW_MS } from './env';

// Rate limiter instance
let rateLimiter: RateLimiterMemory | RateLimiterRedis;

// Initialize rate limiter
function initializeRateLimiter() {
  const options = {
    keyPrefix: 'upload_rate_limit',
    points: UPLOAD_RATE_LIMIT_REQUESTS, // Number of requests
    duration: Math.floor(UPLOAD_RATE_LIMIT_WINDOW_MS / 1000), // Per duration in seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  };

  if (REDIS_URL && env.NODE_ENV === 'production') {
    // Use Redis in production for distributed rate limiting
    const redis = new Redis(REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    });

    rateLimiter = new RateLimiterRedis({
      storeClient: redis,
      ...options,
    });
  } else {
    // Use in-memory rate limiter for development
    rateLimiter = new RateLimiterMemory(options);
  }

  return rateLimiter;
}

// Get or create rate limiter instance
export function getRateLimiter() {
  if (!rateLimiter) {
    rateLimiter = initializeRateLimiter();
  }
  return rateLimiter;
}

// Rate limiting middleware for API routes
export async function checkRateLimit(identifier: string): Promise<{ 
  allowed: boolean; 
  remaining?: number; 
  resetTime?: Date;
  retryAfter?: number;
}> {
  try {
    const limiter = getRateLimiter();
    const result = await limiter.consume(identifier);
    
    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetTime: new Date(Date.now() + result.msBeforeNext),
    };
  } catch (rejRes: any) {
    // Rate limit exceeded
    const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 60;
    
    return {
      allowed: false,
      retryAfter,
      resetTime: new Date(Date.now() + rejRes.msBeforeNext),
    };
  }
}

// Get client identifier for rate limiting
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for production behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  const ip = forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  
  // You could also include user ID if authenticated
  // const userId = await getUserIdFromRequest(request);
  // return userId ? `user:${userId}` : `ip:${ip}`;
  
  return `ip:${ip}`;
}

// Rate limit response helper
export function createRateLimitResponse(rateLimitResult: Awaited<ReturnType<typeof checkRateLimit>>) {
  const headers = new Headers();
  
  if (rateLimitResult.remaining !== undefined) {
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  }
  
  if (rateLimitResult.resetTime) {
    headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString());
  }
  
  if (!rateLimitResult.allowed && rateLimitResult.retryAfter) {
    headers.set('Retry-After', rateLimitResult.retryAfter.toString());
    
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many upload requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      }
    );
  }
  
  return null; // Rate limit passed
}
