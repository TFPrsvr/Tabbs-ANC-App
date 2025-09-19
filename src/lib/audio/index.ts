// Advanced Audio Science Features - Complete Package Export

// Core DSP and Analysis
export {
  AdvancedDSPProcessor,
  advancedDSP,
  type SpectralAnalysisResult,
  type PsychoacousticAnalysis,
  type SpatialAudioMetrics,
  type DynamicsAnalysis,
  type HarmonicAnalysis
} from './advanced-dsp';

// Professional Audio Effects
export {
  MultibandCompressor,
  SpectralDeEsser,
  AudioEffect,
  BiquadFilter,
  DynamicsProcessor,
  type EffectParameters,
  type EffectPreset,
  type ProcessingResult
} from './professional-effects';

// Professional Mastering Tools
export {
  ProfessionalMastering,
  MasteringPresets,
  type MasteringConfig,
  type MasteringResult,
  type StereoImagingConfig,
  type FrequencyConfig,
  type DynamicsConfig,
  type SaturationConfig,
  type SpectralAnalysis,
  type QualityMetrics
} from './professional-mastering';

// Multi-Format Audio Codec Support
export {
  MultiFormatCodec,
  CodecPresets,
  type AudioFormat,
  type CodecInfo,
  type AudioMetadata,
  type AudioInfo,
  type ConversionOptions,
  type ConversionProgress,
  type ConversionResult,
  type QualityMetrics as CodecQualityMetrics
} from './multi-format-codec';

// Advanced Audio Analysis Suite
export {
  AdvancedAudioAnalyzer,
  type AudioMeasurement,
  type SpectrumAnalyzer,
  type LoudnessMeter,
  type StereoMeter,
  type DynamicsMeter,
  type HarmonicAnalysis as HarmonicAnalyzerType,
  type PsychoacousticAnalysis as PsychoacousticAnalyzerType
} from './audio-analysis-suite';

// Spatial Audio Processing
export {
  SpatialAudioProcessor,
  type SpatialPosition,
  type AudioSource,
  type Room,
  type BinauralProcessingResult,
  type AmbisonicsConfig
} from './spatial-audio-processor';

// Audio Separation (Advanced) with ML Integration
export {
  AdvancedAudioSeparator,
  type AudioStem,
  type SeparationResult,
  type EnhancementOptions
} from './advanced-separation';

// ML Model Service for Real AI Processing
export {
  mlModelService,
  MLModelService,
  type MLModelConfig,
  type MLProcessingOptions
} from './ml-model-service';

// Audio Science Utility Functions
export class AudioScienceUtils {
  // Frequency domain utilities
  static frequencyToBark(frequency: number): number {
    return 13 * Math.atan(0.00076 * frequency) + 3.5 * Math.atan((frequency / 7500) ** 2);
  }

  static barkToFrequency(bark: number): number {
    // Approximate inverse of Bark scale
    return 1960 * (bark + 0.53) / (26.28 - bark);
  }

  static frequencyToMel(frequency: number): number {
    return 2595 * Math.log10(1 + frequency / 700);
  }

  static melToFrequency(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  static frequencyToERB(frequency: number): number {
    return 24.7 * (4.37 * frequency / 1000 + 1);
  }

  // Loudness and dynamics utilities
  static dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  static linearToDb(linear: number): number {
    return 20 * Math.log10(Math.max(linear, 1e-10));
  }

  static rmsToDb(rms: number): number {
    return 20 * Math.log10(Math.max(rms, 1e-10));
  }

  static peakToDb(peak: number): number {
    return 20 * Math.log10(Math.max(Math.abs(peak), 1e-10));
  }

  // Psychoacoustic utilities
  static calculateLoudnessPhons(spl: number, frequency: number): number {
    // Simplified equal loudness contour
    let phons = spl;

    if (frequency < 1000) {
      // Low frequency compensation
      const correction = 10 * Math.log10(1000 / frequency);
      phons += Math.min(correction, 20);
    } else if (frequency > 1000) {
      // High frequency compensation
      const correction = 5 * Math.log10(frequency / 1000);
      phons -= Math.min(correction, 10);
    }

    return Math.max(0, phons);
  }

  static calculateLoudnessSones(phons: number): number {
    // Stevens' power law
    if (phons > 40) {
      return Math.pow(2, (phons - 40) / 10);
    } else {
      return 0.25 * Math.pow(phons / 40, 2.5);
    }
  }

  // Timing and rhythm utilities
  static calculateTempo(onsetTimes: number[], sampleRate: number): number {
    if (onsetTimes.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < onsetTimes.length; i++) {
      intervals.push((onsetTimes[i] ?? 0) - (onsetTimes[i - 1] ?? 0));
    }

    // Find most common interval (simplified)
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)] ?? 0;

