'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  AudioTestSuite,
  TestType,
  TestResult,
  ValidationReport,
  TestConfiguration,
  QualityMetrics
} from '@/lib/audio/testing/audio-test-suite';

export interface AudioTestSuiteProps {
  audioBuffer?: AudioBuffer;
  audioContext?: AudioContext;
  file?: File;
  onTestComplete?: (report: ValidationReport) => void;
  onTestProgress?: (progress: number, currentTest: string) => void;
}

const TEST_TYPE_ICONS: Record<TestType, string> = {
  'file-validation': '📁',
  'audio-properties': '🎵',
  'quality-analysis': '⭐',
  'clipping-detection': '⚠️',
  'phase-analysis': '🌊',
  'noise-analysis': '🔇',
  'dynamic-range': '📊',
  'loudness-analysis': '🔊',
  'stereo-analysis': '🎧',
  'silence-detection': '🤫',
  'frequency-analysis': '📈',
  'compatibility-check': '✅',
  'format-validation': '🎯'
};

const TEST_TYPE_DESCRIPTIONS: Record<TestType, string> = {
  'file-validation': 'Validates file format, size, and basic properties',
  'audio-properties': 'Analyzes sample rate, bit depth, and channels',
  'quality-analysis': 'Measures overall audio quality and fidelity',
  'clipping-detection': 'Detects digital clipping and distortion',
  'phase-analysis': 'Checks for phase issues and correlation',
  'noise-analysis': 'Measures noise floor and signal-to-noise ratio',
  'dynamic-range': 'Analyzes dynamic range and compression',
  'loudness-analysis': 'Measures LUFS and loudness standards',
  'stereo-analysis': 'Analyzes stereo width and imaging',
  'silence-detection': 'Detects silence at beginning and end',
  'frequency-analysis': 'Analyzes frequency response and balance',
  'compatibility-check': 'Checks compatibility with various platforms',
  'format-validation': 'Validates audio format specifications'
};

const SEVERITY_COLORS = {
  info: 'text-blue-600 bg-blue-100',
  warning: 'text-yellow-600 bg-yellow-100',
  error: 'text-red-600 bg-red-100',
  critical: 'text-red-800 bg-red-200'
};

