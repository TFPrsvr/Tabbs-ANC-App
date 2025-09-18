"use client";

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface AudioProcessingResult {
  originalBuffer: AudioBuffer;
  processedBuffer?: AudioBuffer;
  separatedTracks?: {
    vocals: AudioBuffer;
    instruments: AudioBuffer;
    noise: AudioBuffer;
  };
  analysisData?: {
    duration: number;
    sampleRate: number;
    channels: number;
    peakAmplitude: number;
    averageAmplitude: number;
    frequencyData: Float32Array;
  };
}

interface ProcessingOptions {
  enableANC: boolean;
  enableVoiceSeparation: boolean;
  enableSpatialAudio: boolean;
  outputGain: number;
  processingQuality: 'fast' | 'balanced' | 'high_quality';
}

export function useAudioProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentResult, setCurrentResult] = useState<AudioProcessingResult | null>(null);

  // Simulate audio processing with real audio analysis
  const processAudio = useCallback(async (
    audioBuffer: AudioBuffer,
    options: ProcessingOptions
  ): Promise<AudioProcessingResult> => {
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      toast.info('🎵 Starting audio processing...');

      // Step 1: Audio Analysis (10%)
      await simulateProgress(10, 'Analyzing audio structure...');
      const analysisData = analyzeAudioBuffer(audioBuffer);

      // Step 2: Noise Reduction (30%)
      await simulateProgress(30, 'Applying noise cancellation...');
      const denoisedBuffer = options.enableANC ?
        await applyNoiseReduction(audioBuffer) : audioBuffer;

      // Step 3: Voice Separation (60%)
      let separatedTracks;
      if (options.enableVoiceSeparation) {
        await simulateProgress(60, 'Separating voice frequencies...');
        separatedTracks = await separateVoiceInstruments(denoisedBuffer);
      }

      // Step 4: Spatial Audio (80%)
      if (options.enableSpatialAudio) {
        await simulateProgress(80, 'Applying spatial audio processing...');
      }

      // Step 5: Final Processing (100%)
      await simulateProgress(100, 'Finalizing audio output...');
      const processedBuffer = await applyFinalProcessing(denoisedBuffer, options);

      const result: AudioProcessingResult = {
        originalBuffer: audioBuffer,
        processedBuffer,
        separatedTracks,
        analysisData
      };

      setCurrentResult(result);
      toast.success('✅ Audio processing completed successfully!');

      return result;

    } catch (error) {
      console.error('Audio processing error:', error);
      toast.error('❌ Audio processing failed');
      throw error;
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, []);

  // Helper function to simulate processing steps with progress
  const simulateProgress = (targetProgress: number, message: string) => {
    return new Promise<void>((resolve) => {
      const startProgress = processingProgress;
      const progressStep = (targetProgress - startProgress) / 20;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        const newProgress = startProgress + (progressStep * currentStep);
        setProcessingProgress(Math.min(newProgress, targetProgress));

        if (currentStep >= 20) {
          clearInterval(interval);
          toast.info(`🔄 ${message}`);
          resolve();
        }
      }, 50);
    });
  };

  // Analyze audio buffer for metadata
  const analyzeAudioBuffer = (buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0);
    let peakAmplitude = 0;
    let sumAmplitude = 0;

    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i]);
      if (amplitude > peakAmplitude) {
        peakAmplitude = amplitude;
      }
      sumAmplitude += amplitude;
    }

    const averageAmplitude = sumAmplitude / channelData.length;

    // Simple frequency analysis
    const frequencyData = new Float32Array(1024);
    const step = Math.floor(channelData.length / 1024);
    for (let i = 0; i < 1024; i++) {
      frequencyData[i] = Math.abs(channelData[i * step] || 0);
    }

    return {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      peakAmplitude,
      averageAmplitude,
      frequencyData
    };
  };

  // Apply noise reduction (simplified simulation)
  const applyNoiseReduction = async (buffer: AudioBuffer): Promise<AudioBuffer> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const processedBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    // Simple high-pass filter simulation for noise reduction
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);

      // Apply a simple noise gate
      for (let i = 0; i < inputData.length; i++) {
        const sample = inputData[i];
        // Reduce low-amplitude noise
        outputData[i] = Math.abs(sample) > 0.01 ? sample * 0.9 : sample * 0.3;
      }
    }

    return processedBuffer;
  };

  // Separate voice and instruments (simulation)
  const separateVoiceInstruments = async (buffer: AudioBuffer) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create separate buffers for vocals, instruments, and noise
    const vocals = audioContext.createBuffer(1, buffer.length, buffer.sampleRate);
    const instruments = audioContext.createBuffer(1, buffer.length, buffer.sampleRate);
    const noise = audioContext.createBuffer(1, buffer.length, buffer.sampleRate);

    const inputData = buffer.getChannelData(0);
    const vocalsData = vocals.getChannelData(0);
    const instrumentsData = instruments.getChannelData(0);
    const noiseData = noise.getChannelData(0);

    // Simple frequency-based separation simulation
    for (let i = 0; i < inputData.length; i++) {
      const sample = inputData[i];
      const frequency = (i / inputData.length) * (buffer.sampleRate / 2);

      if (frequency >= 300 && frequency <= 3400) {
        // Voice frequency range
        vocalsData[i] = sample * 0.8;
        instrumentsData[i] = sample * 0.2;
        noiseData[i] = sample * 0.1;
      } else if (frequency < 300 || frequency > 3400) {
        // Instrument frequency range
        vocalsData[i] = sample * 0.1;
        instrumentsData[i] = sample * 0.8;
        noiseData[i] = sample * 0.2;
      } else {
        // Noise
        noiseData[i] = sample * 0.9;
      }
    }

    return { vocals, instruments, noise };
  };

  // Apply final processing and gain
  const applyFinalProcessing = async (
    buffer: AudioBuffer,
    options: ProcessingOptions
  ): Promise<AudioBuffer> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const processedBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);

      for (let i = 0; i < inputData.length; i++) {
        // Apply output gain
        outputData[i] = inputData[i] * options.outputGain;
      }
    }

    return processedBuffer;
  };

  // Convert AudioBuffer to playable URL
  const audioBufferToUrl = useCallback((buffer: AudioBuffer): string => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    // Create a new AudioBuffer for the WAV file
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }, []);

  return {
    processAudio,
    isProcessing,
    processingProgress,
    currentResult,
    audioBufferToUrl,
    clearResult: () => setCurrentResult(null)
  };
}