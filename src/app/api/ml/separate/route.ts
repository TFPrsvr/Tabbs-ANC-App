/**
 * ML Audio Separation API Endpoint
 * Handles server-side ML model processing for audio separation
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

interface SeparationConfig {
  modelType: 'spleeter' | 'demucs' | 'open-unmix';
  quality: 'basic' | 'standard' | 'professional' | 'studio';
  stemTypes: string[];
  useGpu?: boolean;
  modelVersion?: string;
}

interface ProcessingResult {
  stems: Array<{
    id: string;
    name: string;
    type: string;
    audioData: string; // base64 encoded
    originalMix: number;
    confidence: number;
    spectralProfile: number[];
    harmonicContent: number;
    rhythmicContent: number;
  }>;
  metadata?: {
    genre?: string;
    key?: string;
    tempo?: number;
    modelInfo?: {
      name: string;
      version: string;
    };
  };
  processingTime: number;
}

const TEMP_DIR = join(process.cwd(), 'temp', 'ml-processing');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SUPPORTED_FORMATS = ['.wav', '.mp3', '.flac', '.ogg', '.m4a'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Ensure temp directory exists
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const configStr = formData.get('config') as string;

    if (!audioFile || !configStr) {
      return NextResponse.json(
        { error: 'Missing audio file or configuration' },
        { status: 400 }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    // Parse configuration
    let config: SeparationConfig;
    try {
      config = JSON.parse(configStr);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid configuration format' },
        { status: 400 }
      );
    }

    // Validate configuration
    const validationError = validateConfig(config);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Generate unique processing ID
    const processingId = `ml_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const inputPath = join(TEMP_DIR, `${processingId}_input.wav`);
    const outputDir = join(TEMP_DIR, `${processingId}_output`);

    try {
      // Save uploaded file
      const audioBuffer = await audioFile.arrayBuffer();
      await writeFile(inputPath, Buffer.from(audioBuffer));

      // Create output directory
      await mkdir(outputDir, { recursive: true });

      // Process with selected ML model
      const result = await processWithMLModel(inputPath, outputDir, config, processingId);

      // Calculate total processing time
      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;

      return NextResponse.json(result);

    } finally {
      // Cleanup temporary files
      await cleanupFiles(inputPath, outputDir);
    }

  } catch (error) {
    console.error('ML processing error:', error);

    return NextResponse.json(
      {
        error: 'Internal processing error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Process audio with the selected ML model
 */
async function processWithMLModel(
  inputPath: string,
  outputDir: string,
  config: SeparationConfig,
  processingId: string
): Promise<ProcessingResult> {
  switch (config.modelType) {
    case 'spleeter':
      return await processSpleeter(inputPath, outputDir, config);
    case 'demucs':
      return await processDemucs(inputPath, outputDir, config);
    case 'open-unmix':
      return await processOpenUnmix(inputPath, outputDir, config);
    default:
      throw new Error(`Unsupported model type: ${config.modelType}`);
  }
}

/**
 * Process with Spleeter
 */
async function processSpleeter(
  inputPath: string,
  outputDir: string,
  config: SeparationConfig
): Promise<ProcessingResult> {
  try {
    // Determine Spleeter configuration based on stem types
    const modelConfig = getSpleeterModelConfig(config.stemTypes);
    const gpuFlag = config.useGpu ? '' : '-d cpu';

    // Execute Spleeter
    const command = `spleeter separate -p ${modelConfig} ${gpuFlag} -o "${outputDir}" "${inputPath}"`;
    console.log(`Executing Spleeter: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minutes timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    if (stderr && !stderr.includes('WARNING')) {
      console.error('Spleeter stderr:', stderr);
    }

    // Process output files
    const stems = await processSpleeterOutput(outputDir, config.stemTypes);

    return {
      stems,
      metadata: {
        modelInfo: {
          name: 'Spleeter',
          version: '2.3.0'
        }
      },
      processingTime: 0 // Will be set by caller
    };

  } catch (error) {
    console.error('Spleeter processing failed:', error);
    throw new Error(`Spleeter failed: ${error.message}`);
  }
}

/**
 * Process with Demucs
 */
async function processDemucs(
  inputPath: string,
  outputDir: string,
  config: SeparationConfig
): Promise<ProcessingResult> {
  try {
    // Determine Demucs model based on quality
    const modelName = getDemucsModelName(config.quality);
    const deviceFlag = config.useGpu ? '--device cuda' : '--device cpu';

    // Execute Demucs
    const command = `python -m demucs.separate --two-stems=vocals --out "${outputDir}" ${deviceFlag} -n ${modelName} "${inputPath}"`;
    console.log(`Executing Demucs: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 600000, // 10 minutes timeout for Demucs
      maxBuffer: 2 * 1024 * 1024 // 2MB buffer
    });

    if (stderr) {
      console.error('Demucs stderr:', stderr);
    }

    // Process output files
    const stems = await processDemucsOutput(outputDir, config.stemTypes, modelName);

    return {
      stems,
      metadata: {
        modelInfo: {
          name: 'Demucs',
          version: '4.0.0'
        }
      },
      processingTime: 0
    };

  } catch (error) {
    console.error('Demucs processing failed:', error);
    throw new Error(`Demucs failed: ${error.message}`);
  }
}

