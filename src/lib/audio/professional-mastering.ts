import { EventEmitter } from 'events';

// Core interfaces for mastering tools
export interface MasteringConfig {
  targetLUFS: number;
  truePeakLimit: number;
  dynamicRange: number;
  stereoImaging: StereoImagingConfig;
  frequency: FrequencyConfig;
  dynamics: DynamicsConfig;
  saturation: SaturationConfig;
}

export interface StereoImagingConfig {
  width: number; // 0-200%
  bassMonoFreq: number; // Hz
  correlation: number; // -1 to 1
}

export interface FrequencyConfig {
  lowShelf: EQBand;
  lowMid: EQBand;
  highMid: EQBand;
  highShelf: EQBand;
  tiltEQ: number; // -12 to +12 dB
}

export interface EQBand {
  frequency: number;
  gain: number;
  q: number;
  enabled: boolean;
}

export interface DynamicsConfig {
  compressor: CompressorConfig;
  limiter: LimiterConfig;
  multiband: MultibandConfig;
}

export interface CompressorConfig {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
  makeup: number;
  enabled: boolean;
}

export interface LimiterConfig {
  ceiling: number;
  release: number;
  lookahead: number;
  isr: number; // Internal Sample Rate multiplier
  enabled: boolean;
}

export interface MultibandConfig {
  enabled: boolean;
  bands: CompressorConfig[];
  crossovers: number[];
}

export interface SaturationConfig {
  type: 'tube' | 'tape' | 'digital' | 'analog';
  drive: number;
  harmonics: number;
  character: number;
  enabled: boolean;
}

export interface MasteringResult {
  processedAudio: Float32Array[];
  loudnessLUFS: number;
  truePeak: number;
  dynamicRange: number;
  stereoCorrelation: number;
  spectralAnalysis: SpectralAnalysis;
  qualityMetrics: QualityMetrics;
}

export interface SpectralAnalysis {
  magnitudeSpectrum: Float32Array;
  phaseSpectrum: Float32Array;
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlatness: number;
}

export interface QualityMetrics {
  snr: number;
  thd: number;
  stereoImaging: number;
  dynamicRange: number;
  loudnessRange: number;
}

// FFT Processor for spectral analysis
class FFTProcessor {
  private size: number;
  private cosTable: Float32Array;
  private sinTable: Float32Array;

  constructor(size: number) {
    this.size = size;
    this.generateTrigTables();
  }

  private generateTrigTables(): void {
    this.cosTable = new Float32Array(this.size / 2);
    this.sinTable = new Float32Array(this.size / 2);

    for (let i = 0; i < this.size / 2; i++) {
      const angle = -2 * Math.PI * i / this.size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
  }

  public forward(real: Float32Array, imag: Float32Array): void {
    this.fft(real, imag, false);
  }

  public inverse(real: Float32Array, imag: Float32Array): void {
    this.fft(real, imag, true);

    // Normalize
    const scale = 1.0 / this.size;
    for (let i = 0; i < this.size; i++) {
      real[i] *= scale;
      imag[i] *= scale;
    }
  }

  private fft(real: Float32Array, imag: Float32Array, inverse: boolean): void {
    // Bit-reverse permutation
    this.bitReversePermutation(real, imag);

    // Cooley-Tukey FFT
    for (let length = 2; length <= this.size; length *= 2) {
      const step = this.size / length;
      for (let i = 0; i < this.size; i += length) {
        for (let j = 0; j < length / 2; j++) {
          const u = i + j;
          const v = i + j + length / 2;
          const twiddle = j * step;

          let cos = this.cosTable[twiddle];
          let sin = this.sinTable[twiddle];

          if (inverse) sin = -sin;

          const tempReal = real[v] * cos - imag[v] * sin;
          const tempImag = real[v] * sin + imag[v] * cos;

          real[v] = real[u] - tempReal;
          imag[v] = imag[u] - tempImag;
          real[u] += tempReal;
          imag[u] += tempImag;
        }
      }
    }
  }

  private bitReversePermutation(real: Float32Array, imag: Float32Array): void {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      const j = this.reverseBits(i, Math.log2(n));
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
  }

  private reverseBits(num: number, bits: number): number {
    let result = 0;
    for (let i = 0; i < bits; i++) {
      result = (result << 1) | (num & 1);
      num >>= 1;
    }
    return result;
  }
}

// Professional EQ with multiple filter types
class ProfessionalEQ {
  private sampleRate: number;
  private filters: BiquadFilter[] = [];

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public configureBands(config: FrequencyConfig): void {
    this.filters = [];

    // Low shelf
    if (config.lowShelf.enabled) {
      this.filters.push(this.createLowShelf(
        config.lowShelf.frequency,
        config.lowShelf.gain,
        config.lowShelf.q
      ));
    }

    // Low mid bell
    if (config.lowMid.enabled) {
      this.filters.push(this.createBell(
        config.lowMid.frequency,
        config.lowMid.gain,
        config.lowMid.q
      ));
    }

    // High mid bell
    if (config.highMid.enabled) {
      this.filters.push(this.createBell(
        config.highMid.frequency,
        config.highMid.gain,
        config.highMid.q
      ));
    }

    // High shelf
    if (config.highShelf.enabled) {
      this.filters.push(this.createHighShelf(
        config.highShelf.frequency,
        config.highShelf.gain,
        config.highShelf.q
      ));
    }

    // Tilt EQ
    if (Math.abs(config.tiltEQ) > 0.1) {
      this.filters.push(this.createTiltEQ(config.tiltEQ));
    }
  }

