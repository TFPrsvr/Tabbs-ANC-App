// Mobile performance optimization utilities

export interface PerformanceMetrics {
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  batteryLevel?: number;
  networkType?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  isLowEnd: boolean;
}

export interface OptimizationConfig {
  enableLazyLoading: boolean;
  maxConcurrentTasks: number;
  audioQuality: 'low' | 'medium' | 'high';
  enableAnimations: boolean;
  prefetchResources: boolean;
  maxCacheSize: number; // MB
}

export class MobilePerformanceOptimizer {
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;
  private observers: Map<string, PerformanceObserver> = new Map();
  private rafId: number | null = null;

  constructor() {
    this.config = this.detectOptimalConfig();
    this.metrics = this.gatherInitialMetrics();
    this.setupPerformanceMonitoring();
  }

  // Detect optimal configuration based on device capabilities
  private detectOptimalConfig(): OptimizationConfig {
    const deviceMemory = (navigator as any).deviceMemory || 4; // GB
    const connectionType = this.getNetworkType();
    const isLowEnd = this.isLowEndDevice();

    return {
      enableLazyLoading: true,
      maxConcurrentTasks: isLowEnd ? 1 : deviceMemory > 4 ? 4 : 2,
      audioQuality: isLowEnd ? 'low' : deviceMemory > 6 ? 'high' : 'medium',
      enableAnimations: !isLowEnd && !this.isPowerSaveMode(),
      prefetchResources: connectionType !== 'slow-2g' && !isLowEnd,
      maxCacheSize: isLowEnd ? 50 : deviceMemory > 4 ? 200 : 100,
    };
  }

