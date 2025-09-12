"use client";

import React, { useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Mic, FileAudio, X, Check } from 'lucide-react';
import { GestureHandler } from '@/lib/mobile/gestures';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MobileFileUploadProps {
  onFileUpload?: (file: File, duration?: number) => void;
  isLoading?: boolean;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
  className?: string;
}

export function MobileFileUpload({
  onFileUpload,
  isLoading = false,
  acceptedTypes = ['audio/*', 'video/*'],
  maxFileSize = 500, // 500MB default
  className,
}: MobileFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Initialize gesture handling for drop zone
  React.useEffect(() => {
    if (dropZoneRef.current) {
      const handler = new GestureHandler(dropZoneRef.current, {
        preventScroll: false,
        tapThreshold: 10,
      });

      handler.on('tap', () => {
        triggerFileInput();
      });

      return () => handler.destroy();
    }
  }, [dropZoneRef.current]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isValidType) {
      toast.error(`❌ Please select a valid audio or video file`);
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      toast.error(`❌ File too large. Maximum size is ${maxFileSize}MB`);
      return;
    }

    setUploadedFile(file);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      // Get audio duration if it's an audio file
      let duration: number | undefined;
      if (file.type.startsWith('audio/')) {
        duration = await getAudioDuration(file);
      }

      // Clear progress interval
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Call upload handler
      onFileUpload?.(file, duration);

      toast.success(`✅ ${file.name} uploaded successfully!`);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('❌ Upload failed. Please try again.');
      setUploadedFile(null);
      setUploadProgress(0);
    }
  }, [acceptedTypes, maxFileSize, onFileUpload]);

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(audio.duration);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to get audio duration'));
      };
      
      audio.src = objectUrl;
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  const clearFile = useCallback(() => {
    setUploadedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Camera capture for mobile devices
  const captureFromCamera = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  }, []);

  // Microphone recording (would need additional implementation)
  const startRecording = useCallback(() => {
    toast.info('🎤 Recording feature coming soon!');
    // TODO: Implement microphone recording
  }, []);

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        multiple={false}
      />

      {/* Upload Status */}
      {uploadedFile ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Upload Progress */}
            {uploadProgress < 100 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Uploading...
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Main Upload Area */}
          <Card 
            className={cn(
              "border-2 border-dashed transition-all duration-200 cursor-pointer touch-manipulation",
              isDragOver 
                ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20" 
                : "border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500",
              isLoading && "opacity-50 pointer-events-none"
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <CardContent 
              ref={dropZoneRef}
              className="p-8 text-center space-y-4"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Upload Icon */}
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center">
                {isLoading ? (
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                )}
              </div>

              {/* Upload Text */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  📁 Upload Audio or Video
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tap to select, or drag and drop files here
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Supports MP3, WAV, MP4, and more • Max {maxFileSize}MB
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Button
              variant="outline"
              onClick={triggerFileInput}
              className="h-16 flex-col gap-2 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <FileAudio className="w-6 h-6" />
              <span className="text-xs">Files</span>
            </Button>

            <Button
              variant="outline"
              onClick={captureFromCamera}
              className="h-16 flex-col gap-2 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Camera className="w-6 h-6" />
              <span className="text-xs">Camera</span>
            </Button>

            <Button
              variant="outline"
              onClick={startRecording}
              className="h-16 flex-col gap-2 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Mic className="w-6 h-6" />
              <span className="text-xs">Record</span>
            </Button>
          </div>
        </>
      )}

      {/* Mobile-Specific Tips */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
          📱 Mobile Tips
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Use "Files" to browse your device storage</li>
          <li>• "Camera" can capture video with audio</li>
          <li>• Long press for additional options</li>
          <li>• Swipe up from bottom for more apps</li>
        </ul>
      </div>
    </div>
  );
}