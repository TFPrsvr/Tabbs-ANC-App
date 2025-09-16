/**
 * Media File Manager - Database connection layer for comprehensive media handling
 * Handles all audio, video, and document files with metadata and processing status
 */

import { Client } from '@neondatabase/serverless';

export interface MediaFileRecord {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  fileCategory: 'audio' | 'video' | 'document' | 'archive';
  duration?: number;
  fileUrl: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  processingProgress: number;
  metadata: MediaFileMetadata;
  streamUrls?: ProcessedStreamUrls;
  tags: string[];
  isArchived: boolean;
  parentArchiveId?: string;
  extractedFiles?: string[];
  createdAt: Date;
  updatedAt: Date;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  errorMessage?: string;
}

export interface MediaFileMetadata {
  // Audio metadata
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  
  // Video metadata
  width?: number;
  height?: number;
  frameRate?: number;
  aspectRatio?: string;
  videoCodec?: string;
  audioCodec?: string;
  
  // Document metadata
  pageCount?: number;
  language?: string;
  hasSubtitles?: boolean;
  subtitleLanguages?: string[];
  
  // Archive metadata
  fileCount?: number;
  compressionRatio?: number;
  archiveFormat?: string;
  
  // Processing metadata
  voiceDetected?: boolean;
  speechDuration?: number;
  silenceDuration?: number;
  averageVolume?: number;
  peakVolume?: number;
  dominantFrequencies?: number[];
  
  // Quality metrics
  audioQuality?: 'low' | 'medium' | 'high' | 'lossless';
  videoQuality?: 'sd' | 'hd' | '4k' | '8k';
  compressionLevel?: number;
}

export interface ProcessedStreamUrls {
  voiceStream?: string;
  musicStream?: string;
  ambientStream?: string;
  noiseStream?: string;
  originalStream?: string;
  mixedStreams?: { [key: string]: string };
}

export interface ProcessingJobRecord {
  id: string;
  mediaFileId: string;
  userId: string;
  jobType: 'separation' | 'enhancement' | 'transcription' | 'compression' | 'extraction';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  priority: number;
  estimatedDuration?: number;
  actualDuration?: number;
  processingSettings: ProcessingSettings;
  resultData?: any;
  errorDetails?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export interface ProcessingSettings {
  separationQuality: 'low' | 'medium' | 'high' | 'studio';
  enableVoiceDetection: boolean;
  enableClosedCaptions: boolean;
  outputFormat: 'wav' | 'mp3' | 'flac' | 'aac';
  outputQuality: number;
  customSettings?: { [key: string]: any };
}

export interface MediaSearchFilters {
  userId?: string;
  fileCategory?: string[];
  mimeType?: string[];
  processingStatus?: string[];
  isProcessed?: boolean;
  isArchived?: boolean;
  hasVoice?: boolean;
  minDuration?: number;
  maxDuration?: number;
  minFileSize?: number;
  maxFileSize?: number;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
}

export interface MediaUsageStats {
  totalFiles: number;
  totalSize: number;
  audioFiles: number;
  videoFiles: number;
  documentFiles: number;
  archiveFiles: number;
  processedFiles: number;
  processingJobs: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
  storageUsed: number;
  processingTimeTotal: number;
  averageProcessingTime: number;
}

export class MediaFileManager {
  private client: Client;
  private initialized = false;

