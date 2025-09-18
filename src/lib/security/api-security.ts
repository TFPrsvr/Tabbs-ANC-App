/**
 * Military-Grade API Security Middleware
 * Implements comprehensive security measures for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

// Security configuration
export const SECURITY_CONFIG = {
  MAX_REQUEST_SIZE: 50 * 1024 * 1024, // 50MB for audio files
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
  BLOCKED_COUNTRIES: [], // Add country codes to block
  REQUIRE_HTTPS: process.env.NODE_ENV === 'production',
  API_KEY_HEADER: 'X-API-Key',
  SIGNATURE_HEADER: 'X-Signature',
} as const;

// Security patterns for input validation
export const SECURITY_PATTERNS = {
  SQL_INJECTION: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /('|(\\')|(\\x27)|(\\x2D\\x2D))/gi,
    /(;|\|\||&&)/gi,
  ],
  XSS_ATTACK: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ],
  PATH_TRAVERSAL: [
    /\.\./g,
    /\/etc\/passwd/gi,
    /\/windows\/system32/gi,
    /\\\.\.\\/g,
  ],
  COMMAND_INJECTION: [
    /[;&|`$(){}[\]]/g,
    /\b(rm|del|format|cat|type|net|ping|wget|curl)\b/gi,
  ],
} as const;

// Rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

interface SecurityContext {
  ip: string;
  userAgent: string;
  origin?: string;
  userId?: string;
  isAdmin: boolean;
  requestId: string;
}

/**
 * Extract client IP address with proxy support
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0]?.trim() ?? 'unknown';
  }

  return cfIP || realIP || 'unknown';
}

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Check rate limiting for IP address
 */
export function checkRateLimit(ip: string, maxRequests: number = SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE): boolean {
  const now = Date.now();
  const windowDuration = 60 * 1000; // 1 minute

  const key = `${ip}:${Math.floor(now / windowDuration)}`;
  const current = rateLimitStore.get(key);

  if (!current) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

/**
 * Detect malicious patterns in input
 */
export function detectMaliciousContent(input: string): { isMalicious: boolean; patterns: string[] } {
  const foundPatterns: string[] = [];

  // Check all security patterns
  Object.entries(SECURITY_PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach(pattern => {
      if (pattern.test(input)) {
        foundPatterns.push(category);
      }
    });
  });

  return {
    isMalicious: foundPatterns.length > 0,
    patterns: foundPatterns,
  };
}

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate request origin
 */
export function validateOrigin(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true;

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) return false;

  const allowedOrigins = [
    `https://${host}`,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean);

  return allowedOrigins.includes(origin);
}

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string,
  context: Partial<SecurityContext>,
  details?: any
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    requestId: context.requestId,
    ip: context.ip,
    userAgent: context.userAgent,
    userId: context.userId,
    details,
    severity: event.includes('BLOCKED') ? 'HIGH' : 'MEDIUM',
  };

  console.warn(`[SECURITY] ${event}:`, JSON.stringify(logEntry, null, 2));

  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with security monitoring (e.g., Sentry, DataDog)
  }
}

/**
 * Main API security middleware
 */
export async function apiSecurityMiddleware(request: NextRequest): Promise<{
  isAllowed: boolean;
  response?: NextResponse;
  context: SecurityContext;
}> {
  const requestId = generateRequestId();
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const origin = request.headers.get('origin') || undefined;

  // Get authentication context
  const { userId, sessionClaims } = await auth();
  const isAdmin = (sessionClaims?.metadata as any)?.role === 'admin';

  const context: SecurityContext = {
    ip,
    userAgent,
    origin,
    userId: userId || undefined,
    isAdmin,
    requestId,
  };

  try {
    // Security Check 1: HTTPS enforcement
    if (SECURITY_CONFIG.REQUIRE_HTTPS && request.nextUrl.protocol !== 'https:') {
      logSecurityEvent('HTTPS_VIOLATION', context);
      return {
        isAllowed: false,
        response: NextResponse.json(
          { error: 'HTTPS required', requestId },
          {
            status: 400,
            headers: { 'X-Security-Block': 'https-required' }
          }
        ),
        context,
      };
    }

    // Security Check 2: Origin validation
    if (!validateOrigin(request)) {
      logSecurityEvent('INVALID_ORIGIN', context, { origin });
      return {
        isAllowed: false,
        response: NextResponse.json(
          { error: 'Invalid origin', requestId },
          {
            status: 403,
            headers: { 'X-Security-Block': 'invalid-origin' }
          }
        ),
        context,
      };
    }

    // Security Check 3: Rate limiting
    if (!checkRateLimit(ip)) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', context);
      return {
        isAllowed: false,
        response: NextResponse.json(
          { error: 'Rate limit exceeded', requestId },
          {
            status: 429,
            headers: {
              'X-Security-Block': 'rate-limit',
              'Retry-After': '60',
            }
          }
        ),
        context,
      };
    }

    // Security Check 4: Request size validation
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
      logSecurityEvent('REQUEST_TOO_LARGE', context, { size: contentLength });
      return {
        isAllowed: false,
        response: NextResponse.json(
          { error: 'Request too large', requestId },
          {
            status: 413,
            headers: { 'X-Security-Block': 'size-limit' }
          }
        ),
        context,
      };
    }

    // Security Check 5: Malicious content detection in URL
    const urlCheck = detectMaliciousContent(request.url);
    if (urlCheck.isMalicious) {
      logSecurityEvent('MALICIOUS_URL_DETECTED', context, { patterns: urlCheck.patterns });
      return {
        isAllowed: false,
        response: NextResponse.json(
          { error: 'Malicious content detected', requestId },
          {
            status: 403,
            headers: { 'X-Security-Block': 'malicious-content' }
          }
        ),
        context,
      };
    }

    // Security Check 6: User agent validation (basic bot detection)
    const suspiciousBots = /curl|wget|python|scrapy|bot|crawler|spider/i;
    if (suspiciousBots.test(userAgent)) {
      logSecurityEvent('SUSPICIOUS_USER_AGENT', context, { userAgent });
      return {
        isAllowed: false,
        response: NextResponse.json(
          { error: 'Access denied', requestId },
          {
            status: 403,
            headers: { 'X-Security-Block': 'suspicious-agent' }
          }
        ),
        context,
      };
    }

    logSecurityEvent('REQUEST_ALLOWED', context);
    return { isAllowed: true, context };

  } catch (error) {
    logSecurityEvent('SECURITY_MIDDLEWARE_ERROR', context, { error: error instanceof Error ? error.message : String(error) });
    return {
      isAllowed: false,
      response: NextResponse.json(
        { error: 'Security validation failed', requestId },
        {
          status: 500,
          headers: { 'X-Security-Block': 'validation-error' }
        }
      ),
      context,
    };
  }
}

/**
 * Wrapper function for API routes
 */
export function withApiSecurity<T extends any[]>(
  handler: (request: NextRequest, context: SecurityContext, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const securityResult = await apiSecurityMiddleware(request);

    if (!securityResult.isAllowed) {
      return securityResult.response!;
    }

    // Add security headers to response
    const response = await handler(request, securityResult.context, ...args);

    // Add security headers
    response.headers.set('X-Request-ID', securityResult.context.requestId);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Cache-Control', 'private, no-cache');

    return response;
  };
}