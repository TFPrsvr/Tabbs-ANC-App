import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = `error_reports:${ip}`;
  const record = rateLimitStore.get(key);

  if (!record || record.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

function sanitizeErrorData(data: any): any {
  const sanitized = { ...data };

  // Remove potentially sensitive information
  if (sanitized.stack) {
    // Keep stack trace but remove local file paths
    sanitized.stack = sanitized.stack.replace(/file:\/\/\/[^\s)]+/g, '[local-file]');
  }

  if (sanitized.url) {
    try {
      const url = new URL(sanitized.url);
      sanitized.url = `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      sanitized.url = '[invalid-url]';
    }
  }

  // Limit string lengths
  if (typeof sanitized.message === 'string' && sanitized.message.length > 1000) {
    sanitized.message = sanitized.message.substring(0, 1000) + '...';
  }

  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many error reports from this IP' },
        { status: 429 }
      );
    }

    // Validate request body
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ['error_id', 'timestamp', 'severity', 'type', 'message'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Sanitize error data
    const sanitizedData = sanitizeErrorData(body);

    // Add server-side metadata
    const errorReport = {
      ...sanitizedData,
      server_timestamp: Date.now(),
      client_ip: clientIp,
      user_agent: headersList.get('user-agent') || 'unknown',
      origin: headersList.get('origin'),
      referer: headersList.get('referer')
    };

    // In production, this would be sent to your monitoring service
    // Examples: Sentry, DataDog, New Relic, CloudWatch, etc.

    // For now, log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report Received:', errorReport);
    }

    // Example integration points:

    // 1. Send to Sentry
    // await sendToSentry(errorReport);

    // 2. Send to DataDog
    // await sendToDataDog(errorReport);

    // 3. Store in database
    // await storeInDatabase(errorReport);

    // 4. Send email alert for critical errors
    // if (errorReport.severity === 'critical') {
    //   await sendEmailAlert(errorReport);
    // }

    // 5. Send to Slack webhook for high-severity errors
    // if (['critical', 'high'].includes(errorReport.severity)) {
    //   await sendToSlack(errorReport);
    // }

    return NextResponse.json(
      {
        success: true,
        error_id: errorReport.error_id,
        message: 'Error report received successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing error report:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

// Example helper functions for external integrations

async function sendToSentry(errorReport: any): Promise<void> {
  // Example Sentry integration
  try {
    // const Sentry = require('@sentry/node');
    // Sentry.captureException(new Error(errorReport.message), {
    //   tags: {
    //     severity: errorReport.severity,
    //     type: errorReport.type,
    //     environment: errorReport.environment
    //   },
    //   extra: errorReport
    // });
  } catch (error) {
    console.error('Failed to send to Sentry:', error);
  }
}

async function sendToSlack(errorReport: any): Promise<void> {
  // Example Slack webhook integration
  try {
    const webhookUrl = process.env.SLACK_ERROR_WEBHOOK_URL;
    if (!webhookUrl) return;

    const message = {
      text: `🚨 ${errorReport.severity.toUpperCase()} Error Detected`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error:* ${errorReport.message}\n*Type:* ${errorReport.type}\n*Environment:* ${errorReport.environment}\n*Time:* ${new Date(errorReport.timestamp).toISOString()}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error ID:* ${errorReport.error_id}\n*User Agent:* ${errorReport.user_agent}`
          }
        }
      ]
    };

    // await fetch(webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(message)
    // });
  } catch (error) {
    console.error('Failed to send to Slack:', error);
  }
}

async function sendEmailAlert(errorReport: any): Promise<void> {
  // Example email alert for critical errors
  try {
    // Using a service like SendGrid, Mailgun, or AWS SES
    // const emailService = new EmailService();
    // await emailService.send({
    //   to: process.env.ADMIN_EMAIL,
    //   subject: `CRITICAL ERROR: ${errorReport.message}`,
    //   html: generateErrorEmailTemplate(errorReport)
    // });
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
}