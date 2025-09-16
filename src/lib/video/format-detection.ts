/**
 * Video and Media Format Detection Utilities
 * 
 * Provides comprehensive format detection, validation, and metadata extraction
 * for all supported video and audio formats.
 */

export interface MediaFormat {
  extension: string;
  mimeType: string;
  category: 'video' | 'audio';
  quality: 'low' | 'medium' | 'high' | 'lossless';
  compression: 'lossy' | 'lossless';
  description: string;
  commonUse: string;
  audioSupport: boolean;
  videoSupport: boolean;
}

// Comprehensive format database
export const SUPPORTED_FORMATS: Record<string, MediaFormat> = {
  // Video Formats
  'mp4': {
    extension: 'mp4',
    mimeType: 'video/mp4',
    category: 'video',
    quality: 'high',
    compression: 'lossy',
    description: 'Most widely supported video format',
    commonUse: 'Streaming, sharing, general purpose',
    audioSupport: true,
    videoSupport: true
  },
  'mov': {
    extension: 'mov',
    mimeType: 'video/quicktime',
    category: 'video',
    quality: 'high',
    compression: 'lossy',
    description: 'Apple QuickTime format',
    commonUse: 'Professional video editing, Apple devices',
    audioSupport: true,
    videoSupport: true
  },
  'avi': {
    extension: 'avi',
    mimeType: 'video/x-msvideo',
    category: 'video',
    quality: 'medium',
    compression: 'lossy',
    description: 'Classic Windows video format',
    commonUse: 'Legacy videos, Windows systems',
    audioSupport: true,
    videoSupport: true
  },
  'mkv': {
    extension: 'mkv',
    mimeType: 'video/x-matroska',
    category: 'video',
    quality: 'high',
    compression: 'lossless',
    description: 'Open-source container with excellent quality',
    commonUse: 'High-quality video storage, multiple audio tracks',
    audioSupport: true,
    videoSupport: true
  },
  'webm': {
    extension: 'webm',
    mimeType: 'video/webm',
    category: 'video',
    quality: 'high',
    compression: 'lossy',
    description: 'Web-optimized open format',
    commonUse: 'Web streaming, HTML5 video',
    audioSupport: true,
    videoSupport: true
  },
  'flv': {
    extension: 'flv',
    mimeType: 'video/x-flv',
    category: 'video',
    quality: 'medium',
    compression: 'lossy',
    description: 'Adobe Flash video format',
    commonUse: 'Legacy web video, Flash content',
    audioSupport: true,
    videoSupport: true
  },
  'm4v': {
    extension: 'm4v',
    mimeType: 'video/x-m4v',
    category: 'video',
    quality: 'high',
    compression: 'lossy',
    description: 'iTunes-compatible video format',
    commonUse: 'Apple ecosystem, iTunes Store',
    audioSupport: true,
    videoSupport: true
  },
  '3gp': {
    extension: '3gp',
    mimeType: 'video/3gpp',
    category: 'video',
    quality: 'low',
    compression: 'lossy',
    description: 'Mobile phone video format',
    commonUse: 'Older mobile devices, small file sizes',
    audioSupport: true,
    videoSupport: true
  },
  'wmv': {
    extension: 'wmv',
    mimeType: 'video/x-ms-wmv',
    category: 'video',
    quality: 'medium',
    compression: 'lossy',
    description: 'Windows Media Video format',
    commonUse: 'Windows systems, older streaming',
    audioSupport: true,
    videoSupport: true
  },
  'ogv': {
    extension: 'ogv',
    mimeType: 'video/ogg',
    category: 'video',
    quality: 'high',
    compression: 'lossy',
    description: 'Open-source Ogg video format',
    commonUse: 'Open-source projects, web video',
    audioSupport: true,
    videoSupport: true
  },

  // Audio Formats
  'wav': {
    extension: 'wav',
    mimeType: 'audio/wav',
    category: 'audio',
    quality: 'lossless',
    compression: 'lossless',
    description: 'Uncompressed audio, highest quality',
    commonUse: 'Professional audio, editing, mastering',
    audioSupport: true,
    videoSupport: false
  },
  'mp3': {
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    category: 'audio',
    quality: 'high',
    compression: 'lossy',
    description: 'Most compatible compressed audio',
    commonUse: 'Music streaming, sharing, general use',
    audioSupport: true,
    videoSupport: false
  },
  'flac': {
    extension: 'flac',
    mimeType: 'audio/flac',
    category: 'audio',
    quality: 'lossless',
    compression: 'lossless',
    description: 'Lossless audio compression',
    commonUse: 'Audiophile quality, archival',
    audioSupport: true,
    videoSupport: false
  },
  'ogg': {
    extension: 'ogg',
    mimeType: 'audio/ogg',
    category: 'audio',
    quality: 'high',
    compression: 'lossy',
    description: 'Open-source audio format',
    commonUse: 'Web audio, open-source projects',
    audioSupport: true,
    videoSupport: false
  },
  'aac': {
    extension: 'aac',
    mimeType: 'audio/aac',
    category: 'audio',
    quality: 'high',
    compression: 'lossy',
    description: 'High-efficiency modern audio codec',
    commonUse: 'Streaming, Apple devices, modern apps',
    audioSupport: true,
    videoSupport: false
  },
  'm4a': {
    extension: 'm4a',
    mimeType: 'audio/m4a',
    category: 'audio',
    quality: 'high',
    compression: 'lossy',
    description: 'Apple audio format (AAC in MP4 container)',
    commonUse: 'iTunes, Apple devices, podcasts',
    audioSupport: true,
    videoSupport: false
  },
  'wma': {
    extension: 'wma',
    mimeType: 'audio/x-ms-wma',
    category: 'audio',
    quality: 'medium',
    compression: 'lossy',
    description: 'Windows Media Audio format',
    commonUse: 'Windows systems, legacy media',
    audioSupport: true,
    videoSupport: false
  }
};

