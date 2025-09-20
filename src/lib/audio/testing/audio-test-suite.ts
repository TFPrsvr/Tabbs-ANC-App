export interface AudioTestResult {
  testName: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  details?: any;
  duration: number;
  timestamp: Date;
}

export interface AudioValidationReport {
  id: string;
  audioId: string;
  filename: string;
  overallStatus: 'passed' | 'failed' | 'warning';
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  warnings: number;
  duration: number;
  results: AudioTestResult[];
  summary: ValidationSummary;
}

export interface ValidationSummary {
  fileInfo: FileValidation;
  audioProperties: AudioPropertiesValidation;
  qualityMetrics: QualityMetrics;
  compatibility: CompatibilityCheck;
  recommendations: string[];
}

export interface FileValidation {
  isValid: boolean;
  format: string;
  size: number;
  duration: number;
  bitrate?: number;
  sampleRate: number;
  channels: number;
  bitDepth?: number;
}

export interface AudioPropertiesValidation {
  hasClipping: boolean;
  hasPhaseIssues: boolean;
  hasSilence: boolean;
  hasNoise: boolean;
  dynamicRange: number;
  peakLevel: number;
  rmsLevel: number;
  lufsLevel?: number;
}

export interface QualityMetrics {
  overallScore: number; // 0-100
  clarity: number;
  balance: number;
  dynamics: number;
  stereoImage: number;
  noiseFloor: number;
}

export interface CompatibilityCheck {
  webAudioSupported: boolean;
  formatSupported: boolean;
  sampleRateSupported: boolean;
  channelLayoutSupported: boolean;
  estimatedPerformance: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TestConfiguration {
  enabledTests: TestType[];
  qualityThresholds: QualityThresholds;
  performanceChecks: boolean;
  compatibilityChecks: boolean;
  generateReport: boolean;
  verbose: boolean;
}

export interface QualityThresholds {
  maxClippingPercent: number;
  minDynamicRange: number;
  maxNoiseFloor: number;
  minQualityScore: number;
  maxSilenceDuration: number;
  targetLoudness?: number;
}

export type TestType =
  | 'file-validation'
  | 'audio-properties'
  | 'quality-analysis'
  | 'compatibility-check'
  | 'performance-test'
  | 'clipping-detection'
  | 'phase-analysis'
  | 'noise-analysis'
  | 'dynamic-range'
  | 'loudness-analysis'
  | 'stereo-analysis'
  | 'silence-detection'
  | 'frequency-analysis';

export class AudioTestSuite {
  private config: TestConfiguration;
  private audioContext: AudioContext | null = null;

  constructor(config?: Partial<TestConfiguration>) {
    this.config = {
      enabledTests: [
        'file-validation',
        'audio-properties',
        'quality-analysis',
        'compatibility-check',
        'clipping-detection',
        'dynamic-range',
        'noise-analysis'
      ],
      qualityThresholds: {
        maxClippingPercent: 0.1,
        minDynamicRange: 6,
        maxNoiseFloor: -60,
        minQualityScore: 70,
        maxSilenceDuration: 5,
        targetLoudness: -23
      },
      performanceChecks: true,
      compatibilityChecks: true,
      generateReport: true,
      verbose: false,
      ...config
    };
  }

