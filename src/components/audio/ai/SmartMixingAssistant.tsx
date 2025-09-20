'use client';

import React, { useState, useCallback } from 'react';
import {
  SmartMixingSession,
  AutoMixSettings,
  AutoMixResult,
  MixingPhase,
  TrackAdjustments
} from '@/lib/audio/ai-system';

export interface SmartMixingAssistantProps {
  session?: SmartMixingSession;
  mixResult?: AutoMixResult;
  onStartSmartMixing: (settings: Partial<AutoMixSettings>) => Promise<void>;
  onStopSmartMixing: () => Promise<void>;
  onApplyMixAdjustments: (trackId: string, adjustments: TrackAdjustments) => Promise<void>;
  onUpdateAutoMixSettings: (settings: Partial<AutoMixSettings>) => void;
  isProcessing: boolean;
  tracks: MixTrack[];
}

export interface MixTrack {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'bus';
  level: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

const MIXING_PHASES: { phase: MixingPhase; label: string; description: string }[] = [
  { phase: 'analysis', label: 'Analysis', description: 'Analyzing audio content and structure' },
  { phase: 'rough-mix', label: 'Rough Mix', description: 'Setting initial levels and basic processing' },
  { phase: 'detailed-mix', label: 'Detailed Mix', description: 'Fine-tuning EQ, compression, and effects' },
  { phase: 'polish', label: 'Polish', description: 'Final tweaks and creative enhancements' },
  { phase: 'mastering-prep', label: 'Master Prep', description: 'Preparing for mastering process' },
  { phase: 'complete', label: 'Complete', description: 'Mix is ready for mastering' }
];

const BALANCE_MODES = [
  { value: 'natural', label: 'Natural', description: 'Preserve original character' },
  { value: 'enhanced', label: 'Enhanced', description: 'Subtle improvements' },
  { value: 'aggressive', label: 'Aggressive', description: 'Significant processing' }
];

const SPATIAL_MODES = [
  { value: 'mono', label: 'Mono', description: 'Mono-compatible mix' },
  { value: 'stereo', label: 'Stereo', description: 'Standard stereo field' },
  { value: 'wide', label: 'Wide', description: 'Enhanced stereo width' }
];

const TONAL_BALANCES = [
  { value: 'neutral', label: 'Neutral', description: 'Balanced frequency response' },
  { value: 'warm', label: 'Warm', description: 'Enhanced low-mid warmth' },
  { value: 'bright', label: 'Bright', description: 'Enhanced high frequencies' },
  { value: 'vintage', label: 'Vintage', description: 'Classic analog character' }
];

export function SmartMixingAssistant({
  session,
  mixResult,
  onStartSmartMixing,
  onStopSmartMixing,
  onApplyMixAdjustments,
  onUpdateAutoMixSettings,
  isProcessing,
  tracks
}: SmartMixingAssistantProps) {
  const [autoMixSettings, setAutoMixSettings] = useState<Partial<AutoMixSettings>>({
    enabled: true,
    targetLoudness: -23,
    targetDynamicRange: 14,
    genreReference: 'general',
    balanceMode: 'natural',
    spatialMode: 'stereo',
    tonalBalance: 'neutral'
  });

  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const updateSettings = useCallback((updates: Partial<AutoMixSettings>) => {
    const newSettings = { ...autoMixSettings, ...updates };
    setAutoMixSettings(newSettings);
    onUpdateAutoMixSettings(newSettings);
  }, [autoMixSettings, onUpdateAutoMixSettings]);

  const handleStartMixing = useCallback(async () => {
    await onStartSmartMixing(autoMixSettings);
  }, [autoMixSettings, onStartSmartMixing]);

  const getCurrentPhaseIndex = () => {
    if (!session) return 0;
    return MIXING_PHASES.findIndex(p => p.phase === session.currentPhase);
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Mixing Assistant</h2>
          <p className="text-gray-600">AI-powered automatic mixing and optimization</p>
        </div>
        <div className="flex space-x-3">
          {session ? (
            <button
              onClick={onStopSmartMixing}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Stop Mixing
            </button>
          ) : (
            <button
              onClick={handleStartMixing}
              disabled={isProcessing || tracks.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                'Start Smart Mixing'
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Session Status */}
        {session && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-blue-900">Mixing Session Active</h3>
              <span className="text-sm text-blue-700">
                Duration: {formatDuration(Date.now() - session.startTime.getTime())}
              </span>
            </div>

            {/* Phase Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Current Phase</span>
                <span className="text-sm text-blue-700">
                  {getCurrentPhaseIndex() + 1} of {MIXING_PHASES.length}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((getCurrentPhaseIndex() + 1) / MIXING_PHASES.length) * 100}%` }}
                />
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium text-blue-900">
                  {MIXING_PHASES.find(p => p.phase === session.currentPhase)?.label}
                </div>
                <div className="text-xs text-blue-700">
                  {MIXING_PHASES.find(p => p.phase === session.currentPhase)?.description}
                </div>
              </div>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">{session.activeSuggestions.length}</div>
                <div className="text-xs text-blue-700">Active Suggestions</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">{session.appliedSuggestions.length}</div>
                <div className="text-xs text-blue-700">Applied Changes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">{session.userFeedback.length}</div>
                <div className="text-xs text-blue-700">Feedback Items</div>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Mix Settings */}
        {!session && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Auto-Mix Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Loudness (LUFS)</label>
                <input
                  type="number"
                  value={autoMixSettings.targetLoudness || -23}
                  onChange={(e) => updateSettings({ targetLoudness: parseFloat(e.target.value) })}
                  step="0.1"
                  min="-40"
                  max="-6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dynamic Range (LU)</label>
                <input
                  type="number"
                  value={autoMixSettings.targetDynamicRange || 14}
                  onChange={(e) => updateSettings({ targetDynamicRange: parseFloat(e.target.value) })}
                  step="0.1"
                  min="6"
                  max="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Balance Mode</label>
                <select
                  value={autoMixSettings.balanceMode || 'natural'}
                  onChange={(e) => updateSettings({ balanceMode: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BALANCE_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label} - {mode.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Spatial Mode</label>
                <select
                  value={autoMixSettings.spatialMode || 'stereo'}
                  onChange={(e) => updateSettings({ spatialMode: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SPATIAL_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label} - {mode.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tonal Balance</label>
                <select
                  value={autoMixSettings.tonalBalance || 'neutral'}
                  onChange={(e) => updateSettings({ tonalBalance: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TONAL_BALANCES.map((balance) => (
                    <option key={balance.value} value={balance.value}>
                      {balance.label} - {balance.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Genre Reference</label>
                <input
                  type="text"
                  value={autoMixSettings.genreReference || 'general'}
                  onChange={(e) => updateSettings({ genreReference: e.target.value })}
                  placeholder="e.g., rock, pop, jazz, classical"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-700"
              >
                <svg
                  className={`w-4 h-4 mr-1 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Advanced Settings
              </button>
            </div>

            {/* Advanced Settings */}
            {showAdvancedSettings && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h4 className="font-medium text-gray-900">Processing Chain</h4>
                <div className="space-y-3">
                  {['leveling', 'eq', 'compression', 'spatial', 'effects'].map((process) => (
                    <div key={process} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={process}
                          defaultChecked={process !== 'effects'}
                          className="mr-2"
                        />
                        <label htmlFor={process} className="text-sm text-gray-700 capitalize">
                          {process}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Intensity:</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          defaultValue={process === 'effects' ? 30 : 60}
                          className="w-20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mix Results */}
        {mixResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Mix Results</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Confidence:</span>
                <span className={`font-medium ${
                  mixResult.confidence >= 0.8 ? 'text-green-600' :
                  mixResult.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(mixResult.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Track Adjustments */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Track Adjustments</h4>
              <div className="space-y-2">
                {Array.from(mixResult.trackAdjustments.entries()).map(([trackId, adjustments]) => {
                  const track = tracks.find(t => t.id === trackId);
                  if (!track) return null;

                  const isExpanded = expandedTrack === trackId;

                  return (
                    <div key={trackId} className="border border-gray-200 rounded-lg">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedTrack(isExpanded ? null : trackId)}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{track.name}</span>
                          <span className="text-sm text-gray-500">
                            Level: {adjustments.level > 0 ? '+' : ''}{adjustments.level.toFixed(1)}dB
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyMixAdjustments(trackId, adjustments);
                            }}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                          >
                            Apply
                          </button>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-200 p-3 bg-gray-50">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Level:</span>
                              <span className="ml-2 font-medium">{adjustments.level.toFixed(1)} dB</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Pan:</span>
                              <span className="ml-2 font-medium">
                                {adjustments.pan === 0 ? 'Center' :
                                 adjustments.pan > 0 ? `${(adjustments.pan * 100).toFixed(0)}% R` :
                                 `${Math.abs(adjustments.pan * 100).toFixed(0)}% L`}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">High-pass:</span>
                              <span className="ml-2 font-medium">{adjustments.eq.lowCut} Hz</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Low-pass:</span>
                              <span className="ml-2 font-medium">{adjustments.eq.highCut} Hz</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Comp Threshold:</span>
                              <span className="ml-2 font-medium">{adjustments.compression.threshold} dB</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Comp Ratio:</span>
                              <span className="ml-2 font-medium">{adjustments.compression.ratio}:1</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mix Bus Processing */}
            {mixResult.mixBusProcessing.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Mix Bus Processing</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  {mixResult.mixBusProcessing.map((process, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{process.type}</span>
                      <span className="text-xs text-gray-500">
                        {JSON.stringify(process.parameters)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Suggestions */}
            {mixResult.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Additional Suggestions</h4>
                <div className="space-y-2">
                  {mixResult.suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="font-medium text-blue-900">{suggestion.title}</div>
                      <div className="text-sm text-blue-700 mt-1">{suggestion.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Tracks Message */}
        {!session && tracks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎚️</div>
            <p>No tracks available for mixing.</p>
            <p className="text-sm">Load some audio tracks to use the smart mixing assistant.</p>
          </div>
        )}
      </div>
    </div>
  );
}