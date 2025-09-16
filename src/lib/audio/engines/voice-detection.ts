"use client";

/**
 * Individual Voice Detection & Speaker Recognition Engine
 * User-friendly labels: "Speaker Recognition", "Identify and control different people's voices"
 */

export interface VoiceProfile {
  id: string;
  name: string; // User-friendly name like "Speaker 1", "John", "Host"
  color: string; // UI color for this speaker
  confidence: number; // How sure we are this is a unique person (0-1)
  voiceprint: Float32Array; // Audio fingerprint for this speaker
  segments: VoiceSegment[]; // When this person speaks
  characteristics: {
    averagePitch: number; // Hz - "Voice Tone" 
    pitchRange: number; // Hz - "Voice Variety"
    speakingRate: number; // words per minute - "Speaking Speed"
    energy: number; // 0-1 - "Voice Strength"
    gender: 'male' | 'female' | 'unknown'; // Detected gender
  };
}

export interface VoiceSegment {
  startTime: number; // seconds
  endTime: number; // seconds
  speakerId: string; // which voice profile
  confidence: number; // how sure we are (0-1)
  transcript?: string; // what they said (from speech recognition)
  audioBuffer?: AudioBuffer; // isolated audio for this segment
  volume: number; // user-controlled volume for this segment (0-1)
  isMuted: boolean; // user can mute individual speakers
}

export interface VoiceDetectionSettings {
  // User-friendly settings
  sensitivity: number; // 0-100 - "How sensitive to pick up voices"
  minimumSegmentLength: number; // seconds - "Ignore voices shorter than X seconds"
  speakerSeparationThreshold: number; // 0-100 - "How different voices need to be"
  enableGenderDetection: boolean; // "Detect male/female voices"
  enableEmotionDetection: boolean; // "Detect emotions in voice" (future)
  autoNameSpeakers: boolean; // "Automatically name speakers (Speaker 1, 2, etc.)"
}

export interface VoiceDetectionProgress {
  stage: 'analyzing' | 'segmenting' | 'clustering' | 'profiling' | 'complete';
  percentage: number;
  userMessage: string;
  currentSpeaker?: string;
  speakersFound: number;
}

export class VoiceDetectionEngine {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private worker: Worker | null = null;
  public onProgress?: (progress: VoiceDetectionProgress) => void;
  
