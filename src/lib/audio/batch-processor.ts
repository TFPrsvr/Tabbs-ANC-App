import { EventEmitter } from 'events';
import { MultiFormatCodec } from './multi-format-codec';
import { ProfessionalMastering } from './professional-mastering';
import { AdvancedNoiseReduction } from './advanced-noise-reduction';

// Core batch processing interfaces
export interface BatchJob {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  progress: number; // 0-100
  files: BatchFile[];
  operations: BatchOperation[];
  settings: BatchSettings;
  results: BatchResult[];
  errors: BatchError[];
}

export interface BatchFile {
  id: string;
  name: string;
  originalPath: string;
  outputPath?: string;
  size: number;
  format: string;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  progress: number;
  startTime?: number;
  endTime?: number;
  metadata?: AudioMetadata;
}

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  track?: number;
  genre?: string;
  duration?: number;
  bitrate?: number;
  format?: string;
  customTags?: Map<string, string>;
}

export interface BatchOperation {
  id: string;
  type: OperationType;
  name: string;
  enabled: boolean;
  order: number;
  parameters: OperationParameters;
  condition?: OperationCondition;
}

export type OperationType =
  | 'format_conversion'
  | 'noise_reduction'
  | 'mastering'
  | 'normalization'
  | 'trimming'
  | 'fade_in_out'
  | 'pitch_shift'
  | 'time_stretch'
  | 'eq_filter'
  | 'compression'
  | 'reverb'
  | 'metadata_edit'
  | 'file_rename'
  | 'quality_analysis';

export interface OperationParameters {
  [key: string]: any;
}

export interface OperationCondition {
  type: 'file_size' | 'duration' | 'format' | 'sample_rate' | 'custom';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  customFunction?: (file: BatchFile) => boolean;
}

export interface BatchSettings {
  outputDirectory: string;
  outputNaming: NamingPattern;
  parallelProcessing: boolean;
  maxConcurrentJobs: number;
  retryFailedFiles: boolean;
  maxRetries: number;
  deleteOriginals: boolean;
  preserveDirectoryStructure: boolean;
  overwriteExisting: boolean;
  qualityCheck: boolean;
  generateReport: boolean;
  notifications: NotificationSettings;
}

export interface NamingPattern {
  pattern: string; // e.g., "{artist} - {title}" or "{original_name}_processed"
  sanitizeNames: boolean;
  maxLength: number;
  replaceSpaces: string;
  caseTransform: 'none' | 'lowercase' | 'uppercase' | 'title';
}

export interface NotificationSettings {
  onJobStart: boolean;
  onJobComplete: boolean;
  onJobFailed: boolean;
  onFileComplete: boolean;
  onError: boolean;
  emailNotifications: boolean;
  emailAddress?: string;
  webhookUrl?: string;
}

export interface BatchResult {
  fileId: string;
  success: boolean;
  outputPath?: string;
  outputSize?: number;
  processingTime: number;
  operations: OperationResult[];
  qualityMetrics?: QualityMetrics;
  warnings: string[];
  errors: string[];
}

export interface OperationResult {
  operationId: string;
  success: boolean;
  processingTime: number;
  parameters: OperationParameters;
  outputData?: any;
  metrics?: any;
  error?: string;
}

export interface QualityMetrics {
  snr: number;
  thd: number;
  dynamicRange: number;
  peakLevel: number;
  rmsLevel: number;
  crestFactor: number;
  spectralCentroid: number;
  spectralFlatness: number;
}

export interface BatchError {
  fileId?: string;
  operationId?: string;
  timestamp: Date;
  level: 'warning' | 'error' | 'fatal';
  message: string;
  details?: any;
  stackTrace?: string;
}

export interface BatchProgress {
  jobId: string;
  overallProgress: number;
  currentFile?: string;
  currentOperation?: string;
  filesCompleted: number;
  totalFiles: number;
  estimatedTimeRemaining?: number;
  processingSpeed?: number; // files per minute
  throughput?: number; // MB per second
}

