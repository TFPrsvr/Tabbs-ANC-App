import { EventEmitter } from 'events';

// Core spectral analysis interfaces
export interface SpectralAnalysisConfig {
  sampleRate: number;
  fftSize: 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384;
  hopSize: number;
  windowType: WindowType;
  overlapRatio: number;
  zeropadFactor: number;
  enablePreemphasis: boolean;
  preemphasisCoeff: number;
}

export type WindowType =
  | 'hann'
  | 'hamming'
  | 'blackman'
  | 'bartlett'
  | 'rectangular'
  | 'kaiser'
  | 'tukey'
  | 'gaussian';

export interface SpectralFrame {
  timestamp: number;
  frequencies: Float32Array;
  magnitudes: Float32Array;
  phases: Float32Array;
  powerSpectrum: Float32Array;
  windowedSignal: Float32Array;
}

export interface SpectralFeatures {
  spectralCentroid: number;
  spectralSpread: number;
  spectralSkewness: number;
  spectralKurtosis: number;
  spectralRolloff: number;
  spectralFlatness: number;
  spectralCrest: number;
  spectralSlope: number;
  spectralFlux: number;
  harmonicity: number;
  inharmonicity: number;
  noisiness: number;
}

export interface ChromaFeatures {
  chromagram: Float32Array; // 12-dimensional chroma vector
  chromaCentroid: number;
  chromaDeviation: number;
  chromaEnergy: number;
  key: string;
  mode: 'major' | 'minor';
  keyStrength: number;
}

export interface MelFeatures {
  melSpectrogram: Float32Array[];
  mfcc: Float32Array; // Mel-Frequency Cepstral Coefficients
  mfccDelta: Float32Array;
  mfccDeltaDelta: Float32Array;
  melCentroid: number;
  melSpread: number;
  melRolloff: number;
}

export interface TemporalFeatures {
  onsetTimes: number[];
  onsetStrengths: Float32Array;
  tempo: number;
  tempoConfidence: number;
  beat: number[];
  rhythm: RhythmFeatures;
  envelope: Float32Array;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface RhythmFeatures {
  periodicityEstimate: number;
  rhythmStrength: number;
  syncopation: number;
  complexity: number;
  regularity: number;
}

export interface HarmonicFeatures {
  fundamentalFrequency: number;
  harmonics: HarmonicComponent[];
  harmonicToNoiseRatio: number;
  harmonicCentroid: number;
  harmonicSpread: number;
  harmonicComplexity: number;
  partials: PartialComponent[];
}

export interface HarmonicComponent {
  frequency: number;
  amplitude: number;
  phase: number;
  partialNumber: number;
  deviationFromHarmonic: number;
}

export interface PartialComponent {
  frequency: number;
  amplitude: number;
  bandwidth: number;
  phase: number;
  confidence: number;
}

export interface PsychoacousticFeatures {
  loudness: number; // in sones
  sharpness: number; // in acum
  roughness: number; // in asper
  fluctuationStrength: number; // in vacil
  tonality: number;
  barkSpectrum: Float32Array;
  criticalBands: Float32Array;
  maskingThreshold: Float32Array;
}

export interface SpectralContours {
  fundamentalContour: Float32Array;
  formantContours: Float32Array[];
  energyContour: Float32Array;
  centroidContour: Float32Array;
  bandwidthContour: Float32Array;
}

export interface AdvancedMetrics {
  entropy: number;
  complexity: number;
  predictability: number;
  stationarity: number;
  periodicity: number;
  chaos: number;
  fractalDimension: number;
  spectralCoherence: Float32Array;
}

// FFT processor with advanced windowing
class AdvancedFFTProcessor {
  private fftSize: number;
  private windowFunction!: Float32Array;
  private windowType: WindowType;
  private cosTable!: Float32Array;
  private sinTable!: Float32Array;
  private bitReverseIndices!: number[];

  constructor(fftSize: number, windowType: WindowType = 'hann') {
    this.fftSize = fftSize;
    this.windowType = windowType;
    this.initializeTables();
    this.generateWindow();
  }

  private initializeTables(): void {
    this.cosTable = new Float32Array(this.fftSize / 2);
    this.sinTable = new Float32Array(this.fftSize / 2);
    this.bitReverseIndices = new Array(this.fftSize);

    // Generate trig tables
    for (let i = 0; i < this.fftSize / 2; i++) {
      const angle = -2 * Math.PI * i / this.fftSize;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }

    // Generate bit-reverse indices
    const numBits = Math.log2(this.fftSize);
    for (let i = 0; i < this.fftSize; i++) {
      this.bitReverseIndices[i] = this.reverseBits(i, numBits);
    }
  }

  private generateWindow(): void {
    this.windowFunction = new Float32Array(this.fftSize);

    for (let i = 0; i < this.fftSize; i++) {
      const n = i / (this.fftSize - 1);

      switch (this.windowType) {
        case 'hann':
          this.windowFunction[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * n);
          break;
        case 'hamming':
          this.windowFunction[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * n);
          break;
        case 'blackman':
          this.windowFunction[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * n) + 0.08 * Math.cos(4 * Math.PI * n);
          break;
        case 'bartlett':
          this.windowFunction[i] = 1 - Math.abs(2 * n - 1);
          break;
        case 'rectangular':
          this.windowFunction[i] = 1;
          break;
        case 'kaiser':
          this.windowFunction[i] = this.kaiserWindow(i, this.fftSize, 8.6);
          break;
        case 'tukey':
          this.windowFunction[i] = this.tukeyWindow(i, this.fftSize, 0.5);
          break;
        case 'gaussian':
          this.windowFunction[i] = this.gaussianWindow(i, this.fftSize, 0.4);
          break;
        default:
          this.windowFunction[i] = 1;
      }
    }
  }

  private kaiserWindow(n: number, N: number, beta: number): number {
    const alpha = (N - 1) / 2;
    const arg = beta * Math.sqrt(1 - Math.pow((n - alpha) / alpha, 2));
    return this.besselI0(arg) / this.besselI0(beta);
  }

  private tukeyWindow(n: number, N: number, alpha: number): number {
    if (n < alpha * (N - 1) / 2) {
      return 0.5 * (1 + Math.cos(Math.PI * (2 * n / (alpha * (N - 1)) - 1)));
    } else if (n <= (N - 1) * (1 - alpha / 2)) {
      return 1;
    } else {
      return 0.5 * (1 + Math.cos(Math.PI * (2 * n / (alpha * (N - 1)) - 2 / alpha + 1)));
    }
  }

  private gaussianWindow(n: number, N: number, sigma: number): number {
    const center = (N - 1) / 2;
    return Math.exp(-0.5 * Math.pow((n - center) / (sigma * center), 2));
  }

  private besselI0(x: number): number {
    let sum = 1;
    let term = 1;
    for (let i = 1; i <= 50; i++) {
      term *= (x / (2 * i)) * (x / (2 * i));
      sum += term;
      if (term < 1e-15) break;
    }
    return sum;
  }

