'use client';

export interface PerformanceMetrics {
  timestamp: number;
  type: 'audio' | 'ui' | 'network' | 'memory' | 'cpu';
  name: string;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface WebVitalsMetrics {
  CLS?: number;
  FID?: number;
  FCP?: number;
  LCP?: number;
  TTFB?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = true;
  private maxMetrics: number = 1000;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.setupWebVitals();
    }
  }

  private initializeObservers() {
    try {
      // Performance Observer for navigation timing
      if ('PerformanceObserver' in window) {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              timestamp: Date.now(),
              type: 'network',
              name: entry.name,
              value: entry.duration,
              unit: 'ms',
              metadata: {
                entryType: entry.entryType,
                startTime: entry.startTime
              }
            });
          }
        });

        navigationObserver.observe({
          entryTypes: ['navigation', 'resource']
        });
        this.observers.push(navigationObserver);
      }

      // Performance Observer for paint metrics
      if ('PerformanceObserver' in window) {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              timestamp: Date.now(),
              type: 'ui',
              name: entry.name,
              value: entry.startTime,
              unit: 'ms',
              metadata: {
                entryType: entry.entryType
              }
            });
          }
        });

        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      }

      // Performance Observer for layout shifts
      if ('PerformanceObserver' in window) {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              this.recordMetric({
                timestamp: Date.now(),
                type: 'ui',
                name: 'layout-shift',
                value: (entry as any).value,
                unit: 'score',
                metadata: {
                  sources: (entry as any).sources?.length || 0
                }
              });
            }
          }
        });

        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      }
    } catch (error) {
      console.warn('Failed to initialize performance observers:', error);
    }
  }

  private setupWebVitals() {
    // Web Vitals tracking
    if (typeof window !== 'undefined') {
      // First Contentful Paint (FCP)
      this.observeWebVital('first-contentful-paint', 'FCP');

      // Largest Contentful Paint (LCP)
      this.observeWebVital('largest-contentful-paint', 'LCP');

      // First Input Delay (FID) - measured on first interaction
      this.setupFIDMeasurement();

      // Cumulative Layout Shift (CLS) - already handled in layout shift observer
    }
  }

  private observeWebVital(entryName: string, metricName: string) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === entryName) {
            this.recordMetric({
              timestamp: Date.now(),
              type: 'ui',
              name: metricName,
              value: entry.startTime,
              unit: 'ms',
              metadata: {
                webVital: true,
                entryType: entry.entryType
              }
            });
          }
        }
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${metricName}:`, error);
    }
  }

  private setupFIDMeasurement() {
    let firstInteraction = true;

    const measureFID = (event: Event) => {
      if (firstInteraction) {
        firstInteraction = false;
        const fidStart = performance.now();

        requestIdleCallback(() => {
          const fid = performance.now() - fidStart;
          this.recordMetric({
            timestamp: Date.now(),
            type: 'ui',
            name: 'FID',
            value: fid,
            unit: 'ms',
            metadata: {
              webVital: true,
              eventType: event.type
            }
          });
        });

        // Remove listener after first interaction
        ['click', 'keydown', 'touchstart'].forEach(eventType => {
          document.removeEventListener(eventType, measureFID, { capture: true });
        });
      }
    };

    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, measureFID, {
        capture: true,
        once: false,
        passive: true
      });
    });
  }

  recordMetric(metric: PerformanceMetrics) {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log critical performance issues
    this.checkPerformanceThresholds(metric);
  }

  private checkPerformanceThresholds(metric: PerformanceMetrics) {
    const thresholds = {
      LCP: 2500, // ms
      FID: 100,  // ms
      CLS: 0.1,  // score
      'layout-shift': 0.1, // score
      'audio-processing': 10, // ms
      'memory-usage': 100 // MB
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(`Performance threshold exceeded for ${metric.name}:`, {
        value: metric.value,
        threshold,
        unit: metric.unit
      });

      // Record performance issue
      this.recordMetric({
        timestamp: Date.now(),
        type: 'ui',
        name: 'performance-issue',
        value: metric.value,
        unit: metric.unit,
        metadata: {
          originalMetric: metric.name,
          threshold,
          severity: metric.value > threshold * 2 ? 'high' : 'medium'
        }
      });
    }
  }

  // Audio-specific performance monitoring
  recordAudioMetric(name: string, value: number, metadata?: Record<string, any>) {
    this.recordMetric({
      timestamp: Date.now(),
      type: 'audio',
      name,
      value,
      unit: 'ms',
      metadata
    });
  }

  // Memory monitoring
  recordMemoryUsage() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;

      this.recordMetric({
        timestamp: Date.now(),
        type: 'memory',
        name: 'heap-used',
        value: memInfo.usedJSHeapSize / 1024 / 1024, // MB
        unit: 'MB'
      });

      this.recordMetric({
        timestamp: Date.now(),
        type: 'memory',
        name: 'heap-total',
        value: memInfo.totalJSHeapSize / 1024 / 1024, // MB
        unit: 'MB'
      });

      this.recordMetric({
        timestamp: Date.now(),
        type: 'memory',
        name: 'heap-limit',
        value: memInfo.jsHeapSizeLimit / 1024 / 1024, // MB
        unit: 'MB'
      });
    }
  }

  // CPU usage estimation (simplified)
  recordCPUUsage() {
    let startTime = performance.now();
    let iterations = 0;

    const measureCPU = () => {
      const deadline = startTime + 5; // 5ms window

      while (performance.now() < deadline) {
        iterations++;
      }

      const endTime = performance.now();
      const actualTime = endTime - startTime;
      const cpuUsage = (iterations / actualTime) * 100; // Rough CPU usage estimate

      this.recordMetric({
        timestamp: Date.now(),
        type: 'cpu',
        name: 'usage-estimate',
        value: cpuUsage,
        unit: 'percent',
        metadata: {
          iterations,
          actualTime
        }
      });
    };

    requestIdleCallback(measureCPU);
  }

  // Get metrics for analysis
  getMetrics(type?: PerformanceMetrics['type'], timeRange?: { start: number; end: number }): PerformanceMetrics[] {
    let filtered = this.metrics;

    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }

    if (timeRange) {
      filtered = filtered.filter(m =>
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return filtered;
  }

  // Get aggregated metrics
  getAggregatedMetrics(metricName: string, timeRange?: { start: number; end: number }) {
    const metrics = this.getMetrics(undefined, timeRange).filter(m => m.name === metricName);

    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99)
    };
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  // Export metrics for external monitoring
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = [];
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Clean up observers
  destroy() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Error disconnecting performance observer:', error);
      }
    });
    this.observers = [];
    this.metrics = [];
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

// Utility functions
export function measureAsyncOperation<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const startTime = performance.now();

  return operation().then(
    (result) => {
      const duration = performance.now() - startTime;
      monitor.recordMetric({
        timestamp: Date.now(),
        type: 'network',
        name,
        value: duration,
        unit: 'ms',
        metadata: { success: true }
      });
      return result;
    },
    (error) => {
      const duration = performance.now() - startTime;
      monitor.recordMetric({
        timestamp: Date.now(),
        type: 'network',
        name,
        value: duration,
        unit: 'ms',
        metadata: {
          success: false,
          error: error.message
        }
      });
      throw error;
    }
  );
}

export function measureSyncOperation<T>(
  name: string,
  operation: () => T
): T {
  const monitor = getPerformanceMonitor();
  const startTime = performance.now();

  try {
    const result = operation();
    const duration = performance.now() - startTime;

    monitor.recordMetric({
      timestamp: Date.now(),
      type: 'ui',
      name,
      value: duration,
      unit: 'ms',
      metadata: { success: true }
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    monitor.recordMetric({
      timestamp: Date.now(),
      type: 'ui',
      name,
      value: duration,
      unit: 'ms',
      metadata: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    throw error;
  }
}