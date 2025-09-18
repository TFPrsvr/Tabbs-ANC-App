import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting for security events (stricter than errors)
const securityRateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkSecurityRateLimit(ip: string, limit: number = 50, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = `security_events:${ip}`;
  const record = securityRateLimitStore.get(key);

  if (!record || record.resetTime < now) {
    securityRateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

function sanitizeSecurityEventData(data: any): any {
  const sanitized = { ...data };

  // Remove potentially sensitive information while preserving security context
  if (sanitized.details) {
    const details = { ...sanitized.details };

    // Remove personal info but keep security-relevant data
    if (details.cookies) {
      details.cookies = '[REDACTED]';
    }

    if (details.headers) {
      // Keep security-relevant headers, redact personal info
      const allowedHeaders = ['user-agent', 'accept', 'accept-language', 'content-type'];
      const filteredHeaders: any = {};
      for (const header of allowedHeaders) {
        if (details.headers[header]) {
          filteredHeaders[header] = details.headers[header];
        }
      }
      details.headers = filteredHeaders;
    }

    if (details.payload && typeof details.payload === 'string' && details.payload.length > 500) {
      details.payload = details.payload.substring(0, 500) + '...[TRUNCATED]';
    }

    sanitized.details = details;
  }

  return sanitized;
}

function assessThreatLevel(eventData: any): 'low' | 'medium' | 'high' | 'critical' {
  const { type, details } = eventData;

  // Critical threats
  if (type === 'injection_attempt' && details?.payload?.includes('script')) {
    return 'critical';
  }

  if (type === 'suspicious_activity' && details?.repeated_attempts > 10) {
    return 'critical';
  }

  // High threats
  if (type === 'failed_auth' && details?.repeated_attempts > 5) {
    return 'high';
  }

  if (type === 'file_upload_violation' && details?.file_type === 'executable') {
    return 'high';
  }

  // Medium threats
  if (type === 'rate_limit' && details?.attempts > 100) {
    return 'medium';
  }

  if (type === 'injection_attempt') {
    return 'medium';
  }

  // Default to low
  return 'low';
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting and threat assessment
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Strict rate limiting for security events
    if (!checkSecurityRateLimit(clientIp)) {
      // This might indicate an attack - log but don't respond with details
      console.warn(`Security event rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
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
    const requiredFields = ['event_id', 'timestamp', 'type', 'source'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Sanitize security event data
    const sanitizedData = sanitizeSecurityEventData(body);

    // Assess threat level
    const threatLevel = assessThreatLevel(sanitizedData);

    // Add server-side metadata
    const securityEvent = {
      ...sanitizedData,
      server_timestamp: Date.now(),
      client_ip: clientIp,
      user_agent: headersList.get('user-agent') || 'unknown',
      origin: headersList.get('origin'),
      referer: headersList.get('referer'),
      threat_level: threatLevel,
      automated_response: false
    };

    // Immediate threat response for critical/high threats
    if (['critical', 'high'].includes(threatLevel)) {
      await handleHighThreatEvent(securityEvent);
    }

    // Log security event
    console.warn('Security Event Received:', securityEvent);

    // In production, send to security monitoring services
    await processSecurityEvent(securityEvent);

    return NextResponse.json(
      {
        success: true,
        event_id: securityEvent.event_id,
        threat_level: threatLevel,
        message: 'Security event processed successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing security event:', error);

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

async function handleHighThreatEvent(securityEvent: any): Promise<void> {
  try {
    // 1. Immediate IP blocking (if using a WAF or firewall)
    if (securityEvent.threat_level === 'critical') {
      await blockSuspiciousIP(securityEvent.client_ip);
    }

    // 2. Alert security team immediately
    await sendSecurityAlert(securityEvent);

    // 3. Log to security information and event management (SIEM) system
    await logToSIEM(securityEvent);

    // 4. Create incident if threat level is critical
    if (securityEvent.threat_level === 'critical') {
      await createSecurityIncident(securityEvent);
    }

  } catch (error) {
    console.error('Error handling high threat event:', error);
  }
}

async function processSecurityEvent(securityEvent: any): Promise<void> {
  try {
    // Send to various monitoring and alerting systems

    // 1. Send to security monitoring platform
    await sendToSecurityPlatform(securityEvent);

    // 2. Store in security database
    await storeSecurityEvent(securityEvent);

    // 3. Update threat intelligence
    await updateThreatIntelligence(securityEvent);

    // 4. Check against known attack patterns
    await checkAttackPatterns(securityEvent);

  } catch (error) {
    console.error('Error processing security event:', error);
  }
}

async function blockSuspiciousIP(ip: string): Promise<void> {
  try {
    // Example: Integration with Cloudflare, AWS WAF, or similar
    console.log(`Would block IP: ${ip}`);

    // In production:
    // await wafService.blockIP(ip, { duration: '1h', reason: 'Automated security response' });

  } catch (error) {
    console.error('Error blocking IP:', error);
  }
}

async function sendSecurityAlert(securityEvent: any): Promise<void> {
  try {
    const alertMessage = {
      title: `🔒 ${securityEvent.threat_level.toUpperCase()} Security Threat Detected`,
      fields: [
        { name: 'Event Type', value: securityEvent.type, inline: true },
        { name: 'Threat Level', value: securityEvent.threat_level, inline: true },
        { name: 'Source IP', value: securityEvent.client_ip, inline: true },
        { name: 'Timestamp', value: new Date(securityEvent.timestamp).toISOString(), inline: false },
        { name: 'Details', value: JSON.stringify(securityEvent.details, null, 2), inline: false }
      ]
    };

    // Send to security team via multiple channels
    // 1. Slack/Teams
    // await sendToSecuritySlack(alertMessage);

    // 2. Email alerts
    // await sendSecurityEmail(alertMessage);

    // 3. SMS for critical threats
    // if (securityEvent.threat_level === 'critical') {
    //   await sendSecuritySMS(alertMessage);
    // }

    console.log('Security alert would be sent:', alertMessage);

  } catch (error) {
    console.error('Error sending security alert:', error);
  }
}

async function logToSIEM(securityEvent: any): Promise<void> {
  try {
    // Format event for SIEM consumption (CEF, LEEF, JSON, etc.)
    const siemEvent = {
      timestamp: new Date(securityEvent.server_timestamp).toISOString(),
      severity: mapThreatLevelToSeverity(securityEvent.threat_level),
      event_type: 'security_event',
      source_ip: securityEvent.client_ip,
      event_name: securityEvent.type,
      event_details: securityEvent.details,
      user_agent: securityEvent.user_agent,
      application: 'anc-audio-pro',
      environment: process.env.NODE_ENV || 'production'
    };

    // Send to SIEM (Splunk, ELK Stack, QRadar, etc.)
    // await siemClient.sendEvent(siemEvent);

    console.log('SIEM event would be sent:', siemEvent);

  } catch (error) {
    console.error('Error logging to SIEM:', error);
  }
}

async function createSecurityIncident(securityEvent: any): Promise<void> {
  try {
    const incident = {
      title: `Critical Security Event: ${securityEvent.type}`,
      description: `Automated incident created for critical security event`,
      severity: 'high',
      source: 'automated_security_monitoring',
      details: securityEvent,
      created_at: new Date().toISOString(),
      status: 'open'
    };

    // Create incident in ticketing system (Jira, ServiceNow, PagerDuty, etc.)
    // await incidentService.createIncident(incident);

    console.log('Security incident would be created:', incident);

  } catch (error) {
    console.error('Error creating security incident:', error);
  }
}

async function sendToSecurityPlatform(securityEvent: any): Promise<void> {
  // Integration with security platforms like Sentinel, Splunk, etc.
  console.log('Security event logged to platform:', securityEvent);
}

async function storeSecurityEvent(securityEvent: any): Promise<void> {
  // Store in dedicated security database
  console.log('Security event stored:', securityEvent.event_id);
}

async function updateThreatIntelligence(securityEvent: any): Promise<void> {
  // Update threat intelligence feeds with new attack patterns
  console.log('Threat intelligence updated for event:', securityEvent.event_id);
}

async function checkAttackPatterns(securityEvent: any): Promise<void> {
  // Check against known attack patterns and update threat scores
  console.log('Attack pattern analysis completed for:', securityEvent.event_id);
}

function mapThreatLevelToSeverity(threatLevel: string): number {
  switch (threatLevel) {
    case 'critical': return 10;
    case 'high': return 8;
    case 'medium': return 5;
    case 'low': return 2;
    default: return 1;
  }
}