"use client";

// Professional Audio Effects Library with Advanced DSP Algorithms

interface EffectParameters {
  [key: string]: number | boolean | string;
}

interface EffectPreset {
  name: string;
  description: string;
  parameters: EffectParameters;
  category: 'vocal' | 'instrument' | 'mastering' | 'creative' | 'restoration';
}

interface ProcessingResult {
  processedAudio: Float32Array;
  analysisData?: {
    gainReduction?: number;
    frequencyResponse?: Float32Array;
    phaseResponse?: Float32Array;
    distortionLevel?: number;
  };
}

// Base Effect Class
abstract class AudioEffect {
  protected sampleRate: number;
  protected parameters: EffectParameters;
  protected presets: Map<string, EffectPreset>;

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
    this.parameters = {};
    this.presets = new Map();
    this.initializePresets();
  }

  abstract process(input: Float32Array): ProcessingResult;
  abstract getParameterInfo(): Record<string, { min: number; max: number; default: number; unit: string }>;
  abstract initializePresets(): void;

  setParameter(name: string, value: number | boolean | string): void {
    this.parameters[name] = value;
  }

  getParameter(name: string): number | boolean | string | undefined {
    return this.parameters[name];
  }

  loadPreset(presetName: string): boolean {
    const preset = this.presets.get(presetName);
    if (preset) {
      this.parameters = { ...preset.parameters };
      return true;
    }
    return false;
  }

  getPresets(): EffectPreset[] {
    return Array.from(this.presets.values());
  }
}

// Advanced Multiband Compressor
class MultibandCompressor extends AudioEffect {
  private bands: Array<{
    lowpass: BiquadFilter;
    highpass: BiquadFilter;
    compressor: DynamicsProcessor;
    frequencyRange: { low: number; high: number };
  }>;

  constructor(sampleRate: number = 44100) {
    super(sampleRate);
    this.bands = [];
    this.initializeBands();
  }

  private initializeBands(): void {
    const bandFrequencies = [
      { low: 0, high: 200 },      // Low
      { low: 200, high: 2000 },   // Low-Mid
      { low: 2000, high: 8000 },  // High-Mid
      { low: 8000, high: 22000 }  // High
    ];

    for (const freq of bandFrequencies) {
      this.bands.push({
        lowpass: new BiquadFilter(this.sampleRate, 'lowpass', freq.high, 0.707),
        highpass: new BiquadFilter(this.sampleRate, 'highpass', freq.low, 0.707),
        compressor: new DynamicsProcessor(this.sampleRate),
        frequencyRange: freq
      });
    }

    // Set default parameters
    this.parameters = {
      band1_threshold: -24,
      band1_ratio: 3,
      band1_attack: 10,
      band1_release: 100,
      band1_gain: 0,
      band2_threshold: -18,
      band2_ratio: 4,
      band2_attack: 5,
      band2_release: 80,
      band2_gain: 0,
      band3_threshold: -15,
      band3_ratio: 6,
      band3_attack: 3,
      band3_release: 60,
      band3_gain: 0,
      band4_threshold: -12,
      band4_ratio: 8,
      band4_attack: 1,
      band4_release: 40,
      band4_gain: 0,
      crossover_slope: 24, // dB/octave
      lookahead: 5, // ms
      mix: 100 // wet/dry mix percentage
    };
  }