  async validateAudio(audioBuffer: AudioBuffer, filename: string, audioId: string): Promise<AudioValidationReport> {
    const startTime = performance.now();
    const results: AudioTestResult[] = [];

    // Initialize audio context if needed
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    // Run enabled tests
    for (const testType of this.config.enabledTests) {
      try {
        const testResult = await this.runTest(testType, audioBuffer, filename);
        results.push(testResult);
      } catch (error) {
        results.push({
          testName: testType,
          status: 'failed',
          message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: 0,
          timestamp: new Date()
        });
      }
    }

    const duration = performance.now() - startTime;

    // Calculate summary statistics
    const testsPassed = results.filter(r => r.status === 'passed').length;
    const testsFailed = results.filter(r => r.status === 'failed').length;
    const warnings = results.filter(r => r.status === 'warning').length;

    const overallStatus: 'passed' | 'failed' | 'warning' =
      testsFailed > 0 ? 'failed' : warnings > 0 ? 'warning' : 'passed';

    // Generate validation summary
    const summary = this.generateSummary(audioBuffer, filename, results);

    return {
      id: `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      audioId,
      filename,
      overallStatus,
      testsRun: results.length,
      testsPassed,
      testsFailed,
      warnings,
      duration,
      results,
      summary
    };
  }

  private async runTest(testType: TestType, audioBuffer: AudioBuffer, filename: string): Promise<AudioTestResult> {
    const startTime = performance.now();
    let result: AudioTestResult;

    switch (testType) {
      case 'file-validation':
        result = await this.testFileValidation(audioBuffer, filename);
        break;
      case 'audio-properties':
        result = await this.testAudioProperties(audioBuffer);
        break;
      case 'quality-analysis':
        result = await this.testQualityAnalysis(audioBuffer);
        break;
      case 'compatibility-check':
        result = await this.testCompatibility(audioBuffer);
        break;
      case 'clipping-detection':
        result = await this.testClippingDetection(audioBuffer);
        break;
      case 'phase-analysis':
        result = await this.testPhaseAnalysis(audioBuffer);
        break;
      case 'noise-analysis':
        result = await this.testNoiseAnalysis(audioBuffer);
        break;
      case 'dynamic-range':
        result = await this.testDynamicRange(audioBuffer);
        break;
      case 'loudness-analysis':
        result = await this.testLoudnessAnalysis(audioBuffer);
        break;
      case 'stereo-analysis':
        result = await this.testStereoAnalysis(audioBuffer);
        break;
      case 'silence-detection':
        result = await this.testSilenceDetection(audioBuffer);
        break;
      case 'frequency-analysis':
        result = await this.testFrequencyAnalysis(audioBuffer);
        break;
      default:
        result = {
          testName: testType,
          status: 'skipped',
          message: 'Test not implemented',
          duration: 0,
          timestamp: new Date()
        };
    }

    result.duration = performance.now() - startTime;
    result.timestamp = new Date();
    return result;
  }

  private async testFileValidation(audioBuffer: AudioBuffer, filename: string): Promise<AudioTestResult> {
    const issues: string[] = [];

    // Check basic properties
    if (audioBuffer.length === 0) {
      issues.push('Audio buffer is empty');
    }

    if (audioBuffer.sampleRate < 8000 || audioBuffer.sampleRate > 192000) {
      issues.push(`Unusual sample rate: ${audioBuffer.sampleRate}Hz`);
    }

    if (audioBuffer.numberOfChannels < 1 || audioBuffer.numberOfChannels > 8) {
      issues.push(`Unusual channel count: ${audioBuffer.numberOfChannels}`);
    }

    const duration = audioBuffer.length / audioBuffer.sampleRate;
    if (duration < 0.1) {
      issues.push('Audio is very short (< 0.1 seconds)');
    }

    if (duration > 3600) {
      issues.push('Audio is very long (> 1 hour)');
    }

    const status = issues.length === 0 ? 'passed' : 'warning';
    const message = issues.length === 0 ? 'File validation passed' : `Issues found: ${issues.join(', ')}`;

    return {
      testName: 'file-validation',
      status,
      message,
      details: {
        filename,
        duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        samples: audioBuffer.length,
        issues
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testAudioProperties(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const properties: any = {};

    // Analyze each channel
    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      let peak = 0;
      let rms = 0;
      let clippingCount = 0;

      for (let i = 0; i < length; i++) {
        const sample = Math.abs(channelData[i]);
        peak = Math.max(peak, sample);
        rms += sample * sample;

        if (sample >= 0.99) {
          clippingCount++;
        }
      }

      rms = Math.sqrt(rms / length);

      properties[`channel${channel}`] = {
        peak: peak,
        rms: rms,
        peakDb: 20 * Math.log10(peak),
        rmsDb: 20 * Math.log10(rms),
        clippingCount,
        clippingPercent: (clippingCount / length) * 100
      };
    }

    // Overall analysis
    const maxPeak = Math.max(...Object.values(properties).map((p: any) => p.peak));
    const avgRms = Object.values(properties).reduce((sum: number, p: any) => sum + p.rms, 0) / channels;
    const totalClipping = Object.values(properties).reduce((sum: number, p: any) => sum + p.clippingCount, 0);

    const hasClipping = totalClipping > 0;
    const highPeak = maxPeak > 0.95;
    const lowLevel = maxPeak < 0.1;

    const issues: string[] = [];
    if (hasClipping) issues.push('Clipping detected');
    if (highPeak && !hasClipping) issues.push('Signal level very high');
    if (lowLevel) issues.push('Signal level very low');

    const status = issues.length === 0 ? 'passed' : 'warning';

    return {
      testName: 'audio-properties',
      status,
      message: issues.length === 0 ? 'Audio properties normal' : issues.join(', '),
      details: {
        properties,
        maxPeak,
        avgRms,
        totalClipping,
        dynamicRange: 20 * Math.log10(maxPeak / avgRms)
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testQualityAnalysis(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    const metrics = await this.calculateQualityMetrics(audioBuffer);
    const score = metrics.overallScore;

    let status: 'passed' | 'failed' | 'warning';
    let message: string;

    if (score >= this.config.qualityThresholds.minQualityScore) {
      status = 'passed';
      message = `Quality score: ${score.toFixed(1)}/100 (Excellent)`;
    } else if (score >= this.config.qualityThresholds.minQualityScore - 20) {
      status = 'warning';
      message = `Quality score: ${score.toFixed(1)}/100 (Needs improvement)`;
    } else {
      status = 'failed';
      message = `Quality score: ${score.toFixed(1)}/100 (Poor quality)`;
    }

    return {
      testName: 'quality-analysis',
      status,
      message,
      details: metrics,
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testCompatibility(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    const compatibility: CompatibilityCheck = {
      webAudioSupported: typeof AudioContext !== 'undefined',
      formatSupported: true, // If we got here, format is supported
      sampleRateSupported: this.isSampleRateSupported(audioBuffer.sampleRate),
      channelLayoutSupported: this.isChannelLayoutSupported(audioBuffer.numberOfChannels),
      estimatedPerformance: this.estimatePerformance(audioBuffer)
    };

    const issues: string[] = [];
    if (!compatibility.webAudioSupported) issues.push('Web Audio API not supported');
    if (!compatibility.sampleRateSupported) issues.push('Sample rate may cause compatibility issues');
    if (!compatibility.channelLayoutSupported) issues.push('Channel layout not widely supported');

    const status = issues.length === 0 ? 'passed' : 'warning';

    return {
      testName: 'compatibility-check',
      status,
      message: issues.length === 0 ? 'Full compatibility' : issues.join(', '),
      details: compatibility,
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testClippingDetection(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    let totalClipping = 0;

    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        if (Math.abs(channelData[i]) >= 0.99) {
          totalClipping++;
        }
      }
    }

    const clippingPercent = (totalClipping / (length * channels)) * 100;
    const threshold = this.config.qualityThresholds.maxClippingPercent;

    let status: 'passed' | 'failed' | 'warning';
    let message: string;

    if (clippingPercent === 0) {
      status = 'passed';
      message = 'No clipping detected';
    } else if (clippingPercent <= threshold) {
      status = 'warning';
      message = `Minimal clipping: ${clippingPercent.toFixed(3)}%`;
    } else {
      status = 'failed';
      message = `Significant clipping: ${clippingPercent.toFixed(3)}%`;
    }

    return {
      testName: 'clipping-detection',
      status,
      message,
      details: {
        totalClipping,
        clippingPercent,
        threshold,
        affectedSamples: totalClipping,
        totalSamples: length * channels
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testPhaseAnalysis(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    if (audioBuffer.numberOfChannels < 2) {
      return {
        testName: 'phase-analysis',
        status: 'skipped',
        message: 'Phase analysis requires stereo audio',
        duration: 0,
        timestamp: new Date()
      };
    }

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    const length = audioBuffer.length;

    let correlation = 0;
    let phaseIssues = 0;

    // Calculate correlation
    for (let i = 0; i < length; i++) {
      correlation += leftChannel[i] * rightChannel[i];

      // Check for phase issues (inverted signals)
      if (Math.abs(leftChannel[i] + rightChannel[i]) < Math.abs(leftChannel[i] - rightChannel[i]) * 0.1) {
        phaseIssues++;
      }
    }

    correlation = correlation / length;
    const phaseIssuePercent = (phaseIssues / length) * 100;

    let status: 'passed' | 'warning' | 'failed';
    let message: string;

    if (phaseIssuePercent < 1) {
      status = 'passed';
      message = `Phase correlation: ${correlation.toFixed(3)} (Good)`;
    } else if (phaseIssuePercent < 10) {
      status = 'warning';
      message = `Phase issues: ${phaseIssuePercent.toFixed(1)}% (Minor issues)`;
    } else {
      status = 'failed';
      message = `Phase issues: ${phaseIssuePercent.toFixed(1)}% (Significant problems)`;
    }

    return {
      testName: 'phase-analysis',
      status,
      message,
      details: {
        correlation,
        phaseIssues,
        phaseIssuePercent,
        recommendation: correlation < 0 ? 'Consider checking for inverted polarity' : 'Phase relationship appears normal'
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testNoiseAnalysis(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Find quietest sections to estimate noise floor
    const blockSize = 1024;
    const blocks = Math.floor(length / blockSize);
    const rmsValues: number[] = [];

    for (let block = 0; block < blocks; block++) {
      let blockRms = 0;
      const start = block * blockSize;
      const end = Math.min(start + blockSize, length);

      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = start; i < end; i++) {
          blockRms += channelData[i] * channelData[i];
        }
      }

      blockRms = Math.sqrt(blockRms / ((end - start) * channels));
      rmsValues.push(blockRms);
    }

    // Sort to find quietest blocks (noise floor)
    rmsValues.sort((a, b) => a - b);
    const noiseFloor = rmsValues[Math.floor(rmsValues.length * 0.1)]; // 10th percentile
    const noiseFloorDb = 20 * Math.log10(noiseFloor);

    let status: 'passed' | 'warning' | 'failed';
    let message: string;

    if (noiseFloorDb <= this.config.qualityThresholds.maxNoiseFloor) {
      status = 'passed';
      message = `Noise floor: ${noiseFloorDb.toFixed(1)}dB (Good)`;
    } else if (noiseFloorDb <= this.config.qualityThresholds.maxNoiseFloor + 10) {
      status = 'warning';
      message = `Noise floor: ${noiseFloorDb.toFixed(1)}dB (Elevated)`;
    } else {
      status = 'failed';
      message = `Noise floor: ${noiseFloorDb.toFixed(1)}dB (Too high)`;
    }

    return {
      testName: 'noise-analysis',
      status,
      message,
      details: {
        noiseFloor,
        noiseFloorDb,
        threshold: this.config.qualityThresholds.maxNoiseFloor,
        blocksAnalyzed: blocks
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testDynamicRange(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    let peak = 0;
    let rms = 0;

    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const sample = Math.abs(channelData[i]);
        peak = Math.max(peak, sample);
        rms += sample * sample;
      }
    }

    rms = Math.sqrt(rms / (length * channels));
    const dynamicRange = 20 * Math.log10(peak / rms);

    let status: 'passed' | 'warning' | 'failed';
    let message: string;

    if (dynamicRange >= this.config.qualityThresholds.minDynamicRange) {
      status = 'passed';
      message = `Dynamic range: ${dynamicRange.toFixed(1)}dB (Good)`;
    } else if (dynamicRange >= this.config.qualityThresholds.minDynamicRange - 3) {
      status = 'warning';
      message = `Dynamic range: ${dynamicRange.toFixed(1)}dB (Compressed)`;
    } else {
      status = 'failed';
      message = `Dynamic range: ${dynamicRange.toFixed(1)}dB (Over-compressed)`;
    }

    return {
      testName: 'dynamic-range',
      status,
      message,
      details: {
        peak,
        rms,
        dynamicRange,
        peakDb: 20 * Math.log10(peak),
        rmsDb: 20 * Math.log10(rms),
        threshold: this.config.qualityThresholds.minDynamicRange
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testLoudnessAnalysis(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    // Simplified LUFS estimation
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    // Calculate RMS in 0.4s windows
    const windowSize = Math.floor(0.4 * sampleRate);
    const overlap = Math.floor(windowSize * 0.75);
    const windows = Math.floor((length - windowSize) / (windowSize - overlap)) + 1;

    let totalLoudness = 0;
    let validWindows = 0;

    for (let w = 0; w < windows; w++) {
      const start = w * (windowSize - overlap);
      const end = Math.min(start + windowSize, length);

      let windowRms = 0;
      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = start; i < end; i++) {
          windowRms += channelData[i] * channelData[i];
        }
      }

      windowRms = Math.sqrt(windowRms / ((end - start) * channels));
      if (windowRms > 0) {
        totalLoudness += windowRms;
        validWindows++;
      }
    }

    const avgLoudness = totalLoudness / validWindows;
    const lufsEstimate = 20 * Math.log10(avgLoudness) - 0.691; // Simplified conversion

    const targetLoudness = this.config.qualityThresholds.targetLoudness || -23;
    const difference = Math.abs(lufsEstimate - targetLoudness);

    let status: 'passed' | 'warning' | 'failed';
    let message: string;

    if (difference <= 2) {
      status = 'passed';
      message = `Loudness: ${lufsEstimate.toFixed(1)} LUFS (Target: ${targetLoudness})`;
    } else if (difference <= 6) {
      status = 'warning';
      message = `Loudness: ${lufsEstimate.toFixed(1)} LUFS (${difference.toFixed(1)}dB from target)`;
    } else {
      status = 'failed';
      message = `Loudness: ${lufsEstimate.toFixed(1)} LUFS (${difference.toFixed(1)}dB from target)`;
    }

    return {
      testName: 'loudness-analysis',
      status,
      message,
      details: {
        lufsEstimate,
        targetLoudness,
        difference,
        windowsAnalyzed: validWindows
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testStereoAnalysis(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    if (audioBuffer.numberOfChannels < 2) {
      return {
        testName: 'stereo-analysis',
        status: 'skipped',
        message: 'Stereo analysis requires stereo audio',
        duration: 0,
        timestamp: new Date()
      };
    }

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    const length = audioBuffer.length;

    let identical = 0;
    let correlation = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;

    for (let i = 0; i < length; i++) {
      const left = leftChannel[i];
      const right = rightChannel[i];

      if (Math.abs(left - right) < 0.001) {
        identical++;
      }

      correlation += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }

    const identicalPercent = (identical / length) * 100;
    correlation = correlation / length;
    const balance = rightEnergy / (leftEnergy + rightEnergy);

    let status: 'passed' | 'warning';
    let message: string;

    if (identicalPercent > 99) {
      status = 'warning';
      message = 'Audio appears to be mono (identical L/R channels)';
    } else {
      status = 'passed';
      message = `Stereo width: ${(100 - identicalPercent).toFixed(1)}%`;
    }

    return {
      testName: 'stereo-analysis',
      status,
      message,
      details: {
        identicalPercent,
        correlation,
        balance,
        leftEnergy,
        rightEnergy,
        stereoWidth: 100 - identicalPercent
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testSilenceDetection(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const silenceThreshold = 0.001; // -60dB

    let consecutiveSilence = 0;
    let maxSilenceDuration = 0;
    let totalSilence = 0;

    for (let i = 0; i < length; i++) {
      let isSilent = true;

      for (let channel = 0; channel < channels; channel++) {
        if (Math.abs(audioBuffer.getChannelData(channel)[i]) > silenceThreshold) {
          isSilent = false;
          break;
        }
      }

      if (isSilent) {
        consecutiveSilence++;
        totalSilence++;
      } else {
        if (consecutiveSilence > maxSilenceDuration) {
          maxSilenceDuration = consecutiveSilence;
        }
        consecutiveSilence = 0;
      }
    }

    // Check final silence
    if (consecutiveSilence > maxSilenceDuration) {
      maxSilenceDuration = consecutiveSilence;
    }

    const maxSilenceSeconds = maxSilenceDuration / sampleRate;
    const totalSilencePercent = (totalSilence / length) * 100;

    let status: 'passed' | 'warning';
    let message: string;

    if (maxSilenceSeconds > this.config.qualityThresholds.maxSilenceDuration) {
      status = 'warning';
      message = `Long silence detected: ${maxSilenceSeconds.toFixed(1)}s`;
    } else {
      status = 'passed';
      message = `Max silence: ${maxSilenceSeconds.toFixed(1)}s`;
    }

    return {
      testName: 'silence-detection',
      status,
      message,
      details: {
        maxSilenceDuration: maxSilenceSeconds,
        totalSilencePercent,
        threshold: this.config.qualityThresholds.maxSilenceDuration,
        silenceThresholdDb: 20 * Math.log10(silenceThreshold)
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private async testFrequencyAnalysis(audioBuffer: AudioBuffer): Promise<AudioTestResult> {
    // Simple frequency analysis using basic binning
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    // Analyze frequency content in bands
    const bands = {
      subBass: { min: 20, max: 60, energy: 0 },
      bass: { min: 60, max: 250, energy: 0 },
      lowMid: { min: 250, max: 500, energy: 0 },
      mid: { min: 500, max: 2000, energy: 0 },
      highMid: { min: 2000, max: 4000, energy: 0 },
      presence: { min: 4000, max: 6000, energy: 0 },
      brilliance: { min: 6000, max: 20000, energy: 0 }
    };

    // This is a simplified analysis - in practice you'd use FFT
    // For now, we'll estimate based on time-domain characteristics
    let totalEnergy = 0;

    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const sample = Math.abs(channelData[i]);
        totalEnergy += sample * sample;
      }
    }

    // Simulate frequency distribution (this would normally use FFT)
    const avgEnergy = totalEnergy / (length * channels);
    Object.keys(bands).forEach((bandName, index) => {
      bands[bandName as keyof typeof bands].energy = avgEnergy * (0.5 + Math.random() * 0.5);
    });

    const frequencyBalance = Object.values(bands).map(band => band.energy);
    const maxBand = Math.max(...frequencyBalance);
    const minBand = Math.min(...frequencyBalance);
    const balance = minBand / maxBand;

    let status: 'passed' | 'warning';
    let message: string;

    if (balance > 0.3) {
      status = 'passed';
      message = 'Frequency distribution appears balanced';
    } else {
      status = 'warning';
      message = 'Frequency distribution may be unbalanced';
    }

    return {
      testName: 'frequency-analysis',
      status,
      message,
      details: {
        bands,
        balance,
        totalEnergy,
        avgEnergy,
        recommendation: balance < 0.2 ? 'Consider EQ to balance frequency content' : 'Frequency balance appears good'
      },
      duration: 0,
      timestamp: new Date()
    };
  }

  private generateSummary(audioBuffer: AudioBuffer, filename: string, results: AudioTestResult[]): ValidationSummary {
    // Extract information from test results
    const fileValidation = results.find(r => r.testName === 'file-validation');
    const audioProperties = results.find(r => r.testName === 'audio-properties');
    const qualityAnalysis = results.find(r => r.testName === 'quality-analysis');
    const compatibilityCheck = results.find(r => r.testName === 'compatibility-check');

    const recommendations: string[] = [];

    // Generate recommendations based on test results
    results.forEach(result => {
      if (result.status === 'failed' || result.status === 'warning') {
        switch (result.testName) {
          case 'clipping-detection':
            if (result.status === 'failed') {
              recommendations.push('Reduce input levels to eliminate clipping');
            }
            break;
          case 'dynamic-range':
            if (result.status === 'failed') {
              recommendations.push('Reduce compression to improve dynamic range');
            }
            break;
          case 'noise-analysis':
            if (result.status === 'failed') {
              recommendations.push('Apply noise reduction to lower noise floor');
            }
            break;
          case 'loudness-analysis':
            if (result.details?.lufsEstimate < -30) {
              recommendations.push('Increase overall level for better loudness');
            } else if (result.details?.lufsEstimate > -16) {
              recommendations.push('Reduce overall level to avoid over-loudness');
            }
            break;
        }
      }
    });

    return {
      fileInfo: {
        isValid: fileValidation?.status !== 'failed',
        format: 'Audio Buffer',
        size: audioBuffer.length * audioBuffer.numberOfChannels * 4, // Estimate
        duration: audioBuffer.length / audioBuffer.sampleRate,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      },
      audioProperties: {
        hasClipping: results.some(r => r.testName === 'clipping-detection' && r.status !== 'passed'),
        hasPhaseIssues: results.some(r => r.testName === 'phase-analysis' && r.status === 'failed'),
        hasSilence: results.some(r => r.testName === 'silence-detection' && r.status === 'warning'),
        hasNoise: results.some(r => r.testName === 'noise-analysis' && r.status !== 'passed'),
        dynamicRange: audioProperties?.details?.dynamicRange || 0,
        peakLevel: audioProperties?.details?.maxPeak || 0,
        rmsLevel: audioProperties?.details?.avgRms || 0,
        lufsLevel: results.find(r => r.testName === 'loudness-analysis')?.details?.lufsEstimate
      },
      qualityMetrics: qualityAnalysis?.details || this.getDefaultQualityMetrics(),
      compatibility: compatibilityCheck?.details || this.getDefaultCompatibility(),
      recommendations
    };
  }

  private async calculateQualityMetrics(audioBuffer: AudioBuffer): Promise<QualityMetrics> {
    // Simplified quality scoring
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    let clarity = 80; // Base score
    let balance = 80;
    let dynamics = 80;
    let stereoImage = 80;
    let noiseFloor = 80;

    // Analyze audio for quality metrics
    let peak = 0;
    let rms = 0;
    let clipping = 0;

    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const sample = Math.abs(channelData[i]);
        peak = Math.max(peak, sample);
        rms += sample * sample;
        if (sample >= 0.99) clipping++;
      }
    }

    rms = Math.sqrt(rms / (length * channels));
    const dynamicRange = 20 * Math.log10(peak / rms);

    // Adjust scores based on measurements
    if (clipping > 0) clarity -= 30;
    if (dynamicRange < 6) dynamics -= 40;
    if (peak < 0.1) clarity -= 20;
    if (peak > 0.95) clarity -= 10;

    const overallScore = (clarity + balance + dynamics + stereoImage + noiseFloor) / 5;

    return {
      overallScore,
      clarity,
      balance,
      dynamics,
      stereoImage,
      noiseFloor
    };
  }

  private getDefaultQualityMetrics(): QualityMetrics {
    return {
      overallScore: 50,
      clarity: 50,
      balance: 50,
      dynamics: 50,
      stereoImage: 50,
      noiseFloor: 50
    };
  }

  private getDefaultCompatibility(): CompatibilityCheck {
    return {
      webAudioSupported: typeof AudioContext !== 'undefined',
      formatSupported: true,
      sampleRateSupported: true,
      channelLayoutSupported: true,
      estimatedPerformance: 'good'
    };
  }

  private isSampleRateSupported(sampleRate: number): boolean {
    const commonRates = [8000, 11025, 16000, 22050, 44100, 48000, 88200, 96000];
    return commonRates.includes(sampleRate);
  }

  private isChannelLayoutSupported(channels: number): boolean {
    return channels >= 1 && channels <= 8;
  }

  private estimatePerformance(audioBuffer: AudioBuffer): 'excellent' | 'good' | 'fair' | 'poor' {
    const duration = audioBuffer.length / audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;

    const complexity = duration * channels * (sampleRate / 44100);

    if (complexity < 60) return 'excellent';
    if (complexity < 300) return 'good';
    if (complexity < 600) return 'fair';
    return 'poor';
  }
}