export function AudioTestSuiteComponent({
  audioBuffer,
  audioContext,
  file,
  onTestComplete,
  onTestProgress
}: AudioTestSuiteProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [selectedTests, setSelectedTests] = useState<TestType[]>([
    'file-validation',
    'audio-properties',
    'quality-analysis',
    'clipping-detection',
    'phase-analysis',
    'loudness-analysis'
  ]);
  const [configuration, setConfiguration] = useState<TestConfiguration>({
    enabledTests: selectedTests,
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
  });

  const testSuiteRef = useRef<AudioTestSuite | null>(null);

  const handleRunTests = useCallback(async () => {
    if (!audioBuffer || !audioContext) {
      console.error('Audio buffer and context are required');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setReport(null);

    try {
      if (!testSuiteRef.current) {
        testSuiteRef.current = new AudioTestSuite();
      }

      const testSuite = testSuiteRef.current;
      const config = {
        ...configuration,
        enabledTests: selectedTests
      };

      const progressCallback = (prog: number, test: string) => {
        setProgress(prog);
        setCurrentTest(test);
        onTestProgress?.(prog, test);
      };

      const validationReport = await testSuite.runValidation(
        audioBuffer,
        audioContext,
        config,
        progressCallback
      );

      setReport(validationReport);
      onTestComplete?.(validationReport);
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setProgress(0);
    }
  }, [audioBuffer, audioContext, selectedTests, configuration, onTestComplete, onTestProgress]);

  const toggleTest = (testType: TestType) => {
    setSelectedTests(prev =>
      prev.includes(testType)
        ? prev.filter(t => t !== testType)
        : [...prev, testType]
    );
  };

  const getOverallScore = (report: ValidationReport): number => {
    if (!report.results || report.results.length === 0) return 0;

    const scores = report.results
      .filter(result => result.score !== undefined)
      .map(result => result.score as number);

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const allTestTypes: TestType[] = [
    'file-validation',
    'audio-properties',
    'quality-analysis',
    'clipping-detection',
    'phase-analysis',
    'noise-analysis',
    'dynamic-range',
    'loudness-analysis',
    'stereo-analysis',
    'silence-detection',
    'frequency-analysis',
    'compatibility-check',
    'format-validation'
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audio Test Suite</h2>
          <p className="text-gray-600">Comprehensive audio validation and quality analysis</p>
        </div>
        <div className="flex items-center space-x-3">
          {report && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Overall Score</div>
              <div className={`text-2xl font-bold ${getScoreColor(getOverallScore(report))}`}>
                {getOverallScore(report).toFixed(1)}%
              </div>
            </div>
          )}
          <button
            onClick={handleRunTests}
            disabled={isRunning || !audioBuffer || selectedTests.length === 0}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </button>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Test Configuration</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Select Tests</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allTestTypes.map((testType) => (
                <label key={testType} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(testType)}
                    onChange={() => toggleTest(testType)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-lg">{TEST_TYPE_ICONS[testType]}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {testType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-xs text-gray-500">
                        {TEST_TYPE_DESCRIPTIONS[testType]}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Configuration Options */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Options</h4>
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={configuration.strictMode}
                  onChange={(e) => setConfiguration(prev => ({
                    ...prev,
                    strictMode: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Strict Mode</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={configuration.includeSuggestions}
                  onChange={(e) => setConfiguration(prev => ({
                    ...prev,
                    includeSuggestions: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include Suggestions</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target LUFS
                </label>
                <input
                  type="number"
                  value={configuration.qualityThresholds.targetLUFS}
                  onChange={(e) => setConfiguration(prev => ({
                    ...prev,
                    qualityThresholds: {
                      ...prev.qualityThresholds,
                      targetLUFS: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Clipping %
                </label>
                <input
                  type="number"
                  value={configuration.qualityThresholds.maxClippingPercentage}
                  onChange={(e) => setConfiguration(prev => ({
                    ...prev,
                    qualityThresholds: {
                      ...prev.qualityThresholds,
                      maxClippingPercentage: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Running Tests</span>
            <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {currentTest && (
            <p className="text-sm text-gray-600">
              Currently running: {currentTest.replace(/-/g, ' ')}
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {report && (
        <div className="p-6">
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Test Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{report.results.length}</div>
                  <div className="text-sm text-gray-600">Tests Run</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {report.results.filter(r => r.passed).length}
                  </div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {report.results.filter(r => !r.passed).length}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(getOverallScore(report))}`}>
                    {getOverallScore(report).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Score</div>
                </div>
              </div>
            </div>

            {/* Test Results */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
              <div className="space-y-3">
                {report.results.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      result.passed ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-2xl">
                          {TEST_TYPE_ICONS[result.testType]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {result.testType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {result.passed ? 'Passed' : 'Failed'}
                            </span>
                            {result.score !== undefined && (
                              <span className={`text-sm font-medium ${getScoreColor(result.score)}`}>
                                {result.score.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{result.message}</p>

                          {result.details && Object.keys(result.details).length > 0 && (
                            <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                              <strong>Details:</strong>
                              <pre className="mt-1 whitespace-pre-wrap">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues */}
            {report.issues && report.issues.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Issues Found</h3>
                <div className="space-y-2">
                  {report.issues.map((issue, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${SEVERITY_COLORS[issue.severity]}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{issue.title}</h4>
                          <p className="text-sm mt-1">{issue.description}</p>
                          {issue.suggestion && (
                            <p className="text-sm mt-2 italic">
                              <strong>Suggestion:</strong> {issue.suggestion}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium uppercase">
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
                <div className="space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Audio Message */}
      {!audioBuffer && (
        <div className="p-6 text-center text-gray-500">
          <div className="text-4xl mb-2">🎵</div>
          <p>Load an audio file to run comprehensive tests and validation.</p>
        </div>
      )}
    </div>
  );
}