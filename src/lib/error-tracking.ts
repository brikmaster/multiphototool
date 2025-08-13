import * as Sentry from '@sentry/nextjs';
import { isProduction } from './env';

// Custom error types
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, code: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Capture the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class CloudinaryError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(`Cloudinary error: ${message}`, 'CLOUDINARY_ERROR', 500);
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

// Error tracking functions
export function captureError(error: Error, context?: Record<string, any>): void {
  // Add context to Sentry
  if (context) {
    Sentry.setContext('errorContext', context);
  }

  // Set tags based on error type
  if (error instanceof AppError) {
    Sentry.setTag('errorCode', error.code);
    Sentry.setTag('statusCode', error.statusCode.toString());
    Sentry.setTag('isOperational', error.isOperational.toString());
  }

  // Capture the error
  Sentry.captureException(error);

  // Log to console in development
  if (!isProduction) {
    console.error('Error captured:', {
      message: error.message,
      stack: error.stack,
      context,
    });
  }
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'debug' = 'info',
  context?: Record<string, any>
): void {
  if (context) {
    Sentry.setContext('messageContext', context);
  }

  Sentry.captureMessage(message, level);

  if (!isProduction) {
    console.log(`[${level.toUpperCase()}] ${message}`, context);
  }
}

// Performance tracking
export function startTransaction(name: string, operation: string = 'navigation') {
  return Sentry.startTransaction({
    name,
    op: operation,
  });
}

export function measurePerformance<T>(
  name: string,
  operation: () => T | Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const transaction = startTransaction(name, 'function');
  
  if (context) {
    transaction.setContext('performance', context);
  }

  const startTime = Date.now();

  const finish = (result?: T, error?: Error) => {
    const duration = Date.now() - startTime;
    transaction.setMeasurement('duration', duration, 'millisecond');
    
    if (error) {
      transaction.setStatus('internal_error');
      captureError(error, { ...context, duration });
    } else {
      transaction.setStatus('ok');
    }
    
    transaction.finish();
    return result;
  };

  try {
    const result = operation();
    
    if (result instanceof Promise) {
      return result
        .then(res => finish(res))
        .catch(err => {
          finish(undefined, err);
          throw err;
        });
    } else {
      return Promise.resolve(finish(result));
    }
  } catch (error) {
    finish(undefined, error as Error);
    throw error;
  }
}

// User context
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

// Clear user context (on logout)
export function clearUserContext(): void {
  Sentry.setUser(null);
}

// Add breadcrumb for debugging
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'info' | 'warning' | 'error' | 'debug' = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

// Wrapper for API route error handling
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  operation: string = 'api'
) {
  return async (...args: T): Promise<R> => {
    const transaction = startTransaction(`${operation}-${handler.name}`, 'http');
    
    try {
      const result = await handler(...args);
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      
      if (error instanceof AppError && error.isOperational) {
        // Don't capture operational errors to Sentry
        addBreadcrumb(
          `Operational error in ${handler.name}`,
          'error',
          'warning',
          { code: error.code, message: error.message }
        );
      } else {
        // Capture unexpected errors
        captureError(error as Error, {
          operation,
          handler: handler.name,
          args: JSON.stringify(args).slice(0, 1000), // Limit size
        });
      }
      
      throw error;
    } finally {
      transaction.finish();
    }
  };
}