  // Speaker color palette for UI
  private readonly speakerColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red  
    '#10B981', // Green
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316'  // Orange
  ];

  constructor(onProgressCallback?: (progress: VoiceDetectionProgress) => void) {
    this.onProgress = onProgressCallback;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Load voice detection worker
      this.worker = new Worker('/workers/voice-detection-worker.js');
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      this.isInitialized = true;
      
      this.reportProgress({
        stage: 'analyzing',
        percentage: 0,
        userMessage: "👥 Voice recognition system ready!",
        speakersFound: 0
      });
      
    } catch (error) {
      console.error('Failed to initialize voice detection:', error);
      throw new Error('Could not start voice recognition. Please check your device capabilities.');
    }
  }

  async detectVoices(
    audioBuffer: AudioBuffer,
    settings: VoiceDetectionSettings
  ): Promise<VoiceProfile[]> {
    if (!this.isInitialized || !this.audioContext || !this.worker) {
      throw new Error('Voice detection engine not initialized');
    }

    return new Promise((resolve, reject) => {
      this.reportProgress({
        stage: 'analyzing',
        percentage: 10,
        userMessage: "🔍 Listening for different voices...",
        speakersFound: 0
      });

      const audioData = this.prepareAudioForVoiceAnalysis(audioBuffer);
      
      this.worker!.postMessage({
        type: 'detectVoices',
        audioData,
        settings: this.translateSettingsForWorker(settings),
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration
      });

      (this.worker as any)._resolve = resolve;
      (this.worker as any)._reject = reject;
    });
  }

  async separateVoices(
    audioBuffer: AudioBuffer,
    voiceProfiles: VoiceProfile[]
  ): Promise<Record<string, AudioBuffer>> {
    if (!this.audioContext) throw new Error('Audio context not available');

    const separatedVoices: Record<string, AudioBuffer> = {};
    
    for (const profile of voiceProfiles) {
      this.reportProgress({
        stage: 'segmenting',
        percentage: 30 + (voiceProfiles.indexOf(profile) / voiceProfiles.length * 50),
        userMessage: `🎤 Isolating ${profile.name}'s voice...`,
        currentSpeaker: profile.name,
        speakersFound: voiceProfiles.length
      });

      // Create isolated audio buffer for this speaker
      const isolatedBuffer = await this.isolateSpeakerAudio(audioBuffer, profile);
      separatedVoices[profile.id] = isolatedBuffer;
    }

    return separatedVoices;
  }

  private async isolateSpeakerAudio(audioBuffer: AudioBuffer, profile: VoiceProfile): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not available');

    // Create new buffer for isolated audio
    const isolatedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Process each channel
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = isolatedBuffer.getChannelData(channel);
      
      // Initialize with silence
      outputData.fill(0);
      
      // Add audio only during this speaker's segments
      for (const segment of profile.segments) {
        const startSample = Math.floor(segment.startTime * audioBuffer.sampleRate);
        const endSample = Math.floor(segment.endTime * audioBuffer.sampleRate);
        
        for (let i = startSample; i < endSample && i < inputData.length; i++) {
          // Apply voice isolation filtering based on speaker characteristics
          const sample = this.applyVoiceFiltering(inputData[i], i, profile, audioBuffer.sampleRate);
          outputData[i] = sample * (segment.isMuted ? 0 : segment.volume);
        }
      }
    }

    return isolatedBuffer;
  }

  private applyVoiceFiltering(sample: number, sampleIndex: number, profile: VoiceProfile, sampleRate: number): number {
    // Apply frequency filtering based on speaker's voice characteristics
    const freq = (sampleIndex % 1024) / 1024 * (sampleRate / 2); // Rough frequency estimation
    
    // Filter based on speaker's pitch range
    const pitchMin = profile.characteristics.averagePitch - profile.characteristics.pitchRange / 2;
    const pitchMax = profile.characteristics.averagePitch + profile.characteristics.pitchRange / 2;
    
    if (freq >= pitchMin && freq <= pitchMax) {
      // Boost frequencies in speaker's range
      return sample * 1.2;
    } else if (freq >= pitchMin * 0.5 && freq <= pitchMax * 2) {
      // Keep harmonics but reduce
      return sample * 0.8;
    } else {
      // Heavily reduce other frequencies
      return sample * 0.1;
    }
  }

  private prepareAudioForVoiceAnalysis(audioBuffer: AudioBuffer) {
    // Convert to mono for voice analysis (most voice characteristics are in mid frequencies)
    const monoData = new Float32Array(audioBuffer.length);
    
    if (audioBuffer.numberOfChannels === 1) {
      monoData.set(audioBuffer.getChannelData(0));
    } else {
      // Mix to mono
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.getChannelData(1);
      
      for (let i = 0; i < audioBuffer.length; i++) {
        monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
      }
    }
    
    return {
      audioData: monoData,
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration
    };
  }

  private translateSettingsForWorker(settings: VoiceDetectionSettings) {
    return {
      vadThreshold: settings.sensitivity / 100 * 0.5, // Voice activity detection threshold
      minSegmentDuration: settings.minimumSegmentLength,
      clusteringThreshold: settings.speakerSeparationThreshold / 100 * 2.0,
      enableGenderClassification: settings.enableGenderDetection,
      enableEmotionDetection: settings.enableEmotionDetection,
      autoNaming: settings.autoNameSpeakers
    };
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'progress':
        this.reportProgress(data);
        break;
      case 'voicesDetected':
        this.handleVoicesDetected(data);
        break;
      case 'error':
        this.handleError(data);
        break;
    }
  }

  private handleVoicesDetected(data: any) {
    try {
      // Convert worker results to VoiceProfile objects
      const profiles = this.createVoiceProfilesFromWorkerData(data.voiceProfiles);
      
      this.reportProgress({
        stage: 'complete',
        percentage: 100,
        userMessage: `🎉 Found ${profiles.length} different voices!`,
        speakersFound: profiles.length
      });

      if ((this.worker as any)._resolve) {
        (this.worker as any)._resolve(profiles);
      }
    } catch (error) {
      this.handleError({ message: 'Failed to process voice profiles', error });
    }
  }

  private createVoiceProfilesFromWorkerData(workerProfiles: any[]): VoiceProfile[] {
    return workerProfiles.map((profile, index) => ({
      id: `speaker_${index + 1}`,
      name: profile.autoName || `Speaker ${index + 1}`,
      color: this.speakerColors[index % this.speakerColors.length],
      confidence: profile.confidence,
      voiceprint: new Float32Array(profile.voiceprint),
      segments: profile.segments.map((seg: any) => ({
        startTime: seg.startTime,
        endTime: seg.endTime,
        speakerId: `speaker_${index + 1}`,
        confidence: seg.confidence,
        transcript: seg.transcript,
        volume: 1.0,
        isMuted: false
      })),
      characteristics: {
        averagePitch: profile.characteristics.pitch,
        pitchRange: profile.characteristics.pitchRange,
        speakingRate: profile.characteristics.speakingRate,
        energy: profile.characteristics.energy,
        gender: profile.characteristics.gender || 'unknown'
      }
    }));
  }

  private handleError(data: any) {
    const userMessage = this.translateErrorToUserFriendly(data.error || data.message);
    
    this.reportProgress({
      stage: 'complete',
      percentage: 0,
      userMessage: `❌ ${userMessage}`,
      speakersFound: 0
    });

    if ((this.worker as any)._reject) {
      (this.worker as any)._reject(new Error(userMessage));
    }
  }

  private translateErrorToUserFriendly(error: string): string {
    if (error.includes('no voices') || error.includes('silent')) {
      return "No voices detected in this audio. Make sure there's speech in your file.";
    }
    if (error.includes('too short') || error.includes('duration')) {
      return "Audio is too short for voice analysis. Try a longer recording.";
    }
    if (error.includes('quality') || error.includes('noise')) {
      return "Audio quality is too poor for voice separation. Try a cleaner recording.";
    }
    return "Something went wrong with voice detection. Please try again.";
  }

  private reportProgress(progress: VoiceDetectionProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  // User-friendly preset configurations
  static readonly PRESETS = {
    PODCAST: {
      name: "🎙️ Podcast/Interview",
      description: "Detect 2-4 speakers in conversation",
      settings: {
        sensitivity: 70,
        minimumSegmentLength: 2,
        speakerSeparationThreshold: 60,
        enableGenderDetection: true,
        enableEmotionDetection: false,
        autoNameSpeakers: true
      }
    },

    MEETING: {
      name: "💼 Business Meeting",
      description: "Identify multiple participants",
      settings: {
        sensitivity: 80,
        minimumSegmentLength: 1,
        speakerSeparationThreshold: 50,
        enableGenderDetection: true,
        enableEmotionDetection: false,
        autoNameSpeakers: true
      }
    },

    SONG_DUET: {
      name: "🎵 Song with Multiple Singers",
      description: "Separate different vocalists",
      settings: {
        sensitivity: 60,
        minimumSegmentLength: 0.5,
        speakerSeparationThreshold: 70,
        enableGenderDetection: true,
        enableEmotionDetection: false,
        autoNameSpeakers: true
      }
    },

    HIGH_ACCURACY: {
      name: "🔍 High Accuracy Mode",
      description: "Most precise speaker detection",
      settings: {
        sensitivity: 90,
        minimumSegmentLength: 1.5,
        speakerSeparationThreshold: 80,
        enableGenderDetection: true,
        enableEmotionDetection: true,
        autoNameSpeakers: true
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

// Helper function to get recommended settings based on audio type
export function getRecommendedVoiceSettings(audioType: 'podcast' | 'meeting' | 'music' | 'interview'): VoiceDetectionSettings {
  switch (audioType) {
    case 'podcast':
    case 'interview':
      return VoiceDetectionEngine.PRESETS.PODCAST.settings;
    case 'meeting':
      return VoiceDetectionEngine.PRESETS.MEETING.settings;
    case 'music':
      return VoiceDetectionEngine.PRESETS.SONG_DUET.settings;
    default:
      return VoiceDetectionEngine.PRESETS.HIGH_ACCURACY.settings;
  }
}

// Utility function for users to rename speakers
export function renameSpeaker(profiles: VoiceProfile[], speakerId: string, newName: string): VoiceProfile[] {
  return profiles.map(profile => 
    profile.id === speakerId 
      ? { ...profile, name: newName }
      : profile
  );
}

// Utility function to get speaking time statistics
export function getSpeakingStats(profiles: VoiceProfile[]): Record<string, { totalTime: number; segmentCount: number; percentage: number }> {
  const totalDuration = profiles.reduce((sum, profile) => 
    sum + profile.segments.reduce((segSum, segment) => segSum + (segment.endTime - segment.startTime), 0), 0
  );

  const stats: Record<string, { totalTime: number; segmentCount: number; percentage: number }> = {};
  
  profiles.forEach(profile => {
    const speakerTime = profile.segments.reduce((sum, segment) => sum + (segment.endTime - segment.startTime), 0);
    stats[profile.id] = {
      totalTime: speakerTime,
      segmentCount: profile.segments.length,
      percentage: totalDuration > 0 ? (speakerTime / totalDuration) * 100 : 0
    };
  });

  return stats;
}