  private createLowShelf(freq: number, gain: number, q: number): BiquadFilter {
    const A = Math.pow(10, gain / 40);
    const w = 2 * Math.PI * freq / this.sampleRate;
    const S = 1;
    const alpha = Math.sin(w) / 2 * Math.sqrt((A + 1/A) * (1/S - 1) + 2);
    const beta = Math.sqrt(A) / q;

    return {
      b0: A * ((A + 1) - (A - 1) * Math.cos(w) + beta * Math.sin(w)),
      b1: 2 * A * ((A - 1) - (A + 1) * Math.cos(w)),
      b2: A * ((A + 1) - (A - 1) * Math.cos(w) - beta * Math.sin(w)),
      a0: (A + 1) + (A - 1) * Math.cos(w) + beta * Math.sin(w),
      a1: -2 * ((A - 1) + (A + 1) * Math.cos(w)),
      a2: (A + 1) + (A - 1) * Math.cos(w) - beta * Math.sin(w),
      x1: 0, x2: 0, y1: 0, y2: 0
    };
  }

  private createHighShelf(freq: number, gain: number, q: number): BiquadFilter {
    const A = Math.pow(10, gain / 40);
    const w = 2 * Math.PI * freq / this.sampleRate;
    const S = 1;
    const alpha = Math.sin(w) / 2 * Math.sqrt((A + 1/A) * (1/S - 1) + 2);
    const beta = Math.sqrt(A) / q;

    return {
      b0: A * ((A + 1) + (A - 1) * Math.cos(w) + beta * Math.sin(w)),
      b1: -2 * A * ((A - 1) + (A + 1) * Math.cos(w)),
      b2: A * ((A + 1) + (A - 1) * Math.cos(w) - beta * Math.sin(w)),
      a0: (A + 1) - (A - 1) * Math.cos(w) + beta * Math.sin(w),
      a1: 2 * ((A - 1) - (A + 1) * Math.cos(w)),
      a2: (A + 1) - (A - 1) * Math.cos(w) - beta * Math.sin(w),
      x1: 0, x2: 0, y1: 0, y2: 0
    };
  }

  private createBell(freq: number, gain: number, q: number): BiquadFilter {
    const A = Math.pow(10, gain / 40);
    const w = 2 * Math.PI * freq / this.sampleRate;
    const alpha = Math.sin(w) / (2 * q);

    return {
      b0: 1 + alpha * A,
      b1: -2 * Math.cos(w),
      b2: 1 - alpha * A,
      a0: 1 + alpha / A,
      a1: -2 * Math.cos(w),
      a2: 1 - alpha / A,
      x1: 0, x2: 0, y1: 0, y2: 0
    };
  }

  private createTiltEQ(gain: number): BiquadFilter {
    // Simple tilt EQ implementation
    const freq = 1000; // Center frequency for tilt
    const A = Math.pow(10, gain / 40);
    const w = 2 * Math.PI * freq / this.sampleRate;
    const alpha = Math.sin(w) / (2 * 0.707); // Q = 0.707

    return {
      b0: 1 + alpha * A,
      b1: -2 * Math.cos(w),
      b2: 1 - alpha * A,
      a0: 1 + alpha / A,
      a1: -2 * Math.cos(w),
      a2: 1 - alpha / A,
      x1: 0, x2: 0, y1: 0, y2: 0
    };
  }

