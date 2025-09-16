"use client";

/**
 * Closed Captioning & Speech Recognition Engine
 * User-friendly labels: "Auto Captions", "Automatically create subtitles for any audio or video"
 */

export interface CaptionSegment {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string; // transcribed text
  speaker?: string; // which speaker (if voice detection is enabled)
  confidence: number; // 0-1 how sure we are about the transcription
  words: WordTiming[]; // individual word timings
  isEdited: boolean; // user has manually edited this caption
  language: string; // detected/selected language
}

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface SpeechRecognitionSettings {
  // User-friendly settings
  language: string; // "Language" - auto, en-US, es-ES, etc.
  enablePunctuation: boolean; // "Add punctuation automatically"
  enableSpeakerLabels: boolean; // "Show who is speaking"
  captionLength: number; // 1-100 - "Caption line length (words)"
  displayDuration: number; // 1-10 seconds - "How long to show captions"
  confidenceThreshold: number; // 0-100 - "Only show captions we're confident about"
  enableProfanityFilter: boolean; // "Filter inappropriate words"
  enableTimestamps: boolean; // "Include timestamps in export"
  autoCapitalize: boolean; // "Automatically capitalize sentences"
}

export interface TranscriptionProgress {
  stage: 'preparing' | 'listening' | 'transcribing' | 'processing' | 'complete';
  percentage: number;
  userMessage: string;
  captionsGenerated: number;
  currentSegment?: string;
}

export interface CaptionExportOptions {
  format: 'srt' | 'vtt' | 'ass' | 'txt' | 'json';
  includeSpeakers: boolean;
  includeTimestamps: boolean;
  includeConfidenceScores: boolean;
  maxLineLength: number;
}

export class SpeechRecognitionEngine {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private webSpeechRecognition: any = null;
  private worker: Worker | null = null;
  public onProgress?: (progress: TranscriptionProgress) => void;
  private onCaptionGenerated?: (caption: CaptionSegment) => void;
  
  // Language support mapping
  private readonly supportedLanguages = {
    'auto': 'Auto-detect',
    'en-US': '🇺🇸 English (US)',
    'en-GB': '🇬🇧 English (UK)', 
    'es-ES': '🇪🇸 Spanish (Spain)',
    'es-MX': '🇲🇽 Spanish (Mexico)',
    'fr-FR': '🇫🇷 French',
    'de-DE': '🇩🇪 German',
    'it-IT': '🇮🇹 Italian',
    'pt-BR': '🇧🇷 Portuguese (Brazil)',
    'ja-JP': '🇯🇵 Japanese',
    'ko-KR': '🇰🇷 Korean',
    'zh-CN': '🇨🇳 Chinese (Simplified)',
    'ru-RU': '🇷🇺 Russian',
    'ar-SA': '🇸🇦 Arabic'
  };

  constructor(
    onProgressCallback?: (progress: TranscriptionProgress) => void,
    onCaptionCallback?: (caption: CaptionSegment) => void
  ) {
    this.onProgress = onProgressCallback;
    this.onCaptionGenerated = onCaptionCallback;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Check for Web Speech API support
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        this.webSpeechRecognition = new SpeechRecognition();
      }

      // Initialize speech recognition worker for offline processing
      this.worker = new Worker('/workers/speech-recognition-worker.js');
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      this.isInitialized = true;
      