  constructor() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL
    });
  }

  private async ensureConnection(): Promise<void> {
    if (!this.initialized) {
      await this.client.connect();
      this.initialized = true;
    }
  }

  // File Management Operations
  public async createMediaFile(fileData: Omit<MediaFileRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MediaFileRecord> {
    await this.ensureConnection();
    
    const query = `
      INSERT INTO media_files (
        user_id, file_name, original_name, file_size, mime_type, file_extension,
        file_category, duration, file_url, thumbnail_url, preview_url,
        is_processed, processing_status, processing_progress, metadata,
        stream_urls, tags, is_archived, parent_archive_id, extracted_files,
        error_message
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const values = [
      fileData.userId,
      fileData.fileName,
      fileData.originalName,
      fileData.fileSize,
      fileData.mimeType,
      fileData.fileExtension,
      fileData.fileCategory,
      fileData.duration || null,
      fileData.fileUrl,
      fileData.thumbnailUrl || null,
      fileData.previewUrl || null,
      fileData.isProcessed,
      fileData.processingStatus,
      fileData.processingProgress,
      JSON.stringify(fileData.metadata),
      JSON.stringify(fileData.streamUrls || {}),
      JSON.stringify(fileData.tags),
      fileData.isArchived,
      fileData.parentArchiveId || null,
      JSON.stringify(fileData.extractedFiles || []),
      fileData.errorMessage || null
    ];

    const result = await this.client.query(query, values);
    return this.parseMediaFileRecord(result.rows[0]);
  }

  public async getMediaFile(fileId: string, userId?: string): Promise<MediaFileRecord | null> {
    await this.ensureConnection();
    
    const query = userId 
      ? 'SELECT * FROM media_files WHERE id = $1 AND user_id = $2'
      : 'SELECT * FROM media_files WHERE id = $1';
    
    const values = userId ? [fileId, userId] : [fileId];
    const result = await this.client.query(query, values);
    
    return result.rows.length > 0 ? this.parseMediaFileRecord(result.rows[0]) : null;
  }

  public async updateMediaFile(fileId: string, updates: Partial<MediaFileRecord>): Promise<MediaFileRecord | null> {
    await this.ensureConnection();
    
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbKey = this.camelToSnake(key);
        
        if (key === 'metadata' || key === 'streamUrls' || key === 'tags' || key === 'extractedFiles') {
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return this.getMediaFile(fileId);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(fileId);

    const query = `
      UPDATE media_files 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;

    const result = await this.client.query(query, values);
    return result.rows.length > 0 ? this.parseMediaFileRecord(result.rows[0]) : null;
  }

  public async deleteMediaFile(fileId: string, userId?: string): Promise<boolean> {
    await this.ensureConnection();
    
    const query = userId
      ? 'DELETE FROM media_files WHERE id = $1 AND user_id = $2'
      : 'DELETE FROM media_files WHERE id = $1';
    
    const values = userId ? [fileId, userId] : [fileId];
    const result = await this.client.query(query, values);
    
    return (result.rowCount || 0) > 0;
  }

  // Search and Filter Operations
  public async searchMediaFiles(
    filters: MediaSearchFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ files: MediaFileRecord[]; total: number }> {
    await this.ensureConnection();
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(filters.userId);
      paramIndex++;
    }

    if (filters.fileCategory && filters.fileCategory.length > 0) {
      conditions.push(`file_category = ANY($${paramIndex})`);
      values.push(filters.fileCategory);
      paramIndex++;
    }

    if (filters.mimeType && filters.mimeType.length > 0) {
      conditions.push(`mime_type = ANY($${paramIndex})`);
      values.push(filters.mimeType);
      paramIndex++;
    }

    if (filters.processingStatus && filters.processingStatus.length > 0) {
      conditions.push(`processing_status = ANY($${paramIndex})`);
      values.push(filters.processingStatus);
      paramIndex++;
    }

    if (filters.isProcessed !== undefined) {
      conditions.push(`is_processed = $${paramIndex}`);
      values.push(filters.isProcessed);
      paramIndex++;
    }

    if (filters.isArchived !== undefined) {
      conditions.push(`is_archived = $${paramIndex}`);
      values.push(filters.isArchived);
      paramIndex++;
    }

    if (filters.hasVoice !== undefined) {
      conditions.push(`metadata->>'voiceDetected' = $${paramIndex}`);
      values.push(filters.hasVoice.toString());
      paramIndex++;
    }

    if (filters.minDuration !== undefined) {
      conditions.push(`duration >= $${paramIndex}`);
      values.push(filters.minDuration);
      paramIndex++;
    }

    if (filters.maxDuration !== undefined) {
      conditions.push(`duration <= $${paramIndex}`);
      values.push(filters.maxDuration);
      paramIndex++;
    }

    if (filters.minFileSize !== undefined) {
      conditions.push(`file_size >= $${paramIndex}`);
      values.push(filters.minFileSize);
      paramIndex++;
    }

    if (filters.maxFileSize !== undefined) {
      conditions.push(`file_size <= $${paramIndex}`);
      values.push(filters.maxFileSize);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags ?| $${paramIndex}`);
      values.push(filters.tags);
      paramIndex++;
    }

    if (filters.dateRange) {
      conditions.push(`created_at >= $${paramIndex} AND created_at <= $${paramIndex + 1}`);
      values.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }

    if (filters.searchText) {
      conditions.push(`(
        original_name ILIKE $${paramIndex} OR 
        file_name ILIKE $${paramIndex} OR 
        tags::text ILIKE $${paramIndex}
      )`);
      values.push(`%${filters.searchText}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `SELECT COUNT(*) FROM media_files ${whereClause}`;
    const countResult = await this.client.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Main query
    values.push(limit, offset);
    const query = `
      SELECT * FROM media_files 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await this.client.query(query, values);
    const files = result.rows.map(row => this.parseMediaFileRecord(row));

    return { files, total };
  }

  // Processing Job Management
  public async createProcessingJob(jobData: Omit<ProcessingJobRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProcessingJobRecord> {
    await this.ensureConnection();
    
    const query = `
      INSERT INTO processing_jobs (
        media_file_id, user_id, job_type, status, progress, priority,
        estimated_duration, processing_settings, retry_count, max_retries
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `;

    const values = [
      jobData.mediaFileId,
      jobData.userId,
      jobData.jobType,
      jobData.status,
      jobData.progress,
      jobData.priority,
      jobData.estimatedDuration || null,
      JSON.stringify(jobData.processingSettings),
      jobData.retryCount,
      jobData.maxRetries
    ];

    const result = await this.client.query(query, values);
    return this.parseProcessingJobRecord(result.rows[0]);
  }

  public async updateProcessingJob(jobId: string, updates: Partial<ProcessingJobRecord>): Promise<ProcessingJobRecord | null> {
    await this.ensureConnection();
    
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbKey = this.camelToSnake(key);
        
        if (key === 'processingSettings' || key === 'resultData') {
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) return null;

    updateFields.push(`updated_at = NOW()`);
    values.push(jobId);

    const query = `
      UPDATE processing_jobs 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;

    const result = await this.client.query(query, values);
    return result.rows.length > 0 ? this.parseProcessingJobRecord(result.rows[0]) : null;
  }

  public async getQueuedJobs(limit: number = 10): Promise<ProcessingJobRecord[]> {
    await this.ensureConnection();
    
    const query = `
      SELECT * FROM processing_jobs 
      WHERE status = 'queued' 
      ORDER BY priority DESC, created_at ASC 
      LIMIT $1
    `;

    const result = await this.client.query(query, [limit]);
    return result.rows.map(row => this.parseProcessingJobRecord(row));
  }

  public async getProcessingJobs(mediaFileId: string): Promise<ProcessingJobRecord[]> {
    await this.ensureConnection();
    
    const query = `
      SELECT * FROM processing_jobs 
      WHERE media_file_id = $1 
      ORDER BY created_at DESC
    `;

    const result = await this.client.query(query, [mediaFileId]);
    return result.rows.map(row => this.parseProcessingJobRecord(row));
  }

  // Archive Operations
  public async createArchiveRelationships(archiveFileId: string, extractedFileIds: string[]): Promise<void> {
    await this.ensureConnection();
    
    // Update extracted files to reference the archive
    const updateQuery = `
      UPDATE media_files 
      SET parent_archive_id = $1 
      WHERE id = ANY($2)
    `;
    
    await this.client.query(updateQuery, [archiveFileId, extractedFileIds]);

    // Update archive file with extracted file references
    const archiveUpdateQuery = `
      UPDATE media_files 
      SET extracted_files = $1 
      WHERE id = $2
    `;
    
    await this.client.query(archiveUpdateQuery, [JSON.stringify(extractedFileIds), archiveFileId]);
  }

  public async getArchiveContents(archiveFileId: string): Promise<MediaFileRecord[]> {
    await this.ensureConnection();
    
    const query = `
      SELECT * FROM media_files 
      WHERE parent_archive_id = $1 
      ORDER BY original_name
    `;

    const result = await this.client.query(query, [archiveFileId]);
    return result.rows.map(row => this.parseMediaFileRecord(row));
  }

  // Statistics and Analytics
  public async getUserMediaStats(userId: string): Promise<MediaUsageStats> {
    await this.ensureConnection();
    
    // Get file statistics
    const fileStatsQuery = `
      SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN file_category = 'audio' THEN 1 END) as audio_files,
        COUNT(CASE WHEN file_category = 'video' THEN 1 END) as video_files,
        COUNT(CASE WHEN file_category = 'document' THEN 1 END) as document_files,
        COUNT(CASE WHEN file_category = 'archive' THEN 1 END) as archive_files,
        COUNT(CASE WHEN is_processed = true THEN 1 END) as processed_files
      FROM media_files 
      WHERE user_id = $1
    `;

    const fileStatsResult = await this.client.query(fileStatsQuery, [userId]);
    const fileStats = fileStatsResult.rows[0];

    // Get processing job statistics
    const jobStatsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        AVG(actual_duration) as avg_processing_time,
        SUM(actual_duration) as total_processing_time
      FROM processing_jobs pj
      JOIN media_files mf ON pj.media_file_id = mf.id
      WHERE mf.user_id = $1
    `;

    const jobStatsResult = await this.client.query(jobStatsQuery, [userId]);
    const jobStats = jobStatsResult.rows[0];

    return {
      totalFiles: parseInt(fileStats.total_files) || 0,
      totalSize: parseInt(fileStats.total_size) || 0,
      audioFiles: parseInt(fileStats.audio_files) || 0,
      videoFiles: parseInt(fileStats.video_files) || 0,
      documentFiles: parseInt(fileStats.document_files) || 0,
      archiveFiles: parseInt(fileStats.archive_files) || 0,
      processedFiles: parseInt(fileStats.processed_files) || 0,
      processingJobs: {
        queued: parseInt(jobStats.queued) || 0,
        processing: parseInt(jobStats.processing) || 0,
        completed: parseInt(jobStats.completed) || 0,
        failed: parseInt(jobStats.failed) || 0
      },
      storageUsed: parseInt(fileStats.total_size) || 0,
      processingTimeTotal: parseFloat(jobStats.total_processing_time) || 0,
      averageProcessingTime: parseFloat(jobStats.avg_processing_time) || 0
    };
  }

  public async getSystemStats(): Promise<any> {
    await this.ensureConnection();
    
    const query = `
      SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_storage,
        COUNT(DISTINCT user_id) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as files_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as files_week,
        AVG(file_size) as avg_file_size
      FROM media_files
    `;

    const result = await this.client.query(query);
    return result.rows[0];
  }

  // Cleanup and Maintenance
  public async cleanupOrphanedFiles(): Promise<number> {
    await this.ensureConnection();
    
    const query = `
      DELETE FROM media_files 
      WHERE processing_status = 'error' 
      AND created_at < NOW() - INTERVAL '7 days'
      AND retry_count >= max_retries
    `;

    const result = await this.client.query(query);
    return result.rowCount || 0;
  }

  public async archiveOldFiles(daysBefore: number = 90): Promise<number> {
    await this.ensureConnection();
    
    const query = `
      UPDATE media_files 
      SET is_archived = true 
      WHERE created_at < NOW() - INTERVAL '${daysBefore} days'
      AND is_archived = false
    `;

    const result = await this.client.query(query);
    return result.rowCount || 0;
  }

  // Utility Methods
  private parseMediaFileRecord(row: any): MediaFileRecord {
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      originalName: row.original_name,
      fileSize: parseInt(row.file_size),
      mimeType: row.mime_type,
      fileExtension: row.file_extension,
      fileCategory: row.file_category,
      duration: row.duration ? parseFloat(row.duration) : undefined,
      fileUrl: row.file_url,
      thumbnailUrl: row.thumbnail_url,
      previewUrl: row.preview_url,
      isProcessed: row.is_processed,
      processingStatus: row.processing_status,
      processingProgress: parseInt(row.processing_progress),
      metadata: JSON.parse(row.metadata || '{}'),
      streamUrls: JSON.parse(row.stream_urls || '{}'),
      tags: JSON.parse(row.tags || '[]'),
      isArchived: row.is_archived,
      parentArchiveId: row.parent_archive_id,
      extractedFiles: JSON.parse(row.extracted_files || '[]'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      processingStartedAt: row.processing_started_at ? new Date(row.processing_started_at) : undefined,
      processingCompletedAt: row.processing_completed_at ? new Date(row.processing_completed_at) : undefined,
      errorMessage: row.error_message
    };
  }

  private parseProcessingJobRecord(row: any): ProcessingJobRecord {
    return {
      id: row.id,
      mediaFileId: row.media_file_id,
      userId: row.user_id,
      jobType: row.job_type,
      status: row.status,
      progress: parseInt(row.progress),
      priority: parseInt(row.priority),
      estimatedDuration: row.estimated_duration ? parseInt(row.estimated_duration) : undefined,
      actualDuration: row.actual_duration ? parseInt(row.actual_duration) : undefined,
      processingSettings: JSON.parse(row.processing_settings || '{}'),
      resultData: row.result_data ? JSON.parse(row.result_data) : undefined,
      errorDetails: row.error_details,
      retryCount: parseInt(row.retry_count),
      maxRetries: parseInt(row.max_retries),
      createdAt: new Date(row.created_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      updatedAt: new Date(row.updated_at)
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  public async disconnect(): Promise<void> {
    if (this.initialized) {
      await this.client.end();
      this.initialized = false;
    }
  }
}