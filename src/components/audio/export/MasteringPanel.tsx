'use client';

import React, { useState, useCallback } from 'react';
import {
  MasteringSettings,
  LimiterSettings,
  EQSettings,
  CompressorSettings,
  StereoSettings,
  LoudnessSettings
} from '@/lib/audio/export-system';

export interface MasteringPanelProps {
  settings: MasteringSettings;
  onChange: (settings: MasteringSettings) => void;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function MasteringPanel({
  settings,
  onChange,
  isEnabled,
  onToggle
}: MasteringPanelProps) {
  const [activeSection, setActiveSection] = useState<'eq' | 'dynamics' | 'stereo' | 'loudness'>('eq');

  const updateNested = useCallback((path: string, value: any) => {
    const newSettings = { ...settings };
    const keys = path.split('.');
    let current: any = newSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    onChange(newSettings);
  }, [settings, onChange]);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Mastering Suite</h3>
        <div className="flex items-center">
          <span className="mr-2 text-sm text-gray-600">Enable</span>
          <button
            onClick={() => onToggle(!isEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {isEnabled && (
        <div>
          <div className="flex border-b border-gray-200">
            {['eq', 'dynamics', 'stereo', 'loudness'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section as any)}
                className={`px-4 py-3 text-sm font-medium transition-colors capitalize ${
                  activeSection === section
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {section === 'eq' ? 'EQ' : section}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeSection === 'eq' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Equalizer</h4>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="eqEnabled"
                      checked={settings.eq.enabled}
                      onChange={(e) => updateNested('eq.enabled', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="eqEnabled" className="text-sm text-gray-700">
                      Enable EQ
                    </label>
                  </div>
                </div>

                {settings.eq.enabled && (
                  <div className="space-y-6">
                    {/* Low Shelf */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-800">Low Shelf</h5>
                        <input
                          type="checkbox"
                          checked={settings.eq.lowShelf.enabled}
                          onChange={(e) => updateNested('eq.lowShelf.enabled', e.target.checked)}
                          className="mr-2"
                        />
                      </div>
                      {settings.eq.lowShelf.enabled && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Frequency (Hz)</label>
                            <input
                              type="number"
                              value={settings.eq.lowShelf.frequency}
                              onChange={(e) => updateNested('eq.lowShelf.frequency', parseFloat(e.target.value))}
                              step="10"
                              min="20"
                              max="500"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Gain (dB)</label>
                            <input
                              type="number"
                              value={settings.eq.lowShelf.gain}
                              onChange={(e) => updateNested('eq.lowShelf.gain', parseFloat(e.target.value))}
                              step="0.1"
                              min="-12"
                              max="12"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Q</label>
                            <input
                              type="number"
                              value={settings.eq.lowShelf.q}
                              onChange={(e) => updateNested('eq.lowShelf.q', parseFloat(e.target.value))}
                              step="0.1"
                              min="0.1"
                              max="10"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Low Mid */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-800">Low Mid</h5>
                        <input
                          type="checkbox"
                          checked={settings.eq.lowMid.enabled}
                          onChange={(e) => updateNested('eq.lowMid.enabled', e.target.checked)}
                          className="mr-2"
                        />
                      </div>
                      {settings.eq.lowMid.enabled && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Frequency (Hz)</label>
                            <input
                              type="number"
                              value={settings.eq.lowMid.frequency}
                              onChange={(e) => updateNested('eq.lowMid.frequency', parseFloat(e.target.value))}
                              step="10"
                              min="200"
                              max="2000"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Gain (dB)</label>
                            <input
                              type="number"
                              value={settings.eq.lowMid.gain}
                              onChange={(e) => updateNested('eq.lowMid.gain', parseFloat(e.target.value))}
                              step="0.1"
                              min="-12"
                              max="12"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Q</label>
                            <input
                              type="number"
                              value={settings.eq.lowMid.q}
                              onChange={(e) => updateNested('eq.lowMid.q', parseFloat(e.target.value))}
                              step="0.1"
                              min="0.1"
                              max="10"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* High Mid */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-800">High Mid</h5>
                        <input
                          type="checkbox"
                          checked={settings.eq.highMid.enabled}
                          onChange={(e) => updateNested('eq.highMid.enabled', e.target.checked)}
                          className="mr-2"
                        />
                      </div>
                      {settings.eq.highMid.enabled && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Frequency (Hz)</label>
                            <input
                              type="number"
                              value={settings.eq.highMid.frequency}
                              onChange={(e) => updateNested('eq.highMid.frequency', parseFloat(e.target.value))}
                              step="100"
                              min="1000"
                              max="10000"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Gain (dB)</label>
                            <input
                              type="number"
                              value={settings.eq.highMid.gain}
                              onChange={(e) => updateNested('eq.highMid.gain', parseFloat(e.target.value))}
                              step="0.1"
                              min="-12"
                              max="12"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Q</label>
                            <input
                              type="number"
                              value={settings.eq.highMid.q}
                              onChange={(e) => updateNested('eq.highMid.q', parseFloat(e.target.value))}
                              step="0.1"
                              min="0.1"
                              max="10"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* High Shelf */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-800">High Shelf</h5>
                        <input
                          type="checkbox"
                          checked={settings.eq.highShelf.enabled}
                          onChange={(e) => updateNested('eq.highShelf.enabled', e.target.checked)}
                          className="mr-2"
                        />
                      </div>
                      {settings.eq.highShelf.enabled && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Frequency (Hz)</label>
                            <input
                              type="number"
                              value={settings.eq.highShelf.frequency}
                              onChange={(e) => updateNested('eq.highShelf.frequency', parseFloat(e.target.value))}
                              step="100"
                              min="5000"
                              max="20000"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Gain (dB)</label>
                            <input
                              type="number"
                              value={settings.eq.highShelf.gain}
                              onChange={(e) => updateNested('eq.highShelf.gain', parseFloat(e.target.value))}
                              step="0.1"
                              min="-12"
                              max="12"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Q</label>
                            <input
                              type="number"
                              value={settings.eq.highShelf.q}
                              onChange={(e) => updateNested('eq.highShelf.q', parseFloat(e.target.value))}
                              step="0.1"
                              min="0.1"
                              max="10"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'dynamics' && (
              <div className="space-y-6">
                {/* Compressor */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Compressor</h4>
                    <input
                      type="checkbox"
                      checked={settings.dynamics.compressor.enabled}
                      onChange={(e) => updateNested('dynamics.compressor.enabled', e.target.checked)}
                      className="mr-2"
                    />
                  </div>

                  {settings.dynamics.compressor.enabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Threshold (dB)</label>
                          <input
                            type="number"
                            value={settings.dynamics.compressor.threshold}
                            onChange={(e) => updateNested('dynamics.compressor.threshold', parseFloat(e.target.value))}
                            step="0.1"
                            min="-60"
                            max="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ratio</label>
                          <input
                            type="number"
                            value={settings.dynamics.compressor.ratio}
                            onChange={(e) => updateNested('dynamics.compressor.ratio', parseFloat(e.target.value))}
                            step="0.1"
                            min="1"
                            max="20"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Attack (ms)</label>
                          <input
                            type="number"
                            value={settings.dynamics.compressor.attack}
                            onChange={(e) => updateNested('dynamics.compressor.attack', parseFloat(e.target.value))}
                            step="1"
                            min="0.1"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Release (ms)</label>
                          <input
                            type="number"
                            value={settings.dynamics.compressor.release}
                            onChange={(e) => updateNested('dynamics.compressor.release', parseFloat(e.target.value))}
                            step="1"
                            min="1"
                            max="1000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Knee (dB)</label>
                          <input
                            type="number"
                            value={settings.dynamics.compressor.knee}
                            onChange={(e) => updateNested('dynamics.compressor.knee', parseFloat(e.target.value))}
                            step="0.1"
                            min="0"
                            max="10"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Makeup Gain (dB)</label>
                          <input
                            type="number"
                            value={settings.dynamics.compressor.makeupGain}
                            onChange={(e) => updateNested('dynamics.compressor.makeupGain', parseFloat(e.target.value))}
                            step="0.1"
                            min="-12"
                            max="12"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Limiter */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Limiter</h4>
                    <input
                      type="checkbox"
                      checked={settings.limiter.enabled}
                      onChange={(e) => updateNested('limiter.enabled', e.target.checked)}
                      className="mr-2"
                    />
                  </div>

                  {settings.limiter.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Threshold (dB)</label>
                        <input
                          type="number"
                          value={settings.limiter.threshold}
                          onChange={(e) => updateNested('limiter.threshold', parseFloat(e.target.value))}
                          step="0.1"
                          min="-12"
                          max="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ceiling (dB)</label>
                        <input
                          type="number"
                          value={settings.limiter.ceiling}
                          onChange={(e) => updateNested('limiter.ceiling', parseFloat(e.target.value))}
                          step="0.1"
                          min="-12"
                          max="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Release (ms)</label>
                        <input
                          type="number"
                          value={settings.limiter.release}
                          onChange={(e) => updateNested('limiter.release', parseFloat(e.target.value))}
                          step="1"
                          min="1"
                          max="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                        <select
                          value={settings.limiter.mode}
                          onChange={(e) => updateNested('limiter.mode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            )}

            {activeSection === 'stereo' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Stereo Enhancement</h4>
                  <input
                    type="checkbox"
                    checked={settings.stereoEnhancement.enabled}
                    onChange={(e) => updateNested('stereoEnhancement.enabled', e.target.checked)}
                    className="mr-2"
                  />
                </div>

                {settings.stereoEnhancement.enabled && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={settings.stereoEnhancement.width}
                          onChange={(e) => updateNested('stereoEnhancement.width', parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-600 text-center">{settings.stereoEnhancement.width.toFixed(1)}</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bass Mono</label>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          step="1"
                          value={settings.stereoEnhancement.bass}
                          onChange={(e) => updateNested('stereoEnhancement.bass', parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-600 text-center">{settings.stereoEnhancement.bass}%</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Imaging</label>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          step="1"
                          value={settings.stereoEnhancement.imaging}
                          onChange={(e) => updateNested('stereoEnhancement.imaging', parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-600 text-center">{settings.stereoEnhancement.imaging}%</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correlation</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={settings.stereoEnhancement.correlation}
                          onChange={(e) => updateNested('stereoEnhancement.correlation', parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-600 text-center">{settings.stereoEnhancement.correlation.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'loudness' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Loudness Processing</h4>
                  <input
                    type="checkbox"
                    checked={settings.loudnessProcessing.enabled}
                    onChange={(e) => updateNested('loudnessProcessing.enabled', e.target.checked)}
                    className="mr-2"
                  />
                </div>

                {settings.loudnessProcessing.enabled && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Standard</label>
                      <select
                        value={settings.loudnessProcessing.standard}
                        onChange={(e) => updateNested('loudnessProcessing.standard', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ebu-r128">EBU R128</option>
                        <option value="atsc-a85">ATSC A/85</option>
                        <option value="arib-tr-b32">ARIB TR-B32</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target LUFS</label>
                        <input
                          type="number"
                          value={settings.loudnessProcessing.targetLufs}
                          onChange={(e) => updateNested('loudnessProcessing.targetLufs', parseFloat(e.target.value))}
                          step="0.1"
                          min="-70"
                          max="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max True Peak (dB)</label>
                        <input
                          type="number"
                          value={settings.loudnessProcessing.maxTruePeak}
                          onChange={(e) => updateNested('loudnessProcessing.maxTruePeak', parseFloat(e.target.value))}
                          step="0.1"
                          min="-12"
                          max="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="gating"
                        checked={settings.loudnessProcessing.gating}
                        onChange={(e) => updateNested('loudnessProcessing.gating', e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="gating" className="text-sm text-gray-700">
                        Enable gating
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}