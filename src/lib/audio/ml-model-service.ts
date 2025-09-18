/**
 * ML Model Service - Advanced Audio Separation with Real ML Models
 * Integrates Spleeter, Demucs, and other state-of-the-art models
 */

import { AudioStem, SeparationResult, EnhancementOptions } from './advanced-separation';

export interface MLModelConfig {
  modelType: 'spleeter' | 'demucs' | 'open-unmix';
  quality: 'basic' | 'standard' | 'professional' | 'studio';
  stemTypes: AudioStem['type'][];
  processingMode: 'server' | 'browser' | 'hybrid';
}

export interface MLProcessingOptions extends MLModelConfig {
  maxDuration?: number; // seconds
  chunkSize?: number; // for browser processing
  useGpu?: boolean;
  modelVersion?: string;
}

export class MLModelService {
  private readonly API_BASE = process.env.NEXT_PUBLIC_ML_API_ENDPOINT || '/api/ml';
  private readonly BROWSER_MODEL_CACHE = new Map<string, any>();
  private readonly MAX_BROWSER_DURATION = 30; // seconds

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeBrowserModels();
    }
  }

  /**
   * Main entry point for ML-powered audio separation
   */
  async separateAudio(
    audioBuffer: AudioBuffer,
    options: MLProcessingOptions
  ): Promise<SeparationResult> {
    const startTime = performance.now();

    // Validate input
    this.validateAudioInput(audioBuffer, options);

    // Choose processing strategy
    const strategy = this.selectProcessingStrategy(audioBuffer, options);

    let result: SeparationResult;

    try {
      switch (strategy.mode) {
        case 'server':
          result = await this.processOnServer(audioBuffer, options, strategy);
          break;
        case 'browser':
          result = await this.processInBrowser(audioBuffer, options, strategy);
          break;
        case 'hybrid':
          result = await this.processHybrid(audioBuffer, options, strategy);
          break;
        default:
          throw new Error(`Unknown processing strategy: ${strategy.mode}`);
      }

      const processingTime = performance.now() - startTime;
      result.processingTime = processingTime;

      return result;
    } catch (error) {
      console.error('ML model separation failed:', error);
      throw new Error(`ML separation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Server-side processing using full ML models
   */
  private async processOnServer(
    audioBuffer: AudioBuffer,
    options: MLProcessingOptions,
    strategy: any
  ): Promise<SeparationResult> {
    // Convert AudioBuffer to format suitable for server transmission
    const audioData = this.audioBufferToBlob(audioBuffer);

    const formData = new FormData();
    formData.append('audio', audioData, 'audio.wav');
    formData.append('config', JSON.stringify({
      modelType: options.modelType,
      quality: options.quality,
      stemTypes: options.stemTypes,
      useGpu: options.useGpu ?? true,
      modelVersion: options.modelVersion
    }));

    const response = await fetch(`${this.API_BASE}/separate`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();

    // Convert server response back to AudioBuffers
    const stems = await this.deserializeStems(result.stems);

    return {
      stems,
      processingTime: 0, // Will be set by caller
      quality: options.quality,
      metadata: {
        originalDuration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        detectedGenre: result.metadata?.genre,
        detectedKey: result.metadata?.key,
        detectedTempo: result.metadata?.tempo,
        processingMethod: 'server-ml'
      }
    };
  }

  /**
   * Browser-based processing using ONNX.js models
   */
  private async processInBrowser(
    audioBuffer: AudioBuffer,
    options: MLProcessingOptions,
    strategy: any
  ): Promise<SeparationResult> {
    const modelKey = `${options.modelType}_${options.quality}`;

    // Load model if not cached
    if (!this.BROWSER_MODEL_CACHE.has(modelKey)) {
      await this.loadBrowserModel(options.modelType, options.quality);
    }

    const model = this.BROWSER_MODEL_CACHE.get(modelKey);
    if (!model) {
      throw new Error(`Failed to load browser model: ${modelKey}`);
    }

    // Process audio in chunks for memory efficiency
    const chunkSize = options.chunkSize || 8192;
    const stems = await this.processAudioChunks(audioBuffer, model, options, chunkSize);

    return {
      stems,
      processingTime: 0, // Will be set by caller
      quality: options.quality,
      metadata: {
        originalDuration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        processingMethod: 'browser-onnx'
      }
    };
  }

  /**
   * Hybrid processing - analysis in browser, separation on server
   */
  private async processHybrid(
    audioBuffer: AudioBuffer,
    options: MLProcessingOptions,
    strategy: any
  ): Promise<SeparationResult> {
    // Perform lightweight analysis in browser
    const analysis = await this.analyzeBrowser(audioBuffer);

    // Send analysis + audio to server for optimized processing
    const serverOptions = {
      ...options,
      analysis,
      optimizations: strategy.optimizations
    };

    return this.processOnServer(audioBuffer, serverOptions, strategy);
  }

  /**
   * Load and initialize browser-based ONNX models
   */
  private async loadBrowserModel(modelType: string, quality: string): Promise<void> {
    const modelKey = `${modelType}_${quality}`;

    try {
      // Dynamically import ONNX.js to avoid SSR issues
      const ort = await import('onnxruntime-web');

      // Configure ONNX runtime for WebAssembly
      ort.env.wasm.wasmPaths = '/models/wasm/';
      ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;

      // Load quantized model based on quality setting
      const modelPath = this.getModelPath(modelType, quality);
      const session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm'],
        enableMemPattern: true,
        enableCpuMemArena: true,
        extra: {
          session: {
            set_denormal_as_zero: "1",
            use_env_allocators: "1"
          }
        }
      });

      this.BROWSER_MODEL_CACHE.set(modelKey, {
        session,
        modelType,
        quality,
        loadedAt: Date.now()
      });

      console.log(`Loaded browser ML model: ${modelKey}`);
    } catch (error) {
      console.error(`Failed to load browser model ${modelKey}:`, error);
      throw new Error(`Browser model loading failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process audio in manageable chunks for browser processing
   */
  private async processAudioChunks(
    audioBuffer: AudioBuffer,
    model: any,
    options: MLProcessingOptions,
    chunkSize: number
  ): Promise<AudioStem[]> {
    const channelData = audioBuffer.getChannelData(0);
    const stems: AudioStem[] = [];
    const numChunks = Math.ceil(channelData.length / chunkSize);

    // Initialize stem buffers
    const stemBuffers = new Map<string, Float32Array[]>();
    options.stemTypes.forEach(stemType => {
      stemBuffers.set(stemType, []);
    });

    // Process chunks
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, channelData.length);
      const chunk = channelData.slice(start, end);

      const chunkResults = await this.processChunkWithModel(chunk, model, options);

      // Accumulate results
      chunkResults.forEach((stemData, stemType) => {
        stemBuffers.get(stemType)?.push(stemData);
      });
    }

    // Combine chunks into final stems
    for (const [stemType, chunks] of stemBuffers.entries()) {
      if (chunks.length > 0) {
        const combinedData = this.combineChunks(chunks);
        const stemBuffer = this.createAudioBuffer(combinedData, audioBuffer.sampleRate);

        stems.push({
          id: stemType,
          name: this.getStemDisplayName(stemType as AudioStem['type']),
          type: stemType as AudioStem['type'],
          buffer: stemBuffer,
          originalMix: 0.8, // Estimated
          confidence: 0.85, // Model-dependent
          spectralProfile: new Float32Array(512), // Placeholder
          harmonicContent: this.estimateHarmonicContent(stemType as AudioStem['type']),
          rhythmicContent: this.estimateRhythmicContent(stemType as AudioStem['type'])
        });
      }
    }

    return stems;
  }

  /**
   * Process individual audio chunk with ONNX model
   */
  private async processChunkWithModel(
    chunk: Float32Array,
    model: any,
    options: MLProcessingOptions
  ): Promise<Map<string, Float32Array>> {
    const { session } = model;
    const results = new Map<string, Float32Array>();

    try {
      // Prepare input tensor
      const inputTensor = new Float32Array(chunk.length);
      inputTensor.set(chunk);

      // Create ONNX tensor
      const ort = await import('onnxruntime-web');
      const tensor = new ort.Tensor('float32', inputTensor, [1, 1, chunk.length]);

      // Run inference
      const feeds = { input: tensor };
      const output = await session.run(feeds);

      // Process outputs for each stem type
      options.stemTypes.forEach(stemType => {
        const outputKey = this.getModelOutputKey(stemType, options.modelType);
        if (output[outputKey]) {
          const stemData = output[outputKey].data as Float32Array;
          results.set(stemType, stemData);
        }
      });

      return results;
    } catch (error) {
      console.error('Chunk processing error:', error);
      throw new Error(`Model inference failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate audio input and options
   */
  private validateAudioInput(audioBuffer: AudioBuffer, options: MLProcessingOptions): void {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Invalid audio buffer provided');
    }

    if (audioBuffer.duration > 300) { // 5 minutes
      console.warn('Long audio file detected, processing may take significant time');
    }

    if (options.processingMode === 'browser' && audioBuffer.duration > this.MAX_BROWSER_DURATION) {
      throw new Error(`Browser processing limited to ${this.MAX_BROWSER_DURATION} seconds. Use server mode for longer files.`);
    }

    if (!options.stemTypes || options.stemTypes.length === 0) {
      throw new Error('No stem types specified for separation');
    }
  }

  /**
   * Select optimal processing strategy based on audio and options
   */
  private selectProcessingStrategy(audioBuffer: AudioBuffer, options: MLProcessingOptions) {
    const duration = audioBuffer.duration;
    const isShort = duration <= this.MAX_BROWSER_DURATION;
    const hasServerAccess = !!process.env.NEXT_PUBLIC_ML_API_ENDPOINT;

    if (options.processingMode === 'server' && hasServerAccess) {
      return {
        mode: 'server',
        reason: 'Server processing requested',
        optimizations: ['gpu-acceleration', 'full-model']
      };
    }

    if (options.processingMode === 'browser' && isShort) {
      return {
        mode: 'browser',
        reason: 'Browser processing suitable for short audio',
        optimizations: ['quantized-models', 'chunked-processing']
      };
    }

    if (hasServerAccess) {
      return {
        mode: isShort ? 'hybrid' : 'server',
        reason: 'Optimal strategy based on duration and server availability',
        optimizations: isShort ? ['browser-analysis', 'server-separation'] : ['gpu-acceleration']
      };
    }

    if (isShort) {
      return {
        mode: 'browser',
        reason: 'Fallback to browser processing',
        optimizations: ['quantized-models']
      };
    }

    throw new Error('Cannot process long audio without server access');
  }

  // Helper methods
  private async initializeBrowserModels(): Promise<void> {
    // Pre-load commonly used models for better UX
    try {
      // Only load basic model by default to save bandwidth
      await this.loadBrowserModel('spleeter', 'basic');
    } catch (error) {
      console.warn('Failed to pre-load browser models:', error);
    }
  }

  private getModelPath(modelType: string, quality: string): string {
    return `/models/${modelType}/${quality}/model.onnx`;
  }

  private getModelOutputKey(stemType: string, modelType: string): string {
    const keyMappings: Record<string, Record<string, string>> = {
      'spleeter': {
        'vocals': 'vocals_output',
        'drums': 'drums_output',
        'bass': 'bass_output',
        'other': 'other_output'
      },
      'demucs': {
        'vocals': 'vocals',
        'drums': 'drums',
        'bass': 'bass',
        'other': 'other'
      }
    };

    return keyMappings[modelType]?.[stemType] || stemType;
  }

  private getStemDisplayName(stemType: AudioStem['type']): string {
    const names = {
      'vocals': 'Vocals',
      'drums': 'Drums',
      'bass': 'Bass',
      'piano': 'Piano',
      'guitar': 'Guitar',
      'strings': 'Strings',
      'brass': 'Brass',
      'other': 'Other Instruments'
    };
    return names[stemType] || stemType;
  }

  private estimateHarmonicContent(stemType: AudioStem['type']): number {
    const harmonicValues = {
      'vocals': 0.8,
      'piano': 0.9,
      'guitar': 0.7,
      'strings': 0.85,
      'brass': 0.8,
      'bass': 0.6,
      'drums': 0.1,
      'other': 0.5
    };
    return harmonicValues[stemType] || 0.5;
  }

  private estimateRhythmicContent(stemType: AudioStem['type']): number {
    const rhythmicValues = {
      'drums': 0.95,
      'bass': 0.7,
      'guitar': 0.6,
      'piano': 0.5,
      'vocals': 0.3,
      'strings': 0.2,
      'brass': 0.3,
      'other': 0.4
    };
    return rhythmicValues[stemType] || 0.4;
  }

  private audioBufferToBlob(audioBuffer: AudioBuffer): Blob {
    // Convert AudioBuffer to WAV blob for server transmission
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let sample, offset = 0, pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(audioBuffer.numberOfChannels);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * audioBuffer.numberOfChannels);
    setUint16(audioBuffer.numberOfChannels * 2);
    setUint16(16);
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write audio data
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        sample = Math.max(-1, Math.min(1, channels[i]?.[offset] ?? 0));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private async deserializeStems(stemsData: any[]): Promise<AudioStem[]> {
    const stems: AudioStem[] = [];

    for (const stemData of stemsData) {
      // Convert base64 audio data back to AudioBuffer
      const audioData = atob(stemData.audioData);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i);
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      stems.push({
        id: stemData.id,
        name: stemData.name,
        type: stemData.type,
        buffer: audioBuffer,
        originalMix: stemData.originalMix,
        confidence: stemData.confidence,
        spectralProfile: new Float32Array(stemData.spectralProfile),
        harmonicContent: stemData.harmonicContent,
        rhythmicContent: stemData.rhythmicContent
      });
    }

    return stems;
  }

  private async analyzeBrowser(audioBuffer: AudioBuffer): Promise<any> {
    // Lightweight analysis that can be done in browser
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    return {
      duration: audioBuffer.duration,
      sampleRate,
      channels: audioBuffer.numberOfChannels,
      rms: this.calculateRMS(channelData),
      peak: this.calculatePeak(channelData),
      spectralCentroid: this.calculateSpectralCentroid(channelData, sampleRate)
    };
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += (data[i] ?? 0) * (data[i] ?? 0);
    }
    return Math.sqrt(sum / data.length);
  }

  private calculatePeak(data: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i] ?? 0);
      if (abs > peak) peak = abs;
    }
    return peak;
  }

  private calculateSpectralCentroid(data: Float32Array, sampleRate: number): number {
    // Simplified spectral centroid calculation
    const fftSize = 2048;
    const fftData = data.slice(0, fftSize);

    // Simple FFT approximation for centroid calculation
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < fftSize / 2; i++) {
      const frequency = (i * sampleRate) / fftSize;
      const magnitude = Math.abs(fftData[i] ?? 0) + Math.abs(fftData[fftSize - 1 - i] ?? 0);

      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private combineChunks(chunks: Float32Array[]): Float32Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Float32Array(totalLength);

    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return combined;
  }

  private createAudioBuffer(data: Float32Array, sampleRate: number): AudioBuffer {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = audioContext.createBuffer(1, data.length, sampleRate);
    buffer.getChannelData(0).set(data);
    return buffer;
  }
}

// Export singleton instance
export const mlModelService = new MLModelService();