/**
 * Comprehensive Import/Export System
 * Professional-grade media format conversion and batch processing
 */

import { ComprehensiveMediaProcessor } from './comprehensive-processor';
import { MultiUserFileManager, MediaFile } from '@/lib/file-management/multi-user-system';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  category: 'audio' | 'video' | 'project' | 'data';
  quality: 'lossy' | 'lossless';
  supports: {
    multiTrack: boolean;
    metadata: boolean;
    stems: boolean;
    video: boolean;
    compression: boolean;
  };
  parameters: {
    [key: string]: {
      type: 'number' | 'boolean' | 'string' | 'select';
      default: any;
      min?: number;
      max?: number;
      options?: string[];
      description: string;
    };
  };
}

export interface ImportFormat {
  id: string;
  name: string;
  extensions: string[];
  mimeTypes: string[];
  category: 'audio' | 'video' | 'project' | 'playlist' | 'metadata';
  supports: {
    multiTrack: boolean;
    metadata: boolean;
    embedded: boolean;
    streaming: boolean;
  };
  processor: string;
}

export interface BatchOperation {
  id: string;
  type: 'export' | 'convert' | 'process';
  files: string[]; // File IDs
  format: string;
  parameters: Record<string, any>;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  results?: {
    downloadUrl?: string;
    individualFiles?: { fileId: string; downloadUrl: string }[];
    errors?: { fileId: string; error: string }[];
  };
  error?: string;
}

export interface ProjectExport {
  version: string;
  metadata: {
    title: string;
    artist?: string;
    created: string;
    modified: string;
    software: string;
    softwareVersion: string;
  };
  timeline: {
    duration: number;
    sampleRate: number;
    tempo: number;
    timeSignature: [number, number];
  };
  tracks: {
    id: string;
    name: string;
    type: string;
    volume: number;
    pan: number;
    muted: boolean;
    solo: boolean;
    effects: any[];
    automation: any[];
    regions: any[];
    audioFile?: string; // Base64 encoded or reference
  }[];
  markers: {
    time: number;
    name: string;
    type: string;
  }[];
  mixdown?: string; // Base64 encoded final mix
}

export class ImportExportSystem {
  private mediaProcessor: ComprehensiveMediaProcessor;
  private fileManager: MultiUserFileManager;
  private batchQueue: BatchOperation[] = [];
  private activeOperations: Map<string, BatchOperation> = new Map();