export interface ProcessingQueue {
  pending: BatchJob[];
  running: BatchJob[];
  completed: BatchJob[];
  failed: BatchJob[];
}

// Main batch processor class
export class BatchAudioProcessor extends EventEmitter {
  private jobs: Map<string, BatchJob> = new Map();
  private queue: ProcessingQueue = {
    pending: [],
    running: [],
    completed: [],
    failed: []
  };
  private isProcessing: boolean = false;
  private workers: Worker[] = [];
  private codec: MultiFormatCodec;
  private mastering: ProfessionalMastering;
  private noiseReduction: AdvancedNoiseReduction;
  private maxConcurrentJobs: number = 4;

  constructor() {
    super();
    this.codec = new MultiFormatCodec();
    this.mastering = new ProfessionalMastering();
    this.noiseReduction = new AdvancedNoiseReduction();
    this.setupWorkers();
  }

  // Job management
  public createJob(
    name: string,
    files: string[],
    operations: Omit<BatchOperation, 'id'>[],
    settings: Partial<BatchSettings> = {}
  ): BatchJob {

    const job: BatchJob = {
      id: this.generateId(),
      name,
      createdAt: new Date(),
      status: 'pending',
      priority: 'normal',
      progress: 0,
      files: files.map((filePath, index) => ({
        id: this.generateId(),
        name: this.extractFileName(filePath),
        originalPath: filePath,
        size: 0, // Will be populated when file is analyzed
        format: this.extractFileExtension(filePath),
        status: 'pending',
        progress: 0
      })),
      operations: operations.map((op, index) => ({
        id: this.generateId(),
        order: index,
        ...op
      })),
      settings: {
        outputDirectory: './output',
        outputNaming: {
          pattern: '{original_name}_processed',
          sanitizeNames: true,
          maxLength: 255,
          replaceSpaces: '_',
          caseTransform: 'none'
        },
        parallelProcessing: true,
        maxConcurrentJobs: 4,
        retryFailedFiles: true,
        maxRetries: 3,
        deleteOriginals: false,
        preserveDirectoryStructure: false,
        overwriteExisting: false,
        qualityCheck: true,
        generateReport: true,
        notifications: {
          onJobStart: true,
          onJobComplete: true,
          onJobFailed: true,
          onFileComplete: false,
          onError: true,
          emailNotifications: false
        },
        ...settings
      },
      results: [],
      errors: []
    };

    this.jobs.set(job.id, job);
    this.queue.pending.push(job);

    this.emit('jobCreated', job);
    return job;
  }

