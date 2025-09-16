/**
 * Military-Grade Security Monitoring and Incident Response
 * Comprehensive security event tracking and alerting system
 */

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  userId?: string;
  ip: string;
  userAgent: string;
  requestId?: string;
  details: Record<string, any>;
  resolved: boolean;
  responseAction?: string;
}

export enum SecurityEventType {
  // Authentication events
  INVALID_LOGIN_ATTEMPT = 'INVALID_LOGIN_ATTEMPT',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  ACCOUNT_LOCKOUT = 'ACCOUNT_LOCKOUT',
  SUSPICIOUS_SESSION = 'SUSPICIOUS_SESSION',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',

  // Input validation events
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  COMMAND_INJECTION_ATTEMPT = 'COMMAND_INJECTION_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  MALICIOUS_FILE_UPLOAD = 'MALICIOUS_FILE_UPLOAD',

  // Network security events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DDoS_PATTERN_DETECTED = 'DDOS_PATTERN_DETECTED',
  SUSPICIOUS_REQUEST_PATTERN = 'SUSPICIOUS_REQUEST_PATTERN',
  INVALID_ORIGIN = 'INVALID_ORIGIN',
  BOT_TRAFFIC_DETECTED = 'BOT_TRAFFIC_DETECTED',

  // Data security events
  UNAUTHORIZED_DATA_ACCESS = 'UNAUTHORIZED_DATA_ACCESS',
  DATA_EXFILTRATION_ATTEMPT = 'DATA_EXFILTRATION_ATTEMPT',
  SENSITIVE_DATA_EXPOSURE = 'SENSITIVE_DATA_EXPOSURE',

  // System security events
  CONFIGURATION_TAMPERING = 'CONFIGURATION_TAMPERING',
  ENVIRONMENT_ANOMALY = 'ENVIRONMENT_ANOMALY',
  SECURITY_BYPASS_ATTEMPT = 'SECURITY_BYPASS_ATTEMPT',
}

export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Security monitoring configuration
const MONITORING_CONFIG = {
  MAX_EVENTS_MEMORY: 10000,
  ALERT_THRESHOLDS: {
    [SecuritySeverity.CRITICAL]: 1, // Alert immediately
    [SecuritySeverity.HIGH]: 3,     // Alert after 3 events in 5 minutes
    [SecuritySeverity.MEDIUM]: 10,  // Alert after 10 events in 10 minutes
    [SecuritySeverity.LOW]: 50,     // Alert after 50 events in 30 minutes
  },
  RETENTION_DAYS: 90,
  REAL_TIME_ALERTS: process.env.NODE_ENV === 'production',
} as const;

// In-memory event store (use database in production)
const securityEvents: SecurityEvent[] = [];
const alertCache = new Map<string, { count: number; firstSeen: number }>();

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get severity level for event type
 */
function getSeverityForEventType(eventType: SecurityEventType): SecuritySeverity {
  const severityMap: Record<SecurityEventType, SecuritySeverity> = {
    // Critical threats
    [SecurityEventType.SQL_INJECTION_ATTEMPT]: SecuritySeverity.CRITICAL,
    [SecurityEventType.COMMAND_INJECTION_ATTEMPT]: SecuritySeverity.CRITICAL,
    [SecurityEventType.PRIVILEGE_ESCALATION]: SecuritySeverity.CRITICAL,
    [SecurityEventType.DATA_EXFILTRATION_ATTEMPT]: SecuritySeverity.CRITICAL,
    [SecurityEventType.SENSITIVE_DATA_EXPOSURE]: SecuritySeverity.CRITICAL,

    // High severity threats
    [SecurityEventType.XSS_ATTEMPT]: SecuritySeverity.HIGH,
    [SecurityEventType.PATH_TRAVERSAL_ATTEMPT]: SecuritySeverity.HIGH,
    [SecurityEventType.BRUTE_FORCE_ATTEMPT]: SecuritySeverity.HIGH,
    [SecurityEventType.MALICIOUS_FILE_UPLOAD]: SecuritySeverity.HIGH,
    [SecurityEventType.DDoS_PATTERN_DETECTED]: SecuritySeverity.HIGH,
    [SecurityEventType.UNAUTHORIZED_DATA_ACCESS]: SecuritySeverity.HIGH,
    [SecurityEventType.SECURITY_BYPASS_ATTEMPT]: SecuritySeverity.HIGH,

    // Medium severity events
    [SecurityEventType.SUSPICIOUS_SESSION]: SecuritySeverity.MEDIUM,
    [SecurityEventType.SUSPICIOUS_REQUEST_PATTERN]: SecuritySeverity.MEDIUM,
    [SecurityEventType.BOT_TRAFFIC_DETECTED]: SecuritySeverity.MEDIUM,
    [SecurityEventType.CONFIGURATION_TAMPERING]: SecuritySeverity.MEDIUM,

    // Low severity events
    [SecurityEventType.INVALID_LOGIN_ATTEMPT]: SecuritySeverity.LOW,
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: SecuritySeverity.LOW,
    [SecurityEventType.INVALID_ORIGIN]: SecuritySeverity.LOW,
    [SecurityEventType.ACCOUNT_LOCKOUT]: SecuritySeverity.LOW,
    [SecurityEventType.ENVIRONMENT_ANOMALY]: SecuritySeverity.LOW,
  };

  return severityMap[eventType] || SecuritySeverity.MEDIUM;
}