  public computeSpectrum(signal: Float32Array): SpectralFrame {
    if (signal.length !== this.fftSize) {
      throw new Error(`Signal length ${signal.length} does not match FFT size ${this.fftSize}`);
    }

    // Apply window function
    const windowedSignal = new Float32Array(this.fftSize);
    for (let i = 0; i < this.fftSize; i++) {
      windowedSignal[i] = (signal[i] ?? 0) * (this.windowFunction[i] ?? 0);
    }

    // Prepare complex arrays
    const real = new Float32Array(windowedSignal);
    const imag = new Float32Array(this.fftSize);

    // Perform FFT
    this.fft(real, imag);

    // Calculate magnitudes, phases, and power spectrum
    const frequencies = new Float32Array(this.fftSize / 2 + 1);
    const magnitudes = new Float32Array(this.fftSize / 2 + 1);
    const phases = new Float32Array(this.fftSize / 2 + 1);
    const powerSpectrum = new Float32Array(this.fftSize / 2 + 1);

    for (let i = 0; i <= this.fftSize / 2; i++) {
      frequencies[i] = i; // Will be scaled by sample rate later
      magnitudes[i] = Math.sqrt((real[i] ?? 0) * (real[i] ?? 0) + (imag[i] ?? 0) * (imag[i] ?? 0));
      phases[i] = Math.atan2(imag[i] ?? 0, real[i] ?? 0);
      powerSpectrum[i] = (magnitudes[i] ?? 0) * (magnitudes[i] ?? 0);
    }

    return {
      timestamp: performance.now(),
      frequencies,
      magnitudes,
      phases,
      powerSpectrum,
      windowedSignal
    };
  }

  private fft(real: Float32Array, imag: Float32Array): void {
    // Bit-reverse permutation
    for (let i = 0; i < this.fftSize; i++) {
      const j = this.bitReverseIndices[i] ?? 0;
      if (i < j) {
        [real[i], real[j]] = [real[j] ?? 0, real[i] ?? 0];
        [imag[i], imag[j]] = [imag[j] ?? 0, imag[i] ?? 0];
      }
    }

    // Cooley-Tukey FFT
    for (let length = 2; length <= this.fftSize; length *= 2) {
      const step = this.fftSize / length;
      for (let i = 0; i < this.fftSize; i += length) {
        for (let j = 0; j < length / 2; j++) {
          const u = i + j;
          const v = i + j + length / 2;
          const twiddle = j * step;

          const cos = this.cosTable[twiddle] ?? 0;
          const sin = this.sinTable[twiddle] ?? 0;

          const tempReal = (real[v] ?? 0) * cos - (imag[v] ?? 0) * sin;
          const tempImag = (real[v] ?? 0) * sin + (imag[v] ?? 0) * cos;

          real[v] = (real[u] ?? 0) - tempReal;
          imag[v] = (imag[u] ?? 0) - tempImag;
          real[u] = (real[u] ?? 0) + tempReal;
          imag[u] = (imag[u] ?? 0) + tempImag;
        }
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

  public setWindowType(windowType: WindowType): void {
    this.windowType = windowType;
    this.generateWindow();
  }

  public getWindowFunction(): Float32Array {
    return new Float32Array(this.windowFunction);
  }
}

// Spectral feature extractor
class SpectralFeatureExtractor {
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public extractFeatures(
    frame: SpectralFrame,
    previousFrame?: SpectralFrame
  ): SpectralFeatures {

    const frequencies = this.computeFrequencyBins(frame.frequencies.length);
    const magnitudes = frame.magnitudes;

    return {
      spectralCentroid: this.calculateSpectralCentroid(frequencies, magnitudes),
      spectralSpread: this.calculateSpectralSpread(frequencies, magnitudes),
      spectralSkewness: this.calculateSpectralSkewness(frequencies, magnitudes),
      spectralKurtosis: this.calculateSpectralKurtosis(frequencies, magnitudes),
      spectralRolloff: this.calculateSpectralRolloff(frequencies, magnitudes),
      spectralFlatness: this.calculateSpectralFlatness(magnitudes),
      spectralCrest: this.calculateSpectralCrest(magnitudes),
      spectralSlope: this.calculateSpectralSlope(frequencies, magnitudes),
      spectralFlux: previousFrame ?
        this.calculateSpectralFlux(magnitudes, previousFrame.magnitudes) : 0,
      harmonicity: this.calculateHarmonicity(frequencies, magnitudes),
      inharmonicity: this.calculateInharmonicity(frequencies, magnitudes),
      noisiness: this.calculateNoisiness(magnitudes)
    };
  }

  private computeFrequencyBins(numBins: number): Float32Array {
    const frequencies = new Float32Array(numBins);
    for (let i = 0; i < numBins; i++) {
      frequencies[i] = (i * this.sampleRate) / (2 * (numBins - 1));
    }
    return frequencies;
  }

  private calculateSpectralCentroid(frequencies: Float32Array, magnitudes: Float32Array): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < frequencies.length; i++) {
      numerator += (frequencies[i] ?? 0) * (magnitudes[i] ?? 0);
      denominator += (magnitudes[i] ?? 0);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateSpectralSpread(frequencies: Float32Array, magnitudes: Float32Array): number {
    const centroid = this.calculateSpectralCentroid(frequencies, magnitudes);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < frequencies.length; i++) {
      const deviation = (frequencies[i] ?? 0) - centroid;
      numerator += deviation * deviation * (magnitudes[i] ?? 0);
      denominator += (magnitudes[i] ?? 0);
    }

    return denominator > 0 ? Math.sqrt(numerator / denominator) : 0;
  }

  private calculateSpectralSkewness(frequencies: Float32Array, magnitudes: Float32Array): number {
    const centroid = this.calculateSpectralCentroid(frequencies, magnitudes);
    const spread = this.calculateSpectralSpread(frequencies, magnitudes);

    if (spread === 0) return 0;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < frequencies.length; i++) {
      const deviation = ((frequencies[i] ?? 0) - centroid) / spread;
      numerator += Math.pow(deviation, 3) * (magnitudes[i] ?? 0);
      denominator += (magnitudes[i] ?? 0);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateSpectralKurtosis(frequencies: Float32Array, magnitudes: Float32Array): number {
    const centroid = this.calculateSpectralCentroid(frequencies, magnitudes);
    const spread = this.calculateSpectralSpread(frequencies, magnitudes);

    if (spread === 0) return 0;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < frequencies.length; i++) {
      const deviation = ((frequencies[i] ?? 0) - centroid) / spread;
      numerator += Math.pow(deviation, 4) * (magnitudes[i] ?? 0);
      denominator += (magnitudes[i] ?? 0);
    }

    return denominator > 0 ? (numerator / denominator) - 3 : 0; // Excess kurtosis
  }

  private calculateSpectralRolloff(frequencies: Float32Array, magnitudes: Float32Array): number {
    let totalEnergy = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      totalEnergy += (magnitudes[i] ?? 0) * (magnitudes[i] ?? 0);
    }

    const threshold = totalEnergy * 0.85; // 85% rolloff
    let cumulativeEnergy = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += (magnitudes[i] ?? 0) * (magnitudes[i] ?? 0);
      if (cumulativeEnergy >= threshold) {
        return frequencies[i] ?? 0;
      }
    }

    return frequencies[frequencies.length - 1] ?? 0;
  }