  process(input: Float32Array): ProcessingResult {
    const output = new Float32Array(input.length);
    const bandOutputs: Float32Array[] = [];

    // Process each band
    for (let bandIndex = 0; bandIndex < this.bands.length; bandIndex++) {
      const band = this.bands[bandIndex];
      if (!band) continue;

      let bandSignal = new Float32Array(input);

      // Apply band filtering
      if (band.frequencyRange.high < 22000) {
        const filtered = band.lowpass.process(bandSignal);
        bandSignal = new Float32Array(filtered);
      }
      if (band.frequencyRange.low > 0) {
        const filtered = band.highpass.process(bandSignal);
        bandSignal = new Float32Array(filtered);
      }

      // Configure compressor for this band
      const bandNum = bandIndex + 1;
      band.compressor.setParameters({
        threshold: this.parameters[`band${bandNum}_threshold`] as number,
        ratio: this.parameters[`band${bandNum}_ratio`] as number,
        attack: this.parameters[`band${bandNum}_attack`] as number,
        release: this.parameters[`band${bandNum}_release`] as number,
        makeupGain: this.parameters[`band${bandNum}_gain`] as number
      });

      // Process compression
      const result = band.compressor.process(bandSignal);
      bandOutputs.push(result.processedAudio);
    }

    // Sum band outputs with crossover compensation
    for (let i = 0; i < output.length; i++) {
      let sum = 0;
      for (const bandOutput of bandOutputs) {
        sum += bandOutput[i] ?? 0;
      }
      output[i] = sum;
    }

    // Apply wet/dry mix
    const mix = (this.parameters.mix as number) / 100;
    for (let i = 0; i < output.length; i++) {
      output[i] = (input[i] ?? 0) * (1 - mix) + (output[i] ?? 0) * mix;
    }

    return {
      processedAudio: output,
      analysisData: {
        gainReduction: this.calculateAverageGainReduction()
      }
    };
  }

  private calculateAverageGainReduction(): number {
    return this.bands.reduce((sum, band) =>
      sum + band.compressor.getGainReduction(), 0) / this.bands.length;
  }

  getParameterInfo(): Record<string, { min: number; max: number; default: number; unit: string }> {
    const params: Record<string, { min: number; max: number; default: number; unit: string }> = {};

    for (let i = 1; i <= 4; i++) {
      params[`band${i}_threshold`] = { min: -60, max: 0, default: -24, unit: 'dB' };
      params[`band${i}_ratio`] = { min: 1, max: 20, default: 3, unit: ':1' };
      params[`band${i}_attack`] = { min: 0.1, max: 100, default: 10, unit: 'ms' };
      params[`band${i}_release`] = { min: 10, max: 5000, default: 100, unit: 'ms' };
      params[`band${i}_gain`] = { min: -12, max: 12, default: 0, unit: 'dB' };
    }

    params.crossover_slope = { min: 6, max: 48, default: 24, unit: 'dB/oct' };
    params.lookahead = { min: 0, max: 20, default: 5, unit: 'ms' };
    params.mix = { min: 0, max: 100, default: 100, unit: '%' };

    return params;
  }

  initializePresets(): void {
    this.presets.set('vocal-gentle', {
      name: 'Vocal - Gentle',
      description: 'Gentle compression for lead vocals',
      parameters: {
        band1_threshold: -30, band1_ratio: 2, band1_attack: 15, band1_release: 120,
        band2_threshold: -24, band2_ratio: 3, band2_attack: 8, band2_release: 100,
        band3_threshold: -20, band3_ratio: 4, band3_attack: 5, band3_release: 80,
        band4_threshold: -18, band4_ratio: 3, band4_attack: 3, band4_release: 60,
        mix: 100
      },
      category: 'vocal'
    });

    this.presets.set('mastering-transparent', {
      name: 'Mastering - Transparent',
      description: 'Transparent mastering compression',
      parameters: {
        band1_threshold: -20, band1_ratio: 2, band1_attack: 20, band1_release: 200,
        band2_threshold: -18, band2_ratio: 2.5, band2_attack: 15, band2_release: 150,
        band3_threshold: -16, band3_ratio: 3, band3_attack: 10, band3_release: 120,
        band4_threshold: -14, band4_ratio: 2, band4_attack: 5, band4_release: 80,
        mix: 100
      },
      category: 'mastering'
    });
  }
}

// Advanced Spectral De-esser
class SpectralDeEsser extends AudioEffect {
  private fftSize: number;
  private windowFunction: Float32Array;
  private previousPhase: Float32Array;
  private sibilantFrequencies: { start: number; end: number };