    if ((medianInterval ?? 0) > 0) {
      const samplesPerBeat = medianInterval ?? 0;
      const beatsPerSecond = sampleRate / (samplesPerBeat ?? 1);
      return beatsPerSecond * 60; // BPM
    }

    return 0;
  }

  // Spectral utilities
  static calculateSpectralCentroid(magnitudes: Float32Array, frequencies: Float32Array): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      numerator += (frequencies[i] ?? 0) * (magnitudes[i] ?? 0);
      denominator += (magnitudes[i] ?? 0);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  static calculateSpectralSpread(
    magnitudes: Float32Array,
    frequencies: Float32Array,
    centroid: number
  ): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      const deviation = (frequencies[i] ?? 0) - centroid;
      numerator += deviation * deviation * (magnitudes[i] ?? 0);
      denominator += (magnitudes[i] ?? 0);
    }

    return denominator > 0 ? Math.sqrt(numerator / denominator) : 0;
  }

  static calculateSpectralSkewness(
    magnitudes: Float32Array,
    frequencies: Float32Array,
    centroid: number,
    spread: number
  ): number {
    if (spread === 0) return 0;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      const deviation = (frequencies[i] ?? 0) - centroid;
      numerator += Math.pow(deviation / spread, 3) * (magnitudes[i] ?? 0);
      denominator += (magnitudes[i] ?? 0);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  static calculateSpectralKurtosis(
    magnitudes: Float32Array,
    frequencies: Float32Array,
    centroid: number,
    spread: number
  ): number {
    if (spread === 0) return 0;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      const deviation = (frequencies[i] ?? 0) - centroid;
      numerator += Math.pow(deviation / spread, 4) * (magnitudes[i] ?? 0);
      denominator += (magnitudes[i] ?? 0);
    }

    return denominator > 0 ? (numerator / denominator) - 3 : 0; // Subtract 3 for excess kurtosis
  }

  // Harmonic analysis utilities
  static detectPitch(
    audioData: Float32Array,
    sampleRate: number,
    minFreq: number = 80,
    maxFreq: number = 400
  ): number {
    const minPeriod = Math.floor(sampleRate / maxFreq);
    const maxPeriod = Math.floor(sampleRate / minFreq);

    let maxCorrelation = 0;
    let bestPeriod = minPeriod;

    // Autocorrelation pitch detection
    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      let count = 0;

      for (let i = 0; i < audioData.length - period; i++) {
        correlation += (audioData[i] ?? 0) * (audioData[i + period] ?? 0);
        count++;
      }

      correlation /= count;

      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestPeriod = period;
      }
    }

    return sampleRate / bestPeriod;
  }

  static calculateHarmonicity(
    magnitudes: Float32Array,
    frequencies: Float32Array,
    fundamentalFreq: number
  ): number {
    if (fundamentalFreq <= 0) return 0;

    let harmonicEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      const energy = (magnitudes[i] ?? 0) * (magnitudes[i] ?? 0);
      totalEnergy += energy;

      // Check if this frequency is close to a harmonic
      const harmonic = Math.round((frequencies[i] ?? 0) / fundamentalFreq);
      const expectedFreq = harmonic * fundamentalFreq;
      const tolerance = fundamentalFreq * 0.1; // 10% tolerance

      if (Math.abs((frequencies[i] ?? 0) - expectedFreq) < tolerance && harmonic >= 1) {
        harmonicEnergy += energy;
      }
    }

    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }

  // Audio quality metrics
  static calculateTHD(harmonics: number[]): number {
    if (harmonics.length < 2) return 0;

    const fundamental = harmonics[0] ?? 0;
    let harmonicSum = 0;

    for (let i = 1; i < harmonics.length; i++) {
      harmonicSum += (harmonics[i] ?? 0) * (harmonics[i] ?? 0);
    }

    return (fundamental ?? 0) > 0 ? Math.sqrt(harmonicSum) / (fundamental ?? 1) : 0;
  }

  static calculateSNR(signal: Float32Array, noise: Float32Array): number {
    const signalPower = signal.reduce((sum, sample) => sum + sample * sample, 0) / signal.length;
    const noisePower = noise.reduce((sum, sample) => sum + sample * sample, 0) / noise.length;

    return noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : Infinity;
  }

  // Spatial audio utilities
  static calculateInterauralTimeDifference(
    leftChannel: Float32Array,
    rightChannel: Float32Array,
    sampleRate: number
  ): number {
    const maxDelay = Math.floor(0.001 * sampleRate); // 1ms max
    let maxCorrelation = 0;
    let bestDelay = 0;

    for (let delay = -maxDelay; delay <= maxDelay; delay++) {
      let correlation = 0;
      let count = 0;

      const start = Math.max(0, delay);
      const end = Math.min(leftChannel.length, rightChannel.length + delay);

      for (let i = start; i < end; i++) {
        const leftIdx = i;
        const rightIdx = i - delay;

        if (rightIdx >= 0 && rightIdx < rightChannel.length) {
          correlation += (leftChannel[leftIdx] ?? 0) * (rightChannel[rightIdx] ?? 0);
          count++;
        }
      }

      if (count > 0) {
        correlation /= count;

        if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
          maxCorrelation = correlation;
          bestDelay = delay;
        }
      }
    }

    return bestDelay / sampleRate; // Return ITD in seconds
  }

  static calculateInterauralLevelDifference(
    leftChannel: Float32Array,
    rightChannel: Float32Array
  ): number {
    const leftRMS = Math.sqrt(leftChannel.reduce((sum, sample) => sum + sample * sample, 0) / leftChannel.length);
    const rightRMS = Math.sqrt(rightChannel.reduce((sum, sample) => sum + sample * sample, 0) / rightChannel.length);

    return rightRMS > 0 && leftRMS > 0 ? 20 * Math.log10(leftRMS / rightRMS) : 0;
  }
}

