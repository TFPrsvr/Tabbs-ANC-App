'use client';

import React, { useState, useCallback } from 'react';
import {
  AIAnalysisResult,
  AnalysisType,
  AnalysisData,
  AudioSection,
  FrequencyBalance
} from '@/lib/audio/ai-system';

export interface AIAnalysisPanelProps {
  analysisResults: AIAnalysisResult[];
  isAnalyzing: boolean;
  onStartAnalysis: (audioId: string, types: AnalysisType[]) => Promise<void>;
  onClearResults: () => void;
  availableAudioTracks: AudioTrack[];
}

export interface AudioTrack {
  id: string;
  name: string;
  duration: number;
  hasBuffer: boolean;
}

const ANALYSIS_TYPES: { value: AnalysisType; label: string; description: string; icon: string }[] = [
  {
    value: 'musical-analysis',
    label: 'Musical Analysis',
    description: 'Key, tempo, genre, and mood detection',
    icon: '🎵'
  },
  {
    value: 'mix-analysis',
    label: 'Mix Analysis',
    description: 'Balance, dynamics, and frequency analysis',
    icon: '🎚️'
  },
  {
    value: 'mastering-analysis',
    label: 'Mastering Analysis',
    description: 'Loudness, dynamics, and master bus analysis',
    icon: '🎛️'
  },
  {
    value: 'quality-analysis',
    label: 'Quality Analysis',
    description: 'Noise, distortion, and technical issues',
    icon: '🔍'
  },
  {
    value: 'harmonic-analysis',
    label: 'Harmonic Analysis',
    description: 'Frequency content and harmonic structure',
    icon: '〰️'
  },
  {
    value: 'structure-analysis',
    label: 'Structure Analysis',
    description: 'Song sections and arrangement analysis',
    icon: '🏗️'
  },
  {
    value: 'genre-classification',
    label: 'Genre Classification',
    description: 'Automatic genre and style detection',
    icon: '🏷️'
  },
  {
    value: 'mood-analysis',
    label: 'Mood Analysis',
    description: 'Emotional content and energy analysis',
    icon: '😊'
  }
];