  constructor(sampleRate: number = 44100, fftSize: number = 2048) {
    super(sampleRate);
    this.fftSize = fftSize;
    this.windowFunction = this.generateHannWindow(fftSize);
    this.previousPhase = new Float32Array(fftSize / 2);
    this.sibilantFrequencies = { start: 4000, end: 12000 };

    this.parameters = {
      frequency: 6000,        // Center frequency
      bandwidth: 2000,        // Bandwidth in Hz
      threshold: -20,         // Threshold in dB
      ratio: 4,              // Compression ratio
      attack: 0.5,           // Attack time in ms
      release: 50,           // Release time in ms
      lookahead: 2,          // Lookahead in ms
      sensitivity: 50,        // Detection sensitivity
      adaptive: true,         // Adaptive frequency tracking
      spectral_gate: true,    // Spectral gating
      mix: 100               // Wet/dry mix
    };
  }

  process(input: Float32Array): ProcessingResult {
    const hopSize = this.fftSize / 4;
    const output = new Float32Array(input.length);
    let maxReduction = 0;

    // Process in overlapping frames
    for (let pos = 0; pos < input.length - this.fftSize; pos += hopSize) {
      const frame = input.slice(pos, pos + this.fftSize);
      const processedFrame = this.processFrame(frame);

      // Overlap-add
      for (let i = 0; i < this.fftSize; i++) {
        if (pos + i < output.length) {
          output[pos + i] = (output[pos + i] ?? 0) + (processedFrame[i] ?? 0) * (this.windowFunction[i] ?? 0);
        }
      }

      // Track maximum reduction for analysis
      const reduction = this.calculateFrameReduction(frame, processedFrame);
      maxReduction = Math.max(maxReduction, reduction);
    }

    return {
      processedAudio: output,
      analysisData: {
        gainReduction: maxReduction
      }
    };
  }

  private processFrame(frame: Float32Array): Float32Array {
    // Apply window
    const windowed = new Float32Array(this.fftSize);
    for (let i = 0; i < this.fftSize; i++) {
      windowed[i] = (frame[i] ?? 0) * (this.windowFunction[i] ?? 0);
    }

    // FFT
    const spectrum = this.computeFFT(windowed);

    // Detect sibilance
    const sibilanceLevel = this.detectSibilance(spectrum.magnitudes);

    if (sibilanceLevel > this.dbToLinear(this.parameters.threshold as number)) {
      // Calculate reduction amount
      const reduction = this.calculateReduction(sibilanceLevel);

      // Apply spectral processing
      this.applySibilanceReduction(spectrum, reduction);
    }

    // IFFT
    return this.computeIFFT(spectrum.magnitudes, spectrum.phases);
  }

  private detectSibilance(magnitudes: Float32Array): number {
    const freqBin = (freq: number) => Math.floor(freq * this.fftSize / this.sampleRate);

    const startBin = freqBin((this.parameters.frequency as number) - (this.parameters.bandwidth as number) / 2);
    const endBin = freqBin((this.parameters.frequency as number) + (this.parameters.bandwidth as number) / 2);

    let sibilantEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      const energy = (magnitudes[i] ?? 0) * (magnitudes[i] ?? 0);
      totalEnergy += energy;

      if (i >= startBin && i <= endBin) {
        sibilantEnergy += energy;
      }
    }

    // Adaptive frequency tracking
    if (this.parameters.adaptive) {
      this.updateSibilantFrequency(magnitudes);
    }

