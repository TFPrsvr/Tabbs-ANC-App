"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MobileFileUpload } from './mobile-file-upload';
import { MobileAudioControls } from './mobile-audio-controls';
import { MobileNavigation } from './mobile-navigation';
import { AdvancedAudioWorkspace } from '@/components/audio/advanced-audio-workspace';
import { getOfflineManager, type OfflineAudioFile } from '@/lib/mobile/offline';
import { usePerformanceOptimization } from '@/lib/mobile/performance';
import { AudioFile } from '@/types';
import { EMOJIS } from '@/constants';
import { 
  Wifi, 
  WifiOff, 
  Battery, 
  Smartphone, 
  Tablet, 
  Monitor,
  Zap,
  HardDrive,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface MobileDashboardProps {
  className?: string;
}

export function MobileDashboard({ className }: MobileDashboardProps) {
  const { userId } = useAuth();
  const { config, metrics, optimizer } = usePerformanceOptimization();
  
  // State management
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [audioFiles, setAudioFiles] = useState<OfflineAudioFile[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentAudioBuffer, setCurrentAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'process' | 'files'>('upload');
  const [storageStats, setStorageStats] = useState({ used: 0, quota: 0, files: 0 });

  // Initialize offline manager
  const offlineManager = React.useMemo(() => getOfflineManager(), []);

  // Load offline files on mount
  useEffect(() => {
    loadOfflineFiles();
    updateStorageStats();
  }, []);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline files
  const loadOfflineFiles = useCallback(async () => {
    try {
      const files = await offlineManager.getStoredAudioFiles();
      setAudioFiles(files);
      console.log('📱 Loaded offline files:', files.length);
    } catch (error) {
      console.error('Failed to load offline files:', error);
    }
  }, [offlineManager]);

  // Update storage statistics
  const updateStorageStats = useCallback(async () => {
    try {
      const stats = await offlineManager.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to get storage stats:', error);
    }
  }, [offlineManager]);

  // Handle file upload (mobile-optimized)
  const handleFileUpload = useCallback(async (file: File, duration?: number) => {
    if (!file) return;

    setIsProcessing(true);
    setCurrentFile(file);

    try {
      // Store file offline
      const offlineFile = await offlineManager.storeAudioFile(file, duration);
      
      // Convert to AudioBuffer for immediate processing
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setCurrentAudioBuffer(audioBuffer);

      // Add to files list
      setAudioFiles(prev => [offlineFile, ...prev]);
      
      // Update storage stats
      await updateStorageStats();

      // Switch to process tab
      setActiveTab('process');

      // Show success message
      toast.success('📱 File uploaded and ready for processing!');

      // If online, also upload to server
      if (isOnline && userId) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          if (duration) formData.append('duration', duration.toString());
          
          const response = await fetch('/api/user/audio-files', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            console.log('📡 File also uploaded to server');
          }
        } catch (error) {
          console.warn('📡 Server upload failed (offline mode active)', error);
        }
      }

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('❌ Upload failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [offlineManager, updateStorageStats, isOnline, userId]);

  // Handle file processing (mobile-optimized)
  const handleFileProcess = useCallback(async (fileId: string) => {
    setIsProcessing(true);

    try {
      const processed = await offlineManager.processAudioOffline(fileId, {
        enableSeparation: config?.audioQuality !== 'low',
        enableVoiceDetection: true,
        enableCaptions: isOnline, // Only online for now
      });

      if (processed) {
        setAudioFiles(prev => 
          prev.map(f => f.id === fileId ? processed : f)
        );
        toast.success('✅ Processing complete!');
      } else {
        toast.error('❌ Processing failed');
      }

    } catch (error) {
      console.error('Processing failed:', error);
      toast.error('❌ Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [offlineManager, config, isOnline]);

  // Handle file deletion
  const handleFileDelete = useCallback(async (fileId: string) => {
    try {
      await offlineManager.deleteAudioFile(fileId);
      setAudioFiles(prev => prev.filter(f => f.id !== fileId));
      await updateStorageStats();
      toast.success('🗑️ File deleted');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('❌ Delete failed');
    }
  }, [offlineManager, updateStorageStats]);

  // Format storage size
  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  // Get device icon
  const getDeviceIcon = () => {
    switch (metrics?.deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 pb-20 touch-action-manipulation">
      <div className="container mx-auto px-4 py-6 max-w-md no-select">
        {/* Mobile Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                🎵 ANC Audio Pro
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-Powered Mobile Processing
              </p>
            </div>
            
            {/* Connection & Device Status + Profile Avatar */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              {getDeviceIcon()}
              {/* Profile Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center cursor-pointer">
                <span className="text-white text-xs font-bold">U</span>
              </div>
            </div>
          </div>

          {/* Performance & Storage Info */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 rounded px-2 py-1">
              <Zap className="w-3 h-3" />
              <span>{config?.audioQuality || 'auto'}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 rounded px-2 py-1">
              <HardDrive className="w-3 h-3" />
              <span>{formatBytes(storageStats.used)}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 rounded px-2 py-1">
              <Clock className="w-3 h-3" />
              <span>{storageStats.files} files</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-4 bg-white/80 dark:bg-gray-800/80 rounded-lg p-1">
          <Button
            variant={activeTab === 'upload' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('upload')}
            className="flex-1 text-xs"
          >
            📁 Upload
          </Button>
          <Button
            variant={activeTab === 'process' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('process')}
            className="flex-1 text-xs"
            disabled={!currentFile && !currentAudioBuffer}
          >
            ⚡ Process
          </Button>
          <Button
            variant={activeTab === 'files' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('files')}
            className="flex-1 text-xs"
          >
            📂 Files ({audioFiles.length})
          </Button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <MobileFileUpload
              onFileUpload={handleFileUpload}
              isLoading={isProcessing}
              maxFileSize={config?.maxCacheSize || 100}
            />
          )}

          {/* Process Tab */}
          {activeTab === 'process' && (
            <div className="space-y-4">
              {currentFile && currentAudioBuffer ? (
                <>
                  {/* Mobile Audio Controls */}
                  <MobileAudioControls
                    audioBuffer={currentAudioBuffer}
                    isPlaying={false}
                    currentTime={0}
                    duration={currentAudioBuffer.duration}
                    volume={1}
                  />

                  {/* Advanced Processing */}
                  <AdvancedAudioWorkspace
                    audioFile={currentFile}
                    audioBuffer={currentAudioBuffer}
                  />
                </>
              ) : (
                <Card>
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="text-lg font-medium text-gray-600 mb-2">
                      🎵 Ready for Processing
                    </div>
                    <div className="text-sm text-gray-500 mb-6">
                      Upload an audio file to start processing
                    </div>
                    <Button 
                      onClick={() => setActiveTab('upload')}
                      variant="outline"
                    >
                      📁 Go to Upload
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-3">
              {audioFiles.length > 0 ? (
                audioFiles.map((file) => (
                  <Card key={file.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{file.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {file.type} • {Math.round(file.duration || 0)}s • {formatBytes(file.size)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.createdAt).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 text-xs rounded-full text-center ${
                            file.processed 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {file.processed ? '✅' : '⏳'}
                          </span>
                          
                          <div className="flex gap-1">
                            {!file.processed && (
                              <Button
                                size="sm"
                                onClick={() => handleFileProcess(file.id)}
                                disabled={isProcessing}
                                className="text-xs px-2 py-1 h-auto"
                              >
                                ⚡
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFileDelete(file.id)}
                              className="text-xs px-2 py-1 h-auto"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="text-lg font-medium text-gray-600 mb-2">
                      📂 No Files Yet
                    </div>
                    <div className="text-sm text-gray-500 mb-6">
                      Upload your first audio file to get started
                    </div>
                    <Button 
                      onClick={() => setActiveTab('upload')}
                      variant="outline"
                    >
                      📁 Upload File
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Performance Status (if low-end device) */}
        {metrics?.isLowEnd && (
          <Card className="mt-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardContent className="p-3 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">
                    Performance Mode Active
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-300">
                    Optimized settings for your device ({config?.audioQuality} quality)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offline Status */}
        {!isOnline && (
          <Card className="mt-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <CardContent className="p-3 text-xs">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-800 dark:text-blue-200">
                    Offline Mode
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">
                    Basic processing available. Full features when online.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
}