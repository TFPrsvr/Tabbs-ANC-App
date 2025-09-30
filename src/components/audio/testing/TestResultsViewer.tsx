'use client';

import React, { useState } from 'react';
import {
  AudioValidationReport,
  AudioTestResult,
  QualityMetrics
} from '@/lib/audio/testing/audio-test-suite';

// Define Issue interface since it's not exported
interface Issue {
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  suggestion?: string;
}

export interface TestResultsViewerProps {
  report: AudioValidationReport;
  onExportReport?: () => void;
  onRetryTest?: (testType: string) => void;
}

const SEVERITY_COLORS = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  critical: 'border-red-300 bg-red-100 text-red-900'
};

const SEVERITY_ICONS = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  critical: '🚨'
};

export function TestResultsViewer({
  report,
  onExportReport,
  onRetryTest
}: TestResultsViewerProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'metrics' | 'issues'>('overview');
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const getOverallScore = (): number => {
    // Use the overall score from quality metrics if available
    if (report.summary?.qualityMetrics?.overallScore !== undefined) {
      return report.summary.qualityMetrics.overallScore;
    }
    // Calculate pass rate as fallback
    return (report.testsPassed / report.testsRun) * 100;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string): string => {
    return status === 'passed' ? 'text-green-600' : 'text-red-600';
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const groupIssuesBySeverity = () => {
    const grouped: Record<string, Issue[]> = {
      critical: [],
      error: [],
      warning: [],
      info: []
    };

    // Create issues from failed tests since issues are not in the interface
    const issues = report.results
      .filter((r: AudioTestResult) => r.status === 'failed')
      .map((result: AudioTestResult) => ({
        severity: 'error' as const,
        title: result.testName.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        description: result.message,
        suggestion: getTestSuggestion(result.testName)
      }));

    issues.forEach((issue: Issue) => {
      grouped[issue.severity]?.push(issue);
    });

    return grouped;
  };

  const getTestSuggestion = (testName: string): string => {
    switch (testName) {
      case 'clipping-detection':
        return 'Reduce input levels or apply limiting to prevent clipping.';
      case 'dynamic-range':
        return 'Reduce compression to improve dynamic range.';
      case 'noise-analysis':
        return 'Apply noise reduction or use better recording environment.';
      case 'loudness-analysis':
        return 'Adjust overall level to meet loudness standards.';
      case 'file-validation':
        return 'Ensure audio format meets specifications.';
      default:
        return 'Review test results and adjust audio processing accordingly.';
    }
  };

  const overallScore = getOverallScore();
  const passedTests = report.testsPassed;
  const totalTests = report.testsRun;
  const completionTime = report.duration;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Test Results</h2>
            <p className="text-gray-600">
              Completed in {formatDuration(completionTime)}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Overall Score</div>
              <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore.toFixed(1)}%
              </div>
            </div>
            {onExportReport && (
              <button
                onClick={onExportReport}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export Report
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'details', label: 'Test Details', icon: '🔍' },
            { id: 'metrics', label: 'Quality Metrics', icon: '📈' },
            { id: 'issues', label: 'Issues', icon: '⚠️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'issues' && report.testsFailed > 0 && (
                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                  {report.testsFailed}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{totalTests}</div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{totalTests - passedTests}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {formatDuration(completionTime)}
                </div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
            </div>

            {/* Quick Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Test Status</h3>
                <div className="space-y-2">
                  {report.results.slice(0, 5).map((result: AudioTestResult, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {result.testName.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                      <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                        {result.status === 'passed' ? '✅ Passed' : '❌ Failed'}
                      </span>
                    </div>
                  ))}
                  {report.results.length > 5 && (
                    <div className="text-sm text-gray-500 text-center pt-2">
                      +{report.results.length - 5} more tests...
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Top Issues</h3>
                <div className="space-y-2">
                  {Object.values(groupIssuesBySeverity()).flat().slice(0, 3).map((issue: Issue, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-lg">{SEVERITY_ICONS[issue.severity]}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                        <div className="text-xs text-gray-600">{issue.description}</div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No issues found! 🎉
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {selectedTab === 'details' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Detailed Test Results</h3>
            {report.results.map((result: AudioTestResult, index: number) => (
              <div
                key={index}
                className={`border rounded-lg ${
                  result.status === 'passed' ? 'border-green-200' : 'border-red-200'
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedResult(
                    expandedResult === result.testName ? null : result.testName
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`text-lg ${result.status === 'passed' ? '✅' : '❌'}`}>
                        {result.status === 'passed' ? '✅' : '❌'}
                      </span>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {result.testName.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-600">{result.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Score not available in AudioTestResult interface */}
                      {result.duration && (
                        <span className="text-sm text-gray-500">
                          {formatDuration(result.duration)}
                        </span>
                      )}
                      {onRetryTest && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetryTest(result.testName);
                          }}
                          className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Retry
                        </button>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedResult === result.testName ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {expandedResult === result.testName && result.details && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Details</h5>
                    <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Metrics Tab */}
        {selectedTab === 'metrics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Quality Metrics</h3>
            {report.summary?.qualityMetrics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(report.summary.qualityMetrics).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {typeof value === 'number' ? value.toFixed(2) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📈</div>
                <p>No quality metrics available.</p>
              </div>
            )}
          </div>
        )}

        {/* Issues Tab */}
        {selectedTab === 'issues' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Issues & Recommendations</h3>

            {Object.values(groupIssuesBySeverity()).flat().length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupIssuesBySeverity()).map(([severity, issues]) => {
                  if (issues.length === 0) return null;

                  return (
                    <div key={severity}>
                      <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center space-x-2">
                        <span>{SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS]}</span>
                        <span className="capitalize">{severity} Issues ({issues.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {issues.map((issue: Issue, index: number) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]}`}
                          >
                            <h5 className="font-medium mb-1">{issue.title}</h5>
                            <p className="text-sm mb-2">{issue.description}</p>
                            {issue.suggestion && (
                              <div className="text-sm italic bg-white bg-opacity-50 p-2 rounded">
                                <strong>Suggestion:</strong> {issue.suggestion}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🎉</div>
                <p>No issues found! Your audio passed all validation checks.</p>
              </div>
            )}

            {/* Recommendations */}
            {report.summary?.recommendations && report.summary.recommendations.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-3">General Recommendations</h4>
                <div className="space-y-2">
                  {report.summary.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}