/**
 * Log security event
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  source: string,
  context: {
    userId?: string;
    ip: string;
    userAgent: string;
    requestId?: string;
    details?: Record<string, any>;
  }
): string {
  const eventId = generateEventId();
  const timestamp = new Date().toISOString();
  const severity = getSeverityForEventType(eventType);

  const event: SecurityEvent = {
    id: eventId,
    timestamp,
    type: eventType,
    severity,
    source,
    userId: context.userId,
    ip: context.ip,
    userAgent: context.userAgent,
    requestId: context.requestId,
    details: context.details || {},
    resolved: false,
  };

  // Add to event store
  securityEvents.unshift(event);

  // Keep only recent events in memory
  if (securityEvents.length > MONITORING_CONFIG.MAX_EVENTS_MEMORY) {
    securityEvents.splice(MONITORING_CONFIG.MAX_EVENTS_MEMORY);
  }

  // Log to console with severity-based formatting
  const logLevel = severity === SecuritySeverity.CRITICAL || severity === SecuritySeverity.HIGH
    ? 'error'
    : severity === SecuritySeverity.MEDIUM
    ? 'warn'
    : 'info';

  console[logLevel](`[SECURITY:${severity}] ${eventType}:`, {
    eventId,
    timestamp,
    source,
    ip: context.ip,
    userId: context.userId || 'anonymous',
    requestId: context.requestId,
    details: context.details,
  });

  // Check for alert conditions
  checkAlertConditions(event);

  // In production, send to external monitoring
  if (process.env.NODE_ENV === 'production') {
    sendToExternalMonitoring(event);
  }

  return eventId;
}

/**
 * Check if event should trigger an alert
 */
function checkAlertConditions(event: SecurityEvent): void {
  const now = Date.now();
  const cacheKey = `${event.type}_${event.ip}`;

  if (!alertCache.has(cacheKey)) {
    alertCache.set(cacheKey, { count: 0, firstSeen: now });
  }

  const cache = alertCache.get(cacheKey)!;
  cache.count++;

  const threshold = MONITORING_CONFIG.ALERT_THRESHOLDS[event.severity];
  const timeWindow = getTimeWindowForSeverity(event.severity);

  // Check if we've exceeded the threshold within the time window
  if (cache.count >= threshold && (now - cache.firstSeen) <= timeWindow) {
    triggerSecurityAlert(event, cache.count);

    // Reset cache after alert
    alertCache.delete(cacheKey);
  }

  // Clean up old cache entries
  if ((now - cache.firstSeen) > timeWindow) {
    alertCache.delete(cacheKey);
  }
}

/**
 * Get time window in milliseconds for severity level
 */
function getTimeWindowForSeverity(severity: SecuritySeverity): number {
  switch (severity) {
    case SecuritySeverity.CRITICAL: return 60 * 1000;      // 1 minute
    case SecuritySeverity.HIGH: return 5 * 60 * 1000;      // 5 minutes
    case SecuritySeverity.MEDIUM: return 10 * 60 * 1000;   // 10 minutes
    case SecuritySeverity.LOW: return 30 * 60 * 1000;      // 30 minutes
    default: return 10 * 60 * 1000;
  }
}

/**
 * Trigger security alert
 */
