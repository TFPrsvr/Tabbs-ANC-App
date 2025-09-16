/**
 * Multi-User File Management System
 * Secure, scalable file management with user isolation and sharing capabilities
 */

import { validateInput } from '@/lib/security/input-validation';
import { logSecurityEvent, SecurityEventType } from '@/lib/security/monitoring';

export interface MediaFile {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileType: 'audio' | 'video' | 'project';
  mimeType: string;
  size: number;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  createdAt: string;
  updatedAt: string;
  lastAccessed: string;
  tags: string[];
  metadata: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    year?: number;
    bpm?: number;
    key?: string;
    analyzedData?: {
      waveformPeaks: Float32Array;
      spectralData: Float32Array;
      onsets: number[];
    };
  };
  sharing: {
    isPublic: boolean;
    sharedWith: string[]; // User IDs
    shareToken?: string;
    shareExpiry?: string;
    permissions: ('read' | 'write' | 'comment' | 'download')[];
  };
  processing: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number; // 0-100
    operations: ProcessingOperation[];
    results?: {
      stems?: { [key: string]: string }; // Stem type -> file ID
      enhanced?: string; // Enhanced file ID
      export?: { [format: string]: string }; // Format -> file ID
    };
  };
  storage: {
    cloudPath?: string;
    localPath?: string;
    backupPaths?: string[];
    checksum: string;
    encrypted: boolean;
  };
}

export interface ProcessingOperation {
  id: string;
  type: 'analysis' | 'separation' | 'enhancement' | 'export' | 'backup';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  parameters: Record<string, any>;
  results?: Record<string, any>;
  error?: string;
}

export interface UserStorageQuota {
  userId: string;
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
  limits: {
    totalStorage: number; // bytes
    maxFileSize: number; // bytes
    maxFileDuration: number; // seconds
    maxConcurrentProcessing: number;
    maxSharedFiles: number;
  };
  usage: {
    usedStorage: number;
    fileCount: number;
    processingSlots: number;
    sharedFiles: number;
  };
}

export interface FileSearchFilter {
  userId?: string;
  fileType?: MediaFile['fileType'];
  mimeType?: string;
  tags?: string[];
  dateRange?: { start: string; end: string };
  sizeRange?: { min: number; max: number };
  durationRange?: { min: number; max: number };
  sharedOnly?: boolean;
  publicOnly?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'size' | 'duration' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class MultiUserFileManager {
  private files: Map<string, MediaFile> = new Map();
  private userQuotas: Map<string, UserStorageQuota> = new Map();
  private processingQueue: ProcessingOperation[] = [];
  private activeProcessing: Map<string, ProcessingOperation> = new Map();

  constructor() {
    this.initializeSystem();
  }

  /**
   * Initialize the file management system
   */
  private initializeSystem(): void {
    console.log('🗂️  Multi-user file management system initialized');

    // Load existing data from storage (in production, this would be from database)
    this.loadUserData();

    // Start background processing
    this.startProcessingWorker();

    // Setup cleanup tasks
    this.setupCleanupTasks();
  }

  /**
   * Upload and register a new media file
   */
  async uploadFile(
    file: File,
    userId: string,
    options: {
      tags?: string[];
      metadata?: Partial<MediaFile['metadata']>;
      autoProcess?: boolean;
      sharing?: Partial<MediaFile['sharing']>;
    } = {}
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      // Validate inputs
      const userIdValidation = validateInput(userId, 'username');
      if (!userIdValidation.isValid) {
        logSecurityEvent(
          SecurityEventType.SUSPICIOUS_REQUEST_PATTERN,
          'file-upload',
          { userId, ip: 'unknown', userAgent: 'unknown', details: { error: 'Invalid user ID' } }
        );
        return { success: false, error: 'Invalid user ID' };
      }

      const fileValidation = validateInput(file, 'filename');
      if (!fileValidation.isValid) {
        logSecurityEvent(
          SecurityEventType.MALICIOUS_FILE_UPLOAD,
          'file-upload',
          { userId, ip: 'unknown', userAgent: 'unknown', details: { fileName: file.name, error: fileValidation.errors } }
        );
        return { success: false, error: 'Invalid file' };
      }

      // Check user quota
      const quotaCheck = await this.checkUserQuota(userId, file.size);
      if (!quotaCheck.allowed) {
        return { success: false, error: quotaCheck.reason };
      }

      // Generate unique file ID
      const fileId = this.generateFileId();

      // Detect file type and extract metadata
      const fileType = this.detectFileType(file);
      const basicMetadata = await this.extractBasicMetadata(file);

      // Create file record
      const mediaFile: MediaFile = {
        id: fileId,
        userId,
        fileName: this.generateSecureFileName(file.name, fileId),
        originalName: file.name,
        fileType,
        mimeType: file.type,
        size: file.size,
        duration: basicMetadata.duration,
        sampleRate: basicMetadata.sampleRate,
        channels: basicMetadata.channels,
        bitRate: basicMetadata.bitRate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        tags: options.tags || [],
        metadata: {
          ...basicMetadata.metadata,
          ...options.metadata
        },
        sharing: {
          isPublic: false,
          sharedWith: [],
          permissions: ['read'],
          ...options.sharing
        },
        processing: {
          status: 'pending',
          progress: 0,
          operations: []
        },
        storage: {
          checksum: await this.calculateChecksum(file),
          encrypted: false
        }
      };

      // Store file data (in production, upload to cloud storage)
      await this.storeFileData(file, mediaFile);

      // Register file in system
      this.files.set(fileId, mediaFile);

      // Update user quota usage
      await this.updateUserQuota(userId, file.size);

      // Queue for processing if requested
      if (options.autoProcess) {
        await this.queueFileForProcessing(fileId, ['analysis']);
      }

      console.log(`✅ File uploaded successfully: ${file.name} (${fileId})`);

      return { success: true, fileId };

    } catch (error) {
      console.error('File upload failed:', error);

      logSecurityEvent(
        SecurityEventType.SUSPICIOUS_REQUEST_PATTERN,
        'file-upload',
        { userId, ip: 'unknown', userAgent: 'unknown', details: { error: error instanceof Error ? error.message : String(error) } }
      );

      return { success: false, error: 'Upload failed' };
    }
  }

