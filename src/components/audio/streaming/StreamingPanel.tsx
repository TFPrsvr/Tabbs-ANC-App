'use client';

import React, { useState, useCallback } from 'react';
import {
  StreamingSettings,
  StreamFormat,
  StreamQuality,
  StreamSession,
  StreamEndpoint
} from '@/lib/audio/streaming-system';

export interface StreamingPanelProps {
  isStreaming: boolean;
  currentSession?: StreamSession;
  onStartStream: (settings: StreamingSettings) => Promise<void>;
  onStopStream: () => Promise<void>;
  onAddEndpoint: (url: string, protocol: string) => Promise<void>;
  onRemoveEndpoint: (endpointId: string) => Promise<void>;
}

const STREAM_PROTOCOLS = [
  { value: 'webrtc', label: 'WebRTC', description: 'Ultra-low latency for real-time interaction' },
  { value: 'hls', label: 'HLS', description: 'HTTP Live Streaming for broad compatibility' },
  { value: 'dash', label: 'DASH', description: 'Dynamic Adaptive Streaming over HTTP' },
  { value: 'rtmp', label: 'RTMP', description: 'Real-Time Messaging Protocol' },
  { value: 'srt', label: 'SRT', description: 'Secure Reliable Transport' }
];

const CODECS = [
  { value: 'opus', label: 'Opus', description: 'Best quality/compression ratio' },
  { value: 'aac', label: 'AAC', description: 'Widely compatible' },
  { value: 'mp3', label: 'MP3', description: 'Universal compatibility' },
  { value: 'flac', label: 'FLAC', description: 'Lossless compression' }
];

const QUALITY_PRESETS = [
  {
    preset: 'ultra-low-latency',
    label: 'Ultra Low Latency',
    targetBitrate: 64,
    maxBitrate: 128,
    minBitrate: 32,
    description: 'For real-time interaction (< 50ms)'
  },
  {
    preset: 'low-latency',
    label: 'Low Latency',
    targetBitrate: 128,
    maxBitrate: 256,
    minBitrate: 64,
    description: 'For live performance (< 150ms)'
  },
  {
    preset: 'standard',
    label: 'Standard',
    targetBitrate: 192,
    maxBitrate: 320,
    minBitrate: 96,
    description: 'Balanced quality and latency'
  },
  {
    preset: 'high-quality',
    label: 'High Quality',
    targetBitrate: 320,
    maxBitrate: 512,
    minBitrate: 192,
    description: 'Best audio quality'
  },
  {
    preset: 'broadcast',
    label: 'Broadcast',
    targetBitrate: 256,
    maxBitrate: 384,
    minBitrate: 128,
    description: 'Professional broadcast quality'
  }
] as const;

