/**
 * Advanced Audio Format Converter
 * Comprehensive audio format conversion with quality optimization
 */

import { AudioScienceUtils, AudioScienceConstants } from './index';

export interface AudioFormat {
  container: 'wav' | 'mp3' | 'flac' | 'aac' | 'ogg' | 'webm' | 'm4a' | 'wma' | 'aiff' | 'opus';
  codec?: string;
  sampleRate: number;
  bitDepth: 8 | 16 | 24 | 32;
  channels: 1 | 2 | 4 | 6 | 8;
  bitrate?: number; // For lossy formats
  quality?: 'low' | 'medium' | 'high' | 'lossless';
}

export interface ConversionOptions {
  format: AudioFormat;
  normalize?: boolean;
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
  trim?: { start: number; end: number }; // seconds
  dither?: boolean;
  noiseShaping?: boolean;
  resampleQuality?: 'linear' | 'cubic' | 'sinc';
  dynamicRangeCompression?: boolean;
  loudnessNormalization?: number; // LUFS target
}

export interface ConversionProgress {
  phase: 'analyzing' | 'processing' | 'encoding' | 'finalizing';
  progress: number; // 0-100
  timeRemaining?: number; // seconds
  currentOperation: string;
}

export interface ConversionResult {
  success: boolean;
  outputBuffer?: ArrayBuffer;
  format: AudioFormat;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
  qualityMetrics: {
    snr: number;
    thd: number;
    dynamicRange: number;
    peakLevel: number;
    rmsLevel: number;
    lufs: number;
  };
  processingTime: number;
  error?: string;
}

export interface AudioCodec {
  name: string;
  container: string;
  extensions: string[];
  maxSampleRate: number;
  maxChannels: number;
  supportedBitDepths: number[];
  isLossless: boolean;
  encoder: (audioData: Float32Array[], format: AudioFormat) => Promise<ArrayBuffer>;
  decoder: (buffer: ArrayBuffer) => Promise<{ audioData: Float32Array[]; format: AudioFormat }>;
}

class ResamplingEngine {
  private static sincKernel(x: number, a: number = 4): number {
    if (x === 0) return 1;
    const pix = Math.PI * x;
    return Math.sin(pix) / pix * Math.sin(pix / a) / (pix / a);
  }

  public static resample(
    inputData: Float32Array,
    inputRate: number,
    outputRate: number,
    quality: 'linear' | 'cubic' | 'sinc' = 'sinc'
  ): Float32Array {
    if (inputRate === outputRate) return inputData;

    const ratio = outputRate / inputRate;
    const outputLength = Math.floor(inputData.length * ratio);
    const output = new Float32Array(outputLength);

    switch (quality) {
      case 'linear':
        return this.linearResample(inputData, ratio);
      case 'cubic':
        return this.cubicResample(inputData, ratio);
      case 'sinc':
      default:
        return this.sincResample(inputData, ratio);
    }
  }

  private static linearResample(inputData: Float32Array, ratio: number): Float32Array {
    const outputLength = Math.floor(inputData.length * ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i / ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;

      if (index + 1 < inputData.length) {
        output[i] = (inputData[index] ?? 0) * (1 - fraction) + (inputData[index + 1] ?? 0) * fraction;
      } else {
        output[i] = inputData[index] ?? 0;
      }
    }

    return output;
  }

  private static cubicResample(inputData: Float32Array, ratio: number): Float32Array {
    const outputLength = Math.floor(inputData.length * ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i / ratio;
      const index = Math.floor(sourceIndex);
      const x = sourceIndex - index;

      // Cubic interpolation
      const p0 = inputData[Math.max(0, index - 1)] ?? 0;
      const p1 = inputData[index] ?? 0;
      const p2 = inputData[Math.min(inputData.length - 1, index + 1)] ?? 0;
      const p3 = inputData[Math.min(inputData.length - 1, index + 2)] ?? 0;

      const a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
      const b = p0 - 2.5 * p1 + 2 * p2 - 0.5 * p3;
      const c = -0.5 * p0 + 0.5 * p2;
      const d = p1;

      output[i] = a * x * x * x + b * x * x + c * x + d;
    }

    return output;
  }