  public process(input: Float32Array): Float32Array {
    let output = new Float32Array(input);

    for (const filter of this.filters) {
      for (let i = 0; i < output.length; i++) {
        const input_sample = output[i];
        const output_sample = (filter.b0 * input_sample + filter.b1 * filter.x1 + filter.b2 * filter.x2
                              - filter.a1 * filter.y1 - filter.a2 * filter.y2) / filter.a0;

        filter.x2 = filter.x1;
        filter.x1 = input_sample;
        filter.y2 = filter.y1;
        filter.y1 = output_sample;

        output[i] = output_sample;
      }
    }

    return output;
  }
}

interface BiquadFilter {
  b0: number; b1: number; b2: number;
  a0: number; a1: number; a2: number;
  x1: number; x2: number; y1: number; y2: number;
}

// Professional compressor with smooth curves
class ProfessionalCompressor {
  private sampleRate: number;
  private envelope: number = 0;
  private gain: number = 1;
  private config: CompressorConfig;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public configure(config: CompressorConfig): void {
    this.config = config;
  }

  public process(input: Float32Array): Float32Array {
    if (!this.config?.enabled) return input;

    const output = new Float32Array(input.length);
    const attackCoeff = Math.exp(-1.0 / (this.config.attack * this.sampleRate));
    const releaseCoeff = Math.exp(-1.0 / (this.config.release * this.sampleRate));

    for (let i = 0; i < input.length; i++) {
      const inputLevel = Math.abs(input[i]);

      // Envelope follower
      const targetEnvelope = inputLevel;
      if (targetEnvelope > this.envelope) {
        this.envelope = targetEnvelope + (this.envelope - targetEnvelope) * attackCoeff;
      } else {
        this.envelope = targetEnvelope + (this.envelope - targetEnvelope) * releaseCoeff;
      }

      // Compression curve with knee
      const envelopeDb = 20 * Math.log10(Math.max(this.envelope, 0.000001));
      let gainReduction = 0;

      if (envelopeDb > this.config.threshold) {
        const overThreshold = envelopeDb - this.config.threshold;

        if (this.config.knee > 0 && overThreshold < this.config.knee) {
          // Soft knee
          const kneeRatio = overThreshold / this.config.knee;
          const softRatio = 1 + (this.config.ratio - 1) * kneeRatio * kneeRatio;
          gainReduction = overThreshold * (1 - 1/softRatio);
        } else {
          // Hard knee
          gainReduction = overThreshold * (1 - 1/this.config.ratio);
        }
      }

      // Apply makeup gain
      const targetGain = Math.pow(10, (-gainReduction + this.config.makeup) / 20);

      // Smooth gain changes
      this.gain += (targetGain - this.gain) * 0.01;

      output[i] = input[i] * this.gain;
    }

    return output;
  }
}

// Brick-wall limiter with lookahead
class BrickwallLimiter {
  private sampleRate: number;
  private delayBuffer: Float32Array;
  private delayIndex: number = 0;
  private envelope: number = 0;
  private config: LimiterConfig;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public configure(config: LimiterConfig): void {
    this.config = config;
    const lookaheadSamples = Math.floor(config.lookahead * this.sampleRate);
    this.delayBuffer = new Float32Array(lookaheadSamples);
  }

  public process(input: Float32Array): Float32Array {
    if (!this.config?.enabled) return input;

    const output = new Float32Array(input.length);
    const releaseCoeff = Math.exp(-1.0 / (this.config.release * this.sampleRate));
    const ceiling = Math.pow(10, this.config.ceiling / 20);

    for (let i = 0; i < input.length; i++) {
      // Store input in delay buffer
      this.delayBuffer[this.delayIndex] = input[i];

      // Look ahead for peaks
      let peakLevel = 0;
      for (let j = 0; j < this.delayBuffer.length; j++) {
        peakLevel = Math.max(peakLevel, Math.abs(this.delayBuffer[j]));
      }

      // Calculate gain reduction
      let gainReduction = 1.0;
      if (peakLevel > ceiling) {
        gainReduction = ceiling / peakLevel;
      }

      // Smooth envelope
      if (gainReduction < this.envelope) {
        this.envelope = gainReduction;
      } else {
        this.envelope += (gainReduction - this.envelope) * (1 - releaseCoeff);
      }

      // Apply limiting to delayed signal
      const delayedSample = this.delayBuffer[this.delayIndex];
      output[i] = delayedSample * this.envelope;

      // Advance delay buffer
      this.delayIndex = (this.delayIndex + 1) % this.delayBuffer.length;
    }

    return output;
  }
}

// Stereo imaging processor
class StereoImagingProcessor {
  private sampleRate: number;
  private bassMonoFilter: BiquadFilter;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public process(left: Float32Array, right: Float32Array, config: StereoImagingConfig):
    { left: Float32Array; right: Float32Array } {

    const outputLeft = new Float32Array(left.length);
    const outputRight = new Float32Array(right.length);

    // Configure bass mono filter
    this.configureBassMonoFilter(config.bassMonoFreq);

    for (let i = 0; i < left.length; i++) {
      // Mid/Side processing
      const mid = (left[i] + right[i]) * 0.5;
      const side = (left[i] - right[i]) * 0.5;

      // Apply stereo width
      const wideMid = mid;
      const wideSide = side * (config.width / 100);

      // Convert back to L/R
      let newLeft = wideMid + wideSide;
      let newRight = wideMid - wideSide;

      // Bass mono processing
      if (config.bassMonoFreq > 0) {
        const bassLeft = this.applyBiquadFilter(left[i], this.bassMonoFilter);
        const bassRight = this.applyBiquadFilter(right[i], this.bassMonoFilter);
        const bassMono = (bassLeft + bassRight) * 0.5;

        // Replace bass frequencies with mono
        newLeft = newLeft - bassLeft + bassMono;
        newRight = newRight - bassRight + bassMono;
      }

      outputLeft[i] = newLeft;
      outputRight[i] = newRight;
    }

    return { left: outputLeft, right: outputRight };
  }

