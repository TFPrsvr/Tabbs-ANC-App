"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
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

export function AudioVisualizer({
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
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  // Generate waveform data from audio buffer
  useEffect(() => {
    if (!audioBuffer) return;

    const channelData = audioBuffer.getChannelData(0);
    const samples = 300; // Number of waveform bars
    const blockSize = Math.floor(channelData.length / samples);
    const data: number[] = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j] || 0);
      }
      data.push(sum / blockSize);
    }

    // Normalize data
    const max = Math.max(...data);
    const normalizedData = data.map(val => (val / max) * 100);
    setWaveformData(normalizedData);
  }, [audioBuffer]);

  // Draw static waveform
  const drawWaveform = useCallback(() => {
    const canvas = waveformRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveformData.length;
    const centerY = height / 2;

    // Draw waveform bars
    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = (amplitude / 100) * (height * 0.8);
      const playedProgress = duration > 0 ? currentTime / duration : 0;
      const isPlayed = index < playedProgress * waveformData.length;

      // Gradient colors
      const gradient = ctx.createLinearGradient(0, centerY - barHeight/2, 0, centerY + barHeight/2);
      
      if (isPlayed) {
        // Played portion - purple to blue gradient
        gradient.addColorStop(0, '#8B5CF6'); // Purple
        gradient.addColorStop(1, '#3B82F6'); // Blue
      } else {
        // Unplayed portion - gray gradient
        gradient.addColorStop(0, '#E5E7EB');
        gradient.addColorStop(1, '#9CA3AF');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, centerY - barHeight/2, barWidth - 1, barHeight);
    });

    // Draw current position indicator
    if (duration > 0) {
      const progressX = (currentTime / duration) * width;
      ctx.strokeStyle = '#7C3AED';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  }, [waveformData, currentTime, duration]);

  // Draw animated frequency bars (when playing)
  const drawFrequencyBars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Simulate frequency data for animation
    const bars = 32;
    const barWidth = width / bars;

    for (let i = 0; i < bars; i++) {
      // Simulate animated frequency data
      const frequency = Math.random() * 0.7 + 0.3; // Random between 0.3-1.0
      const barHeight = frequency * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#8B5CF6'); // Purple
      gradient.addColorStop(0.5, '#3B82F6'); // Blue  
      gradient.addColorStop(1, '#10B981'); // Green

      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    }
  }, [isPlaying]);

  // Animation loop for frequency bars
  useEffect(() => {
    if (!isPlaying) return;

    const animate = () => {
      drawFrequencyBars();
      if (isPlaying) {
        requestAnimationFrame(animate);
      }
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, drawFrequencyBars]);

  // Redraw waveform when data changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Handle waveform click/drag for seeking
  const handleWaveformInteraction = useCallback((event: React.MouseEvent) => {
    if (!waveformRef.current || !duration) return;

    const canvas = waveformRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const seekTime = Math.max(0, Math.min(duration, percentage * duration));

    if (isDragging) {
      setDragTime(seekTime);
    } else {
      onSeek?.(seekTime);
    }
  }, [duration, isDragging, onSeek]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const displayTime = isDragging ? dragTime : currentTime;

  return (
    <div className={cn("w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6", className)}>
      {/* Waveform Display */}
      <div className="relative mb-6">
        <div className="relative h-32 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
          {/* Static Waveform */}
          <canvas
            ref={waveformRef}
            className="absolute inset-0 w-full h-full cursor-pointer"
            width={600}
            height={128}
            onMouseDown={(e) => {
              setIsDragging(true);
              handleWaveformInteraction(e);
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                handleWaveformInteraction(e);
              }
            }}
            onMouseUp={() => {
              if (isDragging) {
                onSeek?.(dragTime);
                setIsDragging(false);
              }
            }}
            onMouseLeave={() => {
              if (isDragging) {
                onSeek?.(dragTime);
                setIsDragging(false);
              }
            }}
          />
          
          {/* Animated Frequency Bars (overlay when playing) */}
          {isPlaying && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
              width={600}
              height={128}
            />
          )}
        </div>

        {/* Time Display */}
        <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-mono">{formatTime(displayTime)}</span>
          <span className="font-mono">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        {/* Skip Back */}
        <Button
          variant="outline"
          size="lg"
          onClick={onSkipBack}
          className="w-12 h-12 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20"
        >
          <SkipBack className="w-5 h-5" />
        </Button>

        {/* Play/Pause */}
        <Button
          onClick={isPlaying ? onPause : onPlay}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-white" />
          ) : (
            <Play className="w-7 h-7 text-white ml-0.5" />
          )}
        </Button>

        {/* Skip Forward */}
        <Button
          variant="outline"
          size="lg"
          onClick={onSkipForward}
          className="w-12 h-12 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20"
        >
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onVolumeChange?.(volume > 0 ? 0 : 1)}
          className="w-8 h-8 rounded-full"
        >
          {volume > 0 ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>

        {/* Volume Slider */}
        <div className="flex-1 relative">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div 
              className="h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 text-center">
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs",
          isPlaying 
            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200" 
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isPlaying ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )} />
          {isPlaying ? "Playing" : "Paused"}
        </div>
      </div>
    </div>
  );
}