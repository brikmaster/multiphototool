import * as Sentry from '@sentry/nextjs';
import { env, SENTRY_DSN, isProduction } from './src/lib/env';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: env.NODE_ENV,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: !isProduction,
  
  // Capture 100% of the transactions in development, reduce in production
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: isProduction ? 0.1 : 0.1,
  
  integrations: [
    new Sentry.Replay({
      // Capture 10% of all sessions in production
      sessionSampleRate: isProduction ? 0.1 : 0.1,
      // Capture 100% of sessions with an error
      errorSampleRate: 1.0,
    }),
  ],
  
  beforeSend(event, hint) {
    // Filter out some errors in production
    if (isProduction) {
      // Don't send network errors that are likely user connection issues
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      
      // Don't send cancelled requests
      if (event.exception?.values?.[0]?.value?.includes('AbortError')) {
        return null;
      }
    }
    
    return event;
  },
  
  beforeSendTransaction(event) {
    // Sample transactions based on URL
    if (event.transaction?.includes('/api/')) {
      // Reduce API transaction sampling
      return Math.random() < 0.1 ? event : null;
    }
    
    return event;
  },
});
