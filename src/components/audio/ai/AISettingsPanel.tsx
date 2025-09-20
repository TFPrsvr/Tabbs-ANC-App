'use client';

import React, { useState, useCallback } from 'react';
import {
  AISettings,
  AnalysisType,
  UserPreferences
} from '@/lib/audio/ai-system';

export interface AISettingsPanelProps {
  settings: AISettings;
  onUpdateSettings: (settings: Partial<AISettings>) => void;
  onResetSettings: () => void;
  onExportSettings: () => void;
  onImportSettings: (file: File) => void;
}

const ANALYSIS_TYPES: { value: AnalysisType; label: string; description: string }[] = [
  { value: 'musical-analysis', label: 'Musical Analysis', description: 'Key, tempo, genre detection' },
  { value: 'mix-analysis', label: 'Mix Analysis', description: 'Balance and frequency analysis' },
  { value: 'mastering-analysis', label: 'Mastering Analysis', description: 'Loudness and dynamics' },
  { value: 'quality-analysis', label: 'Quality Analysis', description: 'Noise and distortion detection' },
  { value: 'harmonic-analysis', label: 'Harmonic Analysis', description: 'Frequency content analysis' },
  { value: 'structure-analysis', label: 'Structure Analysis', description: 'Song structure detection' },
  { value: 'genre-classification', label: 'Genre Classification', description: 'Automatic genre detection' },
  { value: 'mood-analysis', label: 'Mood Analysis', description: 'Emotional content analysis' }
];

const GENRES = [
  'rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'blues',
  'folk', 'metal', 'punk', 'reggae', 'funk', 'soul', 'r&b', 'ambient'
];

