"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AudioSlider } from '../ui/slider';
import { AudioVisualizer } from '@/lib/audio/audio-visualizer';
import { AudioStream } from '@/types';
import { cn } from '@/lib/utils';
import { Volume2, VolumeX, Play, Pause, Eye, EyeOff } from 'lucide-react';

interface StreamControllerProps {
  stream: AudioStream;
  analyser?: AnalyserNode;
  onVolumeChange: (streamId: string, volume: number) => void;
  onMuteToggle: (streamId: string, muted: boolean) => void;
  onActiveToggle: (streamId: string, active: boolean) => void;
  className?: string;
}

export function StreamController({
  stream,
  analyser,
  onVolumeChange,
  onMuteToggle,
  onActiveToggle,
  className,
}: StreamControllerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<AudioVisualizer | null>(null);
  const [isVisualizerActive, setIsVisualizerActive] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState(0);

  useEffect(() => {
    if (canvasRef.current && analyser && isVisualizerActive) {
      visualizerRef.current = new AudioVisualizer(canvasRef.current, analyser);
      visualizerRef.current.startVisualization('frequency');
    }

    return () => {
      if (visualizerRef.current) {
        visualizerRef.current.dispose();
        visualizerRef.current = null;
      }
    };
  }, [analyser, isVisualizerActive]);

  useEffect(() => {
    let animationFrame: number;

    const updateVolumeLevel = () => {
      if (analyser && stream.isActive && !stream.isMuted) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] ?? 0;
        }
        setVolumeLevel(sum / (dataArray.length * 255));
      } else {
        setVolumeLevel(0);
      }
      
      animationFrame = requestAnimationFrame(updateVolumeLevel);
    };

    updateVolumeLevel();
    return () => cancelAnimationFrame(animationFrame);
  }, [analyser, stream.isActive, stream.isMuted]);

  const getStreamTypeColor = (type: string): string => {
    switch (type) {
      case 'voice': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'music': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'noise': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'ambient': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const handleVolumeChange = (values: number[]) => {
    const newVolume = (values[0] ?? 50) / 100;
    onVolumeChange(stream.id, newVolume);
  };

  const toggleVisualizer = () => {
    setIsVisualizerActive(!isVisualizerActive);
    if (visualizerRef.current) {
      if (isVisualizerActive) {
        visualizerRef.current.stopVisualization();
      } else {
        visualizerRef.current.startVisualization('frequency');
      }
    }
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      !stream.isActive && 'opacity-60',
      getStreamTypeColor(stream.type),
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {stream.name}
            {stream.frequency && (
              <span className="text-xs font-normal text-muted-foreground">
                {Math.round(stream.frequency)} Hz
              </span>
            )}
          </span>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onActiveToggle(stream.id, !stream.isActive)}
              className="h-7 w-7 p-0"
            >
              {stream.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMuteToggle(stream.id, !stream.isMuted)}
              className="h-7 w-7 p-0"
            >
              {stream.isMuted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVisualizer}
              className="h-7 w-7 p-0"
            >
              {isVisualizerActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Audio Visualizer */}
        <div className="relative h-20 bg-black/5 rounded-md overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: isVisualizerActive ? 'block' : 'none' }}
          />
          {!isVisualizerActive && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <span className="text-xs">Visualizer paused</span>
            </div>
          )}
        </div>

        {/* Volume Control */}
        <div className="space-y-2">
          <AudioSlider
            value={[stream.volume * 100]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            label="Volume"
            showValue
            unit="%"
            disabled={!stream.isActive || stream.isMuted}
            className="w-full"
          />
          
          {/* Volume Level Indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Level:</span>
            <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${volumeLevel * 100}%` }}
              />
            </div>
            <span className="min-w-[3ch]">{Math.round(volumeLevel * 100)}%</span>
          </div>
        </div>

        {/* Stream Info */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Type: {stream.type}</span>
          <span>Status: {stream.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface MultiStreamControllerProps {
  streams: AudioStream[];
  analysers?: Map<string, AnalyserNode>;
  onStreamUpdate: (streamId: string, updates: Partial<AudioStream>) => void;
  className?: string;
}

export function MultiStreamController({
  streams,
  analysers,
  onStreamUpdate,
  className,
}: MultiStreamControllerProps) {
  const handleVolumeChange = (streamId: string, volume: number) => {
    onStreamUpdate(streamId, { volume });
  };

  const handleMuteToggle = (streamId: string, muted: boolean) => {
    onStreamUpdate(streamId, { isMuted: muted });
  };

  const handleActiveToggle = (streamId: string, active: boolean) => {
    onStreamUpdate(streamId, { isActive: active });
  };

  const muteAll = () => {
    streams.forEach(stream => {
      onStreamUpdate(stream.id, { isMuted: true });
    });
  };

  const unmuteAll = () => {
    streams.forEach(stream => {
      onStreamUpdate(stream.id, { isMuted: false });
    });
  };

  const resetVolumes = () => {
    streams.forEach(stream => {
      onStreamUpdate(stream.id, { volume: 1.0, isMuted: false });
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Global Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Audio Stream Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={muteAll}>
              Mute All
            </Button>
            <Button variant="outline" size="sm" onClick={unmuteAll}>
              Unmute All
            </Button>
            <Button variant="outline" size="sm" onClick={resetVolumes}>
              Reset Volumes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Stream Controllers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {streams.map((stream) => (
          <StreamController
            key={stream.id}
            stream={stream}
            analyser={analysers?.get(stream.id)}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={handleMuteToggle}
            onActiveToggle={handleActiveToggle}
          />
        ))}
      </div>

      {streams.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No audio streams available. Upload an audio file to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}