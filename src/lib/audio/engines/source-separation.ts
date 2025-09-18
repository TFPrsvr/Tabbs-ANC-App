"use client";

/**
 * AI-Powered Source Separation Engine
 * User-friendly labels: "Smart Audio Separation", "Magically separate any song"
 */

export interface SeparationSettings {
  // User-friendly settings
  separationQuality: 'fast' | 'balanced' | 'high_quality'; // "Processing Speed"
  enableVocalIsolation: boolean; // "Isolate Vocals"
  enableDrumSeparation: boolean; // "Separate Drums" 
  enableBassIsolation: boolean; // "Isolate Bass"
  enableInstrumentSeparation: boolean; // "Separate Instruments"
  preserveOriginalQuality: boolean; // "Keep Original Quality"
}

export interface SeparatedStreams {
  vocals: {
    name: "🎤 Vocals"; // User sees: "Vocals"
    audioBuffer: AudioBuffer;
    confidence: number; // How sure AI is (0-1)
  };
  drums: {
    name: "🥁 Drums"; // User sees: "Drums" 
    audioBuffer: AudioBuffer;
    confidence: number;
  };
  bass: {
    name: "🎸 Bass"; // User sees: "Bass"
    audioBuffer: AudioBuffer;
    confidence: number;
  };
  instruments: {
    name: "🎹 Instruments"; // User sees: "Instruments"
    audioBuffer: AudioBuffer;
    confidence: number;
  };
  accompaniment: {
    name: "🎵 Background Music"; // User sees: "Background Music"
    audioBuffer: AudioBuffer;
    confidence: number;
  };
}

export interface SeparationProgress {
  stage: 'loading' | 'preprocessing' | 'separating' | 'postprocessing' | 'complete';
  percentage: number; // 0-100
  userMessage: string; // User-friendly progress messages
  timeRemaining?: number; // seconds
}

export class AISourceSeparationEngine {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private worker: Worker | null = null;
  public onProgress?: (progress: SeparationProgress) => void;