// Constants for audio science
export const AudioScienceConstants = {
  // Standard sample rates
  SAMPLE_RATES: {
    CD_QUALITY: 44100,
    PROFESSIONAL: 48000,
    HIGH_RES: 96000,
    DSD: 192000
  },

  // Frequency ranges
  FREQUENCY_RANGES: {
    SUB_BASS: { min: 20, max: 60 },
    BASS: { min: 60, max: 250 },
    LOW_MIDS: { min: 250, max: 500 },
    MIDS: { min: 500, max: 2000 },
    HIGH_MIDS: { min: 2000, max: 4000 },
    PRESENCE: { min: 4000, max: 6000 },
    BRILLIANCE: { min: 6000, max: 20000 }
  },

  // Loudness standards
  LOUDNESS_STANDARDS: {
    EBU_R128: -23, // LUFS
    ATSC_A85: -24, // LUFS
    STREAMING_SPOTIFY: -14, // LUFS
    STREAMING_YOUTUBE: -14, // LUFS
    STREAMING_APPLE: -16, // LUFS
    BROADCAST_US: -24, // LUFS
    BROADCAST_EU: -23 // LUFS
  },

  // Dynamic range targets
  DYNAMIC_RANGE: {
    CLASSICAL: { min: 20, target: 25 },
    JAZZ: { min: 15, target: 20 },
    ROCK: { min: 8, target: 12 },
    POP: { min: 6, target: 10 },
    ELECTRONIC: { min: 5, target: 8 },
    BROADCAST: { min: 10, target: 15 }
  },

  // Critical band frequencies (Bark scale)
  BARK_BANDS: [
    0, 100, 200, 300, 400, 510, 630, 770, 920, 1080,
    1270, 1480, 1720, 2000, 2320, 2700, 3150, 3700,
    4400, 5300, 6400, 7700, 9500, 12000, 15500
  ],

  // Equal loudness contour reference points
  ISO_226_REFERENCE: {
    frequencies: [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500],
    thresholds: [78.5, 68.7, 59.5, 51.1, 44.0, 37.5, 31.5, 26.5, 22.1, 17.9, 14.4, 11.4, 8.6, 6.2, 4.4, 3.0, 2.2, 2.4, 3.5, 1.7, -1.3, -4.2, -6.0, -5.4, -1.5, 6.0, 12.6, 13.9, 12.3]
  }
};

// Advanced Audio Processing Tools
export {
  AudioFormatConverter,
  type AudioFormat,
  type ConversionOptions,
  type ConversionResult,
  type ConversionProgress
} from './audio-format-converter';

