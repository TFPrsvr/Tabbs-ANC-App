/**
 * Comprehensive Error Handling and Logging System
 * Provides structured error handling, logging, and user feedback
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  AUDIO_PROCESSING = 'audio_processing',
  FILE_OPERATIONS = 'file_operations',
  UI_INTERACTION = 'ui_interaction',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  STRIPE_PAYMENT = 'stripe_payment',
  DATABASE = 'database',
  SYSTEM = 'system'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export interface ErrorLog {
  id: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  stack?: string;
  resolved: boolean;
  count: number;
}

export class AppError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly context: ErrorContext;
  public readonly userMessage?: string;

  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    context: Partial<ErrorContext> = {},
    userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.severity = severity;
    this.category = category;
    this.userMessage = userMessage;
    this.context = {
      timestamp: new Date(),
      ...context
    };

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: Map<string, ErrorLog> = new Map();
  private errorSubscribers: Set<(error: ErrorLog) => void> = new Set();
  private isEnabled = true;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with comprehensive logging and user feedback
   */
  handleError(
    error: Error | AppError | unknown,
    context: Partial<ErrorContext> = {},
    userMessage?: string
  ): string {
    const errorId = this.generateErrorId();

    let processedError: AppError;

    if (error instanceof AppError) {
      processedError = error;
    } else if (error instanceof Error) {
      processedError = new AppError(
        error.message,
        ErrorSeverity.MEDIUM,
        ErrorCategory.SYSTEM,
        context,
        userMessage
      );
      processedError.stack = error.stack;
    } else {
      processedError = new AppError(
        String(error) || 'Unknown error occurred',
        ErrorSeverity.LOW,
        ErrorCategory.SYSTEM,
        context,
        userMessage
      );
    }

    const errorLog: ErrorLog = {
      id: errorId,
      message: processedError.message,
      severity: processedError.severity,
      category: processedError.category,
      context: { ...processedError.context, ...context },
      stack: processedError.stack,
      resolved: false,
      count: 1
    };

    // Check for duplicate errors
    const existingError = this.findSimilarError(errorLog);
    if (existingError) {
      existingError.count++;
      existingError.context.timestamp = new Date();
    } else {
      this.errorLogs.set(errorId, errorLog);
    }

    // Log based on severity
    this.logError(errorLog);

    // Notify subscribers
    this.notifySubscribers(errorLog);

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorLog);
    }

    return errorId;
  }

  /**
   * Create error handlers for specific categories
   */
  createAudioProcessingError(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ErrorSeverity.HIGH,
      ErrorCategory.AUDIO_PROCESSING,
      context,
      'Audio processing failed. Please try again or contact support if the issue persists.'
    );
  }

  createValidationError(message: string, field?: string): AppError {
    return new AppError(
      message,
      ErrorSeverity.LOW,
      ErrorCategory.VALIDATION,
      { additionalData: { field } },
      'Please check your input and try again.'
    );
  }

  createNetworkError(message: string, url?: string): AppError {
    return new AppError(
      message,
      ErrorSeverity.MEDIUM,
      ErrorCategory.NETWORK,
      { url },
      'Network connection issue. Please check your internet connection and try again.'
    );
  }

  createPaymentError(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ErrorSeverity.HIGH,
      ErrorCategory.STRIPE_PAYMENT,
      context,
      'Payment processing failed. Please try again or use a different payment method.'
    );
  }

  /**
   * Safe execution wrapper that handles errors gracefully
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    fallback: T,
    errorContext?: Partial<ErrorContext>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, errorContext);
      return fallback;
    }
  }

  /**
   * Safe synchronous execution wrapper
   */
  safeExecuteSync<T>(
    operation: () => T,
    fallback: T,
    errorContext?: Partial<ErrorContext>
  ): T {
    try {
      return operation();
    } catch (error) {
      this.handleError(error, errorContext);
      return fallback;
    }
  }

  /**
   * Safe value extraction with fallback
   */
  safeGet<T>(
    getValue: () => T,
    fallback: T,
    errorMessage?: string
  ): T {
    try {
      const value = getValue();
      if (value === undefined || value === null) {
        return fallback;
      }
      return value;
    } catch (error) {
      if (errorMessage) {
        this.handleError(new Error(errorMessage));
      }
      return fallback;
    }
  }

  /**
   * Subscribe to error notifications
   */
  subscribe(callback: (error: ErrorLog) => void): () => void {
    this.errorSubscribers.add(callback);
    return () => this.errorSubscribers.delete(callback);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    recent: ErrorLog[];
  } {
    const errors = Array.from(this.errorLogs.values());

    const bySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    const byCategory = {
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.AUTHENTICATION]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.AUDIO_PROCESSING]: 0,
      [ErrorCategory.FILE_OPERATIONS]: 0,
      [ErrorCategory.UI_INTERACTION]: 0,
      [ErrorCategory.PERFORMANCE]: 0,
      [ErrorCategory.SECURITY]: 0,
      [ErrorCategory.STRIPE_PAYMENT]: 0,
      [ErrorCategory.DATABASE]: 0,
      [ErrorCategory.SYSTEM]: 0,
    };

    errors.forEach(error => {
      bySeverity[error.severity]++;
      byCategory[error.category]++;
    });

    const recent = errors
      .sort((a, b) => b.context.timestamp.getTime() - a.context.timestamp.getTime())
      .slice(0, 10);

    return {
      total: errors.length,
      bySeverity,
      byCategory,
      recent
    };
  }

  /**
   * Clear resolved errors
   */
  clearResolvedErrors(): void {
    for (const [id, error] of this.errorLogs.entries()) {
      if (error.resolved) {
        this.errorLogs.delete(id);
      }
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private findSimilarError(errorLog: ErrorLog): ErrorLog | undefined {
    for (const existingError of this.errorLogs.values()) {
      if (
        existingError.message === errorLog.message &&
        existingError.category === errorLog.category &&
        !existingError.resolved
      ) {
        return existingError;
      }
    }
    return undefined;
  }

  private logError(errorLog: ErrorLog): void {
    if (!this.isEnabled) return;

    const prefix = this.getLogPrefix(errorLog.severity);
    const message = `${prefix} [${errorLog.category.toUpperCase()}] ${errorLog.message}`;

    switch (errorLog.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(message, errorLog);
        break;
      case ErrorSeverity.HIGH:
        console.error(message, errorLog);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(message, errorLog);
        break;
      case ErrorSeverity.LOW:
        console.info(message, errorLog);
        break;
    }
  }

  private getLogPrefix(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return '🚨';
      case ErrorSeverity.HIGH: return '❌';
      case ErrorSeverity.MEDIUM: return '⚠️';
      case ErrorSeverity.LOW: return 'ℹ️';
      default: return '📝';
    }
  }

  private notifySubscribers(errorLog: ErrorLog): void {
    this.errorSubscribers.forEach(callback => {
      try {
        callback(errorLog);
      } catch (error) {
        console.error('Error in error subscriber:', error);
      }
    });
  }

  private async sendToMonitoring(errorLog: ErrorLog): Promise<void> {
    // In production, send to monitoring service (Sentry, LogRocket, etc.)
    try {
      // Example implementation - replace with your monitoring service
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: errorLog.message,
          fatal: errorLog.severity === ErrorSeverity.CRITICAL,
          custom_map: {
            category: errorLog.category,
            severity: errorLog.severity,
          }
        });
      }
    } catch (error) {
      console.error('Failed to send error to monitoring service:', error);
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions for common error patterns
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R,
  errorContext?: Partial<ErrorContext>
) => {
  return (...args: T): R | undefined => {
    return errorHandler.safeExecuteSync(
      () => fn(...args),
      undefined,
      errorContext
    );
  };
};

export const withAsyncErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  fallback: R,
  errorContext?: Partial<ErrorContext>
) => {
  return async (...args: T): Promise<R> => {
    return errorHandler.safeExecute(
      () => fn(...args),
      fallback,
      errorContext
    );
  };
};

// Global error handlers for unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorHandler.handleError(
      event.error || new Error(event.message),
      {
        url: event.filename,
        additionalData: {
          line: event.lineno,
          column: event.colno,
        }
      }
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(
      event.reason,
      {
        additionalData: {
          type: 'unhandledrejection',
        }
      }
    );
  });
}