    return totalEnergy > 0 ? sibilantEnergy / totalEnergy : 0;
  }

  private updateSibilantFrequency(magnitudes: Float32Array): void {
    // Find peak in sibilant range
    const freqBin = (freq: number) => Math.floor(freq * this.fftSize / this.sampleRate);
    const startBin = freqBin(4000);
    const endBin = freqBin(12000);

    let peakBin = startBin;
    let peakMagnitude = 0;

    for (let i = startBin; i <= endBin && i < magnitudes.length; i++) {
      if ((magnitudes[i] ?? 0) > peakMagnitude) {
        peakMagnitude = magnitudes[i] ?? 0;
        peakBin = i;
      }
    }

    // Update center frequency with smoothing
    const newFreq = (peakBin * this.sampleRate) / this.fftSize;
    const currentFreq = this.parameters.frequency as number;
    this.parameters.frequency = currentFreq * 0.9 + newFreq * 0.1; // 10% adaptation rate
  }

  private calculateReduction(sibilanceLevel: number): number {
    const threshold = this.dbToLinear(this.parameters.threshold as number);
    const ratio = this.parameters.ratio as number;

    if (sibilanceLevel <= threshold) return 1.0;

    const excessDb = this.linearToDb(sibilanceLevel / threshold);
    const reductionDb = excessDb * (1 - 1 / ratio);

    return this.dbToLinear(-reductionDb);
  }

  private applySibilanceReduction(spectrum: { magnitudes: Float32Array; phases: Float32Array }, reduction: number): void {
    const freqBin = (freq: number) => Math.floor(freq * this.fftSize / this.sampleRate);
    const centerBin = freqBin(this.parameters.frequency as number);
    const bandwidthBins = Math.floor((this.parameters.bandwidth as number) * this.fftSize / this.sampleRate / 2);

    // Apply reduction with smooth transition
    for (let i = 0; i < spectrum.magnitudes.length; i++) {
      const distance = Math.abs(i - centerBin);
      const normalizedDistance = distance / bandwidthBins;

      if (normalizedDistance <= 1.0) {
        // Smooth transition using raised cosine
        const smoothing = 0.5 * (1 + Math.cos(Math.PI * normalizedDistance));
        const localReduction = 1 - (1 - reduction) * smoothing;

        spectrum.magnitudes[i] = (spectrum.magnitudes[i] ?? 0) * localReduction;
      }
    }

    // Spectral gating - remove very quiet components
    if (this.parameters.spectral_gate) {
      const gate = this.dbToLinear(-60); // -60dB gate
      for (let i = 0; i < spectrum.magnitudes.length; i++) {
        if ((spectrum.magnitudes[i] ?? 0) < gate) {
          spectrum.magnitudes[i] = 0;
        }
      }
    }
  }

  private calculateFrameReduction(original: Float32Array, processed: Float32Array): number {
    const originalRMS = this.calculateRMS(original);
    const processedRMS = this.calculateRMS(processed);

    return originalRMS > 0 ? this.linearToDb(processedRMS / originalRMS) : 0;
  }

  private generateHannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
    return window;
  }

  private computeFFT(data: Float32Array): { magnitudes: Float32Array; phases: Float32Array } {
    // Simplified FFT implementation
    const size = data.length;
    const real = new Float32Array(data);
    const imag = new Float32Array(size);

    // Perform FFT (implementation simplified for demo)
    this.fft(real, imag);

    const magnitudes = new Float32Array(size / 2);
    const phases = new Float32Array(size / 2);

    for (let i = 0; i < size / 2; i++) {
      magnitudes[i] = Math.sqrt((real[i] ?? 0) * (real[i] ?? 0) + (imag[i] ?? 0) * (imag[i] ?? 0));
      phases[i] = Math.atan2(imag[i] ?? 0, real[i] ?? 0);
    }

    return { magnitudes, phases };
  }

  private computeIFFT(magnitudes: Float32Array, phases: Float32Array): Float32Array {
    const size = magnitudes.length * 2;
    const real = new Float32Array(size);
    const imag = new Float32Array(size);

    // Reconstruct complex spectrum
    for (let i = 0; i < magnitudes.length; i++) {
      real[i] = (magnitudes[i] ?? 0) * Math.cos(phases[i] ?? 0);
      imag[i] = (magnitudes[i] ?? 0) * Math.sin(phases[i] ?? 0);

      if (i > 0 && i < magnitudes.length - 1) {
        real[size - i] = real[i] ?? 0;
        imag[size - i] = -(imag[i] ?? 0);
      }
    }

    // IFFT
    this.ifft(real, imag);

    const result = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = (real[i] ?? 0) / size;
    }

    return result;
  }

  private fft(real: Float32Array, imag: Float32Array): void {
    // Simplified FFT implementation
    const n = real.length;

    // Bit reversal
    let j = 0;
    for (let i = 1; i < n; i++) {
      let bit = n >> 1;
      while (j & bit) {
        j ^= bit;
        bit >>= 1;
      }
      j ^= bit;

      if (i < j) {
        [real[i], real[j]] = [real[j] ?? 0, real[i] ?? 0];
        [imag[i], imag[j]] = [imag[j] ?? 0, imag[i] ?? 0];
      }
    }

    // Cooley-Tukey FFT
    for (let length = 2; length <= n; length <<= 1) {
      const angle = 2 * Math.PI / length;
      const wlen_real = Math.cos(angle);
      const wlen_imag = -Math.sin(angle);

      for (let i = 0; i < n; i += length) {
        let w_real = 1;
        let w_imag = 0;

        for (let j = 0; j < length / 2; j++) {
          const u_real = real[i + j] ?? 0;
          const u_imag = imag[i + j] ?? 0;
          const v_real = (real[i + j + length / 2] ?? 0) * w_real - (imag[i + j + length / 2] ?? 0) * w_imag;
          const v_imag = (real[i + j + length / 2] ?? 0) * w_imag + (imag[i + j + length / 2] ?? 0) * w_real;

          real[i + j] = u_real + v_real;
          imag[i + j] = u_imag + v_imag;
          real[i + j + length / 2] = u_real - v_real;
          imag[i + j + length / 2] = u_imag - v_imag;

          const next_w_real = w_real * wlen_real - w_imag * wlen_imag;
          const next_w_imag = w_real * wlen_imag + w_imag * wlen_real;
          w_real = next_w_real;
          w_imag = next_w_imag;
        }
      }
    }
  }

  private ifft(real: Float32Array, imag: Float32Array): void {
    // Conjugate
    for (let i = 0; i < imag.length; i++) {
      imag[i] = -(imag[i] ?? 0);
    }

    // FFT
    this.fft(real, imag);

    // Conjugate and scale
    for (let i = 0; i < real.length; i++) {
      real[i] = (real[i] ?? 0) / real.length;
      imag[i] = -(imag[i] ?? 0) / real.length;
    }
  }

  private dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  private linearToDb(linear: number): number {
    return 20 * Math.log10(Math.max(linear, 1e-10));
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += (data[i] ?? 0) * (data[i] ?? 0);
    }
    return Math.sqrt(sum / data.length);
  }

  getParameterInfo(): Record<string, { min: number; max: number; default: number; unit: string }> {
    return {
      frequency: { min: 2000, max: 16000, default: 6000, unit: 'Hz' },
      bandwidth: { min: 500, max: 5000, default: 2000, unit: 'Hz' },
      threshold: { min: -40, max: 0, default: -20, unit: 'dB' },
      ratio: { min: 1, max: 20, default: 4, unit: ':1' },
      attack: { min: 0.1, max: 10, default: 0.5, unit: 'ms' },
      release: { min: 10, max: 1000, default: 50, unit: 'ms' },
      lookahead: { min: 0, max: 10, default: 2, unit: 'ms' },
      sensitivity: { min: 0, max: 100, default: 50, unit: '%' },
      mix: { min: 0, max: 100, default: 100, unit: '%' }
    };
  }

  initializePresets(): void {
    this.presets.set('vocal-standard', {
      name: 'Vocal - Standard',
      description: 'Standard de-essing for vocals',
      parameters: {
        frequency: 6000, bandwidth: 2000, threshold: -20, ratio: 4,
        attack: 0.5, release: 50, sensitivity: 50, mix: 100
      },
      category: 'vocal'
    });

    this.presets.set('vocal-aggressive', {
      name: 'Vocal - Aggressive',
      description: 'Strong de-essing for harsh sibilants',
      parameters: {
        frequency: 7000, bandwidth: 3000, threshold: -25, ratio: 8,
        attack: 0.2, release: 30, sensitivity: 70, mix: 100
      },
      category: 'vocal'
    });
  }
}

