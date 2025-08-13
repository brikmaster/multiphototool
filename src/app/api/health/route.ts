import { NextResponse } from 'next/server';
import { env, isProduction } from '../../../lib/env';

// Health check endpoint for monitoring and load balancers
export async function GET() {
  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: isProduction ? undefined : process.memoryUsage(),
      checks: {
        environment: true,
        cloudinary: !!env.CLOUDINARY_CLOUD_NAME,
        redis: !!env.REDIS_URL,
        sentry: !!env.SENTRY_DSN,
      },
    };

    // Basic service checks
    const allChecksPass = Object.values(healthData.checks).every(check => check === true);
    
    return NextResponse.json(healthData, {
      status: allChecksPass ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  }
}

// Simple ping endpoint
export async function HEAD() {
  return new Response(null, { status: 200 });
}