  private calculateSpectralFlatness(magnitudes: Float32Array): number {
    let geometricMean = 0;
    let arithmeticMean = 0;
    let count = 0;

    for (let i = 1; i < magnitudes.length; i++) { // Skip DC component
      if ((magnitudes[i] ?? 0) > 0) {
        geometricMean += Math.log(magnitudes[i] ?? 0);
        arithmeticMean += (magnitudes[i] ?? 0);
        count++;
      }
    }

    if (count === 0) return 0;

    geometricMean = Math.exp(geometricMean / count);
    arithmeticMean = arithmeticMean / count;

    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }

  private calculateSpectralCrest(magnitudes: Float32Array): number {
    const peak = Math.max(...magnitudes);
    const mean = magnitudes.reduce((sum, mag) => sum + (mag ?? 0), 0) / magnitudes.length;
    return mean > 0 ? peak / mean : 0;
  }

  private calculateSpectralSlope(frequencies: Float32Array, magnitudes: Float32Array): number {
    // Linear regression to find slope
    const n = frequencies.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = frequencies[i] ?? 0;
      const y = Math.log((magnitudes[i] ?? 0) + 1e-10); // Log magnitude

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const denominator = n * sumXX - sumX * sumX;
    return denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  }

  private calculateSpectralFlux(current: Float32Array, previous: Float32Array): number {
    let flux = 0;
    const minLength = Math.min(current.length, previous.length);

    for (let i = 0; i < minLength; i++) {
      const diff = (current[i] ?? 0) - (previous[i] ?? 0);
      flux += diff * diff;
    }

    return Math.sqrt(flux);
  }

  private calculateHarmonicity(frequencies: Float32Array, magnitudes: Float32Array): number {
    // Estimate fundamental frequency using autocorrelation
    const fundamental = this.estimateFundamental(frequencies, magnitudes);
    if (fundamental <= 0) return 0;

    let harmonicEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < frequencies.length; i++) {
      const energy = (magnitudes[i] ?? 0) * (magnitudes[i] ?? 0);
      totalEnergy += energy;

      // Check if frequency is close to a harmonic
      const harmonic = Math.round((frequencies[i] ?? 0) / fundamental);
      const expectedFreq = harmonic * fundamental;
      const tolerance = fundamental * 0.1;

      if (Math.abs((frequencies[i] ?? 0) - expectedFreq) < tolerance && harmonic >= 1) {
        harmonicEnergy += energy;
      }
    }

    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }

  private calculateInharmonicity(frequencies: Float32Array, magnitudes: Float32Array): number {
    return 1 - this.calculateHarmonicity(frequencies, magnitudes);
  }

  private calculateNoisiness(magnitudes: Float32Array): number {
    // High-frequency energy ratio
    const totalEnergy = magnitudes.reduce((sum, mag) => sum + (mag ?? 0) * (mag ?? 0), 0);
    const highFreqStart = Math.floor(magnitudes.length * 0.7);
    const highFreqEnergy = magnitudes.slice(highFreqStart)
      .reduce((sum, mag) => sum + (mag ?? 0) * (mag ?? 0), 0);

    return totalEnergy > 0 ? highFreqEnergy / totalEnergy : 0;
  }

  private estimateFundamental(frequencies: Float32Array, magnitudes: Float32Array): number {
    // Find the peak in the low-frequency range
    let maxMag = 0;
    let fundamentalFreq = 0;

    for (let i = 1; i < Math.min(frequencies.length, 200); i++) { // Up to ~4.4kHz for 44.1kHz
      if ((magnitudes[i] ?? 0) > maxMag) {
        maxMag = magnitudes[i] ?? 0;
        fundamentalFreq = frequencies[i] ?? 0;
      }
    }

    return fundamentalFreq;
  }
}

// Mel-frequency processing
class MelFrequencyProcessor {
  private sampleRate: number;
  private numMelFilters: number;
  private numMfcc: number;
  private melFilterBank!: Float32Array[];
  private dctMatrix!: Float32Array[];

  constructor(sampleRate: number, numMelFilters: number = 26, numMfcc: number = 13) {
    this.sampleRate = sampleRate;
    this.numMelFilters = numMelFilters;
    this.numMfcc = numMfcc;
    this.createMelFilterBank();
    this.createDCTMatrix();
  }

  private createMelFilterBank(): void {
    const minMel = this.hzToMel(0);
    const maxMel = this.hzToMel(this.sampleRate / 2);
    const melPoints = new Float32Array(this.numMelFilters + 2);

    // Create equally spaced mel points
    for (let i = 0; i < melPoints.length; i++) {
      melPoints[i] = minMel + (maxMel - minMel) * i / (melPoints.length - 1);
    }

    // Convert mel points back to Hz
    const hzPoints = melPoints.map(mel => this.melToHz(mel));

    // Create triangular filters
    this.melFilterBank = [];
    const fftSize = 1024; // Assuming FFT size, should be configurable

    for (let i = 1; i <= this.numMelFilters; i++) {
      const filter = new Float32Array(fftSize / 2 + 1);
      const leftHz = hzPoints[i - 1];
      const centerHz = hzPoints[i];
      const rightHz = hzPoints[i + 1];

      for (let j = 0; j < filter.length; j++) {
        const freq = (j * this.sampleRate) / fftSize;

        if (freq < (leftHz ?? 0) || freq > (rightHz ?? 0)) {
          filter[j] = 0;
        } else if (freq <= (centerHz ?? 0)) {
          filter[j] = (freq - (leftHz ?? 0)) / ((centerHz ?? 0) - (leftHz ?? 0));
        } else {
          filter[j] = ((rightHz ?? 0) - freq) / ((rightHz ?? 0) - (centerHz ?? 0));
        }
      }

      this.melFilterBank.push(filter);
    }
  }

  private createDCTMatrix(): void {
    this.dctMatrix = [];

    for (let i = 0; i < this.numMfcc; i++) {
      const dctCoeffs = new Float32Array(this.numMelFilters);
      for (let j = 0; j < this.numMelFilters; j++) {
        dctCoeffs[j] = Math.cos((i * (j + 0.5) * Math.PI) / this.numMelFilters);
        if (i === 0) {
          dctCoeffs[j] = (dctCoeffs[j] ?? 0) * (1 / Math.sqrt(this.numMelFilters));
        } else {
          dctCoeffs[j] = (dctCoeffs[j] ?? 0) * Math.sqrt(2 / this.numMelFilters);
        }
      }
      this.dctMatrix.push(dctCoeffs);
    }
  }

  public extractMelFeatures(powerSpectrum: Float32Array): MelFeatures {
    // Apply mel filter bank
    const melSpectrum = new Float32Array(this.numMelFilters);
    for (let i = 0; i < this.numMelFilters; i++) {
      let energy = 0;
      for (let j = 0; j < Math.min(powerSpectrum.length, this.melFilterBank[i]?.length ?? 0); j++) {
        energy += (powerSpectrum[j] ?? 0) * (this.melFilterBank[i]?.[j] ?? 0);
      }
      melSpectrum[i] = Math.log(energy + 1e-10); // Log mel spectrum
    }

    // Compute MFCC using DCT
    const mfcc = new Float32Array(this.numMfcc);
    for (let i = 0; i < this.numMfcc; i++) {
      let sum = 0;
      for (let j = 0; j < this.numMelFilters; j++) {
        sum += (melSpectrum[j] ?? 0) * (this.dctMatrix[i]?.[j] ?? 0);
      }
      mfcc[i] = sum;
    }

    return {
      melSpectrogram: [melSpectrum], // Should accumulate over time
      mfcc,
      mfccDelta: new Float32Array(this.numMfcc), // Would compute from previous frames
      mfccDeltaDelta: new Float32Array(this.numMfcc), // Second-order derivatives
      melCentroid: this.calculateMelCentroid(melSpectrum),
      melSpread: this.calculateMelSpread(melSpectrum),
      melRolloff: this.calculateMelRolloff(melSpectrum)
    };
  }