export class MediaFormatDetector {
  
  /**
   * Detect file format from filename or MIME type
   */
  static detectFormat(filename: string, mimeType?: string): MediaFormat | null {
    // First try by file extension
    const extension = this.getFileExtension(filename);
    let format = SUPPORTED_FORMATS[extension];
    
    // Fallback to MIME type detection
    if (!format && mimeType) {
      const mimeFormat = this.getFormatByMimeType(mimeType);
      if (mimeFormat) {
        format = mimeFormat;
      }
    }
    
    return format || null;
  }
  
  /**
   * Check if file is a supported video format
   */
  static isVideoFile(filename: string, mimeType?: string): boolean {
    const format = this.detectFormat(filename, mimeType);
    return format?.category === 'video' && format.videoSupport === true;
  }
  
  /**
   * Check if file is a supported audio format
   */
  static isAudioFile(filename: string, mimeType?: string): boolean {
    const format = this.detectFormat(filename, mimeType);
    return format?.category === 'audio' || (format?.audioSupport === true);
  }
  
  /**
   * Check if video file has audio track
   */
  static hasAudioTrack(filename: string, mimeType?: string): boolean {
    const format = this.detectFormat(filename, mimeType);
    return format?.audioSupport === true;
  }
  
  /**
   * Get all supported video formats
   */
  static getSupportedVideoFormats(): MediaFormat[] {
    return Object.values(SUPPORTED_FORMATS).filter(format => 
      format.category === 'video' && format.videoSupport
    );
  }
  
  /**
   * Get all supported audio formats
   */
  static getSupportedAudioFormats(): MediaFormat[] {
    return Object.values(SUPPORTED_FORMATS).filter(format => 
      format.category === 'audio'
    );
  }
  
  /**
   * Get video formats that can extract audio
   */
  static getAudioExtractionFormats(): MediaFormat[] {
    return Object.values(SUPPORTED_FORMATS).filter(format => 
      format.category === 'video' && format.audioSupport
    );
  }
  
  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
  
  /**
   * Find format by MIME type
   */
  private static getFormatByMimeType(mimeType: string): MediaFormat | null {
    return Object.values(SUPPORTED_FORMATS).find(format => 
      format.mimeType === mimeType
    ) || null;
  }
  
