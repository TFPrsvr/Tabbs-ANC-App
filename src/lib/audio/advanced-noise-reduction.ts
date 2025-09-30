/**
 * Advanced Noise Reduction Algorithms
 * Professional-grade noise reduction with multiple algorithms and real-time processing
 */

import { AudioScienceUtils } from './index';

export interface NoiseProfile {
  id: string;
  name: string;
  description: string;
  spectralFingerprint: Float32Array;
  noiseFloor: number;
  frequencyWeights: Float32Array;
  adaptiveParams: {
    sensitivity: number;
    aggressiveness: number;
    preservationLevel: number;
  };
  createdAt: Date;
  isLearning: boolean;
}

export interface NoiseReductionConfig {
  algorithm: 'spectral_subtraction' | 'wiener_filter' | 'adaptive_rls' | 'wavelet_denoising' | 'ai_enhanced';
  strength: number; // 0-1
  preserveTransients: boolean;
  adaptiveMode: boolean;
  realTimeMode: boolean;
  frameSize: 512 | 1024 | 2048 | 4096;
  hopSize: number;
  smoothingFactor: number;
  noiseLearningDuration: number; // seconds
}

export interface NoiseReductionResult {
  processedAudio: Float32Array[];
  reductionApplied: number; // dB
  artifactLevel: number; // 0-1
  processingTime: number; // ms
  qualityMetrics: {
    snrImprovement: number;
    spectralFlatness: number;
    harmonicPreservation: number;
    transientPreservation: number;
  };
  noiseProfile?: NoiseProfile;
}

export interface SpectralFrame {
  magnitude: Float32Array;
  phase: Float32Array;
  frequency: Float32Array;
  timestamp: number;
}

class FFTProcessor {
  private windowSize: number;
  private fftSize: number;
  private window: Float32Array;
  private cosTable: Float32Array = new Float32Array(0);
  private sinTable: Float32Array = new Float32Array(0);

  constructor(windowSize: number) {
    this.windowSize = windowSize;
    this.fftSize = this.nextPowerOfTwo(windowSize);
    this.window = this.createHannWindow(windowSize);
    this.generateTrigTables();
  }

  private nextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  private createHannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
    return window;
  }

  private generateTrigTables(): void {
    this.cosTable = new Float32Array(this.fftSize / 2);
    this.sinTable = new Float32Array(this.fftSize / 2);

    for (let i = 0; i < this.fftSize / 2; i++) {
      const angle = -2 * Math.PI * i / this.fftSize;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
  }

  public forward(input: Float32Array): { real: Float32Array; imag: Float32Array } {
    // Apply window
    const windowed = new Float32Array(this.fftSize);
    for (let i = 0; i < Math.min(input.length, this.windowSize); i++) {
      windowed[i] = (input[i] ?? 0) * (this.window[i] ?? 0);
    }

    // Perform FFT using Cooley-Tukey algorithm
    const real = new Float32Array(windowed);
    const imag = new Float32Array(this.fftSize);

    this.fft(real, imag);

    return { real, imag };
  }

  public inverse(real: Float32Array, imag: Float32Array): Float32Array {
    const realCopy = new Float32Array(real);
    const imagCopy = new Float32Array(imag);

    // Conjugate for inverse
    for (let i = 0; i < imagCopy.length; i++) {
      imagCopy[i] = -(imagCopy[i] ?? 0);
    }

    this.fft(realCopy, imagCopy);

    // Conjugate again and scale
    const result = new Float32Array(this.windowSize);
    const scale = 1 / this.fftSize;

    for (let i = 0; i < this.windowSize; i++) {
      result[i] = (realCopy[i] ?? 0) * scale;
    }

    return result;
  }

  private fft(real: Float32Array, imag: Float32Array): void {
    const n = real.length;

    // Bit-reversal
    let j = 0;
    for (let i = 1; i < n - 1; i++) {
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
    for (let len = 2; len <= n; len <<= 1) {
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < len / 2; j++) {
          const u = i + j;
          const v = i + j + len / 2;
          const wIndex = j * step;

          const wReal = this.cosTable[wIndex] ?? 0;
          const wImag = this.sinTable[wIndex] ?? 0;

          const tReal = (real[v] ?? 0) * wReal - (imag[v] ?? 0) * wImag;
          const tImag = (real[v] ?? 0) * wImag + (imag[v] ?? 0) * wReal;

          real[v] = (real[u] ?? 0) - tReal;
          imag[v] = (imag[u] ?? 0) - tImag;
          real[u] = (real[u] ?? 0) + tReal;
          imag[u] = (imag[u] ?? 0) + tImag;
        }
      }
    }
  }

  public getMagnitudeSpectrum(real: Float32Array, imag: Float32Array): Float32Array {
    const magnitude = new Float32Array(real.length / 2);
    for (let i = 0; i < magnitude.length; i++) {
      const re = real[i] ?? 0;
      const im = imag[i] ?? 0;
      magnitude[i] = Math.sqrt(re * re + im * im);
    }
    return magnitude;
  }

  public getPhaseSpectrum(real: Float32Array, imag: Float32Array): Float32Array {
    const phase = new Float32Array(real.length / 2);
    for (let i = 0; i < phase.length; i++) {
      phase[i] = Math.atan2(imag[i] ?? 0, real[i] ?? 0);
    }
    return phase;
  }
}