export function StreamingPanel({
  isStreaming,
  currentSession,
  onStartStream,
  onStopStream,
  onAddEndpoint,
  onRemoveEndpoint
}: StreamingPanelProps) {
  const [settings, setSettings] = useState<StreamingSettings>({
    format: {
      protocol: 'webrtc',
      codec: 'opus'
    },
    quality: {
      preset: 'standard',
      targetBitrate: 192,
      maxBitrate: 320,
      minBitrate: 96,
      adaptiveSettings: {
        enabled: true,
        targetLatency: 150,
        bandwidthProbing: true,
        qualityScaling: true,
        frameDropping: false
      }
    },
    latency: {
      target: 150,
      buffer: 100,
      jitterBuffer: 50,
      predictionWindow: 100
    },
    bitrate: 192,
    sampleRate: 48000,
    channels: 2,
    bufferSize: 256,
    adaptiveBitrate: true,
    redundancy: {
      enabled: false,
      packetDuplication: false,
      forwardErrorCorrection: false,
      retransmission: true,
      redundancyFactor: 1.2
    },
    monitoring: {
      enabled: true,
      metrics: [
        { name: 'latency', type: 'latency', enabled: true, threshold: 200 },
        { name: 'bitrate', type: 'bitrate', enabled: true, threshold: 100 },
        { name: 'packet-loss', type: 'packet-loss', enabled: true, threshold: 1 }
      ],
      alertThresholds: {
        latency: 250,
        packetLoss: 2,
        cpuUsage: 80,
        memoryUsage: 85,
        bitrateDrop: 50
      },
      reportingInterval: 1000
    }
  });

  const [newEndpoint, setNewEndpoint] = useState({ url: '', protocol: 'rtmp' });
  const [isStarting, setIsStarting] = useState(false);

  const updateSettings = useCallback((updates: Partial<StreamingSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateNested = useCallback((path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key) current = current[key];
      }

      const lastKey = keys[keys.length - 1];
      if (lastKey) current[lastKey] = value;
      return newSettings;
    });
  }, []);

  const handleQualityPresetChange = useCallback((presetName: string) => {
    const preset = QUALITY_PRESETS.find(p => p.preset === presetName);
    if (preset) {
      updateNested('quality.preset', preset.preset);
      updateNested('quality.targetBitrate', preset.targetBitrate);
      updateNested('quality.maxBitrate', preset.maxBitrate);
      updateNested('quality.minBitrate', preset.minBitrate);
      updateSettings({ bitrate: preset.targetBitrate });
    }
  }, [updateNested, updateSettings]);

  const handleStartStream = useCallback(async () => {
    try {
      setIsStarting(true);
      await onStartStream(settings);
    } finally {
      setIsStarting(false);
    }
  }, [settings, onStartStream]);

  const handleAddEndpoint = useCallback(async () => {
    if (newEndpoint.url) {
      await onAddEndpoint(newEndpoint.url, newEndpoint.protocol);
      setNewEndpoint({ url: '', protocol: 'rtmp' });
    }
  }, [newEndpoint, onAddEndpoint]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'streaming': return 'bg-green-100 text-green-800';
      case 'connecting': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Streaming</h2>
          <p className="text-gray-600">Broadcast your audio to multiple platforms</p>
        </div>
        <div className="flex items-center space-x-3">
          {currentSession && (
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(currentSession.status)}`}>
              {currentSession.status.toUpperCase()}
            </span>
          )}
          {isStreaming ? (
            <button
              onClick={onStopStream}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
              Stop Stream
            </button>
          ) : (
            <button
              onClick={handleStartStream}
              disabled={isStarting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isStarting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                'Start Stream'
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stream Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Stream Configuration</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Protocol</label>
              <select
                value={settings.format.protocol}
                onChange={(e) => updateNested('format.protocol', e.target.value)}
                disabled={isStreaming}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                {STREAM_PROTOCOLS.map((protocol) => (
                  <option key={protocol.value} value={protocol.value}>
                    {protocol.label} - {protocol.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audio Codec</label>
              <select
                value={settings.format.codec}
                onChange={(e) => updateNested('format.codec', e.target.value)}
                disabled={isStreaming}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                {CODECS.map((codec) => (
                  <option key={codec.value} value={codec.value}>
                    {codec.label} - {codec.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quality Preset</label>
              <select
                value={settings.quality.preset}
                onChange={(e) => handleQualityPresetChange(e.target.value)}
                disabled={isStreaming}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                {QUALITY_PRESETS.map((preset) => (
                  <option key={preset.preset} value={preset.preset}>
                    {preset.label} - {preset.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sample Rate</label>
                <select
                  value={settings.sampleRate}
                  onChange={(e) => updateSettings({ sampleRate: parseInt(e.target.value) })}
                  disabled={isStreaming}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value={44100}>44.1 kHz</option>
                  <option value={48000}>48 kHz</option>
                  <option value={88200}>88.2 kHz</option>
                  <option value={96000}>96 kHz</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
                <select
                  value={settings.channels}
                  onChange={(e) => updateSettings({ channels: parseInt(e.target.value) })}
                  disabled={isStreaming}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value={1}>Mono</option>
                  <option value={2}>Stereo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Quality & Latency</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Bitrate: {settings.bitrate} kbps
              </label>
              <input
                type="range"
                min="32"
                max="512"
                step="8"
                value={settings.bitrate}
                onChange={(e) => updateSettings({ bitrate: parseInt(e.target.value) })}
                disabled={isStreaming}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>32 kbps</span>
                <span>512 kbps</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Latency: {settings.latency.target}ms
              </label>
              <input
                type="range"
                min="20"
                max="1000"
                step="10"
                value={settings.latency.target}
                onChange={(e) => updateNested('latency.target', parseInt(e.target.value))}
                disabled={isStreaming}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>20ms</span>
                <span>1000ms</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="adaptiveBitrate"
                  checked={settings.adaptiveBitrate}
                  onChange={(e) => updateSettings({ adaptiveBitrate: e.target.checked })}
                  disabled={isStreaming}
                  className="mr-2"
                />
                <label htmlFor="adaptiveBitrate" className="text-sm text-gray-700">
                  Adaptive bitrate streaming
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="qualityScaling"
                  checked={settings.quality.adaptiveSettings.qualityScaling}
                  onChange={(e) => updateNested('quality.adaptiveSettings.qualityScaling', e.target.checked)}
                  disabled={isStreaming}
                  className="mr-2"
                />
                <label htmlFor="qualityScaling" className="text-sm text-gray-700">
                  Automatic quality scaling
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="bandwidthProbing"
                  checked={settings.quality.adaptiveSettings.bandwidthProbing}
                  onChange={(e) => updateNested('quality.adaptiveSettings.bandwidthProbing', e.target.checked)}
                  disabled={isStreaming}
                  className="mr-2"
                />
                <label htmlFor="bandwidthProbing" className="text-sm text-gray-700">
                  Bandwidth probing
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Stream Endpoints */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Streaming Destinations</h3>

          {/* Add Endpoint */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="url"
                  value={newEndpoint.url}
                  onChange={(e) => setNewEndpoint(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="Stream URL (e.g., rtmp://live.twitch.tv/live/YOUR_KEY)"
                  disabled={isStreaming}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <select
                value={newEndpoint.protocol}
                onChange={(e) => setNewEndpoint(prev => ({ ...prev, protocol: e.target.value }))}
                disabled={isStreaming}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="rtmp">RTMP</option>
                <option value="srt">SRT</option>
                <option value="webrtc">WebRTC</option>
              </select>
              <button
                onClick={handleAddEndpoint}
                disabled={!newEndpoint.url || isStreaming}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>

          {/* Endpoints List */}
          {currentSession && currentSession.endpoints.length > 0 ? (
            <div className="space-y-2">
              {currentSession.endpoints.map((endpoint) => (
                <div key={endpoint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(endpoint.status)}`}>
                        {endpoint.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {endpoint.url}
                      </span>
                    </div>
                    {endpoint.lastError && (
                      <p className="text-xs text-red-600 mt-1">{endpoint.lastError}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveEndpoint(endpoint.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove endpoint"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📡</div>
              <p>No streaming destinations configured.</p>
              <p className="text-sm">Add a stream URL above to get started.</p>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Redundancy</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="redundancyEnabled"
                    checked={settings.redundancy.enabled}
                    onChange={(e) => updateNested('redundancy.enabled', e.target.checked)}
                    disabled={isStreaming}
                    className="mr-2"
                  />
                  <label htmlFor="redundancyEnabled" className="text-sm text-gray-700">
                    Enable redundancy features
                  </label>
                </div>

                {settings.redundancy.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="packetDuplication"
                        checked={settings.redundancy.packetDuplication}
                        onChange={(e) => updateNested('redundancy.packetDuplication', e.target.checked)}
                        disabled={isStreaming}
                        className="mr-2"
                      />
                      <label htmlFor="packetDuplication" className="text-sm text-gray-700">
                        Packet duplication
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="forwardErrorCorrection"
                        checked={settings.redundancy.forwardErrorCorrection}
                        onChange={(e) => updateNested('redundancy.forwardErrorCorrection', e.target.checked)}
                        disabled={isStreaming}
                        className="mr-2"
                      />
                      <label htmlFor="forwardErrorCorrection" className="text-sm text-gray-700">
                        Forward error correction
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-800 mb-3">Monitoring</h4>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="monitoringEnabled"
                  checked={settings.monitoring.enabled}
                  onChange={(e) => updateNested('monitoring.enabled', e.target.checked)}
                  disabled={isStreaming}
                  className="mr-2"
                />
                <label htmlFor="monitoringEnabled" className="text-sm text-gray-700">
                  Enable stream monitoring
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}