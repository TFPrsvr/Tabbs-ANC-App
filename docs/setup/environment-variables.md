# Environment Variables Setup Guide

## 🚀 Quick Setup Checklist

- [ ] Database (Neon PostgreSQL) - **Required**
- [ ] Authentication (Clerk) - **Required**
- [ ] Payments (Stripe) - **Required for subscriptions**
- [ ] File Storage - **Optional for large files**
- [ ] Analytics - **Optional**

## 🏗️ Core Environment Variables

### **Database (Neon PostgreSQL)**
```bash
DATABASE_URL="postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/dbname"
```

**How to get:**
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project or use existing
3. Copy connection string from Dashboard
4. Make sure database is set up with required tables

### **Authentication (Clerk)**
```bash
# Public key - safe to expose to browser
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxxxxxx"

# Secret key - keep private, never expose to browser
CLERK_SECRET_KEY="sk_test_xxxxxxxxx"

# Redirect URLs after auth
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
```

**How to get:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Get keys from "API Keys" section
4. Set up redirect URLs in "Paths" section

### **Payments (Stripe)**
```bash
# Secret key - keep private
STRIPE_SECRET_KEY="sk_test_xxxxxxxxx" # Use sk_live_ for production

# Publishable key - safe to expose
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxxxxxxx" # Use pk_live_ for production

# Webhook secret - for payment notifications
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxx"
```

**How to get:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get API keys from "Developers > API keys"
3. Set up webhook endpoint for payments
4. Copy webhook signing secret

## 🎬 Video Processing (Phase 2)

### **File Storage (Optional)**

**Option 1: Vercel Blob (Recommended)**
```bash
BLOB_READ_WRITE_TOKEN="vercel_blob_xxxxxxxxx"
```

**Option 2: AWS S3**
```bash
AWS_ACCESS_KEY_ID="AKIAXXXXXXXXXXXXXXXX"
AWS_SECRET_ACCESS_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="your-audio-files-bucket"
```

## 📱 PWA & Analytics (Phase 3)

### **Push Notifications (Optional)**
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="xxxxxxxxx"
VAPID_PRIVATE_KEY="xxxxxxxxx"
```

### **Analytics (Optional)**
```bash
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="GA-xxxxxxxxx"
NEXT_PUBLIC_POSTHOG_KEY="phc_xxxxxxxxx"
```

## 🌍 Deployment Environment Variables

### **Production URLs**
```bash
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
NEXTAUTH_URL="https://your-app.vercel.app"
NODE_ENV="production"
```

## 📁 File Structure

Create these environment files:

### **.env.local** (Development - Never commit)
```bash
# Development environment - add to .gitignore
DATABASE_URL="postgresql://dev_user:dev_pass@localhost:5432/anc_dev"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dev_key_here"
CLERK_SECRET_KEY="sk_test_dev_key_here"
STRIPE_SECRET_KEY="sk_test_dev_key_here"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_dev_key_here"
STRIPE_WEBHOOK_SECRET="whsec_dev_secret_here"
```

### **.env.example** (Template - Commit this)
```bash
# Copy this to .env.local and fill in real values
DATABASE_URL="[GET_FROM_NEON_CONSOLE]"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="[GET_FROM_CLERK_DASHBOARD]"
CLERK_SECRET_KEY="[GET_FROM_CLERK_DASHBOARD]"
STRIPE_SECRET_KEY="[GET_FROM_STRIPE_DASHBOARD]"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="[GET_FROM_STRIPE_DASHBOARD]"
STRIPE_WEBHOOK_SECRET="[GET_FROM_STRIPE_WEBHOOKS]"
```

### **Vercel Dashboard** (Production)
Set these in your Vercel project settings:
- Go to Project Settings > Environment Variables
- Add all production keys there
- Never commit production keys to git

## 🔧 Environment-Specific Configurations

### **Development**
- Use test/development keys from all services
- Database can be local PostgreSQL or Neon development instance
- Stripe webhook can use Stripe CLI for local testing

### **Production (Vercel)**
- Use production keys from all services
- Set environment variables in Vercel Dashboard
- Ensure all URLs point to production domain
- Enable database connection pooling

### **Local Testing**
```bash
# Test database connection
npm run db:test

# Test Clerk authentication
npm run auth:test

# Test Stripe payments
npm run payments:test
```

## ⚠️ Security Best Practices

### **Never Commit Secrets**
- Add `.env.local` to `.gitignore`
- Use `.env.example` as template
- Rotate keys regularly

### **Environment Variable Prefixes**
- `NEXT_PUBLIC_*` - Safe for browser (client-side)
- No prefix - Server-side only (sensitive data)

### **Validation**
The app automatically validates required environment variables on startup and provides helpful error messages if any are missing.

## 🐛 Troubleshooting

### **Database Connection Issues**
- Verify DATABASE_URL format
- Check IP allowlisting in Neon
- Ensure database tables are created

### **Authentication Issues**
- Verify Clerk keys are correct
- Check redirect URLs match exactly
- Ensure domain is added to Clerk allowlist

### **Payment Issues**
- Verify Stripe keys match environment (test vs live)
- Check webhook endpoint is accessible
- Test webhook secret is current

### **Build Issues**
- Missing environment variables cause build failures
- The app now gracefully handles missing DATABASE_URL during build
- Set all `NEXT_PUBLIC_*` variables for successful builds

## 📞 Getting Help

- **Database Issues**: [Neon Documentation](https://neon.tech/docs/)
- **Auth Issues**: [Clerk Documentation](https://clerk.com/docs)
- **Payment Issues**: [Stripe Documentation](https://stripe.com/docs)
- **Deployment Issues**: [Vercel Documentation](https://vercel.com/docs)