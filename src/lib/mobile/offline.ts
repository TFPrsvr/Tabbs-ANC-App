// Offline processing capabilities for mobile PWA

export interface OfflineAudioFile {
  id: string;
  name: string;
  size: number;
  type: string;
  duration?: number;
  blob: Blob;
  audioBuffer?: AudioBuffer;
  processed?: boolean;
  processedData?: {
    separation?: {
      vocals?: AudioBuffer;
      music?: AudioBuffer;
      background?: AudioBuffer;
    };
    voices?: Array<{
      id: string;
      name: string;
      audioBuffer: AudioBuffer;
      characteristics: any;
    }>;
    captions?: Array<{
      start: number;
      end: number;
      text: string;
      speaker?: string;
    }>;
  };
  createdAt: number;
  lastModified: number;
}

export interface OfflineProcessingOptions {
  enableSeparation?: boolean;
  enableVoiceDetection?: boolean;
  enableCaptions?: boolean;
  maxCacheSize?: number; // in MB
}

export class OfflineAudioManager {
  private dbName = 'ANC_Audio_Offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private maxCacheSize: number; // in bytes

  constructor(options: OfflineProcessingOptions = {}) {
    this.maxCacheSize = (options.maxCacheSize || 1024) * 1024 * 1024; // Default 1GB
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('audioFiles')) {
          const audioStore = db.createObjectStore('audioFiles', { keyPath: 'id' });
          audioStore.createIndex('name', 'name', { unique: false });
          audioStore.createIndex('createdAt', 'createdAt', { unique: false });
          audioStore.createIndex('processed', 'processed', { unique: false });
        }

        if (!db.objectStoreNames.contains('audioBuffers')) {
          db.createObjectStore('audioBuffers', { keyPath: 'fileId' });
        }

