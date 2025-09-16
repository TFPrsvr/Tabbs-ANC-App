'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FFmpegWrapper, ExtractionOptions, VideoProcessingProgress, VideoFormatUtils } from '@/lib/video/ffmpeg-wrapper';
import { cn } from '@/lib/utils';
import { 
  Video, Upload, Download, Play, FileVideo, Music, 
  Settings, Sparkles, Clock, AlertCircle, CheckCircle,
  Film, Zap, FileAudio, Headphones
} from 'lucide-react';

interface VideoToAudioExtractorProps {
  onAudioExtracted: (audioFile: File, audioBuffer: AudioBuffer) => void;
  className?: string;
}

export function VideoToAudioExtractor({ onAudioExtracted, className }: VideoToAudioExtractorProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<VideoProcessingProgress | null>(null);
  const [extractionOptions, setExtractionOptions] = useState<ExtractionOptions>({
    format: 'wav',
    quality: 'high'
  });
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpegWrapper | null>(null);

  // User-friendly extraction presets
  const extractionPresets = {
    podcast: {
      name: "🎙️ Podcast/Interview",
      description: "Perfect for speech - high quality, efficient compression",
      options: { format: 'mp3' as const, quality: 'high' as const, channels: 1 as const }
    },
    music: {
      name: "🎵 Music/Song",
      description: "Maximum quality for music - lossless stereo",
      options: { format: 'flac' as const, quality: 'lossless' as const, channels: 2 as const }
    },
    meeting: {
      name: "💼 Meeting/Conference",
      description: "Optimized for multiple speakers - balanced quality",
      options: { format: 'wav' as const, quality: 'medium' as const, channels: 2 as const }
    },
    quick: {
      name: "⚡ Quick & Small",
      description: "Fast processing, smaller file size",
      options: { format: 'mp3' as const, quality: 'medium' as const, channels: 1 as const }
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && VideoFormatUtils.isVideoFormat(file.name)) {
      setVideoFile(file);
      setError(null);
    } else {
      setError('Please select a valid video file (MP4, MOV, AVI, MKV, WebM, etc.)');
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = Array.from(event.dataTransfer.files);
    const videoFile = files.find(file => VideoFormatUtils.isVideoFormat(file.name));
    
    if (videoFile) {
      setVideoFile(videoFile);
      setError(null);
    } else {
      setError('Please drop a valid video file');
    }
  }, []);

  const handleExtractAudio = useCallback(async () => {
    if (!videoFile) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(null);

      // Initialize FFmpeg wrapper with progress callback
      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpegWrapper((progress) => {
          setProgress(progress);
        });
      }

      // Extract audio using FFmpeg
      const audioBlob = await ffmpegRef.current.extractAudio(videoFile, extractionOptions);

      // Convert to AudioBuffer for processing
      const audioContext = new AudioContext();
      const audioBuffer = await ffmpegRef.current.convertToWebAudioBuffer(audioBlob, audioContext);

      // Create a File object from the blob
      const audioFileName = videoFile.name.replace(/\.[^/.]+$/, '') + '.' + extractionOptions.format;
      const audioFile = new File([audioBlob], audioFileName, { type: audioBlob.type });

      // Notify parent component
      onAudioExtracted(audioFile, audioBuffer);

    } catch (err) {
      console.error('Audio extraction failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract audio from video');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [videoFile, extractionOptions, onAudioExtracted]);

  const handlePresetSelect = useCallback((presetKey: keyof typeof extractionPresets) => {
    const preset = extractionPresets[presetKey];
    setExtractionOptions(preset.options);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgressColor = () => {
    if (progress?.stage === 'complete') return 'bg-green-500';
    if (progress?.stage === 'extracting') return 'bg-blue-500';
    return 'bg-gray-300';
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upload Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Video className="w-6 h-6 text-purple-600" />
            <div>
              <div className="text-xl">🎬 Video to Audio Magic</div>
              <div className="text-sm font-normal text-muted-foreground">
                Extract perfect audio from any video file
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
              videoFile ? "border-green-300 bg-green-50 dark:bg-green-900/20" : "border-purple-300 hover:border-purple-400 hover:bg-purple-50/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.flv,.m4v,.3gp,.wmv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            
            {videoFile ? (
              <div className="space-y-3">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <div>
                  <div className="font-medium text-green-800 dark:text-green-200">
                    📹 {videoFile.name}
                  </div>
                  <div className="text-sm text-green-600">
                    {formatFileSize(videoFile.size)} • Ready to extract audio
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-purple-400 mx-auto" />
                <div>
                  <div className="text-lg font-medium text-purple-800 dark:text-purple-200">
                    Drop your video file here
                  </div>
                  <div className="text-sm text-purple-600">
                    or click to browse • MP4, MOV, AVI, MKV, WebM and more
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preset Selection */}
          {videoFile && !isProcessing && (
            <div className="space-y-4">
              <div className="text-sm font-medium">Choose extraction preset:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(extractionPresets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetSelect(key as keyof typeof extractionPresets)}
                    className={cn(
                      "p-4 text-left border rounded-lg transition-all hover:shadow-md",
                      JSON.stringify(extractionOptions) === JSON.stringify(preset.options)
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                        : "border-gray-200 hover:border-purple-300"
                    )}
                  >
                    <div className="font-medium mb-1">{preset.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {preset.description}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {preset.options.format.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {preset.options.quality}
                      </Badge>
                      {preset.options.channels && (
                        <Badge variant="secondary" className="text-xs">
                          {preset.options.channels === 1 ? 'Mono' : 'Stereo'}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Advanced Options */}
              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="mb-3"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                </Button>

                {showAdvanced && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Format Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Audio Format</label>
                        <Select
                          value={extractionOptions.format}
                          onValueChange={(value: ExtractionOptions['format']) =>
                            setExtractionOptions(prev => ({ ...prev, format: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VideoFormatUtils.getSupportedAudioFormats().map(format => (
                              <SelectItem key={format} value={format}>
                                {format.toUpperCase()} - {VideoFormatUtils.getFormatDescription(format)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quality Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Quality</label>
                        <Select
                          value={extractionOptions.quality}
                          onValueChange={(value: ExtractionOptions['quality']) =>
                            setExtractionOptions(prev => ({ ...prev, quality: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(['low', 'medium', 'high', 'lossless'] as const).map(quality => (
                              <SelectItem key={quality} value={quality}>
                                {VideoFormatUtils.getQualityDescription(quality)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Channels */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Channels</label>
                        <Select
                          value={extractionOptions.channels?.toString() || '2'}
                          onValueChange={(value) =>
                            setExtractionOptions(prev => ({ 
                              ...prev, 
                              channels: parseInt(value) as 1 | 2 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Mono (1 channel)</SelectItem>
                            <SelectItem value="2">Stereo (2 channels)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Extract Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleExtractAudio}
                  disabled={!videoFile || isProcessing}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Extracting Audio...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      ✨ Extract Audio
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Display */}
      {isProcessing && progress && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  <div>
                    <div className="font-medium">{progress.userMessage}</div>
                    {progress.timeRemaining && (
                      <div className="text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Estimated time remaining: {progress.timeRemaining}s
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm font-mono font-medium">
                  {progress.percentage.toFixed(0)}%
                </div>
              </div>
              
              <Progress value={progress.percentage} className={cn("h-2", getProgressColor())} />
              
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className={cn(
                  "flex items-center gap-2",
                  progress.stage === 'loading' ? "text-blue-600" : "text-gray-400"
                )}>
                  <Film className="w-4 h-4" />
                  Loading
                </div>
                <div className={cn(
                  "flex items-center gap-2",
                  progress.stage === 'extracting' ? "text-blue-600" : "text-gray-400"
                )}>
                  <Zap className="w-4 h-4" />
                  Extracting
                </div>
                <div className={cn(
                  "flex items-center gap-2",
                  progress.stage === 'converting' ? "text-blue-600" : "text-gray-400"
                )}>
                  <Headphones className="w-4 h-4" />
                  Converting
                </div>
                <div className={cn(
                  "flex items-center gap-2",
                  progress.stage === 'complete' ? "text-green-600" : "text-gray-400"
                )}>
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <div className="font-medium text-red-800">Video processing failed</div>
                <div className="text-sm text-red-600">{error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}