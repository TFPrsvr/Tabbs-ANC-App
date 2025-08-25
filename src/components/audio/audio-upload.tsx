"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { cn, formatBytes } from '@/lib/utils';
import { SUPPORTED_AUDIO_FORMATS, MAX_FILE_SIZE, EMOJIS } from '@/constants';
import { useUserSubscription } from '@/lib/auth/clerk';

interface AudioUploadProps {
  onFileUpload: (file: File, duration?: number) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function AudioUpload({ onFileUpload, isLoading, className }: AudioUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { checkSubscriptionLimits } = useUserSubscription();

  const validateFile = useCallback(async (file: File): Promise<boolean> => {
    setUploadError(null);

    // Check file type
    if (!SUPPORTED_AUDIO_FORMATS.includes(file.type as string)) {
      setUploadError(
        `${EMOJIS.ERROR} Unsupported file format. Please use MP3, WAV, M4A, AAC, OGG, or FLAC.`
      );
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(
        `${EMOJIS.ERROR} File too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`
      );
      return false;
    }

    // Get audio duration
    const duration = await getAudioDuration(file);
    
    // Check subscription limits
    const canUpload = await checkSubscriptionLimits(file.size, Math.floor(duration));
    if (!canUpload) {
      setUploadError(
        `${EMOJIS.PREMIUM} Upload limit reached. Please upgrade your plan or delete some files.`
      );
      return false;
    }

    return true;
  }, [checkSubscriptionLimits]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const isValid = await validateFile(file);
    if (!isValid) return;

    try {
      const duration = await getAudioDuration(file);
      await onFileUpload(file, duration);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`${EMOJIS.ERROR} Failed to upload file. Please try again.`);
    }
  }, [onFileUpload, validateFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  return (
    <Card className={cn('w-full max-w-lg mx-auto', className)}>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            'hover:border-primary hover:bg-primary/5',
            isDragActive && 'border-primary bg-primary/10',
            isLoading && 'cursor-not-allowed opacity-50',
            uploadError && 'border-destructive bg-destructive/5'
          )}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="text-4xl">
              {isLoading ? EMOJIS.PROCESSING : EMOJIS.UPLOAD}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive ? 'Drop your audio file here' : 'Upload Audio File'}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4">
                {isLoading 
                  ? 'Processing your file...' 
                  : 'Drag and drop or click to select an audio file'
                }
              </p>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC</p>
                <p>Maximum file size: {formatBytes(MAX_FILE_SIZE)}</p>
              </div>
            </div>
            
            {!isDragActive && !isLoading && (
              <Button variant="outline" className="mt-4">
                {EMOJIS.AUDIO} Choose Audio File
              </Button>
            )}
          </div>
        </div>
        
        {uploadError && (
          <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{uploadError}</p>
          </div>
        )}
        
        {isLoading && (
          <div className="mt-4 space-y-2">
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 animate-pulse"
                style={{ width: '60%' }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Analyzing audio file...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    });
    
    audio.src = url;
  });
}