  private static sincResample(inputData: Float32Array, ratio: number): Float32Array {
    const outputLength = Math.floor(inputData.length * ratio);
    const output = new Float32Array(outputLength);
    const kernelSize = 8;

    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i / ratio;
      const center = Math.floor(sourceIndex);
      let sum = 0;
      let weightSum = 0;

      for (let j = -kernelSize; j <= kernelSize; j++) {
        const sampleIndex = center + j;
        if (sampleIndex >= 0 && sampleIndex < inputData.length) {
          const weight = this.sincKernel(sourceIndex - sampleIndex);
          sum += (inputData[sampleIndex] ?? 0) * weight;
          weightSum += weight;
        }
      }

      output[i] = weightSum > 0 ? sum / weightSum : 0;
    }

    return output;
  }
}

class AudioDithering {
  public static applyDither(
    audioData: Float32Array,
    targetBitDepth: number,
    noiseShaping: boolean = false
  ): Float32Array {
    const quantizationLevels = Math.pow(2, targetBitDepth - 1);
    const output = new Float32Array(audioData.length);
    let error = 0;

    for (let i = 0; i < audioData.length; i++) {
      let sample = (audioData[i] ?? 0) + error;

      // Add triangular dither
      const dither = (Math.random() + Math.random() - 1) / quantizationLevels;
      sample += dither;

      // Quantize
      const quantized = Math.round(sample * quantizationLevels) / quantizationLevels;
      output[i] = Math.max(-1, Math.min(1, quantized));

      // Noise shaping (simple first-order)
      if (noiseShaping) {
        error = (sample - quantized) * 0.5;
      } else {
        error = 0;
      }
    }

    return output;
  }
}

class LoudnessProcessor {
  public static normalize(audioData: Float32Array[], targetLUFS: number): Float32Array[] {
    // Simplified loudness normalization
    const currentLUFS = this.measureLoudness(audioData);
    const gain = AudioScienceUtils.dbToLinear(targetLUFS - currentLUFS);

    return audioData.map(channel => {
      const normalized = new Float32Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        normalized[i] = Math.max(-1, Math.min(1, (channel[i] ?? 0) * gain));
      }
      return normalized;
    });
  }

  private static measureLoudness(audioData: Float32Array[]): number {
    // Simplified LUFS measurement
    let sum = 0;
    let count = 0;

    for (const channel of audioData) {
      for (let i = 0; i < channel.length; i++) {
        const sample = channel[i] ?? 0;
        sum += sample * sample;
        count++;
      }
    }

    const rms = Math.sqrt(sum / count);
    return AudioScienceUtils.linearToDb(rms) - 23; // Approximate LUFS
  }
}

