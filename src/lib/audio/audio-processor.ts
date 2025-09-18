"use client";

import { AudioStream, AudioProcessingSettings } from '../../types';
import { clamp, mapRange } from '../utils';

// ANC (Active Noise Cancellation) interfaces
export interface ANCSettings {
  enabled: boolean;
  intensity: number;
  adaptiveMode: boolean;
  voiceFocusMode: boolean;
  selectiveHearing: boolean;
  transparencyMode: boolean;
  transparencyLevel: number;
  environmentalAwareness: boolean;
}

export interface AdvancedProcessorConfig {
  sampleRate?: number;
  bufferSize?: number;
  channels?: number;
  enableRealTimeProcessing?: boolean;
  voiceDetectionSensitivity?: number;
  separationQuality?: string;
  enableClosedCaptions?: boolean;
  deviceType?: string;
}

export class AudioProcessor {
  protected audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private analysers: AnalyserNode[] = [];
  private filters: BiquadFilterNode[] = [];
  private gainNodes: GainNode[] = [];
  private isProcessing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return this.audioBuffer;
    } catch (error) {
      console.error('Error loading audio file:', error);
      throw new Error('Failed to load audio file');
    }
  }

  async separateAudioStreams(
    audioBuffer: AudioBuffer, 
    settings: AudioProcessingSettings
  ): Promise<AudioStream[]> {
    if (!this.audioContext || !audioBuffer) {
      throw new Error('Audio context or buffer not available');
    }

    this.isProcessing = true;
    const streams: AudioStream[] = [];

    try {
      const sampleRate = audioBuffer.sampleRate;
      const channelData = audioBuffer.getChannelData(0);

      const voiceStream = await this.extractVoiceStream(
        channelData, 
        sampleRate,
        settings.voiceSeparation
      );
      
      const musicStream = await this.extractMusicStream(
        channelData,
        sampleRate
      );
      
      const noiseStream = await this.extractNoiseStream(
        channelData,
        sampleRate,
        settings.backgroundNoiseReduction
      );

      const ambientStream = await this.extractAmbientStream(
        channelData,
        sampleRate
      );

      streams.push(
        {
          id: 'voice-stream',
          name: '🎤 Voice',
          type: 'voice',
          volume: 1.0,
          isActive: true,
          isMuted: false,
          frequency: voiceStream.dominantFrequency,
        },
        {
          id: 'music-stream',
          name: '🎵 Music',
          type: 'music',
          volume: 1.0,
          isActive: true,
          isMuted: false,
          frequency: musicStream.dominantFrequency,
        },
        {
          id: 'noise-stream',
          name: '🔊 Background Noise',
          type: 'noise',
          volume: settings.backgroundNoiseReduction.enabled ? 0.3 : 1.0,
          isActive: !settings.noiseCancellation.enabled,
          isMuted: settings.noiseCancellation.enabled,
          frequency: noiseStream.dominantFrequency,
        },
        {
          id: 'ambient-stream',
          name: '🌊 Ambient',
          type: 'ambient',
          volume: settings.transparencyMode.enabled ? 
            mapRange(settings.transparencyMode.level, 0, 100, 0.1, 1.0) : 
            0.8,
          isActive: true,
          isMuted: false,
          frequency: ambientStream.dominantFrequency,
        }
      );

      this.isProcessing = false;
      return streams;
    } catch (error) {
      this.isProcessing = false;
      console.error('Error separating audio streams:', error);
      throw error;
    }
  }

  private async extractVoiceStream(
    channelData: Float32Array,
    sampleRate: number,
    settings: { enabled: boolean; sensitivity: number }
  ): Promise<{ data: Float32Array; dominantFrequency: number }> {
    const voiceFreqMin = 85; // Hz - typical male voice fundamental
    const voiceFreqMax = 1100; // Hz - including harmonics
    
    return this.extractFrequencyRange(
      channelData,
      sampleRate,
      voiceFreqMin,
      voiceFreqMax,
      settings.sensitivity / 100
    );
  }

  private async extractMusicStream(
    channelData: Float32Array,
    sampleRate: number
  ): Promise<{ data: Float32Array; dominantFrequency: number }> {
    const musicFreqMin = 20; // Hz - full spectrum
    const musicFreqMax = 8000; // Hz - excluding very high frequencies
    
    return this.extractFrequencyRange(
      channelData,
      sampleRate,
      musicFreqMin,
      musicFreqMax,
      0.8 // High sensitivity for music
    );
  }

  private async extractNoiseStream(
    channelData: Float32Array,
    sampleRate: number,
    settings: { enabled: boolean; threshold: number }
  ): Promise<{ data: Float32Array; dominantFrequency: number }> {
    const noiseFreqMin = 8000; // Hz - high frequency noise
    const noiseFreqMax = 20000; // Hz - up to human hearing limit
    
    return this.extractFrequencyRange(
      channelData,
      sampleRate,
      noiseFreqMin,
      noiseFreqMax,
      settings.threshold / 100
    );
  }

  private async extractAmbientStream(
    channelData: Float32Array,
    sampleRate: number
  ): Promise<{ data: Float32Array; dominantFrequency: number }> {
    const ambientFreqMin = 20; // Hz - very low frequencies
    const ambientFreqMax = 200; // Hz - low ambient sounds
    
    return this.extractFrequencyRange(
      channelData,
      sampleRate,
      ambientFreqMin,
      ambientFreqMax,
      0.6
    );
  }

  private async extractFrequencyRange(
    inputData: Float32Array,
    sampleRate: number,
    freqMin: number,
    freqMax: number,
    sensitivity: number
  ): Promise<{ data: Float32Array; dominantFrequency: number }> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    const fftSize = 2048;
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = fftSize;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const sourceBuffer = this.audioContext.createBuffer(
      1,
      inputData.length,
      sampleRate
    );
    const channelData = new Float32Array(inputData);
    sourceBuffer.copyToChannel(channelData, 0);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = sourceBuffer;
    
    const lowpass = this.audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = freqMax;
    
    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = freqMin;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = sensitivity;
    
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(analyser);
    
    const outputData = new Float32Array(inputData.length);
    
    for (let i = 0; i < inputData.length; i++) {
      const freq = (i / inputData.length) * (sampleRate / 2);
      if (freq >= freqMin && freq <= freqMax) {
        outputData[i] = (inputData[i] ?? 0) * sensitivity;
      } else {
        outputData[i] = (inputData[i] ?? 0) * (1 - sensitivity) * 0.1; // Reduce non-target frequencies
      }
    }
    
    analyser.getByteFrequencyData(dataArray);
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      if ((dataArray[i] ?? 0) > maxValue) {
        maxValue = dataArray[i] ?? 0;
        maxIndex = i;
      }
    }
    
    const dominantFrequency = (maxIndex * sampleRate) / (2 * bufferLength);
    
    return {
      data: outputData,
      dominantFrequency: clamp(dominantFrequency, freqMin, freqMax)
    };
  }

  async applyNoiseReduction(
    inputData: Float32Array,
    intensity: number
  ): Promise<Float32Array> {
    const outputData = new Float32Array(inputData.length);
    const threshold = mapRange(intensity, 0, 100, 0.1, 0.8);
    
    for (let i = 0; i < inputData.length; i++) {
      const amplitude = Math.abs(inputData[i] ?? 0);
      
      if (amplitude < threshold) {
        outputData[i] = (inputData[i] ?? 0) * mapRange(amplitude, 0, threshold, 0, 0.3);
      } else {
        outputData[i] = inputData[i] ?? 0;
      }
    }
    
    return outputData;
  }

  async applyTransparencyMode(
    inputData: Float32Array,
    level: number,
    selectiveHearing: boolean = false
  ): Promise<Float32Array> {
    const outputData = new Float32Array(inputData.length);
    const transparencyGain = mapRange(level, 0, 100, 0.1, 1.0);
    
    for (let i = 0; i < inputData.length; i++) {
      if (selectiveHearing) {
        const freq = (i / inputData.length) * 22050; // Assume 44.1kHz sample rate
        if (freq >= 300 && freq <= 3000) { // Voice range
          outputData[i] = (inputData[i] ?? 0) * transparencyGain * 1.2; // Boost voice
        } else {
          outputData[i] = (inputData[i] ?? 0) * transparencyGain * 0.6; // Reduce other sounds
        }
      } else {
        outputData[i] = (inputData[i] ?? 0) * transparencyGain;
      }
    }
    
    return outputData;
  }

  createAudioStreamControls(streams: AudioStream[]): AudioStreamController[] {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    return streams.map(stream => {
      const gainNode = this.audioContext!.createGain();
      const analyser = this.audioContext!.createAnalyser();
      
      analyser.fftSize = 256;
      gainNode.connect(analyser);
      
      return new AudioStreamController(stream, gainNode, analyser);
    });
  }

  getProcessingProgress(): number {
    return this.isProcessing ? Math.random() * 100 : 100; // Mock progress
  }

  dispose(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    this.analysers.forEach(analyser => analyser.disconnect());
    this.filters.forEach(filter => filter.disconnect());
    this.gainNodes.forEach(gain => gain.disconnect());
    
    this.analysers = [];
    this.filters = [];
    this.gainNodes = [];
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export class AudioStreamController {
  private gainNode: GainNode;
  private analyser: AnalyserNode;
  private stream: AudioStream;

  constructor(stream: AudioStream, gainNode: GainNode, analyser: AnalyserNode) {
    this.stream = stream;
    this.gainNode = gainNode;
    this.analyser = analyser;
    
    this.updateVolume(stream.volume);
    this.updateMute(stream.isMuted);
  }

  updateVolume(volume: number): void {
    this.stream.volume = clamp(volume, 0, 1);
    this.gainNode.gain.value = this.stream.isMuted ? 0 : this.stream.volume;
  }

  updateMute(muted: boolean): void {
    this.stream.isMuted = muted;
    this.gainNode.gain.value = muted ? 0 : this.stream.volume;
  }

  updateActive(active: boolean): void {
    this.stream.isActive = active;
    if (!active) {
      this.gainNode.gain.value = 0;
    } else {
      this.gainNode.gain.value = this.stream.isMuted ? 0 : this.stream.volume;
    }
  }

  getFrequencyData(): Uint8Array {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getVolumeLevel(): number {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] ?? 0;
    }
    
    return sum / (dataArray.length * 255); // Normalize to 0-1
  }

  getStream(): AudioStream {
    return { ...this.stream };
  }

  dispose(): void {
    this.gainNode.disconnect();
    this.analyser.disconnect();
  }
}