/**
 * Process with Open-Unmix
 */
async function processOpenUnmix(
  inputPath: string,
  outputDir: string,
  config: SeparationConfig
): Promise<ProcessingResult> {
  try {
    const deviceFlag = config.useGpu ? '--device cuda' : '--device cpu';

    // Execute Open-Unmix
    const command = `python -m openunmix separate "${inputPath}" --outdir "${outputDir}" ${deviceFlag}`;
    console.log(`Executing Open-Unmix: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minutes timeout
      maxBuffer: 1024 * 1024
    });

    if (stderr) {
      console.error('Open-Unmix stderr:', stderr);
    }

    // Process output files
    const stems = await processOpenUnmixOutput(outputDir, config.stemTypes);

    return {
      stems,
      metadata: {
        modelInfo: {
          name: 'Open-Unmix',
          version: '1.2.0'
        }
      },
      processingTime: 0
    };

  } catch (error) {
    console.error('Open-Unmix processing failed:', error);
    throw new Error(`Open-Unmix failed: ${error.message}`);
  }
}

/**
 * Get Spleeter model configuration based on stem types
 */
function getSpleeterModelConfig(stemTypes: string[]): string {
  if (stemTypes.includes('vocals') && stemTypes.includes('drums') && stemTypes.includes('bass')) {
    return 'spleeter:4stems-16kHz';
  } else if (stemTypes.includes('vocals')) {
    return 'spleeter:2stems-16kHz';
  } else {
    return 'spleeter:5stems-16kHz';
  }
}

/**
 * Get Demucs model name based on quality
 */
function getDemucsModelName(quality: string): string {
  switch (quality) {
    case 'studio':
      return 'htdemucs_ft';
    case 'professional':
      return 'htdemucs';
    case 'standard':
      return 'htdemucs_v4';
    default:
      return 'htdemucs_v4';
  }
}

/**
 * Process Spleeter output files
 */
async function processSpleeterOutput(outputDir: string, stemTypes: string[]): Promise<any[]> {
  const stems = [];

  for (const stemType of stemTypes) {
    const stemPath = join(outputDir, 'audio', `${stemType}.wav`);

    if (existsSync(stemPath)) {
      const audioBuffer = await readFile(stemPath);
      const base64Audio = audioBuffer.toString('base64');

      stems.push({
        id: stemType,
        name: getStemDisplayName(stemType),
        type: stemType,
        audioData: base64Audio,
        originalMix: estimateOriginalMix(stemType),
        confidence: estimateConfidence(stemType, 'spleeter'),
        spectralProfile: generatePlaceholderProfile(),
        harmonicContent: estimateHarmonicContent(stemType),
        rhythmicContent: estimateRhythmicContent(stemType)
      });
    }
  }

  return stems;
}

/**
 * Process Demucs output files
 */
async function processDemucsOutput(outputDir: string, stemTypes: string[], modelName: string): Promise<any[]> {
  const stems = [];

  // Demucs creates a subdirectory with the model name
  const demucsOutputDir = join(outputDir, modelName, 'audio');

  for (const stemType of stemTypes) {
    const stemPath = join(demucsOutputDir, `${stemType}.wav`);

    if (existsSync(stemPath)) {
      const audioBuffer = await readFile(stemPath);
      const base64Audio = audioBuffer.toString('base64');

      stems.push({
        id: stemType,
        name: getStemDisplayName(stemType),
        type: stemType,
        audioData: base64Audio,
        originalMix: estimateOriginalMix(stemType),
        confidence: estimateConfidence(stemType, 'demucs'),
        spectralProfile: generatePlaceholderProfile(),
        harmonicContent: estimateHarmonicContent(stemType),
        rhythmicContent: estimateRhythmicContent(stemType)
      });
    }
  }

  return stems;
}

/**
 * Process Open-Unmix output files
 */
async function processOpenUnmixOutput(outputDir: string, stemTypes: string[]): Promise<any[]> {
  const stems = [];

  for (const stemType of stemTypes) {
    const stemPath = join(outputDir, `${stemType}.wav`);

    if (existsSync(stemPath)) {
      const audioBuffer = await readFile(stemPath);
      const base64Audio = audioBuffer.toString('base64');

      stems.push({
        id: stemType,
        name: getStemDisplayName(stemType),
        type: stemType,
        audioData: base64Audio,
        originalMix: estimateOriginalMix(stemType),
        confidence: estimateConfidence(stemType, 'open-unmix'),
        spectralProfile: generatePlaceholderProfile(),
        harmonicContent: estimateHarmonicContent(stemType),
        rhythmicContent: estimateRhythmicContent(stemType)
      });
    }
  }

  return stems;
}

/**
 * Validate configuration
 */
function validateConfig(config: SeparationConfig): string | null {
  if (!config.modelType || !['spleeter', 'demucs', 'open-unmix'].includes(config.modelType)) {
    return 'Invalid or missing modelType';
  }

  if (!config.quality || !['basic', 'standard', 'professional', 'studio'].includes(config.quality)) {
    return 'Invalid or missing quality setting';
  }

  if (!config.stemTypes || !Array.isArray(config.stemTypes) || config.stemTypes.length === 0) {
    return 'Invalid or missing stemTypes';
  }

  const validStemTypes = ['vocals', 'drums', 'bass', 'piano', 'guitar', 'strings', 'brass', 'other'];
  for (const stemType of config.stemTypes) {
    if (!validStemTypes.includes(stemType)) {
      return `Invalid stem type: ${stemType}`;
    }
  }

  return null;
}

/**
 * Cleanup temporary files
 */
async function cleanupFiles(inputPath: string, outputDir: string): Promise<void> {
  try {
    if (existsSync(inputPath)) {
      await unlink(inputPath);
    }

    if (existsSync(outputDir)) {
      // Remove output directory recursively
      const { exec } = require('child_process');
      await promisify(exec)(`rm -rf "${outputDir}"`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Helper functions
function getStemDisplayName(stemType: string): string {
  const names: Record<string, string> = {
    'vocals': 'Vocals',
    'drums': 'Drums',
    'bass': 'Bass',
    'piano': 'Piano',
    'guitar': 'Guitar',
    'strings': 'Strings',
    'brass': 'Brass',
    'other': 'Other Instruments'
  };
  return names[stemType] || stemType;
}

function estimateOriginalMix(stemType: string): number {
  const mixValues: Record<string, number> = {
    'vocals': 0.7,
    'drums': 0.6,
    'bass': 0.5,
    'piano': 0.4,
    'guitar': 0.4,
    'strings': 0.3,
    'brass': 0.3,
    'other': 0.4
  };
  return mixValues[stemType] || 0.5;
}

function estimateConfidence(stemType: string, modelType: string): number {
  const confidenceMap: Record<string, Record<string, number>> = {
    'spleeter': {
      'vocals': 0.85,
      'drums': 0.9,
      'bass': 0.8,
      'other': 0.75
    },
    'demucs': {
      'vocals': 0.9,
      'drums': 0.88,
      'bass': 0.85,
      'other': 0.8
    },
    'open-unmix': {
      'vocals': 0.82,
      'drums': 0.85,
      'bass': 0.78,
      'other': 0.72
    }
  };

  return confidenceMap[modelType]?.[stemType] || 0.75;
}

function estimateHarmonicContent(stemType: string): number {
  const harmonicValues: Record<string, number> = {
    'vocals': 0.8,
    'piano': 0.9,
    'guitar': 0.7,
    'strings': 0.85,
    'brass': 0.8,
    'bass': 0.6,
    'drums': 0.1,
    'other': 0.5
  };
  return harmonicValues[stemType] || 0.5;
}

function estimateRhythmicContent(stemType: string): number {
  const rhythmicValues: Record<string, number> = {
    'drums': 0.95,
    'bass': 0.7,
    'guitar': 0.6,
    'piano': 0.5,
    'vocals': 0.3,
    'strings': 0.2,
    'brass': 0.3,
    'other': 0.4
  };
  return rhythmicValues[stemType] || 0.4;
}

function generatePlaceholderProfile(): number[] {
  // Generate a placeholder spectral profile
  return Array.from({ length: 512 }, (_, i) => Math.random() * 0.5 + 0.25);
}