  private hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }

  private melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  private calculateMelCentroid(melSpectrum: Float32Array): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < melSpectrum.length; i++) {
      const energy = Math.exp(melSpectrum[i] ?? 0);
      numerator += i * energy;
      denominator += energy;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateMelSpread(melSpectrum: Float32Array): number {
    const centroid = this.calculateMelCentroid(melSpectrum);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < melSpectrum.length; i++) {
      const energy = Math.exp(melSpectrum[i] ?? 0);
      const deviation = i - centroid;
      numerator += deviation * deviation * energy;
      denominator += energy;
    }

    return denominator > 0 ? Math.sqrt(numerator / denominator) : 0;
  }

  private calculateMelRolloff(melSpectrum: Float32Array): number {
    let totalEnergy = 0;
    for (let i = 0; i < melSpectrum.length; i++) {
      totalEnergy += Math.exp(melSpectrum[i] ?? 0);
    }

    const threshold = totalEnergy * 0.85;
    let cumulativeEnergy = 0;

    for (let i = 0; i < melSpectrum.length; i++) {
      cumulativeEnergy += Math.exp(melSpectrum[i] ?? 0);
      if (cumulativeEnergy >= threshold) {
        return i;
      }
    }

    return melSpectrum.length - 1;
  }
}

// Chroma feature extractor
class ChromaFeatureExtractor {
  private sampleRate: number;
  private chromaMatrix!: Float32Array[];

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.createChromaMatrix();
  }

  private createChromaMatrix(): void {
    const fftSize = 1024; // Should be configurable
    this.chromaMatrix = [];

    // Create 12 chroma vectors for each semitone
    for (let chroma = 0; chroma < 12; chroma++) {
      const chromaVector = new Float32Array(fftSize / 2 + 1);

      for (let i = 0; i < chromaVector.length; i++) {
        const freq = (i * this.sampleRate) / fftSize;
        if (freq > 0) {
          const noteNumber = 12 * Math.log2(freq / 440) + 69; // A4 = 440Hz = note 69
          const chromaClass = ((noteNumber % 12) + 12) % 12;

          // Gaussian weighting around target chroma
          const distance = Math.min(
            Math.abs(chromaClass - chroma),
            12 - Math.abs(chromaClass - chroma)
          );
          chromaVector[i] = Math.exp(-distance * distance / 2);
        }
      }

      this.chromaMatrix.push(chromaVector);
    }
  }

  public extractChromaFeatures(powerSpectrum: Float32Array): ChromaFeatures {
    const chromagram = new Float32Array(12);

    // Compute chroma vector
    for (let chroma = 0; chroma < 12; chroma++) {
      let energy = 0;
      for (let i = 0; i < Math.min(powerSpectrum.length, this.chromaMatrix[chroma]?.length ?? 0); i++) {
        energy += (powerSpectrum[i] ?? 0) * (this.chromaMatrix[chroma]?.[i] ?? 0);
      }
      chromagram[chroma] = energy;
    }

    // Normalize chromagram
    const totalEnergy = chromagram.reduce((sum, val) => sum + val, 0);
    if (totalEnergy > 0) {
      for (let i = 0; i < 12; i++) {
        chromagram[i] = (chromagram[i] ?? 0) / totalEnergy;
      }
    }

    const chromaCentroid = this.calculateChromaCentroid(chromagram);
    const chromaDeviation = this.calculateChromaDeviation(chromagram, chromaCentroid);
    const chromaEnergy = totalEnergy;
    const { key, mode, keyStrength } = this.estimateKey(chromagram);

    return {
      chromagram,
      chromaCentroid,
      chromaDeviation,
      chromaEnergy,
      key,
      mode,
      keyStrength
    };
  }

  private calculateChromaCentroid(chromagram: Float32Array): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < 12; i++) {
      numerator += i * (chromagram[i] ?? 0);
      denominator += (chromagram[i] ?? 0);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateChromaDeviation(chromagram: Float32Array, centroid: number): number {
    let variance = 0;
    let totalEnergy = 0;

    for (let i = 0; i < 12; i++) {
      const distance = Math.min(Math.abs(i - centroid), 12 - Math.abs(i - centroid));
      variance += distance * distance * (chromagram[i] ?? 0);
      totalEnergy += (chromagram[i] ?? 0);
    }

    return totalEnergy > 0 ? Math.sqrt(variance / totalEnergy) : 0;
  }

  private estimateKey(chromagram: Float32Array): { key: string; mode: 'major' | 'minor'; keyStrength: number } {
    const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Major and minor key profiles (Krumhansl-Schmuckler)
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

    let bestKey = 'C';
    let bestMode: 'major' | 'minor' = 'major';
    let maxCorrelation = -1;

    // Test all 24 keys (12 major + 12 minor)
    for (let tonic = 0; tonic < 12; tonic++) {
      // Major key
      let correlation = this.calculateCorrelation(chromagram, majorProfile, tonic);
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestKey = keyNames[tonic] ?? 'C';
        bestMode = 'major';
      }

      // Minor key
      correlation = this.calculateCorrelation(chromagram, minorProfile, tonic);
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestKey = keyNames[tonic] ?? 'C';
        bestMode = 'minor';
      }
    }

    return {
      key: bestKey,
      mode: bestMode,
      keyStrength: Math.max(0, maxCorrelation)
    };
  }

  private calculateCorrelation(chromagram: Float32Array, profile: number[], tonic: number): number {
    let numerator = 0;
    let chromaSum = 0;
    let profileSum = 0;
    let chromaSumSq = 0;
    let profileSumSq = 0;

    for (let i = 0; i < 12; i++) {
      const chromaIdx = (i + tonic) % 12;
      const chromaVal = chromagram[chromaIdx] ?? 0;
      const profileVal = profile[i] ?? 0;

      numerator += chromaVal * profileVal;
      chromaSum += chromaVal;
      profileSum += profileVal;
      chromaSumSq += chromaVal * chromaVal;
      profileSumSq += profileVal * profileVal;
    }

    const denominator = Math.sqrt(
      (12 * chromaSumSq - chromaSum * chromaSum) *
      (12 * profileSumSq - profileSum * profileSum)
    );

    return denominator > 0 ? (12 * numerator - chromaSum * profileSum) / denominator : 0;
  }
}

// Main spectral analysis engine
export class AdvancedSpectralAnalyzer extends EventEmitter {
  private config: SpectralAnalysisConfig;
  private fftProcessor: AdvancedFFTProcessor;
  private featureExtractor: SpectralFeatureExtractor;
  private melProcessor: MelFrequencyProcessor;
  private chromaExtractor: ChromaFeatureExtractor;
  private frameHistory: SpectralFrame[] = [];
  private featureHistory: SpectralFeatures[] = [];
  private isAnalyzing: boolean = false;

