# Production Setup Guide

This guide covers all the production optimizations and setup requirements for the photo upload site.

## 🚀 Production Optimizations Implemented

### ✅ Environment Variable Validation
- **Zod schema validation** for all environment variables
- **Type-safe access** to validated environment variables
- **Comprehensive error messages** for missing or invalid variables

### ✅ Rate Limiting
- **Redis-based rate limiting** for production environments
- **In-memory fallback** for development
- **Configurable limits** per endpoint
- **Proper HTTP headers** (X-RateLimit-Remaining, Retry-After)

### ✅ Cloudinary Webhook Integration
- **Secure webhook verification** with HMAC signature validation
- **Event handling** for upload, delete, moderation, and transformations
- **Automatic retry logic** and error handling
- **Performance monitoring** and logging

### ✅ Error Tracking with Sentry
- **Client-side error tracking** with replay sessions
- **Server-side error tracking** with performance profiling
- **Edge runtime support** for middleware errors
- **Custom error classes** with proper categorization
- **Performance monitoring** and transaction tracking

### ✅ CDN Configuration
- **Cloudinary CDN optimization** with auto-format and quality
- **Custom CDN domain support** for branded URLs
- **Responsive image generation** with multiple breakpoints
- **Modern format support** (WebP, AVIF)
- **HTTP caching headers** for optimal performance

---

## 🔧 Environment Variables Setup

### Required Variables

Create a `.env.local` file with the following variables:

```bash
# === CLOUDINARY CONFIGURATION ===
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

# === REDIS (for rate limiting in production) ===
REDIS_URL=redis://localhost:6379
# Or for cloud Redis:
# REDIS_URL=redis://username:password@hostname:port

# === SENTRY ERROR TRACKING ===
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# === APPLICATION SETTINGS ===
NODE_ENV=production
NEXTAUTH_SECRET=your-32-character-secret-key
NEXTAUTH_URL=https://your-domain.com

# === RATE LIMITING ===
UPLOAD_RATE_LIMIT_REQUESTS=10
UPLOAD_RATE_LIMIT_WINDOW_MS=60000

# === CDN (optional) ===
CDN_URL=https://cdn.your-domain.com
```

### Development vs Production

**Development (.env.local):**
- Rate limiting uses in-memory storage
- Sentry debug mode enabled
- Relaxed environment validation
- Local Redis optional

**Production (.env.production or deployment config):**
- Redis required for distributed rate limiting
- Sentry optimized for performance
- Strict environment validation
- CDN optimization enabled

---

## 🐳 Production Deployment

### Docker Deployment

1. **Create Dockerfile:**
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["npm", "start"]
```

2. **Create docker-compose.yml:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    env_file:
      - .env.production

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  redis_data:
```

### Vercel Deployment

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Environment Variables in Vercel:**
- Go to Project Settings → Environment Variables
- Add all required variables from the list above
- Set production-specific values

### AWS/Digital Ocean/Railway

1. **Build the application:**
```bash
npm run build
```

2. **Set environment variables** in your deployment platform
3. **Configure reverse proxy** (Nginx/Apache) for SSL termination
4. **Set up Redis instance** for rate limiting
5. **Configure domain and SSL certificates**

---

## 🔐 Security Configuration

### Rate Limiting Setup

1. **Redis Setup (Production):**
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo systemctl enable redis
sudo systemctl start redis

# Set Redis password (recommended)
redis-cli
> CONFIG SET requirepass "your-strong-password"
> CONFIG REWRITE
```

2. **Rate Limiting Rules:**
- Upload endpoints: 10 requests per minute per IP
- API endpoints: 100 requests per minute per IP
- Webhook endpoints: No rate limiting (internal)

### Cloudinary Webhook Security

1. **Generate webhook secret:**
```bash
openssl rand -base64 32
```

2. **Configure in Cloudinary Dashboard:**
- Go to Settings → Webhooks
- Add webhook URL: `https://your-domain.com/api/cloudinary-webhook`
- Set notification types: Upload, Delete, Eager, Moderation
- Add the generated secret

### Sentry Configuration

1. **Create Sentry Project:**
- Sign up at [sentry.io](https://sentry.io)
- Create new project (Next.js)
- Copy DSN and configuration values

2. **Upload Source Maps (CI/CD):**
```bash
# In your CI/CD pipeline
export SENTRY_AUTH_TOKEN=your-token
npm run build
```

---

## 📊 Performance Monitoring

### Cloudinary Analytics

Monitor your Cloudinary usage:
- Transformations per month
- Bandwidth usage
- Storage usage
- API call frequency

### Sentry Performance

Track application performance:
- Page load times
- API response times
- Error rates
- User sessions

### Rate Limiting Metrics

Monitor rate limiting effectiveness:
- Requests blocked per hour
- Top rate-limited IPs
- API endpoint usage patterns

---

## 🔧 Troubleshooting

### Common Issues

1. **Environment Variable Validation Errors:**
```bash
Error: Environment validation failed:
CLOUDINARY_CLOUD_NAME: String must contain at least 1 character(s)
```
**Solution:** Check `.env.local` file and ensure all variables are set

2. **Rate Limiting Not Working:**
```bash
Redis connection refused
```
**Solution:** Ensure Redis is running and REDIS_URL is correct

3. **Sentry Not Capturing Errors:**
```bash
Sentry DSN not configured
```
**Solution:** Set SENTRY_DSN environment variable

4. **Cloudinary Webhook Signature Verification Failed:**
```bash
Invalid webhook signature
```
**Solution:** Verify CLOUDINARY_WEBHOOK_SECRET matches Cloudinary dashboard

### Performance Issues

1. **Slow Image Loading:**
- Enable CDN configuration
- Use responsive image breakpoints
- Implement lazy loading
- Use modern image formats (WebP, AVIF)

2. **High Server Load:**
- Check rate limiting configuration
- Monitor Sentry performance metrics
- Optimize database queries
- Use Redis caching

3. **Upload Timeouts:**
- Increase upload timeout limits
- Implement chunked uploads for large files
- Add upload progress indicators

---

## 🚀 Optimization Checklist

- [ ] Environment variables validated and configured
- [ ] Redis configured for rate limiting
- [ ] Sentry error tracking configured
- [ ] Cloudinary webhooks configured with signature verification
- [ ] CDN domain configured (optional)
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring dashboards set up
- [ ] Load testing completed
- [ ] Security audit completed

---

## 📋 Maintenance

### Regular Tasks

1. **Weekly:**
   - Review Sentry error reports
   - Check rate limiting metrics
   - Monitor Cloudinary usage

2. **Monthly:**
   - Update dependencies
   - Review performance metrics
   - Clean up old uploaded images
   - Backup configuration

3. **Quarterly:**
   - Security audit
   - Performance optimization review
   - Cost optimization review

### Scaling Considerations

When scaling beyond single server:

1. **Multiple App Instances:**
   - Use Redis for shared rate limiting
   - Configure session storage
   - Set up load balancer

2. **Database Scaling:**
   - Implement read replicas
   - Add database connection pooling
   - Consider database clustering

3. **CDN Scaling:**
   - Configure global CDN distribution
   - Implement edge caching
   - Optimize for regional performance

---

For additional support or questions, refer to the documentation:
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Sentry Documentation](https://docs.sentry.io)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Redis Documentation](https://redis.io/documentation)