  private configureBassMonoFilter(frequency: number): void {
    // Low-pass filter for bass mono
    const w = 2 * Math.PI * frequency / this.sampleRate;
    const alpha = Math.sin(w) / (2 * 0.707);

    this.bassMonoFilter = {
      b0: (1 - Math.cos(w)) / 2,
      b1: 1 - Math.cos(w),
      b2: (1 - Math.cos(w)) / 2,
      a0: 1 + alpha,
      a1: -2 * Math.cos(w),
      a2: 1 - alpha,
      x1: 0, x2: 0, y1: 0, y2: 0
    };
  }

  private applyBiquadFilter(input: number, filter: BiquadFilter): number {
    const output = (filter.b0 * input + filter.b1 * filter.x1 + filter.b2 * filter.x2
                   - filter.a1 * filter.y1 - filter.a2 * filter.y2) / filter.a0;

    filter.x2 = filter.x1;
    filter.x1 = input;
    filter.y2 = filter.y1;
    filter.y1 = output;

    return output;
  }
}

// Loudness measurement (ITU-R BS.1770-4)
class LoudnessMeter {
  private sampleRate: number;
  private kFilterStage1: BiquadFilter[] = [];
  private kFilterStage2: BiquadFilter[] = [];
  private gatedBlocks: number[] = [];

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.initializeKFilters();
  }

  private initializeKFilters(): void {
    // K-weighting filter implementation (ITU-R BS.1770-4)
    // Stage 1: High-pass filter
    const f0 = 1681.974;
    const w0 = 2 * Math.PI * f0 / this.sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * Math.sqrt(2));

    this.kFilterStage1 = [{
      b0: (1 + cosw0) / 2,
      b1: -(1 + cosw0),
      b2: (1 + cosw0) / 2,
      a0: 1 + alpha,
      a1: -2 * cosw0,
      a2: 1 - alpha,
      x1: 0, x2: 0, y1: 0, y2: 0
    }, {
      b0: (1 + cosw0) / 2,
      b1: -(1 + cosw0),
      b2: (1 + cosw0) / 2,
      a0: 1 + alpha,
      a1: -2 * cosw0,
      a2: 1 - alpha,
      x1: 0, x2: 0, y1: 0, y2: 0
    }];

    // Stage 2: High-frequency shelving filter
    const f02 = 38.13547;
    const w02 = 2 * Math.PI * f02 / this.sampleRate;
    const cosw02 = Math.cos(w02);
    const A = Math.pow(10, 3.999843853973347 / 40);
    const beta = Math.sqrt(A) / 0.7071067811865476;