  constructor(config: Partial<SpectralAnalysisConfig> = {}) {
    super();

    this.config = {
      sampleRate: 44100,
      fftSize: 2048,
      hopSize: 512,
      windowType: 'hann',
      overlapRatio: 0.75,
      zeropadFactor: 1,
      enablePreemphasis: false,
      preemphasisCoeff: 0.97,
      ...config
    };

    this.fftProcessor = new AdvancedFFTProcessor(this.config.fftSize, this.config.windowType);
    this.featureExtractor = new SpectralFeatureExtractor(this.config.sampleRate);
    this.melProcessor = new MelFrequencyProcessor(this.config.sampleRate);
    this.chromaExtractor = new ChromaFeatureExtractor(this.config.sampleRate);
  }

  public async analyzeAudio(
    audioData: Float32Array,
    progressCallback?: (progress: number) => void
  ): Promise<{
    frames: SpectralFrame[];
    features: SpectralFeatures[];
    melFeatures: MelFeatures[];
    chromaFeatures: ChromaFeatures[];
    temporalFeatures: TemporalFeatures;
    harmonicFeatures: HarmonicFeatures;
    psychoacousticFeatures: PsychoacousticFeatures;
    spectralContours: SpectralContours;
    advancedMetrics: AdvancedMetrics;
  }> {

    this.isAnalyzing = true;
    this.emit('analysisStarted', { audioLength: audioData.length });

    try {
      // Apply preemphasis if enabled
      let processedAudio = audioData;
      if (this.config.enablePreemphasis) {
        processedAudio = this.applyPreemphasis(audioData, this.config.preemphasisCoeff);
      }

      // Frame-based analysis
      const frames: SpectralFrame[] = [];
      const features: SpectralFeatures[] = [];
      const melFeatures: MelFeatures[] = [];
      const chromaFeatures: ChromaFeatures[] = [];

      const frameSize = this.config.fftSize;
      const hopSize = this.config.hopSize;
      const numFrames = Math.floor((processedAudio.length - frameSize) / hopSize) + 1;

      for (let frameIndex = 0; frameIndex < numFrames; frameIndex++) {
        const startSample = frameIndex * hopSize;
        const frameData = processedAudio.slice(startSample, startSample + frameSize);

        // Pad with zeros if necessary
        const paddedFrame = new Float32Array(frameSize);
        paddedFrame.set(frameData);

        // Compute spectrum
        const frame = this.fftProcessor.computeSpectrum(paddedFrame);
        frame.timestamp = (startSample / this.config.sampleRate) * 1000; // Convert to milliseconds

        // Scale frequencies by sample rate
        for (let i = 0; i < frame.frequencies.length; i++) {
          frame.frequencies[i] = ((frame.frequencies[i] ?? 0) * this.config.sampleRate) / (2 * (frame.frequencies.length - 1));
        }

        frames.push(frame);

        // Extract features
        const previousFrame = frames.length > 1 ? frames[frames.length - 2] : undefined;
        const spectralFeatures = this.featureExtractor.extractFeatures(frame, previousFrame);
        features.push(spectralFeatures);

        // Extract mel features
        const melFeature = this.melProcessor.extractMelFeatures(frame.powerSpectrum);
        melFeatures.push(melFeature);

        // Extract chroma features
        const chromaFeature = this.chromaExtractor.extractChromaFeatures(frame.powerSpectrum);
        chromaFeatures.push(chromaFeature);

        // Report progress
        const progress = ((frameIndex + 1) / numFrames) * 0.7; // 70% for frame processing
        progressCallback?.(progress * 100);
      }

      // Analyze temporal features
      progressCallback?.(75);
      const temporalFeatures = this.analyzeTemporalFeatures(frames, features);

      // Analyze harmonic content
      progressCallback?.(85);
      const harmonicFeatures = this.analyzeHarmonicFeatures(frames);

      // Compute psychoacoustic features
      progressCallback?.(90);
      const psychoacousticFeatures = this.analyzePsychoacousticFeatures(frames);

      // Extract spectral contours
      progressCallback?.(95);
      const spectralContours = this.extractSpectralContours(features);

      // Compute advanced metrics
      progressCallback?.(98);
      const advancedMetrics = this.computeAdvancedMetrics(frames, features);

      progressCallback?.(100);

      const result = {
        frames,
        features,
        melFeatures,
        chromaFeatures,
        temporalFeatures,
        harmonicFeatures,
        psychoacousticFeatures,
        spectralContours,
        advancedMetrics
      };

      this.emit('analysisCompleted', result);
      return result;

    } catch (error) {
      this.emit('analysisError', error);
      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }

  private applyPreemphasis(signal: Float32Array, coefficient: number): Float32Array {
    const output = new Float32Array(signal.length);
    output[0] = signal[0] ?? 0;

    for (let i = 1; i < signal.length; i++) {
      output[i] = (signal[i] ?? 0) - coefficient * (signal[i - 1] ?? 0);
    }

    return output;
  }

  private analyzeTemporalFeatures(frames: SpectralFrame[], features: SpectralFeatures[]): TemporalFeatures {
    // Onset detection using spectral flux
    const onsetTimes: number[] = [];
    const onsetStrengths: Float32Array = new Float32Array(features.length);

    for (let i = 0; i < features.length; i++) {
      onsetStrengths[i] = features[i]?.spectralFlux ?? 0;

      // Simple peak picking for onsets
      if (i > 2 && i < features.length - 2) {
        const currentFlux = features[i]?.spectralFlux ?? 0;
        const prevFlux = features[i - 1]?.spectralFlux ?? 0;
        const nextFlux = features[i + 1]?.spectralFlux ?? 0;

        const isLocalMax = currentFlux > prevFlux &&
                          currentFlux > nextFlux &&
                          currentFlux > 0.1; // Threshold

        if (isLocalMax) {
          onsetTimes.push((frames[i]?.timestamp ?? 0) / 1000); // Convert to seconds
        }
      }
    }

    // Tempo estimation
    const tempo = this.estimateTempo(onsetTimes);

    // Beat tracking (simplified)
    const beat = this.estimateBeats(onsetTimes, tempo);

    // Envelope calculation
    const envelope = this.calculateEnvelope(frames);

    // ADSR analysis
    const { attack, decay, sustain, release } = this.analyzeADSR(envelope);

    // Rhythm analysis
    const rhythm = this.analyzeRhythm(onsetTimes, tempo);

    return {
      onsetTimes,
      onsetStrengths,
      tempo,
      tempoConfidence: 0.8, // Simplified
      beat,
      rhythm,
      envelope,
      attack,
      decay,
      sustain,
      release
    };
  }

  private analyzeHarmonicFeatures(frames: SpectralFrame[]): HarmonicFeatures {
    // Average spectrum for fundamental estimation
    const avgMagnitudes = new Float32Array(frames[0]?.magnitudes.length ?? 0);
    for (const frame of frames) {
      for (let i = 0; i < avgMagnitudes.length; i++) {
        avgMagnitudes[i] = (avgMagnitudes[i] ?? 0) + (frame.magnitudes[i] ?? 0) / frames.length;
      }
    }

    const fundamentalFrequency = this.estimateFundamentalFrequency(frames[0]?.frequencies ?? new Float32Array(0), avgMagnitudes);
    const harmonics = this.extractHarmonics(frames[0]?.frequencies ?? new Float32Array(0), avgMagnitudes, fundamentalFrequency);
    const partials = this.extractPartials(frames[0]?.frequencies ?? new Float32Array(0), avgMagnitudes);

    return {
      fundamentalFrequency,
      harmonics,
      harmonicToNoiseRatio: this.calculateHNR(harmonics, avgMagnitudes),
      harmonicCentroid: this.calculateHarmonicCentroid(harmonics),
      harmonicSpread: this.calculateHarmonicSpread(harmonics),
      harmonicComplexity: this.calculateHarmonicComplexity(harmonics),
      partials
    };
  }

  private analyzePsychoacousticFeatures(frames: SpectralFrame[]): PsychoacousticFeatures {
    // Average spectrum for analysis
    const avgPowerSpectrum = new Float32Array(frames[0]?.powerSpectrum.length ?? 0);
    for (const frame of frames) {
      for (let i = 0; i < avgPowerSpectrum.length; i++) {
        avgPowerSpectrum[i] = (avgPowerSpectrum[i] ?? 0) + (frame.powerSpectrum[i] ?? 0) / frames.length;
      }
    }

    const barkSpectrum = this.computeBarkSpectrum(avgPowerSpectrum);
    const loudness = this.computeLoudness(barkSpectrum);
    const sharpness = this.computeSharpness(barkSpectrum);
    const roughness = this.computeRoughness(barkSpectrum);
    const fluctuationStrength = this.computeFluctuationStrength(frames);

    return {
      loudness,
      sharpness,
      roughness,
      fluctuationStrength,
      tonality: this.computeTonality(avgPowerSpectrum),
      barkSpectrum,
      criticalBands: barkSpectrum, // Simplified
      maskingThreshold: this.computeMaskingThreshold(avgPowerSpectrum)
    };
  }

  private extractSpectralContours(features: SpectralFeatures[]): SpectralContours {
    const length = features.length;

    return {
      fundamentalContour: new Float32Array(length), // Would need fundamental tracking
      formantContours: [new Float32Array(length), new Float32Array(length)], // F1, F2
      energyContour: new Float32Array(features.map(f => f.spectralCentroid)),
      centroidContour: new Float32Array(features.map(f => f.spectralCentroid)),
      bandwidthContour: new Float32Array(features.map(f => f.spectralSpread))
    };
  }

  private computeAdvancedMetrics(frames: SpectralFrame[], features: SpectralFeatures[]): AdvancedMetrics {
    return {
      entropy: this.computeSpectralEntropy(frames),
      complexity: this.computeComplexity(features),
      predictability: this.computePredictability(features),
      stationarity: this.computeStationarity(features),
      periodicity: this.computePeriodicity(frames),
      chaos: this.computeChaos(features),
      fractalDimension: this.computeFractalDimension(features),
      spectralCoherence: this.computeSpectralCoherence(frames)
    };
  }

  // Simplified implementations of complex algorithms
  private estimateTempo(onsetTimes: number[]): number {
    if (onsetTimes.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < onsetTimes.length; i++) {
      intervals.push((onsetTimes[i] ?? 0) - (onsetTimes[i - 1] ?? 0));
    }

    // Find most common interval (simplified)
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];

    return (medianInterval ?? 0) > 0 ? 60 / (medianInterval ?? 0) : 0;
  }

