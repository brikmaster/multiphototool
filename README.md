# 📸 Photo Upload Site

A modern, production-ready photo upload and gallery application built with Next.js, Cloudinary, and comprehensive production optimizations.

## ✨ Features

### Core Functionality
- 🖼️ **Drag & Drop Upload** - Intuitive file uploading with progress tracking
- 🎨 **Photo Gallery** - Beautiful grid layout with lightbox viewing
- ✂️ **Photo Editing** - Basic editing tools and filters
- 🔗 **Shareable Galleries** - Generate shareable URLs for photo collections
- 📱 **Responsive Design** - Works perfectly on all devices

### Production Features
- 🛡️ **Rate Limiting** - Redis-based rate limiting for production scaling
- 📊 **Error Tracking** - Sentry integration for comprehensive monitoring
- 🚀 **CDN Optimization** - Cloudinary CDN with auto-format and quality
- 🔐 **Environment Validation** - Type-safe environment variable validation
- 🔗 **Webhook Integration** - Cloudinary webhooks for real-time updates
- 📈 **Health Monitoring** - Built-in health check endpoints

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Cloudinary account
- Redis (for production)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/photo-upload-site.git
cd photo-upload-site
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Cloudinary credentials:
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 📋 Environment Variables

### Required
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

### Optional (Production)
```bash
# Redis for rate limiting
REDIS_URL=redis://localhost:6379

# Sentry for error tracking
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Cloudinary webhooks
CLOUDINARY_WEBHOOK_SECRET=your_webhook_secret

# CDN configuration
CDN_URL=https://cdn.yourdomain.com
```

See [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) for complete configuration guide.

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── cloudinary-upload/    # Upload endpoint
│   │   ├── cloudinary-list/      # List photos endpoint
│   │   ├── cloudinary-webhook/   # Webhook handler
│   │   └── health/              # Health check
│   ├── gallery/           # Gallery page
│   ├── upload/           # Upload page
│   └── edit/             # Edit page
├── components/           # React components
│   ├── CloudinaryGallery.tsx    # Gallery component
│   ├── CloudinaryUploader.tsx   # Upload component
│   ├── PhotoEditor.tsx          # Editor component
│   └── Navigation.tsx           # Navigation
├── lib/                  # Utilities and configurations
│   ├── cloudinary.ts     # Cloudinary configuration
│   ├── env.ts            # Environment validation
│   ├── error-tracking.ts # Sentry integration
│   └── rate-limiter.ts   # Rate limiting
└── types/               # TypeScript type definitions
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run type-check   # Run TypeScript checks
npm run test         # Run type-check and lint
```

### Code Quality
- **TypeScript** - Full type safety
- **ESLint** - Code linting with Next.js config
- **Tailwind CSS** - Utility-first styling
- **Environment Validation** - Runtime env validation with Zod

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy automatically

### Docker
```bash
docker build -t photo-upload-site .
docker run -p 3000:3000 photo-upload-site
```

### Manual Deployment
```bash
npm run build
npm start
```

See [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) for detailed deployment instructions.

## 📊 Monitoring & Analytics

### Included Monitoring
- **Sentry** - Error tracking and performance monitoring
- **Health Checks** - `/api/health` endpoint for load balancers
- **Rate Limiting** - Request monitoring and throttling
- **Cloudinary Analytics** - Image delivery and transformation metrics

### Performance Features
- **Automatic Image Optimization** - WebP/AVIF format conversion
- **Responsive Images** - Multiple breakpoints and sizes
- **CDN Delivery** - Global edge caching
- **Lazy Loading** - Optimized loading with placeholders

## 🔐 Security

### Built-in Security
- **Rate Limiting** - Prevent abuse and DDoS
- **Environment Validation** - Secure configuration management
- **CSRF Protection** - Cross-site request forgery protection
- **Webhook Verification** - HMAC signature validation
- **Security Headers** - Comprehensive HTTP security headers

### Best Practices
- Environment variables for secrets
- Input validation and sanitization
- Error message sanitization
- Secure cookie configuration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 **Documentation**: Check [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/photo-upload-site/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/photo-upload-site/discussions)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Cloudinary](https://cloudinary.com/) - Image and video management
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Sentry](https://sentry.io/) - Error tracking
- [Vercel](https://vercel.com/) - Deployment platform

---

**Built with ❤️ using Next.js and Cloudinary**