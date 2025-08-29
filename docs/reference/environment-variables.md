# ℹ️ Environment Variables Reference

## 🔐 Configuration Overview

Complete reference for environment variables used in ANC Audio Pro. All variables should be stored in `.env.local` for security.

---

## 🗄️ Database Configuration

### Neon Database (Required)
```bash
# Primary database connection string
DATABASE_URL="postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/anc_audio_db?sslmode=require"

# Direct connection (for migrations)
DIRECT_URL="postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/anc_audio_db?sslmode=require"

# Connection pool settings (optional)
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5
DATABASE_CONNECTION_TIMEOUT=60000
```

**Where to find**:
- **Host**: Neon Dashboard → Connection Details
- **Credentials**: Generated during project creation
- **SSL Mode**: Always required (automatically enforced)

---

## 🔐 Authentication Configuration

### Clerk Authentication (Required)
```bash
# Public key (safe to expose in client-side code)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"

# Secret key (server-side only)
CLERK_SECRET_KEY="sk_test_xxx"

# Webhook signing secret (for user sync)
CLERK_WEBHOOK_SECRET="whsec_xxx"
```

**Where to find**:
- **Clerk Dashboard** → API Keys
- **Publishable Key**: Safe for client-side use
- **Secret Key**: Server-side operations only
- **Webhook Secret**: Webhooks → Create Endpoint

---

## 💳 Payment Configuration

### Stripe Integration (Required)
```bash
# Public key (safe to expose in client-side code)  
STRIPE_PUBLIC_KEY="pk_test_xxx"

# Secret key (server-side only)
STRIPE_SECRET_KEY="sk_test_xxx"

# Webhook endpoint secret
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# Product/Price IDs
STRIPE_PRICE_FREE="price_xxx"
STRIPE_PRICE_PREMIUM_MONTHLY="price_xxx"
STRIPE_PRICE_PRO_MONTHLY="price_xxx"
```

**Where to find**:
- **Stripe Dashboard** → Developers → API Keys
- **Webhook Secret**: Webhooks → Select endpoint → Signing secret
- **Price IDs**: Products → Select product → Pricing

---

## 🎨 Design Integration

### Figma API (Optional)
```bash
# Figma personal access token
FIGMA_ACCESS_TOKEN="figma_token_xxx"

# File ID from Figma URL
FIGMA_FILE_ID="file_id_xxx"

# Team ID for collaboration
FIGMA_TEAM_ID="team_id_xxx"
```

**Where to find**:
- **Figma Settings** → Account → Personal Access Tokens
- **File ID**: From Figma file URL
- **Team ID**: Team settings in Figma

---

## 🚀 Deployment Configuration

### Vercel Deployment
```bash
# Automatically set by Vercel
VERCEL="1"
VERCEL_ENV="production"
VERCEL_URL="your-app.vercel.app"
VERCEL_REGION="iad1"

# Custom domain (if configured)
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Environment-Specific Settings
```bash
# Development
NODE_ENV="development"
NEXT_PUBLIC_APP_ENV="development"

# Production  
NODE_ENV="production"
NEXT_PUBLIC_APP_ENV="production"

# Staging
NODE_ENV="production"
NEXT_PUBLIC_APP_ENV="staging"
```

---

## 📊 Analytics & Monitoring

### Application Monitoring (Optional)
```bash
# Sentry error tracking
SENTRY_DSN="https://xxx@sentry.io/xxx"
SENTRY_AUTH_TOKEN="xxx"
SENTRY_ORG="your-org"
SENTRY_PROJECT="anc-audio-pro"

# PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY="phc_xxx"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

---

## 🔒 Security Configuration

### Security Headers & CORS
```bash
# CORS allowed origins (comma-separated)
CORS_ALLOWED_ORIGINS="https://your-domain.com,https://admin.your-domain.com"

# JWT secret for additional auth
JWT_SECRET="your-jwt-secret-key"

# API rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Content Security Policy
CSP_REPORT_URI="https://your-domain.com/api/csp-report"
```