  private estimateBeats(onsetTimes: number[], tempo: number): number[] {
    // Simplified beat tracking
    if (tempo <= 0) return [];

    const beatInterval = 60 / tempo;
    const beats: number[] = [];

    for (let time = 0; time < ((onsetTimes[onsetTimes.length - 1] ?? 0) || 0); time += beatInterval) {
      beats.push(time);
    }

    return beats;
  }

  private calculateEnvelope(frames: SpectralFrame[]): Float32Array {
    const envelope = new Float32Array(frames.length);
    for (let i = 0; i < frames.length; i++) {
      envelope[i] = frames[i]?.magnitudes.reduce((sum, mag) => sum + (mag ?? 0), 0) ?? 0;
    }
    return envelope;
  }

  private analyzeADSR(envelope: Float32Array): { attack: number; decay: number; sustain: number; release: number } {
    // Simplified ADSR analysis
    const peak = Math.max(...envelope);
    const peakIndex = envelope.indexOf(peak);

    return {
      attack: peakIndex / envelope.length,
      decay: 0.1, // Simplified
      sustain: peak * 0.7, // Simplified
      release: (envelope.length - peakIndex) / envelope.length
    };
  }

  private analyzeRhythm(onsetTimes: number[], tempo: number): RhythmFeatures {
    return {
      periodicityEstimate: tempo > 0 ? 60 / tempo : 0,
      rhythmStrength: onsetTimes.length > 0 ? 0.8 : 0, // Simplified
      syncopation: 0.2, // Simplified
      complexity: Math.min(onsetTimes.length / 10, 1), // Simplified
      regularity: 0.7 // Simplified
    };
  }

  private estimateFundamentalFrequency(frequencies: Float32Array, magnitudes: Float32Array): number {
    let maxMag = 0;
    let fundamentalFreq = 0;

    for (let i = 1; i < Math.min(frequencies.length, 200); i++) {
      if ((magnitudes[i] ?? 0) > maxMag) {
        maxMag = magnitudes[i] ?? 0;
        fundamentalFreq = frequencies[i] ?? 0;
      }
    }

    return fundamentalFreq;
  }

  private extractHarmonics(
    frequencies: Float32Array,
    magnitudes: Float32Array,
    fundamental: number
  ): HarmonicComponent[] {

    const harmonics: HarmonicComponent[] = [];
    if (fundamental <= 0) return harmonics;

    for (let harmonic = 1; harmonic <= 10; harmonic++) {
      const targetFreq = harmonic * fundamental;
      let closestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < frequencies.length; i++) {
        const distance = Math.abs((frequencies[i] ?? 0) - targetFreq);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      if (minDistance < fundamental * 0.1) { // 10% tolerance
        harmonics.push({
          frequency: frequencies[closestIndex] ?? 0,
          amplitude: magnitudes[closestIndex] ?? 0,
          phase: 0, // Would need phase information
          partialNumber: harmonic,
          deviationFromHarmonic: minDistance / fundamental
        });
      }
    }

    return harmonics;
  }

  private extractPartials(frequencies: Float32Array, magnitudes: Float32Array): PartialComponent[] {
    const partials: PartialComponent[] = [];

    // Simple peak picking
    for (let i = 1; i < frequencies.length - 1; i++) {
      if ((magnitudes[i] ?? 0) > (magnitudes[i - 1] ?? 0) && (magnitudes[i] ?? 0) > (magnitudes[i + 1] ?? 0) && (magnitudes[i] ?? 0) > 0.01) {
        partials.push({
          frequency: frequencies[i] ?? 0,
          amplitude: magnitudes[i] ?? 0,
          bandwidth: 50, // Simplified
          phase: 0,
          confidence: magnitudes[i] ?? 0
        });
      }
    }

    return partials.sort((a, b) => b.amplitude - a.amplitude).slice(0, 20); // Top 20 partials
  }