export {
  RealTimeAudioProcessor,
  type StreamingConfig,
  type ProcessingChain,
  type StreamMetrics,
  type AudioStreamProcessor,
  type StreamingPreset
} from './real-time-processor';

export {
  AIAudioEnhancer,
  type AIModel,
  type EnhancementTask,
  type AIEnhancementResult,
  type ModelConfig
} from './ai-audio-enhancer';

export {
  PluginManager,
  AudioPlugin,
  ReverbPlugin,
  CompressorPlugin,
  type PluginManifest,
  type PluginParameter,
  type PluginPreset,
  type PluginState,
  type AudioBuffer,
  type ProcessingContext,
  type PluginHost
} from './plugin-architecture';

// Import classes for internal use
import { AudioFormatConverter } from './audio-format-converter';
import { RealTimeAudioProcessor } from './real-time-processor';
import { AIAudioEnhancer } from './ai-audio-enhancer';
import { PluginManager, ReverbPlugin, CompressorPlugin } from './plugin-architecture';
import type { AudioFormat, ConversionOptions, ConversionResult, ConversionProgress } from './audio-format-converter';
import type { StreamMetrics, StreamingConfig } from './real-time-processor';
import type { EnhancementTask, AIEnhancementResult, AIModel } from './ai-audio-enhancer';
import type { AudioPlugin, AudioBuffer, PluginHost } from './plugin-architecture';

// Audio Enhancement Suite - Complete Professional Package
export class AudioEnhancementSuite {
  private formatConverter: AudioFormatConverter;
  private realTimeProcessor: RealTimeAudioProcessor;
  private aiEnhancer: AIAudioEnhancer;
  private pluginManager: PluginManager;

  constructor() {
    this.formatConverter = new AudioFormatConverter();

    // Initialize with professional streaming config
    this.realTimeProcessor = new RealTimeAudioProcessor({
      sampleRate: 48000,
      bufferSize: 256,
      channels: 2,
      bitDepth: 24,
      latencyMode: 'low',
      enableProcessing: true,
      autoGainControl: true,
      noiseGate: true,
      compressionEnabled: true
    });

    this.aiEnhancer = new AIAudioEnhancer();

    // Plugin host implementation
    const pluginHost: PluginHost = {
      getSampleRate: () => 48000,
      getBlockSize: () => 256,
      getContext: () => ({
        sampleRate: 48000,
        blockSize: 256,
        timestamp: performance.now(),
        tempo: 120,
        timeSignature: [4, 4],
        isPlaying: false,
        transport: {
          position: 0,
          bar: 0,
          beat: 0,
          tick: 0
        }
      }),
      requestParameterChange: (pluginId, parameterId, value) => {
        console.log(`Parameter change request: ${pluginId}.${parameterId} = ${value}`);
      },
      sendMidiEvent: (event) => {
        console.log('MIDI event:', event);
      },
      reportLatency: (pluginId, latency) => {
        console.log(`Plugin ${pluginId} latency: ${latency}ms`);
      },
      log: (level, message) => {
        console[level](message);
      }
    };

    this.pluginManager = new PluginManager(pluginHost);
  }

  public async initialize(): Promise<void> {
    await Promise.all([
      this.aiEnhancer.initialize(),
      this.loadDefaultPlugins()
    ]);
  }

  private async loadDefaultPlugins(): Promise<void> {
    // Load default reverb plugin
    const reverb = new ReverbPlugin();
    await this.pluginManager.loadPlugin(reverb);

    // Load default compressor plugin
    const compressor = new CompressorPlugin();
    await this.pluginManager.loadPlugin(compressor);
  }

  // Format Conversion
  public async convertAudio(
    inputBuffer: ArrayBuffer,
    inputFormat: AudioFormat,
    outputOptions: ConversionOptions,
    progressCallback?: (progress: ConversionProgress) => void
  ): Promise<ConversionResult> {
    return this.formatConverter.convertAudio(inputBuffer, inputFormat, outputOptions, progressCallback);
  }

  // Real-time Processing
  public async startRealTimeProcessing(): Promise<void> {
    return this.realTimeProcessor.start();
  }

  public stopRealTimeProcessing(): void {
    this.realTimeProcessor.stop();
  }

  public getRealTimeMetrics(): StreamMetrics {
    return this.realTimeProcessor.getMetrics();
  }