// Re-export for compatibility with advanced-audio-processor imports
export class AdvancedAudioProcessor extends AudioProcessor {
  private ancSettings: ANCSettings;

  constructor(config?: AdvancedProcessorConfig) {
    super();
    this.ancSettings = {
      enabled: false,
      intensity: 50,
      adaptiveMode: true,
      voiceFocusMode: false,
      selectiveHearing: false,
      transparencyMode: false,
      transparencyLevel: 50,
      environmentalAwareness: true,
    };
  }

  getANCSettings(): ANCSettings {
    return { ...this.ancSettings };
  }

  updateANCSettings(settings: Partial<ANCSettings>): void {
    this.ancSettings = { ...this.ancSettings, ...settings };
  }

  // Add missing methods that were in the stub file
  async destroy(): Promise<void> {
    // Clean up resources
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
  }

  async startProcessing(source?: any): Promise<void> {
    await this.initialize();
    // TODO: Implement actual processing logic
    console.log('Advanced audio processing started with source:', source);
  }

  async stopProcessing(): Promise<void> {
    // TODO: Implement stop processing logic
    console.log('Advanced audio processing stopped');
  }

  setStreamVolume(streamId: string, volume: number): void {
    // TODO: Implement volume control
    console.log('Setting stream volume for', streamId, 'to:', volume);
  }

  findNextVoiceInstance(): { voiceStartTime: number } {
    // TODO: Implement voice detection
    console.log('Finding next voice instance');
    return { voiceStartTime: 0 };
  }
}