export function AISettingsPanel({
  settings,
  onUpdateSettings,
  onResetSettings,
  onExportSettings,
  onImportSettings
}: AISettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'analysis' | 'suggestions' | 'preferences' | 'advanced'>('general');
  const [dragOver, setDragOver] = useState(false);

  const updateSettings = useCallback((updates: Partial<AISettings>) => {
    onUpdateSettings(updates);
  }, [onUpdateSettings]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    onUpdateSettings({
      userPreferences: { ...settings.userPreferences, ...updates }
    });
  }, [settings.userPreferences, onUpdateSettings]);

  const toggleAnalysisType = useCallback((type: AnalysisType) => {
    const enabled = settings.enabledAnalysis.includes(type);
    const newEnabledAnalysis = enabled
      ? settings.enabledAnalysis.filter(t => t !== type)
      : [...settings.enabledAnalysis, type];

    updateSettings({ enabledAnalysis: newEnabledAnalysis });
  }, [settings.enabledAnalysis, updateSettings]);

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportSettings(file);
    }
  }, [onImportSettings]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      onImportSettings(file);
    }
  }, [onImportSettings]);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Settings</h2>
          <p className="text-gray-600">Configure AI analysis and suggestions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onExportSettings}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Export Settings
          </button>
          <button
            onClick={onResetSettings}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['general', 'analysis', 'suggestions', 'preferences', 'advanced'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Auto Analysis</h3>
                <p className="text-sm text-gray-600">Automatically analyze audio when loaded</p>
              </div>
              <button
                onClick={() => updateSettings({ autoAnalysis: !settings.autoAnalysis })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.autoAnalysis ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoAnalysis ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Real-time Analysis</h3>
                <p className="text-sm text-gray-600">Analyze audio during playback</p>
              </div>
              <button
                onClick={() => updateSettings({ realTimeAnalysis: !settings.realTimeAnalysis })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.realTimeAnalysis ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.realTimeAnalysis ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Machine Learning</h3>
                <p className="text-sm text-gray-600">Learn from your feedback to improve suggestions</p>
              </div>
              <button
                onClick={() => updateSettings({ enableLearning: !settings.enableLearning })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.enableLearning ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enableLearning ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analysis Interval (Real-time mode)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={settings.analysisInterval}
                  onChange={(e) => updateSettings({ analysisInterval: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-16">
                  {settings.analysisInterval}ms
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Enabled Analysis Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ANALYSIS_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      settings.enabledAnalysis.includes(type.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleAnalysisType(type.value)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.enabledAnalysis.includes(type.value)}
                        onChange={() => toggleAnalysisType(type.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggestion Confidence Threshold
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.suggestionThreshold}
                  onChange={(e) => updateSettings({ suggestionThreshold: parseFloat(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-16">
                  {(settings.suggestionThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Only show suggestions with confidence above this threshold
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Suggestions
              </label>
              <select
                value={settings.maxSuggestions}
                onChange={(e) => updateSettings({ maxSuggestions: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 suggestions</option>
                <option value={5}>5 suggestions</option>
                <option value={10}>10 suggestions</option>
                <option value={20}>20 suggestions</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Genres</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {GENRES.map((genre) => (
                  <div key={genre} className="flex items-center">
                    <input
                      type="checkbox"
                      id={genre}
                      checked={settings.userPreferences.preferredGenres.includes(genre)}
                      onChange={(e) => {
                        const genres = e.target.checked
                          ? [...settings.userPreferences.preferredGenres, genre]
                          : settings.userPreferences.preferredGenres.filter(g => g !== genre);
                        updatePreferences({ preferredGenres: genres });
                      }}
                      className="mr-2"
                    />
                    <label htmlFor={genre} className="text-sm text-gray-700 capitalize">
                      {genre}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mixing Style</label>
              <select
                value={settings.userPreferences.mixingStyle}
                onChange={(e) => updatePreferences({ mixingStyle: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="conservative">Conservative - Minimal processing</option>
                <option value="moderate">Moderate - Balanced approach</option>
                <option value="aggressive">Aggressive - Heavy processing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Creativity Level: {(settings.userPreferences.creativityLevel * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.userPreferences.creativityLevel}
                onChange={(e) => updatePreferences({ creativityLevel: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technical Focus: {(settings.userPreferences.technicalFocus * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.userPreferences.technicalFocus}
                onChange={(e) => updatePreferences({ technicalFocus: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Creative Focus</span>
                <span>Technical Focus</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Automation Preference</label>
              <select
                value={settings.userPreferences.automationPreference}
                onChange={(e) => updatePreferences({ automationPreference: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual - Show suggestions only</option>
                <option value="assisted">Assisted - Ask before applying</option>
                <option value="automatic">Automatic - Apply automatically</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Frequency</label>
              <select
                value={settings.userPreferences.feedbackFrequency}
                onChange={(e) => updatePreferences({ feedbackFrequency: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="minimal">Minimal - Essential feedback only</option>
                <option value="moderate">Moderate - Balanced feedback</option>
                <option value="detailed">Detailed - Comprehensive feedback</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import/Export Settings</h3>

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
              >
                <div className="text-4xl mb-2">⚙️</div>
                <p className="text-lg font-medium text-gray-900 mb-1">Import Settings</p>
                <p className="text-sm text-gray-600 mb-4">Drop a settings file here or click to browse</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                  id="settings-import"
                />
                <label
                  htmlFor="settings-import"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer"
                >
                  Choose File
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Performance</h4>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h5 className="font-medium text-yellow-800 mb-2">Memory Usage</h5>
                <p className="text-sm text-yellow-700 mb-2">
                  AI models can use significant memory. Consider your system resources when enabling multiple analysis types.
                </p>
                <div className="text-xs text-yellow-600">
                  Current estimated usage: ~{settings.enabledAnalysis.length * 50}MB
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Data & Privacy</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Store learning data locally</span>
                    <p className="text-xs text-gray-500">Keep AI learning data on your device</p>
                  </div>
                  <input type="checkbox" defaultChecked className="mr-2" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Anonymous usage analytics</span>
                    <p className="text-xs text-gray-500">Help improve AI features (no audio data sent)</p>
                  </div>
                  <input type="checkbox" className="mr-2" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Reset Options</h4>

              <div className="space-y-2">
                <button className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                  Clear All Learning Data
                </button>
                <button className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50">
                  Reset All AI Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}