      this.reportProgress({
        stage: 'preparing',
        percentage: 100,
        userMessage: "📝 Auto captions system ready!",
        captionsGenerated: 0
      });
      
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      throw new Error('Could not start auto captions. Please check your device capabilities.');
    }
  }

  async transcribeAudio(
    audioBuffer: AudioBuffer,
    settings: SpeechRecognitionSettings,
    voiceSegments?: any[] // From voice detection engine
  ): Promise<CaptionSegment[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.reportProgress({
        stage: 'preparing',
        percentage: 10,
        userMessage: "🎯 Preparing audio for transcription...",
        captionsGenerated: 0
      });

      // Determine transcription strategy
      const useVoiceSegments = voiceSegments && voiceSegments.length > 0;
      
      if (useVoiceSegments) {
        this.transcribeWithSpeakerSegments(audioBuffer, settings, voiceSegments, resolve, reject);
      } else {
        this.transcribeFullAudio(audioBuffer, settings, resolve, reject);
      }
    });
  }

  private async transcribeWithSpeakerSegments(
    audioBuffer: AudioBuffer,
    settings: SpeechRecognitionSettings,
    voiceSegments: any[],
    resolve: (captions: CaptionSegment[]) => void,
    reject: (error: Error) => void
  ) {
    try {
      const captions: CaptionSegment[] = [];
      let processedSegments = 0;

      for (const segment of voiceSegments) {
        this.reportProgress({
          stage: 'transcribing',
          percentage: 20 + (processedSegments / voiceSegments.length * 60),
          userMessage: `🗣️ Transcribing ${segment.speaker || 'speaker'}...`,
          captionsGenerated: captions.length,
          currentSegment: `${this.formatTime(segment.startTime)} - ${this.formatTime(segment.endTime)}`
        });

        // Extract audio segment
        const segmentBuffer = this.extractAudioSegment(audioBuffer, segment.startTime, segment.endTime);
        
        // Transcribe this segment
        const transcription = await this.transcribeSegment(segmentBuffer, settings);
        
        if (transcription && transcription.text.trim()) {
          const caption: CaptionSegment = {
            id: `caption_${segment.startTime}_${Date.now()}`,
            startTime: segment.startTime,
            endTime: segment.endTime,
            text: this.cleanTranscriptionText(transcription.text, settings),
            speaker: segment.speaker,
            confidence: transcription.confidence,
            words: transcription.words || [],
            isEdited: false,
            language: settings.language === 'auto' ? transcription.detectedLanguage || 'en-US' : settings.language
          };

          captions.push(caption);
          
          // Notify callback for real-time display
          if (this.onCaptionGenerated) {
            this.onCaptionGenerated(caption);
          }
        }

        processedSegments++;
      }

      this.reportProgress({
        stage: 'processing',
        percentage: 90,
        userMessage: "✨ Finalizing captions...",
        captionsGenerated: captions.length
      });

      // Post-process captions
      const processedCaptions = this.postProcessCaptions(captions, settings);

      resolve(processedCaptions);
      
    } catch (error) {
      reject(error as Error);
    }
  }

  private async transcribeFullAudio(
    audioBuffer: AudioBuffer,
    settings: SpeechRecognitionSettings,
    resolve: (captions: CaptionSegment[]) => void,
    reject: (error: Error) => void
  ) {
    try {
      // Split audio into manageable chunks for transcription
      const chunkDuration = 30; // 30 second chunks
      const chunks = this.splitAudioIntoChunks(audioBuffer, chunkDuration);
      const captions: CaptionSegment[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        this.reportProgress({
          stage: 'transcribing',
          percentage: 20 + (i / chunks.length * 60),
          userMessage: `🎤 Transcribing chunk ${i + 1} of ${chunks.length}...`,
          captionsGenerated: captions.length,
          currentSegment: `${this.formatTime(chunk.startTime)} - ${this.formatTime(chunk.endTime)}`
        });

        const transcription = await this.transcribeSegment(chunk.audioBuffer, settings);
        
        if (transcription && transcription.text.trim()) {
          // Split long transcriptions into smaller caption segments
          const segmentCaptions = this.splitTranscriptionIntoCaptions(
            transcription,
            chunk.startTime,
            settings
          );

          captions.push(...segmentCaptions);
          
          // Notify for each caption
          segmentCaptions.forEach(caption => {
            if (this.onCaptionGenerated) {
              this.onCaptionGenerated(caption);
            }
          });
        }
      }

      this.reportProgress({
        stage: 'processing',
        percentage: 90,
        userMessage: "🔧 Polishing captions...",
        captionsGenerated: captions.length
      });

      const processedCaptions = this.postProcessCaptions(captions, settings);
      resolve(processedCaptions);
      
    } catch (error) {
      reject(error as Error);
    }
  }

  private extractAudioSegment(audioBuffer: AudioBuffer, startTime: number, endTime: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not available');

    const startSample = Math.floor(startTime * audioBuffer.sampleRate);
    const endSample = Math.floor(endTime * audioBuffer.sampleRate);
    const segmentLength = endSample - startSample;

    const segmentBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      segmentLength,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = segmentBuffer.getChannelData(channel);
      
      for (let i = 0; i < segmentLength; i++) {
        outputData[i] = inputData[startSample + i] || 0;
      }
    }

    return segmentBuffer;
  }

  private splitAudioIntoChunks(audioBuffer: AudioBuffer, chunkDuration: number) {
    const chunks = [];
    const totalDuration = audioBuffer.duration;
    
    for (let start = 0; start < totalDuration; start += chunkDuration) {
      const end = Math.min(start + chunkDuration, totalDuration);
      const chunkBuffer = this.extractAudioSegment(audioBuffer, start, end);
      
      chunks.push({
        startTime: start,
        endTime: end,
        audioBuffer: chunkBuffer
      });
    }
    
    return chunks;
  }

  private async transcribeSegment(audioBuffer: AudioBuffer, settings: SpeechRecognitionSettings): Promise<any> {
    // Try Web Speech API first (for real-time), fallback to worker-based processing
    if (this.webSpeechRecognition && settings.language !== 'auto') {
      return this.transcribeWithWebSpeechAPI(audioBuffer, settings);
    } else {
      return this.transcribeWithWorker(audioBuffer, settings);
    }
  }

  private async transcribeWithWebSpeechAPI(audioBuffer: AudioBuffer, settings: SpeechRecognitionSettings): Promise<any> {
    return new Promise((resolve) => {
      const recognition = this.webSpeechRecognition;
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = settings.language === 'auto' ? 'en-US' : settings.language;

      let transcriptionResult = {
        text: '',
        confidence: 0,
        words: [] as WordTiming[],
        detectedLanguage: settings.language
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let avgConfidence = 0;
        let resultCount = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
            avgConfidence += result[0].confidence || 0.8;
            resultCount++;
          }
        }

        transcriptionResult.text = finalTranscript.trim();
        transcriptionResult.confidence = resultCount > 0 ? avgConfidence / resultCount : 0.8;
        
        resolve(transcriptionResult);
      };

      recognition.onerror = () => {
        // Fallback to worker-based processing
        this.transcribeWithWorker(audioBuffer, settings).then(resolve);
      };

      recognition.onend = () => {
        if (!transcriptionResult.text) {
          resolve(transcriptionResult);
        }
      };

      // Convert AudioBuffer to MediaStream for Web Speech API
      this.audioBufferToMediaStream(audioBuffer).then(stream => {
        // Note: Web Speech API typically works with microphone input
        // This is a simplified approach - real implementation would need audio routing
        recognition.start();
        
        // Simulate recognition timing
        setTimeout(() => {
          recognition.stop();
        }, audioBuffer.duration * 1000);
      });
    });
  }

  private async transcribeWithWorker(audioBuffer: AudioBuffer, settings: SpeechRecognitionSettings): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Speech recognition worker not available'));
        return;
      }

      // Convert AudioBuffer to transferable format
      const audioData = this.prepareAudioForWorker(audioBuffer);
      
      this.worker.postMessage({
        type: 'transcribe',
        audioData,
        settings: {
          language: settings.language,
          enablePunctuation: settings.enablePunctuation,
          confidenceThreshold: settings.confidenceThreshold / 100
        }
      });

      // Store resolve/reject for worker response
      (this.worker as any)._transcribeResolve = resolve;
      (this.worker as any)._transcribeReject = reject;
    });
  }

  private async audioBufferToMediaStream(audioBuffer: AudioBuffer): Promise<MediaStream> {
    // Create a simple audio stream from AudioBuffer
    // Note: This is simplified - real implementation would need proper audio routing
    const stream = new MediaStream();
    return stream;
  }

  private prepareAudioForWorker(audioBuffer: AudioBuffer) {
    // Convert to mono for speech recognition
    const monoData = new Float32Array(audioBuffer.length);
    
    if (audioBuffer.numberOfChannels === 1) {
      monoData.set(audioBuffer.getChannelData(0));
    } else {
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

  private splitTranscriptionIntoCaptions(
    transcription: any,
    baseStartTime: number,
    settings: SpeechRecognitionSettings
  ): CaptionSegment[] {
    const captions: CaptionSegment[] = [];
    const maxWordsPerCaption = settings.captionLength;
    const displayDuration = settings.displayDuration;
    
    const words = transcription.text.split(' ');
    const wordsPerSecond = words.length / transcription.duration || 3; // Rough estimate
    
    for (let i = 0; i < words.length; i += maxWordsPerCaption) {
      const captionWords = words.slice(i, i + maxWordsPerCaption);
      const captionText = captionWords.join(' ');
      
      const captionStartTime = baseStartTime + (i / wordsPerSecond);
      const captionEndTime = Math.min(
        captionStartTime + displayDuration,
        baseStartTime + transcription.duration
      );

      const caption: CaptionSegment = {
        id: `caption_${captionStartTime}_${Date.now()}_${i}`,
        startTime: captionStartTime,
        endTime: captionEndTime,
        text: this.cleanTranscriptionText(captionText, settings),
        confidence: transcription.confidence,
        words: [], // Would need individual word timings from recognition engine
        isEdited: false,
        language: transcription.detectedLanguage || settings.language
      };

      captions.push(caption);
    }
    
    return captions;
  }

  private cleanTranscriptionText(text: string, settings: SpeechRecognitionSettings): string {
    let cleaned = text.trim();
    
    // Auto-capitalize
    if (settings.autoCapitalize) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      
      // Capitalize after periods
      cleaned = cleaned.replace(/\.\s+\w/g, match => match.toUpperCase());
    }
    
    // Add punctuation (simplified)
    if (settings.enablePunctuation && !cleaned.match(/[.!?]$/)) {
      cleaned += '.';
    }
    
    // Profanity filter (simplified)
    if (settings.enableProfanityFilter) {
      const profanityList = ['damn', 'hell', 'crap']; // Simplified list
      profanityList.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '*'.repeat(word.length));
      });
    }
    
    return cleaned;
  }

  private postProcessCaptions(captions: CaptionSegment[], settings: SpeechRecognitionSettings): CaptionSegment[] {
    // Filter by confidence threshold
    const filtered = captions.filter(caption => 
      caption.confidence >= (settings.confidenceThreshold / 100)
    );
    
    // Sort by start time
    filtered.sort((a, b) => a.startTime - b.startTime);
    
    // Merge very short adjacent captions from same speaker
    const merged: CaptionSegment[] = [];
    for (const caption of filtered) {
      const lastCaption = merged[merged.length - 1];
      
      if (lastCaption && 
          caption.speaker === lastCaption.speaker &&
          caption.startTime - lastCaption.endTime < 1.0 && // Less than 1 second gap
          lastCaption.text.length + caption.text.length < settings.captionLength * 8) { // Not too long
        
        // Merge with previous caption
        lastCaption.endTime = caption.endTime;
        lastCaption.text += ' ' + caption.text;
        lastCaption.confidence = (lastCaption.confidence + caption.confidence) / 2;
      } else {
        merged.push(caption);
      }
    }
    
    return merged;
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'transcriptionComplete':
        if ((this.worker as any)._transcribeResolve) {
          (this.worker as any)._transcribeResolve(data);
        }
        break;
      case 'transcriptionError':
        if ((this.worker as any)._transcribeReject) {
          (this.worker as any)._transcribeReject(new Error(data.message));
        }
        break;
      case 'progress':
        this.reportProgress(data);
        break;
    }
  }

  private reportProgress(progress: TranscriptionProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Export captions in various formats
  exportCaptions(captions: CaptionSegment[], options: CaptionExportOptions): string {
    switch (options.format) {
      case 'srt':
        return this.exportToSRT(captions, options);
      case 'vtt':
        return this.exportToVTT(captions, options);
      case 'ass':
        return this.exportToASS(captions, options);
      case 'txt':
        return this.exportToTXT(captions, options);
      case 'json':
        return this.exportToJSON(captions, options);
      default:
        return this.exportToSRT(captions, options);
    }
  }

  private exportToSRT(captions: CaptionSegment[], options: CaptionExportOptions): string {
    let srt = '';
    
    captions.forEach((caption, index) => {
      const startTime = this.formatSRTTime(caption.startTime);
      const endTime = this.formatSRTTime(caption.endTime);
      
      let text = caption.text;
      if (options.includeSpeakers && caption.speaker) {
        text = `${caption.speaker}: ${text}`;
      }
      
      srt += `${index + 1}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${text}\n\n`;
    });
    
    return srt;
  }

  private exportToVTT(captions: CaptionSegment[], options: CaptionExportOptions): string {
    let vtt = 'WEBVTT\n\n';
    
    captions.forEach(caption => {
      const startTime = this.formatSRTTime(caption.startTime);
      const endTime = this.formatSRTTime(caption.endTime);
      
      let text = caption.text;
      if (options.includeSpeakers && caption.speaker) {
        text = `<v ${caption.speaker}>${text}</v>`;
      }
      
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${text}\n\n`;
    });
    
    return vtt;
  }

  private exportToTXT(captions: CaptionSegment[], options: CaptionExportOptions): string {
    let txt = '';
    
    captions.forEach(caption => {
      let line = '';
      
      if (options.includeTimestamps) {
        line += `[${this.formatTime(caption.startTime)}] `;
      }
      
      if (options.includeSpeakers && caption.speaker) {
        line += `${caption.speaker}: `;
      }
      
      line += caption.text;
      
      if (options.includeConfidenceScores) {
        line += ` (${Math.round(caption.confidence * 100)}%)`;
      }
      
      txt += line + '\n';
    });
    
    return txt;
  }

  private exportToJSON(captions: CaptionSegment[], options: CaptionExportOptions): string {
    const exportData = {
      format: 'anc-audio-captions',
      version: '1.0',
      settings: options,
      captions: captions.map(caption => ({
        id: caption.id,
        startTime: caption.startTime,
        endTime: caption.endTime,
        text: caption.text,
        ...(options.includeSpeakers && { speaker: caption.speaker }),
        ...(options.includeConfidenceScores && { confidence: caption.confidence }),
        language: caption.language,
        isEdited: caption.isEdited
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  private exportToASS(captions: CaptionSegment[], options: CaptionExportOptions): string {
    // Advanced SubStation Alpha format
    let ass = '[Script Info]\n';
    ass += 'Title: ANC Audio Captions\n';
    ass += 'ScriptType: v4.00+\n\n';
    ass += '[V4+ Styles]\n';
    ass += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
    ass += 'Style: Default,Arial,16,&H00ffffff,&H000000ff,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\n\n';
    ass += '[Events]\n';
    ass += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
    
    captions.forEach(caption => {
      const startTime = this.formatASSTime(caption.startTime);
      const endTime = this.formatASSTime(caption.endTime);
      const speaker = caption.speaker || '';
      
      let text = caption.text;
      if (options.includeSpeakers && caption.speaker) {
        text = `{\\c&H00ff00&}${caption.speaker}:{\\c&H00ffffff&} ${text}`;
      }
      
      ass += `Dialogue: 0,${startTime},${endTime},Default,${speaker},0,0,0,,${text}\n`;
    });
    
    return ass;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centisecs = Math.floor((seconds % 1) * 100);
    
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
  }

  // Preset configurations for different use cases
  static readonly PRESETS = {
    PODCAST: {
      name: "🎙️ Podcast Captions",
      description: "Perfect for interviews and conversations",
      settings: {
        language: 'auto',
        enablePunctuation: true,
        enableSpeakerLabels: true,
        captionLength: 15,
        displayDuration: 4,
        confidenceThreshold: 70,
        enableProfanityFilter: true,
        enableTimestamps: true,
        autoCapitalize: true
      }
    },

    VIDEO_SUBTITLES: {
      name: "🎬 Video Subtitles",
      description: "Great for movies and video content",
      settings: {
        language: 'auto',
        enablePunctuation: true,
        enableSpeakerLabels: false,
        captionLength: 8,
        displayDuration: 3,
        confidenceThreshold: 80,
        enableProfanityFilter: false,
        enableTimestamps: false,
        autoCapitalize: true
      }
    },

    MEETING_NOTES: {
      name: "💼 Meeting Transcription",
      description: "Detailed transcription for business meetings",
      settings: {
        language: 'auto',
        enablePunctuation: true,
        enableSpeakerLabels: true,
        captionLength: 25,
        displayDuration: 6,
        confidenceThreshold: 60,
        enableProfanityFilter: true,
        enableTimestamps: true,
        autoCapitalize: true
      }
    },

    ACCESSIBILITY: {
      name: "♿ Accessibility Captions",
      description: "WCAG compliant captions for accessibility",
      settings: {
        language: 'auto',
        enablePunctuation: true,
        enableSpeakerLabels: true,
        captionLength: 12,
        displayDuration: 4,
        confidenceThreshold: 85,
        enableProfanityFilter: false,
        enableTimestamps: false,
        autoCapitalize: true
      }
    }
  };

  dispose(): void {
    if (this.webSpeechRecognition) {
      this.webSpeechRecognition.stop();
      this.webSpeechRecognition = null;
    }

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
export function getRecommendedCaptionSettings(contentType: 'podcast' | 'video' | 'meeting' | 'accessibility'): SpeechRecognitionSettings {
  switch (contentType) {
    case 'podcast':
      return SpeechRecognitionEngine.PRESETS.PODCAST.settings;
    case 'video':
      return SpeechRecognitionEngine.PRESETS.VIDEO_SUBTITLES.settings;
    case 'meeting':
      return SpeechRecognitionEngine.PRESETS.MEETING_NOTES.settings;
    case 'accessibility':
      return SpeechRecognitionEngine.PRESETS.ACCESSIBILITY.settings;
    default:
      return SpeechRecognitionEngine.PRESETS.VIDEO_SUBTITLES.settings;
  }
}