export class AudioFormatConverter {
  private codecs: Map<string, AudioCodec> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeCodecs();
  }

  private initializeCodecs(): void {
    // WAV Codec
    this.codecs.set('wav', {
      name: 'WAV',
      container: 'wav',
      extensions: ['.wav'],
      maxSampleRate: 192000,
      maxChannels: 8,
      supportedBitDepths: [16, 24, 32],
      isLossless: true,
      encoder: this.encodeWAV.bind(this),
      decoder: this.decodeWAV.bind(this)
    });

    // FLAC Codec
    this.codecs.set('flac', {
      name: 'FLAC',
      container: 'flac',
      extensions: ['.flac'],
      maxSampleRate: 192000,
      maxChannels: 8,
      supportedBitDepths: [16, 24],
      isLossless: true,
      encoder: this.encodeFLAC.bind(this),
      decoder: this.decodeFLAC.bind(this)
    });

    // MP3 Codec (simplified)
    this.codecs.set('mp3', {
      name: 'MP3',
      container: 'mp3',
      extensions: ['.mp3'],
      maxSampleRate: 48000,
      maxChannels: 2,
      supportedBitDepths: [16],
      isLossless: false,
      encoder: this.encodeMP3.bind(this),
      decoder: this.decodeMP3.bind(this)
    });

    this.isInitialized = true;
  }

  public async convertAudio(
    inputBuffer: ArrayBuffer,
    inputFormat: AudioFormat,
    options: ConversionOptions,
    progressCallback?: (progress: ConversionProgress) => void
  ): Promise<ConversionResult> {
    const startTime = performance.now();

    try {
      // Phase 1: Analyzing
      progressCallback?.({
        phase: 'analyzing',
        progress: 0,
        currentOperation: 'Analyzing input format'
      });

      const inputCodec = this.codecs.get(inputFormat.container);
      if (!inputCodec) {
        throw new Error(`Unsupported input format: ${inputFormat.container}`);
      }

      const outputCodec = this.codecs.get(options.format.container);
      if (!outputCodec) {
        throw new Error(`Unsupported output format: ${options.format.container}`);
      }

      progressCallback?.({
        phase: 'analyzing',
        progress: 25,
        currentOperation: 'Decoding input audio'
      });

      // Decode input
      const { audioData: inputAudioData, format: detectedFormat } = await inputCodec.decoder(inputBuffer);

      progressCallback?.({
        phase: 'processing',
        progress: 40,
        currentOperation: 'Processing audio data'
      });

      // Phase 2: Processing
      let processedAudio = inputAudioData;

      // Apply trimming
      if (options.trim) {
        processedAudio = this.trimAudio(processedAudio, detectedFormat.sampleRate, options.trim);
      }

      progressCallback?.({
        phase: 'processing',
        progress: 50,
        currentOperation: 'Resampling audio'
      });

      // Resample if needed
      if (detectedFormat.sampleRate !== options.format.sampleRate) {
        processedAudio = processedAudio.map(channel =>
          ResamplingEngine.resample(
            channel,
            detectedFormat.sampleRate,
            options.format.sampleRate,
            options.resampleQuality
          )
        );
      }

      progressCallback?.({
        phase: 'processing',
        progress: 60,
        currentOperation: 'Applying audio effects'
      });

      // Apply fade in/out
      if (options.fadeIn || options.fadeOut) {
        processedAudio = this.applyFades(processedAudio, options.format.sampleRate, options.fadeIn, options.fadeOut);
      }

      // Normalize if requested
      if (options.normalize) {
        processedAudio = this.normalizeAudio(processedAudio);
      }

      // Loudness normalization
      if (options.loudnessNormalization) {
        processedAudio = LoudnessProcessor.normalize(processedAudio, options.loudnessNormalization);
      }

      progressCallback?.({
        phase: 'processing',
        progress: 70,
        currentOperation: 'Converting bit depth'
      });

      // Convert bit depth with dithering
      if (detectedFormat.bitDepth !== options.format.bitDepth) {
        processedAudio = processedAudio.map(channel =>
          AudioDithering.applyDither(channel, options.format.bitDepth, options.noiseShaping)
        );
      }

      // Handle channel conversion
      if (processedAudio.length !== options.format.channels) {
        processedAudio = this.convertChannels(processedAudio, options.format.channels);
      }

      progressCallback?.({
        phase: 'encoding',
        progress: 80,
        currentOperation: 'Encoding output format'
      });

      // Phase 3: Encoding
      const outputBuffer = await outputCodec.encoder(processedAudio, options.format);

      progressCallback?.({
        phase: 'finalizing',
        progress: 90,
        currentOperation: 'Calculating quality metrics'
      });

      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(inputAudioData, processedAudio);

      progressCallback?.({
        phase: 'finalizing',
        progress: 100,
        currentOperation: 'Conversion complete'
      });

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        outputBuffer,
        format: options.format,
        originalSize: inputBuffer.byteLength,
        convertedSize: outputBuffer.byteLength,
        compressionRatio: inputBuffer.byteLength / outputBuffer.byteLength,
        qualityMetrics,
        processingTime
      };

    } catch (error) {
      return {
        success: false,
        format: options.format,
        originalSize: inputBuffer.byteLength,
        convertedSize: 0,
        compressionRatio: 0,
        qualityMetrics: {
          snr: 0,
          thd: 0,
          dynamicRange: 0,
          peakLevel: 0,
          rmsLevel: 0,
          lufs: 0
        },
        processingTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private trimAudio(
    audioData: Float32Array[],
    sampleRate: number,
    trim: { start: number; end: number }
  ): Float32Array[] {
    const startSample = Math.floor(trim.start * sampleRate);
    const endSample = Math.floor(trim.end * sampleRate);

    return audioData.map(channel => channel.slice(startSample, endSample));
  }

  private applyFades(
    audioData: Float32Array[],
    sampleRate: number,
    fadeIn?: number,
    fadeOut?: number
  ): Float32Array[] {
    return audioData.map(channel => {
      const output = new Float32Array(channel);

      // Fade in
      if (fadeIn) {
        const fadeInSamples = Math.floor(fadeIn * sampleRate);
        for (let i = 0; i < Math.min(fadeInSamples, channel.length); i++) {
          const gain = i / fadeInSamples;
          output[i] = (channel[i] ?? 0) * gain;
        }
      }

      // Fade out
      if (fadeOut) {
        const fadeOutSamples = Math.floor(fadeOut * sampleRate);
        const startIndex = channel.length - fadeOutSamples;
        for (let i = startIndex; i < channel.length; i++) {
          const gain = (channel.length - i) / fadeOutSamples;
          output[i] = (channel[i] ?? 0) * gain;
        }
      }

      return output;
    });
  }

  private normalizeAudio(audioData: Float32Array[]): Float32Array[] {
    let peak = 0;

    // Find peak across all channels
    for (const channel of audioData) {
      for (let i = 0; i < channel.length; i++) {
        peak = Math.max(peak, Math.abs(channel[i] ?? 0));
      }
    }

    if (peak === 0) return audioData;

    const gain = 0.95 / peak; // Leave some headroom

    return audioData.map(channel => {
      const normalized = new Float32Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        normalized[i] = (channel[i] ?? 0) * gain;
      }
      return normalized;
    });
  }

  private convertChannels(audioData: Float32Array[], targetChannels: number): Float32Array[] {
    const currentChannels = audioData.length;

    if (currentChannels === targetChannels) return audioData;

    if (targetChannels === 1 && currentChannels === 2) {
      // Stereo to mono
      const mono = new Float32Array(audioData[0]?.length ?? 0);
      const left = audioData[0];
      const right = audioData[1];

      for (let i = 0; i < mono.length; i++) {
        mono[i] = ((left?.[i] ?? 0) + (right?.[i] ?? 0)) * 0.5;
      }

      return [mono];
    }

    if (targetChannels === 2 && currentChannels === 1) {
      // Mono to stereo
      const mono = audioData[0];
      if (mono) {
        return [new Float32Array(mono), new Float32Array(mono)];
      }
      return [new Float32Array(), new Float32Array()];
    }

    // For other conversions, duplicate or truncate channels
    const result: Float32Array[] = [];
    for (let i = 0; i < targetChannels; i++) {
      const sourceChannel = audioData[i % currentChannels];
      if (sourceChannel) {
        result.push(new Float32Array(sourceChannel));
      } else {
        result.push(new Float32Array());
      }
    }

    return result;
  }

  private calculateQualityMetrics(
    original: Float32Array[],
    processed: Float32Array[]
  ): ConversionResult['qualityMetrics'] {
    const originalMono = this.mixToMono(original);
    const processedMono = this.mixToMono(processed);

    // Calculate peak levels
    let peakLevel = 0;
    let rmsSum = 0;

    for (let i = 0; i < processedMono.length; i++) {
      const sample = processedMono[i] ?? 0;
      peakLevel = Math.max(peakLevel, Math.abs(sample));
      rmsSum += sample * sample;
    }

    const rmsLevel = Math.sqrt(rmsSum / processedMono.length);

    // Calculate SNR (simplified)
    const snr = AudioScienceUtils.calculateSNR(originalMono, processedMono);

    // Calculate THD (simplified)
    const thd = 0; // Would require spectral analysis

    // Calculate dynamic range (peak to RMS ratio)
    const dynamicRange = AudioScienceUtils.linearToDb(peakLevel / (rmsLevel || 1e-10));

    // Calculate LUFS (simplified)
    const lufs = AudioScienceUtils.linearToDb(rmsLevel) - 23;

    return {
      snr,
      thd,
      dynamicRange,
      peakLevel: AudioScienceUtils.linearToDb(peakLevel),
      rmsLevel: AudioScienceUtils.linearToDb(rmsLevel),
      lufs
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

  // Codec implementations (simplified)
  private async encodeWAV(audioData: Float32Array[], format: AudioFormat): Promise<ArrayBuffer> {
    const channels = audioData.length;
    const sampleRate = format.sampleRate;
    const bitDepth = format.bitDepth;
    const samplesPerChannel = audioData[0]?.length ?? 0;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = channels * bytesPerSample;
    const dataSize = samplesPerChannel * blockAlign;
    const fileSize = 44 + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // WAV header
    view.setUint32(0, 0x52494646); // 'RIFF'
    view.setUint32(4, fileSize - 8, true);
    view.setUint32(8, 0x57415645); // 'WAVE'
    view.setUint32(12, 0x666d7420); // 'fmt '
    view.setUint32(16, 16, true); // Format chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    view.setUint32(36, 0x64617461); // 'data'
    view.setUint32(40, dataSize, true);

    // Audio data
    let offset = 44;
    const maxValue = Math.pow(2, bitDepth - 1) - 1;

    for (let i = 0; i < samplesPerChannel; i++) {
      for (let ch = 0; ch < channels; ch++) {
        const sample = Math.round((audioData[ch]?.[i] ?? 0) * maxValue);
        const clampedSample = Math.max(-maxValue - 1, Math.min(maxValue, sample));

        if (bitDepth === 16) {
          view.setInt16(offset, clampedSample, true);
          offset += 2;
        } else if (bitDepth === 24) {
          const bytes = new Uint8Array([(clampedSample >> 0) & 0xFF, (clampedSample >> 8) & 0xFF, (clampedSample >> 16) & 0xFF]);
          new Uint8Array(buffer, offset, 3).set(bytes);
          offset += 3;
        } else if (bitDepth === 32) {
          view.setInt32(offset, clampedSample, true);
          offset += 4;
        }
      }
    }

    return buffer;
  }

  private async decodeWAV(buffer: ArrayBuffer): Promise<{ audioData: Float32Array[]; format: AudioFormat }> {
    const view = new DataView(buffer);

    // Parse WAV header
    const channels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitDepth = view.getUint16(34, true);
    const dataSize = view.getUint32(40, true);

    const samplesPerChannel = dataSize / (channels * (bitDepth / 8));
    const audioData: Float32Array[] = [];

    for (let ch = 0; ch < channels; ch++) {
      audioData.push(new Float32Array(samplesPerChannel));
    }

    let offset = 44;
    const maxValue = Math.pow(2, bitDepth - 1) - 1;

    for (let i = 0; i < samplesPerChannel; i++) {
      for (let ch = 0; ch < channels; ch++) {
        let sample: number;

        if (bitDepth === 16) {
          sample = view.getInt16(offset, true);
          offset += 2;
        } else if (bitDepth === 24) {
          const bytes = new Uint8Array(buffer, offset, 3);
          sample = (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8) | ((bytes[2] ?? 0) << 16);
          if (sample & 0x800000) sample |= 0xFF000000; // Sign extension
          offset += 3;
        } else if (bitDepth === 32) {
          sample = view.getInt32(offset, true);
          offset += 4;
        } else {
          sample = 0;
        }

        audioData[ch]![i] = sample / maxValue;
      }
    }

    return {
      audioData,
      format: {
        container: 'wav',
        sampleRate,
        bitDepth: bitDepth as 8 | 16 | 24 | 32,
        channels: channels as 1 | 2 | 4 | 6 | 8
      }
    };
  }

  private async encodeFLAC(audioData: Float32Array[], format: AudioFormat): Promise<ArrayBuffer> {
    // Simplified FLAC encoding (in reality would use proper FLAC encoder)
    // For now, return WAV format as placeholder
    return this.encodeWAV(audioData, format);
  }

  private async decodeFLAC(buffer: ArrayBuffer): Promise<{ audioData: Float32Array[]; format: AudioFormat }> {
    // Simplified FLAC decoding (in reality would use proper FLAC decoder)
    // For now, assume WAV format as placeholder
    return this.decodeWAV(buffer);
  }

  private async encodeMP3(audioData: Float32Array[], format: AudioFormat): Promise<ArrayBuffer> {
    // Simplified MP3 encoding (in reality would use proper MP3 encoder like LAME)
    // For now, return WAV format as placeholder
    return this.encodeWAV(audioData, format);
  }

  private async decodeMP3(buffer: ArrayBuffer): Promise<{ audioData: Float32Array[]; format: AudioFormat }> {
    // Simplified MP3 decoding (in reality would use proper MP3 decoder)
    // For now, assume WAV format as placeholder
    return this.decodeWAV(buffer);
  }

  public getSupportedFormats(): AudioFormat[] {
    return Array.from(this.codecs.values()).map(codec => ({
      container: codec.container as any,
      sampleRate: 48000,
      bitDepth: 16,
      channels: 2
    }));
  }

  public getCodecInfo(format: string): AudioCodec | undefined {
    return this.codecs.get(format);
  }
}

export default AudioFormatConverter;