  // Supported export formats
  private exportFormats: ExportFormat[] = [
    {
      id: 'wav',
      name: 'WAV (Uncompressed)',
      extension: 'wav',
      mimeType: 'audio/wav',
      category: 'audio',
      quality: 'lossless',
      supports: { multiTrack: false, metadata: true, stems: false, video: false, compression: false },
      parameters: {
        sampleRate: {
          type: 'select',
          default: 44100,
          options: ['22050', '44100', '48000', '88200', '96000', '192000'],
          description: 'Sample rate in Hz'
        },
        bitDepth: {
          type: 'select',
          default: 16,
          options: ['16', '24', '32'],
          description: 'Bit depth'
        },
        channels: {
          type: 'select',
          default: 2,
          options: ['1', '2'],
          description: 'Number of channels'
        }
      }
    },
    {
      id: 'mp3',
      name: 'MP3 (Compressed)',
      extension: 'mp3',
      mimeType: 'audio/mpeg',
      category: 'audio',
      quality: 'lossy',
      supports: { multiTrack: false, metadata: true, stems: false, video: false, compression: true },
      parameters: {
        bitrate: {
          type: 'select',
          default: 320,
          options: ['128', '192', '256', '320'],
          description: 'Bitrate in kbps'
        },
        vbr: {
          type: 'boolean',
          default: false,
          description: 'Variable bitrate encoding'
        },
        quality: {
          type: 'select',
          default: 'high',
          options: ['low', 'medium', 'high', 'extreme'],
          description: 'Encoding quality preset'
        }
      }
    },
    {
      id: 'flac',
      name: 'FLAC (Lossless Compressed)',
      extension: 'flac',
      mimeType: 'audio/flac',
      category: 'audio',
      quality: 'lossless',
      supports: { multiTrack: false, metadata: true, stems: false, video: false, compression: true },
      parameters: {
        compressionLevel: {
          type: 'number',
          default: 5,
          min: 0,
          max: 8,
          description: 'Compression level (0=fastest, 8=smallest)'
        },
        sampleRate: {
          type: 'select',
          default: 44100,
          options: ['44100', '48000', '88200', '96000', '192000'],
          description: 'Sample rate in Hz'
        }
      }
    },
    {
      id: 'stems-zip',
      name: 'Audio Stems (ZIP)',
      extension: 'zip',
      mimeType: 'application/zip',
      category: 'audio',
      quality: 'lossless',
      supports: { multiTrack: true, metadata: true, stems: true, video: false, compression: false },
      parameters: {
        stemFormat: {
          type: 'select',
          default: 'wav',
          options: ['wav', 'flac', 'mp3'],
          description: 'Format for individual stems'
        },
        includeMetadata: {
          type: 'boolean',
          default: true,
          description: 'Include metadata files'
        }
      }
    },
    {
      id: 'mp4-video',
      name: 'MP4 Video',
      extension: 'mp4',
      mimeType: 'video/mp4',
      category: 'video',
      quality: 'lossy',
      supports: { multiTrack: false, metadata: true, stems: false, video: true, compression: true },
      parameters: {
        videoCodec: {
          type: 'select',
          default: 'h264',
          options: ['h264', 'h265', 'vp9'],
          description: 'Video codec'
        },
        videoBitrate: {
          type: 'number',
          default: 2000,
          min: 500,
          max: 50000,
          description: 'Video bitrate in kbps'
        },
        audioCodec: {
          type: 'select',
          default: 'aac',
          options: ['aac', 'mp3'],
          description: 'Audio codec'
        },
        audioBitrate: {
          type: 'number',
          default: 128,
          min: 64,
          max: 320,
          description: 'Audio bitrate in kbps'
        }
      }
    },
    {
      id: 'project-json',
      name: 'Project File (JSON)',
      extension: 'ancproj',
      mimeType: 'application/json',
      category: 'project',
      quality: 'lossless',
      supports: { multiTrack: true, metadata: true, stems: true, video: true, compression: false },
      parameters: {
        includeAudio: {
          type: 'boolean',
          default: false,
          description: 'Embed audio data in project file'
        },
        compression: {
          type: 'boolean',
          default: true,
          description: 'Compress project data'
        }
      }
    }
  ];

