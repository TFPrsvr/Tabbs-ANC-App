"use client";

interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl?: number;
  size: number;
  metadata?: Record<string, any>;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  oldestEntry?: number;
  newestEntry?: number;
  averageSize: number;
}

interface CacheConfig {
  maxSize: number; // in bytes
  maxEntries: number;
  defaultTTL: number; // in milliseconds
  compressionThreshold: number; // compress items larger than this
  persistToDisk: boolean;
  strategy: 'lru' | 'lfu' | 'ttl' | 'fifo';
  cleanupInterval: number; // milliseconds
}

class SmartCache<T = any> {
  private entries: Map<string, CacheEntry<T>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalSize: 0,
    entryCount: 0,
    averageSize: 0
  };

  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private compressionWorker?: Worker;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB default
      maxEntries: 1000,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      compressionThreshold: 64 * 1024, // 64KB
      persistToDisk: false,
      strategy: 'lru',
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    };

    this.startCleanupTimer();
    this.initializeCompression();
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private initializeCompression(): void {
    if (typeof Worker !== 'undefined' && this.config.compressionThreshold > 0) {
      try {
        // Create a simple compression worker
        const workerCode = `
          self.onmessage = function(e) {
            const { action, data, key } = e.data;

            if (action === 'compress') {
              try {
                // Simple compression using JSON string length reduction
                const compressed = JSON.stringify(data);
                self.postMessage({ success: true, key, compressed, originalSize: JSON.stringify(data).length });
              } catch (error) {
                self.postMessage({ success: false, key, error: error.message });
              }
            } else if (action === 'decompress') {
              try {
                const decompressed = JSON.parse(data);
                self.postMessage({ success: true, key, decompressed });
              } catch (error) {
                self.postMessage({ success: false, key, error: error.message });
              }
            }
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));

        this.compressionWorker.onmessage = (e) => {
          this.handleCompressionResult(e.data);
        };
      } catch (error) {
        console.warn('Failed to initialize compression worker:', error);
      }
    }
  }

  private handleCompressionResult(result: any): void {
    if (result.success) {
      // Handle successful compression/decompression
      // This would update the cache entry with compressed data
    } else {
      console.warn('Compression operation failed:', result.error);
    }
  }

  private calculateSize(data: T): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback size calculation
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  private updateStats(): void {
    this.stats.entryCount = this.entries.size;
    this.stats.totalSize = Array.from(this.entries.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    this.stats.hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    this.stats.averageSize = this.stats.entryCount > 0
      ? this.stats.totalSize / this.stats.entryCount
      : 0;

    if (this.stats.entryCount > 0) {
      const timestamps = Array.from(this.entries.values()).map(e => e.timestamp);
      this.stats.oldestEntry = Math.min(...timestamps);
      this.stats.newestEntry = Math.max(...timestamps);
    }
  }

  private shouldCompress(data: T): boolean {
    const size = this.calculateSize(data);
    return size > this.config.compressionThreshold;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    const ttl = entry.ttl || this.config.defaultTTL;
    return Date.now() - entry.timestamp > ttl;
  }

  private evictEntries(): void {
    const now = Date.now();

    // First, remove expired entries
    for (const [key, entry] of this.entries) {
      if (this.isExpired(entry)) {
        this.entries.delete(key);
      }
    }

    // If still over limits, use eviction strategy
    while (this.stats.totalSize > this.config.maxSize ||
           this.entries.size > this.config.maxEntries) {

      const entryToEvict = this.selectEntryForEviction();
      if (entryToEvict) {
        this.entries.delete(entryToEvict.key);
      } else {
        break; // Safety break
      }
    }

    this.updateStats();
  }

  private selectEntryForEviction(): CacheEntry<T> | null {
    if (this.entries.size === 0) return null;

    const entries = Array.from(this.entries.values());

    switch (this.config.strategy) {
      case 'lru':
        return entries.reduce((oldest, current) =>
          current.lastAccessed < oldest.lastAccessed ? current : oldest
        );

      case 'lfu':
        return entries.reduce((leastUsed, current) =>
          current.accessCount < leastUsed.accessCount ? current : leastUsed
        );

      case 'ttl':
        return entries.reduce((earliest, current) =>
          current.timestamp < earliest.timestamp ? current : earliest
        );

      case 'fifo':
      default:
        return entries.reduce((oldest, current) =>
          current.timestamp < oldest.timestamp ? current : oldest
        );
    }
  }

  private cleanup(): void {
    const beforeSize = this.stats.totalSize;
    const beforeCount = this.stats.entryCount;

    // Remove expired entries
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (this.isExpired(entry)) {
        this.entries.delete(key);
      }
    }

    this.updateStats();

    const removedEntries = beforeCount - this.stats.entryCount;
    const freedBytes = beforeSize - this.stats.totalSize;

    if (removedEntries > 0) {
      console.debug(`Cache cleanup: removed ${removedEntries} entries, freed ${freedBytes} bytes`);
    }
  }

  public set(key: string, data: T, options: { ttl?: number; metadata?: Record<string, any> } = {}): boolean {
    try {
      const size = this.calculateSize(data);
      const now = Date.now();

      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: now,
        accessCount: 0,
        lastAccessed: now,
        ttl: options.ttl,
        size,
        metadata: options.metadata
      };

      // Check if adding this entry would exceed limits
      if (size > this.config.maxSize) {
        console.warn(`Cache entry too large: ${size} bytes exceeds max size ${this.config.maxSize}`);
        return false;
      }

      this.entries.set(key, entry);
      this.updateStats();

      // Evict entries if necessary
      if (this.stats.totalSize > this.config.maxSize ||
          this.stats.entryCount > this.config.maxEntries) {
        this.evictEntries();
      }

      return true;
    } catch (error) {
      console.error('Failed to set cache entry:', error);
      return false;
    }
  }

  public get(key: string): T | null {
    const entry = this.entries.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    if (this.isExpired(entry)) {
      this.entries.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    this.updateStats();

    return entry.data;
  }

  public has(key: string): boolean {
    const entry = this.entries.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  public delete(key: string): boolean {
    const deleted = this.entries.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  public clear(): void {
    this.entries.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
      averageSize: 0
    };
  }

  public getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.startCleanupTimer();
    }

    // Trigger eviction if new limits are smaller
    if (newConfig.maxSize || newConfig.maxEntries) {
      this.evictEntries();
    }
  }

  public getKeys(): string[] {
    return Array.from(this.entries.keys());
  }

  public getEntries(): Array<{ key: string; metadata?: Record<string, any>; size: number; lastAccessed: number }> {
    return Array.from(this.entries.values()).map(entry => ({
      key: entry.key,
      metadata: entry.metadata,
      size: entry.size,
      lastAccessed: entry.lastAccessed
    }));
  }

  public export(): Record<string, any> {
    const data: Record<string, any> = {};
    for (const [key, entry] of this.entries) {
      if (!this.isExpired(entry)) {
        data[key] = {
          data: entry.data,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          metadata: entry.metadata
        };
      }
    }
    return data;
  }

  public import(data: Record<string, any>): number {
    let importedCount = 0;
    const now = Date.now();

    for (const [key, item] of Object.entries(data)) {
      try {
        if (item.data !== undefined) {
          const ttl = item.ttl || this.config.defaultTTL;
          const age = now - (item.timestamp || now);

          // Only import if not expired
          if (age < ttl) {
            this.set(key, item.data, {
              ttl: ttl - age, // Adjust TTL for age
              metadata: item.metadata
            });
            importedCount++;
          }
        }
      } catch (error) {
        console.warn(`Failed to import cache entry ${key}:`, error);
      }
    }

    return importedCount;
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }

    this.clear();
  }
}

// Global cache manager for the application
class CacheManager {
  private caches: Map<string, SmartCache> = new Map();
  private defaultConfig: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB per cache
    maxEntries: 500,
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    compressionThreshold: 32 * 1024, // 32KB
    persistToDisk: false,
    strategy: 'lru',
    cleanupInterval: 60 * 1000 // 1 minute
  };

  private predefinedCaches = {
    'waveforms': {
      maxSize: 100 * 1024 * 1024, // 100MB for waveform data
      maxEntries: 200,
      defaultTTL: 60 * 60 * 1000, // 1 hour
      strategy: 'lru' as const
    },
    'audio-analysis': {
      maxSize: 200 * 1024 * 1024, // 200MB for analysis results
      maxEntries: 100,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      strategy: 'lfu' as const
    },
    'thumbnails': {
      maxSize: 50 * 1024 * 1024, // 50MB for thumbnails
      maxEntries: 1000,
      defaultTTL: 2 * 60 * 60 * 1000, // 2 hours
      strategy: 'lru' as const
    },
    'api-responses': {
      maxSize: 25 * 1024 * 1024, // 25MB for API responses
      maxEntries: 300,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      strategy: 'ttl' as const
    },
    'user-preferences': {
      maxSize: 5 * 1024 * 1024, // 5MB for user data
      maxEntries: 100,
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      strategy: 'lfu' as const,
      persistToDisk: true
    }
  };

  constructor() {
    this.initializePredefinedCaches();
  }

  private initializePredefinedCaches(): void {
    for (const [name, config] of Object.entries(this.predefinedCaches)) {
      this.createCache(name, config);
    }
  }

  public createCache(name: string, config: Partial<CacheConfig> = {}): SmartCache {
    const finalConfig = { ...this.defaultConfig, ...config };
    const cache = new SmartCache(finalConfig);
    this.caches.set(name, cache);
    return cache;
  }

  public getCache(name: string): SmartCache | null {
    return this.caches.get(name) || null;
  }

  public removeCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (cache) {
      cache.destroy();
      return this.caches.delete(name);
    }
    return false;
  }

  public getAllCaches(): Record<string, SmartCache> {
    const result: Record<string, SmartCache> = {};
    for (const [name, cache] of this.caches) {
      result[name] = cache;
    }
    return result;
  }

  public getGlobalStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  public clearAllCaches(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  public destroyAllCaches(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }

  // Convenience methods for common cache types
  public setWaveform(key: string, waveformData: any): boolean {
    const cache = this.getCache('waveforms');
    return cache ? cache.set(key, waveformData) : false;
  }

  public getWaveform(key: string): any {
    const cache = this.getCache('waveforms');
    return cache ? cache.get(key) : null;
  }

  public setAudioAnalysis(key: string, analysisData: any): boolean {
    const cache = this.getCache('audio-analysis');
    return cache ? cache.set(key, analysisData) : false;
  }

  public getAudioAnalysis(key: string): any {
    const cache = this.getCache('audio-analysis');
    return cache ? cache.get(key) : null;
  }

  public setThumbnail(key: string, thumbnailData: any): boolean {
    const cache = this.getCache('thumbnails');
    return cache ? cache.set(key, thumbnailData) : false;
  }

  public getThumbnail(key: string): any {
    const cache = this.getCache('thumbnails');
    return cache ? cache.get(key) : null;
  }

  public setApiResponse(key: string, responseData: any, ttl?: number): boolean {
    const cache = this.getCache('api-responses');
    return cache ? cache.set(key, responseData, { ttl }) : false;
  }

  public getApiResponse(key: string): any {
    const cache = this.getCache('api-responses');
    return cache ? cache.get(key) : null;
  }

  public setUserPreference(key: string, preferenceData: any): boolean {
    const cache = this.getCache('user-preferences');
    return cache ? cache.set(key, preferenceData) : false;
  }

  public getUserPreference(key: string): any {
    const cache = this.getCache('user-preferences');
    return cache ? cache.get(key) : null;
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
export { SmartCache, type CacheConfig, type CacheStats, type CacheEntry };

// React hook for using cache in components
export function useCache(cacheName: string) {
  const cache = cacheManager.getCache(cacheName);

  const set = (key: string, data: any, options?: { ttl?: number; metadata?: Record<string, any> }) => {
    return cache?.set(key, data, options) ?? false;
  };

  const get = (key: string) => {
    return cache?.get(key) ?? null;
  };

  const has = (key: string) => {
    return cache?.has(key) ?? false;
  };

  const remove = (key: string) => {
    return cache?.delete(key) ?? false;
  };

  const clear = () => {
    cache?.clear();
  };

  const getStats = () => {
    return cache?.getStats() ?? null;
  };

  return {
    set,
    get,
    has,
    remove,
    clear,
    getStats,
    isAvailable: cache !== null
  };
}