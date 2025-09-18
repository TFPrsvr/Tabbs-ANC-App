"use client";

// Comprehensive error monitoring system for production readiness

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorReport {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  type: 'javascript' | 'network' | 'audio' | 'security' | 'performance';
  message: string;
  stack?: string;
  url?: string;
  userAgent: string;
  sessionId: string;
  userId?: string;
  context: {
    component?: string;
    action?: string;
    metadata?: Record<string, any>;
  };
  environment: 'development' | 'staging' | 'production';
  resolved: boolean;
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'suspicious_activity' | 'failed_auth' | 'rate_limit' | 'injection_attempt' | 'file_upload_violation';
  severity: ErrorSeverity;
  source: string;
  details: Record<string, any>;
  blocked: boolean;
  userAgent: string;
  ipAddress?: string;
}

class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private errors: Map<string, ErrorReport> = new Map();
  private securityEvents: Map<string, SecurityEvent> = new Map();
  private sessionId: string;
  private environment: 'development' | 'staging' | 'production';
  private maxErrors = 1000; // Limit stored errors
  private errorCallbacks: Array<(error: ErrorReport) => void> = [];
  private securityCallbacks: Array<(event: SecurityEvent) => void> = [];

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.environment = this.detectEnvironment();
    this.initializeGlobalHandlers();
  }

  public static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectEnvironment(): 'development' | 'staging' | 'production' {
    if (typeof window === 'undefined') return 'production';

    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
    if (hostname.includes('staging') || hostname.includes('preview')) return 'staging';
    return 'production';
  }

  private initializeGlobalHandlers(): void {
    if (typeof window === 'undefined') return;

    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        type: 'javascript',
        severity: 'high',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        context: {
          metadata: {
            line: event.lineno,
            column: event.colno
          }
        }
      });
    });

    // Unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        type: 'javascript',
        severity: 'high',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        context: {
          metadata: {
            reason: event.reason
          }
        }
      });
    });

    // Network errors (fetch failures)
    this.interceptFetch();

    // Performance monitoring
    this.monitorPerformance();
  }

  private interceptFetch(): void {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();

        // Monitor slow requests
        if (endTime - startTime > 5000) { // 5 seconds
          this.reportError({
            type: 'performance',
            severity: 'medium',
            message: 'Slow network request detected',
            context: {
              action: 'slow_request',
              metadata: {
                url: args[0]?.toString(),
                duration: endTime - startTime
              }
            }
          });
        }

        // Monitor failed requests
        if (!response.ok) {
          this.reportError({
            type: 'network',
            severity: response.status >= 500 ? 'high' : 'medium',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: args[0]?.toString(),
            context: {
              action: 'failed_request',
              metadata: {
                status: response.status,
                statusText: response.statusText
              }
            }
          });
        }

        return response;
      } catch (error) {
        this.reportError({
          type: 'network',
          severity: 'high',
          message: `Network request failed: ${error}`,
          stack: error instanceof Error ? error.stack : undefined,
          url: args[0]?.toString(),
          context: {
            action: 'network_error'
          }
        });
        throw error;
      }
    };
  }

  private monitorPerformance(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          const lcp = entry.startTime;
          if (lcp > 2500) { // Poor LCP
            this.reportError({
              type: 'performance',
              severity: lcp > 4000 ? 'high' : 'medium',
              message: 'Poor Largest Contentful Paint performance',
              context: {
                action: 'performance_metric',
                metadata: {
                  lcp
                }
              }
            });
          }
        }

        if (entry.entryType === 'first-input' && 'processingStart' in entry) {
          const fid = (entry as any).processingStart - entry.startTime;
          if (fid > 100) { // Poor FID
            this.reportError({
              type: 'performance',
              severity: fid > 300 ? 'high' : 'medium',
              message: 'Poor First Input Delay performance',
              context: {
                action: 'performance_metric',
                metadata: {
                  fid
                }
              }
            });
          }
        }

        if (entry.entryType === 'layout-shift') {
          if ((entry as any).value > 0.1) { // Poor CLS
            this.reportError({
              type: 'performance',
              severity: (entry as any).value > 0.25 ? 'high' : 'medium',
              message: 'Poor Cumulative Layout Shift performance',
              context: {
                action: 'performance_metric',
                metadata: {
                  cls: (entry as any).value
                }
              }
            });
          }
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  // Report application errors
  reportError(errorData: {
    type: ErrorReport['type'];
    severity: ErrorSeverity;
    message: string;
    stack?: string;
    url?: string;
    context?: ErrorReport['context'];
  }): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const error: ErrorReport = {
      id: errorId,
      timestamp: Date.now(),
      severity: errorData.severity,
      type: errorData.type,
      message: errorData.message,
      stack: errorData.stack,
      url: errorData.url || (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      sessionId: this.sessionId,
      context: errorData.context || {},
      environment: this.environment,
      resolved: false
    };

    this.errors.set(errorId, error);
    this.cleanupOldErrors();

    // Notify callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error callback failed:', callbackError);
      }
    });

    // Log to console in development
    if (this.environment === 'development') {
      console.error('Error reported:', error);
    }

    // Send to external monitoring in production
    if (this.environment === 'production') {
      this.sendToExternalMonitoring(error).catch(console.error);
    }

    return errorId;
  }

  // Report security events
  reportSecurityEvent(eventData: {
    type: SecurityEvent['type'];
    severity: ErrorSeverity;
    source: string;
    details: Record<string, any>;
    blocked?: boolean;
  }): string {
    const eventId = `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const securityEvent: SecurityEvent = {
      id: eventId,
      timestamp: Date.now(),
      type: eventData.type,
      severity: eventData.severity,
      source: eventData.source,
      details: eventData.details,
      blocked: eventData.blocked || false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };

    this.securityEvents.set(eventId, securityEvent);

    // Notify callbacks
    this.securityCallbacks.forEach(callback => {
      try {
        callback(securityEvent);
      } catch (callbackError) {
        console.error('Security callback failed:', callbackError);
      }
    });

    // Always log security events
    console.warn('Security event:', securityEvent);

    // Send to external monitoring
    this.sendSecurityEventToMonitoring(securityEvent).catch(console.error);

    return eventId;
  }

  // Audio-specific error reporting
  reportAudioError(errorData: {
    operation: string;
    audioContext?: string;
    errorMessage: string;
    severity?: ErrorSeverity;
    metadata?: Record<string, any>;
  }): string {
    return this.reportError({
      type: 'audio',
      severity: errorData.severity || 'medium',
      message: `Audio Error in ${errorData.operation}: ${errorData.errorMessage}`,
      context: {
        component: 'AudioProcessor',
        action: errorData.operation,
        metadata: {
          audioContext: errorData.audioContext,
          ...errorData.metadata
        }
      }
    });
  }

  // Get error statistics
  getErrorStatistics(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byType: Record<ErrorReport['type'], number>;
    recent: ErrorReport[];
    unresolved: number;
  } {
    const errors = Array.from(this.errors.values());
    const recentCutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    const bySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const byType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorReport['type'], number>);

    return {
      total: errors.length,
      bySeverity,
      byType,
      recent: errors
        .filter(error => error.timestamp > recentCutoff)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
      unresolved: errors.filter(error => !error.resolved).length
    };
  }

  // Get security event statistics
  getSecurityStatistics(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byType: Record<SecurityEvent['type'], number>;
    recent: SecurityEvent[];
    blocked: number;
  } {
    const events = Array.from(this.securityEvents.values());
    const recentCutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    const bySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const byType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<SecurityEvent['type'], number>);

    return {
      total: events.length,
      bySeverity,
      byType,
      recent: events
        .filter(event => event.timestamp > recentCutoff)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
      blocked: events.filter(event => event.blocked).length
    };
  }

  // Subscribe to error notifications
  onError(callback: (error: ErrorReport) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to security event notifications
  onSecurityEvent(callback: (event: SecurityEvent) => void): () => void {
    this.securityCallbacks.push(callback);
    return () => {
      const index = this.securityCallbacks.indexOf(callback);
      if (index > -1) {
        this.securityCallbacks.splice(index, 1);
      }
    };
  }

  // Mark error as resolved
  resolveError(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      this.errors.set(errorId, error);
      return true;
    }
    return false;
  }

  // Clean up old errors
  private cleanupOldErrors(): void {
    if (this.errors.size <= this.maxErrors) return;

    const errors = Array.from(this.errors.entries())
      .sort(([, a], [, b]) => b.timestamp - a.timestamp);

    // Keep only the most recent errors
    const toKeep = errors.slice(0, this.maxErrors);
    this.errors.clear();
    toKeep.forEach(([id, error]) => this.errors.set(id, error));
  }

  // Send to external monitoring service
  private async sendToExternalMonitoring(error: ErrorReport): Promise<void> {
    try {
      // In a real implementation, this would send to services like Sentry, Rollbar, etc.
      // For now, we'll just prepare the data structure
      const payload = {
        error_id: error.id,
        timestamp: error.timestamp,
        severity: error.severity,
        type: error.type,
        message: error.message,
        stack: error.stack,
        url: error.url,
        user_agent: error.userAgent,
        session_id: error.sessionId,
        user_id: error.userId,
        context: error.context,
        environment: error.environment
      };

      // Send to monitoring API
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('Error sent to monitoring:', payload.error_id);
    } catch (sendError) {
      console.error('Failed to send error to external monitoring:', sendError);
    }
  }

  // Send security events to monitoring
  private async sendSecurityEventToMonitoring(event: SecurityEvent): Promise<void> {
    try {
      const payload = {
        event_id: event.id,
        timestamp: event.timestamp,
        type: event.type,
        severity: event.severity,
        source: event.source,
        details: event.details,
        blocked: event.blocked,
        user_agent: event.userAgent,
        ip_address: event.ipAddress
      };

      // Send to security monitoring API
      await fetch('/api/monitoring/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('Security event sent to monitoring:', payload.event_id);
    } catch (sendError) {
      console.error('Failed to send security event to monitoring:', sendError);
    }
  }

  // Export data for analysis
  exportErrorData() {
    return {
      errors: Array.from(this.errors.values()),
      securityEvents: Array.from(this.securityEvents.values()),
      statistics: this.getErrorStatistics(),
      securityStatistics: this.getSecurityStatistics(),
      sessionId: this.sessionId,
      environment: this.environment
    };
  }
}

// Singleton instance
export const errorMonitoring = ErrorMonitoringService.getInstance();

// React hook for error monitoring
export const useErrorMonitoring = () => {
  return {
    reportError: errorMonitoring.reportError.bind(errorMonitoring),
    reportAudioError: errorMonitoring.reportAudioError.bind(errorMonitoring),
    reportSecurityEvent: errorMonitoring.reportSecurityEvent.bind(errorMonitoring),
    getStatistics: errorMonitoring.getErrorStatistics.bind(errorMonitoring),
    getSecurityStatistics: errorMonitoring.getSecurityStatistics.bind(errorMonitoring),
    onError: errorMonitoring.onError.bind(errorMonitoring),
    onSecurityEvent: errorMonitoring.onSecurityEvent.bind(errorMonitoring),
    resolveError: errorMonitoring.resolveError.bind(errorMonitoring),
    exportData: errorMonitoring.exportErrorData.bind(errorMonitoring)
  };
};