"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AudioUpload } from '@/components/audio/audio-upload';
import { MultiStreamController } from '@/components/audio/stream-controller';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AudioProcessor, AudioStreamController } from '@/lib/audio/audio-processor';
// Database operations now handled via API routes
import { AudioFile, AudioStream, AudioProcessingSettings } from '@/types';
import { EMOJIS } from '@/constants';
import { Upload, Settings, User, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const { userId } = useAuth();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentStreams, setCurrentStreams] = useState<AudioStream[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioProcessor] = useState(() => new AudioProcessor());
  const [streamControllers] = useState<Map<string, AudioStreamController>>(new Map());

  const loadUserAudioFiles = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/user/audio-files');
      if (response.ok) {
        const { files } = await response.json();
        setAudioFiles(files);
      }
    } catch (error) {
      console.error('Error loading audio files:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadUserAudioFiles();
      audioProcessor.initialize();
    }

    return () => {
      audioProcessor.dispose();
    };
  }, [userId, audioProcessor, loadUserAudioFiles]);

  const handleFileUpload = async (file: File, duration?: number) => {
    if (!userId) return;

    setIsProcessing(true);
    
    try {
      // Upload file via API
      const formData = new FormData();
      formData.append('file', file);
      if (duration) formData.append('duration', duration.toString());
      
      const response = await fetch('/api/user/audio-files', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const { audioFile } = await response.json();
        
        // Load and process audio
        const audioBuffer = await audioProcessor.loadAudioFile(file);
        
        // Default processing settings
        const processingSettings: AudioProcessingSettings = {
          noiseCancellation: { enabled: true, intensity: 70 },
          transparencyMode: { enabled: false, level: 50, selectiveHearing: false },
          voiceSeparation: { enabled: true, sensitivity: 75 },
          backgroundNoiseReduction: { enabled: true, threshold: 60 },
        };

        // Separate audio streams
        const streams = await audioProcessor.separateAudioStreams(audioBuffer, processingSettings);
        
        // Save streams to database via API
        await fetch('/api/user/audio-streams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioFileId: audioFile.id, streams })
        });
        
        // Update state
        setCurrentStreams(streams);
        await loadUserAudioFiles();
      }
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStreamUpdate = async (streamId: string, updates: Partial<AudioStream>) => {
    if (!userId) return;

    try {
      // Update via API
      await fetch('/api/user/audio-streams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, updates })
      });
      
      // Update local state
      setCurrentStreams(prev => 
        prev.map(stream => 
          stream.id === streamId ? { ...stream, ...updates } : stream
        )
      );

      // Update audio processor
      const controller = streamControllers.get(streamId);
      if (controller) {
        if (updates.volume !== undefined) controller.updateVolume(updates.volume);
        if (updates.isMuted !== undefined) controller.updateMute(updates.isMuted);
        if (updates.isActive !== undefined) controller.updateActive(updates.isActive);
      }
    } catch (error) {
      console.error('Error updating stream:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {EMOJIS.DASHBOARD} Audio Dashboard
            </h1>
            <p className="text-muted-foreground">
              Upload and process your audio files with advanced separation controls
            </p>
          </div>
          
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Audio File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AudioUpload 
                onFileUpload={handleFileUpload}
                isLoading={isProcessing}
              />
            </CardContent>
          </Card>

          {/* Stream Controllers */}
          {currentStreams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {EMOJIS.VOLUME_UP} Audio Stream Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MultiStreamController
                  streams={currentStreams}
                  onStreamUpdate={handleStreamUpdate}
                />
              </CardContent>
            </Card>
          )}

          {/* File History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {EMOJIS.UPLOAD} Recent Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audioFiles.length > 0 ? (
                <div className="space-y-4">
                  {audioFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{file.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {file.format.toUpperCase()} • {Math.round(file.duration || 0)}s • {Math.round((file.file_size || 0) / 1024 / 1024 * 100) / 100}MB
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          file.is_processed 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {file.is_processed ? EMOJIS.SUCCESS + ' Processed' : EMOJIS.PROCESSING + ' Processing'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {EMOJIS.UPLOAD} No audio files uploaded yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upload your first audio file to get started with advanced processing
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}