        if (!db.objectStoreNames.contains('processedData')) {
          db.createObjectStore('processedData', { keyPath: 'fileId' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Store audio file for offline processing
  async storeAudioFile(file: File, duration?: number): Promise<OfflineAudioFile> {
    if (!this.db) await this.initDB();

    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineFile: OfflineAudioFile = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      duration,
      blob: file,
      processed: false,
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    // Check storage quota
    await this.ensureStorageQuota();

    // Store file metadata
    const transaction = this.db!.transaction(['audioFiles'], 'readwrite');
    const store = transaction.objectStore('audioFiles');
    
    return new Promise((resolve, reject) => {
      const request = store.add(offlineFile);
      
      request.onsuccess = () => {
        console.log('📱 Audio file stored offline:', file.name);
        resolve(offlineFile);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Get all stored audio files
  async getStoredAudioFiles(): Promise<OfflineAudioFile[]> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['audioFiles'], 'readonly');
    const store = transaction.objectStore('audioFiles');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get specific audio file
  async getAudioFile(id: string): Promise<OfflineAudioFile | null> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['audioFiles'], 'readonly');
    const store = transaction.objectStore('audioFiles');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Process audio file offline
  async processAudioOffline(
    fileId: string, 
    options: OfflineProcessingOptions = {}
  ): Promise<OfflineAudioFile | null> {
    const audioFile = await this.getAudioFile(fileId);
    if (!audioFile) return null;

    console.log('🔄 Starting offline processing for:', audioFile.name);

    try {
      // Convert blob to AudioBuffer
      const arrayBuffer = await audioFile.blob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Store AudioBuffer separately for memory management
      await this.storeAudioBuffer(fileId, audioBuffer);

      const processedData: any = {};

      // Basic frequency-based separation (offline-capable)
      if (options.enableSeparation) {
        processedData.separation = await this.performBasicSeparation(audioBuffer);
      }

      // Basic voice activity detection (offline-capable)
      if (options.enableVoiceDetection) {
        processedData.voices = await this.performBasicVoiceDetection(audioBuffer);
      }

      // Simple speech detection (offline-capable)
      if (options.enableCaptions) {
        processedData.captions = await this.performBasicSpeechDetection(audioBuffer);
      }

      // Update file with processed data
      const updatedFile: OfflineAudioFile = {
        ...audioFile,
        audioBuffer,
        processedData,
        processed: true,
        lastModified: Date.now(),
      };

      // Store updated file
      await this.updateAudioFile(updatedFile);

      console.log('✅ Offline processing complete for:', audioFile.name);
      return updatedFile;

    } catch (error) {
      console.error('❌ Offline processing failed:', error);
      return null;
    }
  }

  // Store AudioBuffer separately for memory efficiency
  private async storeAudioBuffer(fileId: string, audioBuffer: AudioBuffer): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['audioBuffers'], 'readwrite');
    const store = transaction.objectStore('audioBuffers');
    
    return new Promise((resolve, reject) => {
      const request = store.put({ fileId, audioBuffer });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Basic frequency-based audio separation (offline)
  private async performBasicSeparation(audioBuffer: AudioBuffer): Promise<any> {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const length = channelData.length;

    // Create separate buffers for different frequency ranges
    const vocalsData = new Float32Array(length);
    const musicData = new Float32Array(length);
    const backgroundData = new Float32Array(length);

    // Simple frequency-based separation using a sliding window
    const windowSize = 1024;
    for (let i = 0; i < length - windowSize; i += windowSize) {
      const window = channelData.slice(i, i + windowSize);
      
      // Analyze frequency content (simplified)
      const energy = this.calculateRMSEnergy(window);
      const spectralCentroid = this.calculateSpectralCentroid(window, sampleRate);
      
      // Route to different streams based on characteristics
      if (spectralCentroid > 1000 && spectralCentroid < 4000 && energy > 0.01) {
        // Likely vocals (human speech frequency range)
        for (let j = 0; j < windowSize && i + j < length; j++) {
          vocalsData[i + j] = channelData[i + j] ?? 0;
          musicData[i + j] = (channelData[i + j] ?? 0) * 0.3; // Reduce music
          backgroundData[i + j] = (channelData[i + j] ?? 0) * 0.1; // Reduce background
        }
      } else if (spectralCentroid < 1000 || energy < 0.005) {
        // Likely background/ambient
        for (let j = 0; j < windowSize && i + j < length; j++) {
          vocalsData[i + j] = (channelData[i + j] ?? 0) * 0.1; // Reduce vocals
          musicData[i + j] = (channelData[i + j] ?? 0) * 0.5; // Some music
          backgroundData[i + j] = channelData[i + j] ?? 0; // Keep background
        }
      } else {
        // Likely music/instruments
        for (let j = 0; j < windowSize && i + j < length; j++) {
          vocalsData[i + j] = (channelData[i + j] ?? 0) * 0.2; // Reduce vocals
          musicData[i + j] = channelData[i + j] ?? 0; // Keep music
          backgroundData[i + j] = (channelData[i + j] ?? 0) * 0.3; // Some background
        }
      }
    }

    // Create AudioBuffers from processed data
    const audioContext = new AudioContext();
    
    const vocalsBuffer = audioContext.createBuffer(1, length, sampleRate);
    vocalsBuffer.copyToChannel(vocalsData, 0);
    
    const musicBuffer = audioContext.createBuffer(1, length, sampleRate);
    musicBuffer.copyToChannel(musicData, 0);
    
    const backgroundBuffer = audioContext.createBuffer(1, length, sampleRate);
    backgroundBuffer.copyToChannel(backgroundData, 0);

    return {
      vocals: vocalsBuffer,
      music: musicBuffer,
      background: backgroundBuffer,
    };
  }

  // Basic voice activity detection (offline)
  private async performBasicVoiceDetection(audioBuffer: AudioBuffer): Promise<any[]> {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = 1024;
    const hopSize = 512;
    
    const voiceSegments: any[] = [];
    let currentSegment: any = null;
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const energy = this.calculateRMSEnergy(window);
      const spectralCentroid = this.calculateSpectralCentroid(window, sampleRate);
      const isVoice = this.isLikelyVoice(energy, spectralCentroid);
      
      const currentTime = i / sampleRate;
      
      if (isVoice && !currentSegment) {
        // Start new voice segment
        currentSegment = {
          id: `voice_${voiceSegments.length + 1}`,
          name: `Speaker ${voiceSegments.length + 1}`,
          startTime: currentTime,
          endTime: currentTime,
          characteristics: {
            avgEnergy: energy,
            avgSpectralCentroid: spectralCentroid,
          },
        };
      } else if (isVoice && currentSegment) {
        // Continue current segment
        currentSegment.endTime = currentTime;
        currentSegment.characteristics.avgEnergy = 
          (currentSegment.characteristics.avgEnergy + energy) / 2;
        currentSegment.characteristics.avgSpectralCentroid = 
          (currentSegment.characteristics.avgSpectralCentroid + spectralCentroid) / 2;
      } else if (!isVoice && currentSegment) {
        // End current segment
        if (currentSegment.endTime - currentSegment.startTime > 1.0) { // Min 1 second
          voiceSegments.push(currentSegment);
        }
        currentSegment = null;
      }
    }
    
    // Close final segment if needed
    if (currentSegment) {
      voiceSegments.push(currentSegment);
    }

    return voiceSegments;
  }

  // Basic speech detection for simple captions (offline)
  private async performBasicSpeechDetection(audioBuffer: AudioBuffer): Promise<any[]> {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = 1024;
    const hopSize = 512;
    
    const speechSegments: any[] = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const energy = this.calculateRMSEnergy(window);
      const spectralCentroid = this.calculateSpectralCentroid(window, sampleRate);
      
      if (this.isLikelySpeech(energy, spectralCentroid)) {
        const startTime = i / sampleRate;
        const endTime = (i + windowSize) / sampleRate;
        
        speechSegments.push({
          start: startTime,
          end: endTime,
          text: '[Speech detected]', // Simple placeholder - real transcription needs online API
          speaker: 'Unknown',
          confidence: Math.min(1, energy * spectralCentroid / 1000),
        });
      }
    }
    
    // Merge adjacent segments
    return this.mergeAdjacentSegments(speechSegments);
  }

  // Utility functions for audio analysis
  private calculateRMSEnergy(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += (buffer[i] ?? 0) * (buffer[i] ?? 0);
    }
    return Math.sqrt(sum / buffer.length);
  }

  private calculateSpectralCentroid(buffer: Float32Array, sampleRate: number): number {
    // Simplified spectral centroid calculation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      const magnitude = Math.abs(buffer[i] ?? 0);
      const frequency = (i * sampleRate) / (2 * buffer.length);
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private isLikelyVoice(energy: number, spectralCentroid: number): boolean {
    return energy > 0.01 && 
           spectralCentroid > 500 && 
           spectralCentroid < 4000;
  }

  private isLikelySpeech(energy: number, spectralCentroid: number): boolean {
    return energy > 0.02 && 
           spectralCentroid > 800 && 
           spectralCentroid < 3500;
  }

  private mergeAdjacentSegments(segments: any[]): any[] {
    if (segments.length === 0) return segments;
    
    const merged = [segments[0]];
    
    for (let i = 1; i < segments.length; i++) {
      const current = segments[i];
      const previous = merged[merged.length - 1];
      
      // Merge if segments are close (within 0.5 seconds)
      if (current.start - previous.end < 0.5) {
        previous.end = current.end;
        previous.text += ' ' + current.text;
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  }

  // Update audio file in storage
  private async updateAudioFile(audioFile: OfflineAudioFile): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['audioFiles'], 'readwrite');
    const store = transaction.objectStore('audioFiles');
    
    return new Promise((resolve, reject) => {
      const request = store.put(audioFile);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Ensure we don't exceed storage quota
  private async ensureStorageQuota(): Promise<void> {
    if (!navigator.storage || !navigator.storage.estimate) return;

    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    
    console.log(`📊 Storage: ${(used / 1024 / 1024).toFixed(1)}MB / ${(quota / 1024 / 1024).toFixed(1)}MB`);
    
    // If using more than 80% of quota, clean up old files
    if (used > quota * 0.8) {
      await this.cleanupOldFiles();
    }
  }

  // Clean up old files to free storage
  private async cleanupOldFiles(): Promise<void> {
    const files = await this.getStoredAudioFiles();
    
    // Sort by creation time (oldest first)
    files.sort((a, b) => a.createdAt - b.createdAt);
    
    // Remove oldest 25% of files
    const filesToRemove = Math.ceil(files.length * 0.25);
    
    for (let i = 0; i < filesToRemove; i++) {
      await this.deleteAudioFile(files[i]?.id ?? '');
    }
    
    console.log(`🗑️ Cleaned up ${filesToRemove} old files`);
  }

  // Delete audio file
  async deleteAudioFile(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['audioFiles', 'audioBuffers', 'processedData'], 'readwrite');
    
    const audioStore = transaction.objectStore('audioFiles');
    const bufferStore = transaction.objectStore('audioBuffers');
    const dataStore = transaction.objectStore('processedData');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = audioStore.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = bufferStore.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = dataStore.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
    ]);
  }

  // Get storage statistics
  async getStorageStats(): Promise<{used: number, quota: number, files: number}> {
    const files = await this.getStoredAudioFiles();
    
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        files: files.length,
      };
    }
    
    return {
      used: 0,
      quota: 0,
      files: files.length,
    };
  }
}

// Global offline manager instance
let offlineManager: OfflineAudioManager | null = null;

export function getOfflineManager(): OfflineAudioManager {
  if (!offlineManager) {
    offlineManager = new OfflineAudioManager();
  }
  return offlineManager;
}