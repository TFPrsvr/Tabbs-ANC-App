"use client";

import React, { Component, ReactNode } from 'react';
import { errorMonitoring } from '@/lib/monitoring/error-monitoring';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId?: string;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  component?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries: number;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.maxRetries = props.maxRetries || 3;
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = errorMonitoring.reportError({
      type: 'javascript',
      severity: 'high',
      message: error.message,
      stack: error.stack,
      context: {
        component: this.props.component || 'ErrorBoundary',
        action: 'component_error',
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          retryCount: this.state.retryCount
        }
      }
    });

    this.setState({
      errorId,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorId: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: undefined,
      errorInfo: undefined,
      retryCount: 0
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReportBug = () => {
    if (this.state.errorId) {
      const reportData = {
        errorId: this.state.errorId,
        error: this.state.error?.message,
        component: this.props.component,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // In production, this would open a bug report form or send to support
      console.log('Bug report data:', reportData);

      // For now, copy to clipboard
      navigator.clipboard?.writeText(JSON.stringify(reportData, null, 2))
        .then(() => alert('Error details copied to clipboard'))
        .catch(() => alert('Error ID: ' + this.state.errorId));
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 dark:bg-red-900/20 w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl font-semibold">
                Something went wrong
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                We encountered an unexpected error. Our team has been notified.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error message for development */}
              {isDevelopment && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Development Error:
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.errorId && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Error ID: {this.state.errorId}
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-3">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="w-full"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>

                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload
                  </Button>
                </div>

                <Button
                  onClick={this.handleReportBug}
                  variant="ghost"
                  className="w-full text-sm"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </div>

              {/* Additional info */}
              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>If this problem persists, please contact support.</p>
                {this.state.errorId && !isDevelopment && (
                  <p>Reference ID: {this.state.errorId.slice(-8)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Audio-specific error boundary
export class AudioErrorBoundary extends ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = errorMonitoring.reportAudioError({
      operation: this.props.component || 'AudioComponent',
      errorMessage: error.message,
      severity: 'high',
      metadata: {
        componentStack: errorInfo.componentStack,
        stack: error.stack,
        retryCount: this.state.retryCount
      }
    });

    this.setState({
      errorId,
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="w-full h-64 flex items-center justify-center bg-muted/50 rounded-lg border border-dashed">
          <div className="text-center space-y-3 p-6">
            <div className="mx-auto mb-2 p-2 rounded-full bg-orange-100 dark:bg-orange-900/20 w-fit">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-sm font-medium">Audio Component Error</h3>
            <p className="text-xs text-muted-foreground">
              Unable to load audio component. Please try refreshing.
            </p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={this.handleRetry} disabled={this.state.retryCount >= (this.props.maxRetries || 3)}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
              <Button size="sm" variant="outline" onClick={this.handleReload}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// HOC for audio components
export function withAudioErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <AudioErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AudioErrorBoundary>
  );

  WrappedComponent.displayName = `withAudioErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}