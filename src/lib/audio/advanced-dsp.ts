"use client";

// Advanced Digital Signal Processing Library for Professional Audio

interface SpectralAnalysisResult {
  magnitudeSpectrum: Float32Array;
  phaseSpectrum: Float32Array;
  frequencyBins: Float32Array;
  peakFrequencies: Array<{ frequency: number; magnitude: number; phase: number }>;
  spectralCentroid: number;
  spectralBandwidth: number;
  spectralRolloff: number;
  spectralFlux: number;
  harmonicity: number;
}

interface PsychoacousticAnalysis {
  barkScale: Float32Array;
  melScale: Float32Array;
  criticalBands: Array<{ lowFreq: number; highFreq: number; energy: number }>;
  maskingThresholds: Float32Array;
  tonalityCoefficient: number;
  roughness: number;
  sharpness: number;
  loudnessPhons: number;
  loudnessSones: number;
}

interface SpatialAudioMetrics {
  stereoWidth: number;
  correlationCoeff: number;
  phaseCoherence: number;
  lateralEnergyFraction: number;
  centerOfGravity: { x: number; y: number }; // -1 to 1 range
  surroundEnergy: number;
  immersiveness: number;
}

interface DynamicsAnalysis {
  peakLevel: number;
  rmsLevel: number;
  crestFactor: number;
  dynamicRange: number;
  momentaryLoudness: number; // LUFS
  shortTermLoudness: number; // LUFS
  integratedLoudness: number; // LUFS
  loudnessRange: number; // LU
  truePeakLevel: number; // dBTP
  pliGating: boolean;
}

interface HarmonicAnalysis {
  fundamentalFrequency: number;
  harmonics: Array<{ frequency: number; magnitude: number; phase: number; harmonic: number }>;
  totalHarmonicDistortion: number;
  harmonicToNoiseRatio: number;
  inharmonicity: number;
  spectralCrest: number;
  oddEvenRatio: number;
}

class AdvancedDSPProcessor {
  private sampleRate: number;
  private fftSize: number;
  private windowFunction: Float32Array;
  private previousSpectrum?: Float32Array;
  private barkFilters: Float32Array[];
  private melFilters: Float32Array[];

