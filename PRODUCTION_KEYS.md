# Switching to Production Mode

## Why "Development Mode" Shows at Bottom of Sign-In

You're currently using **Clerk Development Keys**. This is why you see "Secured by Clerk • Development mode" at the bottom of the sign-in page.

## How to Switch to Production Keys

### 1. Get Production Keys from Clerk

1. Go to https://dashboard.clerk.com
2. Select your **ANC Audio Pro** application
3. Go to **API Keys** in the sidebar
4. Switch from "Development" to "Production" at the top
5. Copy your production keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_`)

### 2. Add Keys to Vercel

1. Go to https://vercel.com
2. Select your **anc-audio-app** project
3. Go to **Settings** → **Environment Variables**
4. Add these variables for **Production** environment:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
   CLERK_SECRET_KEY=sk_live_xxxxx
   ```
5. Click **Save**

### 3. Redeploy

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Redeploy** button
4. Select **Use existing Build Cache** if available

### 4. Verify

After redeployment:
- "Development mode" text will disappear from sign-in page
- Full production features enabled
- No usage limits from development mode

## Other Production Environment Variables

While you're in Vercel environment variables, also ensure you have:

- `DATABASE_URL` - Your Neon PostgreSQL production URL
- `STRIPE_SECRET_KEY` - Stripe production key (if using payments)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key

## Development vs Production Keys

| Feature | Development | Production |
|---------|-------------|------------|
| Usage Limits | Yes (strict) | No |
| Footer Badge | Shows "Development mode" | Hidden |
| Test Mode | Yes | No |
| Real Users | No | Yes |

## Important Notes

- ⚠️ **Never commit** production keys to Git
- ✅ **Always use** environment variables in Vercel
- 🔒 **Keep** development and production keys separate
- 📊 **Monitor** usage in Clerk dashboard after switching
