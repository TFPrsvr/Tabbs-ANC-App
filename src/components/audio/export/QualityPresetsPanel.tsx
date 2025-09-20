'use client';

import React, { useState, useCallback } from 'react';
import {
  QualityPreset
} from '@/lib/audio/export-system';

export interface QualityPresetsPanelProps {
  presets: QualityPreset[];
  selectedPreset: QualityPreset | null;
  onSelectPreset: (preset: QualityPreset) => void;
  onCreatePreset: (preset: Omit<QualityPreset, 'name'> & { name: string }) => void;
  onDeletePreset: (presetName: string) => void;
  onUpdatePreset: (preset: QualityPreset) => void;
}

const TARGET_USE_COLORS = {
  streaming: 'bg-blue-100 text-blue-800',
  mastering: 'bg-purple-100 text-purple-800',
  broadcast: 'bg-green-100 text-green-800',
  archival: 'bg-yellow-100 text-yellow-800',
  demo: 'bg-gray-100 text-gray-800'
};

const TARGET_USE_DESCRIPTIONS = {
  streaming: 'Optimized for online streaming platforms',
  mastering: 'High-quality for professional mastering',
  broadcast: 'Standard quality for radio/TV broadcast',
  archival: 'Maximum quality for long-term storage',
  demo: 'Compressed quality for demos and previews'
};

