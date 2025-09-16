import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Military-grade security configuration
const SECURITY_CONFIG = {
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB limit
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX: 100, // requests per window
  SUSPICIOUS_PATTERNS: [
    /\.\./g,           // Path traversal
    /<script/gi,       // XSS attempts
    /union.*select/gi, // SQL injection
    /javascript:/gi,   // JS injection
    /data:text\/html/gi, // Data URI XSS
  ],
  BLOCKED_USER_AGENTS: [
    /bot/i,
    /crawler/i,
    /scraper/i,
    /spider/i,
  ],
};

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map();

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/upload(.*)',
  '/processing(.*)',
  '/settings(.*)',
  '/profile(.*)',
  '/api/audio(.*)',
  '/api/auth/sync-user(.*)',
  '/api/auth/check-limits(.*)',
  '/api/user(.*)',
  '/api/payments(.*)',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isPublicApiRoute = createRouteMatcher(['/api/health', '/api/webhooks(.*)']);

// Security utility functions
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIP || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }

  const requests = rateLimitStore.get(ip).filter((time: number) => time > windowStart);

  if (requests.length >= SECURITY_CONFIG.RATE_LIMIT_MAX) {
    return false; // Rate limited
  }

  requests.push(now);
  rateLimitStore.set(ip, requests);
  return true;
}

function detectSuspiciousContent(url: string, userAgent?: string): boolean {
  // Check for malicious patterns
  for (const pattern of SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }

  // Check for blocked user agents
  if (userAgent) {
    for (const pattern of SECURITY_CONFIG.BLOCKED_USER_AGENTS) {
      if (pattern.test(userAgent)) {
        return true;
      }
    }
  }

  return false;
}

export default clerkMiddleware(async (auth, req) => {
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || '';
  const url = req.url;

  // SECURITY LAYER 1: Rate limiting
  if (!isPublicApiRoute(req) && !checkRateLimit(clientIP)) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new NextResponse('Rate limit exceeded', {
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-Security-Block': 'rate-limit'
      }
    });
  }

  // SECURITY LAYER 2: Suspicious content detection
  if (detectSuspiciousContent(url, userAgent)) {
    console.warn(`Suspicious request detected from IP: ${clientIP}, URL: ${url}`);
    return new NextResponse('Forbidden', {
      status: 403,
      headers: {
        'X-Security-Block': 'suspicious-content'
      }
    });
  }

  // SECURITY LAYER 3: Request size validation
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
    console.warn(`Request too large from IP: ${clientIP}, Size: ${contentLength}`);
    return new NextResponse('Request too large', {
      status: 413,
      headers: {
        'X-Security-Block': 'size-limit'
      }
    });
  }

  const { userId, sessionClaims } = await auth();

  // SECURITY LAYER 4: Authentication & Authorization
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // SECURITY LAYER 5: Admin route protection with enhanced logging
  if (isAdminRoute(req)) {
    const isAdmin = (sessionClaims?.metadata as any)?.role === 'admin';
    if (!isAdmin) {
      console.warn(`Unauthorized admin access attempt from user: ${userId}, IP: ${clientIP}`);
      const url = new URL('/', req.url);
      return NextResponse.redirect(url);
    }
    console.log(`Admin access granted to user: ${userId}, IP: ${clientIP}`);
  }

  // SECURITY LAYER 6: Session management
  if (userId && (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Add security headers to response
  const response = NextResponse.next();

  // Military-grade security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};