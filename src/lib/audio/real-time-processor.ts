/**
 * Real-Time Audio Streaming Processor
 * Low-latency audio processing for live streaming and real-time applications
 */

import { AudioScienceUtils } from './index';

export interface StreamingConfig {
  sampleRate: number;
  bufferSize: 64 | 128 | 256 | 512 | 1024 | 2048;
  channels: 1 | 2 | 4 | 6 | 8;
  bitDepth: 16 | 24 | 32;
  latencyMode: 'ultra-low' | 'low' | 'normal' | 'high-quality';
  enableProcessing: boolean;
  autoGainControl: boolean;
  noiseGate: boolean;
  compressionEnabled: boolean;
}

export interface ProcessingChain {
  id: string;
  name: string;
  processors: AudioStreamProcessor[];
  enabled: boolean;
  bypass: boolean;
  wetDryMix: number; // 0-1
}

export interface StreamMetrics {
  latency: number; // milliseconds
  cpuUsage: number; // percentage
  bufferUnderruns: number;
  droppedFrames: number;
  inputLevel: number; // dB
  outputLevel: number; // dB
  dynamicRange: number; // dB
  totalHarmonicDistortion: number; // percentage
  signalToNoiseRatio: number; // dB
}

export interface AudioStreamProcessor {
  id: string;
  name: string;
  process(input: Float32Array[], sampleRate: number): Float32Array[];
  getLatency(): number; // samples
  enabled: boolean;
  parameters: Record<string, number>;
}

export interface StreamingPreset {
  name: string;
  description: string;
  config: StreamingConfig;
  processingChain: ProcessingChain;
  optimizedFor: 'music' | 'voice' | 'podcast' | 'gaming' | 'broadcast';
}

class NoiseGateProcessor implements AudioStreamProcessor {
  id = 'noise-gate';
  name = 'Noise Gate';
  enabled = true;
  parameters = {
    threshold: -40, // dB
    ratio: 10,
    attack: 0.001, // seconds
    release: 0.1, // seconds
    holdTime: 0.01 // seconds
  };

  private envelope = 0;
  private holdCounter = 0;
  private isOpen = false;

  process(input: Float32Array[], sampleRate: number): Float32Array[] {
    const attackSamples = this.parameters.attack * sampleRate;
    const releaseSamples = this.parameters.release * sampleRate;
    const holdSamples = this.parameters.holdTime * sampleRate;
    const thresholdLinear = AudioScienceUtils.dbToLinear(this.parameters.threshold);

    return input.map(channel => {
      const output = new Float32Array(channel.length);

      for (let i = 0; i < channel.length; i++) {
        const inputLevel = Math.abs(channel[i] ?? 0);

        // Detect if signal is above threshold
        const shouldOpen = inputLevel > thresholdLinear;

        if (shouldOpen) {
          this.isOpen = true;
          this.holdCounter = holdSamples;
        } else if (this.holdCounter > 0) {
          this.holdCounter--;
        } else {
          this.isOpen = false;
        }

        // Calculate target gain
        const targetGain = this.isOpen ? 1 : 0;

        // Smooth gain changes
        if (targetGain > this.envelope) {
          // Attack
          this.envelope += (targetGain - this.envelope) / attackSamples;
        } else {
          // Release
          this.envelope += (targetGain - this.envelope) / releaseSamples;
        }

        output[i] = (channel[i] ?? 0) * this.envelope;
      }

      return output;
    });
  }

  getLatency(): number {
    return 0; // No additional latency
  }
}

class CompressorProcessor implements AudioStreamProcessor {
  id = 'compressor';
  name = 'Compressor';
  enabled = true;
  parameters = {
    threshold: -20, // dB
    ratio: 4,
    attack: 0.003, // seconds
    release: 0.1, // seconds
    knee: 2, // dB
    makeupGain: 0 // dB
  };

  private envelope = 0;

