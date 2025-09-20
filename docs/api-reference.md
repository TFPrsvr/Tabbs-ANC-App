# API Reference

## Overview

This document provides comprehensive API documentation for the audio application's core libraries and services. The API is designed for developers who want to integrate audio processing capabilities into their applications or extend the existing functionality.

## Table of Contents

1. [Core Audio Engine](#core-audio-engine)
2. [Audio Processing](#audio-processing)
3. [AI Analysis System](#ai-analysis-system)
4. [Testing Suite](#testing-suite)
5. [Project Management](#project-management)
6. [Utilities](#utilities)
7. [Type Definitions](#type-definitions)

## Core Audio Engine

### AudioProcessor

The main audio processing engine that handles real-time audio operations.

```typescript
class AudioProcessor {
  constructor(audioContext: AudioContext, config?: AudioProcessorConfig)

  // Core processing methods
  loadAudio(source: AudioBuffer | File | string): Promise<void>
  processAudio(effects: EffectChain[]): Promise<AudioBuffer>
  startRealTimeProcessing(): void
  stopRealTimeProcessing(): void

  // Event handlers
  onProcessingComplete: (buffer: AudioBuffer) => void
  onError: (error: AudioError) => void
  onProgress: (progress: number) => void
}
```

#### AudioProcessorConfig

```typescript
interface AudioProcessorConfig {
  sampleRate?: number
  bufferSize?: number
  channelCount?: number
  enableRealTime?: boolean
  maxProcessingTime?: number
}
```

#### Example Usage

```typescript
import { AudioProcessor } from '@/lib/audio'

const audioContext = new AudioContext()
const processor = new AudioProcessor(audioContext, {
  sampleRate: 48000,
  bufferSize: 512,
  enableRealTime: true
})

// Load and process audio
await processor.loadAudio(audioFile)
const processedBuffer = await processor.processAudio([
  { type: 'eq', parameters: { frequency: 1000, gain: 3, q: 1 } },
  { type: 'compressor', parameters: { threshold: -12, ratio: 4 } }
])
```

### AudioAnalyzer

Provides comprehensive audio analysis capabilities.

```typescript
class AudioAnalyzer {
  constructor(audioContext: AudioContext)

  // Analysis methods
  analyzeSpectrum(buffer: AudioBuffer): SpectrumAnalysis
  analyzeDynamics(buffer: AudioBuffer): DynamicsAnalysis
  analyzePhase(buffer: AudioBuffer): PhaseAnalysis
  analyzeLoudness(buffer: AudioBuffer): LoudnessAnalysis

  // Real-time analysis
  startRealTimeAnalysis(source: AudioNode): void
  stopRealTimeAnalysis(): void
  getAnalysisData(): AnalysisFrame
}
```

#### Analysis Types

```typescript
interface SpectrumAnalysis {
  frequencies: Float32Array
  magnitudes: Float32Array
  phases: Float32Array
  fundamentalFrequency: number
  spectralCentroid: number
  spectralRolloff: number
}

interface DynamicsAnalysis {
  peakLevel: number
  rmsLevel: number
  crestFactor: number
  dynamicRange: number
  compressionRatio: number
}

interface LoudnessAnalysis {
  integratedLoudness: number  // LUFS
  loudnessRange: number       // LRA
  truePeak: number           // dBTP
  momentaryLoudness: number   // Current moment
}
```

## Audio Processing

### EffectChain

Manages a chain of audio effects with real-time parameter control.

```typescript
class EffectChain {
  constructor(audioContext: AudioContext)

  // Effect management
  addEffect(effect: AudioEffect): void
  removeEffect(effectId: string): void
  reorderEffects(newOrder: string[]): void

  // Parameter control
  setParameter(effectId: string, parameter: string, value: number): void
  getParameter(effectId: string, parameter: string): number
  automateParameter(effectId: string, parameter: string, automation: AutomationCurve): void

  // Processing
  process(input: AudioNode): AudioNode
  bypass(effectId: string, bypassed: boolean): void
}
```

### Built-in Effects

#### EQ (Equalizer)

```typescript
interface EQEffect extends AudioEffect {
  type: 'eq'
  parameters: {
    bands: EQBand[]
    bypass: boolean
  }
}

interface EQBand {
  frequency: number    // Hz
  gain: number        // dB
  q: number          // Quality factor
  type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peaking' | 'lowshelf' | 'highshelf'
}
```

#### Compressor

```typescript
interface CompressorEffect extends AudioEffect {
  type: 'compressor'
  parameters: {
    threshold: number    // dB
    ratio: number       // X:1
    attack: number      // ms
    release: number     // ms
    knee: number        // dB
    makeupGain: number  // dB
    bypass: boolean
  }
}
```

#### Reverb

```typescript
interface ReverbEffect extends AudioEffect {
  type: 'reverb'
  parameters: {
    roomSize: number      // 0-1
    damping: number       // 0-1
    wetLevel: number      // 0-1
    dryLevel: number      // 0-1
    predelay: number      // ms
    bypass: boolean
  }
}
```

### Example Effect Chain

```typescript
import { EffectChain, EQEffect, CompressorEffect } from '@/lib/audio'

const chain = new EffectChain(audioContext)

// Add EQ
const eq: EQEffect = {
  id: 'eq1',
  type: 'eq',
  parameters: {
    bands: [
      { frequency: 80, gain: -3, q: 0.7, type: 'highpass' },
      { frequency: 1000, gain: 2, q: 1.0, type: 'peaking' },
      { frequency: 8000, gain: 1, q: 0.8, type: 'highshelf' }
    ],
    bypass: false
  }
}
chain.addEffect(eq)

// Add compression
const compressor: CompressorEffect = {
  id: 'comp1',
  type: 'compressor',
  parameters: {
    threshold: -12,
    ratio: 4,
    attack: 10,
    release: 100,
    knee: 2,
    makeupGain: 6,
    bypass: false
  }
}
chain.addEffect(compressor)
```

## AI Analysis System

### AISystem

Central AI analysis and suggestion system.

```typescript
class AISystem {
  constructor(config?: AIConfig)

  // Analysis methods
  analyzeAudio(buffer: AudioBuffer, types: AnalysisType[]): Promise<AnalysisResults>
  generateSuggestions(analysis: AnalysisResults): Promise<AISuggestion[]>

  // Smart mixing
  createSmartMix(tracks: AudioTrack[], preferences: MixingPreferences): Promise<MixingResult>

  // Learning system
  provideFeedback(suggestionId: string, feedback: SuggestionFeedback): void
  trainModel(data: TrainingData[]): Promise<void>
}
```

#### Analysis Types

```typescript
type AnalysisType =
  | 'musical'      // Key, tempo, harmony
  | 'mix'          // Balance, frequency response
  | 'mastering'    // Loudness, dynamics
  | 'quality'      // Technical issues
  | 'harmonic'     // Harmonic content
  | 'structure'    // Song structure
  | 'genre'        // Genre classification
  | 'mood'         // Emotional content
```

#### AI Suggestions

```typescript
interface AISuggestion {
  id: string
  type: SuggestionType
  category: SuggestionCategory
  title: string
  description: string
  reasoning: string
  confidence: number        // 0-1
  impact: 'low' | 'medium' | 'high'
  actions: SuggestionAction[]
  alternativeOptions?: AlternativeOption[]
}

interface SuggestionAction {
  type: 'eq' | 'compressor' | 'reverb' | 'level' | 'pan' | 'automation'
  target: string           // Track or bus identifier
  parameters: Record<string, number>
  description: string
}
```

#### Example AI Usage

```typescript
import { AISystem } from '@/lib/audio/ai-system'

const ai = new AISystem({
  enableLearning: true,
  confidenceThreshold: 0.6
})

// Analyze audio
const analysis = await ai.analyzeAudio(audioBuffer, [
  'musical',
  'mix',
  'quality'
])

// Get suggestions
const suggestions = await ai.generateSuggestions(analysis)

// Apply suggestion
for (const suggestion of suggestions) {
  if (suggestion.confidence > 0.8) {
    // Apply high-confidence suggestions automatically
    await applySuggestion(suggestion)
  }
}
```

### Smart Mixing Assistant

```typescript
class SmartMixingAssistant {
  constructor(aiSystem: AISystem)

  // Mixing operations
  balanceLevels(tracks: AudioTrack[]): Promise<LevelAdjustments>
  optimizeEQ(tracks: AudioTrack[]): Promise<EQAdjustments>
  applyDynamics(tracks: AudioTrack[]): Promise<DynamicsAdjustments>
  enhanceSpatial(tracks: AudioTrack[]): Promise<SpatialAdjustments>

  // Master bus processing
  masterBusProcessing(mix: AudioBuffer, target: MasteringTarget): Promise<ProcessingChain>
}

interface MixingPreferences {
  targetLoudness: number    // LUFS
  dynamicRange: 'tight' | 'moderate' | 'wide'
  frequency: 'warm' | 'neutral' | 'bright'
  spatial: 'narrow' | 'moderate' | 'wide'
  genre?: string
  referenceTrack?: AudioBuffer
}
```

## Testing Suite

### AudioTestSuite

Comprehensive audio validation and quality testing.

```typescript
class AudioTestSuite {
  constructor()

  // Test execution
  runValidation(
    buffer: AudioBuffer,
    context: AudioContext,
    config: TestConfiguration,
    progressCallback?: (progress: number, test: string) => void
  ): Promise<ValidationReport>

  // Individual tests
  runSingleTest(
    buffer: AudioBuffer,
    testType: TestType,
    config: TestConfiguration
  ): Promise<TestResult>
}
```

#### Test Configuration

```typescript
interface TestConfiguration {
  enabledTests: TestType[]
  qualityThresholds: QualityThresholds
  strictMode: boolean
  includeSuggestions: boolean
}

interface QualityThresholds {
  minSampleRate: number
  maxClippingPercentage: number
  minDynamicRange: number
  maxNoiseFloor: number
  minSNR: number
  targetLUFS: number
  maxTruePeak: number
}
```

#### Test Results

```typescript
interface ValidationReport {
  id: string
  startTime: Date
  endTime?: Date
  results: TestResult[]
  qualityMetrics?: QualityMetrics
  issues?: Issue[]
  recommendations?: string[]
  overallScore: number
}

interface TestResult {
  testType: TestType
  passed: boolean
  score?: number
  message: string
  details?: Record<string, any>
  duration?: number
}
```

#### Example Testing

```typescript
import { AudioTestSuite } from '@/lib/audio/testing/audio-test-suite'

const testSuite = new AudioTestSuite()

const config: TestConfiguration = {
  enabledTests: [
    'file-validation',
    'quality-analysis',
    'clipping-detection',
    'loudness-analysis'
  ],
  qualityThresholds: {
    minSampleRate: 44100,
    maxClippingPercentage: 0.1,
    minDynamicRange: 6,
    maxNoiseFloor: -60,
    minSNR: 40,
    targetLUFS: -23,
    maxTruePeak: -1
  },
  strictMode: false,
  includeSuggestions: true
}

const report = await testSuite.runValidation(
  audioBuffer,
  audioContext,
  config,
  (progress, test) => console.log(`${test}: ${progress}%`)
)

console.log(`Overall score: ${report.overallScore}%`)
```

## Project Management

### ProjectManager

Handles project creation, loading, and management.

```typescript
class ProjectManager {
  constructor()

  // Project operations
  createProject(template: ProjectTemplate): Promise<Project>
  loadProject(path: string): Promise<Project>
  saveProject(project: Project, path?: string): Promise<void>

  // Template management
  getTemplates(): ProjectTemplate[]
  createTemplate(project: Project, metadata: TemplateMetadata): Promise<ProjectTemplate>
  deleteTemplate(templateId: string): Promise<void>
}
```

#### Project Structure

```typescript
interface Project {
  id: string
  name: string
  metadata: ProjectMetadata
  audioSettings: AudioSettings
  tracks: AudioTrack[]
  buses: AudioBus[]
  effects: EffectChain[]
  automation: AutomationData[]
  version: string
  created: Date
  modified: Date
}

interface AudioSettings {
  sampleRate: number
  bitDepth: number
  bufferSize: number
  channelCount: number
}
```

### Template System

```typescript
interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: string
  metadata: TemplateMetadata
  configuration: ProjectConfiguration
  preview?: string
}

interface TemplateMetadata {
  author: string
  version: string
  tags: string[]
  compatibility: string[]
  thumbnail?: string
  description: string
}
```

## Utilities

### AudioUtils

Common audio utility functions.

```typescript
class AudioUtils {
  // Format conversion
  static convertSampleRate(buffer: AudioBuffer, targetRate: number): AudioBuffer
  static convertBitDepth(buffer: AudioBuffer, targetDepth: number): AudioBuffer
  static convertChannels(buffer: AudioBuffer, targetChannels: number): AudioBuffer

  // Level measurement
  static calculateRMS(buffer: AudioBuffer): number
  static calculatePeak(buffer: AudioBuffer): number
  static calculateLUFS(buffer: AudioBuffer): number

  // Time utilities
  static samplesToTime(samples: number, sampleRate: number): number
  static timeToSamples(time: number, sampleRate: number): number

  // Frequency utilities
  static frequencyToBin(frequency: number, fftSize: number, sampleRate: number): number
  static binToFrequency(bin: number, fftSize: number, sampleRate: number): number
}
```

### FileUtils

File handling and format utilities.

```typescript
class FileUtils {
  // File operations
  static loadAudioFile(file: File): Promise<AudioBuffer>
  static saveAudioFile(buffer: AudioBuffer, format: AudioFormat): Promise<Blob>

  // Format detection
  static detectFormat(file: File): Promise<AudioFormat>
  static validateFormat(file: File, expectedFormat: AudioFormat): Promise<boolean>

  // Metadata
  static extractMetadata(file: File): Promise<AudioMetadata>
  static embedMetadata(buffer: AudioBuffer, metadata: AudioMetadata): Promise<Blob>
}
```

### MathUtils

Mathematical operations for audio processing.

```typescript
class MathUtils {
  // Decibel conversions
  static linearToDb(linear: number): number
  static dbToLinear(db: number): number

  // Frequency calculations
  static noteToFrequency(note: string): number
  static frequencyToNote(frequency: number): string

  // Window functions
  static hannWindow(size: number): Float32Array
  static blackmanWindow(size: number): Float32Array
  static hamming Window(size: number): Float32Array

  // Interpolation
  static linearInterpolate(x0: number, y0: number, x1: number, y1: number, x: number): number
  static cubicInterpolate(y0: number, y1: number, y2: number, y3: number, mu: number): number
}
```

## Type Definitions

### Core Types

```typescript
// Audio data types
type AudioFormat = 'wav' | 'mp3' | 'flac' | 'aac' | 'ogg' | 'm4a'
type SampleRate = 8000 | 11025 | 16000 | 22050 | 44100 | 48000 | 88200 | 96000 | 192000
type BitDepth = 8 | 16 | 24 | 32

// Effect types
type EffectType = 'eq' | 'compressor' | 'reverb' | 'delay' | 'chorus' | 'flanger' | 'phaser' | 'distortion'

// Test types
type TestType =
  | 'file-validation'
  | 'audio-properties'
  | 'quality-analysis'
  | 'clipping-detection'
  | 'phase-analysis'
  | 'noise-analysis'
  | 'dynamic-range'
  | 'loudness-analysis'
  | 'stereo-analysis'
  | 'silence-detection'
  | 'frequency-analysis'
  | 'compatibility-check'
  | 'format-validation'
```

### Error Types

```typescript
class AudioError extends Error {
  constructor(
    message: string,
    public code: AudioErrorCode,
    public details?: Record<string, any>
  )
}

enum AudioErrorCode {
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  INVALID_SAMPLE_RATE = 'INVALID_SAMPLE_RATE',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  INSUFFICIENT_MEMORY = 'INSUFFICIENT_MEMORY',
  AUDIO_CONTEXT_ERROR = 'AUDIO_CONTEXT_ERROR',
  FILE_LOAD_ERROR = 'FILE_LOAD_ERROR'
}
```

### Event Types

```typescript
interface AudioEvent {
  type: string
  timestamp: number
  data?: any
}

interface ProcessingEvent extends AudioEvent {
  type: 'processing'
  data: {
    stage: string
    progress: number
    estimated: number
  }
}

interface AnalysisEvent extends AudioEvent {
  type: 'analysis'
  data: {
    analysisType: AnalysisType
    results: any
  }
}

interface ErrorEvent extends AudioEvent {
  type: 'error'
  data: {
    error: AudioError
    context: string
  }
}
```

## Examples and Best Practices

### Basic Audio Processing Workflow

```typescript
import {
  AudioProcessor,
  EffectChain,
  AudioAnalyzer
} from '@/lib/audio'

async function processAudioFile(file: File) {
  const audioContext = new AudioContext()

  // Create processor and analyzer
  const processor = new AudioProcessor(audioContext)
  const analyzer = new AudioAnalyzer(audioContext)

  try {
    // Load audio
    await processor.loadAudio(file)

    // Analyze audio
    const spectrum = analyzer.analyzeSpectrum(processor.buffer)
    const dynamics = analyzer.analyzeDynamics(processor.buffer)

    // Create effect chain based on analysis
    const effects = new EffectChain(audioContext)

    if (dynamics.crestFactor > 10) {
      effects.addEffect({
        id: 'comp1',
        type: 'compressor',
        parameters: { threshold: -12, ratio: 3 }
      })
    }

    if (spectrum.spectralCentroid > 3000) {
      effects.addEffect({
        id: 'eq1',
        type: 'eq',
        parameters: {
          bands: [{ frequency: 3000, gain: -2, q: 1, type: 'peaking' }]
        }
      })
    }

    // Process audio
    const processedBuffer = await processor.processAudio(effects.getEffects())

    return processedBuffer

  } catch (error) {
    console.error('Processing failed:', error)
    throw error
  }
}
```

### AI-Powered Audio Enhancement

```typescript
import { AISystem, SmartMixingAssistant } from '@/lib/audio/ai-system'

async function enhanceAudioWithAI(audioBuffer: AudioBuffer) {
  const ai = new AISystem()
  const mixingAssistant = new SmartMixingAssistant(ai)

  // Analyze audio
  const analysis = await ai.analyzeAudio(audioBuffer, [
    'musical',
    'mix',
    'quality'
  ])

  // Generate suggestions
  const suggestions = await ai.generateSuggestions(analysis)

  // Filter high-confidence suggestions
  const highConfidenceSuggestions = suggestions.filter(s => s.confidence > 0.8)

  // Apply suggestions
  for (const suggestion of highConfidenceSuggestions) {
    if (suggestion.category === 'technical-improvement') {
      await applySuggestion(suggestion)
    }
  }

  // Smart mixing for final polish
  const mixingResult = await mixingAssistant.masterBusProcessing(audioBuffer, {
    targetLoudness: -23,
    dynamicRange: 'moderate'
  })

  return mixingResult.processedBuffer
}
```

### Comprehensive Audio Testing

```typescript
import { AudioTestSuite } from '@/lib/audio/testing/audio-test-suite'

async function validateAudioQuality(audioBuffer: AudioBuffer) {
  const testSuite = new AudioTestSuite()

  const config = {
    enabledTests: [
      'quality-analysis',
      'clipping-detection',
      'loudness-analysis',
      'compatibility-check'
    ],
    qualityThresholds: {
      minSampleRate: 44100,
      maxClippingPercentage: 0.1,
      targetLUFS: -23,
      maxTruePeak: -1
    },
    strictMode: true,
    includeSuggestions: true
  }

  const report = await testSuite.runValidation(
    audioBuffer,
    new AudioContext(),
    config,
    (progress, test) => {
      console.log(`Running ${test}: ${progress.toFixed(1)}%`)
    }
  )

  // Check for critical issues
  const criticalIssues = report.issues?.filter(issue =>
    issue.severity === 'critical'
  )

  if (criticalIssues && criticalIssues.length > 0) {
    throw new Error(`Critical audio issues found: ${criticalIssues.map(i => i.title).join(', ')}`)
  }

  return report
}
```

## Version History

### v1.0.0
- Initial API release
- Core audio processing engine
- Basic effect chain support
- File format handling

### v1.1.0
- AI analysis system
- Smart suggestions
- Quality testing suite
- Template system

### v1.2.0
- Real-time processing
- MIDI integration
- Advanced automation
- Performance optimizations

---

*This API reference is continuously updated. For the latest version and additional examples, please refer to the online documentation.*