  /**
   * Get files for a specific user with filtering
   */
  async getUserFiles(
    userId: string,
    filters: FileSearchFilter = {}
  ): Promise<{ files: MediaFile[]; totalCount: number; hasMore: boolean }> {
    // Validate user ID
    const userIdValidation = validateInput(userId, 'username');
    if (!userIdValidation.isValid) {
      return { files: [], totalCount: 0, hasMore: false };
    }

    // Get user's files
    let userFiles = Array.from(this.files.values()).filter(file => file.userId === userId);

    // Apply filters
    if (filters.fileType) {
      userFiles = userFiles.filter(file => file.fileType === filters.fileType);
    }

    if (filters.mimeType) {
      userFiles = userFiles.filter(file => file.mimeType.includes(filters.mimeType!));
    }

    if (filters.tags && filters.tags.length > 0) {
      userFiles = userFiles.filter(file =>
        filters.tags!.some(tag => file.tags.includes(tag))
      );
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      userFiles = userFiles.filter(file => {
        const created = new Date(file.createdAt);
        return created >= start && created <= end;
      });
    }

    if (filters.sizeRange) {
      userFiles = userFiles.filter(file =>
        file.size >= filters.sizeRange!.min && file.size <= filters.sizeRange!.max
      );
    }

    if (filters.durationRange && filters.durationRange.min > 0) {
      userFiles = userFiles.filter(file =>
        file.duration && file.duration >= filters.durationRange!.min &&
        file.duration <= filters.durationRange!.max
      );
    }

    if (filters.sharedOnly) {
      userFiles = userFiles.filter(file =>
        file.sharing.sharedWith.length > 0 || file.sharing.isPublic
      );
    }

    // Sort files
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    userFiles.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.originalName.toLowerCase();
          bValue = b.originalName.toLowerCase();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default: // createdAt
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    // Pagination
    const totalCount = userFiles.length;
    const offset = filters.offset || 0;
    const limit = Math.min(filters.limit || 50, 100); // Max 100 files per request

    const paginatedFiles = userFiles.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    return {
      files: paginatedFiles,
      totalCount,
      hasMore
    };
  }