  /**
   * Get recommended extraction settings for a format
   */
  static getRecommendedExtractionSettings(filename: string): {
    format: 'wav' | 'mp3' | 'flac' | 'ogg' | 'aac';
    quality: 'low' | 'medium' | 'high' | 'lossless';
    channels: 1 | 2;
    reasoning: string;
  } {
    const sourceFormat = this.detectFormat(filename);
    
    if (!sourceFormat) {
      return {
        format: 'wav',
        quality: 'high',
        channels: 2,
        reasoning: 'Default high-quality settings'
      };
    }
    
    // Music and high-quality content
    if (sourceFormat.quality === 'lossless' || sourceFormat.quality === 'high') {
      return {
        format: 'flac',
        quality: 'lossless',
        channels: 2,
        reasoning: 'Source is high quality, preserve with lossless compression'
      };
    }
    
    // Speech/podcast content (often mono or stereo speech)
    if (filename.toLowerCase().includes('podcast') || 
        filename.toLowerCase().includes('interview') || 
        filename.toLowerCase().includes('meeting')) {
      return {
        format: 'mp3',
        quality: 'high',
        channels: 1,
        reasoning: 'Speech content optimized for clarity and smaller file size'
      };
    }
    
    // Mobile/low-quality sources
    if (sourceFormat.quality === 'low') {
      return {
        format: 'mp3',
        quality: 'medium',
        channels: 2,
        reasoning: 'Source is lower quality, balanced output settings'
      };
    }
    
    // Default: balanced settings
    return {
      format: 'wav',
      quality: 'high',
      channels: 2,
      reasoning: 'Balanced quality and compatibility'
    };
  }
  
  /**
   * Estimate extraction time based on file size and format
   */
  static estimateExtractionTime(fileSizeBytes: number, sourceFormat?: MediaFormat): number {
    const baseMB = fileSizeBytes / (1024 * 1024);
    
    // Processing speed varies by format complexity
    let processingRate = 10; // MB per second (default)
    
    if (sourceFormat) {
      switch (sourceFormat.extension) {
        case 'mp4':
        case 'mov':
          processingRate = 15; // Faster for optimized formats
          break;
        case 'avi':
        case 'mkv':
          processingRate = 8; // Slower for complex containers
          break;
        case 'flv':
        case '3gp':
          processingRate = 12; // Medium speed
          break;
        default:
          processingRate = 10;
      }
    }
    
    return Math.max(5, Math.ceil(baseMB / processingRate)); // Minimum 5 seconds
  }
  
  /**
   * Get user-friendly format description
   */
  static getFormatDescription(filename: string): string {
    const format = this.detectFormat(filename);
    if (!format) return 'Unknown format';
    
    return `${format.extension.toUpperCase()} - ${format.description}`;
  }
  
  /**
   * Validate if file can be processed
   */
  static canProcess(filename: string, mimeType?: string): {
    canProcess: boolean;
    reason: string;
    suggestions?: string[];
  } {
    const format = this.detectFormat(filename, mimeType);
    
    if (!format) {
      return {
        canProcess: false,
        reason: 'Unsupported file format',
        suggestions: [
          'Try converting to MP4, MOV, or MP3',
          'Ensure file extension matches content',
          'Check if file is corrupted'
        ]
      };
    }
    
    if (format.category === 'video' && !format.audioSupport) {
      return {
        canProcess: false,
        reason: 'Video format does not contain audio',
        suggestions: [
          'Use a video with audio track',
          'Try a different video file',
          'Convert video to include audio'
        ]
      };
    }
    
    return {
      canProcess: true,
      reason: 'File format is supported'
    };
  }
}

// Export format lists for use in UI components
export const VIDEO_EXTENSIONS = Object.keys(SUPPORTED_FORMATS).filter(ext => 
  SUPPORTED_FORMATS[ext].category === 'video'
);

export const AUDIO_EXTENSIONS = Object.keys(SUPPORTED_FORMATS).filter(ext => 
  SUPPORTED_FORMATS[ext].category === 'audio'
);

export const EXTRACTABLE_VIDEO_EXTENSIONS = Object.keys(SUPPORTED_FORMATS).filter(ext => 
  SUPPORTED_FORMATS[ext].category === 'video' && SUPPORTED_FORMATS[ext].audioSupport
);