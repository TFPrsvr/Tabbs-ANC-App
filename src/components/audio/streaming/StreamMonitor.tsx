'use client';

import React, { useState, useEffect } from 'react';
import {
  StreamStatistics,
  StreamSession,
  ViewerInfo
} from '@/lib/audio/streaming-system';

export interface StreamMonitorProps {
  session?: StreamSession;
  statistics?: StreamStatistics;
  viewers: ViewerInfo[];
  isStreaming: boolean;
}

export function StreamMonitor({
  session,
  statistics,
  viewers,
  isStreaming
}: StreamMonitorProps) {
  const [selectedMetric, setSelectedMetric] = useState<'overview' | 'network' | 'viewers' | 'performance'>('overview');

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'streaming': return 'text-green-600';
      case 'buffering': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getQualityColor = (latency: number) => {
    if (latency < 100) return 'text-green-600';
    if (latency < 200) return 'text-yellow-600';
    if (latency < 500) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!isStreaming && !session) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Stream Monitor</h3>
        <p className="text-gray-600">Start streaming to monitor performance metrics</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stream Monitor</h2>
          {session && (
            <p className="text-gray-600">Monitoring: {session.name}</p>
          )}
        </div>
        {session && (
          <div className={`flex items-center space-x-2 ${getStatusColor(session.status)}`}>
            <div className="w-3 h-3 rounded-full bg-current animate-pulse"></div>
            <span className="font-medium">{session.status.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Metric Tabs */}
      <div className="flex border-b border-gray-200">
        {['overview', 'network', 'viewers', 'performance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedMetric(tab as any)}
            className={`px-6 py-3 text-sm font-medium transition-colors capitalize ${
              selectedMetric === tab
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {selectedMetric === 'overview' && statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Duration</h3>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(statistics.duration)}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Data Transferred</h3>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(statistics.totalBytes)}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Current Viewers</h3>
              <p className="text-2xl font-bold text-gray-900">{statistics.currentViewers}</p>
              <p className="text-sm text-gray-500">Peak: {statistics.peakViewers}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Average Bitrate</h3>
              <p className="text-2xl font-bold text-gray-900">{statistics.averageBitrate.toFixed(0)}</p>
              <p className="text-sm text-gray-500">kbps</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Average Latency</h3>
              <p className={`text-2xl font-bold ${getQualityColor(statistics.averageLatency)}`}>
                {statistics.averageLatency.toFixed(0)}ms
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Packet Loss</h3>
              <p className={`text-2xl font-bold ${
                (statistics.packetsLost / statistics.packetsSent) < 0.01 ? 'text-green-600' : 'text-red-600'
              }`}>
                {((statistics.packetsLost / statistics.packetsSent) * 100).toFixed(2)}%
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-1">CPU Usage</h3>
              <p className={`text-2xl font-bold ${
                statistics.cpuUsage < 70 ? 'text-green-600' : statistics.cpuUsage < 85 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {statistics.cpuUsage.toFixed(0)}%
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Memory Usage</h3>
              <p className={`text-2xl font-bold ${
                statistics.memoryUsage < 70 ? 'text-green-600' : statistics.memoryUsage < 85 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {statistics.memoryUsage.toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        {selectedMetric === 'network' && statistics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-600 mb-1">Current Bitrate</h3>
                <p className="text-3xl font-bold text-blue-900">{statistics.averageBitrate.toFixed(0)}</p>
                <p className="text-sm text-blue-700">kbps</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600 mb-1">Peak Bitrate</h3>
                <p className="text-3xl font-bold text-green-900">{statistics.peakBitrate.toFixed(0)}</p>
                <p className="text-sm text-green-700">kbps</p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-orange-600 mb-1">Min Bitrate</h3>
                <p className="text-3xl font-bold text-orange-900">
                  {statistics.minBitrate === Infinity ? 0 : statistics.minBitrate.toFixed(0)}
                </p>
                <p className="text-sm text-orange-700">kbps</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Network Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Packets Sent</span>
                    <span className="text-sm font-medium">{statistics.packetsSent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Packets Lost</span>
                    <span className="text-sm font-medium">{statistics.packetsLost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Retransmissions</span>
                    <span className="text-sm font-medium">{statistics.retransmissions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Network Utilization</span>
                    <span className="text-sm font-medium">{statistics.networkUtilization.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {session && session.endpoints.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Endpoints Status</h3>
                  <div className="space-y-2">
                    {session.endpoints.map((endpoint) => (
                      <div key={endpoint.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate">{endpoint.url}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          endpoint.status === 'connected' ? 'bg-green-100 text-green-800' :
                          endpoint.status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {endpoint.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedMetric === 'viewers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-600 mb-1">Current Viewers</h3>
                <p className="text-3xl font-bold text-blue-900">{viewers.length}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600 mb-1">Peak Viewers</h3>
                <p className="text-3xl font-bold text-green-900">{statistics?.peakViewers || 0}</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-600 mb-1">Average Latency</h3>
                <p className="text-3xl font-bold text-purple-900">
                  {viewers.length > 0 ? (viewers.reduce((sum, v) => sum + v.latency, 0) / viewers.length).toFixed(0) : 0}ms
                </p>
              </div>
            </div>

            {viewers.length > 0 ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Viewer Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Viewer ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Join Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quality
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Latency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Buffer Health
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewers.map((viewer) => (
                        <tr key={viewer.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {viewer.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(viewer.joinTime).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {viewer.quality}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getQualityColor(viewer.latency)}`}>
                            {viewer.latency}ms
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    viewer.bufferHealth > 0.7 ? 'bg-green-500' :
                                    viewer.bufferHealth > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${viewer.bufferHealth * 100}%` }}
                                />
                              </div>
                              <span>{(viewer.bufferHealth * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {viewer.location || 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">👥</div>
                <p>No viewers currently watching.</p>
                <p className="text-sm">Share your stream URL to get viewers!</p>
              </div>
            )}
          </div>
        )}

        {selectedMetric === 'performance' && statistics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">CPU Usage</span>
                      <span className="font-medium">{statistics.cpuUsage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-2 rounded-full ${
                          statistics.cpuUsage < 70 ? 'bg-green-500' :
                          statistics.cpuUsage < 85 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(statistics.cpuUsage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Memory Usage</span>
                      <span className="font-medium">{statistics.memoryUsage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-2 rounded-full ${
                          statistics.memoryUsage < 70 ? 'bg-green-500' :
                          statistics.memoryUsage < 85 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(statistics.memoryUsage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Network Utilization</span>
                      <span className="font-medium">{statistics.networkUtilization.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-2 rounded-full ${
                          statistics.networkUtilization < 70 ? 'bg-green-500' :
                          statistics.networkUtilization < 85 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(statistics.networkUtilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average Latency</span>
                    <span className={`text-sm font-medium ${getQualityColor(statistics.averageLatency)}`}>
                      {statistics.averageLatency.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Packet Loss Rate</span>
                    <span className={`text-sm font-medium ${
                      (statistics.packetsLost / statistics.packetsSent) < 0.01 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {((statistics.packetsLost / statistics.packetsSent) * 100).toFixed(3)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Retransmission Rate</span>
                    <span className="text-sm font-medium">
                      {((statistics.retransmissions / statistics.packetsSent) * 100).toFixed(3)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Bitrate Stability</span>
                    <span className="text-sm font-medium">
                      {statistics.peakBitrate > 0 ? ((statistics.minBitrate / statistics.peakBitrate) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">Performance Recommendations</h3>
              <div className="space-y-2 text-sm text-yellow-700">
                {statistics.cpuUsage > 80 && (
                  <p>• CPU usage is high. Consider reducing stream quality or closing other applications.</p>
                )}
                {statistics.memoryUsage > 80 && (
                  <p>• Memory usage is high. Consider reducing buffer sizes or restarting the application.</p>
                )}
                {(statistics.packetsLost / statistics.packetsSent) > 0.02 && (
                  <p>• High packet loss detected. Check your network connection and consider enabling redundancy.</p>
                )}
                {statistics.averageLatency > 200 && (
                  <p>• Latency is high. Consider using a lower latency streaming protocol or reducing quality.</p>
                )}
                {statistics.cpuUsage < 60 && statistics.memoryUsage < 60 && statistics.averageLatency < 100 && (
                  <p className="text-green-700">• Stream performance is excellent. All metrics are within optimal ranges.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}