### Encryption Keys
```bash
# File encryption key
FILE_ENCRYPTION_KEY="32-character-encryption-key"

# Session encryption
SESSION_SECRET="session-encryption-secret"

# Webhook verification
WEBHOOK_VERIFICATION_SECRET="webhook-secret"
```

---

## 🎵 Audio Processing

### Processing Configuration
```bash
# Maximum file size (bytes)
MAX_FILE_SIZE=104857600  # 100MB

# Maximum processing time (seconds)
MAX_PROCESSING_TIME=300  # 5 minutes

# Temporary file storage path
TEMP_STORAGE_PATH="/tmp/audio-processing"

# Audio quality settings
DEFAULT_AUDIO_QUALITY="high"
COMPRESSION_LEVEL=5
```

### AI Model Configuration
```bash
# AI model endpoints (if using external services)
AI_SEPARATION_ENDPOINT="https://api.audio-ai.com/separate"
AI_API_KEY="ai-service-api-key"

# Model quality settings
VOICE_SEPARATION_QUALITY=0.85
MUSIC_SEPARATION_QUALITY=0.80
AMBIENT_SEPARATION_QUALITY=0.75
```

---

## 📧 Email Configuration

### Transactional Email (Optional)
```bash
# SendGrid for transactional emails
SENDGRID_API_KEY="SG.xxx"
FROM_EMAIL="noreply@your-domain.com"
FROM_NAME="ANC Audio Pro"

# Email templates
WELCOME_EMAIL_TEMPLATE_ID="d-xxx"
PAYMENT_CONFIRMATION_TEMPLATE_ID="d-xxx"
PROCESSING_COMPLETE_TEMPLATE_ID="d-xxx"
```

---

## 🔧 Development Configuration

### Development Tools
```bash
# Enable debug mode
DEBUG_MODE="true"

# Verbose logging
LOG_LEVEL="debug"

# Disable authentication (development only)
DISABLE_AUTH="false"

# Mock external services
MOCK_STRIPE="false"
MOCK_AI_PROCESSING="false"

# Development database
DEV_DATABASE_URL="postgresql://dev-user:dev-pass@localhost:5432/anc_audio_dev"
```

### Testing Configuration
```bash
# Test environment
NODE_ENV="test"

# Test database
TEST_DATABASE_URL="postgresql://test-user:test-pass@localhost:5432/anc_audio_test"

# Test API keys
TEST_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
TEST_STRIPE_SECRET_KEY="sk_test_xxx"

# Test mode flags
SKIP_EMAIL_SENDING="true"
SKIP_WEBHOOK_VERIFICATION="true"
```

---

## 📋 Environment File Template

### `.env.local` Template
```bash
# ========================================
# ANC Audio Pro - Environment Variables
# ========================================

# Database (Required)
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
DIRECT_URL="postgresql://username:password@host/database?sslmode=require"

# Authentication (Required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_xxx"
CLERK_SECRET_KEY="sk_xxx"
CLERK_WEBHOOK_SECRET="whsec_xxx"

# Payments (Required)
STRIPE_PUBLIC_KEY="pk_xxx"
STRIPE_SECRET_KEY="sk_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Optional Services
FIGMA_ACCESS_TOKEN=""
SENTRY_DSN=""
NEXT_PUBLIC_POSTHOG_KEY=""

# Security
JWT_SECRET="your-secret-key"
SESSION_SECRET="session-secret"

# Processing Limits
MAX_FILE_SIZE=104857600
MAX_PROCESSING_TIME=300
```

---

## ⚠️ Security Best Practices

### Environment Variable Security
- **Never commit** `.env*` files to version control
- **Use different keys** for development, staging, and production
- **Rotate secrets** regularly (every 90 days recommended)
- **Limit access** to environment variables in production
- **Use secure storage** for production secrets (Vercel Environment Variables, etc.)

### Variable Naming Conventions
- **NEXT_PUBLIC_**: Client-side accessible (be careful with sensitive data)
- **ALL_CAPS**: Environment variables
- **DESCRIPTIVE_NAMES**: Self-documenting variable names
- **GROUP_BY_SERVICE**: Prefix with service name (STRIPE_, CLERK_, etc.)

---

*Secure configuration management for professional audio applications*