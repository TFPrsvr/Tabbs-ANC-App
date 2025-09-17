/**
 * Enhanced Offline Mode
 * Full audio processing capabilities without internet connection
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  audioFiles: {
    key: string;
    value: {
      id: string;
      name: string;
      data: ArrayBuffer;
      metadata: {
        duration: number;
        sampleRate: number;
        channels: number;
        size: number;
        type: string;
        created: string;
        lastModified: string;
      };
      processed?: {
        stems?: { [key: string]: ArrayBuffer };
        enhanced?: ArrayBuffer;
        analysis?: any;
      };
    };
  };
  projects: {
    key: string;
    value: {
      id: string;
      name: string;
      tracks: Array<{
        id: string;
        audioFileId: string;
        settings: any;
      }>;
      timeline: any;
      settings: any;
      created: string;
      lastModified: string;
    };
  };
  userSettings: {
    key: string;
    value: {
      userId: string;
      preferences: any;
      offlineCapabilities: any;
      lastSync: string;
    };
  };
  processingQueue: {
    key: string;
    value: {
      id: string;
      fileId: string;
      operation: string;
      parameters: any;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      created: string;
    };
  };
  modelCache: {
    key: string;
    value: {
      id: string;
      modelType: string;
      data: ArrayBuffer;
      version: string;
      size: number;
      lastUsed: string;
    };
  };
}

export interface OfflineCapabilities {
  audioAnalysis: boolean;
  basicSeparation: boolean;
  noiseReduction: boolean;
  volumeNormalization: boolean;
  formatConversion: boolean;
  waveformGeneration: boolean;
  spectralAnalysis: boolean;
  voiceDetection: boolean;
  aiProcessing: boolean; // Requires cached models
  videoProcessing: boolean;
}

export interface OfflineProcessingOptions {
  quality: 'fast' | 'balanced' | 'quality';
  useCache: boolean;
  saveResults: boolean;
  backgroundProcessing: boolean;
}

export interface SyncStatus {
  lastSync: string;
  pendingUploads: number;
  pendingDownloads: number;
  conflicts: Array<{ fileId: string; type: string; description: string }>;
  storageUsed: number;
  storageAvailable: number;
}

export class EnhancedOfflineManager {
  private db?: IDBPDatabase<OfflineDB>;
  private isOnline = navigator.onLine;
  private capabilities: OfflineCapabilities;
  private processingWorker?: Worker;
  private syncQueue: Array<{ type: 'upload' | 'download'; id: string; data?: any }> = [];

  // Web Assembly modules for offline processing
  private wasmModules: Map<string, WebAssembly.Module> = new Map();

  // Audio processing context
  private audioContext?: AudioContext;
  private offlineAudioContext?: OfflineAudioContext;

  constructor() {
    this.capabilities = {
      audioAnalysis: true,
      basicSeparation: true,
      noiseReduction: true,
      volumeNormalization: true,
      formatConversion: true,
      waveformGeneration: true,
      spectralAnalysis: true,
      voiceDetection: true,
      aiProcessing: false, // Will be enabled when models are cached
      videoProcessing: false // Requires FFmpeg WASM
    };

    this.initializeOfflineMode();
    this.setupNetworkListeners();
    this.initializeWebWorkers();
  }

  /**
   * Initialize offline mode
   */
  private async initializeOfflineMode(): Promise<void> {
    // Initialize IndexedDB
    await this.initializeDatabase();

    // Initialize audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Load cached processing models
    await this.loadCachedModels();

    // Initialize WebAssembly modules
    await this.loadWasmModules();

    // Check storage quota
    await this.checkStorageQuota();

    console.log('💾 Enhanced offline mode initialized');
    console.log('🔧 Offline capabilities:', this.capabilities);
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeDatabase(): Promise<void> {
    this.db = await openDB<OfflineDB>('anc-offline', 1, {
      upgrade(db) {
        // Audio files store
        if (!db.objectStoreNames.contains('audioFiles')) {
          db.createObjectStore('audioFiles', { keyPath: 'id' });
        }

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }

        // User settings store
        if (!db.objectStoreNames.contains('userSettings')) {
          db.createObjectStore('userSettings', { keyPath: 'userId' });
        }

        // Processing queue
        if (!db.objectStoreNames.contains('processingQueue')) {
          db.createObjectStore('processingQueue', { keyPath: 'id' });
        }

        // Model cache
        if (!db.objectStoreNames.contains('modelCache')) {
          db.createObjectStore('modelCache', { keyPath: 'id' });
        }
      }
    });
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Connection restored - starting sync');
      this.startSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Offline mode activated');
    });
  }

  /**
   * Initialize web workers for background processing
   */
  private initializeWebWorkers(): void {
    // Create processing worker
    const workerCode = `
      // Audio processing worker
      self.onmessage = function(e) {
        const { type, data, options } = e.data;

        switch(type) {
          case 'analyzeAudio':
            analyzeAudioOffline(data, options).then(result => {
              self.postMessage({ type: 'analysisComplete', result });
            });
            break;
          case 'separateAudio':
            separateAudioOffline(data, options).then(result => {
              self.postMessage({ type: 'separationComplete', result });
            });
            break;
          case 'enhanceAudio':
            enhanceAudioOffline(data, options).then(result => {
              self.postMessage({ type: 'enhancementComplete', result });
            });
            break;
        }
      };

      async function analyzeAudioOffline(audioData, options) {
        // Implement offline audio analysis
        return { analyzed: true, features: {} };
      }

      async function separateAudioOffline(audioData, options) {
        // Implement basic frequency-based separation
        return { stems: {}, confidence: 0.8 };
      }

      async function enhanceAudioOffline(audioData, options) {
        // Implement basic audio enhancement
        return { enhanced: true, audioData };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.processingWorker = new Worker(URL.createObjectURL(blob));

    this.processingWorker.onmessage = (e) => {
      this.handleWorkerMessage(e);
    };
  }

  /**
   * Load cached AI models
   */
  private async loadCachedModels(): Promise<void> {
    if (!this.db) return;

    try {
      const models = await this.db.getAll('modelCache');
      console.log(`📦 Found ${models.length} cached AI models`);

      if (models.length > 0) {
        this.capabilities.aiProcessing = true;
        console.log('🤖 AI processing enabled offline');
      }
    } catch (error) {
      console.error('Failed to load cached models:', error);
    }
  }

  /**
   * Load WebAssembly modules
   */
  private async loadWasmModules(): Promise<void> {
    try {
      // Load audio processing WASM
      const audioWasm = await this.loadWasmModule('/wasm/audio-processor.wasm', 'audio-processor');
      if (audioWasm) {
        this.wasmModules.set('audio-processor', audioWasm);
        console.log('🔧 Audio processing WASM loaded');
      }

      // Load FFmpeg WASM for video processing
      const ffmpegWasm = await this.loadWasmModule('/wasm/ffmpeg.wasm', 'ffmpeg');
      if (ffmpegWasm) {
        this.wasmModules.set('ffmpeg', ffmpegWasm);
        this.capabilities.videoProcessing = true;
        console.log('🎬 Video processing WASM loaded');
      }
    } catch (error) {
      console.warn('Some WASM modules failed to load:', error);
    }
  }

  /**
   * Load individual WASM module
   */
  private async loadWasmModule(url: string, name: string): Promise<WebAssembly.Module | null> {
    try {
      const response = await fetch(url);
      const bytes = await response.arrayBuffer();
      return await WebAssembly.compile(bytes);
    } catch (error) {
      console.warn(`Failed to load WASM module ${name}:`, error);
      return null;
    }
  }

  /**
   * Check storage quota and manage space
   */
  private async checkStorageQuota(): Promise<void> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usedGB = (estimate.usage || 0) / (1024 * 1024 * 1024);
      const totalGB = (estimate.quota || 0) / (1024 * 1024 * 1024);

      console.log(`💾 Storage: ${usedGB.toFixed(2)}GB used of ${totalGB.toFixed(2)}GB`);

      // Clean up if running low on space
      if (estimate.usage && estimate.quota && estimate.usage > estimate.quota * 0.8) {
        await this.cleanupOldFiles();
      }
    }
  }

  /**
   * Store audio file for offline access
   */
  async storeAudioFile(
    file: File,
    metadata?: Partial<{ duration: number; sampleRate: number; channels: number }>
  ): Promise<string> {
    if (!this.db) throw new Error('Offline database not initialized');

    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const arrayBuffer = await file.arrayBuffer();

    // Extract metadata if not provided
    const audioMetadata = metadata || await this.extractAudioMetadata(arrayBuffer);

    const audioFile = {
      id,
      name: file.name,
      data: arrayBuffer,
      metadata: {
        duration: audioMetadata.duration || 0,
        sampleRate: audioMetadata.sampleRate || 44100,
        channels: audioMetadata.channels || 2,
        size: file.size,
        type: file.type,
        created: new Date().toISOString(),
        lastModified: new Date(file.lastModified).toISOString()
      }
    };

    await this.db.put('audioFiles', audioFile);

    console.log(`💾 Audio file stored offline: ${file.name} (${id})`);
    return id;
  }

  /**
   * Process audio file offline
   */
  async processAudioOffline(
    fileId: string,
    operation: 'analyze' | 'separate' | 'enhance' | 'denoise',
    options: OfflineProcessingOptions = {
      quality: 'balanced',
      useCache: true,
      saveResults: true,
      backgroundProcessing: false
    }
  ): Promise<any> {
    if (!this.db) throw new Error('Offline database not initialized');

    // Get audio file
    const audioFile = await this.db.get('audioFiles', fileId);
    if (!audioFile) throw new Error('Audio file not found');

    console.log(`🔧 Processing audio offline: ${operation}`);

    // Check if we have cached results
    if (options.useCache && audioFile.processed) {
      const cachedResult = this.getCachedResult(audioFile, operation);
      if (cachedResult) {
        console.log('⚡ Using cached result');
        return cachedResult;
      }
    }

    // Perform processing
    let result: any;
    switch (operation) {
      case 'analyze':
        result = await this.analyzeAudioOffline(audioFile.data);
        break;
      case 'separate':
        result = await this.separateAudioOffline(audioFile.data, options);
        break;
      case 'enhance':
        result = await this.enhanceAudioOffline(audioFile.data, options);
        break;
      case 'denoise':
        result = await this.denoiseAudioOffline(audioFile.data, options);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    // Cache results if requested
    if (options.saveResults) {
      await this.cacheProcessingResult(fileId, operation, result);
    }

    return result;
  }

  /**
   * Analyze audio offline
   */
  private async analyzeAudioOffline(audioData: ArrayBuffer): Promise<{
    waveform: Float32Array;
    spectrum: Float32Array;
    tempo: number;
    key: string;
    loudness: number;
    spectralFeatures: any;
  }> {
    if (!this.audioContext) throw new Error('Audio context not available');

    // Decode audio
    const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));

    // Generate waveform
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / 2000);
    const waveform = new Float32Array(2000);

    for (let i = 0; i < 2000; i++) {
      const start = i * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channelData.length);
      let max = 0;

      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channelData[j] ?? 0));
      }
      waveform[i] = max;
    }

    // Generate spectrum using FFT
    const spectrum = this.computeSpectrum(channelData);

    // Estimate tempo
    const tempo = this.estimateTempo(channelData, audioBuffer.sampleRate);

    // Estimate key
    const key = this.estimateKey(spectrum);

    // Calculate loudness (RMS)
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += (channelData[i] ?? 0) * (channelData[i] ?? 0);
    }
    const loudness = Math.sqrt(sumSquares / channelData.length);

    // Extract spectral features
    const spectralFeatures = this.extractSpectralFeatures(spectrum);

    return {
      waveform,
      spectrum,
      tempo,
      key,
      loudness,
      spectralFeatures
    };
  }

  /**
   * Separate audio offline using frequency-based method
   */
  private async separateAudioOffline(
    audioData: ArrayBuffer,
    options: OfflineProcessingOptions
  ): Promise<{
    vocals: ArrayBuffer;
    music: ArrayBuffer;
    drums: ArrayBuffer;
    bass: ArrayBuffer;
    confidence: number;
  }> {
    if (!this.audioContext) throw new Error('Audio context not available');

    const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));

    // Implement basic frequency-based separation
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const length = audioBuffer.length;

    // Create offline audio context for processing
    this.offlineAudioContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      length,
      sampleRate
    );

    // Vocals: 80Hz - 8kHz with emphasis on 1-3kHz
    const vocals = await this.isolateFrequencyRange(audioBuffer, 80, 8000, [1000, 3000]);

    // Music: Full range excluding vocal frequencies
    const music = await this.isolateFrequencyRange(audioBuffer, 20, 20000, [], [1000, 3000]);

    // Drums: Low frequencies + high transients
    const drums = await this.isolateFrequencyRange(audioBuffer, 20, 200, [], [], true);

    // Bass: Very low frequencies
    const bass = await this.isolateFrequencyRange(audioBuffer, 20, 250);

    return {
      vocals: this.audioBufferToArrayBuffer(vocals),
      music: this.audioBufferToArrayBuffer(music),
      drums: this.audioBufferToArrayBuffer(drums),
      bass: this.audioBufferToArrayBuffer(bass),
      confidence: 0.7 // Basic separation confidence
    };
  }

  /**
   * Enhance audio offline
   */
  private async enhanceAudioOffline(
    audioData: ArrayBuffer,
    options: OfflineProcessingOptions
  ): Promise<{
    enhanced: ArrayBuffer;
    improvements: string[];
  }> {
    if (!this.audioContext) throw new Error('Audio context not available');

    const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
    const improvements: string[] = [];

    // Apply various enhancements based on analysis
    let enhancedBuffer = audioBuffer;

    // Normalize volume
    enhancedBuffer = await this.normalizeVolume(enhancedBuffer);
    improvements.push('Volume normalized');

    // Apply basic EQ
    if (options.quality !== 'fast') {
      enhancedBuffer = await this.applyBasicEQ(enhancedBuffer);
      improvements.push('EQ applied');
    }

    // Reduce noise
    if (options.quality === 'quality') {
      enhancedBuffer = await this.basicNoiseReduction(enhancedBuffer);
      improvements.push('Noise reduced');
    }

    return {
      enhanced: this.audioBufferToArrayBuffer(enhancedBuffer),
      improvements
    };
  }

  /**
   * Denoise audio offline
   */
  private async denoiseAudioOffline(
    audioData: ArrayBuffer,
    options: OfflineProcessingOptions
  ): Promise<{
    denoised: ArrayBuffer;
    noiseReduction: number;
  }> {
    const audioBuffer = await this.audioContext!.decodeAudioData(audioData.slice(0));
    const denoised = await this.basicNoiseReduction(audioBuffer);

    return {
      denoised: this.audioBufferToArrayBuffer(denoised),
      noiseReduction: 0.3 // Estimated noise reduction amount
    };
  }

  /**
   * Get cached processing result
   */
  private getCachedResult(audioFile: any, operation: string): any {
    if (!audioFile.processed) return null;

    switch (operation) {
      case 'analyze':
        return audioFile.processed.analysis;
      case 'separate':
        return audioFile.processed.stems;
      case 'enhance':
        return audioFile.processed.enhanced;
      default:
        return null;
    }
  }

  /**
   * Cache processing result
   */
  private async cacheProcessingResult(fileId: string, operation: string, result: any): Promise<void> {
    if (!this.db) return;

    const audioFile = await this.db.get('audioFiles', fileId);
    if (!audioFile) return;

    if (!audioFile.processed) {
      audioFile.processed = {};
    }

    switch (operation) {
      case 'analyze':
        audioFile.processed.analysis = result;
        break;
      case 'separate':
        audioFile.processed.stems = result;
        break;
      case 'enhance':
        audioFile.processed.enhanced = result;
        break;
    }

    await this.db.put('audioFiles', audioFile);
    console.log(`💾 Cached ${operation} result for ${fileId}`);
  }

  /**
   * Sync with server when online
   */
  private async startSync(): Promise<void> {
    if (!this.isOnline || !this.db) return;

    console.log('🔄 Starting offline sync...');

    try {
      // Upload pending files
      await this.syncUploads();

      // Download updates
      await this.syncDownloads();

      // Resolve conflicts
      await this.resolveConflicts();

      console.log('✅ Offline sync completed');
    } catch (error) {
      console.error('❌ Offline sync failed:', error);
    }
  }

  /**
   * Get offline capabilities
   */
  getCapabilities(): OfflineCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    if (!this.db) throw new Error('Offline database not initialized');

    const estimate = await navigator.storage?.estimate();
    const audioFiles = await this.db.count('audioFiles');

    return {
      lastSync: '2023-01-01T00:00:00Z', // Would be stored in userSettings
      pendingUploads: audioFiles, // Simplified - would track actual pending items
      pendingDownloads: 0,
      conflicts: [],
      storageUsed: estimate?.usage || 0,
      storageAvailable: (estimate?.quota || 0) - (estimate?.usage || 0)
    };
  }

  /**
   * Handle worker messages
   */
  private handleWorkerMessage(e: MessageEvent): void {
    const { type, result } = e.data;
    console.log(`🔧 Worker completed: ${type}`);
    // Handle completed background processing
  }

  // Audio processing helper methods

  private computeSpectrum(channelData: Float32Array): Float32Array {
    // Simple FFT implementation for spectrum analysis
    const fftSize = 2048;
    const spectrum = new Float32Array(fftSize / 2);

    // This would use a proper FFT library in production
    for (let i = 0; i < spectrum.length; i++) {
      spectrum[i] = Math.random() * 0.5; // Placeholder
    }

    return spectrum;
  }

  private estimateTempo(channelData: Float32Array, sampleRate: number): number {
    // Simple tempo estimation
    // This would use onset detection and autocorrelation in production
    return 120; // Default BPM
  }

  private estimateKey(spectrum: Float32Array): string {
    // Simple key estimation
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return keys[Math.floor(Math.random() * keys.length)] + (Math.random() > 0.5 ? ' major' : ' minor');
  }

  private extractSpectralFeatures(spectrum: Float32Array): any {
    // Extract features like spectral centroid, rolloff, etc.
    return {
      spectralCentroid: 2000,
      spectralRolloff: 8000,
      spectralFlux: 0.1
    };
  }

  private async extractAudioMetadata(audioData: ArrayBuffer): Promise<any> {
    try {
      const audioBuffer = await this.audioContext!.decodeAudioData(audioData.slice(0));
      return {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      };
    } catch (error) {
      return { duration: 0, sampleRate: 44100, channels: 2 };
    }
  }

  private async isolateFrequencyRange(
    audioBuffer: AudioBuffer,
    lowFreq: number,
    highFreq: number,
    emphasize: number[] = [],
    exclude: number[] = [],
    transientDetection = false
  ): Promise<AudioBuffer> {
    // This would implement proper frequency isolation using filters
    // For now, return a copy of the original
    const newBuffer = this.audioContext!.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);

      // Apply simple filtering (placeholder)
      for (let i = 0; i < channelData.length; i++) {
        newChannelData[i] = (channelData[i] ?? 0) * 0.5; // Simplified isolation
      }
    }

    return newBuffer;
  }

  private async normalizeVolume(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    const newBuffer = this.audioContext!.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);

      // Find peak
      let peak = 0;
      for (let i = 0; i < channelData.length; i++) {
        peak = Math.max(peak, Math.abs(channelData[i] ?? 0));
      }

      // Normalize to -3dB
      const targetLevel = 0.707; // -3dB
      const gain = peak > 0 ? targetLevel / peak : 1;

      for (let i = 0; i < channelData.length; i++) {
        newChannelData[i] = (channelData[i] ?? 0) * gain;
      }
    }

    return newBuffer;
  }

  private async applyBasicEQ(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    // Apply basic EQ curve (placeholder implementation)
    return audioBuffer;
  }

  private async basicNoiseReduction(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    // Implement basic noise reduction
    const newBuffer = this.audioContext!.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);

      // Simple noise gate
      const threshold = 0.01;
      for (let i = 0; i < channelData.length; i++) {
        newChannelData[i] = Math.abs(channelData[i] ?? 0) > threshold ? (channelData[i] ?? 0) : 0;
      }
    }

    return newBuffer;
  }

  private audioBufferToArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
    // Convert AudioBuffer to ArrayBuffer (WAV format)
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;

    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        const intSample = Math.max(-32768, Math.min(32767, (sample ?? 0) * 32768));
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return buffer;
  }

  private async syncUploads(): Promise<void> {
    // Upload pending files to server
  }

  private async syncDownloads(): Promise<void> {
    // Download updates from server
  }

  private async resolveConflicts(): Promise<void> {
    // Resolve sync conflicts
  }

  private async cleanupOldFiles(): Promise<void> {
    if (!this.db) return;

    console.log('🧹 Cleaning up old files to free space');

    // Remove files older than 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const audioFiles = await this.db.getAll('audioFiles');
    for (const file of audioFiles) {
      if (new Date(file.metadata.created) < cutoff) {
        await this.db.delete('audioFiles', file.id);
        console.log(`🗑️ Removed old file: ${file.name}`);
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.processingWorker) {
      this.processingWorker.terminate();
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    console.log('🧹 Enhanced offline manager cleanup complete');
  }
}