export function QualityPresetsPanel({
  presets,
  selectedPreset,
  onSelectPreset,
  onCreatePreset,
  onDeletePreset,
  onUpdatePreset
}: QualityPresetsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPreset, setEditingPreset] = useState<QualityPreset | null>(null);
  const [newPreset, setNewPreset] = useState<Partial<QualityPreset>>({
    name: '',
    sampleRate: 44100,
    bitDepth: 16,
    bitrate: 320,
    description: '',
    targetUse: 'streaming'
  });

  const handleCreatePreset = useCallback(() => {
    if (newPreset.name && newPreset.sampleRate && newPreset.description && newPreset.targetUse) {
      onCreatePreset({
        name: newPreset.name,
        sampleRate: newPreset.sampleRate,
        bitDepth: newPreset.bitDepth,
        bitrate: newPreset.bitrate,
        description: newPreset.description,
        targetUse: newPreset.targetUse
      });

      setNewPreset({
        name: '',
        sampleRate: 44100,
        bitDepth: 16,
        bitrate: 320,
        description: '',
        targetUse: 'streaming'
      });
      setIsCreating(false);
    }
  }, [newPreset, onCreatePreset]);

  const handleUpdatePreset = useCallback(() => {
    if (editingPreset) {
      onUpdatePreset(editingPreset);
      setEditingPreset(null);
    }
  }, [editingPreset, onUpdatePreset]);

  const formatQualitySpec = (preset: QualityPreset): string => {
    const specs = [`${preset.sampleRate / 1000}kHz`];

    if (preset.bitDepth) {
      specs.push(`${preset.bitDepth}-bit`);
    }

    if (preset.bitrate) {
      specs.push(`${preset.bitrate}kbps`);
    }

    return specs.join(' • ');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Quality Presets</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          Create Preset
        </button>
      </div>

      {/* Create New Preset Form */}
      {isCreating && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <h4 className="font-medium text-blue-900 mb-3">Create New Preset</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newPreset.name || ''}
                onChange={(e) => setNewPreset(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., High Quality Streaming"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Use</label>
              <select
                value={newPreset.targetUse || 'streaming'}
                onChange={(e) => setNewPreset(prev => ({ ...prev, targetUse: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="streaming">Streaming</option>
                <option value="mastering">Mastering</option>
                <option value="broadcast">Broadcast</option>
                <option value="archival">Archival</option>
                <option value="demo">Demo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sample Rate (Hz)</label>
              <select
                value={newPreset.sampleRate || 44100}
                onChange={(e) => setNewPreset(prev => ({ ...prev, sampleRate: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={44100}>44,100 Hz</option>
                <option value={48000}>48,000 Hz</option>
                <option value={88200}>88,200 Hz</option>
                <option value={96000}>96,000 Hz</option>
                <option value={176400}>176,400 Hz</option>
                <option value={192000}>192,000 Hz</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bit Depth</label>
              <select
                value={newPreset.bitDepth || 16}
                onChange={(e) => setNewPreset(prev => ({ ...prev, bitDepth: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={16}>16 bit</option>
                <option value={24}>24 bit</option>
                <option value={32}>32 bit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitrate (for lossy formats)</label>
              <select
                value={newPreset.bitrate || 320}
                onChange={(e) => setNewPreset(prev => ({ ...prev, bitrate: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={128}>128 kbps</option>
                <option value={192}>192 kbps</option>
                <option value={256}>256 kbps</option>
                <option value={320}>320 kbps</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newPreset.description || ''}
                onChange={(e) => setNewPreset(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of when to use this preset"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePreset}
              disabled={!newPreset.name || !newPreset.description}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Edit Preset Form */}
      {editingPreset && (
        <div className="p-4 border-b border-gray-200 bg-purple-50">
          <h4 className="font-medium text-purple-900 mb-3">Edit Preset: {editingPreset.name}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sample Rate (Hz)</label>
              <select
                value={editingPreset.sampleRate}
                onChange={(e) => setEditingPreset(prev => prev ? { ...prev, sampleRate: parseInt(e.target.value) } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={44100}>44,100 Hz</option>
                <option value={48000}>48,000 Hz</option>
                <option value={88200}>88,200 Hz</option>
                <option value={96000}>96,000 Hz</option>
                <option value={176400}>176,400 Hz</option>
                <option value={192000}>192,000 Hz</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bit Depth</label>
              <select
                value={editingPreset.bitDepth || 16}
                onChange={(e) => setEditingPreset(prev => prev ? { ...prev, bitDepth: parseInt(e.target.value) } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={16}>16 bit</option>
                <option value={24}>24 bit</option>
                <option value={32}>32 bit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitrate (for lossy formats)</label>
              <select
                value={editingPreset.bitrate || 320}
                onChange={(e) => setEditingPreset(prev => prev ? { ...prev, bitrate: parseInt(e.target.value) } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={128}>128 kbps</option>
                <option value={192}>192 kbps</option>
                <option value={256}>256 kbps</option>
                <option value={320}>320 kbps</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Use</label>
              <select
                value={editingPreset.targetUse}
                onChange={(e) => setEditingPreset(prev => prev ? { ...prev, targetUse: e.target.value as any } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="streaming">Streaming</option>
                <option value="mastering">Mastering</option>
                <option value="broadcast">Broadcast</option>
                <option value="archival">Archival</option>
                <option value="demo">Demo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={editingPreset.description}
                onChange={(e) => setEditingPreset(prev => prev ? { ...prev, description: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setEditingPreset(null)}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdatePreset}
              className="px-3 py-1 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {/* Presets List */}
      <div className="p-4 space-y-3">
        {presets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎵</div>
            <p>No quality presets available.</p>
            <p className="text-sm">Create your first preset to get started.</p>
          </div>
        ) : (
          presets.map((preset) => (
            <div
              key={preset.name}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedPreset?.name === preset.name
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onSelectPreset(preset)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {preset.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${TARGET_USE_COLORS[preset.targetUse]}`}>
                      {preset.targetUse}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {preset.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{formatQualitySpec(preset)}</span>
                    <span className="text-gray-400">•</span>
                    <span>{TARGET_USE_DESCRIPTIONS[preset.targetUse]}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPreset(preset);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit Preset"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete the preset "${preset.name}"?`)) {
                        onDeletePreset(preset.name);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Preset"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  {selectedPreset?.name === preset.name && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full ml-2" title="Selected" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}