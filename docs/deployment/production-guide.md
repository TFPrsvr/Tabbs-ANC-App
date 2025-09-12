# Production Deployment Guide - ANC Audio Pro

## 🚀 Deployment Checklist

### Pre-Deployment Requirements
- [x] All dependencies installed and resolved
- [x] Build passes without errors
- [x] PWA manifest and service worker configured
- [x] Environment variables documented
- [x] Production optimizations implemented
- [x] Store assets generated

### Environment Setup

#### Required Environment Variables
```bash
# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://xxx:xxx@xxx.neon.tech/xxx?sslmode=require
DIRECT_URL=postgresql://xxx:xxx@xxx.neon.tech/xxx?sslmode=require

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## Vercel Deployment

### 1. Connect Repository
```bash
# Install Vercel CLI
npm i -g vercel

# Connect project
vercel

# Follow prompts:
# - Link to existing project? N
# - What's your project's name? anc-audio-pro
# - In which directory is your code located? ./
# - Want to modify these settings? N
```

### 2. Configure Environment Variables
```bash
# Production environment variables
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add DATABASE_URL production
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add NEXT_PUBLIC_APP_URL production
```

### 3. Deploy to Production
```bash
# Deploy to production
vercel --prod

# Custom domain setup
vercel domains add your-domain.com
vercel domains add www.your-domain.com
```

## Alternative: Netlify Deployment

### 1. Build Settings
```toml
# netlify.toml
[build]
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_ENV = "production"
  NEXT_TELEMETRY_DISABLED = "1"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Content-Type = "text/javascript"
    Service-Worker-Allowed = "/"
    Cache-Control = "no-cache, no-store, must-revalidate"

[[headers]]
  for = "/icons/*"
  [headers.values]
    Cache-Control = "public, max-age=2592000"

[[redirects]]
  from = "/browserconfig.xml"
  to = "/browserconfig.xml"
  status = 200
```

## Performance Monitoring

### 1. Web Vitals Setup
```typescript
// pages/_app.tsx or app/layout.tsx
import { reportWebVitals } from 'next/web-vitals'

export function reportWebVitals(metric) {
  // Send to analytics service
  console.log(metric)
}
```

### 2. Error Tracking
```bash
# Install Sentry (optional)
npm install @sentry/nextjs

# Configure sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## PWA Configuration Verification

### 1. Lighthouse Audit
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >95
- PWA: >90

### 2. PWA Checklist
- [x] Web App Manifest configured
- [x] Service Worker registered
- [x] HTTPS enabled
- [x] Responsive design
- [x] Offline functionality
- [x] Install prompt

### 3. Test Installation
1. Open app in Chrome mobile
2. Look for "Add to Home Screen" prompt
3. Test offline functionality
4. Verify push notifications (if implemented)

## Database Migration (Production)

### 1. Run Migrations
```sql
-- Ensure all tables exist in production
-- Run from Neon console or via migration tool

-- Users table (managed by Clerk)
-- Audio files table
CREATE TABLE IF NOT EXISTS user_audio_files (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_format VARCHAR(50),
  file_size BIGINT,
  duration DECIMAL(10,2),
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_audio_files_user_id ON user_audio_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audio_files_created_at ON user_audio_files(created_at);
```

### 2. Test Database Connection
```bash
# Test connection
npm run build
# Should build without database connection errors
```

## Security Checklist

### 1. Headers Configuration
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff  
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Permissions-Policy configured
- [x] Content Security Policy (optional)

### 2. API Security
- [x] Rate limiting implemented
- [x] Input validation
- [x] Authentication required for sensitive endpoints
- [x] CORS properly configured

### 3. Client Security
- [x] No sensitive data in client bundle
- [x] Environment variables properly scoped
- [x] Service Worker secure implementation

## Testing in Production

### 1. Smoke Tests
```bash
# Test critical paths
- [ ] Home page loads
- [ ] Sign-in/sign-up flow works
- [ ] File upload functionality  
- [ ] Audio processing pipeline
- [ ] PWA installation
- [ ] Offline functionality
- [ ] Payment flow (if implemented)
```

### 2. Mobile Testing
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Tablet responsiveness
- [ ] Touch gestures work
- [ ] Performance on low-end devices

### 3. PWA Testing
- [ ] App installs correctly
- [ ] Offline mode functions
- [ ] Service Worker caches properly
- [ ] Push notifications work
- [ ] App shortcuts function

## Monitoring & Maintenance

### 1. Analytics Setup
```javascript
// Google Analytics 4
gtag('config', 'GA_MEASUREMENT_ID');

// Key events to track:
// - file_upload
// - audio_processing_complete
// - pwa_install
// - premium_conversion
```

### 2. Performance Monitoring
- Server response times
- Database query performance
- Client-side bundle sizes
- Web Vitals scores
- Error rates

### 3. User Feedback
- In-app feedback system
- App store reviews monitoring
- Support ticket tracking
- Feature request collection

## Rollback Plan

### 1. Quick Rollback
```bash
# Revert to previous deployment
vercel --prod --confirm

# Or rollback specific deployment
vercel rollback [deployment-url] --prod
```

### 2. Database Rollback
- Keep database migrations backward compatible
- Maintain backups before major changes
- Test rollback procedures in staging

## Launch Strategy

### 1. Soft Launch
- Deploy to staging environment
- Internal testing and feedback
- Limited beta user access
- Monitor performance and errors

### 2. Production Launch  
- Deploy to production domain
- Monitor key metrics closely
- Gradual traffic increase
- Be ready for quick fixes

### 3. Post-Launch
- Monitor user feedback
- Track conversion metrics
- Optimize based on real usage data
- Plan feature updates

## Success Metrics

### Technical Metrics
- Page load time: <3 seconds
- Time to Interactive: <5 seconds
- First Contentful Paint: <2 seconds
- Cumulative Layout Shift: <0.1
- Error rate: <1%

### Business Metrics  
- User acquisition rate
- Conversion to premium
- User retention rates
- App store ratings
- Feature usage analytics

## Support & Maintenance

### 1. Issue Response
- Critical bugs: <2 hours
- Major bugs: <24 hours  
- Minor issues: <1 week
- Feature requests: Monthly review

### 2. Update Schedule
- Security updates: Immediate
- Bug fixes: Weekly
- Feature updates: Bi-weekly
- Major releases: Monthly

### 3. Backup Strategy
- Database backups: Daily
- Code repository: Git-based
- Asset backups: CDN redundancy
- Configuration backups: Weekly

---

## Final Pre-Launch Checklist

- [ ] All environment variables set in production
- [ ] SSL certificate active and verified
- [ ] Domain configured and working
- [ ] Database connected and migrated
- [ ] Payment processing configured (if applicable)
- [ ] PWA features tested and working
- [ ] Mobile responsiveness verified
- [ ] Performance optimized and tested
- [ ] Error monitoring configured
- [ ] Analytics tracking implemented
- [ ] Support system ready
- [ ] Rollback plan tested
- [ ] Team trained on production procedures

**🎉 Ready for Production Launch!**