    this.kFilterStage2 = [{
      b0: A * ((A + 1) + (A - 1) * cosw02 + beta * Math.sin(w02)),
      b1: -2 * A * ((A - 1) + (A + 1) * cosw02),
      b2: A * ((A + 1) + (A - 1) * cosw02 - beta * Math.sin(w02)),
      a0: (A + 1) - (A - 1) * cosw02 + beta * Math.sin(w02),
      a1: 2 * ((A - 1) - (A + 1) * cosw02),
      a2: (A + 1) - (A - 1) * cosw02 - beta * Math.sin(w02),
      x1: 0, x2: 0, y1: 0, y2: 0
    }];
  }

  public measureLUFS(left: Float32Array, right: Float32Array): number {
    // Apply K-weighting filters
    const filteredLeft = this.applyKWeighting(left, 0);
    const filteredRight = this.applyKWeighting(right, 1);

    // Calculate mean square for each channel
    const msLeft = this.calculateMeanSquare(filteredLeft);
    const msRight = this.calculateMeanSquare(filteredRight);

    // Sum with channel weights (stereo: L+R)
    const loudness = msLeft + msRight;

    // Convert to LUFS
    return -0.691 + 10 * Math.log10(loudness);
  }

  private applyKWeighting(input: Float32Array, channelIndex: number): Float32Array {
    let output = new Float32Array(input);

    // Stage 1 filters
    for (const filter of this.kFilterStage1) {
      for (let i = 0; i < output.length; i++) {
        const sample = output[i];
        output[i] = (filter.b0 * sample + filter.b1 * filter.x1 + filter.b2 * filter.x2
                    - filter.a1 * filter.y1 - filter.a2 * filter.y2) / filter.a0;

        filter.x2 = filter.x1;
        filter.x1 = sample;
        filter.y2 = filter.y1;
        filter.y1 = output[i];
      }
    }

    // Stage 2 filter
    for (const filter of this.kFilterStage2) {
      for (let i = 0; i < output.length; i++) {
        const sample = output[i];
        output[i] = (filter.b0 * sample + filter.b1 * filter.x1 + filter.b2 * filter.x2
                    - filter.a1 * filter.y1 - filter.a2 * filter.y2) / filter.a0;

        filter.x2 = filter.x1;
        filter.x1 = sample;
        filter.y2 = filter.y1;
        filter.y1 = output[i];
      }
    }

    return output;
  }

  private calculateMeanSquare(signal: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < signal.length; i++) {
      sum += signal[i] * signal[i];
    }
    return sum / signal.length;
  }
}

// Main Professional Mastering class
export class ProfessionalMastering extends EventEmitter {
  private sampleRate: number;
  private fftProcessor: FFTProcessor;
  private eq: ProfessionalEQ;
  private compressor: ProfessionalCompressor;
  private limiter: BrickwallLimiter;
  private stereoProcessor: StereoImagingProcessor;
  private loudnessMeter: LoudnessMeter;

  constructor(sampleRate: number = 44100) {
    super();
    this.sampleRate = sampleRate;
    this.fftProcessor = new FFTProcessor(2048);
    this.eq = new ProfessionalEQ(sampleRate);
    this.compressor = new ProfessionalCompressor(sampleRate);
    this.limiter = new BrickwallLimiter(sampleRate);
    this.stereoProcessor = new StereoImagingProcessor(sampleRate);
    this.loudnessMeter = new LoudnessMeter(sampleRate);
  }

  public async processAudio(
    audioData: Float32Array[],
    config: MasteringConfig,
    progressCallback?: (progress: number) => void
  ): Promise<MasteringResult> {

    this.emit('processingStart', { config });

    if (audioData.length !== 2) {
      throw new Error('Professional mastering requires stereo input (2 channels)');
    }

    let [left, right] = [new Float32Array(audioData[0]), new Float32Array(audioData[1])];

    // Configure processors
    this.eq.configureBands(config.frequency);
    this.compressor.configure(config.dynamics.compressor);
    this.limiter.configure(config.dynamics.limiter);

    const totalSteps = 6;
    let currentStep = 0;

    // Step 1: EQ Processing
    this.emit('processingStep', { step: 'eq', progress: currentStep / totalSteps });
    left = this.eq.process(left);
    right = this.eq.process(right);
    progressCallback?.((++currentStep / totalSteps) * 100);

    // Step 2: Compression
    this.emit('processingStep', { step: 'compression', progress: currentStep / totalSteps });
    left = this.compressor.process(left);
    right = this.compressor.process(right);
    progressCallback?.((++currentStep / totalSteps) * 100);

    // Step 3: Stereo Imaging
    this.emit('processingStep', { step: 'stereo', progress: currentStep / totalSteps });
    const stereoResult = this.stereoProcessor.process(left, right, config.stereoImaging);
    left = stereoResult.left;
    right = stereoResult.right;
    progressCallback?.((++currentStep / totalSteps) * 100);

    // Step 4: Saturation
    if (config.saturation.enabled) {
      this.emit('processingStep', { step: 'saturation', progress: currentStep / totalSteps });
      const saturationResult = this.applySaturation(left, right, config.saturation);
      left = saturationResult.left;
      right = saturationResult.right;
    }
    progressCallback?.((++currentStep / totalSteps) * 100);

    // Step 5: Limiting
    this.emit('processingStep', { step: 'limiting', progress: currentStep / totalSteps });
    left = this.limiter.process(left);
    right = this.limiter.process(right);
    progressCallback?.((++currentStep / totalSteps) * 100);

    // Step 6: Analysis
    this.emit('processingStep', { step: 'analysis', progress: currentStep / totalSteps });
    const analysisResult = await this.analyzeAudio(left, right);
    progressCallback?.(100);

    const result: MasteringResult = {
      processedAudio: [left, right],
      ...analysisResult
    };

    this.emit('processingComplete', result);
    return result;
  }

