'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Library, Loader2, AlertCircle, Info } from 'lucide-react';
import { VoiceMemoRecorder, VoiceMemo } from './VoiceMemoRecorder';
import { VoiceMemoLibrary } from './VoiceMemoLibrary';
import { voiceMemoStorage, formatStorageSize, formatDuration } from '@/lib/audio/voice-memo-storage';
import { toast } from 'sonner';

type ViewMode = 'library' | 'recorder';

export interface VoiceMemoManagerProps {
  className?: string;
}

export const VoiceMemoManager: React.FC<VoiceMemoManagerProps> = ({ className = '' }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState({
    count: 0,
    totalSize: 0,
    totalDuration: 0
  });

  // Load memos from storage
  const loadMemos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const loadedMemos = await voiceMemoStorage.getAllMemos();
      setMemos(loadedMemos);

      const stats = await voiceMemoStorage.getStorageStats();
      setStorageStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load voice memos';
      setError(errorMessage);
      toast.error('Error loading voice memos', {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  // Save memo handler
  const handleSaveMemo = useCallback(async (memo: VoiceMemo) => {
    try {
      await voiceMemoStorage.saveMemo(memo);
      await loadMemos();
      setViewMode('library');

      toast.success('Voice memo saved', {
        description: `"${memo.title}" has been saved successfully`
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save voice memo';
      toast.error('Error saving voice memo', {
        description: errorMessage
      });
    }
  }, [loadMemos]);

  // Update memo handler
  const handleUpdateMemo = useCallback(async (memo: VoiceMemo) => {
    try {
      await voiceMemoStorage.updateMemo(memo);
      await loadMemos();

      toast.success('Voice memo updated', {
        description: `"${memo.title}" has been updated`
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update voice memo';
      toast.error('Error updating voice memo', {
        description: errorMessage
      });
    }
  }, [loadMemos]);

  // Delete memo handler
  const handleDeleteMemo = useCallback(async (memoId: string) => {
    try {
      await voiceMemoStorage.deleteMemo(memoId);
      await loadMemos();

      toast.success('Voice memo deleted', {
        description: 'The voice memo has been removed'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete voice memo';
      toast.error('Error deleting voice memo', {
        description: errorMessage
      });
    }
  }, [loadMemos]);

  // Cancel recorder handler
  const handleCancelRecorder = useCallback(() => {
    setViewMode('library');
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading voice memos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-400 mb-2">Error Loading Voice Memos</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadMemos}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with View Toggle */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Voice Memos</h1>
            <p className="text-gray-400">Record and organize your audio notes</p>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('library')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'library'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Library className="w-5 h-5" />
              <span>Library</span>
            </button>
            <button
              onClick={() => setViewMode('recorder')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'recorder'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>New Memo</span>
            </button>
          </div>
        </div>

        {/* Storage Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="text-gray-400 text-sm mb-1">Total Memos</div>
            <div className="text-2xl font-bold text-white">{storageStats.count}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="text-gray-400 text-sm mb-1">Total Duration</div>
            <div className="text-2xl font-bold text-white">
              {formatDuration(storageStats.totalDuration)}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="text-gray-400 text-sm mb-1">Storage Used</div>
            <div className="text-2xl font-bold text-white">
              {formatStorageSize(storageStats.totalSize)}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-4 flex items-start space-x-3 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <strong>Voice memos are stored locally</strong> in your browser using IndexedDB.
            They will persist across sessions but won't sync across devices. Export important memos for backup.
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {viewMode === 'recorder' ? (
          <VoiceMemoRecorder
            onSave={handleSaveMemo}
            onCancel={handleCancelRecorder}
          />
        ) : (
          <VoiceMemoLibrary
            memos={memos}
            onDelete={handleDeleteMemo}
            onUpdate={handleUpdateMemo}
          />
        )}
      </div>
    </div>
  );
};
