"use client";

import { resourceManager } from './resource-manager';
import { cacheManager } from './cache-manager';

interface AudioProcessingOptions {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  bufferSize?: number;
  enableCaching?: boolean;
  priority?: 'low' | 'normal' | 'high';
  useGPU?: boolean;
  realtime?: boolean;
}

interface AudioEffect {
  id: string;
  type: 'eq' | 'reverb' | 'compression' | 'noise-gate' | 'limiter' | 'custom';
  parameters: Record<string, number>;
  enabled: boolean;
  order: number;
  gpuAccelerated?: boolean;
}

interface ProcessingResult {
  success: boolean;
  data?: ArrayBuffer;
  metadata?: {
    duration: number;
    sampleRate: number;
    channels: number;
    peaks?: number[];
    rms?: number;
    lufs?: number;
  };
  error?: string;
  cached?: boolean;
  processingTime?: number;
}

class OptimizedAudioPipeline {
  private context: AudioContext | null = null;
  private workletModules: Map<string, AudioWorkletNode> = new Map();
  private effectsChain: AudioEffect[] = [];
  private processingQueue: Array<{
    id: string;
    audioBuffer: ArrayBuffer;
    options: AudioProcessingOptions;
    effects: AudioEffect[];
    resolve: (result: ProcessingResult) => void;
    reject: (error: Error) => void;
  }> = [];

  private isProcessing = false;
  private maxConcurrentProcessing = 3;