  process(input: Float32Array[], sampleRate: number): Float32Array[] {
    const attackCoeff = Math.exp(-1 / (this.parameters.attack * sampleRate));
    const releaseCoeff = Math.exp(-1 / (this.parameters.release * sampleRate));
    const thresholdLinear = AudioScienceUtils.dbToLinear(this.parameters.threshold);
    const makeupGainLinear = AudioScienceUtils.dbToLinear(this.parameters.makeupGain);

    return input.map(channel => {
      const output = new Float32Array(channel.length);

      for (let i = 0; i < channel.length; i++) {
        const inputLevel = Math.abs(channel[i] ?? 0);

        // Peak detection with smoothing
        const targetEnv = inputLevel;
        if (targetEnv > this.envelope) {
          this.envelope = targetEnv + (this.envelope - targetEnv) * attackCoeff;
        } else {
          this.envelope = targetEnv + (this.envelope - targetEnv) * releaseCoeff;
        }

        // Calculate compression
        let gain = 1;
        if (this.envelope > thresholdLinear) {
          const overThreshold = AudioScienceUtils.linearToDb(this.envelope) - this.parameters.threshold;
          const compressedOverThreshold = overThreshold / this.parameters.ratio;
          const targetDb = this.parameters.threshold + compressedOverThreshold;
          gain = AudioScienceUtils.dbToLinear(targetDb) / this.envelope;
        }

        output[i] = (channel[i] ?? 0) * gain * makeupGainLinear;
      }

      return output;
    });
  }

  getLatency(): number {
    return 0; // No additional latency
  }
}

class EQProcessor implements AudioStreamProcessor {
  id = 'eq';
  name = 'Equalizer';
  enabled = true;
  parameters = {
    lowGain: 0, // dB
    lowMidGain: 0, // dB
    midGain: 0, // dB
    highMidGain: 0, // dB
    highGain: 0 // dB
  };

  private filters: BiquadFilterNode[] = [];
  private audioContext?: AudioContext;

  constructor(audioContext?: AudioContext) {
    this.audioContext = audioContext;
    this.initializeFilters();
  }

  private initializeFilters(): void {
    if (!this.audioContext) return;

    // Create 5-band EQ
    const frequencies = [100, 400, 1000, 4000, 10000];
    const types: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

    for (let i = 0; i < 5; i++) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = types[i]!;
      filter.frequency.value = frequencies[i]!;
      filter.Q.value = 0.7;
      this.filters.push(filter);
    }
  }

  process(input: Float32Array[], sampleRate: number): Float32Array[] {
    // Simplified EQ processing without Web Audio API for real-time use
    // In practice, this would use optimized biquad filter implementations
    return input.map(channel => {
      let processed = new Float32Array(channel.length);
      processed.set(channel);

      // Apply simple shelving filters
      const lowShelfed = this.applyLowShelf(processed, 100, this.parameters.lowGain, sampleRate);
      const highShelfed = this.applyHighShelf(lowShelfed, 10000, this.parameters.highGain, sampleRate);
      processed.set(highShelfed);

      return processed;
    });
  }

  private applyLowShelf(input: Float32Array, frequency: number, gain: number, sampleRate: number): Float32Array {
    if (gain === 0) return input;

    const output = new Float32Array(input.length);
    const gainLinear = AudioScienceUtils.dbToLinear(gain);
    const w = 2 * Math.PI * frequency / sampleRate;
    const s = Math.sin(w);
    const c = Math.cos(w);
    const A = Math.sqrt(gainLinear);
    const S = 1; // Shelf slope
    const beta = Math.sqrt(A) / S;

    const b0 = A * ((A + 1) - (A - 1) * c + beta * s);
    const b1 = 2 * A * ((A - 1) - (A + 1) * c);
    const b2 = A * ((A + 1) - (A - 1) * c - beta * s);
    const a0 = (A + 1) + (A - 1) * c + beta * s;
    const a1 = -2 * ((A - 1) + (A + 1) * c);
    const a2 = (A + 1) + (A - 1) * c - beta * s;

    // Normalize coefficients
    const norm = 1 / a0;
    const nb0 = b0 * norm;
    const nb1 = b1 * norm;
    const nb2 = b2 * norm;
    const na1 = a1 * norm;
    const na2 = a2 * norm;

    // Apply biquad filter
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = 0; i < input.length; i++) {
      const x0 = input[i] ?? 0;
      const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;

      output[i] = y0;

      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }

    return output;
  }

  private applyHighShelf(input: Float32Array, frequency: number, gain: number, sampleRate: number): Float32Array {
    if (gain === 0) return input;

    const output = new Float32Array(input.length);
    const gainLinear = AudioScienceUtils.dbToLinear(gain);
    const w = 2 * Math.PI * frequency / sampleRate;
    const s = Math.sin(w);
    const c = Math.cos(w);
    const A = Math.sqrt(gainLinear);
    const S = 1; // Shelf slope
    const beta = Math.sqrt(A) / S;

    const b0 = A * ((A + 1) + (A - 1) * c + beta * s);
    const b1 = -2 * A * ((A - 1) + (A + 1) * c);
    const b2 = A * ((A + 1) + (A - 1) * c - beta * s);
    const a0 = (A + 1) - (A - 1) * c + beta * s;
    const a1 = 2 * ((A - 1) - (A + 1) * c);
    const a2 = (A + 1) - (A - 1) * c - beta * s;

    // Normalize coefficients
    const norm = 1 / a0;
    const nb0 = b0 * norm;
    const nb1 = b1 * norm;
    const nb2 = b2 * norm;
    const na1 = a1 * norm;
    const na2 = a2 * norm;

    // Apply biquad filter
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = 0; i < input.length; i++) {
      const x0 = input[i] ?? 0;
      const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;

      output[i] = y0;

      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }

    return output;
  }

  getLatency(): number {
    return 2; // 2 samples for biquad filter
  }
}

