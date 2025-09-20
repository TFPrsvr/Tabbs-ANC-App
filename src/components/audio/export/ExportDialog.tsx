'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  ExportSettings,
  AudioFormat,
  QualityPreset,
  ExportJob,
  MasteringSettings,
  NormalizationSettings,
  AudioMetadata,
  StemExportSettings
} from '@/lib/audio/export-system';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => Promise<void>;
  availablePresets: QualityPreset[];
  masteringPresets: { [key: string]: MasteringSettings };
  projectName: string;
  duration: number;
}

const AUDIO_FORMATS: AudioFormat[] = [
  { type: 'wav' },
  { type: 'mp3' },
  { type: 'flac' },
  { type: 'aac' },
  { type: 'ogg' },
  { type: 'aiff' },
  { type: 'm4a' }
];

const SAMPLE_RATES = [44100, 48000, 88200, 96000, 176400, 192000];
const BIT_DEPTHS = [16, 24, 32];
const BITRATES = [128, 192, 256, 320];

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  availablePresets,
  masteringPresets,
  projectName,
  duration
}: ExportDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>({
    format: { type: 'wav' },
    quality: availablePresets[0] || {
      name: 'CD Quality',
      sampleRate: 44100,
      bitDepth: 16,
      description: 'Standard CD quality',
      targetUse: 'broadcast'
    },
    sampleRate: 44100,
    bitDepth: 16,
    channels: 2,
    dithering: false,
    normalization: {
      enabled: false,
      type: 'peak',
      targetLevel: -0.1,
      truePeak: false,
      truePeakLimit: -1
    },
    mastering: masteringPresets.default || {
      enabled: false,
      limiter: {
        enabled: false,
        threshold: -0.1,
        ceiling: -0.1,
        release: 50,
        lookahead: 5,
        mode: 'transparent'
      },
      eq: {
        enabled: false,
        lowShelf: { frequency: 100, gain: 0, q: 0.7, enabled: false },
        lowMid: { frequency: 500, gain: 0, q: 1.0, enabled: false },
        highMid: { frequency: 3000, gain: 0, q: 1.0, enabled: false },
        highShelf: { frequency: 10000, gain: 0, q: 0.7, enabled: false }
      },
      dynamics: {
        compressor: {
          enabled: false,
          threshold: -12,
          ratio: 3,
          attack: 10,
          release: 100,
          knee: 2,
          makeupGain: 0
        },
        multiband: {
          enabled: false,
          bands: [],
          crossoverFrequencies: [200, 2000]
        }
      },
      stereoEnhancement: {
        enabled: false,
        width: 1.0,
        bass: 0,
        imaging: 0,
        correlation: 1.0
      },
      loudnessProcessing: {
        enabled: false,
        standard: 'ebu-r128',
        targetLufs: -23,
        maxTruePeak: -1,
        gating: true
      }
    },
    metadata: {
      title: projectName,
      artist: '',
      album: '',
      genre: '',
      year: new Date().getFullYear()
    },
    stemExport: {
      enabled: false,
      stems: [],
      format: { type: 'wav' },
      naming: {
        template: '{project}-{stem}',
        includeProjectName: true,
        includeTimestamp: false,
        includeVersion: false,
        separator: '-'
      },
      includeEffects: true,
      includeSends: false
    }
  });

  const [activeTab, setActiveTab] = useState<'format' | 'mastering' | 'metadata' | 'stems'>('format');
  const [isExporting, setIsExporting] = useState(false);

  const updateSettings = useCallback((updates: Partial<ExportSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateNested = useCallback((path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  }, []);

  const handlePresetChange = useCallback((preset: QualityPreset) => {
    setSettings(prev => ({
      ...prev,
      quality: preset,
      sampleRate: preset.sampleRate,
      bitDepth: preset.bitDepth || 16,
      bitrate: preset.bitrate
    }));
  }, []);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      await onExport(settings);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [settings, onExport, onClose]);

  const estimatedFileSize = useCallback(() => {
    const bytesPerSample = settings.bitDepth / 8;
    const totalSamples = settings.sampleRate * duration * settings.channels;
    const sizeInBytes = totalSamples * bytesPerSample;

    if (settings.format.type === 'mp3' && settings.bitrate) {
      return (settings.bitrate * 1000 * duration) / 8;
    }

    return sizeInBytes;
  }, [settings, duration]);

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Export Audio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isExporting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {['format', 'mastering', 'metadata', 'stems'].map((tab) => (
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

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'format' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality Preset
                  </label>
                  <select
                    value={settings.quality.name}
                    onChange={(e) => {
                      const preset = availablePresets.find(p => p.name === e.target.value);
                      if (preset) handlePresetChange(preset);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availablePresets.map((preset) => (
                      <option key={preset.name} value={preset.name}>
                        {preset.name} - {preset.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format
                  </label>
                  <select
                    value={settings.format.type}
                    onChange={(e) => updateNested('format.type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AUDIO_FORMATS.map((format) => (
                      <option key={format.type} value={format.type}>
                        {format.type.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sample Rate (Hz)
                  </label>
                  <select
                    value={settings.sampleRate}
                    onChange={(e) => updateSettings({ sampleRate: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SAMPLE_RATES.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate.toLocaleString()} Hz
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bit Depth
                  </label>
                  <select
                    value={settings.bitDepth}
                    onChange={(e) => updateSettings({ bitDepth: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={settings.format.type === 'mp3'}
                  >
                    {BIT_DEPTHS.map((depth) => (
                      <option key={depth} value={depth}>
                        {depth} bit
                      </option>
                    ))}
                  </select>
                </div>

                {settings.format.type === 'mp3' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bitrate (kbps)
                    </label>
                    <select
                      value={settings.bitrate || 320}
                      onChange={(e) => updateSettings({ bitrate: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {BITRATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate} kbps
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channels
                  </label>
                  <select
                    value={settings.channels}
                    onChange={(e) => updateSettings({ channels: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Mono</option>
                    <option value={2}>Stereo</option>
                    <option value={6}>5.1 Surround</option>
                    <option value={8}>7.1 Surround</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="dithering"
                    checked={settings.dithering}
                    onChange={(e) => updateSettings({ dithering: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="dithering" className="text-sm text-gray-700">
                    Apply dithering (recommended for bit depth reduction)
                  </label>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Normalization</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="normalization"
                        checked={settings.normalization.enabled}
                        onChange={(e) => updateNested('normalization.enabled', e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="normalization" className="text-sm text-gray-700">
                        Enable normalization
                      </label>
                    </div>

                    {settings.normalization.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Type</label>
                          <select
                            value={settings.normalization.type}
                            onChange={(e) => updateNested('normalization.type', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value="peak">Peak</option>
                            <option value="lufs">LUFS</option>
                            <option value="rms">RMS</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Target Level (dB)</label>
                          <input
                            type="number"
                            value={settings.normalization.targetLevel}
                            onChange={(e) => updateNested('normalization.targetLevel', parseFloat(e.target.value))}
                            step="0.1"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-blue-900">Estimated File Size</h4>
                      <p className="text-sm text-blue-700">
                        Duration: {duration.toFixed(1)}s
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-900">
                        {formatFileSize(estimatedFileSize())}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mastering' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Mastering Processing</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="masteringEnabled"
                    checked={settings.mastering.enabled}
                    onChange={(e) => updateNested('mastering.enabled', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="masteringEnabled" className="text-sm text-gray-700">
                    Enable Mastering
                  </label>
                </div>
              </div>

              {settings.mastering.enabled && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Limiter</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="limiterEnabled"
                          checked={settings.mastering.limiter.enabled}
                          onChange={(e) => updateNested('mastering.limiter.enabled', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="limiterEnabled" className="text-sm text-gray-700">
                          Enable Limiter
                        </label>
                      </div>

                      {settings.mastering.limiter.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Threshold (dB)</label>
                            <input
                              type="number"
                              value={settings.mastering.limiter.threshold}
                              onChange={(e) => updateNested('mastering.limiter.threshold', parseFloat(e.target.value))}
                              step="0.1"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Ceiling (dB)</label>
                            <input
                              type="number"
                              value={settings.mastering.limiter.ceiling}
                              onChange={(e) => updateNested('mastering.limiter.ceiling', parseFloat(e.target.value))}
                              step="0.1"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Release (ms)</label>
                            <input
                              type="number"
                              value={settings.mastering.limiter.release}
                              onChange={(e) => updateNested('mastering.limiter.release', parseFloat(e.target.value))}
                              step="1"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Mode</label>
                            <select
                              value={settings.mastering.limiter.mode}
                              onChange={(e) => updateNested('mastering.limiter.mode', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              <option value="transparent">Transparent</option>
                              <option value="punchy">Punchy</option>
                              <option value="vintage">Vintage</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Compressor</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="compressorEnabled"
                          checked={settings.mastering.dynamics.compressor.enabled}
                          onChange={(e) => updateNested('mastering.dynamics.compressor.enabled', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="compressorEnabled" className="text-sm text-gray-700">
                          Enable Compressor
                        </label>
                      </div>

                      {settings.mastering.dynamics.compressor.enabled && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Threshold (dB)</label>
                            <input
                              type="number"
                              value={settings.mastering.dynamics.compressor.threshold}
                              onChange={(e) => updateNested('mastering.dynamics.compressor.threshold', parseFloat(e.target.value))}
                              step="0.1"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Ratio</label>
                            <input
                              type="number"
                              value={settings.mastering.dynamics.compressor.ratio}
                              onChange={(e) => updateNested('mastering.dynamics.compressor.ratio', parseFloat(e.target.value))}
                              step="0.1"
                              min="1"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Attack (ms)</label>
                            <input
                              type="number"
                              value={settings.mastering.dynamics.compressor.attack}
                              onChange={(e) => updateNested('mastering.dynamics.compressor.attack', parseFloat(e.target.value))}
                              step="1"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Audio Metadata</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={settings.metadata.title || ''}
                    onChange={(e) => updateNested('metadata.title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Artist</label>
                  <input
                    type="text"
                    value={settings.metadata.artist || ''}
                    onChange={(e) => updateNested('metadata.artist', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Album</label>
                  <input
                    type="text"
                    value={settings.metadata.album || ''}
                    onChange={(e) => updateNested('metadata.album', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                  <input
                    type="text"
                    value={settings.metadata.genre || ''}
                    onChange={(e) => updateNested('metadata.genre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={settings.metadata.year || ''}
                    onChange={(e) => updateNested('metadata.year', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Track Number</label>
                  <input
                    type="number"
                    value={settings.metadata.track || ''}
                    onChange={(e) => updateNested('metadata.track', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stems' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Stem Export</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="stemExportEnabled"
                    checked={settings.stemExport.enabled}
                    onChange={(e) => updateNested('stemExport.enabled', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="stemExportEnabled" className="text-sm text-gray-700">
                    Export Individual Stems
                  </label>
                </div>
              </div>

              {settings.stemExport.enabled && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Stem Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stem Format</label>
                        <select
                          value={settings.stemExport.format.type}
                          onChange={(e) => updateNested('stemExport.format.type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {AUDIO_FORMATS.map((format) => (
                            <option key={format.type} value={format.type}>
                              {format.type.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Naming Template</label>
                        <input
                          type="text"
                          value={settings.stemExport.naming.template}
                          onChange={(e) => updateNested('stemExport.naming.template', e.target.value)}
                          placeholder="{project}-{stem}"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="includeEffects"
                          checked={settings.stemExport.includeEffects}
                          onChange={(e) => updateNested('stemExport.includeEffects', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="includeEffects" className="text-sm text-gray-700">
                          Include track effects in stems
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="includeSends"
                          checked={settings.stemExport.includeSends}
                          onChange={(e) => updateNested('stemExport.includeSends', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="includeSends" className="text-sm text-gray-700">
                          Include send effects in stems
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="includeTimestamp"
                          checked={settings.stemExport.naming.includeTimestamp}
                          onChange={(e) => updateNested('stemExport.naming.includeTimestamp', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="includeTimestamp" className="text-sm text-gray-700">
                          Include timestamp in filename
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Stem definitions need to be configured in your project settings.
                      This dialog will export based on your current stem configuration.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Estimated export time: {Math.ceil(duration / 10)} seconds
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                'Start Export'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}