  constructor(onProgressCallback?: (progress: SeparationProgress) => void) {
    this.onProgress = onProgressCallback;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Load AI model worker (placeholder - will implement actual TensorFlow.js model)
      this.worker = new Worker('/workers/separation-worker.js');
      
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      this.isInitialized = true;
      
      this.reportProgress({
        stage: 'loading',
        percentage: 100,
        userMessage: "🎯 Smart Audio Separation ready!"
      });
      
    } catch (error) {
      console.error('Failed to initialize AI separation engine:', error);
      throw new Error('Could not start Smart Audio Separation. Please check your device capabilities.');
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'progress':
        this.reportProgress(data);
        break;
      case 'complete':
        this.handleSeparationComplete(data);
        break;
      case 'error':
        this.handleSeparationError(data);
        break;
    }
  }

  async separateAudio(
    audioBuffer: AudioBuffer, 
    settings: SeparationSettings
  ): Promise<SeparatedStreams> {
    if (!this.isInitialized || !this.audioContext || !this.worker) {
      throw new Error('AI separation engine not initialized. Please wait a moment and try again.');
    }

    return new Promise((resolve, reject) => {
      // User-friendly progress updates
      this.reportProgress({
        stage: 'preprocessing',
        percentage: 10,
        userMessage: "🔍 Analyzing your audio...",
        timeRemaining: this.estimateProcessingTime(audioBuffer.duration, settings)
      });

      // Convert AudioBuffer to transferable format for worker
      const audioData = this.prepareAudioForProcessing(audioBuffer);
      
      // Send to worker with user-friendly settings
      this.worker!.postMessage({
        type: 'separate',
        audioData,
        settings: this.translateSettingsForWorker(settings),
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        duration: audioBuffer.duration
      });

      // Store resolve/reject for worker response
      (this.worker as any)._resolve = resolve;
      (this.worker as any)._reject = reject;
    });
  }

  private prepareAudioForProcessing(audioBuffer: AudioBuffer) {
    // Convert AudioBuffer to format suitable for ML processing
    const channels = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i).slice());
    }
    
    return {
      channels,
      sampleRate: audioBuffer.sampleRate,
      length: audioBuffer.length
    };
  }

  private translateSettingsForWorker(settings: SeparationSettings) {
    // Convert user-friendly settings to technical parameters
    return {
      quality: {
        'fast': { modelSize: 'small', iterations: 10 },
        'balanced': { modelSize: 'medium', iterations: 20 },
        'high_quality': { modelSize: 'large', iterations: 50 }
      }[settings.separationQuality],
      
      separationTargets: {
        vocals: settings.enableVocalIsolation,
        drums: settings.enableDrumSeparation,
        bass: settings.enableBassIsolation,
        other: settings.enableInstrumentSeparation
      },
      
      preserveQuality: settings.preserveOriginalQuality
    };
  }

  private estimateProcessingTime(duration: number, settings: SeparationSettings): number {
    // Rough estimates based on settings (in seconds)
    const baseTime = duration * 0.5; // Base: 30 seconds per minute of audio
    
    const qualityMultiplier = {
      'fast': 0.5,
      'balanced': 1.0,
      'high_quality': 2.0
    }[settings.separationQuality];
    
    const targetsCount = [
      settings.enableVocalIsolation,
      settings.enableDrumSeparation, 
      settings.enableBassIsolation,
      settings.enableInstrumentSeparation
    ].filter(Boolean).length;
    
    return Math.round(baseTime * qualityMultiplier * Math.max(1, targetsCount * 0.3));
  }

  private reportProgress(progress: SeparationProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  private handleSeparationComplete(data: any) {
    if (!this.audioContext) return;

    try {
      // Convert worker results back to AudioBuffers
      const streams = this.createAudioBuffersFromWorkerData(data.separatedAudio);
      
      this.reportProgress({
        stage: 'complete',
        percentage: 100,
        userMessage: "✨ Your audio has been magically separated!"
      });

      if ((this.worker as any)._resolve) {
        (this.worker as any)._resolve(streams);
      }
    } catch (error) {
      this.handleSeparationError({ message: 'Failed to process separated audio', error });
    }
  }

  private handleSeparationError(data: any) {
    const userMessage = this.translateErrorToUserFriendly(data.error || data.message);
    
    this.reportProgress({
      stage: 'complete',
      percentage: 0,
      userMessage: `❌ ${userMessage}`
    });

    if ((this.worker as any)._reject) {
      (this.worker as any)._reject(new Error(userMessage));
    }
  }

  private translateErrorToUserFriendly(error: string): string {
    // Convert technical errors to user-friendly messages
    if (error.includes('memory') || error.includes('Memory')) {
      return "Your file is too large for your device. Try a shorter audio clip.";
    }
    if (error.includes('format') || error.includes('Format')) {
      return "This audio format isn't supported. Try MP3, WAV, or M4A files.";
    }
    if (error.includes('model') || error.includes('Model')) {
      return "AI processing isn't available right now. Please try again later.";
    }
    return "Something went wrong with audio separation. Please try again.";
  }

  private createAudioBuffersFromWorkerData(separatedData: any): SeparatedStreams {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    const createBuffer = (channelData: Float32Array[], name: string, confidence: number) => {
      const buffer = this.audioContext!.createBuffer(
        channelData.length,
        channelData[0]?.length ?? 0,
        this.audioContext!.sampleRate
      );
      
      channelData.forEach((data, index) => {
        const channelBuffer = new Float32Array(data);
        buffer.copyToChannel(channelBuffer, index);
      });
      
      return { name: name as any, audioBuffer: buffer, confidence };
    };

    return {
      vocals: createBuffer(separatedData.vocals, "🎤 Vocals", separatedData.confidence.vocals || 0.85),
      drums: createBuffer(separatedData.drums, "🥁 Drums", separatedData.confidence.drums || 0.80),
      bass: createBuffer(separatedData.bass, "🎸 Bass", separatedData.confidence.bass || 0.75),
      instruments: createBuffer(separatedData.other, "🎹 Instruments", separatedData.confidence.other || 0.70),
      accompaniment: createBuffer(separatedData.accompaniment, "🎵 Background Music", separatedData.confidence.accompaniment || 0.80)
    };
  }

  // User-friendly preset configurations
  static readonly PRESETS = {
    KARAOKE: {
      name: "🎤 Karaoke Mode",
      description: "Remove vocals, keep the music",
      settings: {
        separationQuality: 'balanced' as const,
        enableVocalIsolation: true,
        enableDrumSeparation: false,
        enableBassIsolation: false, 
        enableInstrumentSeparation: false,
        preserveOriginalQuality: true
      }
    },
    
    PODCAST_CLEANUP: {
      name: "📻 Podcast Cleanup", 
      description: "Isolate voices, remove background noise",
      settings: {
        separationQuality: 'high_quality' as const,
        enableVocalIsolation: true,
        enableDrumSeparation: false,
        enableBassIsolation: false,
        enableInstrumentSeparation: false,
        preserveOriginalQuality: true
      }
    },

    FULL_SEPARATION: {
      name: "🎹 Full Band Separation",
      description: "Separate all instruments and vocals",
      settings: {
        separationQuality: 'high_quality' as const,
        enableVocalIsolation: true,
        enableDrumSeparation: true,
        enableBassIsolation: true,
        enableInstrumentSeparation: true,
        preserveOriginalQuality: true
      }
    },

    QUICK_PREVIEW: {
      name: "⚡ Quick Preview",
      description: "Fast separation for testing",
      settings: {
        separationQuality: 'fast' as const,
        enableVocalIsolation: true,
        enableDrumSeparation: true,
        enableBassIsolation: false,
        enableInstrumentSeparation: false,
        preserveOriginalQuality: false
      }
    }
  };

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isInitialized = false;
  }
}

// Helper function for users to get recommended settings
export function getRecommendedSettings(audioType: 'music' | 'speech' | 'mixed'): SeparationSettings {
  switch (audioType) {
    case 'music':
      return AISourceSeparationEngine.PRESETS.FULL_SEPARATION.settings;
    case 'speech': 
      return AISourceSeparationEngine.PRESETS.PODCAST_CLEANUP.settings;
    case 'mixed':
      return AISourceSeparationEngine.PRESETS.KARAOKE.settings;
    default:
      return AISourceSeparationEngine.PRESETS.QUICK_PREVIEW.settings;
  }
}