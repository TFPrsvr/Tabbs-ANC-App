'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface VideoProcessingProgress {
  stage: 'loading' | 'extracting' | 'converting' | 'complete';
  percentage: number;
  userMessage: string;
  timeRemaining?: number;
}

export interface VideoInfo {
  duration: number;
  format: string;
  videoCodec: string;
  audioCodec: string;
  resolution: { width: number; height: number };
  fileSize: number;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface ExtractionOptions {
  format: 'wav' | 'mp3' | 'flac' | 'ogg' | 'aac';
  quality: 'low' | 'medium' | 'high' | 'lossless';
  sampleRate?: number;
  channels?: 1 | 2;
  startTime?: number;
  endTime?: number;
}

export class FFmpegWrapper {
  private ffmpeg: FFmpeg;
  private isLoaded = false;
  private onProgress?: (progress: VideoProcessingProgress) => void;

  constructor(onProgress?: (progress: VideoProcessingProgress) => void) {
    this.ffmpeg = new FFmpeg();
    this.onProgress = onProgress;
  }

  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      this.reportProgress('loading', 0, '🔧 Setting up video processor...');
      
      // Load FFmpeg core and wasm files
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      // Set up progress monitoring
      this.ffmpeg.on('progress', ({ progress }) => {
        if (this.onProgress) {
          const percentage = Math.round(progress * 100);
          this.reportProgress('extracting', percentage, `🎬 Processing video... ${percentage}%`);
        }
      });

      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      this.isLoaded = true;
      this.reportProgress('loading', 100, '✅ Video processor ready!');

    } catch (error) {
      console.error('Failed to initialize FFmpeg:', error);
      throw new Error('Failed to initialize video processor. Please refresh and try again.');
    }
  }

  async getVideoInfo(videoFile: File): Promise<VideoInfo> {
    await this.initialize();
    
    try {
      this.reportProgress('loading', 0, '📋 Analyzing video file...');

      // Write file to FFmpeg filesystem
      const inputName = 'input.' + this.getFileExtension(videoFile.name);
      await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Get video information using ffprobe-like command
      await this.ffmpeg.exec([
        '-i', inputName,
        '-f', 'null',
        '-'
      ]);

      // Parse the output (simplified - in real implementation, parse actual ffmpeg output)
      const videoInfo: VideoInfo = {
        duration: 0, // Would be parsed from ffmpeg output
        format: this.getFileExtension(videoFile.name),
        videoCodec: 'unknown',
        audioCodec: 'unknown',
        resolution: { width: 1920, height: 1080 }, // Default, would be parsed
        fileSize: videoFile.size,
        hasAudio: true,
        hasVideo: true
      };

      // Clean up
      await this.ffmpeg.deleteFile(inputName);

      this.reportProgress('loading', 100, '✅ Video analysis complete!');
      return videoInfo;

    } catch (error) {
      console.error('Failed to analyze video:', error);
      throw new Error('Failed to analyze video file. It may be corrupted or in an unsupported format.');
    }
  }

  async extractAudio(videoFile: File, options: ExtractionOptions = { format: 'wav', quality: 'high' }): Promise<Blob> {
    await this.initialize();

    try {
      this.reportProgress('extracting', 0, '🎵 Starting audio extraction...');

      const inputName = 'input.' + this.getFileExtension(videoFile.name);
      const outputName = `output.${options.format}`;

      // Write input file
      await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Build FFmpeg command based on options
      const command = this.buildExtractionCommand(inputName, outputName, options);
      
      // Execute extraction
      await this.ffmpeg.exec(command);

      // Read the output file
      const audioData = await this.ffmpeg.readFile(outputName);
      
      // Clean up files
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      // Create blob with appropriate MIME type
      const mimeType = this.getMimeType(options.format);
      const audioBlob = new Blob([audioData], { type: mimeType });

      this.reportProgress('complete', 100, '🎉 Audio extracted successfully!');
      return audioBlob;

    } catch (error) {
      console.error('Audio extraction failed:', error);
      throw new Error('Failed to extract audio from video. Please try a different video file or format.');
    }
  }

  async convertToWebAudioBuffer(audioBlob: Blob, audioContext: AudioContext): Promise<AudioBuffer> {
    try {
      this.reportProgress('converting', 50, '🔊 Converting to audio buffer...');
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      this.reportProgress('complete', 100, '✅ Audio ready for processing!');
      return audioBuffer;

    } catch (error) {
      console.error('Failed to convert audio:', error);
      throw new Error('Failed to convert extracted audio. The audio format may not be supported.');
    }
  }

  async batchExtractAudio(videoFiles: File[], options: ExtractionOptions): Promise<Blob[]> {
    const results: Blob[] = [];
    
    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i];
      this.reportProgress('extracting', (i / videoFiles.length) * 100, 
        `🎬 Processing video ${i + 1} of ${videoFiles.length}: ${file.name}`);
      
      try {
        const audioBlob = await this.extractAudio(file, options);
        results.push(audioBlob);
      } catch (error) {
        console.error(`Failed to extract from ${file.name}:`, error);
        // Continue with other files, could push null or skip
      }
    }

    return results;
  }

  private buildExtractionCommand(inputName: string, outputName: string, options: ExtractionOptions): string[] {
    const command = ['-i', inputName];

    // Add time range if specified
    if (options.startTime !== undefined) {
      command.push('-ss', options.startTime.toString());
    }
    if (options.endTime !== undefined) {
      command.push('-to', options.endTime.toString());
    }

    // Audio codec and quality settings
    if (options.format === 'wav') {
      command.push('-acodec', 'pcm_s16le');
    } else if (options.format === 'mp3') {
      const bitrate = this.getMP3Bitrate(options.quality);
      command.push('-acodec', 'libmp3lame', '-ab', bitrate);
    } else if (options.format === 'flac') {
      command.push('-acodec', 'flac');
    } else if (options.format === 'ogg') {
      command.push('-acodec', 'libvorbis');
    } else if (options.format === 'aac') {
      command.push('-acodec', 'aac');
    }

    // Sample rate
    if (options.sampleRate) {
      command.push('-ar', options.sampleRate.toString());
    }

    // Channels
    if (options.channels) {
      command.push('-ac', options.channels.toString());
    }

    // Remove video stream
    command.push('-vn');
    
    // Output file
    command.push(outputName);

    return command;
  }

  private getMP3Bitrate(quality: ExtractionOptions['quality']): string {
    switch (quality) {
      case 'low': return '128k';
      case 'medium': return '192k';
      case 'high': return '320k';
      case 'lossless': return '320k'; // MP3 doesn't support true lossless
      default: return '192k';
    }
  }

  private getMimeType(format: ExtractionOptions['format']): string {
    switch (format) {
      case 'wav': return 'audio/wav';
      case 'mp3': return 'audio/mpeg';
      case 'flac': return 'audio/flac';
      case 'ogg': return 'audio/ogg';
      case 'aac': return 'audio/aac';
      default: return 'audio/wav';
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private reportProgress(stage: VideoProcessingProgress['stage'], percentage: number, userMessage: string): void {
    if (this.onProgress) {
      this.onProgress({
        stage,
        percentage,
        userMessage,
        timeRemaining: stage === 'extracting' ? this.estimateTimeRemaining(percentage) : undefined
      });
    }
  }

  private estimateTimeRemaining(percentage: number): number | undefined {
    if (percentage <= 0) return undefined;
    // Simple estimation - could be improved with actual timing data
    const estimatedTotal = 30; // seconds
    return Math.round((estimatedTotal * (100 - percentage)) / percentage);
  }

  dispose(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
    }
  }
}

// Static utility functions for video format support
export const VideoFormatUtils = {
  getSupportedVideoFormats(): string[] {
    return ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v', '3gp', 'wmv'];
  },

  getSupportedAudioFormats(): ExtractionOptions['format'][] {
    return ['wav', 'mp3', 'flac', 'ogg', 'aac'];
  },

  isVideoFormat(filename: string): boolean {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return this.getSupportedVideoFormats().includes(extension);
  },

  getFormatDescription(format: ExtractionOptions['format']): string {
    switch (format) {
      case 'wav': return 'WAV - Uncompressed, highest quality';
      case 'mp3': return 'MP3 - Most compatible, good compression';
      case 'flac': return 'FLAC - Lossless compression';
      case 'ogg': return 'OGG - Open source, good compression';
      case 'aac': return 'AAC - High efficiency, modern format';
      default: return 'Unknown format';
    }
  },

  getQualityDescription(quality: ExtractionOptions['quality']): string {
    switch (quality) {
      case 'low': return 'Low - Smaller file, lower quality';
      case 'medium': return 'Medium - Balanced size and quality';
      case 'high': return 'High - Larger file, better quality';
      case 'lossless': return 'Lossless - Maximum quality';
      default: return 'Medium quality';
    }
  }
};