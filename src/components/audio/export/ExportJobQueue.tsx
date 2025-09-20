'use client';

import React, { useState, useCallback } from 'react';
import {
  ExportJob,
  ExportStatus,
  ExportedFile
} from '@/lib/audio/export-system';

export interface ExportJobQueueProps {
  jobs: ExportJob[];
  onCancelJob: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
  onDownloadFile: (file: ExportedFile) => void;
}

const STATUS_COLORS: Record<ExportStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  preparing: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  mastering: 'bg-purple-100 text-purple-800',
  encoding: 'bg-indigo-100 text-indigo-800',
  finalizing: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const STATUS_ICONS: Record<ExportStatus, string> = {
  pending: '⏳',
  preparing: '🔄',
  processing: '⚡',
  mastering: '🎚️',
  encoding: '📦',
  finalizing: '✨',
  completed: '✅',
  failed: '❌',
  cancelled: '⛔'
};

export function ExportJobQueue({
  jobs,
  onCancelJob,
  onRemoveJob,
  onDownloadFile
}: ExportJobQueueProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getTimeElapsed = (startTime: Date): string => {
    const elapsed = Date.now() - startTime.getTime();
    return formatDuration(elapsed);
  };

  const getEstimatedCompletion = (job: ExportJob): string => {
    if (job.estimatedCompletion) {
      const remaining = job.estimatedCompletion.getTime() - Date.now();
      return remaining > 0 ? formatDuration(remaining) : 'Finishing...';
    }
    return 'Calculating...';
  };

  const toggleExpanded = useCallback((jobId: string) => {
    setExpandedJob(prev => prev === jobId ? null : jobId);
  }, []);

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📁</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Export Jobs</h3>
        <p className="text-gray-600">Your export queue is empty. Start an export to see jobs here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Export Queue</h3>
        <p className="text-sm text-gray-600">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="divide-y divide-gray-200">
        {jobs.map((job) => (
          <div key={job.id} className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleExpanded(job.id)}
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-2xl">
                  {STATUS_ICONS[job.status]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {job.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[job.status]}`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="mt-1">
                    {(job.status === 'processing' || job.status === 'mastering' || job.status === 'encoding') && (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 min-w-0">
                          {job.progress.percentage.toFixed(1)}%
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span>Started {getTimeElapsed(job.startTime)} ago</span>
                      {job.status === 'processing' && (
                        <span>ETA: {getEstimatedCompletion(job)}</span>
                      )}
                      {job.status === 'completed' && job.outputFiles.length > 0 && (
                        <span>{job.outputFiles.length} file{job.outputFiles.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {(job.status === 'pending' || job.status === 'preparing' || job.status === 'processing' || job.status === 'mastering' || job.status === 'encoding') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelJob(job.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Cancel Job"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveJob(job.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove Job"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedJob === job.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {expandedJob === job.id && (
              <div className="mt-4 pl-11 space-y-4">
                {/* Job Details */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Export Settings</h5>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-600">Format:</span>
                      <span className="ml-1 font-medium">{job.settings.format.type.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Quality:</span>
                      <span className="ml-1 font-medium">{job.settings.quality.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Sample Rate:</span>
                      <span className="ml-1 font-medium">{job.settings.sampleRate.toLocaleString()} Hz</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Bit Depth:</span>
                      <span className="ml-1 font-medium">{job.settings.bitDepth} bit</span>
                    </div>
                  </div>
                </div>

                {/* Progress Details */}
                {(job.status === 'processing' || job.status === 'mastering' || job.status === 'encoding') && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">Processing Status</h5>
                    <div className="text-xs text-blue-800">
                      <div>Stage: {job.progress.stage.replace('-', ' ').toUpperCase()}</div>
                      {job.progress.currentFile && (
                        <div>Current File: {job.progress.currentFile}</div>
                      )}
                      {job.progress.processedSamples > 0 && (
                        <div>
                          Samples: {job.progress.processedSamples.toLocaleString()} / {job.progress.totalSamples.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {job.status === 'failed' && job.error && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-red-900 mb-2">Error Details</h5>
                    <p className="text-xs text-red-800">{job.error}</p>
                  </div>
                )}

                {/* Output Files */}
                {job.status === 'completed' && job.outputFiles.length > 0 && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-green-900 mb-2">Output Files</h5>
                    <div className="space-y-2">
                      {job.outputFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(file.size)} • {file.format.type.toUpperCase()}
                              {file.duration && ` • ${formatDuration(file.duration * 1000)}`}
                            </div>
                          </div>
                          <button
                            onClick={() => onDownloadFile(file)}
                            className="ml-2 px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stem Files */}
                {job.settings.stemExport.enabled && job.status === 'completed' && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h5 className="text-sm font-medium text-purple-900 mb-2">Stem Files</h5>
                    <div className="text-xs text-purple-800">
                      {job.settings.stemExport.stems.length} stems exported
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}