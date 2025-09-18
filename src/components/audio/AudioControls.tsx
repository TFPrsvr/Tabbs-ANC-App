"use client";

import React from 'react';
import { Button } from '../ui/button';
import {
  Play, Pause, Square, RotateCcw, FastForward, Rewind,
  SkipForward, SkipBack
} from 'lucide-react';

interface AudioControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onReset: () => void;
  onPlaybackRateChange: (rate: number) => void;
}

export function AudioControls({
  isPlaying,
  isLoading,
  playbackRate,
  onPlay,
  onPause,
  onStop,
  onRewind,
  onFastForward,
  onSkipBack,
  onSkipForward,
  onReset,
  onPlaybackRateChange
}: AudioControlsProps) {
  const playbackRates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="space-y-4">
      {/* Main playback controls */}
      <div className="flex items-center justify-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onSkipBack}
          disabled={isLoading}
          className="h-8 w-8 rounded-full p-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRewind}
          disabled={isLoading}
          className="h-8 w-8 rounded-full p-0"
        >
          <Rewind className="h-4 w-4" />
        </Button>

        <Button
          variant={isPlaying ? "destructive" : "default"}
          size="lg"
          onClick={isPlaying ? onPause : onPlay}
          disabled={isLoading}
          className="h-12 w-12 rounded-full p-0"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-foreground" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onFastForward}
          disabled={isLoading}
          className="h-8 w-8 rounded-full p-0"
        >
          <FastForward className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSkipForward}
          disabled={isLoading}
          className="h-8 w-8 rounded-full p-0"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Secondary controls */}
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onStop}
          disabled={isLoading}
          className="h-8 px-3"
        >
          <Square className="h-3 w-3 mr-1" />
          Stop
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={isLoading}
          className="h-8 px-3"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Playback rate control */}
      <div className="flex items-center justify-center space-x-1">
        <span className="text-xs text-muted-foreground">Speed:</span>
        {playbackRates.map((rate) => (
          <Button
            key={rate}
            variant={playbackRate === rate ? "default" : "ghost"}
            size="sm"
            onClick={() => onPlaybackRateChange(rate)}
            disabled={isLoading}
            className="h-6 px-2 text-xs"
          >
            {rate}x
          </Button>
        ))}
      </div>
    </div>
  );
}