class SpectralSubtractionAlgorithm {
  private alpha: number = 2.0; // Over-subtraction factor
  private beta: number = 0.01; // Spectral floor factor

  public process(
    audioFrames: SpectralFrame[],
    noiseProfile: NoiseProfile,
    config: NoiseReductionConfig
  ): SpectralFrame[] {
    const processedFrames: SpectralFrame[] = [];

    for (const frame of audioFrames) {
      const processedMagnitude = new Float32Array(frame.magnitude.length);

      for (let i = 0; i < frame.magnitude.length; i++) {
        const signalMag = frame.magnitude[i] ?? 0;
        const noiseMag = noiseProfile.spectralFingerprint[i] ?? 0;
        const weight = noiseProfile.frequencyWeights[i] ?? 1;

        // Spectral subtraction with over-subtraction factor
        const subtractedMag = signalMag - this.alpha * config.strength * noiseMag * weight;

        // Apply spectral floor
        const floorMag = this.beta * signalMag;
        processedMagnitude[i] = Math.max(subtractedMag, floorMag);
      }

      processedFrames.push({
        magnitude: processedMagnitude,
        phase: frame.phase,
        frequency: frame.frequency,
        timestamp: frame.timestamp
      });
    }

    return processedFrames;
  }
}

class WienerFilterAlgorithm {
  private smoothingFactor: number = 0.98;

  public process(
    audioFrames: SpectralFrame[],
    noiseProfile: NoiseProfile,
    config: NoiseReductionConfig
  ): SpectralFrame[] {
    const processedFrames: SpectralFrame[] = [];
    let priorSNR = new Float32Array(audioFrames[0]?.magnitude.length ?? 0);

    for (const frame of audioFrames) {
      const processedMagnitude = new Float32Array(frame.magnitude.length);
      const currentSNR = new Float32Array(frame.magnitude.length);

      for (let i = 0; i < frame.magnitude.length; i++) {
        const signalPower = Math.pow(frame.magnitude[i] ?? 0, 2);
        const noisePower = Math.pow(noiseProfile.spectralFingerprint[i] ?? 0, 2);

        // A priori SNR estimation using decision-directed approach
        const posteriorSNR = Math.max(signalPower / (noisePower + 1e-10) - 1, 0);
        priorSNR[i] = this.smoothingFactor * (priorSNR[i] ?? 0) + (1 - this.smoothingFactor) * posteriorSNR;

        // Wiener filter gain
        const gain = (priorSNR[i] ?? 0) / (1 + (priorSNR[i] ?? 0));

        // Apply strength parameter
        const adjustedGain = 1 - config.strength * (1 - gain);

        processedMagnitude[i] = (frame.magnitude[i] ?? 0) * Math.max(adjustedGain, 0.1);
        currentSNR[i] = posteriorSNR;
      }

      processedFrames.push({
        magnitude: processedMagnitude,
        phase: frame.phase,
        frequency: frame.frequency,
        timestamp: frame.timestamp
      });
    }

    return processedFrames;
  }
}