  private calculateHNR(harmonics: HarmonicComponent[], magnitudes: Float32Array): number {
    const harmonicEnergy = harmonics.reduce((sum, h) => sum + h.amplitude * h.amplitude, 0);
    const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag * mag, 0);
    const noiseEnergy = totalEnergy - harmonicEnergy;

    return noiseEnergy > 0 ? 10 * Math.log10(harmonicEnergy / noiseEnergy) : Infinity;
  }

  private calculateHarmonicCentroid(harmonics: HarmonicComponent[]): number {
    let numerator = 0;
    let denominator = 0;

    for (const harmonic of harmonics) {
      numerator += harmonic.frequency * harmonic.amplitude;
      denominator += harmonic.amplitude;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateHarmonicSpread(harmonics: HarmonicComponent[]): number {
    const centroid = this.calculateHarmonicCentroid(harmonics);
    let numerator = 0;
    let denominator = 0;

    for (const harmonic of harmonics) {
      const deviation = harmonic.frequency - centroid;
      numerator += deviation * deviation * harmonic.amplitude;
      denominator += harmonic.amplitude;
    }

    return denominator > 0 ? Math.sqrt(numerator / denominator) : 0;
  }

  private calculateHarmonicComplexity(harmonics: HarmonicComponent[]): number {
    return Math.min(harmonics.length / 10, 1); // Simplified complexity measure
  }

  private computeBarkSpectrum(powerSpectrum: Float32Array): Float32Array {
    // Simplified Bark spectrum computation
    const barkBands = 24;
    const barkSpectrum = new Float32Array(barkBands);

    for (let bark = 0; bark < barkBands; bark++) {
      const startFreq = this.barkToHz(bark);
      const endFreq = this.barkToHz(bark + 1);

      let energy = 0;
      let count = 0;

      for (let i = 0; i < powerSpectrum.length; i++) {
        const freq = (i * this.config.sampleRate) / (2 * (powerSpectrum.length - 1));
        if (freq >= startFreq && freq < endFreq) {
          energy += (powerSpectrum[i] ?? 0);
          count++;
        }
      }

      barkSpectrum[bark] = count > 0 ? energy / count : 0;
    }

    return barkSpectrum;
  }

  private barkToHz(bark: number): number {
    return 600 * Math.sinh(bark / 4);
  }

  private computeLoudness(barkSpectrum: Float32Array): number {
    // Simplified loudness calculation
    return barkSpectrum.reduce((sum, energy) => sum + Math.pow(energy, 0.23), 0);
  }

  private computeSharpness(barkSpectrum: Float32Array): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < barkSpectrum.length; i++) {
      const sharpnessWeight = Math.pow(10, 0.171 * i);
      numerator += sharpnessWeight * (barkSpectrum[i] ?? 0);
      denominator += (barkSpectrum[i] ?? 0);
    }

    return denominator > 0 ? 0.11 * numerator / denominator : 0;
  }

  private computeRoughness(barkSpectrum: Float32Array): number {
    // Simplified roughness calculation
    let roughness = 0;

    for (let i = 0; i < barkSpectrum.length - 1; i++) {
      const beatFreq = Math.abs(this.barkToHz(i + 1) - this.barkToHz(i));
      const roughnessWeight = Math.pow(beatFreq / 70, 0.5) * Math.exp(-beatFreq / 70);
      roughness += roughnessWeight * Math.min(barkSpectrum[i] ?? 0, barkSpectrum[i + 1] ?? 0);
    }

    return roughness;
  }

  private computeFluctuationStrength(frames: SpectralFrame[]): number {
    // Simplified fluctuation strength
    if (frames.length < 2) return 0;

    let fluctuation = 0;
    for (let i = 1; i < frames.length; i++) {
      const energyDiff = Math.abs(
        (frames[i]?.magnitudes.reduce((sum, mag) => sum + (mag ?? 0), 0) ?? 0) -
        (frames[i - 1]?.magnitudes.reduce((sum, mag) => sum + (mag ?? 0), 0) ?? 0)
      );
      fluctuation += energyDiff;
    }

    return fluctuation / (frames.length - 1);
  }

  private computeTonality(powerSpectrum: Float32Array): number {
    // Simplified tonality measure
    const spectralFlatness = this.featureExtractor['calculateSpectralFlatness'](powerSpectrum);
    return 1 - spectralFlatness;
  }

  private computeMaskingThreshold(powerSpectrum: Float32Array): Float32Array {
    // Simplified masking threshold
    const threshold = new Float32Array(powerSpectrum.length);
    for (let i = 0; i < threshold.length; i++) {
      threshold[i] = (powerSpectrum[i] ?? 0) * 0.1; // Simplified
    }
    return threshold;
  }

  // Simplified advanced metrics implementations
  private computeSpectralEntropy(frames: SpectralFrame[]): number {
    // Average spectral entropy across frames
    let totalEntropy = 0;

    for (const frame of frames) {
      let entropy = 0;
      const totalEnergy = frame.powerSpectrum.reduce((sum, power) => sum + (power ?? 0), 0);

      if (totalEnergy > 0) {
        for (const power of frame.powerSpectrum) {
          if ((power ?? 0) > 0) {
            const prob = (power ?? 0) / totalEnergy;
            entropy -= prob * Math.log2(prob);
          }
        }
      }

      totalEntropy += entropy;
    }

    return frames.length > 0 ? totalEntropy / frames.length : 0;
  }

  private computeComplexity(features: SpectralFeatures[]): number {
    if (features.length === 0) return 0;

    // Variance in spectral features as complexity measure
    const centroidVariance = this.computeVariance(features.map(f => f?.spectralCentroid ?? 0));
    const flatnessVariance = this.computeVariance(features.map(f => f?.spectralFlatness ?? 0));

    return (centroidVariance + flatnessVariance) / 2;
  }

  private computePredictability(features: SpectralFeatures[]): number {
    if (features.length < 2) return 0;

    // Autocorrelation of spectral centroid as predictability measure
    const centroids = features.map(f => f?.spectralCentroid ?? 0);
    return this.computeAutocorrelation(centroids, 1);
  }

  private computeStationarity(features: SpectralFeatures[]): number {
    if (features.length < 2) return 1;

    // Inverse of spectral change rate
    let totalChange = 0;
    for (let i = 1; i < features.length; i++) {
      totalChange += Math.abs((features[i]?.spectralCentroid ?? 0) - (features[i - 1]?.spectralCentroid ?? 0));
    }

    const averageChange = totalChange / (features.length - 1);
    return 1 / (1 + averageChange);
  }

  private computePeriodicity(frames: SpectralFrame[]): number {
    if (frames.length < 2) return 0;

    // Autocorrelation of magnitude spectrum
    const magnitudes = frames.map(frame =>
      frame.magnitudes.reduce((sum, mag) => sum + mag, 0)
    );

    return this.computeAutocorrelation(magnitudes, Math.floor(magnitudes.length / 4));
  }

  private computeChaos(features: SpectralFeatures[]): number {
    // Simplified chaos measure using Lyapunov exponent approximation
    if (features.length < 3) return 0;

    let totalDivergence = 0;
    let count = 0;

    for (let i = 2; i < features.length; i++) {
      const diff1 = Math.abs((features[i]?.spectralCentroid ?? 0) - (features[i - 1]?.spectralCentroid ?? 0));
      const diff2 = Math.abs((features[i - 1]?.spectralCentroid ?? 0) - (features[i - 2]?.spectralCentroid ?? 0));

      if (diff2 > 0) {
        totalDivergence += Math.log(diff1 / diff2);
        count++;
      }
    }

    return count > 0 ? Math.max(0, totalDivergence / count) : 0;
  }

  private computeFractalDimension(features: SpectralFeatures[]): number {
    // Simplified fractal dimension using box-counting
    const values = features.map(f => f?.spectralCentroid ?? 0);
    if (values.length < 4) return 1;

    // Normalize values
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) return 1;

    const normalizedValues = values.map(v => ((v ?? 0) - min) / range);

    // Simple box-counting approximation
    const boxSizes = [0.1, 0.2, 0.5];
    const counts = [];

    for (const boxSize of boxSizes) {
      const boxes = new Set<string>();
      for (let i = 0; i < normalizedValues.length; i++) {
        const boxX = Math.floor(i / normalizedValues.length / boxSize);
        const boxY = Math.floor((normalizedValues[i] ?? 0) / boxSize);
        boxes.add(`${boxX},${boxY}`);
      }
      counts.push(boxes.size);
    }

    // Linear regression to find fractal dimension
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < boxSizes.length; i++) {
      const x = Math.log(1 / (boxSizes[i] ?? 1));
      const y = Math.log(counts[i] ?? 0);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const n = boxSizes.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return Math.max(1, Math.min(2, slope));
  }

  private computeSpectralCoherence(frames: SpectralFrame[]): Float32Array {
    if (frames.length < 2) return new Float32Array(0);

    const numBins = frames[0]?.magnitudes.length ?? 0;
    const coherence = new Float32Array(numBins);

    for (let bin = 0; bin < numBins; bin++) {
      let correlation = 0;
      let count = 0;

      for (let i = 1; i < frames.length; i++) {
        const current = frames[i]?.magnitudes[bin] ?? 0;
        const previous = frames[i - 1]?.magnitudes[bin] ?? 0;

        if (current > 0 && previous > 0) {
          correlation += (current * previous) / Math.sqrt(current * current + previous * previous);
          count++;
        }
      }

      coherence[bin] = count > 0 ? correlation / count : 0;
    }

    return coherence;
  }

  private computeVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) * (val - mean), 0) / values.length;

    return variance;
  }

  private computeAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < values.length - lag; i++) {
      const x = (values[i] ?? 0) - mean;
      const y = (values[i + lag] ?? 0) - mean;
      numerator += x * y;
      denominator += x * x;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  // Public API
  public setConfig(config: Partial<SpectralAnalysisConfig>): void {
    Object.assign(this.config, config);

    // Recreate processors if necessary
    if (config.fftSize || config.windowType) {
      this.fftProcessor = new AdvancedFFTProcessor(
        this.config.fftSize,
        this.config.windowType
      );
    }

    if (config.sampleRate) {
      this.featureExtractor = new SpectralFeatureExtractor(this.config.sampleRate);
      this.melProcessor = new MelFrequencyProcessor(this.config.sampleRate);
      this.chromaExtractor = new ChromaFeatureExtractor(this.config.sampleRate);
    }

    this.emit('configChanged', this.config);
  }

  public getConfig(): SpectralAnalysisConfig {
    return { ...this.config };
  }

  public getAnalyzingState(): boolean {
    return this.isAnalyzing;
  }

  public getFrameHistory(): SpectralFrame[] {
    return [...this.frameHistory];
  }

  public getFeatureHistory(): SpectralFeatures[] {
    return [...this.featureHistory];
  }

  public clearHistory(): void {
    this.frameHistory = [];
    this.featureHistory = [];
    this.emit('historyCleared');
  }

  public destroy(): void {
    this.isAnalyzing = false;
    this.clearHistory();
    this.removeAllListeners();
  }
}

