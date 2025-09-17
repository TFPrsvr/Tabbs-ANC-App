/**
 * Development Performance Monitoring Utilities
 * Provides insights into app performance during development
 */

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements = new Map<string, number>();
  private enabled = process.env.NODE_ENV === 'development';

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring performance for a specific operation
   */
  startMeasurement(name: string): void {
    if (!this.enabled) return;

    this.measurements.set(name, performance.now());
    console.time(`⏱️ ${name}`);
  }

  /**
   * End measurement and log the result
   */
  endMeasurement(name: string): number {
    if (!this.enabled) return 0;

    const startTime = this.measurements.get(name);
    if (!startTime) {
      console.warn(`⚠️ No start time found for measurement: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    console.timeEnd(`⏱️ ${name}`);

    // Log performance insights
    if (duration > 1000) {
      console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    } else if (duration > 100) {
      console.info(`⚡ ${name} completed in ${duration.toFixed(2)}ms`);
    }

    this.measurements.delete(name);
    return duration;
  }

  /**
   * Measure the execution time of an async function
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();

    this.startMeasurement(name);
    try {
      const result = await fn();
      this.endMeasurement(name);
      return result;
    } catch (error) {
      this.endMeasurement(name);
      console.error(`❌ Error in ${name}:`, error);
      throw error;
    }
  }

  /**
   * Measure the execution time of a synchronous function
   */
  measureSync<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn();

    this.startMeasurement(name);
    try {
      const result = fn();
      this.endMeasurement(name);
      return result;
    } catch (error) {
      this.endMeasurement(name);
      console.error(`❌ Error in ${name}:`, error);
      throw error;
    }
  }

  /**
   * Log memory usage information
   */
  logMemoryUsage(context?: string): void {
    if (!this.enabled || typeof window === 'undefined') return;

    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      const used = (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const total = (memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limit = (memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2);

      console.info(`💾 Memory${context ? ` (${context})` : ''}: ${used}MB / ${total}MB (limit: ${limit}MB)`);
    }
  }

  /**
   * Monitor Core Web Vitals
   */
  measureWebVitals(): void {
    if (!this.enabled || typeof window === 'undefined') return;

    // Monitor Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.info(`🎯 LCP: ${entry.startTime.toFixed(2)}ms`);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Monitor First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const perfEntry = entry as any;
        const fid = perfEntry.processingStart - entry.startTime;
        console.info(`⚡ FID: ${fid.toFixed(2)}ms`);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Monitor Cumulative Layout Shift (CLS)
    new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      if (clsValue > 0) {
        console.info(`📐 CLS: ${clsValue.toFixed(4)}`);
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Monitor component render performance
   */
  measureComponentRender(componentName: string, renderCount: number): void {
    if (!this.enabled) return;

    if (renderCount > 5) {
      console.warn(`🔄 ${componentName} rendered ${renderCount} times - consider optimization`);
    }
  }

  /**
   * Log bundle loading performance
   */
  logBundlePerformance(): void {
    if (!this.enabled || typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      console.group('📦 Bundle Performance');
      console.info(`DNS Lookup: ${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`);
      console.info(`TCP Connection: ${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`);
      console.info(`Request: ${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms`);
      console.info(`Response: ${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms`);
      console.info(`DOM Processing: ${(navigation.domContentLoadedEventEnd - navigation.responseEnd).toFixed(2)}ms`);
      console.info(`Total Load Time: ${(navigation.loadEventEnd - navigation.fetchStart).toFixed(2)}ms`);
      console.groupEnd();
    });
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Development-only performance hooks
export const usePerformanceMonitor = () => {
  if (process.env.NODE_ENV !== 'development') {
    return {
      startMeasurement: () => {},
      endMeasurement: () => 0,
      measureAsync: async <T>(name: string, fn: () => Promise<T>) => fn(),
      measureSync: <T>(name: string, fn: () => T) => fn(),
      logMemoryUsage: () => {},
    };
  }

  return {
    startMeasurement: (name: string) => performanceMonitor.startMeasurement(name),
    endMeasurement: (name: string) => performanceMonitor.endMeasurement(name),
    measureAsync: <T>(name: string, fn: () => Promise<T>) => performanceMonitor.measureAsync(name, fn),
    measureSync: <T>(name: string, fn: () => T) => performanceMonitor.measureSync(name, fn),
    logMemoryUsage: (context?: string) => performanceMonitor.logMemoryUsage(context),
  };
};