"use client";

import React from 'react';
import { Progress } from '../ui/progress';
import { AudioSlider } from '../ui/slider';

interface AudioProgressProps {
  currentTime: number;
  duration: number;
  isLoading: boolean;
  processingProgress?: number;
  onSeek: (time: number) => void;
  className?: string;
}

export function AudioProgress({
  currentTime,
  duration,
  isLoading,
  processingProgress,
  onSeek,
  className
}: AudioProgressProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Processing Progress */}
      {isLoading && typeof processingProgress === 'number' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Processing...</span>
            <span className="text-xs text-muted-foreground">
              {Math.round(processingProgress)}%
            </span>
          </div>
          <Progress value={processingProgress} className="h-1" />
        </div>
      )}

      {/* Time Display */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono text-muted-foreground">
          {formatTime(currentTime)}
        </span>
        <span className="font-mono text-muted-foreground">
          {formatTime(duration)}
        </span>
      </div>

      {/* Seek Bar */}
      <div className="space-y-1">
        <AudioSlider
          value={[currentTime]}
          onValueChange={(value) => onSeek(value[0])}
          max={duration}
          step={0.1}
          disabled={isLoading || duration === 0}
          className="w-full"
        />

        {/* Progress indicator */}
        <div className="flex items-center justify-center">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Additional info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {duration > 0 ? `${Math.round(progressPercentage)}% complete` : 'No audio loaded'}
        </span>
        <span>
          {duration > 0 ? `${formatTime(duration - currentTime)} remaining` : ''}
        </span>
      </div>
    </div>
  );
}