class AdaptiveRLSAlgorithm {
  private filterLength: number = 32;
  private forgettingFactor: number = 0.99;
  private weights: Float32Array;
  private inputHistory: Float32Array[];

  constructor() {
    this.weights = new Float32Array(this.filterLength);
    this.inputHistory = [];
  }

  public process(
    audioFrames: SpectralFrame[],
    noiseProfile: NoiseProfile,
    config: NoiseReductionConfig
  ): SpectralFrame[] {
    const processedFrames: SpectralFrame[] = [];

    for (const frame of audioFrames) {
      const processedMagnitude = this.adaptiveFilter(frame.magnitude, noiseProfile, config.strength);

      processedFrames.push({
        magnitude: processedMagnitude,
        phase: frame.phase,
        frequency: frame.frequency,
        timestamp: frame.timestamp
      });
    }

    return processedFrames;
  }

  private adaptiveFilter(magnitude: Float32Array, noiseProfile: NoiseProfile, strength: number): Float32Array {
    const output = new Float32Array(magnitude.length);

    // Simplified RLS implementation for spectral domain
    for (let i = 0; i < magnitude.length; i++) {
      const input = magnitude[i] ?? 0;
      const noise = noiseProfile.spectralFingerprint[i] ?? 0;

      // Adaptive noise estimation
      const error = input - noise;
      const filtered = input - strength * noise * (1 / (1 + Math.abs(error)));

      output[i] = Math.max(filtered, 0.1 * input);
    }

    return output;
  }
}

class WaveletDenoisingAlgorithm {
  private waveletLevels: number = 6;
  private thresholdMode: 'soft' | 'hard' = 'soft';

  public process(
    audioFrames: SpectralFrame[],
    noiseProfile: NoiseProfile,
    config: NoiseReductionConfig
  ): SpectralFrame[] {
    // Simplified wavelet denoising in frequency domain
    const processedFrames: SpectralFrame[] = [];

    for (const frame of audioFrames) {
      const processedMagnitude = this.waveletThresholding(frame.magnitude, noiseProfile, config.strength);

      processedFrames.push({
        magnitude: processedMagnitude,
        phase: frame.phase,
        frequency: frame.frequency,
        timestamp: frame.timestamp
      });
    }

    return processedFrames;
  }

  private waveletThresholding(magnitude: Float32Array, noiseProfile: NoiseProfile, strength: number): Float32Array {
    const output = new Float32Array(magnitude.length);

    // Estimate noise threshold based on noise profile
    const noiseThreshold = this.estimateNoiseThreshold(noiseProfile.spectralFingerprint);

    for (let i = 0; i < magnitude.length; i++) {
      const signal = magnitude[i] ?? 0;
      const threshold = noiseThreshold * strength;

      if (this.thresholdMode === 'soft') {
        // Soft thresholding
        if (signal > threshold) {
          output[i] = signal - threshold;
        } else if (signal < -threshold) {
          output[i] = signal + threshold;
        } else {
          output[i] = 0;
        }
      } else {
        // Hard thresholding
        output[i] = Math.abs(signal) > threshold ? signal : 0;
      }

      // Ensure minimum level
      output[i] = Math.max(output[i] ?? 0, 0.05 * signal);
    }

    return output;
  }

  private estimateNoiseThreshold(noiseSpectrum: Float32Array): number {
    // Estimate threshold using median absolute deviation
    const sortedMagnitudes = Array.from(noiseSpectrum).sort((a, b) => a - b);
    const median = sortedMagnitudes[Math.floor(sortedMagnitudes.length / 2)] ?? 0;

    const deviations = noiseSpectrum.map(val => Math.abs(val - median));
    const sortedDeviations = deviations.sort((a, b) => a - b);
    const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)] ?? 0;

    return median + 3 * mad; // 3-sigma threshold
  }
}