function triggerSecurityAlert(event: SecurityEvent, eventCount: number): void {
  const alert = {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    type: 'SECURITY_ALERT',
    severity: event.severity,
    message: `Security alert: ${eventCount} ${event.type} events from ${event.ip}`,
    event,
    eventCount,
  };

  console.error('🚨 SECURITY ALERT TRIGGERED:', alert);

  // In production, send immediate notifications
  if (MONITORING_CONFIG.REAL_TIME_ALERTS) {
    sendSecurityAlert(alert);
  }
}

/**
 * Send alert to external systems
 */
async function sendSecurityAlert(alert: any): Promise<void> {
  try {
    // Send to Slack, email, or other alerting systems
    // Implementation depends on your preferred alerting service

    if (process.env.SECURITY_WEBHOOK_URL) {
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    }

    // Log alert sent
    console.log(`Security alert sent: ${alert.id}`);
  } catch (error) {
    console.error('Failed to send security alert:', error);
  }
}

/**
 * Send event to external monitoring service
 */
async function sendToExternalMonitoring(event: SecurityEvent): Promise<void> {
  try {
    // Send to services like Sentry, DataDog, New Relic, etc.

    if (process.env.SENTRY_DSN) {
      // Example: Send to Sentry
      // Sentry.captureException(new Error(`Security Event: ${event.type}`), {
      //   tags: { security_event: true, severity: event.severity },
      //   extra: event,
      // });
    }

    // Send to custom monitoring endpoint
    if (process.env.MONITORING_ENDPOINT) {
      await fetch(process.env.MONITORING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`,
        },
        body: JSON.stringify(event),
      });
    }
  } catch (error) {
    console.error('Failed to send event to external monitoring:', error);
  }
}

/**
 * Get security events with filtering
 */
export function getSecurityEvents(filters?: {
  severity?: SecuritySeverity;
  eventType?: SecurityEventType;
  userId?: string;
  ip?: string;
  timeRange?: { start: string; end: string };
  limit?: number;
}): SecurityEvent[] {
  let events = [...securityEvents];

  if (filters) {
    if (filters.severity) {
      events = events.filter(e => e.severity === filters.severity);
    }
    if (filters.eventType) {
      events = events.filter(e => e.type === filters.eventType);
    }
    if (filters.userId) {
      events = events.filter(e => e.userId === filters.userId);
    }
    if (filters.ip) {
      events = events.filter(e => e.ip === filters.ip);
    }
    if (filters.timeRange) {
      const start = new Date(filters.timeRange.start);
      const end = new Date(filters.timeRange.end);
      events = events.filter(e => {
        const eventTime = new Date(e.timestamp);
        return eventTime >= start && eventTime <= end;
      });
    }
  }

  return events.slice(0, filters?.limit || 100);
}

/**
 * Get security summary statistics
 */
export function getSecuritySummary(): {
  totalEvents: number;
  eventsBySeverity: Record<SecuritySeverity, number>;
  eventsByType: Record<SecurityEventType, number>;
  topThreats: { ip: string; count: number }[];
  recentCritical: SecurityEvent[];
} {
  const eventsBySeverity = {
    [SecuritySeverity.LOW]: 0,
    [SecuritySeverity.MEDIUM]: 0,
    [SecuritySeverity.HIGH]: 0,
    [SecuritySeverity.CRITICAL]: 0,
  };

  const eventsByType: Record<SecurityEventType, number> = {} as any;
  const ipCounts: Record<string, number> = {};

  for (const event of securityEvents) {
    eventsBySeverity[event.severity]++;
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
  }

  const topThreats = Object.entries(ipCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  const recentCritical = securityEvents
    .filter(e => e.severity === SecuritySeverity.CRITICAL)
    .slice(0, 5);

  return {
    totalEvents: securityEvents.length,
    eventsBySeverity,
    eventsByType,
    topThreats,
    recentCritical,
  };
}

/**
 * Mark security event as resolved
 */
export function resolveSecurityEvent(eventId: string, responseAction: string): boolean {
  const event = securityEvents.find(e => e.id === eventId);
  if (event) {
    event.resolved = true;
    event.responseAction = responseAction;
    console.log(`Security event ${eventId} resolved: ${responseAction}`);
    return true;
  }
  return false;
}

/**
 * Initialize security monitoring
 */
export function initializeSecurityMonitoring(): void {
  console.log('🛡️  Security monitoring initialized');

  if (process.env.NODE_ENV === 'production') {
    console.log('🚨 Real-time security alerts enabled');
  }
}

// Auto-initialize when imported
if (typeof window === 'undefined') {
  initializeSecurityMonitoring();
}