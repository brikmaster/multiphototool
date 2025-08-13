// Legacy rate limiter - keeping for backward compatibility
// Use rate-limiter.ts for new implementations

import { NextRequest } from 'next/server';

export function rateLimit(config: { interval: number; uniqueTokenPerInterval: number }) {
  const tokens = new Map();
  
  return {
    async check(request: NextRequest, limit: number, identifier: string) {
      // Get IP from headers or use a fallback
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : 'anonymous';
      const key = `${identifier}:${ip}`;
      const now = Date.now();
      const windowStart = now - config.interval;
      
      const tokenCount = tokens.get(key) || [];
      const validTokens = tokenCount.filter((timestamp: number) => timestamp > windowStart);
      
      if (validTokens.length >= limit) {
        throw new Error('Rate limit exceeded');
      }
      
      validTokens.push(now);
      tokens.set(key, validTokens);
      
      return true;
    }
  };
}