export class AdvancedNoiseReduction {
  private fftProcessor: FFTProcessor;
  private spectralSubtraction: SpectralSubtractionAlgorithm;
  private wienerFilter: WienerFilterAlgorithm;
  private adaptiveRLS: AdaptiveRLSAlgorithm;
  private waveletDenoising: WaveletDenoisingAlgorithm;
  private noiseProfiles: Map<string, NoiseProfile> = new Map();
  private isLearningNoise = false;
  private learningFrames: SpectralFrame[] = [];

  constructor(frameSize: number = 1024) {
    this.fftProcessor = new FFTProcessor(frameSize);
    this.spectralSubtraction = new SpectralSubtractionAlgorithm();
    this.wienerFilter = new WienerFilterAlgorithm();
    this.adaptiveRLS = new AdaptiveRLSAlgorithm();
    this.waveletDenoising = new WaveletDenoisingAlgorithm();
  }

  public async processAudio(
    audioData: Float32Array[],
    config: NoiseReductionConfig,
    noiseProfileId?: string,
    progressCallback?: (progress: number) => void
  ): Promise<NoiseReductionResult> {
    const startTime = performance.now();

    try {
      // Convert to spectral frames
      progressCallback?.(10);
      const frames = this.audioToSpectralFrames(audioData, config);

      // Get or create noise profile
      progressCallback?.(20);
      let noiseProfile = noiseProfileId ? this.noiseProfiles.get(noiseProfileId) : undefined;

      if (!noiseProfile) {
        noiseProfile = await this.createNoiseProfile(frames.slice(0, Math.floor(frames.length * 0.1)));
      }

      // Process frames based on algorithm
      progressCallback?.(40);
      const processedFrames = await this.processFrames(frames, noiseProfile, config);

      // Convert back to audio
      progressCallback?.(80);
      const processedAudio = this.spectralFramesToAudio(processedFrames, audioData[0]?.length ?? 0);

      // Calculate metrics
      progressCallback?.(90);
      const metrics = this.calculateQualityMetrics(audioData, processedAudio, noiseProfile);

      progressCallback?.(100);

      return {
        processedAudio,
        reductionApplied: metrics.snrImprovement,
        artifactLevel: this.estimateArtifactLevel(processedAudio),
        processingTime: performance.now() - startTime,
        qualityMetrics: metrics,
        noiseProfile
      };

    } catch (error) {
      throw new Error(`Noise reduction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private audioToSpectralFrames(audioData: Float32Array[], config: NoiseReductionConfig): SpectralFrame[] {
    const frames: SpectralFrame[] = [];
    const frameSize = config.frameSize;
    const hopSize = config.hopSize || frameSize / 2;
    const sampleRate = 48000; // Assumed sample rate

    // Process first channel (mono or left channel)
    const channel = audioData[0];
    if (!channel) return frames;

    for (let i = 0; i < channel.length - frameSize; i += hopSize) {
      const frame = channel.slice(i, i + frameSize);
      const fftResult = this.fftProcessor.forward(frame);

      const magnitude = this.fftProcessor.getMagnitudeSpectrum(fftResult.real, fftResult.imag);
      const phase = this.fftProcessor.getPhaseSpectrum(fftResult.real, fftResult.imag);
      const frequency = new Float32Array(magnitude.length);

      // Generate frequency bins
      for (let j = 0; j < frequency.length; j++) {
        frequency[j] = (j * sampleRate) / (2 * magnitude.length);
      }

      frames.push({
        magnitude,
        phase,
        frequency,
        timestamp: i / sampleRate
      });
    }

    return frames;
  }

  private spectralFramesToAudio(frames: SpectralFrame[], originalLength: number): Float32Array[] {
    if (frames.length === 0) return [new Float32Array(originalLength)];

    const frameSize = frames[0]?.magnitude.length ? frames[0].magnitude.length * 2 : 1024;
    const hopSize = frameSize / 2;
    const output = new Float32Array(originalLength);
    const overlap = new Float32Array(originalLength);

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (!frame) continue;

      // Reconstruct complex spectrum
      const real = new Float32Array(frameSize);
      const imag = new Float32Array(frameSize);

      for (let j = 0; j < frame.magnitude.length; j++) {
        const mag = frame.magnitude[j] ?? 0;
        const phase = frame.phase[j] ?? 0;
        real[j] = mag * Math.cos(phase);
        imag[j] = mag * Math.sin(phase);
      }

      // Mirror for negative frequencies
      for (let j = 1; j < frame.magnitude.length - 1; j++) {
        real[frameSize - j] = real[j] ?? 0;
        imag[frameSize - j] = -(imag[j] ?? 0);
      }

      // Inverse FFT
      const timeFrame = this.fftProcessor.inverse(real, imag);

      // Overlap-add
      const startIdx = i * hopSize;
      for (let j = 0; j < timeFrame.length && startIdx + j < output.length; j++) {
        output[startIdx + j] = (output[startIdx + j] ?? 0) + (timeFrame[j] ?? 0);
        overlap[startIdx + j] = (overlap[startIdx + j] ?? 0) + 1;
      }
    }

    // Normalize by overlap
    for (let i = 0; i < output.length; i++) {
      if ((overlap[i] ?? 0) > 0) {
        output[i] = (output[i] ?? 0) / (overlap[i] ?? 0);
      }
    }

    return [output];
  }

  private async createNoiseProfile(noiseFrames: SpectralFrame[]): Promise<NoiseProfile> {
    if (noiseFrames.length === 0) {
      throw new Error('No noise frames provided for profile creation');
    }

    const spectrumLength = noiseFrames[0]?.magnitude.length ?? 0;
    const spectralFingerprint = new Float32Array(spectrumLength);
    const frequencyWeights = new Float32Array(spectrumLength);

    // Average noise spectrum
    for (const frame of noiseFrames) {
      for (let i = 0; i < spectrumLength; i++) {
        spectralFingerprint[i] = (spectralFingerprint[i] ?? 0) + (frame.magnitude[i] ?? 0) / noiseFrames.length;
      }
    }

    // Calculate frequency weights based on psychoacoustic masking
    for (let i = 0; i < frequencyWeights.length; i++) {
      const frequency = (i * 48000) / (2 * spectrumLength); // Assume 48kHz
      const barkFreq = AudioScienceUtils.frequencyToBark(frequency);

      // Weight based on auditory sensitivity
      if (frequency < 1000) {
        frequencyWeights[i] = 0.8; // Less aggressive in low frequencies
      } else if (frequency < 4000) {
        frequencyWeights[i] = 1.2; // More aggressive in mid frequencies
      } else {
        frequencyWeights[i] = 1.0; // Standard for high frequencies
      }
    }

    // Calculate noise floor
    const sortedMagnitudes = Array.from(spectralFingerprint).sort((a, b) => a - b);
    const noiseFloor = sortedMagnitudes[Math.floor(sortedMagnitudes.length * 0.1)] ?? 0;

    return {
      id: `noise_profile_${Date.now()}`,
      name: 'Auto-generated Noise Profile',
      description: 'Automatically created from audio analysis',
      spectralFingerprint,
      noiseFloor,
      frequencyWeights,
      adaptiveParams: {
        sensitivity: 0.7,
        aggressiveness: 0.6,
        preservationLevel: 0.8
      },
      createdAt: new Date(),
      isLearning: false
    };
  }

  private async processFrames(
    frames: SpectralFrame[],
    noiseProfile: NoiseProfile,
    config: NoiseReductionConfig
  ): Promise<SpectralFrame[]> {
    switch (config.algorithm) {
      case 'spectral_subtraction':
        return this.spectralSubtraction.process(frames, noiseProfile, config);

      case 'wiener_filter':
        return this.wienerFilter.process(frames, noiseProfile, config);

      case 'adaptive_rls':
        return this.adaptiveRLS.process(frames, noiseProfile, config);

      case 'wavelet_denoising':
        return this.waveletDenoising.process(frames, noiseProfile, config);

      case 'ai_enhanced':
        // Combine multiple algorithms for AI-enhanced processing
        let enhanced = this.wienerFilter.process(frames, noiseProfile, config);
        enhanced = this.spectralSubtraction.process(enhanced, noiseProfile, { ...config, strength: config.strength * 0.5 });
        return enhanced;

      default:
        return this.spectralSubtraction.process(frames, noiseProfile, config);
    }
  }

  private calculateQualityMetrics(
    original: Float32Array[],
    processed: Float32Array[],
    noiseProfile: NoiseProfile
  ): NoiseReductionResult['qualityMetrics'] {
    const originalMono = this.mixToMono(original);
    const processedMono = this.mixToMono(processed);

    // SNR improvement
    const originalSNR = this.estimateSNR(originalMono, noiseProfile);
    const processedSNR = this.estimateSNR(processedMono, noiseProfile);
    const snrImprovement = processedSNR - originalSNR;

    // Spectral flatness
    const spectralFlatness = this.calculateSpectralFlatness(processedMono);

    // Harmonic preservation (simplified)
    const harmonicPreservation = this.calculateHarmonicPreservation(originalMono, processedMono);

    // Transient preservation
    const transientPreservation = this.calculateTransientPreservation(originalMono, processedMono);

    return {
      snrImprovement,
      spectralFlatness,
      harmonicPreservation,
      transientPreservation
    };
  }

  private mixToMono(audioData: Float32Array[]): Float32Array {
    if (audioData.length === 1) return audioData[0] ?? new Float32Array();

    const length = audioData[0]?.length ?? 0;
    const mono = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (const channel of audioData) {
        sum += channel[i] ?? 0;
      }
      mono[i] = sum / audioData.length;
    }

    return mono;
  }

  private estimateSNR(audio: Float32Array, noiseProfile: NoiseProfile): number {
    // Simplified SNR estimation
    let signalPower = 0;
    let noisePower = 0;
    const noiseLevel = noiseProfile.noiseFloor;

    for (let i = 0; i < audio.length; i++) {
      const sample = audio[i] ?? 0;
      signalPower += sample * sample;
      noisePower += noiseLevel * noiseLevel;
    }

    signalPower /= audio.length;
    noisePower /= audio.length;

    return 10 * Math.log10(signalPower / (noisePower + 1e-10));
  }

  private calculateSpectralFlatness(audio: Float32Array): number {
    // Simplified spectral flatness calculation
    const frameSize = 1024;
    let totalFlatness = 0;
    let frameCount = 0;

    for (let i = 0; i < audio.length - frameSize; i += frameSize) {
      const frame = audio.slice(i, i + frameSize);
      const fft = this.fftProcessor.forward(frame);
      const magnitude = this.fftProcessor.getMagnitudeSpectrum(fft.real, fft.imag);

      // Calculate geometric and arithmetic means
      let geometricMean = 1;
      let arithmeticMean = 0;

      for (let j = 1; j < magnitude.length; j++) { // Skip DC
        const mag = Math.max(magnitude[j] ?? 0, 1e-10);
        geometricMean *= Math.pow(mag, 1 / (magnitude.length - 1));
        arithmeticMean += mag;
      }

      arithmeticMean /= (magnitude.length - 1);
      const flatness = geometricMean / (arithmeticMean + 1e-10);

      totalFlatness += flatness;
      frameCount++;
    }

    return frameCount > 0 ? totalFlatness / frameCount : 0;
  }

  private calculateHarmonicPreservation(original: Float32Array, processed: Float32Array): number {
    // Simplified harmonic preservation metric
    const correlation = this.calculateCrossCorrelation(original, processed);
    return Math.max(0, Math.min(1, correlation));
  }

  private calculateTransientPreservation(original: Float32Array, processed: Float32Array): number {
    // Detect transients using energy differences
    const originalTransients = this.detectTransients(original);
    const processedTransients = this.detectTransients(processed);

    if (originalTransients.length === 0) return 1;

    let preservedCount = 0;
    const tolerance = 0.01; // 10ms tolerance

    for (const origTransient of originalTransients) {
      const hasMatch = processedTransients.some(procTransient =>
        Math.abs(procTransient - origTransient) < tolerance
      );
      if (hasMatch) preservedCount++;
    }

    return preservedCount / originalTransients.length;
  }

  private calculateCrossCorrelation(signal1: Float32Array, signal2: Float32Array): number {
    const length = Math.min(signal1.length, signal2.length);
    let correlation = 0;
    let power1 = 0;
    let power2 = 0;

    for (let i = 0; i < length; i++) {
      const s1 = signal1[i] ?? 0;
      const s2 = signal2[i] ?? 0;
      correlation += s1 * s2;
      power1 += s1 * s1;
      power2 += s2 * s2;
    }

    const normalization = Math.sqrt(power1 * power2);
    return normalization > 0 ? correlation / normalization : 0;
  }

  private detectTransients(audio: Float32Array): number[] {
    const transients: number[] = [];
    const windowSize = 512;
    const threshold = 2.0; // Energy ratio threshold

    for (let i = windowSize; i < audio.length - windowSize; i += windowSize / 2) {
      const prevWindow = audio.slice(i - windowSize, i);
      const currWindow = audio.slice(i, i + windowSize);

      const prevEnergy = this.calculateEnergy(prevWindow);
      const currEnergy = this.calculateEnergy(currWindow);

      if (currEnergy > threshold * (prevEnergy + 1e-10)) {
        transients.push(i / 48000); // Convert to seconds
      }
    }

    return transients;
  }

  private calculateEnergy(signal: Float32Array): number {
    let energy = 0;
    for (let i = 0; i < signal.length; i++) {
      const sample = signal[i] ?? 0;
      energy += sample * sample;
    }
    return energy / signal.length;
  }

  private estimateArtifactLevel(audio: Float32Array[]): number {
    // Simplified artifact detection based on spectral discontinuities
    const mono = this.mixToMono(audio);
    const frameSize = 1024;
    let totalArtifacts = 0;
    let frameCount = 0;

    for (let i = 0; i < mono.length - frameSize * 2; i += frameSize) {
      const frame1 = mono.slice(i, i + frameSize);
      const frame2 = mono.slice(i + frameSize, i + frameSize * 2);

      const fft1 = this.fftProcessor.forward(frame1);
      const fft2 = this.fftProcessor.forward(frame2);

      const mag1 = this.fftProcessor.getMagnitudeSpectrum(fft1.real, fft1.imag);
      const mag2 = this.fftProcessor.getMagnitudeSpectrum(fft2.real, fft2.imag);

      // Calculate spectral difference
      let difference = 0;
      for (let j = 0; j < Math.min(mag1.length, mag2.length); j++) {
        difference += Math.abs((mag1[j] ?? 0) - (mag2[j] ?? 0));
      }

      totalArtifacts += difference / mag1.length;
      frameCount++;
    }

    const avgArtifacts = frameCount > 0 ? totalArtifacts / frameCount : 0;
    return Math.min(1, avgArtifacts / 0.1); // Normalize to 0-1 range
  }

  // Public API methods
  public createNoiseProfileFromAudio(audioData: Float32Array[], name: string): Promise<NoiseProfile> {
    const frames = this.audioToSpectralFrames(audioData, {
      algorithm: 'spectral_subtraction',
      strength: 0.8,
      preserveTransients: true,
      adaptiveMode: true,
      realTimeMode: false,
      frameSize: 1024,
      hopSize: 512,
      smoothingFactor: 0.98,
      noiseLearningDuration: 2
    });

    return this.createNoiseProfile(frames);
  }

  public saveNoiseProfile(profile: NoiseProfile): void {
    this.noiseProfiles.set(profile.id, profile);
  }

  public getNoiseProfile(id: string): NoiseProfile | undefined {
    return this.noiseProfiles.get(id);
  }

  public getAllNoiseProfiles(): NoiseProfile[] {
    return Array.from(this.noiseProfiles.values());
  }

  public deleteNoiseProfile(id: string): boolean {
    return this.noiseProfiles.delete(id);
  }

  public getDefaultConfig(): NoiseReductionConfig {
    return {
      algorithm: 'wiener_filter',
      strength: 0.8,
      preserveTransients: true,
      adaptiveMode: true,
      realTimeMode: false,
      frameSize: 1024,
      hopSize: 512,
      smoothingFactor: 0.98,
      noiseLearningDuration: 2
    };
  }
}

export default AdvancedNoiseReduction;