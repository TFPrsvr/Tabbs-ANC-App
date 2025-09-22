"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { GestureHandler } from '@/lib/mobile/gestures';
import { cn } from '@/lib/utils';

interface MobileAudioControlsProps {
  audioBuffer?: AudioBuffer;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  volume?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onVolumeChange?: (volume: number) => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  className?: string;
}

export function MobileAudioControls({
  audioBuffer,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  volume = 1,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onSkipBack,
  onSkipForward,
  className,
}: MobileAudioControlsProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const [gestureHandler, setGestureHandler] = useState<GestureHandler | null>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);
  const [tempVolume, setTempVolume] = useState(volume);

  // Initialize gesture handling
  useEffect(() => {
    if (progressBarRef.current) {
      const handler = new GestureHandler(progressBarRef.current, {
        preventScroll: true,
        tapThreshold: 5,
      });

      handler
        .on('tap', (event) => {
          handleProgressTap(event.position.x);
        })
        .on('pan', (event) => {
          handleProgressDrag(event.position.x);
        });

      setGestureHandler(handler);

      return () => {
        handler.destroy();
        setGestureHandler(null);
      };
    }
    return undefined;
  }, [progressBarRef.current]);

  // Volume gesture handling
  useEffect(() => {
    if (volumeBarRef.current) {
      const handler = new GestureHandler(volumeBarRef.current, {
        preventScroll: true,
        tapThreshold: 5,
      });

      handler
        .on('tap', (event) => {
          handleVolumeTap(event.position.x);
        })
        .on('pan', (event) => {
          handleVolumeDrag(event.position.x);
        });

      return () => handler.destroy();
    }
    return undefined;
  }, [volumeBarRef.current]);

  const handleProgressTap = useCallback((x: number) => {
    if (!progressBarRef.current || !duration) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const newTime = percentage * duration;
    
    onSeek?.(newTime);
  }, [duration, onSeek]);

  const handleProgressDrag = useCallback((x: number) => {
    if (!progressBarRef.current || !duration) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const newTime = percentage * duration;
    
    setIsDraggingProgress(true);
    setTempProgress(newTime);
  }, [duration]);

  const handleVolumeTap = useCallback((x: number) => {
    if (!volumeBarRef.current) return;

    const rect = volumeBarRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    
    onVolumeChange?.(percentage);
  }, [onVolumeChange]);

  const handleVolumeDrag = useCallback((x: number) => {
    if (!volumeBarRef.current) return;

    const rect = volumeBarRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    
    setIsDraggingVolume(true);
    setTempVolume(percentage);
  }, []);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 
    ? (isDraggingProgress ? tempProgress : currentTime) / duration * 100 
    : 0;

  const volumePercentage = (isDraggingVolume ? tempVolume : volume) * 100;

  return (
    <Card className={cn("w-full max-w-md mx-auto no-select", className)}>
      <CardContent className="p-4 space-y-4 audio-controls">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div 
            ref={progressBarRef}
            className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer touch-manipulation"
            style={{ touchAction: 'pan-x' }}
          >
            {/* Progress Fill */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Progress Thumb */}
            <div 
              className={cn(
                "absolute top-1/2 transform -translate-y-1/2 w-5 h-5 bg-white border-2 border-purple-500 rounded-full shadow-lg transition-transform duration-150",
                isDraggingProgress && "scale-125"
              )}
              style={{ left: `calc(${progressPercentage}% - 10px)` }}
            />
            
            {/* Audio Waveform Visualization (if available) */}
            {audioBuffer && (
              <div className="absolute inset-0 rounded-full overflow-hidden opacity-30">
                <WaveformVisualization 
                  audioBuffer={audioBuffer} 
                  progress={progressPercentage} 
                />
              </div>
            )}
          </div>
          
          {/* Time Display */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(isDraggingProgress ? tempProgress : currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Control Buttons */}
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="ghost"
            size="lg"
            onClick={onSkipBack}
            className="h-12 w-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <SkipBack className="w-6 h-6" />
          </Button>

          <Button
            onClick={isPlaying ? onPause : onPlay}
            className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onSkipForward}
            className="h-12 w-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <SkipForward className="w-6 h-6" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVolumeChange?.(volume > 0 ? 0 : 1)}
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {volume > 0 ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </Button>

          <div 
            ref={volumeBarRef}
            className="flex-1 relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer touch-manipulation"
            style={{ touchAction: 'pan-x' }}
          >
            {/* Volume Fill */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${volumePercentage}%` }}
            />
            
            {/* Volume Thumb */}
            <div 
              className={cn(
                "absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 border-green-500 rounded-full shadow transition-transform duration-150",
                isDraggingVolume && "scale-125"
              )}
              style={{ left: `calc(${volumePercentage}% - 6px)` }}
            />
          </div>
          
          <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
            {Math.round(volumePercentage)}%
          </span>
        </div>

        {/* Haptic Feedback Indicator */}
        {(isDraggingProgress || isDraggingVolume) && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 animate-pulse">
            📱 Touch controls active
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple waveform visualization component
interface WaveformVisualizationProps {
  audioBuffer: AudioBuffer;
  progress: number;
}

function WaveformVisualization({ audioBuffer, progress }: WaveformVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !audioBuffer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Get audio data (downsampled for performance)
    const channelData = audioBuffer.getChannelData(0);
    const samples = Math.min(width, 200); // Limit samples for mobile performance
    const blockSize = Math.floor(channelData.length / samples);

    ctx.fillStyle = 'rgba(139, 92, 246, 0.3)'; // Purple with transparency

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j] || 0);
      }
      const amplitude = sum / blockSize;
      const barHeight = amplitude * height * 0.8;
      const x = (i / samples) * width;
      
      ctx.fillRect(x, (height - barHeight) / 2, width / samples, barHeight);
    }

  }, [audioBuffer]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={24}
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}