  constructor(sampleRate: number = 44100, fftSize: number = 4096) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.windowFunction = this.generateWindow('hanning', fftSize);
    this.barkFilters = this.generateBarkFilters();
    this.melFilters = this.generateMelFilters();
  }

  // Advanced Spectral Analysis
  public performSpectralAnalysis(audioData: Float32Array): SpectralAnalysisResult {
    const windowedData = this.applyWindow(audioData);
    const spectrum = this.computeFFT(windowedData);

    const magnitudes = spectrum.magnitudes;
    const phases = spectrum.phases;
    const frequencyBins = this.generateFrequencyBins();

    return {
      magnitudeSpectrum: magnitudes,
      phaseSpectrum: phases,
      frequencyBins,
      peakFrequencies: this.findSpectralPeaks(magnitudes, frequencyBins),
      spectralCentroid: this.calculateSpectralCentroid(magnitudes, frequencyBins),
      spectralBandwidth: this.calculateSpectralBandwidth(magnitudes, frequencyBins),
      spectralRolloff: this.calculateSpectralRolloff(magnitudes, frequencyBins, 0.85),
      spectralFlux: this.calculateSpectralFlux(magnitudes, this.previousSpectrum),
      harmonicity: this.calculateHarmonicity(magnitudes, frequencyBins)
    };
  }

  // Psychoacoustic Analysis
  public performPsychoacousticAnalysis(audioData: Float32Array): PsychoacousticAnalysis {
    const spectrum = this.computeFFT(this.applyWindow(audioData));
    const magnitudes = spectrum.magnitudes;

    const barkSpectrum = this.applyBarkFiltering(magnitudes);
    const melSpectrum = this.applyMelFiltering(magnitudes);
    const criticalBands = this.analyzeCriticalBands(magnitudes);
    const maskingThresholds = this.calculateMaskingThresholds(magnitudes);

    return {
      barkScale: barkSpectrum,
      melScale: melSpectrum,
      criticalBands,
      maskingThresholds,
      tonalityCoefficient: this.calculateTonality(magnitudes),
      roughness: this.calculateRoughness(barkSpectrum),
      sharpness: this.calculateSharpness(barkSpectrum),
      loudnessPhons: this.calculateLoudnessPhons(criticalBands),
      loudnessSones: this.calculateLoudnessSones(criticalBands)
    };
  }

  // Spatial Audio Analysis
  public analyzeSpatialAudio(leftChannel: Float32Array, rightChannel: Float32Array): SpatialAudioMetrics {
    const correlation = this.calculateCrossCorrelation(leftChannel, rightChannel);
    const phaseCoherence = this.calculatePhaseCoherence(leftChannel, rightChannel);
    const stereoWidth = this.calculateStereoWidth(leftChannel, rightChannel);

    return {
      stereoWidth,
      correlationCoeff: correlation,
      phaseCoherence,
      lateralEnergyFraction: this.calculateLateralEnergyFraction(leftChannel, rightChannel),
      centerOfGravity: this.calculateStereoImageCenter(leftChannel, rightChannel),
      surroundEnergy: this.calculateSurroundEnergy(leftChannel, rightChannel),
      immersiveness: this.calculateImmersiveness(leftChannel, rightChannel)
    };
  }

  // Professional Loudness and Dynamics Analysis
  public analyzeDynamics(audioData: Float32Array): DynamicsAnalysis {
    const peak = this.findTruePeak(audioData);
    const rms = this.calculateRMS(audioData);
    const momentaryLoudness = this.calculateMomentaryLoudness(audioData);
    const shortTermLoudness = this.calculateShortTermLoudness(audioData);
    const integratedLoudness = this.calculateIntegratedLoudness(audioData);

    return {
      peakLevel: 20 * Math.log10(Math.max(...audioData.map(Math.abs))),
      rmsLevel: 20 * Math.log10(rms),
      crestFactor: 20 * Math.log10(Math.max(...audioData.map(Math.abs)) / rms),
      dynamicRange: this.calculateDynamicRange(audioData),
      momentaryLoudness,
      shortTermLoudness,
      integratedLoudness,
      loudnessRange: this.calculateLoudnessRange(audioData),
      truePeakLevel: 20 * Math.log10(peak),
      pliGating: integratedLoudness > -70 // Program Loudness Integration gating
    };
  }

  // Harmonic Analysis
  public analyzeHarmonics(audioData: Float32Array): HarmonicAnalysis {
    const spectrum = this.computeFFT(this.applyWindow(audioData));
    const magnitudes = spectrum.magnitudes;
    const phases = spectrum.phases;
    const frequencyBins = this.generateFrequencyBins();

    const f0 = this.estimateFundamentalFrequency(magnitudes, frequencyBins);
    const harmonics = this.extractHarmonics(magnitudes, phases, frequencyBins, f0);
    const thd = this.calculateTotalHarmonicDistortion(harmonics);

    return {
      fundamentalFrequency: f0,
      harmonics,
      totalHarmonicDistortion: thd,
      harmonicToNoiseRatio: this.calculateHarmonicToNoiseRatio(harmonics, magnitudes),
      inharmonicity: this.calculateInharmonicity(harmonics, f0),
      spectralCrest: this.calculateSpectralCrest(magnitudes),
      oddEvenRatio: this.calculateOddEvenHarmonicRatio(harmonics)
    };
  }

  // Advanced Filtering and Processing Methods
  public applyPsychoacousticMasking(audioData: Float32Array, maskingThreshold: Float32Array): Float32Array {
    const spectrum = this.computeFFT(this.applyWindow(audioData));
    const magnitudes = spectrum.magnitudes;
    const phases = spectrum.phases;

    // Apply masking
    for (let i = 0; i < magnitudes.length; i++) {
      const magnitudeDb = 20 * Math.log10((magnitudes[i] ?? 0) + 1e-10);
      const thresholdDb = maskingThreshold[i] ?? 0;

      if (magnitudeDb < thresholdDb) {
        if (magnitudes[i] !== undefined) magnitudes[i]! *= 0.1; // Heavily attenuate masked frequencies
      }
    }

    return this.computeIFFT(magnitudes, phases);
  }

  public performSpectralSubtraction(
    noisyAudio: Float32Array,
    noiseProfile: Float32Array,
    alpha: number = 2.0,
    beta: number = 0.01
  ): Float32Array {
    const spectrum = this.computeFFT(this.applyWindow(noisyAudio));
    const magnitudes = spectrum.magnitudes;
    const phases = spectrum.phases;

    const noiseSpectrum = this.computeFFT(this.applyWindow(noiseProfile));
    const noiseMagnitudes = noiseSpectrum.magnitudes;

    // Spectral subtraction
    for (let i = 0; i < magnitudes.length; i++) {
      const subtracted = (magnitudes[i] ?? 0) - alpha * (noiseMagnitudes[i] ?? 0);
      magnitudes[i] = Math.max(subtracted, beta * (magnitudes[i] ?? 0));
    }

    return this.computeIFFT(magnitudes, phases);
  }

  // Private Helper Methods

  private generateWindow(type: string, size: number): Float32Array {
    const window = new Float32Array(size);

    switch (type.toLowerCase()) {
      case 'hanning':
      case 'hann':
        for (let i = 0; i < size; i++) {
          window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
        }
        break;
      case 'hamming':
        for (let i = 0; i < size; i++) {
          window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
        }
        break;
      case 'blackman':
        for (let i = 0; i < size; i++) {
          window[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (size - 1));
        }
        break;
      case 'kaiser':
        const beta = 8.6;
        const i0Beta = this.modifiedBesselI0(beta);
        for (let i = 0; i < size; i++) {
          const x = (2 * i / (size - 1)) - 1;
          window[i] = this.modifiedBesselI0(beta * Math.sqrt(1 - x * x)) / i0Beta;
        }
        break;
      default:
        window.fill(1); // Rectangular window
    }

    return window;
  }

  private modifiedBesselI0(x: number): number {
    let sum = 1;
    let term = 1;

    for (let i = 1; i < 50; i++) {
      term *= (x / (2 * i)) ** 2;
      sum += term;
      if (term < 1e-10) break;
    }

    return sum;
  }

  private applyWindow(data: Float32Array): Float32Array {
    const windowed = new Float32Array(data.length);
    const windowSize = Math.min(data.length, this.windowFunction.length);

    for (let i = 0; i < windowSize; i++) {
      windowed[i] = (data[i] ?? 0) * (this.windowFunction[i] ?? 0);
    }

    return windowed;
  }

  private computeFFT(data: Float32Array): { magnitudes: Float32Array; phases: Float32Array } {
    const size = data.length;
    const real = new Float32Array(size);
    const imag = new Float32Array(size);

    // Copy input data
    real.set(data);
    imag.fill(0);

    // Cooley-Tukey FFT
    this.cooleyTukeyFFT(real, imag);

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

      // Mirror for negative frequencies
      if (i > 0 && i < magnitudes.length - 1) {
        real[size - i] = real[i] ?? 0;
        imag[size - i] = -(imag[i] ?? 0);
      }
    }

    // IFFT (conjugate, FFT, conjugate, scale)
    for (let i = 0; i < size; i++) {
      imag[i] = -(imag[i] ?? 0);
    }

    this.cooleyTukeyFFT(real, imag);

    const result = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = (real[i] ?? 0) / size;
    }

    return result;
  }

  private cooleyTukeyFFT(real: Float32Array, imag: Float32Array): void {
    const n = real.length;

    // Bit-reversal permutation
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

  private generateFrequencyBins(): Float32Array {
    const bins = new Float32Array(this.fftSize / 2);
    for (let i = 0; i < bins.length; i++) {
      bins[i] = (i * this.sampleRate) / this.fftSize;
    }
    return bins;
  }

  private findSpectralPeaks(
    magnitudes: Float32Array,
    frequencies: Float32Array,
    threshold: number = 0.1
  ): Array<{ frequency: number; magnitude: number; phase: number }> {
    const peaks: Array<{ frequency: number; magnitude: number; phase: number }> = [];
    const maxMag = Math.max(...magnitudes);
    const minThreshold = maxMag * threshold;

    for (let i = 1; i < magnitudes.length - 1; i++) {
      if ((magnitudes[i] ?? 0) > (magnitudes[i - 1] ?? 0) &&
          (magnitudes[i] ?? 0) > (magnitudes[i + 1] ?? 0) &&
          (magnitudes[i] ?? 0) > minThreshold) {
        peaks.push({
          frequency: frequencies[i] ?? 0,
          magnitude: magnitudes[i] ?? 0,
          phase: 0 // Would need phase spectrum for accurate phase
        });
      }
    }

    return peaks.sort((a, b) => b.magnitude - a.magnitude).slice(0, 20); // Top 20 peaks
  }

  private calculateSpectralCentroid(magnitudes: Float32Array, frequencies: Float32Array): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      numerator += (frequencies[i] ?? 0) * (magnitudes[i] ?? 0);
      denominator += magnitudes[i] ?? 0;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateSpectralBandwidth(magnitudes: Float32Array, frequencies: Float32Array): number {
    const centroid = this.calculateSpectralCentroid(magnitudes, frequencies);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      const deviation = (frequencies[i] ?? 0) - centroid;
      numerator += deviation * deviation * (magnitudes[i] ?? 0);
      denominator += magnitudes[i] ?? 0;
    }

    return denominator > 0 ? Math.sqrt(numerator / denominator) : 0;
  }

  private calculateSpectralRolloff(
    magnitudes: Float32Array,
    frequencies: Float32Array,
    threshold: number = 0.85
  ): number {
    const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag * mag, 0);
    const targetEnergy = totalEnergy * threshold;

    let cumulativeEnergy = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += (magnitudes[i] ?? 0) * (magnitudes[i] ?? 0);
      if (cumulativeEnergy >= targetEnergy) {
        return frequencies[i] ?? 0;
      }
    }

    return frequencies[frequencies.length - 1] ?? 0;
  }

  private calculateSpectralFlux(current: Float32Array, previous?: Float32Array): number {
    if (!previous) {
      this.previousSpectrum = new Float32Array(current);
      return 0;
    }

    let flux = 0;
    const minLength = Math.min(current.length, previous.length);

    for (let i = 0; i < minLength; i++) {
      const diff = (current[i] ?? 0) - (previous[i] ?? 0);
      flux += diff * diff;
    }

    this.previousSpectrum = new Float32Array(current);
    return Math.sqrt(flux / minLength);
  }

  private calculateHarmonicity(magnitudes: Float32Array, frequencies: Float32Array): number {
    // Simplified harmonicity calculation
    const peaks = this.findSpectralPeaks(magnitudes, frequencies, 0.05);
    if (peaks.length < 2) return 0;

    let harmonicPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < peaks.length; i++) {
      for (let j = i + 1; j < peaks.length; j++) {
        const ratio = (peaks[j]?.frequency ?? 0) / (peaks[i]?.frequency ?? 1);
        const nearestInteger = Math.round(ratio);

        if (Math.abs(ratio - nearestInteger) < 0.05 && nearestInteger >= 2) {
          harmonicPairs++;
        }
        totalPairs++;
      }
    }

    return totalPairs > 0 ? harmonicPairs / totalPairs : 0;
  }

  private generateBarkFilters(): Float32Array[] {
    const numFilters = 24;
    const filters: Float32Array[] = [];

    for (let i = 0; i < numFilters; i++) {
      const filter = new Float32Array(this.fftSize / 2);
      const centerBark = i + 1;

      for (let j = 0; j < filter.length; j++) {
        const freq = (j * this.sampleRate) / this.fftSize;
        const bark = this.frequencyToBark(freq);

        // Triangular filter
        const distance = Math.abs(bark - centerBark);
        if (distance <= 1) {
          filter[j] = 1 - distance;
        }
      }

      filters.push(filter);
    }

    return filters;
  }

  private generateMelFilters(): Float32Array[] {
    const numFilters = 26;
    const filters: Float32Array[] = [];

    const minMel = this.frequencyToMel(0);
    const maxMel = this.frequencyToMel(this.sampleRate / 2);

    for (let i = 0; i < numFilters; i++) {
      const filter = new Float32Array(this.fftSize / 2);
      const centerMel = minMel + (i + 1) * (maxMel - minMel) / (numFilters + 1);
      const centerFreq = this.melToFrequency(centerMel);

      const prevMel = minMel + i * (maxMel - minMel) / (numFilters + 1);
      const nextMel = minMel + (i + 2) * (maxMel - minMel) / (numFilters + 1);
      const prevFreq = this.melToFrequency(prevMel);
      const nextFreq = this.melToFrequency(nextMel);

      for (let j = 0; j < filter.length; j++) {
        const freq = (j * this.sampleRate) / this.fftSize;

        if (freq >= prevFreq && freq <= nextFreq) {
          if (freq <= centerFreq) {
            filter[j] = (freq - prevFreq) / (centerFreq - prevFreq);
          } else {
            filter[j] = (nextFreq - freq) / (nextFreq - centerFreq);
          }
        }
      }

      filters.push(filter);
    }

    return filters;
  }

  private frequencyToBark(freq: number): number {
    return 13 * Math.atan(0.00076 * freq) + 3.5 * Math.atan((freq / 7500) ** 2);
  }

  private frequencyToMel(freq: number): number {
    return 2595 * Math.log10(1 + freq / 700);
  }

  private melToFrequency(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  private applyBarkFiltering(magnitudes: Float32Array): Float32Array {
    const barkSpectrum = new Float32Array(this.barkFilters.length);

    for (let i = 0; i < this.barkFilters.length; i++) {
      let sum = 0;
      for (let j = 0; j < magnitudes.length; j++) {
        sum += (magnitudes[j] ?? 0) * (this.barkFilters[i]?.[j] ?? 0);
      }
      barkSpectrum[i] = sum;
    }

    return barkSpectrum;
  }

  private applyMelFiltering(magnitudes: Float32Array): Float32Array {
    const melSpectrum = new Float32Array(this.melFilters.length);

    for (let i = 0; i < this.melFilters.length; i++) {
      let sum = 0;
      for (let j = 0; j < magnitudes.length; j++) {
        sum += (magnitudes[j] ?? 0) * (this.melFilters[i]?.[j] ?? 0);
      }
      melSpectrum[i] = Math.log(sum + 1e-10); // Log mel spectrum
    }

    return melSpectrum;
  }

  private analyzeCriticalBands(magnitudes: Float32Array): Array<{ lowFreq: number; highFreq: number; energy: number }> {
    const criticalBands = [
      { low: 0, high: 100 }, { low: 100, high: 200 }, { low: 200, high: 300 },
      { low: 300, high: 400 }, { low: 400, high: 510 }, { low: 510, high: 630 },
      { low: 630, high: 770 }, { low: 770, high: 920 }, { low: 920, high: 1080 },
      { low: 1080, high: 1270 }, { low: 1270, high: 1480 }, { low: 1480, high: 1720 },
      { low: 1720, high: 2000 }, { low: 2000, high: 2320 }, { low: 2320, high: 2700 },
      { low: 2700, high: 3150 }, { low: 3150, high: 3700 }, { low: 3700, high: 4400 },
      { low: 4400, high: 5300 }, { low: 5300, high: 6400 }, { low: 6400, high: 7700 },
      { low: 7700, high: 9500 }, { low: 9500, high: 12000 }, { low: 12000, high: 15500 }
    ];

    return criticalBands.map(band => {
      const lowBin = Math.floor(band.low * this.fftSize / this.sampleRate);
      const highBin = Math.floor(band.high * this.fftSize / this.sampleRate);

      let energy = 0;
      for (let i = lowBin; i <= highBin && i < magnitudes.length; i++) {
        energy += (magnitudes[i] ?? 0) * (magnitudes[i] ?? 0);
      }

      return {
        lowFreq: band.low,
        highFreq: band.high,
        energy: Math.sqrt(energy)
      };
    });
  }

  private calculateMaskingThresholds(magnitudes: Float32Array): Float32Array {
    // Simplified masking threshold calculation
    const thresholds = new Float32Array(magnitudes.length);

    for (let i = 0; i < magnitudes.length; i++) {
      const freq = (i * this.sampleRate) / this.fftSize;

      // Absolute threshold of hearing (simplified)
      let absoluteThreshold = 3.64 * Math.pow(freq / 1000, -0.8) -
                             6.5 * Math.exp(-0.6 * Math.pow(freq / 1000 - 3.3, 2)) +
                             0.001 * Math.pow(freq / 1000, 4);

      // Convert from dB to linear
      absoluteThreshold = Math.pow(10, absoluteThreshold / 20);

      // Masking threshold is at least the absolute threshold
      thresholds[i] = Math.max(absoluteThreshold, (magnitudes[i] ?? 0) * 0.01);
    }

    return thresholds;
  }

  private calculateTonality(magnitudes: Float32Array): number {
    // Spectral flatness measure inverted (1 - spectral flatness = tonality)
    let geometricMean = 1;
    let arithmeticMean = 0;
    let count = 0;

    for (let i = 1; i < magnitudes.length; i++) {
      if ((magnitudes[i] ?? 0) > 0) {
        geometricMean *= magnitudes[i] ?? 0;
        arithmeticMean += magnitudes[i] ?? 0;
        count++;
      }
    }

    if (count === 0) return 0;

    geometricMean = Math.pow(geometricMean, 1 / count);
    arithmeticMean /= count;

    const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
    return 1 - spectralFlatness;
  }

  private calculateRoughness(barkSpectrum: Float32Array): number {
    let roughness = 0;

    for (let i = 0; i < barkSpectrum.length - 1; i++) {
      const diff = Math.abs((barkSpectrum[i + 1] ?? 0) - (barkSpectrum[i] ?? 0));
      roughness += diff * Math.exp(-0.25 * i); // Weight by frequency
    }

    return roughness / barkSpectrum.length;
  }

  private calculateSharpness(barkSpectrum: Float32Array): number {
    let sharpness = 0;
    let totalEnergy = 0;

    for (let i = 0; i < barkSpectrum.length; i++) {
      const weight = Math.pow(i / barkSpectrum.length, 4); // Higher frequencies weighted more
      sharpness += (barkSpectrum[i] ?? 0) * weight;
      totalEnergy += barkSpectrum[i] ?? 0;
    }

    return totalEnergy > 0 ? sharpness / totalEnergy : 0;
  }

  private calculateLoudnessPhons(criticalBands: Array<{ lowFreq: number; highFreq: number; energy: number }>): number {
    // Simplified loudness calculation in Phons
    let totalLoudness = 0;

    for (const band of criticalBands) {
      const centerFreq = Math.sqrt(band.lowFreq * band.highFreq);
      const spl = 20 * Math.log10(band.energy + 1e-10) + 94; // Assume 94 dB reference

      // Equal-loudness contour compensation (simplified)
      let phons = spl;
      if (centerFreq < 1000) {
        phons += 10 * Math.log10(1000 / centerFreq);
      } else if (centerFreq > 1000) {
        phons -= 5 * Math.log10(centerFreq / 1000);
      }

      totalLoudness += Math.max(0, phons);
    }

    return totalLoudness / criticalBands.length;
  }

  private calculateLoudnessSones(criticalBands: Array<{ lowFreq: number; highFreq: number; energy: number }>): number {
    const phons = this.calculateLoudnessPhons(criticalBands);

    // Stevens' power law for loudness
    if (phons > 40) {
      return Math.pow(2, (phons - 40) / 10);
    } else {
      return 0.25 * Math.pow(phons / 40, 2.5);
    }
  }

  private calculateCrossCorrelation(left: Float32Array, right: Float32Array): number {
    const minLength = Math.min(left.length, right.length);
    let correlation = 0;
    let leftSum = 0;
    let rightSum = 0;
    let leftSumSq = 0;
    let rightSumSq = 0;

    for (let i = 0; i < minLength; i++) {
      correlation += (left[i] ?? 0) * (right[i] ?? 0);
      leftSum += left[i] ?? 0;
      rightSum += right[i] ?? 0;
      leftSumSq += (left[i] ?? 0) * (left[i] ?? 0);
      rightSumSq += (right[i] ?? 0) * (right[i] ?? 0);
    }

    const leftMean = leftSum / minLength;
    const rightMean = rightSum / minLength;
    const leftStd = Math.sqrt(leftSumSq / minLength - leftMean * leftMean);
    const rightStd = Math.sqrt(rightSumSq / minLength - rightMean * rightMean);

    const covariance = correlation / minLength - leftMean * rightMean;

    return leftStd * rightStd > 0 ? covariance / (leftStd * rightStd) : 0;
  }

  private calculatePhaseCoherence(left: Float32Array, right: Float32Array): number {
    const leftSpectrum = this.computeFFT(this.applyWindow(left));
    const rightSpectrum = this.computeFFT(this.applyWindow(right));

    let coherence = 0;
    let count = 0;

    for (let i = 1; i < leftSpectrum.phases.length; i++) {
      const phaseDiff = Math.abs((leftSpectrum.phases[i] ?? 0) - (rightSpectrum.phases[i] ?? 0));
      const normalizedDiff = Math.min(phaseDiff, 2 * Math.PI - phaseDiff);
      coherence += 1 - normalizedDiff / Math.PI;
      count++;
    }

    return count > 0 ? coherence / count : 0;
  }

  private calculateStereoWidth(left: Float32Array, right: Float32Array): number {
    const mid = new Float32Array(left.length);
    const side = new Float32Array(left.length);

    for (let i = 0; i < left.length; i++) {
      mid[i] = ((left[i] ?? 0) + (right[i] ?? 0)) / 2;
      side[i] = ((left[i] ?? 0) - (right[i] ?? 0)) / 2;
    }

    const midEnergy = this.calculateRMS(mid);
    const sideEnergy = this.calculateRMS(side);

    return midEnergy > 0 ? sideEnergy / midEnergy : 0;
  }

  private calculateLateralEnergyFraction(left: Float32Array, right: Float32Array): number {
    // LEF = Side energy / Total energy
    let totalEnergy = 0;
    let sideEnergy = 0;

    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      const mid = ((left[i] ?? 0) + (right[i] ?? 0)) / 2;
      const side = ((left[i] ?? 0) - (right[i] ?? 0)) / 2;

      totalEnergy += mid * mid + side * side;
      sideEnergy += side * side;
    }

    return totalEnergy > 0 ? sideEnergy / totalEnergy : 0;
  }

  private calculateStereoImageCenter(left: Float32Array, right: Float32Array): { x: number; y: number } {
    // Simplified stereo image analysis
    const leftEnergy = this.calculateRMS(left);
    const rightEnergy = this.calculateRMS(right);
    const totalEnergy = leftEnergy + rightEnergy;

    const x = totalEnergy > 0 ? (rightEnergy - leftEnergy) / totalEnergy : 0;
    const y = 0; // Would need height information for true 3D positioning

    return { x: Math.max(-1, Math.min(1, x)), y };
  }

  private calculateSurroundEnergy(left: Float32Array, right: Float32Array): number {
    // Energy in decorrelated components
    const correlation = this.calculateCrossCorrelation(left, right);
    return Math.max(0, 1 - Math.abs(correlation));
  }

  private calculateImmersiveness(left: Float32Array, right: Float32Array): number {
    const stereoWidth = this.calculateStereoWidth(left, right);
    const phaseCoherence = this.calculatePhaseCoherence(left, right);
    const surroundEnergy = this.calculateSurroundEnergy(left, right);

    // Combined metric for immersiveness
    return (stereoWidth * 0.4 + (1 - phaseCoherence) * 0.3 + surroundEnergy * 0.3);
  }

  private findTruePeak(audioData: Float32Array): number {
    // True peak detection with oversampling
    const oversampleRate = 4;
    const upsampled = this.upsample(audioData, oversampleRate);

    return Math.max(...upsampled.map(Math.abs));
  }

  private upsample(data: Float32Array, factor: number): Float32Array {
    // Simple linear interpolation upsampling
    const upsampled = new Float32Array(data.length * factor);

    for (let i = 0; i < data.length - 1; i++) {
      for (let j = 0; j < factor; j++) {
        const t = j / factor;
        upsampled[i * factor + j] = (data[i] ?? 0) * (1 - t) + (data[i + 1] ?? 0) * t;
      }
    }

    return upsampled;
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += (data[i] ?? 0) * (data[i] ?? 0);
    }
    return Math.sqrt(sum / data.length);
  }

  private calculateMomentaryLoudness(audioData: Float32Array): number {
    // BS.1770-4 momentary loudness (400ms window)
    const windowSamples = Math.floor(0.4 * this.sampleRate);
    const loudness = this.calculateIntegratedLoudness(
      audioData.slice(-windowSamples)
    );
    return loudness;
  }

  private calculateShortTermLoudness(audioData: Float32Array): number {
    // BS.1770-4 short-term loudness (3s window)
    const windowSamples = Math.floor(3.0 * this.sampleRate);
    const loudness = this.calculateIntegratedLoudness(
      audioData.slice(-windowSamples)
    );
    return loudness;
  }

  private calculateIntegratedLoudness(audioData: Float32Array): number {
    // Simplified BS.1770-4 integrated loudness
    const mean = audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length;
    const loudness = -0.691 + 10 * Math.log10(mean + 1e-10);

    return loudness;
  }

  private calculateDynamicRange(audioData: Float32Array): number {
    // PLR-based dynamic range
    const sortedLevels = Array.from(audioData)
      .map(Math.abs)
      .sort((a, b) => b - a);

    const percentile1 = sortedLevels[Math.floor(sortedLevels.length * 0.01)];
    const percentile99 = sortedLevels[Math.floor(sortedLevels.length * 0.99)];

    return 20 * Math.log10((percentile1 ?? 0) / ((percentile99 ?? 0) + 1e-10));
  }

  private calculateLoudnessRange(audioData: Float32Array): number {
    // BS.1770-4 loudness range (LRA)
    const blockSize = Math.floor(3.0 * this.sampleRate); // 3-second blocks
    const loudnessValues = [];

    for (let i = 0; i < audioData.length - blockSize; i += blockSize) {
      const block = audioData.slice(i, i + blockSize);
      const loudness = this.calculateIntegratedLoudness(block);
      if (loudness > -70) { // Gating threshold
        loudnessValues.push(loudness);
      }
    }

    if (loudnessValues.length === 0) return 0;

    loudnessValues.sort((a, b) => a - b);
    const percentile10 = loudnessValues[Math.floor(loudnessValues.length * 0.1)];
    const percentile95 = loudnessValues[Math.floor(loudnessValues.length * 0.95)];

    return (percentile95 ?? 0) - (percentile10 ?? 0);
  }

  private estimateFundamentalFrequency(magnitudes: Float32Array, frequencies: Float32Array): number {
    // Harmonic Product Spectrum method
    const maxHarmonics = 5;
    const hps = new Float32Array(magnitudes.length);

    // Initialize HPS with original spectrum
    hps.set(magnitudes);

    // Multiply by downsampled versions
    for (let h = 2; h <= maxHarmonics; h++) {
      for (let i = 0; i < Math.floor(magnitudes.length / h); i++) {
        hps[i] = (hps[i] ?? 0) * (magnitudes[i * h] ?? 0);
      }
    }

    // Find peak in HPS
    let maxIdx = 0;
    let maxVal = 0;

    for (let i = 1; i < hps.length / 2; i++) {
      if ((hps[i] ?? 0) > maxVal) {
        maxVal = hps[i] ?? 0;
        maxIdx = i;
      }
    }

    return frequencies[maxIdx] ?? 0;
  }

  private extractHarmonics(
    magnitudes: Float32Array,
    phases: Float32Array,
    frequencies: Float32Array,
    f0: number
  ): Array<{ frequency: number; magnitude: number; phase: number; harmonic: number }> {
    const harmonics = [];
    const tolerance = 0.05; // 5% frequency tolerance

    for (let h = 1; h <= 20; h++) {
      const targetFreq = f0 * h;
      const targetIdx = Math.round(targetFreq * this.fftSize / this.sampleRate);

      if (targetIdx < magnitudes.length) {
        // Find peak near target frequency
        let peakIdx = targetIdx;
        let peakMag = magnitudes[targetIdx];

        const searchRange = Math.ceil(targetFreq * tolerance * this.fftSize / this.sampleRate);

        for (let i = Math.max(0, targetIdx - searchRange);
             i <= Math.min(magnitudes.length - 1, targetIdx + searchRange); i++) {
          if ((magnitudes[i] ?? 0) > (peakMag ?? 0)) {
            peakMag = magnitudes[i] ?? 0;
            peakIdx = i;
          }
        }

        harmonics.push({
          frequency: frequencies[peakIdx] ?? 0,
          magnitude: peakMag ?? 0,
          phase: phases[peakIdx] ?? 0,
          harmonic: h
        });
      }
    }

    return harmonics;
  }

  private calculateTotalHarmonicDistortion(
    harmonics: Array<{ frequency: number; magnitude: number; phase: number; harmonic: number }>
  ): number {
    if (harmonics.length < 2) return 0;

    const fundamental = harmonics.find(h => h.harmonic === 1);
    if (!fundamental) return 0;

    let harmonicPower = 0;
    for (const harmonic of harmonics) {
      if (harmonic.harmonic > 1) {
        harmonicPower += harmonic.magnitude * harmonic.magnitude;
      }
    }

    const fundamentalPower = fundamental.magnitude * fundamental.magnitude;

    return fundamentalPower > 0 ? Math.sqrt(harmonicPower / fundamentalPower) : 0;
  }

  private calculateHarmonicToNoiseRatio(
    harmonics: Array<{ frequency: number; magnitude: number; phase: number; harmonic: number }>,
    spectrum: Float32Array
  ): number {
    let harmonicPower = 0;
    let totalPower = 0;

    for (const magnitude of spectrum) {
      totalPower += magnitude * magnitude;
    }

    for (const harmonic of harmonics) {
      harmonicPower += harmonic.magnitude * harmonic.magnitude;
    }

    const noisePower = totalPower - harmonicPower;

    return noisePower > 0 ? 10 * Math.log10(harmonicPower / noisePower) : 0;
  }

  private calculateInharmonicity(
    harmonics: Array<{ frequency: number; magnitude: number; phase: number; harmonic: number }>,
    f0: number
  ): number {
    if (harmonics.length < 2) return 0;

    let inharmonicity = 0;
    let count = 0;

    for (const harmonic of harmonics) {
      if (harmonic.harmonic > 1) {
        const expectedFreq = f0 * harmonic.harmonic;
        const deviation = Math.abs(harmonic.frequency - expectedFreq) / expectedFreq;
        inharmonicity += deviation;
        count++;
      }
    }

    return count > 0 ? inharmonicity / count : 0;
  }

  private calculateSpectralCrest(magnitudes: Float32Array): number {
    const maxMagnitude = Math.max(...magnitudes);
    const meanMagnitude = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;

    return meanMagnitude > 0 ? maxMagnitude / meanMagnitude : 0;
  }

  private calculateOddEvenHarmonicRatio(
    harmonics: Array<{ frequency: number; magnitude: number; phase: number; harmonic: number }>
  ): number {
    let oddPower = 0;
    let evenPower = 0;

    for (const harmonic of harmonics) {
      const power = harmonic.magnitude * harmonic.magnitude;

      if (harmonic.harmonic % 2 === 1) {
        oddPower += power;
      } else {
        evenPower += power;
      }
    }

    return evenPower > 0 ? oddPower / evenPower : oddPower > 0 ? Infinity : 0;
  }
}

// Export the advanced DSP processor
export const advancedDSP = new AdvancedDSPProcessor();
export {
  AdvancedDSPProcessor,
  type SpectralAnalysisResult,
  type PsychoacousticAnalysis,
  type SpatialAudioMetrics,
  type DynamicsAnalysis,
  type HarmonicAnalysis
};