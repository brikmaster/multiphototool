import * as Sentry from '@sentry/nextjs';
import { env, SENTRY_DSN, isProduction } from './src/lib/env';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: env.NODE_ENV,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: !isProduction,
  
  // Server-specific configuration
  integrations: [
    // Add profiling integration for performance monitoring
    new Sentry.ProfilingIntegration(),
  ],
  
  // Set sample rate for profiling
  profilesSampleRate: isProduction ? 0.1 : 1.0,
  
  beforeSend(event, hint) {
    // Server-side error filtering
    if (isProduction) {
      // Don't send database connection errors that are temporary
      if (event.exception?.values?.[0]?.value?.includes('ECONNRESET')) {
        return null;
      }
      
      // Don't send Redis connection errors
      if (event.exception?.values?.[0]?.value?.includes('Redis')) {
        return null;
      }
    }
    
    // Add server context
    event.tags = {
      ...event.tags,
      component: 'server',
    };
    
    return event;
  },
  
  beforeSendTransaction(event) {
    // Add server-side transaction filtering
    if (event.transaction?.includes('/_next/')) {
      // Don't track Next.js internal requests
      return null;
    }
    
    return event;
  },
});