  // Supported import formats
  private importFormats: ImportFormat[] = [
    {
      id: 'audio-standard',
      name: 'Standard Audio Files',
      extensions: ['.wav', '.mp3', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
      mimeTypes: ['audio/*'],
      category: 'audio',
      supports: { multiTrack: false, metadata: true, embedded: false, streaming: false },
      processor: 'audio'
    },
    {
      id: 'video-standard',
      name: 'Standard Video Files',
      extensions: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.wmv'],
      mimeTypes: ['video/*'],
      category: 'video',
      supports: { multiTrack: true, metadata: true, embedded: true, streaming: false },
      processor: 'video'
    },
    {
      id: 'project-files',
      name: 'Project Files',
      extensions: ['.ancproj', '.aup3', '.rpp', '.logic', '.ptx'],
      mimeTypes: ['application/json', 'application/octet-stream'],
      category: 'project',
      supports: { multiTrack: true, metadata: true, embedded: true, streaming: false },
      processor: 'project'
    },
    {
      id: 'playlist-formats',
      name: 'Playlist Files',
      extensions: ['.m3u', '.m3u8', '.pls', '.xspf'],
      mimeTypes: ['audio/x-mpegurl', 'application/vnd.apple.mpegurl', 'audio/x-scpls'],
      category: 'playlist',
      supports: { multiTrack: false, metadata: true, embedded: false, streaming: true },
      processor: 'playlist'
    }
  ];

  constructor(fileManager: MultiUserFileManager) {
    this.fileManager = fileManager;
    this.mediaProcessor = new ComprehensiveMediaProcessor();
    this.startBatchProcessor();
  }

  /**
   * Get available export formats
   */
  getExportFormats(category?: string): ExportFormat[] {
    if (category) {
      return this.exportFormats.filter(format => format.category === category);
    }
    return this.exportFormats;
  }

  /**
   * Get available import formats
   */
  getImportFormats(category?: string): ImportFormat[] {
    if (category) {
      return this.importFormats.filter(format => format.category === category);
    }
    return this.importFormats;
  }

  /**
   * Export single file
   */
  async exportSingleFile(
    fileId: string,
    userId: string,
    formatId: string,
    parameters: Record<string, any> = {}
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      const fileResult = await this.fileManager.getFile(fileId, userId);
      if (!fileResult.file) {
        return { success: false, error: 'File not found' };
      }

      const format = this.exportFormats.find(f => f.id === formatId);
      if (!format) {
        return { success: false, error: 'Export format not supported' };
      }

      const exportedBlob = await this.performExport(fileResult.file, format, parameters);
      const downloadUrl = await this.createDownloadUrl(exportedBlob);

      return { success: true, downloadUrl };

    } catch (error) {
      console.error('Single file export failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Export multiple files (batch)
   */
  async exportBatch(
    fileIds: string[],
    userId: string,
    formatId: string,
    parameters: Record<string, any> = {}
  ): Promise<{ success: boolean; operationId?: string; error?: string }> {
    try {
      // Validate files
      const validFileIds: string[] = [];
      for (const fileId of fileIds) {
        const fileResult = await this.fileManager.getFile(fileId, userId);
        if (fileResult.file) {
          validFileIds.push(fileId);
        }
      }

      if (validFileIds.length === 0) {
        return { success: false, error: 'No valid files found' };
      }

      const format = this.exportFormats.find(f => f.id === formatId);
      if (!format) {
        return { success: false, error: 'Export format not supported' };
      }

      // Create batch operation
      const operationId = this.generateOperationId();
      const operation: BatchOperation = {
        id: operationId,
        type: 'export',
        files: validFileIds,
        format: formatId,
        parameters,
        status: 'queued',
        progress: 0
      };

      this.batchQueue.push(operation);

      return { success: true, operationId };

    } catch (error) {
      console.error('Batch export failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Import files from various sources
   */
  async importFiles(
    files: File[],
    userId: string,
    options: {
      extractMetadata?: boolean;
      autoProcess?: boolean;
      importFormat?: string;
    } = {}
  ): Promise<{
    success: boolean;
    imported: MediaFile[];
    errors: { file: string; error: string }[];
  }> {
    const imported: MediaFile[] = [];
    const errors: { file: string; error: string }[] = [];

    for (const file of files) {
      try {
        // Detect import format
        const importFormat = this.detectImportFormat(file);
        if (!importFormat) {
          errors.push({ file: file.name, error: 'Unsupported file format' });
          continue;
        }

        // Process file based on type
        let processedFiles: File[] = [file];

        if (importFormat.category === 'project') {
          processedFiles = await this.extractProjectFiles(file);
        } else if (importFormat.category === 'playlist') {
          processedFiles = await this.processPlaylist(file);
        }

        // Import each processed file
        for (const processedFile of processedFiles) {
          const uploadResult = await this.fileManager.uploadFile(processedFile, userId, {
            autoProcess: options.autoProcess,
            tags: ['imported'],
            metadata: options.extractMetadata ? await this.extractMetadata(processedFile) : {}
          });

          if (uploadResult.success && uploadResult.fileId) {
            const fileResult = await this.fileManager.getFile(uploadResult.fileId, userId);
            if (fileResult.file) {
              imported.push(fileResult.file);
            }
          } else {
            errors.push({ file: processedFile.name, error: uploadResult.error || 'Import failed' });
          }
        }

      } catch (error) {
        errors.push({ file: file.name, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return { success: true, imported, errors };
  }

  /**
   * Export project with all associated files
   */
  async exportProject(
    projectFiles: MediaFile[],
    userId: string,
    options: {
      includeAudio?: boolean;
      format?: 'json' | 'zip';
      compression?: boolean;
    } = {}
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      const projectData: ProjectExport = {
        version: '1.0',
        metadata: {
          title: 'Exported Project',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          software: 'ANC Audio App',
          softwareVersion: '1.0.0'
        },
        timeline: {
          duration: Math.max(...projectFiles.map(f => f.duration || 0)),
          sampleRate: 44100,
          tempo: 120,
          timeSignature: [4, 4]
        },
        tracks: [],
        markers: []
      };

      // Convert files to project tracks
      for (const file of projectFiles) {
        const track = {
          id: file.id,
          name: file.originalName,
          type: file.fileType,
          volume: 100,
          pan: 0,
          muted: false,
          solo: false,
          effects: [],
          automation: [],
          regions: [],
          audioFile: options.includeAudio ? await this.fileToBase64(file) : undefined
        };

        projectData.tracks.push(track);
      }

      let exportBlob: Blob;

      if (options.format === 'zip') {
        // Create ZIP with project file and audio files
        const zip = new JSZip();

        // Add project JSON
        zip.file('project.ancproj', JSON.stringify(projectData, null, 2));

        // Add audio files
        if (!options.includeAudio) {
          for (const file of projectFiles) {
            const fileData = await this.getFileData(file);
            zip.file(`audio/${file.fileName}`, fileData);
          }
        }

        exportBlob = await zip.generateAsync({
          type: 'blob',
          compression: options.compression ? 'DEFLATE' : 'STORE'
        });

      } else {
        // JSON format
        const jsonString = JSON.stringify(projectData, null, 2);
        exportBlob = new Blob([jsonString], { type: 'application/json' });
      }

      const downloadUrl = await this.createDownloadUrl(exportBlob);
      return { success: true, downloadUrl };

    } catch (error) {
      console.error('Project export failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Get batch operation status
   */
  getBatchOperationStatus(operationId: string): BatchOperation | null {
    return this.activeOperations.get(operationId) ||
           this.batchQueue.find(op => op.id === operationId) ||
           null;
  }

  /**
   * Cancel batch operation
   */
  cancelBatchOperation(operationId: string): boolean {
    // Remove from queue
    const queueIndex = this.batchQueue.findIndex(op => op.id === operationId);
    if (queueIndex >= 0) {
      this.batchQueue.splice(queueIndex, 1);
      return true;
    }

    // Mark active operation as cancelled
    const activeOperation = this.activeOperations.get(operationId);
    if (activeOperation) {
      activeOperation.status = 'cancelled';
      return true;
    }

    return false;
  }

  // Private methods

  private async performExport(
    file: MediaFile,
    format: ExportFormat,
    parameters: Record<string, any>
  ): Promise<Blob> {
    const fileData = await this.getFileData(file);

    switch (format.category) {
      case 'audio':
        return await this.exportAudio(fileData, format, parameters);
      case 'video':
        return await this.exportVideo(fileData, format, parameters);
      case 'project':
        return await this.exportProjectFormat(file, format, parameters);
      default:
        throw new Error(`Export category ${format.category} not supported`);
    }
  }

  private async exportAudio(
    audioData: ArrayBuffer,
    format: ExportFormat,
    parameters: Record<string, any>
  ): Promise<Blob> {
    // Load audio buffer
    const audioBuffer = await this.mediaProcessor['audioContext'].decodeAudioData(audioData.slice(0));

    switch (format.id) {
      case 'wav':
        return await this.exportToWAV(audioBuffer, parameters);
      case 'mp3':
        return await this.exportToMP3(audioBuffer, parameters);
      case 'flac':
        return await this.exportToFLAC(audioBuffer, parameters);
      case 'stems-zip':
        return await this.exportStemsToZip(audioBuffer, parameters);
      default:
        throw new Error(`Audio format ${format.id} not implemented`);
    }
  }

  private async exportToWAV(
    audioBuffer: AudioBuffer,
    parameters: Record<string, any>
  ): Promise<Blob> {
    const sampleRate = parameters.sampleRate || audioBuffer.sampleRate;
    const bitDepth = parameters.bitDepth || 16;
    const channels = parameters.channels || audioBuffer.numberOfChannels;

    // Resample if needed
    let processedBuffer = audioBuffer;
    if (sampleRate !== audioBuffer.sampleRate) {
      processedBuffer = await this.resampleAudio(audioBuffer, sampleRate);
    }

    // Convert to WAV format
    const wavData = this.audioBufferToWAV(processedBuffer, bitDepth);
    return new Blob([wavData], { type: 'audio/wav' });
  }

  private async exportToMP3(
    audioBuffer: AudioBuffer,
    parameters: Record<string, any>
  ): Promise<Blob> {
    // MP3 encoding (would use a proper encoder in production)
    const bitrate = parameters.bitrate || 320;
    const quality = parameters.quality || 'high';
    const vbr = parameters.vbr || false;

    // Placeholder - use proper MP3 encoder
    const wavData = this.audioBufferToWAV(audioBuffer, 16);
    return new Blob([wavData], { type: 'audio/mpeg' });
  }

  private async exportToFLAC(
    audioBuffer: AudioBuffer,
    parameters: Record<string, any>
  ): Promise<Blob> {
    // TODO: Implement FLAC export
    // For now, fall back to WAV export
    return await this.exportToWAV(audioBuffer, parameters);
  }

  private async exportStemsToZip(
    audioBuffer: AudioBuffer,
    parameters: Record<string, any>
  ): Promise<Blob> {
    const zip = new JSZip();
    const stemFormat = parameters.stemFormat || 'wav';

    // Separate audio into stems (simplified)
    const stems = {
      'vocals': audioBuffer,
      'instrumental': audioBuffer,
      'drums': audioBuffer,
      'bass': audioBuffer
    };

    for (const [stemName, stemBuffer] of Object.entries(stems)) {
      let stemData: ArrayBuffer;

      if (stemFormat === 'wav') {
        stemData = this.audioBufferToWAV(stemBuffer, 24);
      } else {
        // Other formats would be implemented here
        stemData = this.audioBufferToWAV(stemBuffer, 24);
      }

      zip.file(`${stemName}.${stemFormat}`, stemData);
    }

    // Add metadata file
    if (parameters.includeMetadata) {
      const metadata = {
        stems: Object.keys(stems),
        format: stemFormat,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        exported: new Date().toISOString()
      };

      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  private audioBufferToWAV(audioBuffer: AudioBuffer, bitDepth: number): ArrayBuffer {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = bitDepth / 8;

    const buffer = new ArrayBuffer(44 + length * numberOfChannels * bytesPerSample);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * bytesPerSample, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
    view.setUint16(32, numberOfChannels * bytesPerSample, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * bytesPerSample, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];

        if (bitDepth === 16) {
          const intSample = Math.max(-32768, Math.min(32767, sample * 32768));
          view.setInt16(offset, intSample, true);
          offset += 2;
        } else if (bitDepth === 24) {
          const intSample = Math.max(-8388608, Math.min(8388607, sample * 8388608));
          view.setInt32(offset, intSample << 8, true);
          offset += 3;
        } else if (bitDepth === 32) {
          view.setFloat32(offset, sample, true);
          offset += 4;
        }
      }
    }

    return buffer;
  }

  private async resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
    // Audio resampling (simplified - use proper resampler in production)
    const ratio = targetSampleRate / audioBuffer.sampleRate;
    const newLength = Math.floor(audioBuffer.length * ratio);

    const newBuffer = new AudioContext().createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      targetSampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = newBuffer.getChannelData(channel);

      for (let i = 0; i < newLength; i++) {
        const sourceIndex = i / ratio;
        const index = Math.floor(sourceIndex);
        const fraction = sourceIndex - index;

        if (index + 1 < inputData.length) {
          outputData[i] = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
        } else {
          outputData[i] = inputData[index] || 0;
        }
      }
    }

    return newBuffer;
  }

  private detectImportFormat(file: File): ImportFormat | null {
    const extension = '.' + file.name.toLowerCase().split('.').pop();
    return this.importFormats.find(format =>
      format.extensions.includes(extension) ||
      format.mimeTypes.some(mimeType =>
        mimeType === '*/*' || file.type.includes(mimeType.split('/')[0])
      )
    ) || null;
  }

  private async extractProjectFiles(projectFile: File): Promise<File[]> {
    // Extract files from project archive
    const files: File[] = [];

    if (projectFile.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(projectFile);

      for (const [filename, zipObject] of Object.entries(zip.files)) {
        if (!zipObject.dir) {
          const content = await zipObject.async('blob');
          files.push(new File([content], filename));
        }
      }
    } else {
      files.push(projectFile);
    }

    return files;
  }

  private async processPlaylist(playlistFile: File): Promise<File[]> {
    // Process playlist files (M3U, PLS, etc.)
    const content = await playlistFile.text();
    const urls = this.parsePlaylistContent(content);

    // In production, would fetch remote files
    console.log('Playlist URLs:', urls);
    return [];
  }

  private parsePlaylistContent(content: string): string[] {
    const urls: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && (trimmed.startsWith('http') || trimmed.startsWith('/'))) {
        urls.push(trimmed);
      }
    }

    return urls;
  }

  private async extractMetadata(file: File): Promise<Record<string, any>> {
    // Extract metadata from file (simplified)
    return {
      originalName: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    };
  }

  private async getFileData(file: MediaFile): Promise<ArrayBuffer> {
    // Get file data from storage (placeholder)
    return new ArrayBuffer(0);
  }

  private async fileToBase64(file: MediaFile): Promise<string> {
    const data = await this.getFileData(file);
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async createDownloadUrl(blob: Blob): Promise<string> {
    return URL.createObjectURL(blob);
  }

  private generateOperationId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      this.processBatchQueue();
    }, 1000);
  }

  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0 || this.activeOperations.size >= 3) {
      return;
    }

    const operation = this.batchQueue.shift()!;
    this.activeOperations.set(operation.id, operation);

    try {
      operation.status = 'processing';
      operation.startedAt = new Date().toISOString();

      if (operation.type === 'export') {
        await this.processBatchExport(operation);
      }

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
      operation.progress = 100;

    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : String(error);
    } finally {
      // Keep operation in active list for status checking, but remove after some time
      setTimeout(() => {
        this.activeOperations.delete(operation.id);
      }, 60000); // Remove after 1 minute
    }
  }

  private async processBatchExport(operation: BatchOperation): Promise<void> {
    const format = this.exportFormats.find(f => f.id === operation.format);
    if (!format) {
      throw new Error('Export format not found');
    }

    const results: { fileId: string; downloadUrl: string }[] = [];
    const errors: { fileId: string; error: string }[] = [];

    for (let i = 0; i < operation.files.length; i++) {
      try {
        const fileId = operation.files[i];

        // Update progress
        operation.progress = (i / operation.files.length) * 100;

        // Export single file
        const exportResult = await this.exportSingleFile(
          fileId,
          'batch', // Would need proper user context
          operation.format,
          operation.parameters
        );

        if (exportResult.success && exportResult.downloadUrl) {
          results.push({ fileId, downloadUrl: exportResult.downloadUrl });
        } else {
          errors.push({ fileId, error: exportResult.error || 'Export failed' });
        }

      } catch (error) {
        errors.push({ fileId: operation.files[i], error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Create batch download if multiple files
    if (results.length > 1) {
      const zip = new JSZip();

      for (const result of results) {
        // Would fetch and add files to ZIP
        console.log(`Adding ${result.fileId} to batch export`);
      }

      const batchBlob = await zip.generateAsync({ type: 'blob' });
      const batchDownloadUrl = await this.createDownloadUrl(batchBlob);

      operation.results = {
        downloadUrl: batchDownloadUrl,
        individualFiles: results,
        errors
      };
    } else if (results.length === 1) {
      operation.results = {
        downloadUrl: results[0].downloadUrl,
        individualFiles: results,
        errors
      };
    } else {
      throw new Error('No files exported successfully');
    }
  }

  private async exportVideo(
    videoData: ArrayBuffer,
    format: ExportFormat,
    parameters: Record<string, any>
  ): Promise<Blob> {
    // Video export implementation (would use FFmpeg or similar)
    throw new Error('Video export not implemented');
  }

  private async exportProjectFormat(
    file: MediaFile,
    format: ExportFormat,
    parameters: Record<string, any>
  ): Promise<Blob> {
    // Project format export
    const projectData = {
      file,
      parameters,
      exported: new Date().toISOString()
    };

    return new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
  }
}