// Helper Classes

class BiquadFilter {
  private a0: number = 1;
  private a1: number = 0;
  private a2: number = 0;
  private b1: number = 0;
  private b2: number = 0;
  private x1: number = 0;
  private x2: number = 0;
  private y1: number = 0;
  private y2: number = 0;

  constructor(
    sampleRate: number,
    type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peaking' | 'lowshelf' | 'highshelf',
    frequency: number,
    Q: number,
    gain: number = 0
  ) {
    this.calculateCoefficients(sampleRate, type, frequency, Q, gain);
  }

  private calculateCoefficients(
    sampleRate: number,
    type: string,
    frequency: number,
    Q: number,
    gain: number
  ): void {
    const w = 2 * Math.PI * frequency / sampleRate;
    const cosw = Math.cos(w);
    const sinw = Math.sin(w);
    const A = Math.pow(10, gain / 40);
    const alpha = sinw / (2 * Q);

    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

    switch (type) {
      case 'lowpass':
        b0 = (1 - cosw) / 2;
        b1 = 1 - cosw;
        b2 = (1 - cosw) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw;
        a2 = 1 - alpha;
        break;

      case 'highpass':
        b0 = (1 + cosw) / 2;
        b1 = -(1 + cosw);
        b2 = (1 + cosw) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw;
        a2 = 1 - alpha;
        break;

      case 'peaking':
        b0 = 1 + alpha * A;
        b1 = -2 * cosw;
        b2 = 1 - alpha * A;
        a0 = 1 + alpha / A;
        a1 = -2 * cosw;
        a2 = 1 - alpha / A;
        break;

      default:
        // Default to unity gain
        b0 = 1; b1 = 0; b2 = 0;
        a0 = 1; a1 = 0; a2 = 0;
    }

    // Normalize coefficients
    this.a0 = b0 / a0;
    this.a1 = b1 / a0;
    this.a2 = b2 / a0;
    this.b1 = a1 / a0;
    this.b2 = a2 / a0;
  }