  private applySaturation(left: Float32Array, right: Float32Array, config: SaturationConfig):
    { left: Float32Array; right: Float32Array } {

    const outputLeft = new Float32Array(left.length);
    const outputRight = new Float32Array(right.length);

    for (let i = 0; i < left.length; i++) {
      outputLeft[i] = this.saturationFunction(left[i], config);
      outputRight[i] = this.saturationFunction(right[i], config);
    }

    return { left: outputLeft, right: outputRight };
  }

  private saturationFunction(input: number, config: SaturationConfig): number {
    const drive = config.drive;
    const harmonics = config.harmonics;

    switch (config.type) {
      case 'tube':
        return this.tubeSaturation(input, drive, harmonics);
      case 'tape':
        return this.tapeSaturation(input, drive, harmonics);
      case 'digital':
        return this.digitalSaturation(input, drive);
      case 'analog':
        return this.analogSaturation(input, drive, harmonics);
      default:
        return input;
    }
  }

  private tubeSaturation(input: number, drive: number, harmonics: number): number {
    const gained = input * drive;
    const sign = Math.sign(gained);
    const abs = Math.abs(gained);

    // Tube-like asymmetric saturation
    const saturated = sign * (1 - Math.exp(-abs * (1 + harmonics)));
    return saturated * 0.7; // Output compensation
  }

  private tapeSaturation(input: number, drive: number, harmonics: number): number {
    const gained = input * drive;

    // Tape-like compression and harmonic saturation
    const compressed = Math.tanh(gained * (1 + harmonics * 0.5));
    return compressed * 0.8;
  }

  private digitalSaturation(input: number, drive: number): number {
    const gained = input * drive;

    // Hard clipping with smoothing
    if (gained > 1) return 1;
    if (gained < -1) return -1;
    return gained;
  }

  private analogSaturation(input: number, drive: number, harmonics: number): number {
    const gained = input * drive;

    // Analog-style soft saturation
    const saturated = (2 / Math.PI) * Math.atan(gained * (1 + harmonics));
    return saturated * 0.9;
  }

  private async analyzeAudio(left: Float32Array, right: Float32Array): Promise<Omit<MasteringResult, 'processedAudio'>> {
    // Loudness measurement
    const loudnessLUFS = this.loudnessMeter.measureLUFS(left, right);

    // True peak measurement
    const truePeak = this.calculateTruePeak(left, right);

    // Dynamic range
    const dynamicRange = this.calculateDynamicRange(left, right);

    // Stereo correlation
    const stereoCorrelation = this.calculateStereoCorrelation(left, right);

    // Spectral analysis
    const spectralAnalysis = this.performSpectralAnalysis(left, right);

    // Quality metrics
    const qualityMetrics = this.calculateQualityMetrics(left, right, spectralAnalysis);

    return {
      loudnessLUFS,
      truePeak,
      dynamicRange,
      stereoCorrelation,
      spectralAnalysis,
      qualityMetrics
    };
  }

  private calculateTruePeak(left: Float32Array, right: Float32Array): number {
    // Oversample by 4x for true peak detection
    const oversampleRate = 4;
    const oversampledLeft = this.oversample(left, oversampleRate);
    const oversampledRight = this.oversample(right, oversampleRate);

    let peak = 0;
    for (let i = 0; i < oversampledLeft.length; i++) {
      peak = Math.max(peak, Math.abs(oversampledLeft[i]), Math.abs(oversampledRight[i]));
    }

    return 20 * Math.log10(peak);
  }

  private oversample(input: Float32Array, factor: number): Float32Array {
    // Simple linear interpolation upsampling
    const output = new Float32Array(input.length * factor);

    for (let i = 0; i < input.length - 1; i++) {
      for (let j = 0; j < factor; j++) {
        const t = j / factor;
        output[i * factor + j] = input[i] * (1 - t) + input[i + 1] * t;
      }
    }

    return output;
  }