  // AI Enhancement
  public async enhanceWithAI(
    audioData: Float32Array[],
    enhancementType: EnhancementTask['type'],
    parameters?: Record<string, any>,
    progressCallback?: (progress: number) => void
  ): Promise<AIEnhancementResult> {
    return this.aiEnhancer.enhanceAudio(audioData, enhancementType, parameters, progressCallback);
  }

  // Plugin Management
  public async loadPlugin(plugin: AudioPlugin): Promise<void> {
    return this.pluginManager.loadPlugin(plugin);
  }

  public processWithPlugins(audioBuffer: AudioBuffer): AudioBuffer {
    const context = this.pluginManager['host'].getContext();
    return this.pluginManager.processAudioChain(audioBuffer, context);
  }

  public getLoadedPlugins(): AudioPlugin[] {
    return this.pluginManager.getLoadedPlugins();
  }

  // Utility Methods
  public getSupportedFormats(): AudioFormat[] {
    return this.formatConverter.getSupportedFormats();
  }

  public getAvailableAIModels(): AIModel[] {
    return this.aiEnhancer.getAvailableModels();
  }

  public getSystemCapabilities(): {
    maxSampleRate: number;
    maxChannels: number;
    supportedBitDepths: number[];
    aiAcceleration: boolean;
    realtimeCapable: boolean;
  } {
    return {
      maxSampleRate: 192000,
      maxChannels: 8,
      supportedBitDepths: [16, 24, 32],
      aiAcceleration: true,
      realtimeCapable: true
    };
  }

  public destroy(): void {
    this.realTimeProcessor.stop();
    this.pluginManager.destroy();
    this.aiEnhancer.cleanup();
  }
}

// Professional Audio Presets
export const AudioPresets = {
  // Format conversion presets
  CONVERSION_PRESETS: {
    CD_QUALITY: {
      format: {
        container: 'wav' as const,
        sampleRate: 44100,
        bitDepth: 16 as const,
        channels: 2 as const
      },
      normalize: true,
      dither: true
    },
    HIGH_RES: {
      format: {
        container: 'flac' as const,
        sampleRate: 96000,
        bitDepth: 24 as const,
        channels: 2 as const,
        quality: 'lossless' as const
      },
      normalize: false,
      resampleQuality: 'sinc' as const
    },
    STREAMING: {
      format: {
        container: 'mp3' as const,
        sampleRate: 48000,
        bitDepth: 16 as const,
        channels: 2 as const,
        bitrate: 320
      },
      loudnessNormalization: -14, // Spotify standard
      normalize: true
    }
  },

  // Real-time processing presets
  STREAMING_PRESETS: {
    PODCAST: {
      sampleRate: 48000,
      bufferSize: 256 as const,
      channels: 1 as const,
      bitDepth: 24 as const,
      latencyMode: 'low' as const,
      enableProcessing: true,
      autoGainControl: true,
      noiseGate: true,
      compressionEnabled: true
    },
    MUSIC_PRODUCTION: {
      sampleRate: 96000,
      bufferSize: 512 as const,
      channels: 2 as const,
      bitDepth: 32 as const,
      latencyMode: 'high-quality' as const,
      enableProcessing: true,
      autoGainControl: false,
      noiseGate: false,
      compressionEnabled: false
    },
    GAMING: {
      sampleRate: 48000,
      bufferSize: 64 as const,
      channels: 2 as const,
      bitDepth: 16 as const,
      latencyMode: 'ultra-low' as const,
      enableProcessing: true,
      autoGainControl: true,
      noiseGate: true,
      compressionEnabled: true
    }
  },

  // AI enhancement presets
  AI_PRESETS: {
    VOICE_CLEANUP: {
      type: 'noise_reduction' as const,
      strength: 0.8,
      preserveCharacter: true
    },
    MUSIC_RESTORATION: {
      type: 'restoration' as const,
      enhanceHarmonics: true,
      restoreDynamics: true,
      removeNoise: 0.6
    },
    VOCAL_ISOLATION: {
      type: 'vocal_isolation' as const,
      extractVocals: true,
      preserveStereo: true
    },
    AUTO_MASTER: {
      type: 'auto_mastering' as const,
      targetLUFS: -14,
      enhanceBass: true,
      brighttenHighs: true
    }
  }
};

// All exports are available individually above
export default AudioScienceUtils;