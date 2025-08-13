import * as Sentry from '@sentry/nextjs';
import { env, SENTRY_DSN, isProduction } from './src/lib/env';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: env.NODE_ENV,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: !isProduction,
  
  beforeSend(event, hint) {
    // Edge runtime error filtering
    event.tags = {
      ...event.tags,
      component: 'edge',
    };
    
    return event;
  },
});