  constructor() {
    this.initializeAudioContext();
    this.loadAudioWorklets();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        this.context = new AudioContext();

        // Set optimal audio context settings
        if (this.context.state === 'suspended') {
          await this.context.resume();
        }

        console.log('Audio pipeline initialized:', {
          sampleRate: this.context.sampleRate,
          baseLatency: this.context.baseLatency,
          outputLatency: this.context.outputLatency
        });
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  private async loadAudioWorklets(): Promise<void> {
    if (!this.context) return;

    try {
      // Load custom audio worklet processors
      await this.loadWorklet('spectrum-analyzer', this.createSpectrumAnalyzerWorklet());
      await this.loadWorklet('advanced-compressor', this.createCompressorWorklet());
      await this.loadWorklet('eq-processor', this.createEQWorklet());
      await this.loadWorklet('noise-gate', this.createNoiseGateWorklet());

      console.log('Audio worklets loaded successfully');
    } catch (error) {
      console.error('Failed to load audio worklets:', error);
    }
  }

  private async loadWorklet(name: string, processorCode: string): Promise<void> {
    if (!this.context) return;

    try {
      // Create a blob URL for the processor
      const blob = new Blob([processorCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      await this.context.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      console.log(`Audio worklet '${name}' loaded`);
    } catch (error) {
      console.error(`Failed to load worklet '${name}':`, error);
    }
  }

  private createSpectrumAnalyzerWorklet(): string {
    return `
      class SpectrumAnalyzerProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.fftSize = 2048;
          this.bufferSize = 0;
          this.buffer = new Float32Array(this.fftSize);
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          const output = outputs[0];

          if (input.length > 0) {
            const inputChannel = input[0];

            // Copy input to output (pass-through)
            for (let channel = 0; channel < output.length; channel++) {
              output[channel].set(inputChannel);
            }

            // Collect samples for FFT analysis
            for (let i = 0; i < inputChannel.length; i++) {
              this.buffer[this.bufferSize] = inputChannel[i];
              this.bufferSize++;

              if (this.bufferSize >= this.fftSize) {
                this.analyzeSpectrum();
                this.bufferSize = 0;
              }
            }
          }

          return true;
        }

        analyzeSpectrum() {
          // Simple FFT implementation would go here
          // For now, just send sample data
          this.port.postMessage({
            type: 'spectrum',
            data: Array.from(this.buffer)
          });
        }
      }

      registerProcessor('spectrum-analyzer', SpectrumAnalyzerProcessor);
    `;
  }

  private createCompressorWorklet(): string {
    return `
      class AdvancedCompressorProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.threshold = -20;
          this.ratio = 4;
          this.attack = 0.001;
          this.release = 0.1;
          this.makeupGain = 1;
          this.envelope = 0;
          this.sampleRate = 44100;
        }

        static get parameterDescriptors() {
          return [
            { name: 'threshold', defaultValue: -20, minValue: -60, maxValue: 0 },
            { name: 'ratio', defaultValue: 4, minValue: 1, maxValue: 20 },
            { name: 'attack', defaultValue: 0.001, minValue: 0.0001, maxValue: 1 },
            { name: 'release', defaultValue: 0.1, minValue: 0.01, maxValue: 3 },
            { name: 'makeupGain', defaultValue: 1, minValue: 0.1, maxValue: 10 }
          ];
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          const output = outputs[0];

          if (input.length === 0) return true;

          for (let channel = 0; channel < input.length; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            for (let i = 0; i < inputChannel.length; i++) {
              const sample = inputChannel[i];
              const level = Math.abs(sample);

              // Dynamic range compression
              const targetEnv = level > this.threshold ? level : this.envelope;
              const rate = targetEnv > this.envelope ? this.attack : this.release;

              this.envelope = targetEnv + (this.envelope - targetEnv) * Math.exp(-1 / (rate * this.sampleRate));

              let gain = 1;
              if (this.envelope > this.threshold) {
                const excess = this.envelope - this.threshold;
                const compressedExcess = excess / this.ratio;
                gain = (this.threshold + compressedExcess) / this.envelope;
              }

              outputChannel[i] = sample * gain * this.makeupGain;
            }
          }

          return true;
        }
      }

      registerProcessor('advanced-compressor', AdvancedCompressorProcessor);
    `;
  }

  private createEQWorklet(): string {
    return `
      class EQProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.filters = [];
          this.sampleRate = 44100;
          this.initializeFilters();
        }

        initializeFilters() {
          // Initialize biquad filter coefficients for common EQ bands
          const bands = [60, 170, 350, 1000, 3500, 10000];

          for (let i = 0; i < bands.length; i++) {
            this.filters.push({
              frequency: bands[i],
              gain: 0,
              q: 0.707,
              x1: 0, x2: 0, y1: 0, y2: 0,
              a0: 1, a1: 0, a2: 0, b1: 0, b2: 0
            });
          }
        }

        updateFilter(filter, gain, frequency, q) {
          const w = 2 * Math.PI * frequency / this.sampleRate;
          const cosw = Math.cos(w);
          const sinw = Math.sin(w);
          const A = Math.pow(10, gain / 40);
          const alpha = sinw / (2 * q);

          // Peaking EQ coefficients
          filter.a0 = 1 + alpha * A;
          filter.a1 = -2 * cosw;
          filter.a2 = 1 - alpha * A;
          filter.b1 = (1 + alpha / A) / filter.a0;
          filter.b2 = (-2 * cosw) / filter.a0;
          filter.b0 = (1 - alpha / A) / filter.a0;

          filter.a1 /= filter.a0;
          filter.a2 /= filter.a0;
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          const output = outputs[0];

          if (input.length === 0) return true;

          for (let channel = 0; channel < input.length; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            for (let i = 0; i < inputChannel.length; i++) {
              let sample = inputChannel[i];

              // Apply each EQ band
              for (let j = 0; j < this.filters.length; j++) {
                const filter = this.filters[j];

                const output = filter.a0 * sample + filter.a1 * filter.x1 + filter.a2 * filter.x2
                             - filter.b1 * filter.y1 - filter.b2 * filter.y2;

                filter.x2 = filter.x1;
                filter.x1 = sample;
                filter.y2 = filter.y1;
                filter.y1 = output;

                sample = output;
              }

              outputChannel[i] = sample;
            }
          }

          return true;
        }
      }

      registerProcessor('eq-processor', EQProcessor);
    `;
  }

  private createNoiseGateWorklet(): string {
    return `
      class NoiseGateProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.threshold = -40;
          this.ratio = 10;
          this.attack = 0.001;
          this.release = 0.1;
          this.envelope = 0;
          this.isOpen = false;
          this.sampleRate = 44100;
        }

        static get parameterDescriptors() {
          return [
            { name: 'threshold', defaultValue: -40, minValue: -80, maxValue: 0 },
            { name: 'ratio', defaultValue: 10, minValue: 1, maxValue: 100 },
            { name: 'attack', defaultValue: 0.001, minValue: 0.0001, maxValue: 0.1 },
            { name: 'release', defaultValue: 0.1, minValue: 0.01, maxValue: 2 }
          ];
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          const output = outputs[0];

          if (input.length === 0) return true;

          for (let channel = 0; channel < input.length; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            for (let i = 0; i < inputChannel.length; i++) {
              const sample = inputChannel[i];
              const level = 20 * Math.log10(Math.abs(sample) + 1e-10);

              // Gate logic
              const shouldOpen = level > this.threshold;
              const rate = shouldOpen ? this.attack : this.release;

              const targetGain = shouldOpen ? 1 : 1 / this.ratio;
              this.envelope = targetGain + (this.envelope - targetGain) * Math.exp(-1 / (rate * this.sampleRate));

              outputChannel[i] = sample * this.envelope;
            }
          }

          return true;
        }
      }

      registerProcessor('noise-gate', NoiseGateProcessor);
    `;
  }

  public async processAudio(
    audioBuffer: ArrayBuffer,
    effects: AudioEffect[] = [],
    options: AudioProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = performance.now();

    // Generate cache key based on input and options
    const cacheKey = await this.generateCacheKey(audioBuffer, effects, options);

    // Check cache first if caching is enabled
    if (options.enableCaching !== false) {
      const cached = cacheManager.getAudioAnalysis(cacheKey);
      if (cached) {
        return {
          ...cached,
          cached: true,
          processingTime: performance.now() - startTime
        };
      }
    }

    return new Promise((resolve, reject) => {
      this.processingQueue.push({
        id: `process_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        audioBuffer,
        options,
        effects,
        resolve,
        reject
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const batch = this.processingQueue.splice(0, this.maxConcurrentProcessing);

      // Process batch concurrently
      const promises = batch.map(item => this.processAudioItem(item));

      try {
        await Promise.all(promises);
      } catch (error) {
        console.error('Error processing audio batch:', error);
      }
    }

    this.isProcessing = false;
  }

  private async processAudioItem(item: {
    id: string;
    audioBuffer: ArrayBuffer;
    options: AudioProcessingOptions;
    effects: AudioEffect[];
    resolve: (result: ProcessingResult) => void;
    reject: (error: Error) => void;
  }): Promise<void> {
    const startTime = performance.now();

    try {
      // Submit processing task to resource manager
      const taskId = await resourceManager.addProcessingTask({
        name: `Audio Processing ${item.id}`,
        type: 'audio-render',
        priority: this.getPriorityValue(item.options.priority || 'normal'),
        estimatedDuration: this.estimateProcessingDuration(item.audioBuffer, item.effects),
        requiredResources: {
          cpu: item.options.useGPU ? 20 : 60,
          memory: Math.ceil(item.audioBuffer.byteLength / (1024 * 1024)) * 2, // 2x buffer size in MB
          gpu: item.options.useGPU ? 30 : undefined
        },
        dependencies: [],
        metadata: {
          type: 'audio-processing',
          itemId: item.id,
          effectsCount: item.effects.length,
          useGPU: item.options.useGPU
        }
      });

      // Perform the actual audio processing
      const result = await this.performAudioProcessing(item);

      // Cache the result if caching is enabled
      if (item.options.enableCaching !== false) {
        const cacheKey = await this.generateCacheKey(item.audioBuffer, item.effects, item.options);
        cacheManager.setAudioAnalysis(cacheKey, result); // 30 minutes
      }

      result.processingTime = performance.now() - startTime;
      item.resolve(result);

    } catch (error) {
      console.error('Audio processing failed:', error);
      item.reject(error as Error);
    }
  }

  private async performAudioProcessing(item: {
    audioBuffer: ArrayBuffer;
    options: AudioProcessingOptions;
    effects: AudioEffect[];
  }): Promise<ProcessingResult> {
    if (!this.context) {
      throw new Error('Audio context not available');
    }

    try {
      // Decode audio buffer
      const audioBuffer = await this.context.decodeAudioData(item.audioBuffer.slice(0));

      // Create processing nodes
      const source = this.context.createBufferSource();
      source.buffer = audioBuffer;

      let currentNode: AudioNode = source;
      const analysisNodes: AudioNode[] = [];

      // Apply effects in order
      const sortedEffects = [...item.effects].sort((a, b) => a.order - b.order);

      for (const effect of sortedEffects) {
        if (!effect.enabled) continue;

        const effectNode = await this.createEffectNode(effect);
        if (effectNode) {
          currentNode.connect(effectNode);
          currentNode = effectNode;
          analysisNodes.push(effectNode);
        }
      }

      // Create analyzer for extracting metadata
      const analyzer = this.context.createAnalyser();
      analyzer.fftSize = 2048;
      analyzer.smoothingTimeConstant = 0.8;

      currentNode.connect(analyzer);

      // Create offline processing context for rendering
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      // Recreate the processing chain in offline context
      const offlineSource = offlineContext.createBufferSource();
      offlineSource.buffer = audioBuffer;

      let offlineNode: AudioNode = offlineSource;
      for (const effect of sortedEffects) {
        if (!effect.enabled) continue;

        const offlineEffectNode = await this.createOfflineEffectNode(effect, offlineContext);
        if (offlineEffectNode) {
          offlineNode.connect(offlineEffectNode);
          offlineNode = offlineEffectNode;
        }
      }

      // Connect to destination and start rendering
      offlineNode.connect(offlineContext.destination);
      offlineSource.start(0);

      const renderedBuffer = await offlineContext.startRendering();

      // Extract metadata
      const metadata = await this.extractAudioMetadata(audioBuffer, analyzer);

      // Convert rendered buffer to ArrayBuffer
      const outputBuffer = await this.audioBufferToArrayBuffer(renderedBuffer);

      return {
        success: true,
        data: outputBuffer,
        metadata,
        cached: false
      };

    } catch (error) {
      console.error('Audio processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }

  private async createEffectNode(effect: AudioEffect): Promise<AudioNode | null> {
    if (!this.context) return null;

    try {
      switch (effect.type) {
        case 'eq':
          return new AudioWorkletNode(this.context, 'eq-processor');

        case 'compression':
          const compressor = this.context.createDynamicsCompressor();
          compressor.threshold.value = effect.parameters.threshold || -24;
          compressor.knee.value = effect.parameters.knee || 30;
          compressor.ratio.value = effect.parameters.ratio || 12;
          compressor.attack.value = effect.parameters.attack || 0.003;
          compressor.release.value = effect.parameters.release || 0.25;
          return compressor;

        case 'reverb':
          const convolver = this.context.createConvolver();
          // Load impulse response for reverb effect
          return convolver;

        case 'noise-gate':
          return new AudioWorkletNode(this.context, 'noise-gate');

        case 'limiter':
          const limiter = this.context.createDynamicsCompressor();
          limiter.threshold.value = effect.parameters.threshold || -3;
          limiter.knee.value = 0;
          limiter.ratio.value = 20;
          limiter.attack.value = 0.001;
          limiter.release.value = 0.01;
          return limiter;

        default:
          console.warn(`Unknown effect type: ${effect.type}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to create effect node for ${effect.type}:`, error);
      return null;
    }
  }

  private async createOfflineEffectNode(effect: AudioEffect, context: OfflineAudioContext): Promise<AudioNode | null> {
    try {
      switch (effect.type) {
        case 'compression':
          const compressor = context.createDynamicsCompressor();
          compressor.threshold.value = effect.parameters.threshold || -24;
          compressor.knee.value = effect.parameters.knee || 30;
          compressor.ratio.value = effect.parameters.ratio || 12;
          compressor.attack.value = effect.parameters.attack || 0.003;
          compressor.release.value = effect.parameters.release || 0.25;
          return compressor;

        case 'limiter':
          const limiter = context.createDynamicsCompressor();
          limiter.threshold.value = effect.parameters.threshold || -3;
          limiter.knee.value = 0;
          limiter.ratio.value = 20;
          limiter.attack.value = 0.001;
          limiter.release.value = 0.01;
          return limiter;

        default:
          // For complex effects that require worklets, create simplified versions
          return context.createGain(); // Pass-through for unsupported effects
      }
    } catch (error) {
      console.error(`Failed to create offline effect node for ${effect.type}:`, error);
      return null;
    }
  }

  private async extractAudioMetadata(buffer: AudioBuffer, analyzer: AnalyserNode): Promise<any> {
    const metadata = {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      peaks: [] as number[],
      rms: 0,
      lufs: 0
    };

    // Calculate peaks for each channel
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      let peak = 0;
      let rms = 0;

      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.abs(channelData[i] ?? 0);
        peak = Math.max(peak, sample);
        rms += sample * sample;
      }

      metadata.peaks.push(peak);
      rms = Math.sqrt(rms / channelData.length);
      metadata.rms = Math.max(metadata.rms, rms);
    }

    // Calculate LUFS (simplified approximation)
    metadata.lufs = -23 + 20 * Math.log10(metadata.rms + 1e-10);

    return metadata;
  }

  private async audioBufferToArrayBuffer(buffer: AudioBuffer): Promise<ArrayBuffer> {
    // Create a simple WAV file
    const length = buffer.length * buffer.numberOfChannels * 2; // 16-bit samples
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Convert float32 samples to int16
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i] ?? 0;
        const int16Sample = Math.max(-32768, Math.min(32767, sample * 32767));
        view.setInt16(offset, int16Sample, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  private async generateCacheKey(
    audioBuffer: ArrayBuffer,
    effects: AudioEffect[],
    options: AudioProcessingOptions
  ): Promise<string> {
    // Create a hash of the input parameters for caching
    const keyData = {
      bufferSize: audioBuffer.byteLength,
      effects: effects.map(e => ({ type: e.type, parameters: e.parameters, enabled: e.enabled })),
      options: {
        sampleRate: options.sampleRate,
        channels: options.channels,
        useGPU: options.useGPU
      }
    };

    const keyString = JSON.stringify(keyData);

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `audio_${Math.abs(hash).toString(36)}`;
  }

  private getPriorityValue(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 8;
      case 'normal': return 5;
      case 'low': return 2;
      default: return 5;
    }
  }

  private estimateProcessingDuration(audioBuffer: ArrayBuffer, effects: AudioEffect[]): number {
    // Estimate processing time based on buffer size and effect complexity
    const baseTime = Math.max(1000, audioBuffer.byteLength / 10000); // Base time in ms
    const effectsMultiplier = 1 + (effects.filter(e => e.enabled).length * 0.3);
    return Math.ceil(baseTime * effectsMultiplier);
  }

  public setEffectsChain(effects: AudioEffect[]): void {
    this.effectsChain = [...effects];
  }

  public getEffectsChain(): AudioEffect[] {
    return [...this.effectsChain];
  }

  public addEffect(effect: AudioEffect): void {
    this.effectsChain.push(effect);
    this.effectsChain.sort((a, b) => a.order - b.order);
  }

  public removeEffect(effectId: string): void {
    this.effectsChain = this.effectsChain.filter(e => e.id !== effectId);
  }

  public updateEffect(effectId: string, updates: Partial<AudioEffect>): void {
    const index = this.effectsChain.findIndex(e => e.id === effectId);
    if (index !== -1) {
      const currentEffect = this.effectsChain[index];
      if (currentEffect) {
        this.effectsChain[index] = { ...currentEffect, ...updates };
      }
    }
  }

  public async getSystemCapabilities(): Promise<{
    maxSampleRate: number;
    maxChannels: number;
    supportsWorklets: boolean;
    supportsOfflineProcessing: boolean;
    latencyHint: 'interactive' | 'balanced' | 'playback';
  }> {
    if (!this.context) {
      return {
        maxSampleRate: 48000,
        maxChannels: 2,
        supportsWorklets: false,
        supportsOfflineProcessing: false,
        latencyHint: 'balanced'
      };
    }

    return {
      maxSampleRate: this.context.sampleRate,
      maxChannels: 32, // Typical maximum
      supportsWorklets: 'audioWorklet' in this.context,
      supportsOfflineProcessing: 'OfflineAudioContext' in window,
      latencyHint: 'interactive'
    };
  }

  public destroy(): void {
    // Clean up resources
    if (this.context && this.context.state !== 'closed') {
      this.context.close();
    }

    for (const worklet of this.workletModules.values()) {
      worklet.disconnect();
    }

    this.workletModules.clear();
    this.processingQueue.length = 0;
  }
}

// Export singleton instance
export const audioPipeline = new OptimizedAudioPipeline();
export { type AudioEffect, type AudioProcessingOptions, type ProcessingResult };