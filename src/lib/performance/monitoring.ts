"use client";

// Performance monitoring for audio components and processing

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface ComponentLoadMetric {
  componentName: string;
  loadTime: number;
  bundleSize?: number;
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private componentLoads: ComponentLoadMetric[] = [];
  private observer?: PerformanceObserver;

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initializeObserver();
    }
  }

  private initializeObserver(): void {
    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.recordMetric('page-load', {
              name: 'page-load',
              startTime: entry.startTime,
              endTime: entry.startTime + entry.duration,
              duration: entry.duration,
              metadata: {
                type: 'navigation',
                loadEventEnd: (entry as PerformanceNavigationTiming).loadEventEnd
              }
            });
          }

          if (entry.entryType === 'resource' && entry.name.includes('/audio/')) {
            this.recordMetric(`resource-${entry.name}`, {
              name: `resource-${entry.name}`,
              startTime: entry.startTime,
              endTime: entry.startTime + entry.duration,
              duration: entry.duration,
              metadata: {
                type: 'resource',
                transferSize: (entry as PerformanceResourceTiming).transferSize
              }
            });
          }
        });
      });

      this.observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  // Start timing a performance metric
  startTimer(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.metrics.set(name, {
      name,
      startTime,
      metadata
    });

    // Also create a performance mark
    if (typeof window !== 'undefined' && window.performance && typeof window.performance.mark === 'function') {
      performance.mark(`${name}-start`);
    }
  }

  // End timing and record the metric
  endTimer(name: string, additionalMetadata?: Record<string, any>): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`No timer found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...additionalMetadata }
    };

    this.metrics.set(name, completedMetric);

    // Create performance mark and measure
    if (typeof window !== 'undefined' && window.performance && typeof window.performance.mark === 'function' && typeof window.performance.measure === 'function') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    return duration;
  }

  // Record a complete metric
  recordMetric(name: string, metric: PerformanceMetric): void {
    this.metrics.set(name, metric);
  }

  // Record component load time
  recordComponentLoad(componentName: string, loadTime: number, bundleSize?: number): void {
    this.componentLoads.push({
      componentName,
      loadTime,
      bundleSize,
      timestamp: Date.now()
    });

    // Keep only last 100 component loads
    if (this.componentLoads.length > 100) {
      this.componentLoads = this.componentLoads.slice(-100);
    }
  }

  // Get all metrics
  getMetrics(): Record<string, PerformanceMetric> {
    const result: Record<string, PerformanceMetric> = {};
    this.metrics.forEach((metric, name) => {
      result[name] = metric;
    });
    return result;
  }

  // Get component load metrics
  getComponentLoadMetrics(): ComponentLoadMetric[] {
    return [...this.componentLoads];
  }

  // Get performance summary
  getPerformanceSummary(): {
    averageComponentLoadTime: number;
    slowestComponents: ComponentLoadMetric[];
    totalMetrics: number;
    audioProcessingTimes: PerformanceMetric[];
  } {
    const componentLoads = this.getComponentLoadMetrics();
    const averageLoadTime = componentLoads.length > 0
      ? componentLoads.reduce((sum, load) => sum + load.loadTime, 0) / componentLoads.length
      : 0;

    const slowestComponents = componentLoads
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, 5);

    const audioProcessingTimes = Array.from(this.metrics.values())
      .filter(metric => metric.name.includes('audio-') || metric.name.includes('processing-'));

    return {
      averageComponentLoadTime: averageLoadTime,
      slowestComponents,
      totalMetrics: this.metrics.size,
      audioProcessingTimes
    };
  }

  // Clear old metrics
  clearMetrics(olderThanMs: number = 300000): void { // Default 5 minutes
    const cutoff = Date.now() - olderThanMs;

    // Clear old component loads
    this.componentLoads = this.componentLoads.filter(load => load.timestamp > cutoff);

    // Clear old metrics (keep only those from last period)
    const currentTime = performance.now();
    const metricsToKeep = new Map<string, PerformanceMetric>();

    this.metrics.forEach((metric, name) => {
      if (!metric.startTime || (currentTime - metric.startTime) < olderThanMs) {
        metricsToKeep.set(name, metric);
      }
    });

    this.metrics = metricsToKeep;
  }

  // Export metrics for analytics
  exportMetrics(): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      componentLoads: this.getComponentLoadMetrics(),
      summary: this.getPerformanceSummary(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
    };

    return JSON.stringify(data, null, 2);
  }
}

// Audio-specific performance monitoring
export class AudioPerformanceMonitor {
  private monitor = PerformanceMonitor.getInstance();

  // Monitor audio processing operations
  async monitorAudioProcessing<T>(
    operation: string,
    processor: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerName = `audio-processing-${operation}`;
    this.monitor.startTimer(timerName, { operation, ...metadata });

    try {
      const result = await processor();
      const duration = this.monitor.endTimer(timerName, { success: true });

      console.log(`Audio processing "${operation}" completed in ${duration?.toFixed(2)}ms`);
      return result;
    } catch (error) {
      this.monitor.endTimer(timerName, { success: false, error: error?.toString() });
      throw error;
    }
  }

  // Monitor component loading
  monitorComponentLoad(componentName: string, loadStart: number): void {
    const loadTime = performance.now() - loadStart;
    this.monitor.recordComponentLoad(componentName, loadTime);
    console.log(`Component "${componentName}" loaded in ${loadTime.toFixed(2)}ms`);
  }

  // Monitor audio file loading
  async monitorAudioFileLoad(
    filename: string,
    loader: () => Promise<any>
  ): Promise<any> {
    const timerName = `audio-file-load-${filename}`;
    this.monitor.startTimer(timerName, { filename, type: 'file-load' });

    try {
      const result = await loader();
      const duration = this.monitor.endTimer(timerName, {
        success: true,
        fileSize: result?.size || 0
      });

      console.log(`Audio file "${filename}" loaded in ${duration?.toFixed(2)}ms`);
      return result;
    } catch (error) {
      this.monitor.endTimer(timerName, { success: false, error: error?.toString() });
      throw error;
    }
  }

  // Get performance summary
  getAudioPerformanceSummary() {
    return this.monitor.getPerformanceSummary();
  }
}

// Singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const audioPerformanceMonitor = new AudioPerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  return {
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    endTimer: performanceMonitor.endTimer.bind(performanceMonitor),
    recordComponentLoad: performanceMonitor.recordComponentLoad.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getSummary: performanceMonitor.getPerformanceSummary.bind(performanceMonitor),
    audioMonitor: audioPerformanceMonitor
  };
};