  // Gather initial performance metrics
  private gatherInitialMetrics(): PerformanceMetrics {
    const memory = (performance as any).memory;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0, // MB
      loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      renderTime: 0,
      batteryLevel: this.getBatteryLevel(),
      networkType: this.getNetworkType(),
      deviceType: this.getDeviceType(),
      isLowEnd: this.isLowEndDevice(),
    };
  }

  // Set up continuous performance monitoring
  private setupPerformanceMonitoring(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms`);
            this.handleLongTask(entry);
          }
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.log('Long task monitoring not supported');
      }

      // Monitor layout shifts
      const layoutObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).value > 0.1) { // CLS > 0.1 is poor
            console.warn(`⚠️ Layout shift detected: ${(entry as any).value.toFixed(3)}`);
          }
        }
      });

      try {
        layoutObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', layoutObserver);
      } catch (e) {
        console.log('Layout shift monitoring not supported');
      }
    }

    // Monitor frame rate
    this.startFrameRateMonitoring();

    // Monitor memory usage periodically
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 30000); // Every 30 seconds
  }

  // Handle long tasks by adjusting configuration
  private handleLongTask(entry: PerformanceEntry): void {
    if (entry.duration > 100) {
      // Very long task - reduce quality and concurrency
      this.config.audioQuality = 'low';
      this.config.maxConcurrentTasks = Math.max(1, this.config.maxConcurrentTasks - 1);
      this.config.enableAnimations = false;
      
      console.log('🔧 Reduced performance settings due to long task');
    }
  }

  // Monitor frame rate
  private startFrameRateMonitoring(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFrameRate = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) { // Every second
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;

        // Adjust settings based on frame rate
        if (fps < 30) {
          this.handleLowFrameRate(fps);
        } else if (fps > 50) {
          this.handleHighFrameRate(fps);
        }
      }

      this.rafId = requestAnimationFrame(measureFrameRate);
    };

    this.rafId = requestAnimationFrame(measureFrameRate);
  }

  // Handle low frame rate
  private handleLowFrameRate(fps: number): void {
    console.warn(`⚠️ Low frame rate detected: ${fps}fps`);
    
    // Reduce visual complexity
    this.config.enableAnimations = false;
    this.config.audioQuality = this.config.audioQuality === 'high' ? 'medium' : 'low';
    
    // Reduce concurrent tasks
    this.config.maxConcurrentTasks = Math.max(1, this.config.maxConcurrentTasks - 1);
    
    this.notifyConfigChange('Performance optimized for low frame rate');
  }

  // Handle high frame rate (device has headroom)
  private handleHighFrameRate(fps: number): void {
    if (fps > 55 && !this.config.enableAnimations) {
      // Device has headroom - can increase quality
      this.config.enableAnimations = true;
      
      if (this.config.audioQuality === 'low') {
        this.config.audioQuality = 'medium';
      }
      
      this.notifyConfigChange('Performance settings improved due to good frame rate');
    }
  }

  // Update memory metrics
  private updateMemoryMetrics(): void {
    const memory = (performance as any).memory;
    if (memory) {
      const currentUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      const limit = memory.jsHeapSizeLimit / 1024 / 1024; // MB
      
      this.metrics.memoryUsage = currentUsage;
      
      // If memory usage is high, reduce cache and quality
      if (currentUsage > limit * 0.8) {
        this.handleHighMemoryUsage(currentUsage, limit);
      }
    }
  }

  // Handle high memory usage
  private handleHighMemoryUsage(current: number, limit: number): void {
    console.warn(`⚠️ High memory usage: ${current.toFixed(1)}MB / ${limit.toFixed(1)}MB`);
    
    // Reduce cache size
    this.config.maxCacheSize = Math.max(25, this.config.maxCacheSize * 0.7);
    
    // Reduce audio quality
    this.config.audioQuality = 'low';
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    this.notifyConfigChange('Reduced settings due to high memory usage');
  }

  // Device detection utilities
  private isLowEndDevice(): boolean {
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const connection = (navigator as any).connection;
    
    // Consider low-end if:
    // - Less than 2GB memory
    // - Less than 4 CPU cores
    // - Slow connection
    // - Save-Data header present
    return (
      (memory && memory < 2) ||
      (cores && cores < 4) ||
      (connection && connection.saveData) ||
      (connection && ['slow-2g', '2g'].includes(connection.effectiveType))
    );
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent;
    const screen = window.screen;
    
    // Check screen size and user agent
    if (/iPhone|Android.*Mobile|Windows Phone/i.test(userAgent)) {
      return 'mobile';
    } else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent) || 
               (screen.width >= 768 && screen.width < 1024)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  private getNetworkType(): string {
    const connection = (navigator as any).connection;
    return connection ? connection.effectiveType || 'unknown' : 'unknown';
  }

  private getBatteryLevel(): number | undefined {
    // Note: Battery API is deprecated/removed in most browsers
    return undefined;
  }

  private isPowerSaveMode(): boolean {
    // Heuristic: if device memory is low and it's mobile, assume power save mode
    const memory = (navigator as any).deviceMemory;
    const isMobile = this.getDeviceType() === 'mobile';
    
    return isMobile && memory && memory < 3;
  }

  private notifyConfigChange(reason: string): void {
    console.log(`🔧 ${reason}:`, this.config);
    
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('performanceConfigChange', {
      detail: { config: this.config, reason, metrics: this.metrics }
    }));
  }

  // Public API
  public getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public shouldLazyLoad(): boolean {
    return this.config.enableLazyLoading;
  }

  public getMaxConcurrentTasks(): number {
    return this.config.maxConcurrentTasks;
  }

  public getAudioQuality(): 'low' | 'medium' | 'high' {
    return this.config.audioQuality;
  }

  public shouldEnableAnimations(): boolean {
    return this.config.enableAnimations;
  }

  public shouldPrefetchResources(): boolean {
    return this.config.prefetchResources;
  }

  public getMaxCacheSize(): number {
    return this.config.maxCacheSize;
  }

  // Audio-specific optimizations
  public getOptimalAudioSettings(): {
    sampleRate: number;
    bitDepth: number;
    bufferSize: number;
    compressionLevel: number;
  } {
    const quality = this.config.audioQuality;
    const isLowEnd = this.metrics.isLowEnd;
    
    switch (quality) {
      case 'low':
        return {
          sampleRate: 22050,
          bitDepth: 16,
          bufferSize: isLowEnd ? 8192 : 4096,
          compressionLevel: 9, // High compression
        };
      case 'medium':
        return {
          sampleRate: 44100,
          bitDepth: 16,
          bufferSize: isLowEnd ? 4096 : 2048,
          compressionLevel: 6, // Medium compression
        };
      case 'high':
        return {
          sampleRate: 48000,
          bitDepth: 24,
          bufferSize: 1024,
          compressionLevel: 3, // Low compression
        };
      default:
        return this.getOptimalAudioSettings(); // Fallback to current setting
    }
  }

  // Memory management
  public requestMemoryCleanup(): void {
    // Clear caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('audio-temp')) {
            caches.delete(name);
          }
        });
      });
    }

    // Clear URL objects
    URL.revokeObjectURL = URL.revokeObjectURL;

    // Trigger garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }

    this.updateMemoryMetrics();
  }

  // Cleanup
  public destroy(): void {
    // Stop frame rate monitoring
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Disconnect performance observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
let performanceOptimizer: MobilePerformanceOptimizer | null = null;

export function getPerformanceOptimizer(): MobilePerformanceOptimizer {
  if (!performanceOptimizer) {
    performanceOptimizer = new MobilePerformanceOptimizer();
  }
  return performanceOptimizer;
}

// React hook for performance optimization
export function usePerformanceOptimization() {
  const [config, setConfig] = React.useState<OptimizationConfig | null>(null);
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);

  React.useEffect(() => {
    const optimizer = getPerformanceOptimizer();
    setConfig(optimizer.getConfig());
    setMetrics(optimizer.getMetrics());

    const handleConfigChange = (event: CustomEvent) => {
      setConfig(event.detail.config);
      setMetrics(event.detail.metrics);
    };

    window.addEventListener('performanceConfigChange', handleConfigChange as EventListener);

    return () => {
      window.removeEventListener('performanceConfigChange', handleConfigChange as EventListener);
    };
  }, []);

  return {
    config,
    metrics,
    optimizer: getPerformanceOptimizer(),
  };
}

// Export React for the hook
import React from 'react';