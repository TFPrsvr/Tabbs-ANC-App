"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AudioSlider } from '../ui/slider';
import { Volume2, VolumeX, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamInfo {
  id: string;
  type: 'voice' | 'music' | 'ambient' | 'noise';
  name: string;
  volume: number;
  isMuted: boolean;
  isActive: boolean;
  color: string;
  icon: string;
  frequency: string;
}

interface StreamManagerProps {
  streams: StreamInfo[];
  onStreamVolumeChange: (streamId: string, volume: number) => void;
  onStreamMute: (streamId: string) => void;
  onStreamToggle: (streamId: string) => void;
  className?: string;
}

export function StreamManager({
  streams,
  onStreamVolumeChange,
  onStreamMute,
  onStreamToggle,
  className
}: StreamManagerProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          🎚️ Stream Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {streams.map((stream) => (
          <div
            key={stream.id}
            className={cn(
              "flex items-center space-x-3 p-2 rounded-lg border",
              stream.isActive ? "bg-muted/50" : "bg-background opacity-60"
            )}
          >
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <span className="text-lg">{stream.icon}</span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className={cn("text-sm font-medium", stream.color)}>
                    {stream.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onStreamToggle(stream.id)}
                    className="h-5 w-5 p-0"
                  >
                    {stream.isActive ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stream.frequency}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStreamMute(stream.id)}
                className="h-6 w-6 p-0"
                disabled={!stream.isActive}
              >
                {stream.isMuted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>

              <div className="w-16">
                <AudioSlider
                  value={[stream.isMuted ? 0 : stream.volume]}
                  onValueChange={(value) => onStreamVolumeChange(stream.id, value[0] || 0)}
                  max={100}
                  step={1}
                  disabled={!stream.isActive || stream.isMuted}
                  className="w-full"
                />
              </div>

              <span className="text-xs text-muted-foreground w-8 text-right">
                {stream.isMuted ? '0%' : `${Math.round(stream.volume)}%`}
              </span>
            </div>
          </div>
        ))}

        {/* Stream mixing info */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Active streams: {streams.filter(s => s.isActive && !s.isMuted).length}</span>
            <span>Total channels: {streams.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}