  private calculateDynamicRange(left: Float32Array, right: Float32Array): number {
    // Simplified dynamic range calculation
    const blockSize = Math.floor(this.sampleRate * 0.1); // 100ms blocks
    const blocks: number[] = [];

    for (let i = 0; i < left.length - blockSize; i += blockSize) {
      let rms = 0;
      for (let j = 0; j < blockSize; j++) {
        rms += (left[i + j] ** 2 + right[i + j] ** 2) / 2;
      }
      rms = Math.sqrt(rms / blockSize);
      blocks.push(20 * Math.log10(rms + 0.000001));
    }

    blocks.sort((a, b) => b - a);
    const p10 = blocks[Math.floor(blocks.length * 0.1)];
    const p95 = blocks[Math.floor(blocks.length * 0.95)];

    return p10 - p95;
  }

  private calculateStereoCorrelation(left: Float32Array, right: Float32Array): number {
    let correlation = 0;
    let leftPower = 0;
    let rightPower = 0;

    for (let i = 0; i < left.length; i++) {
      correlation += left[i] * right[i];
      leftPower += left[i] ** 2;
      rightPower += right[i] ** 2;
    }

    const denominator = Math.sqrt(leftPower * rightPower);
    return denominator > 0 ? correlation / denominator : 0;
  }

  private performSpectralAnalysis(left: Float32Array, right: Float32Array): SpectralAnalysis {
    const fftSize = 2048;
    const mono = new Float32Array(fftSize);

    // Create mono signal for analysis
    for (let i = 0; i < fftSize && i < left.length; i++) {
      mono[i] = (left[i] + right[i]) * 0.5;
    }

    const real = new Float32Array(mono);
    const imag = new Float32Array(fftSize);

    // Apply window
    for (let i = 0; i < fftSize; i++) {
      const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (fftSize - 1)); // Hann window
      real[i] *= window;
    }

    this.fftProcessor.forward(real, imag);

    const magnitudeSpectrum = new Float32Array(fftSize / 2);
    const phaseSpectrum = new Float32Array(fftSize / 2);

    for (let i = 0; i < fftSize / 2; i++) {
      magnitudeSpectrum[i] = Math.sqrt(real[i] ** 2 + imag[i] ** 2);
      phaseSpectrum[i] = Math.atan2(imag[i], real[i]);
    }

    // Calculate spectral features
    const spectralCentroid = this.calculateSpectralCentroid(magnitudeSpectrum);
    const spectralRolloff = this.calculateSpectralRolloff(magnitudeSpectrum);
    const spectralFlatness = this.calculateSpectralFlatness(magnitudeSpectrum);

    return {
      magnitudeSpectrum,
      phaseSpectrum,
      spectralCentroid,
      spectralRolloff,
      spectralFlatness
    };
  }

  private calculateSpectralCentroid(spectrum: Float32Array): number {
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 1; i < spectrum.length; i++) {
      const frequency = (i * this.sampleRate) / (2 * spectrum.length);
      weightedSum += frequency * spectrum[i];
      magnitudeSum += spectrum[i];
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateSpectralRolloff(spectrum: Float32Array): number {
    let totalEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      totalEnergy += spectrum[i] ** 2;
    }

    const threshold = totalEnergy * 0.85; // 85% rolloff
    let cumulativeEnergy = 0;

    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i] ** 2;
      if (cumulativeEnergy >= threshold) {
        return (i * this.sampleRate) / (2 * spectrum.length);
      }
    }

    return this.sampleRate / 2;
  }

  private calculateSpectralFlatness(spectrum: Float32Array): number {
    let geometricMean = 0;
    let arithmeticMean = 0;
    let count = 0;

    for (let i = 1; i < spectrum.length; i++) {
      if (spectrum[i] > 0) {
        geometricMean += Math.log(spectrum[i]);
        arithmeticMean += spectrum[i];
        count++;
      }
    }

    if (count === 0) return 0;

    geometricMean = Math.exp(geometricMean / count);
    arithmeticMean = arithmeticMean / count;

    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }

  private calculateQualityMetrics(left: Float32Array, right: Float32Array, spectral: SpectralAnalysis): QualityMetrics {
    // SNR calculation
    let signalPower = 0;
    let noisePower = 0;

    for (let i = 0; i < left.length; i++) {
      const signal = (left[i] + right[i]) * 0.5;
      signalPower += signal ** 2;
    }

    // Estimate noise as high-frequency content
    const highFreqStart = Math.floor(spectral.magnitudeSpectrum.length * 0.8);
    for (let i = highFreqStart; i < spectral.magnitudeSpectrum.length; i++) {
      noisePower += spectral.magnitudeSpectrum[i] ** 2;
    }

    const snr = signalPower > 0 && noisePower > 0 ?
      10 * Math.log10(signalPower / noisePower) : 0;

    // THD calculation (simplified)
    const fundamental = spectral.magnitudeSpectrum[1];
    let harmonics = 0;
    for (let i = 2; i < Math.min(10, spectral.magnitudeSpectrum.length); i++) {
      harmonics += spectral.magnitudeSpectrum[i] ** 2;
    }

    const thd = fundamental > 0 ? Math.sqrt(harmonics) / fundamental * 100 : 0;

    // Stereo imaging
    const stereoImaging = this.calculateStereoCorrelation(left, right);

    // Dynamic range (already calculated)
    const dynamicRange = this.calculateDynamicRange(left, right);

    // Loudness range (simplified)
    const loudnessRange = dynamicRange * 0.7; // Approximate conversion

    return {
      snr,
      thd,
      stereoImaging,
      dynamicRange,
      loudnessRange
    };
  }
}