// Utility functions for spectral analysis
export const SpectralAnalysisUtils = {
  // Window function generators
  generateWindow: (size: number, type: WindowType): Float32Array => {
    const window = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      const n = i / (size - 1);

      switch (type) {
        case 'hann':
          window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * n);
          break;
        case 'hamming':
          window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * n);
          break;
        case 'blackman':
          window[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * n) + 0.08 * Math.cos(4 * Math.PI * n);
          break;
        default:
          window[i] = 1;
      }
    }

    return window;
  },

  // Frequency scale conversions
  hzToMel: (hz: number): number => 2595 * Math.log10(1 + hz / 700),
  melToHz: (mel: number): number => 700 * (Math.pow(10, mel / 2595) - 1),
  hzToBark: (hz: number): number => 13 * Math.atan(0.00076 * hz) + 3.5 * Math.atan((hz / 7500) ** 2),
  barkToHz: (bark: number): number => 600 * Math.sinh(bark / 4),

  // Feature normalization
  normalizeFeatures: (features: SpectralFeatures[]): SpectralFeatures[] => {
    if (features.length === 0) return features;

    // Compute min/max for each feature
    const mins: Partial<SpectralFeatures> = {};
    const maxs: Partial<SpectralFeatures> = {};

    const firstFeature = features[0];
    if (!firstFeature) return features;

    for (const key of Object.keys(firstFeature) as (keyof SpectralFeatures)[]) {
      if (typeof firstFeature[key] === 'number') {
        const values = features.map(f => (f?.[key] as number) ?? 0);
        mins[key] = Math.min(...values) as any;
        maxs[key] = Math.max(...values) as any;
      }
    }

    // Normalize features
    return features.map(feature => {
      const normalized = { ...feature };
      for (const key of Object.keys(feature) as (keyof SpectralFeatures)[]) {
        if (typeof feature[key] === 'number') {
          const min = mins[key] as number;
          const max = maxs[key] as number;
          if (max > min) {
            (normalized[key] as number) = ((feature[key] as number) - min) / (max - min);
          }
        }
      }
      return normalized;
    });
  }
};

// Preset configurations for different analysis types
export const SpectralAnalysisPresets = {
  MUSIC_ANALYSIS: {
    sampleRate: 44100,
    fftSize: 2048,
    hopSize: 512,
    windowType: 'hann' as WindowType,
    overlapRatio: 0.75,
    zeropadFactor: 1,
    enablePreemphasis: false,
    preemphasisCoeff: 0.97
  },

  SPEECH_ANALYSIS: {
    sampleRate: 16000,
    fftSize: 512,
    hopSize: 160,
    windowType: 'hamming' as WindowType,
    overlapRatio: 0.5,
    zeropadFactor: 1,
    enablePreemphasis: true,
    preemphasisCoeff: 0.97
  },

  HIGH_RESOLUTION: {
    sampleRate: 48000,
    fftSize: 4096,
    hopSize: 1024,
    windowType: 'blackman' as WindowType,
    overlapRatio: 0.75,
    zeropadFactor: 2,
    enablePreemphasis: false,
    preemphasisCoeff: 0.97
  },

  REAL_TIME: {
    sampleRate: 44100,
    fftSize: 1024,
    hopSize: 256,
    windowType: 'hann' as WindowType,
    overlapRatio: 0.75,
    zeropadFactor: 1,
    enablePreemphasis: false,
    preemphasisCoeff: 0.97
  }
};