class LimiterProcessor implements AudioStreamProcessor {
  id = 'limiter';
  name = 'Limiter';
  enabled = true;
  parameters = {
    threshold: -1, // dB
    release: 0.05, // seconds
    lookahead: 0.005 // seconds
  };

  private delayBuffer: Float32Array[] = [];
  private envelope = 0;
  private delayLength = 0;

  process(input: Float32Array[], sampleRate: number): Float32Array[] {
    this.delayLength = Math.floor(this.parameters.lookahead * sampleRate);
    const releaseCoeff = Math.exp(-1 / (this.parameters.release * sampleRate));
    const thresholdLinear = AudioScienceUtils.dbToLinear(this.parameters.threshold);

    // Initialize delay buffers if needed
    if (this.delayBuffer.length !== input.length) {
      this.delayBuffer = input.map(channel => new Float32Array(this.delayLength));
    }

    return input.map((channel, channelIndex) => {
      const output = new Float32Array(channel.length);
      const delayBuf = this.delayBuffer[channelIndex]!;

      for (let i = 0; i < channel.length; i++) {
        // Calculate peak level with lookahead
        let peakLevel = 0;
        for (let j = 0; j < this.delayLength; j++) {
          const sampleIndex = i + j;
          const sample = sampleIndex < channel.length ? (channel[sampleIndex] ?? 0) : 0;
          peakLevel = Math.max(peakLevel, Math.abs(sample));
        }

        // Calculate gain reduction
        let gain = 1;
        if (peakLevel > thresholdLinear) {
          gain = thresholdLinear / peakLevel;
        }

        // Smooth gain changes
        const targetEnv = 1 - gain;
        if (targetEnv > this.envelope) {
          this.envelope = targetEnv;
        } else {
          this.envelope += (targetEnv - this.envelope) * (1 - releaseCoeff);
        }

        const finalGain = 1 - this.envelope;

        // Apply gain to delayed signal
        const delayedSample = delayBuf[i % this.delayLength] ?? 0;
        output[i] = delayedSample * finalGain;

        // Update delay buffer
        delayBuf[i % this.delayLength] = channel[i] ?? 0;
      }

      return output;
    });
  }

  getLatency(): number {
    return this.delayLength;
  }
}

export class RealTimeAudioProcessor {
  private config: StreamingConfig;
  private processingChains: Map<string, ProcessingChain> = new Map();
  private metrics: StreamMetrics;
  private isRunning = false;
  private processingStartTime = 0;
  private frameCount = 0;
  private inputAnalyzer?: AnalyserNode;
  private outputAnalyzer?: AnalyserNode;
  private audioContext?: AudioContext;
  private scriptProcessor?: ScriptProcessorNode;

  constructor(config: StreamingConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
    this.initializeDefaultProcessors();
  }

  private initializeMetrics(): StreamMetrics {
    return {
      latency: 0,
      cpuUsage: 0,
      bufferUnderruns: 0,
      droppedFrames: 0,
      inputLevel: -Infinity,
      outputLevel: -Infinity,
      dynamicRange: 0,
      totalHarmonicDistortion: 0,
      signalToNoiseRatio: 0
    };
  }