export function AIAnalysisPanel({
  analysisResults,
  isAnalyzing,
  onStartAnalysis,
  onClearResults,
  availableAudioTracks
}: AIAnalysisPanelProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<AnalysisType[]>([
    'musical-analysis',
    'mix-analysis',
    'quality-analysis'
  ]);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const handleAnalysisTypeToggle = useCallback((type: AnalysisType) => {
    setSelectedAnalysisTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (selectedTrack && selectedAnalysisTypes.length > 0) {
      await onStartAnalysis(selectedTrack, selectedAnalysisTypes);
    }
  }, [selectedTrack, selectedAnalysisTypes, onStartAnalysis]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const formatAnalysisType = (type: AnalysisType) => {
    return ANALYSIS_TYPES.find(t => t.value === type)?.label || type;
  };

  const renderAnalysisData = (data: AnalysisData, type: AnalysisType) => {
    switch (type) {
      case 'musical-analysis':
        return (
          <div className="grid grid-cols-2 gap-4">
            {data.key && (
              <div>
                <span className="text-sm text-gray-600">Key:</span>
                <span className="ml-2 font-medium">{data.key}</span>
              </div>
            )}
            {data.tempo && (
              <div>
                <span className="text-sm text-gray-600">Tempo:</span>
                <span className="ml-2 font-medium">{data.tempo} BPM</span>
              </div>
            )}
            {data.timeSignature && (
              <div>
                <span className="text-sm text-gray-600">Time Signature:</span>
                <span className="ml-2 font-medium">{data.timeSignature[0]}/{data.timeSignature[1]}</span>
              </div>
            )}
            {data.genre && (
              <div>
                <span className="text-sm text-gray-600">Genre:</span>
                <span className="ml-2 font-medium capitalize">{data.genre}</span>
              </div>
            )}
            {data.mood && (
              <div>
                <span className="text-sm text-gray-600">Mood:</span>
                <span className="ml-2 font-medium capitalize">{data.mood}</span>
              </div>
            )}
            {typeof data.energy === 'number' && (
              <div>
                <span className="text-sm text-gray-600">Energy:</span>
                <div className="ml-2 flex items-center">
                  <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                    <div
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${data.energy * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{(data.energy * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'mix-analysis':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {typeof data.dynamicRange === 'number' && (
                <div>
                  <span className="text-sm text-gray-600">Dynamic Range:</span>
                  <span className="ml-2 font-medium">{data.dynamicRange.toFixed(1)} dB</span>
                </div>
              )}
              {typeof data.loudnessLUFS === 'number' && (
                <div>
                  <span className="text-sm text-gray-600">Loudness:</span>
                  <span className="ml-2 font-medium">{data.loudnessLUFS.toFixed(1)} LUFS</span>
                </div>
              )}
              {typeof data.peakLevel === 'number' && (
                <div>
                  <span className="text-sm text-gray-600">Peak Level:</span>
                  <span className="ml-2 font-medium">{data.peakLevel.toFixed(1)} dB</span>
                </div>
              )}
              {typeof data.stereoWidth === 'number' && (
                <div>
                  <span className="text-sm text-gray-600">Stereo Width:</span>
                  <span className="ml-2 font-medium">{(data.stereoWidth * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>

            {data.frequencyBalance && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Frequency Balance</h4>
                <div className="space-y-2">
                  {Object.entries(data.frequencyBalance).map(([band, value]) => (
                    <div key={band} className="flex items-center">
                      <span className="text-xs text-gray-600 w-16 capitalize">
                        {band.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <div className="flex-1 mx-2 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${value * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-10">
                        {(value * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'quality-analysis':
        return (
          <div className="space-y-3">
            {typeof data.noisiness === 'number' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Noise Level:</span>
                <span className={`font-medium ${data.noisiness > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                  {data.noisiness > 0.05 ? 'High' : 'Low'}
                </span>
              </div>
            )}
            {typeof data.distortion === 'number' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Distortion:</span>
                <span className={`font-medium ${data.distortion > 0.03 ? 'text-red-600' : 'text-green-600'}`}>
                  {(data.distortion * 100).toFixed(2)}%
                </span>
              </div>
            )}
            {typeof data.clipping === 'boolean' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Clipping:</span>
                <span className={`font-medium ${data.clipping ? 'text-red-600' : 'text-green-600'}`}>
                  {data.clipping ? 'Detected' : 'None'}
                </span>
              </div>
            )}
            {typeof data.phaseIssues === 'boolean' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Phase Issues:</span>
                <span className={`font-medium ${data.phaseIssues ? 'text-red-600' : 'text-green-600'}`}>
                  {data.phaseIssues ? 'Detected' : 'None'}
                </span>
              </div>
            )}
          </div>
        );

      case 'structure-analysis':
        return (
          <div>
            {data.sections && data.sections.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Song Structure</h4>
                <div className="space-y-1">
                  {data.sections.map((section, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{section.type}</span>
                      <span className="text-gray-500">
                        {section.start.toFixed(1)}s - {section.end.toFixed(1)}s
                      </span>
                      <span className={`px-2 py-1 rounded-full ${getConfidenceColor(section.confidence)}`}>
                        {(section.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Analysis completed. Detailed results available in the raw data.
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Audio Analysis</h2>
          <p className="text-gray-600">Intelligent analysis of your audio content</p>
        </div>
        <div className="flex space-x-3">
          {analysisResults.length > 0 && (
            <button
              onClick={onClearResults}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Analysis Configuration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Start New Analysis</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Audio Track</label>
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isAnalyzing}
              >
                <option value="">Choose a track...</option>
                {availableAudioTracks.map((track) => (
                  <option key={track.id} value={track.id} disabled={!track.hasBuffer}>
                    {track.name} {!track.hasBuffer && '(No audio data)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Analysis Types</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ANALYSIS_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedAnalysisTypes.includes(type.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleAnalysisTypeToggle(type.value)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedAnalysisTypes.includes(type.value)}
                        onChange={() => handleAnalysisTypeToggle(type.value)}
                        className="mr-3"
                        disabled={isAnalyzing}
                      />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{type.icon}</span>
                          <span className="font-medium text-gray-900">{type.label}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={!selectedTrack || selectedAnalysisTypes.length === 0 || isAnalyzing}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Start Analysis'
              )}
            </button>
          </div>
        </div>

        {/* Analysis Results */}
        {analysisResults.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Analysis Results</h3>
            {analysisResults.map((result) => (
              <div key={result.id} className="border border-gray-200 rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {ANALYSIS_TYPES.find(t => t.value === result.analysisType)?.icon || '🔬'}
                    </span>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {formatAnalysisType(result.analysisType)}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {result.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getConfidenceColor(result.confidence)}`}>
                        {getConfidenceLabel(result.confidence)} Confidence
                      </div>
                      <div className="text-xs text-gray-500">
                        {(result.confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <svg
                        className={`w-5 h-5 transition-transform ${expandedResult === result.id ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {expandedResult === result.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {renderAnalysisData(result.results, result.analysisType)}

                    {result.suggestions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Generated Suggestions</h5>
                        <div className="space-y-2">
                          {result.suggestions.map((suggestion) => (
                            <div key={suggestion.id} className="text-sm text-blue-600">
                              • {suggestion.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !isAnalyzing ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🤖</div>
            <p>No analysis results yet.</p>
            <p className="text-sm">Select a track and analysis types to get started.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}