  public async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Job ${jobId} is not in pending state`);
    }

    job.status = 'running';
    job.startedAt = new Date();

    // Move job from pending to running queue
    this.queue.pending = this.queue.pending.filter(j => j.id !== jobId);
    this.queue.running.push(job);

    this.emit('jobStarted', job);

    if (job.settings.notifications.onJobStart) {
      this.sendNotification('job_started', job);
    }

    try {
      await this.processJob(job);
    } catch (error) {
      await this.handleJobError(job, error);
    }
  }

  public pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'running') {
      throw new Error(`Cannot pause job ${jobId}`);
    }

    job.status = 'paused';
    this.emit('jobPaused', job);
  }

  public resumeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'paused') {
      throw new Error(`Cannot resume job ${jobId}`);
    }

    job.status = 'running';
    this.emit('jobResumed', job);
  }

  public cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'running') {
      job.status = 'cancelled';
      this.queue.running = this.queue.running.filter(j => j.id !== jobId);
      this.emit('jobCancelled', job);
    } else if (job.status === 'pending') {
      job.status = 'cancelled';
      this.queue.pending = this.queue.pending.filter(j => j.id !== jobId);
      this.emit('jobCancelled', job);
    }
  }

  public deleteJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'running') {
      throw new Error(`Cannot delete running job ${jobId}`);
    }

    this.jobs.delete(jobId);
    this.removeJobFromQueue(job);
    this.emit('jobDeleted', jobId);
  }

  // Queue management
  public async startProcessing(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.emit('processingStarted');

    while (this.queue.pending.length > 0 && this.isProcessing) {
      const availableWorkers = this.maxConcurrentJobs - this.queue.running.length;

      for (let i = 0; i < Math.min(availableWorkers, this.queue.pending.length); i++) {
        const job = this.queue.pending[0];
        if (job) {
          await this.startJob(job.id);
        }
      }

      // Wait before checking again
      await this.sleep(1000);
    }
  }

  public stopProcessing(): void {
    this.isProcessing = false;

    // Pause all running jobs
    for (const job of this.queue.running) {
      this.pauseJob(job.id);
    }

    this.emit('processingStopped');
  }

  // File analysis
  public async analyzeFiles(job: BatchJob): Promise<void> {
    this.emit('analysisStarted', job);

    for (const file of job.files) {
      try {
        const fileInfo = await this.analyzeFile(file.originalPath);
        file.size = fileInfo.size;
        file.duration = fileInfo.duration;
        file.sampleRate = fileInfo.sampleRate;
        file.channels = fileInfo.channels;
        file.bitDepth = fileInfo.bitDepth;
        file.metadata = fileInfo.metadata;
      } catch (error) {
        this.addJobError(job, {
          fileId: file.id,
          timestamp: new Date(),
          level: 'error',
          message: `Failed to analyze file: ${file.originalPath}`,
          details: error
        });
      }
    }

    this.emit('analysisCompleted', job);
  }

  private async analyzeFile(filePath: string): Promise<{
    size: number;
    duration: number;
    sampleRate: number;
    channels: number;
    bitDepth: number;
    metadata: AudioMetadata;
  }> {
    // Simplified file analysis - in real implementation would use actual file reading
    return {
      size: 1024 * 1024, // 1MB placeholder
      duration: 180, // 3 minutes placeholder
      sampleRate: 44100,
      channels: 2,
      bitDepth: 16,
      metadata: {
        title: this.extractFileName(filePath),
        format: this.extractFileExtension(filePath)
      }
    };
  }

  // Core processing logic
  private async processJob(job: BatchJob): Promise<void> {
    try {
      await this.analyzeFiles(job);

      const enabledOperations = job.operations
        .filter(op => op.enabled)
        .sort((a, b) => a.order - b.order);

      let completedFiles = 0;

      for (const file of job.files) {
        if (job.status === 'cancelled' || job.status === 'paused') {
          break;
        }

        await this.processFile(job, file, enabledOperations);
        completedFiles++;

        job.progress = (completedFiles / job.files.length) * 100;
        this.emit('jobProgress', this.createProgressUpdate(job));
      }

      if (job.status === 'running') {
        await this.completeJob(job);
      }

    } catch (error) {
      await this.handleJobError(job, error);
    }
  }

  private async processFile(
    job: BatchJob,
    file: BatchFile,
    operations: BatchOperation[]
  ): Promise<void> {

    file.status = 'processing';
    file.startTime = performance.now();

    this.emit('fileProcessingStarted', { job, file });

    try {
      // Load audio file
      let audioData = await this.loadAudioFile(file.originalPath);
      let sampleRate = file.sampleRate || 44100;

      const operationResults: OperationResult[] = [];

      // Apply operations in sequence
      for (const operation of operations) {
        if (this.shouldSkipOperation(operation, file)) {
          continue;
        }

        const operationStartTime = performance.now();

        try {
          const result = await this.executeOperation(
            operation,
            audioData,
            sampleRate,
            file
          );

          if (result.audioData) {
            audioData = result.audioData;
          }

          operationResults.push({
            operationId: operation.id,
            success: true,
            processingTime: performance.now() - operationStartTime,
            parameters: operation.parameters,
            outputData: result.outputData,
            metrics: result.metrics
          });

          file.progress = (operationResults.length / operations.length) * 100;

        } catch (error) {
          operationResults.push({
            operationId: operation.id,
            success: false,
            processingTime: performance.now() - operationStartTime,
            parameters: operation.parameters,
            error: error instanceof Error ? error.message : String(error)
          });

          if (operation.type === 'format_conversion') {
            // Format conversion failure is critical
            throw error;
          }
        }
      }

      // Save processed audio
      const outputPath = await this.saveProcessedAudio(
        audioData,
        file,
        job.settings
      );

      file.outputPath = outputPath;
      file.status = 'completed';
      file.endTime = performance.now();

      // Generate quality metrics if enabled
      let qualityMetrics: QualityMetrics | undefined;
      if (job.settings.qualityCheck) {
        qualityMetrics = this.calculateQualityMetrics(audioData);
      }

      const result: BatchResult = {
        fileId: file.id,
        success: true,
        outputPath,
        outputSize: await this.getFileSize(outputPath),
        processingTime: file.endTime - (file.startTime || 0),
        operations: operationResults,
        qualityMetrics,
        warnings: [],
        errors: []
      };

      job.results.push(result);

      this.emit('fileProcessingCompleted', { job, file, result });

      if (job.settings.notifications.onFileComplete) {
        this.sendNotification('file_completed', { job, file, result });
      }

    } catch (error) {
      file.status = 'failed';
      file.endTime = performance.now();

      const errorResult: BatchResult = {
        fileId: file.id,
        success: false,
        processingTime: file.endTime - (file.startTime || 0),
        operations: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };

      job.results.push(errorResult);

      this.addJobError(job, {
        fileId: file.id,
        timestamp: new Date(),
        level: 'error',
        message: `Failed to process file: ${file.name}`,
        details: error
      });

      this.emit('fileProcessingFailed', { job, file, error });
    }
  }

  private async executeOperation(
    operation: BatchOperation,
    audioData: Float32Array[],
    sampleRate: number,
    file: BatchFile
  ): Promise<{
    audioData?: Float32Array[];
    outputData?: any;
    metrics?: any;
  }> {

    switch (operation.type) {
      case 'noise_reduction':
        return this.executeNoiseReduction(operation, audioData, sampleRate);

      case 'mastering':
        return this.executeMastering(operation, audioData, sampleRate);

      case 'format_conversion':
        return this.executeFormatConversion(operation, audioData, sampleRate, file);

      case 'normalization':
        return this.executeNormalization(operation, audioData);

      case 'trimming':
        return this.executeTrimming(operation, audioData, sampleRate);

      case 'fade_in_out':
        return this.executeFadeInOut(operation, audioData, sampleRate);

      case 'eq_filter':
        return this.executeEQFilter(operation, audioData, sampleRate);

      case 'compression':
        return this.executeCompression(operation, audioData, sampleRate);

      case 'metadata_edit':
        return this.executeMetadataEdit(operation, file);

      case 'quality_analysis':
        return this.executeQualityAnalysis(operation, audioData);

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async executeNoiseReduction(
    operation: BatchOperation,
    audioData: Float32Array[],
    sampleRate: number
  ): Promise<{ audioData: Float32Array[] }> {

    const config = {
      algorithm: operation.parameters.algorithm || 'spectral_subtraction',
      strength: operation.parameters.strength || 0.5,
      preserveCharacter: operation.parameters.preserveCharacter || true,
      ...operation.parameters
    };

    const result = await this.noiseReduction.processAudio(audioData, config);
    return { audioData: result.processedAudio };
  }

  private async executeMastering(
    operation: BatchOperation,
    audioData: Float32Array[],
    sampleRate: number
  ): Promise<{ audioData: Float32Array[] }> {

    const config = {
      targetLUFS: operation.parameters.targetLUFS || -14,
      truePeakLimit: operation.parameters.truePeakLimit || -1,
      dynamicRange: operation.parameters.dynamicRange || 12,
      ...operation.parameters
    };

    const result = await this.mastering.processAudio(audioData, config);
    return { audioData: result.processedAudio };
  }

  private async executeFormatConversion(
    operation: BatchOperation,
    audioData: Float32Array[],
    sampleRate: number,
    file: BatchFile
  ): Promise<{ outputData: any }> {

    const targetFormat = {
      container: operation.parameters.format || 'wav',
      sampleRate: operation.parameters.sampleRate || sampleRate,
      bitDepth: operation.parameters.bitDepth || 16,
      channels: audioData.length,
      ...operation.parameters.formatOptions
    };

    // This would encode the audio data to the target format
    return { outputData: { format: targetFormat } };
  }

  private async executeNormalization(
    operation: BatchOperation,
    audioData: Float32Array[]
  ): Promise<{ audioData: Float32Array[] }> {

    const targetLevel = operation.parameters.targetLevel || 0.95;
    const normalized = audioData.map(channel => {
      const peak = Math.max(...channel.map(Math.abs));
      const gain = peak > 0 ? targetLevel / peak : 1;
      return channel.map(sample => sample * gain);
    });

    return { audioData: normalized };
  }

  private async executeTrimming(
    operation: BatchOperation,
    audioData: Float32Array[],
    sampleRate: number
  ): Promise<{ audioData: Float32Array[] }> {

    const startTime = operation.parameters.startTime || 0;
    const endTime = operation.parameters.endTime || audioData[0]!.length / sampleRate;

    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);

    const trimmed = audioData.map(channel =>
      channel.slice(startSample, endSample)
    );

    return { audioData: trimmed };
  }

  private async executeFadeInOut(
    operation: BatchOperation,
    audioData: Float32Array[],
    sampleRate: number
  ): Promise<{ audioData: Float32Array[] }> {

    const fadeInDuration = operation.parameters.fadeInDuration || 0;
    const fadeOutDuration = operation.parameters.fadeOutDuration || 0;

    const fadeInSamples = Math.floor(fadeInDuration * sampleRate);
    const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate);

    const processed = audioData.map(channel => {
      const result = new Float32Array(channel);

      // Fade in
      for (let i = 0; i < Math.min(fadeInSamples, result.length); i++) {
        const gain = i / fadeInSamples;
        result[i] *= gain;
      }

      // Fade out
      const startFadeOut = Math.max(0, result.length - fadeOutSamples);
      for (let i = startFadeOut; i < result.length; i++) {
        const gain = (result.length - i) / fadeOutSamples;
        result[i] *= gain;
      }

      return result;
    });

    return { audioData: processed };
  }

  private async executeEQFilter(
    operation: BatchOperation,
    audioData: Float32Array[],
    sampleRate: number
  ): Promise<{ audioData: Float32Array[] }> {

    // Simplified EQ implementation
    // In real implementation, would use proper biquad filters
    return { audioData };
  }

  private async executeCompression(
    operation: BatchOperation,
    audioData: Float32Array[],
    sampleRate: number
  ): Promise<{ audioData: Float32Array[] }> {

    const threshold = operation.parameters.threshold || -20;
    const ratio = operation.parameters.ratio || 4;
    const attack = operation.parameters.attack || 0.003;
    const release = operation.parameters.release || 0.1;

    // Simplified compression implementation
    // In real implementation, would use proper dynamics processing
    return { audioData };
  }

  private async executeMetadataEdit(
    operation: BatchOperation,
    file: BatchFile
  ): Promise<{ outputData: any }> {

    const newMetadata = {
      ...file.metadata,
      ...operation.parameters
    };

    file.metadata = newMetadata;
    return { outputData: newMetadata };
  }

  private async executeQualityAnalysis(
    operation: BatchOperation,
    audioData: Float32Array[]
  ): Promise<{ metrics: QualityMetrics }> {

    const metrics = this.calculateQualityMetrics(audioData);
    return { metrics };
  }

  // Utility methods
  private shouldSkipOperation(operation: BatchOperation, file: BatchFile): boolean {
    if (!operation.condition) return false;

    const condition = operation.condition;

    switch (condition.type) {
      case 'file_size':
        return !this.evaluateCondition(file.size, condition.operator, condition.value);
      case 'duration':
        return !this.evaluateCondition(file.duration || 0, condition.operator, condition.value);
      case 'format':
        return !this.evaluateCondition(file.format, condition.operator, condition.value);
      case 'sample_rate':
        return !this.evaluateCondition(file.sampleRate || 0, condition.operator, condition.value);
      case 'custom':
        return condition.customFunction ? !condition.customFunction(file) : false;
      default:
        return false;
    }
  }

  private evaluateCondition(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals': return actual === expected;
      case 'not_equals': return actual !== expected;
      case 'greater_than': return actual > expected;
      case 'less_than': return actual < expected;
      case 'contains': return String(actual).includes(String(expected));
      default: return true;
    }
  }

  private async loadAudioFile(filePath: string): Promise<Float32Array[]> {
    // Simplified audio loading - would use actual file reading
    return [new Float32Array(44100 * 2), new Float32Array(44100 * 2)]; // 2 seconds stereo
  }

  private async saveProcessedAudio(
    audioData: Float32Array[],
    file: BatchFile,
    settings: BatchSettings
  ): Promise<string> {

    const outputName = this.generateOutputFileName(file, settings.outputNaming);
    const outputPath = `${settings.outputDirectory}/${outputName}`;

    // In real implementation, would save actual audio file
    return outputPath;
  }

  private generateOutputFileName(file: BatchFile, naming: NamingPattern): string {
    let fileName = naming.pattern;

    // Replace placeholders
    fileName = fileName.replace('{original_name}', this.getFileNameWithoutExtension(file.name));
    fileName = fileName.replace('{artist}', file.metadata?.artist || 'Unknown');
    fileName = fileName.replace('{title}', file.metadata?.title || file.name);
    fileName = fileName.replace('{album}', file.metadata?.album || 'Unknown');

    // Apply transformations
    if (naming.caseTransform !== 'none') {
      switch (naming.caseTransform) {
        case 'lowercase': fileName = fileName.toLowerCase(); break;
        case 'uppercase': fileName = fileName.toUpperCase(); break;
        case 'title': fileName = this.toTitleCase(fileName); break;
      }
    }

    if (naming.replaceSpaces) {
      fileName = fileName.replace(/\s+/g, naming.replaceSpaces);
    }

    if (naming.sanitizeNames) {
      fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
    }

    if (fileName.length > naming.maxLength) {
      fileName = fileName.substring(0, naming.maxLength);
    }

    return fileName + '.' + file.format;
  }

  private calculateQualityMetrics(audioData: Float32Array[]): QualityMetrics {
    // Calculate basic quality metrics
    let peak = 0;
    let rmsSum = 0;
    let sampleCount = 0;

    for (const channel of audioData) {
      for (const sample of channel) {
        peak = Math.max(peak, Math.abs(sample));
        rmsSum += sample * sample;
        sampleCount++;
      }
    }

    const rmsLevel = Math.sqrt(rmsSum / sampleCount);
    const peakLevel = 20 * Math.log10(peak);
    const rmsLevelDb = 20 * Math.log10(rmsLevel);
    const crestFactor = peak > 0 ? 20 * Math.log10(peak / rmsLevel) : 0;

    return {
      snr: 60, // Placeholder
      thd: 0.001, // Placeholder
      dynamicRange: Math.abs(peakLevel - rmsLevelDb),
      peakLevel,
      rmsLevel: rmsLevelDb,
      crestFactor,
      spectralCentroid: 1000, // Placeholder
      spectralFlatness: 0.5 // Placeholder
    };
  }

  private async completeJob(job: BatchJob): Promise<void> {
    job.status = 'completed';
    job.completedAt = new Date();
    job.progress = 100;

    // Move job from running to completed queue
    this.queue.running = this.queue.running.filter(j => j.id !== job.id);
    this.queue.completed.push(job);

    // Generate report if enabled
    if (job.settings.generateReport) {
      await this.generateJobReport(job);
    }

    this.emit('jobCompleted', job);

    if (job.settings.notifications.onJobComplete) {
      this.sendNotification('job_completed', job);
    }
  }

  private async handleJobError(job: BatchJob, error: any): Promise<void> {
    job.status = 'failed';
    job.completedAt = new Date();

    this.queue.running = this.queue.running.filter(j => j.id !== job.id);
    this.queue.failed.push(job);

    this.addJobError(job, {
      timestamp: new Date(),
      level: 'fatal',
      message: 'Job failed',
      details: error,
      stackTrace: error instanceof Error ? error.stack : undefined
    });

    this.emit('jobFailed', { job, error });

    if (job.settings.notifications.onJobFailed) {
      this.sendNotification('job_failed', { job, error });
    }
  }

  private addJobError(job: BatchJob, error: BatchError): void {
    job.errors.push(error);
    this.emit('jobError', { job, error });

    if (job.settings.notifications.onError) {
      this.sendNotification('error', { job, error });
    }
  }

  private createProgressUpdate(job: BatchJob): BatchProgress {
    const completedFiles = job.files.filter(f => f.status === 'completed').length;
    const currentFile = job.files.find(f => f.status === 'processing');

    return {
      jobId: job.id,
      overallProgress: job.progress,
      currentFile: currentFile?.name,
      filesCompleted: completedFiles,
      totalFiles: job.files.length,
      estimatedTimeRemaining: this.estimateRemainingTime(job),
      processingSpeed: this.calculateProcessingSpeed(job),
      throughput: this.calculateThroughput(job)
    };
  }

  private estimateRemainingTime(job: BatchJob): number {
    const completedFiles = job.files.filter(f => f.status === 'completed');
    if (completedFiles.length === 0) return 0;

    const averageTime = completedFiles.reduce((sum, file) => {
      return sum + ((file.endTime || 0) - (file.startTime || 0));
    }, 0) / completedFiles.length;

    const remainingFiles = job.files.length - completedFiles.length;
    return (remainingFiles * averageTime) / 1000; // Convert to seconds
  }

  private calculateProcessingSpeed(job: BatchJob): number {
    const completedFiles = job.files.filter(f => f.status === 'completed');
    if (completedFiles.length === 0 || !job.startedAt) return 0;

    const elapsedMinutes = (Date.now() - job.startedAt.getTime()) / (1000 * 60);
    return completedFiles.length / elapsedMinutes;
  }

  private calculateThroughput(job: BatchJob): number {
    const completedFiles = job.files.filter(f => f.status === 'completed');
    if (completedFiles.length === 0 || !job.startedAt) return 0;

    const totalBytes = completedFiles.reduce((sum, file) => sum + file.size, 0);
    const elapsedSeconds = (Date.now() - job.startedAt.getTime()) / 1000;
    return totalBytes / (1024 * 1024) / elapsedSeconds; // MB/s
  }

  private async generateJobReport(job: BatchJob): Promise<void> {
    const report = {
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        duration: job.completedAt && job.startedAt ?
          job.completedAt.getTime() - job.startedAt.getTime() : 0
      },
      files: {
        total: job.files.length,
        completed: job.files.filter(f => f.status === 'completed').length,
        failed: job.files.filter(f => f.status === 'failed').length,
        skipped: job.files.filter(f => f.status === 'skipped').length
      },
      operations: job.operations.map(op => ({
        name: op.name,
        type: op.type,
        enabled: op.enabled
      })),
      results: job.results,
      errors: job.errors,
      summary: {
        successRate: (job.results.filter(r => r.success).length / job.results.length) * 100,
        totalProcessingTime: job.results.reduce((sum, r) => sum + r.processingTime, 0),
        averageProcessingTime: job.results.length > 0 ?
          job.results.reduce((sum, r) => sum + r.processingTime, 0) / job.results.length : 0
      }
    };

    // In real implementation, would save report to file or database
    this.emit('reportGenerated', { job, report });
  }

  private sendNotification(type: string, data: any): void {
    // In real implementation, would send actual notifications
    this.emit('notification', { type, data });
  }

  private removeJobFromQueue(job: BatchJob): void {
    this.queue.pending = this.queue.pending.filter(j => j.id !== job.id);
    this.queue.running = this.queue.running.filter(j => j.id !== job.id);
    this.queue.completed = this.queue.completed.filter(j => j.id !== job.id);
    this.queue.failed = this.queue.failed.filter(j => j.id !== job.id);
  }

  private setupWorkers(): void {
    // In real implementation, would setup Web Workers for parallel processing
  }

  private async getFileSize(filePath: string): Promise<number> {
    // Simplified file size calculation
    return 1024 * 1024; // 1MB placeholder
  }

  private extractFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
  }

  private extractFileExtension(filePath: string): string {
    const fileName = this.extractFileName(filePath);
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot + 1) : '';
  }

  private getFileNameWithoutExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
  }

  private toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  public getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  public getQueue(): ProcessingQueue {
    return { ...this.queue };
  }

  public getJobProgress(jobId: string): BatchProgress | null {
    const job = this.jobs.get(jobId);
    return job ? this.createProgressUpdate(job) : null;
  }

  public setMaxConcurrentJobs(max: number): void {
    this.maxConcurrentJobs = Math.max(1, Math.min(max, 16));
  }

  public getProcessingStats(): {
    totalJobs: number;
    pendingJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    isProcessing: boolean;
  } {
    return {
      totalJobs: this.jobs.size,
      pendingJobs: this.queue.pending.length,
      runningJobs: this.queue.running.length,
      completedJobs: this.queue.completed.length,
      failedJobs: this.queue.failed.length,
      isProcessing: this.isProcessing
    };
  }

  public destroy(): void {
    this.stopProcessing();
    this.workers.forEach(worker => worker.terminate());
    this.jobs.clear();
    this.removeAllListeners();
  }
}

// Predefined operation templates
export const OperationTemplates = {
  PODCAST_PROCESSING: [
    {
      type: 'noise_reduction' as const,
      name: 'Remove Background Noise',
      enabled: true,
      parameters: {
        algorithm: 'spectral_subtraction',
        strength: 0.7,
        preserveCharacter: true
      }
    },
    {
      type: 'normalization' as const,
      name: 'Normalize Audio',
      enabled: true,
      parameters: {
        targetLevel: 0.85
      }
    },
    {
      type: 'compression' as const,
      name: 'Dynamic Range Compression',
      enabled: true,
      parameters: {
        threshold: -18,
        ratio: 3,
        attack: 0.003,
        release: 0.1
      }
    }
  ],

  MUSIC_MASTERING: [
    {
      type: 'eq_filter' as const,
      name: 'EQ Enhancement',
      enabled: true,
      parameters: {
        lowShelf: { frequency: 80, gain: 1, q: 0.7 },
        highShelf: { frequency: 10000, gain: 2, q: 0.7 }
      }
    },
    {
      type: 'mastering' as const,
      name: 'Professional Mastering',
      enabled: true,
      parameters: {
        targetLUFS: -14,
        truePeakLimit: -1,
        dynamicRange: 12
      }
    },
    {
      type: 'quality_analysis' as const,
      name: 'Quality Check',
      enabled: true,
      parameters: {}
    }
  ],

  FORMAT_CONVERSION: [
    {
      type: 'format_conversion' as const,
      name: 'Convert Format',
      enabled: true,
      parameters: {
        format: 'mp3',
        bitrate: 320,
        sampleRate: 44100,
        bitDepth: 16
      }
    }
  ]
};