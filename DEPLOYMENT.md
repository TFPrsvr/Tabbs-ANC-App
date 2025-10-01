# Deployment Guide for ANC Audio Pro

## Vercel Production Environment Variables

Before deploying to production, ensure these environment variables are set in Vercel:

### Required Environment Variables

1. **Clerk Authentication** (Production Keys)
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
   CLERK_SECRET_KEY=sk_live_xxxxx
   ```
   Get these from: https://dashboard.clerk.com → Your App → API Keys → Production

2. **Database** (Neon PostgreSQL)
   ```
   DATABASE_URL=postgresql://...
   ```

3. **Payment Processing** (Stripe)
   ```
   STRIPE_SECRET_KEY=sk_live_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

4. **API Keys** (if applicable)
   ```
   OPENAI_API_KEY=sk-xxxxx
   REPLICATE_API_KEY=r8_xxxxx
   ```

## Setting Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for:
   - Production
   - Preview (optional, can use development keys)
   - Development (optional, use .env.local)

## Current Deployment Status

✅ **Working:**
- Service Worker installation
- Background sync support
- Push notifications support
- Next.js 14 build process
- Middleware removed (auth handled in layouts)
- Custom icon integration
- Clerk branding configured

⚠️ **Warnings (Non-blocking):**
- CSS MIME type warning (known Next.js 14 issue, doesn't affect functionality)
- Clerk development keys (replace with production keys in Vercel)

## Build Command

```bash
npm run build
```

## Deployment Checklist

- [ ] Set production Clerk keys in Vercel
- [ ] Set production database URL
- [ ] Set production Stripe keys
- [ ] Configure custom domain (if needed)
- [ ] Test authentication flow
- [ ] Test audio recording/processing
- [ ] Test voice memo functionality
- [ ] Verify PWA installation
- [ ] Test on mobile devices

## Domain Configuration

If using a custom domain:
1. Add domain in Vercel → Settings → Domains
2. Update DNS records as instructed
3. SSL certificate auto-configured by Vercel

## Post-Deployment Testing

1. Visit production URL
2. Test sign-up flow (should show "ANC Audio Pro" branding)
3. Test audio upload and processing
4. Test voice memo recording
5. Check service worker in DevTools → Application
6. Test PWA installation (Add to Home Screen)

## Troubleshooting

### Build Failures
- Check build logs in Vercel deployment details
- Verify all environment variables are set
- Ensure Node.js version matches package.json engines

### Authentication Issues
- Verify Clerk production keys are correct
- Check allowed domains in Clerk dashboard
- Ensure redirect URLs include your production domain

### Performance
- Monitor with Vercel Analytics
- Check Core Web Vitals in Vercel Speed Insights
- Use Lighthouse for performance audits