// Export default mastering presets
export const MasteringPresets = {
  MODERN_LOUD: {
    targetLUFS: -14,
    truePeakLimit: -1,
    dynamicRange: 8,
    stereoImaging: {
      width: 110,
      bassMonoFreq: 100,
      correlation: 0.7
    },
    frequency: {
      lowShelf: { frequency: 80, gain: 1, q: 0.7, enabled: true },
      lowMid: { frequency: 250, gain: 0.5, q: 1.2, enabled: true },
      highMid: { frequency: 3000, gain: 1.5, q: 1.0, enabled: true },
      highShelf: { frequency: 10000, gain: 2, q: 0.7, enabled: true },
      tiltEQ: 0.5
    },
    dynamics: {
      compressor: {
        threshold: -18,
        ratio: 3,
        attack: 0.003,
        release: 0.1,
        knee: 2,
        makeup: 3,
        enabled: true
      },
      limiter: {
        ceiling: -1,
        release: 0.05,
        lookahead: 0.005,
        isr: 2,
        enabled: true
      },
      multiband: {
        enabled: false,
        bands: [],
        crossovers: []
      }
    },
    saturation: {
      type: 'analog' as const,
      drive: 1.2,
      harmonics: 0.3,
      character: 0.5,
      enabled: true
    }
  },

  CLASSICAL_DYNAMIC: {
    targetLUFS: -23,
    truePeakLimit: -3,
    dynamicRange: 20,
    stereoImaging: {
      width: 100,
      bassMonoFreq: 60,
      correlation: 0.9
    },
    frequency: {
      lowShelf: { frequency: 60, gain: 0, q: 0.7, enabled: false },
      lowMid: { frequency: 200, gain: 0, q: 1.0, enabled: false },
      highMid: { frequency: 4000, gain: 0.5, q: 0.8, enabled: true },
      highShelf: { frequency: 12000, gain: 1, q: 0.7, enabled: true },
      tiltEQ: 0
    },
    dynamics: {
      compressor: {
        threshold: -30,
        ratio: 1.5,
        attack: 0.01,
        release: 0.3,
        knee: 3,
        makeup: 1,
        enabled: true
      },
      limiter: {
        ceiling: -3,
        release: 0.1,
        lookahead: 0.01,
        isr: 1,
        enabled: true
      },
      multiband: {
        enabled: false,
        bands: [],
        crossovers: []
      }
    },
    saturation: {
      type: 'tube' as const,
      drive: 1.05,
      harmonics: 0.1,
      character: 0.2,
      enabled: true
    }
  },

  BROADCAST_STANDARD: {
    targetLUFS: -16,
    truePeakLimit: -1,
    dynamicRange: 12,
    stereoImaging: {
      width: 105,
      bassMonoFreq: 80,
      correlation: 0.8
    },
    frequency: {
      lowShelf: { frequency: 100, gain: 0.5, q: 0.7, enabled: true },
      lowMid: { frequency: 300, gain: 0, q: 1.0, enabled: false },
      highMid: { frequency: 2500, gain: 1, q: 1.2, enabled: true },
      highShelf: { frequency: 8000, gain: 1.5, q: 0.7, enabled: true },
      tiltEQ: 0.2
    },
    dynamics: {
      compressor: {
        threshold: -20,
        ratio: 2.5,
        attack: 0.005,
        release: 0.15,
        knee: 2.5,
        makeup: 2,
        enabled: true
      },
      limiter: {
        ceiling: -1,
        release: 0.08,
        lookahead: 0.008,
        isr: 2,
        enabled: true
      },
      multiband: {
        enabled: false,
        bands: [],
        crossovers: []
      }
    },
    saturation: {
      type: 'digital' as const,
      drive: 1.1,
      harmonics: 0.2,
      character: 0.3,
      enabled: true
    }
  }
};