  /**
   * Get a specific file (with access control)
   */
  async getFile(
    fileId: string,
    requesterId: string
  ): Promise<{ file?: MediaFile; error?: string }> {
    const file = this.files.get(fileId);

    if (!file) {
      return { error: 'File not found' };
    }

    // Check access permissions
    const hasAccess = await this.checkFileAccess(file, requesterId, 'read');
    if (!hasAccess) {
      logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_DATA_ACCESS,
        'file-access',
        { userId: requesterId, ip: 'unknown', userAgent: 'unknown', details: { fileId } }
      );
      return { error: 'Access denied' };
    }

    // Update last accessed time
    file.lastAccessed = new Date().toISOString();
    this.files.set(fileId, file);

    return { file };
  }

  /**
   * Share a file with other users or make it public
   */
  async shareFile(
    fileId: string,
    ownerId: string,
    shareOptions: {
      isPublic?: boolean;
      shareWith?: string[];
      permissions?: ('read' | 'write' | 'comment' | 'download')[];
      expiryDays?: number;
    }
  ): Promise<{ success: boolean; shareToken?: string; error?: string }> {
    const file = this.files.get(fileId);

    if (!file) {
      return { success: false, error: 'File not found' };
    }

    if (file.userId !== ownerId) {
      logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_DATA_ACCESS,
        'file-sharing',
        { userId: ownerId, ip: 'unknown', userAgent: 'unknown', details: { fileId } }
      );
      return { success: false, error: 'Access denied' };
    }

    // Check sharing quota
    const userQuota = this.userQuotas.get(ownerId);
    if (userQuota && userQuota.usage.sharedFiles >= userQuota.limits.maxSharedFiles) {
      return { success: false, error: 'Sharing limit exceeded' };
    }

    // Generate share token for public sharing
    let shareToken: string | undefined;
    if (shareOptions.isPublic) {
      shareToken = this.generateShareToken();
    }

    // Update sharing settings
    file.sharing = {
      ...file.sharing,
      isPublic: shareOptions.isPublic || false,
      sharedWith: [...new Set([...file.sharing.sharedWith, ...(shareOptions.shareWith || [])])],
      permissions: shareOptions.permissions || ['read'],
      shareToken,
      shareExpiry: shareOptions.expiryDays
        ? new Date(Date.now() + shareOptions.expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined
    };

    file.updatedAt = new Date().toISOString();
    this.files.set(fileId, file);

    // Update quota usage
    if (userQuota) {
      userQuota.usage.sharedFiles = Array.from(this.files.values())
        .filter(f => f.userId === ownerId && (f.sharing.isPublic || f.sharing.sharedWith.length > 0))
        .length;
    }

    return { success: true, shareToken };
  }

  /**
   * Process a file (analysis, separation, enhancement)
   */
  async processFile(
    fileId: string,
    userId: string,
    operations: ('analysis' | 'separation' | 'enhancement' | 'export')[],
    parameters: Record<string, any> = {}
  ): Promise<{ success: boolean; operationIds?: string[]; error?: string }> {
    const file = this.files.get(fileId);

    if (!file) {
      return { success: false, error: 'File not found' };
    }

    if (file.userId !== userId) {
      return { success: false, error: 'Access denied' };
    }

    // Check processing quota
    const userQuota = this.userQuotas.get(userId);
    if (userQuota && userQuota.usage.processingSlots >= userQuota.limits.maxConcurrentProcessing) {
      return { success: false, error: 'Processing limit exceeded' };
    }

    const operationIds: string[] = [];

    for (const operationType of operations) {
      const operationId = this.generateOperationId();
      const operation: ProcessingOperation = {
        id: operationId,
        type: operationType,
        status: 'queued',
        progress: 0,
        parameters: parameters[operationType] || {}
      };

      file.processing.operations.push(operation);
      this.processingQueue.push(operation);
      operationIds.push(operationId);
    }

    file.processing.status = 'pending';
    file.updatedAt = new Date().toISOString();
    this.files.set(fileId, file);

    return { success: true, operationIds };
  }

  /**
   * Delete a file and all its associated data
   */
  async deleteFile(
    fileId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const file = this.files.get(fileId);

    if (!file) {
      return { success: false, error: 'File not found' };
    }

    if (file.userId !== userId) {
      logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_DATA_ACCESS,
        'file-deletion',
        { userId, ip: 'unknown', userAgent: 'unknown', details: { fileId } }
      );
      return { success: false, error: 'Access denied' };
    }

    try {
      // Remove file from storage
      await this.removeFileData(file);

      // Remove from system
      this.files.delete(fileId);

      // Update user quota
      await this.updateUserQuota(userId, -file.size);

      console.log(`🗑️  File deleted: ${file.originalName} (${fileId})`);

      return { success: true };
    } catch (error) {
      console.error('File deletion failed:', error);
      return { success: false, error: 'Deletion failed' };
    }
  }

  /**
   * Get user's storage quota and usage
   */
  async getUserQuota(userId: string): Promise<UserStorageQuota | null> {
    return this.userQuotas.get(userId) || null;
  }

  /**
   * Update user's subscription plan and limits
   */
  async updateUserPlan(
    userId: string,
    plan: UserStorageQuota['plan']
  ): Promise<{ success: boolean; error?: string }> {
    const quota = this.userQuotas.get(userId);
    if (!quota) {
      return { success: false, error: 'User not found' };
    }

    // Define plan limits
    const planLimits = {
      free: {
        totalStorage: 1024 * 1024 * 1024, // 1GB
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxFileDuration: 600, // 10 minutes
        maxConcurrentProcessing: 1,
        maxSharedFiles: 5
      },
      pro: {
        totalStorage: 10 * 1024 * 1024 * 1024, // 10GB
        maxFileSize: 500 * 1024 * 1024, // 500MB
        maxFileDuration: 3600, // 1 hour
        maxConcurrentProcessing: 3,
        maxSharedFiles: 25
      },
      premium: {
        totalStorage: 100 * 1024 * 1024 * 1024, // 100GB
        maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
        maxFileDuration: 7200, // 2 hours
        maxConcurrentProcessing: 5,
        maxSharedFiles: 100
      },
      enterprise: {
        totalStorage: 1000 * 1024 * 1024 * 1024, // 1TB
        maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
        maxFileDuration: 14400, // 4 hours
        maxConcurrentProcessing: 10,
        maxSharedFiles: 1000
      }
    };

    quota.plan = plan;
    quota.limits = planLimits[plan];
    this.userQuotas.set(userId, quota);

    return { success: true };
  }

  // Private helper methods

  private async loadUserData(): Promise<void> {
    // In production, load from database
    console.log('📊 Loading user data from storage...');
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateShareToken(): string {
    return `share_${Math.random().toString(36).substr(2, 16)}_${Date.now()}`;
  }

  private generateSecureFileName(originalName: string, fileId: string): string {
    const ext = originalName.split('.').pop() || '';
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${fileId}_${sanitizedName}`;
  }

  private detectFileType(file: File): MediaFile['fileType'] {
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    if (file.name.endsWith('.ancproj')) return 'project';
    return 'audio'; // Default
  }

  private async extractBasicMetadata(file: File): Promise<{
    duration?: number;
    sampleRate?: number;
    channels?: number;
    bitRate?: number;
    metadata: Partial<MediaFile['metadata']>;
  }> {
    // Basic metadata extraction (in production, use proper media info libraries)
    return {
      duration: undefined,
      sampleRate: undefined,
      channels: undefined,
      bitRate: undefined,
      metadata: {}
    };
  }

  private async calculateChecksum(file: File): Promise<string> {
    // Calculate file checksum for integrity verification
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async storeFileData(file: File, mediaFile: MediaFile): Promise<void> {
    // In production, upload to cloud storage (AWS S3, Google Cloud, etc.)
    console.log(`💾 Storing file: ${mediaFile.fileName}`);
  }

  private async removeFileData(file: MediaFile): Promise<void> {
    // In production, remove from cloud storage
    console.log(`🗑️  Removing file data: ${file.fileName}`);
  }

  private async checkUserQuota(userId: string, fileSize: number): Promise<{ allowed: boolean; reason?: string }> {
    let quota = this.userQuotas.get(userId);

    if (!quota) {
      // Initialize new user with free plan
      quota = {
        userId,
        plan: 'free',
        limits: {
          totalStorage: 1024 * 1024 * 1024, // 1GB
          maxFileSize: 100 * 1024 * 1024, // 100MB
          maxFileDuration: 600, // 10 minutes
          maxConcurrentProcessing: 1,
          maxSharedFiles: 5
        },
        usage: {
          usedStorage: 0,
          fileCount: 0,
          processingSlots: 0,
          sharedFiles: 0
        }
      };
      this.userQuotas.set(userId, quota);
    }

    // Check file size limit
    if (fileSize > quota.limits.maxFileSize) {
      return { allowed: false, reason: 'File size exceeds limit' };
    }

    // Check total storage limit
    if (quota.usage.usedStorage + fileSize > quota.limits.totalStorage) {
      return { allowed: false, reason: 'Storage quota exceeded' };
    }

    return { allowed: true };
  }

  private async updateUserQuota(userId: string, sizeChange: number): Promise<void> {
    const quota = this.userQuotas.get(userId);
    if (quota) {
      quota.usage.usedStorage += sizeChange;
      quota.usage.fileCount += sizeChange > 0 ? 1 : -1;
      this.userQuotas.set(userId, quota);
    }
  }

  private async checkFileAccess(
    file: MediaFile,
    userId: string,
    permission: 'read' | 'write' | 'comment' | 'download'
  ): Promise<boolean> {
    // Owner has full access
    if (file.userId === userId) {
      return true;
    }

    // Public files
    if (file.sharing.isPublic && file.sharing.permissions.includes(permission)) {
      return true;
    }

    // Shared files
    if (file.sharing.sharedWith.includes(userId) && file.sharing.permissions.includes(permission)) {
      return true;
    }

    return false;
  }

  private async queueFileForProcessing(
    fileId: string,
    operations: ('analysis' | 'separation' | 'enhancement' | 'export')[]
  ): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) return;

    for (const operationType of operations) {
      const operation: ProcessingOperation = {
        id: this.generateOperationId(),
        type: operationType,
        status: 'queued',
        progress: 0,
        parameters: {}
      };

      file.processing.operations.push(operation);
      this.processingQueue.push(operation);
    }

    file.processing.status = 'pending';
    this.files.set(fileId, file);
  }

  private startProcessingWorker(): void {
    // Background worker for processing files
    setInterval(() => {
      this.processNextInQueue();
    }, 1000);
  }

  private async processNextInQueue(): Promise<void> {
    if (this.processingQueue.length === 0 || this.activeProcessing.size >= 10) {
      return;
    }

    const operation = this.processingQueue.shift()!;
    this.activeProcessing.set(operation.id, operation);

    try {
      operation.status = 'processing';
      operation.startedAt = new Date().toISOString();

      // Simulate processing (in production, call actual processing services)
      await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 10000));

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
      operation.progress = 100;

    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.activeProcessing.delete(operation.id);
    }
  }

  private setupCleanupTasks(): void {
    // Clean up expired shares every hour
    setInterval(() => {
      this.cleanupExpiredShares();
    }, 60 * 60 * 1000);

    // Clean up old processing operations every day
    setInterval(() => {
      this.cleanupOldOperations();
    }, 24 * 60 * 60 * 1000);
  }

  private cleanupExpiredShares(): void {
    const now = new Date();

    for (const [fileId, file] of this.files) {
      if (file.sharing.shareExpiry && new Date(file.sharing.shareExpiry) < now) {
        file.sharing.isPublic = false;
        file.sharing.shareToken = undefined;
        file.sharing.shareExpiry = undefined;
        file.updatedAt = new Date().toISOString();
        this.files.set(fileId, file);
      }
    }
  }

  private cleanupOldOperations(): void {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    for (const [fileId, file] of this.files) {
      const oldOperations = file.processing.operations.filter(op =>
        op.completedAt && new Date(op.completedAt) < cutoffDate
      );

      if (oldOperations.length > 0) {
        file.processing.operations = file.processing.operations.filter(op =>
          !oldOperations.includes(op)
        );
        file.updatedAt = new Date().toISOString();
        this.files.set(fileId, file);
      }
    }
  }
}