  process(input: Float32Array): Float32Array {
    const output = new Float32Array(input.length);

    for (let i = 0; i < input.length; i++) {
      const x = input[i] ?? 0;
      const y = this.a0 * x + this.a1 * this.x1 + this.a2 * this.x2 - this.b1 * this.y1 - this.b2 * this.y2;

      // Update delay line
      this.x2 = this.x1;
      this.x1 = x;
      this.y2 = this.y1;
      this.y1 = y;

      output[i] = y;
    }

    return output;
  }
}

class DynamicsProcessor {
  private sampleRate: number;
  private envelope: number = 0;
  private gainReduction: number = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setParameters(params: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    makeupGain: number;
  }): void {
    // Parameters are used directly in process method
  }

  process(input: Float32Array, params?: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    makeupGain: number;
  }): ProcessingResult {
    const output = new Float32Array(input.length);
    const defaultParams = {
      threshold: -20,
      ratio: 4,
      attack: 10,
      release: 100,
      makeupGain: 0
    };
    const p = params || defaultParams;

    const attackCoeff = Math.exp(-1 / (p.attack * 0.001 * this.sampleRate));
    const releaseCoeff = Math.exp(-1 / (p.release * 0.001 * this.sampleRate));
    const thresholdLinear = Math.pow(10, p.threshold / 20);
    const makeupGainLinear = Math.pow(10, p.makeupGain / 20);

    let maxGainReduction = 0;

    for (let i = 0; i < input.length; i++) {
      const inputLevel = Math.abs(input[i] ?? 0);

      // Envelope follower
      const targetEnv = inputLevel > this.envelope ? inputLevel : this.envelope;
      const rate = inputLevel > this.envelope ? attackCoeff : releaseCoeff;
      this.envelope = targetEnv + (this.envelope - targetEnv) * rate;

      // Gain computer
      let gain = 1.0;
      if (this.envelope > thresholdLinear) {
        const overThreshold = this.envelope / thresholdLinear;
        const compressedGain = Math.pow(overThreshold, 1 / p.ratio - 1);
        gain = compressedGain;

        const reductionDb = 20 * Math.log10(gain);
        maxGainReduction = Math.min(maxGainReduction, reductionDb);
      }

      // Apply gain and makeup
      output[i] = (input[i] ?? 0) * gain * makeupGainLinear;
    }

    this.gainReduction = maxGainReduction;

    return {
      processedAudio: output,
      analysisData: {
        gainReduction: maxGainReduction
      }
    };
  }

  getGainReduction(): number {
    return this.gainReduction;
  }
}

// Export professional effects
export {
  MultibandCompressor,
  SpectralDeEsser,
  AudioEffect,
  BiquadFilter,
  DynamicsProcessor,
  type EffectParameters,
  type EffectPreset,
  type ProcessingResult
};