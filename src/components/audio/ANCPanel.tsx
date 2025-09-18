"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AudioSlider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Shield, Target, Headphones, Mic, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ANCSettings {
  enabled: boolean;
  intensity: number;
  adaptiveMode: boolean;
  voiceFocusMode: boolean;
  selectiveHearing: boolean;
  transparencyMode: boolean;
  transparencyLevel: number;
  environmentalAwareness: boolean;
}

interface ANCPanelProps {
  settings: ANCSettings;
  deviceType: 'speakers' | 'headphones' | 'earbuds';
  onSettingsChange: (settings: Partial<ANCSettings>) => void;
  className?: string;
}

export function ANCPanel({
  settings,
  deviceType,
  onSettingsChange,
  className
}: ANCPanelProps) {
  const handleToggle = (key: keyof ANCSettings) => {
    onSettingsChange({ [key]: !settings[key] });
  };

  const handleSliderChange = (key: keyof ANCSettings, value: number[]) => {
    onSettingsChange({ [key]: value[0] });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Shield className="h-4 w-4 mr-2" />
          ANC+ Controls
          <div className="ml-auto flex items-center space-x-1">
            <Headphones className="h-3 w-3" />
            <span className="text-xs text-muted-foreground capitalize">
              {deviceType}
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main ANC Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className={cn(
              "h-4 w-4",
              settings.enabled ? "text-green-600" : "text-muted-foreground"
            )} />
            <span className="text-sm font-medium">
              Active Noise Cancellation
            </span>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={() => handleToggle('enabled')}
          />
        </div>

        {settings.enabled && (
          <>
            {/* ANC Intensity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Intensity</span>
                <span className="text-xs text-muted-foreground">
                  {settings.intensity}%
                </span>
              </div>
              <AudioSlider
                value={[settings.intensity]}
                onValueChange={(value) => handleSliderChange('intensity', value)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Advanced Settings */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-3 w-3" />
                  <span className="text-sm">Adaptive Mode</span>
                </div>
                <Switch
                  checked={settings.adaptiveMode}
                  onCheckedChange={() => handleToggle('adaptiveMode')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mic className="h-3 w-3" />
                  <span className="text-sm">Voice Focus</span>
                </div>
                <Switch
                  checked={settings.voiceFocusMode}
                  onCheckedChange={() => handleToggle('voiceFocusMode')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-3 w-3" />
                  <span className="text-sm">Selective Hearing</span>
                </div>
                <Switch
                  checked={settings.selectiveHearing}
                  onCheckedChange={() => handleToggle('selectiveHearing')}
                />
              </div>
            </div>

            {/* Transparency Mode */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Transparency Mode</span>
                <Switch
                  checked={settings.transparencyMode}
                  onCheckedChange={() => handleToggle('transparencyMode')}
                />
              </div>

              {settings.transparencyMode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Level</span>
                    <span className="text-xs text-muted-foreground">
                      {settings.transparencyLevel}%
                    </span>
                  </div>
                  <AudioSlider
                    value={[settings.transparencyLevel]}
                    onValueChange={(value) => handleSliderChange('transparencyLevel', value)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm">Environmental Awareness</span>
                <Switch
                  checked={settings.environmentalAwareness}
                  onCheckedChange={() => handleToggle('environmentalAwareness')}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}