  private initializeDefaultProcessors(): void {
    // Voice processing chain
    const voiceChain: ProcessingChain = {
      id: 'voice',
      name: 'Voice Processing',
      enabled: true,
      bypass: false,
      wetDryMix: 1.0,
      processors: [
        new NoiseGateProcessor(),
        new CompressorProcessor(),
        new EQProcessor(this.audioContext),
        new LimiterProcessor()
      ]
    };

    this.processingChains.set('voice', voiceChain);

    // Music processing chain
    const musicChain: ProcessingChain = {
      id: 'music',
      name: 'Music Processing',
      enabled: false,
      bypass: false,
      wetDryMix: 1.0,
      processors: [
        new EQProcessor(this.audioContext),
        new CompressorProcessor(),
        new LimiterProcessor()
      ]
    };

    this.processingChains.set('music', musicChain);
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: this.getLatencyHint()
      });

      await this.audioContext.resume();

      // Set up audio processing graph
      this.setupAudioGraph();

      this.isRunning = true;
      this.processingStartTime = performance.now();
      this.frameCount = 0;

      console.log('Real-time audio processor started');
    } catch (error) {
      console.error('Failed to start real-time processor:', error);
      throw error;
    }
  }

  private getLatencyHint(): AudioContextLatencyCategory {
    switch (this.config.latencyMode) {
      case 'ultra-low': return 'interactive';
      case 'low': return 'balanced';
      case 'normal': return 'balanced';
      case 'high-quality': return 'playback';
      default: return 'balanced';
    }
  }

  private setupAudioGraph(): void {
    if (!this.audioContext) return;

    // Create analyzers for input/output monitoring
    this.inputAnalyzer = this.audioContext.createAnalyser();
    this.outputAnalyzer = this.audioContext.createAnalyser();

    this.inputAnalyzer.fftSize = 2048;
    this.outputAnalyzer.fftSize = 2048;

    // Create script processor for real-time processing
    this.scriptProcessor = this.audioContext.createScriptProcessor(
      this.config.bufferSize,
      this.config.channels,
      this.config.channels
    );

    this.scriptProcessor.onaudioprocess = (event) => {
      this.processAudioBlock(event);
    };

    // Connect analyzers
    this.scriptProcessor.connect(this.inputAnalyzer);
    this.inputAnalyzer.connect(this.outputAnalyzer);
    this.outputAnalyzer.connect(this.audioContext.destination);
  }

  private processAudioBlock(event: AudioProcessingEvent): void {
    const processingStart = performance.now();

    try {
      const inputBuffer = event.inputBuffer;
      const outputBuffer = event.outputBuffer;
      const bufferSize = inputBuffer.length;

      // Extract input channels
      const inputChannels: Float32Array[] = [];
      for (let ch = 0; ch < inputBuffer.numberOfChannels; ch++) {
        inputChannels.push(inputBuffer.getChannelData(ch));
      }

      // Process through active chains
      let processedChannels = inputChannels;

      for (const chain of this.processingChains.values()) {
        if (chain.enabled && !chain.bypass) {
          processedChannels = this.processChain(processedChannels, chain);
        }
      }

      // Write to output buffer
      for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
        const outputChannel = outputBuffer.getChannelData(ch);
        const processedChannel = processedChannels[ch];

        if (processedChannel) {
          outputChannel.set(processedChannel);
        } else {
          outputChannel.fill(0);
        }
      }

      // Update metrics
      this.updateMetrics(inputChannels, processedChannels, processingStart);
      this.frameCount++;

    } catch (error) {
      console.error('Audio processing error:', error);
      this.metrics.droppedFrames++;
    }
  }

  private processChain(input: Float32Array[], chain: ProcessingChain): Float32Array[] {
    let processed = input;

    for (const processor of chain.processors) {
      if (processor.enabled) {
        processed = processor.process(processed, this.config.sampleRate);
      }
    }

    // Apply wet/dry mix
    if (chain.wetDryMix < 1.0) {
      const wetAmount = chain.wetDryMix;
      const dryAmount = 1.0 - wetAmount;

      processed = processed.map((channel, index) => {
        const result = new Float32Array(channel.length);
        const dryChannel = input[index];

        for (let i = 0; i < channel.length; i++) {
          result[i] = (channel[i] ?? 0) * wetAmount + (dryChannel?.[i] ?? 0) * dryAmount;
        }

        return result;
      });
    }

    return processed;
  }

  private updateMetrics(
    input: Float32Array[],
    output: Float32Array[],
    processingStart: number
  ): void {
    const processingTime = performance.now() - processingStart;
    const bufferDuration = (this.config.bufferSize / this.config.sampleRate) * 1000;

    // Update CPU usage
    this.metrics.cpuUsage = (processingTime / bufferDuration) * 100;

    // Calculate levels
    this.metrics.inputLevel = this.calculateLevel(input);
    this.metrics.outputLevel = this.calculateLevel(output);

    // Calculate latency
    const totalLatency = this.calculateTotalLatency();
    this.metrics.latency = totalLatency;

    // Calculate dynamic range
    this.metrics.dynamicRange = this.calculateDynamicRange(output);
  }

  private calculateLevel(channels: Float32Array[]): number {
    let maxLevel = 0;

    for (const channel of channels) {
      for (let i = 0; i < channel.length; i++) {
        maxLevel = Math.max(maxLevel, Math.abs(channel[i] ?? 0));
      }
    }

    return maxLevel > 0 ? AudioScienceUtils.linearToDb(maxLevel) : -Infinity;
  }

  private calculateTotalLatency(): number {
    const bufferLatency = (this.config.bufferSize / this.config.sampleRate) * 1000;
    let processingLatency = 0;

    for (const chain of this.processingChains.values()) {
      if (chain.enabled && !chain.bypass) {
        for (const processor of chain.processors) {
          if (processor.enabled) {
            processingLatency += (processor.getLatency() / this.config.sampleRate) * 1000;
          }
        }
      }
    }

    return bufferLatency + processingLatency;
  }

  private calculateDynamicRange(channels: Float32Array[]): number {
    let peak = 0;
    let rmsSum = 0;
    let sampleCount = 0;

    for (const channel of channels) {
      for (let i = 0; i < channel.length; i++) {
        const sample = channel[i] ?? 0;
        peak = Math.max(peak, Math.abs(sample));
        rmsSum += sample * sample;
        sampleCount++;
      }
    }

    const rms = Math.sqrt(rmsSum / sampleCount);
    return peak > 0 && rms > 0 ? AudioScienceUtils.linearToDb(peak / rms) : 0;
  }

  public stop(): void {
    if (!this.isRunning) return;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = undefined;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = undefined;
    }

    this.isRunning = false;
    console.log('Real-time audio processor stopped');
  }

  public getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  public getProcessingChains(): ProcessingChain[] {
    return Array.from(this.processingChains.values());
  }

  public setChainEnabled(chainId: string, enabled: boolean): void {
    const chain = this.processingChains.get(chainId);
    if (chain) {
      chain.enabled = enabled;
    }
  }

  public setProcessorEnabled(chainId: string, processorId: string, enabled: boolean): void {
    const chain = this.processingChains.get(chainId);
    if (chain) {
      const processor = chain.processors.find(p => p.id === processorId);
      if (processor) {
        processor.enabled = enabled;
      }
    }
  }

  public setProcessorParameter(
    chainId: string,
    processorId: string,
    parameter: string,
    value: number
  ): void {
    const chain = this.processingChains.get(chainId);
    if (chain) {
      const processor = chain.processors.find(p => p.id === processorId);
      if (processor && processor.parameters.hasOwnProperty(parameter)) {
        processor.parameters[parameter] = value;
      }
    }
  }

  public getPresets(): StreamingPreset[] {
    return [
      {
        name: 'Podcast Voice',
        description: 'Optimized for spoken word with noise gate and compression',
        config: {
          ...this.config,
          bufferSize: 256,
          latencyMode: 'low'
        },
        processingChain: this.processingChains.get('voice')!,
        optimizedFor: 'podcast'
      },
      {
        name: 'Music Streaming',
        description: 'High-quality music processing with minimal artifacts',
        config: {
          ...this.config,
          bufferSize: 512,
          latencyMode: 'high-quality'
        },
        processingChain: this.processingChains.get('music')!,
        optimizedFor: 'music'
      },
      {
        name: 'Gaming Voice Chat',
        description: 'Ultra-low latency voice processing for gaming',
        config: {
          ...this.config,
          bufferSize: 64,
          latencyMode: 'ultra-low'
        },
        processingChain: this.processingChains.get('voice')!,
        optimizedFor: 'gaming'
      }
    ];
  }

  public applyPreset(preset: StreamingPreset): void {
    this.config = { ...preset.config };

    // Stop and restart with new config
    if (this.isRunning) {
      this.stop();
      this.start();
    }

    // Apply processing chain settings
    const chain = this.processingChains.get(preset.processingChain.id);
    if (chain) {
      Object.assign(chain, preset.processingChain);
    }
  }
}

export default RealTimeAudioProcessor;