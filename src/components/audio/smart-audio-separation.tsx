"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { AudioSlider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { 
  AISourceSeparationEngine, 
  SeparationSettings, 
  SeparatedStreams,
  SeparationProgress 
} from '@/lib/audio/engines/source-separation';
import { cn } from '@/lib/utils';
import { 
  Wand2, Settings, Play, Pause, Download, Volume2, VolumeX, 
  Zap, Clock, CheckCircle, AlertCircle, Headphones, Music,
  Mic, Users, RotateCcw, Shuffle
} from 'lucide-react';

interface SmartAudioSeparationProps {
  audioFile: File | null;
  audioBuffer: AudioBuffer | null;
  onSeparationComplete?: (streams: SeparatedStreams) => void;
  className?: string;
}

export function SmartAudioSeparation({
  audioFile,
  audioBuffer,
  onSeparationComplete,
  className
}: SmartAudioSeparationProps) {
  // Core state
  const [separationEngine] = useState(() => new AISourceSeparationEngine((progress) => setProgress(progress)));
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<SeparationProgress | null>(null);
  const [separatedStreams, setSeparatedStreams] = useState<SeparatedStreams | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User settings state
  const [selectedPreset, setSelectedPreset] = useState('KARAOKE');
  const [customSettings, setCustomSettings] = useState<SeparationSettings>(
    AISourceSeparationEngine.PRESETS.KARAOKE.settings
  );
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Playback state for previews
  const [playingStream, setPlayingStream] = useState<string | null>(null);
  const [streamVolumes, setStreamVolumes] = useState<Record<string, number>>({
    vocals: 80,
    drums: 70,
    bass: 75,
    instruments: 65,
    accompaniment: 60
  });

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Initialize engine
  useEffect(() => {
    separationEngine.initialize().catch(console.error);
    
    return () => separationEngine.dispose();
  }, [separationEngine]);

  // Handle preset selection
  const handlePresetChange = useCallback((presetName: string) => {
    const preset = AISourceSeparationEngine.PRESETS[presetName as keyof typeof AISourceSeparationEngine.PRESETS];
    if (preset) {
      setSelectedPreset(presetName);
      setCustomSettings(preset.settings);
    }
  }, []);

  // Start smart separation
  const handleStartSeparation = useCallback(async () => {
    if (!audioBuffer) {
      setError("No audio loaded. Please upload an audio file first.");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(null);
      setSeparatedStreams(null);

      const streams = await separationEngine.separateAudio(audioBuffer, customSettings);
      
      setSeparatedStreams(streams);
      onSeparationComplete?.(streams);
      
      // Create preview audio elements
      Object.entries(streams).forEach(([key, stream]) => {
        const audioBlob = audioBufferToBlob(stream.audioBuffer);
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRefs.current[key]) {
          audioRefs.current[key].src = audioUrl;
        } else {
          const audio = new Audio(audioUrl);
          audioRefs.current[key] = audio;
        }
      });
      
    } catch (err) {
      console.error('Separation error:', err);
      setError(err instanceof Error ? err.message : 'Separation failed');
    } finally {
      setIsProcessing(false);
    }
  }, [audioBuffer, customSettings, separationEngine, onSeparationComplete]);

  // Stream playback controls
  const handlePlayStream = useCallback(async (streamKey: string) => {
    const audio = audioRefs.current[streamKey];
    if (!audio) return;

    try {
      if (playingStream === streamKey) {
        audio.pause();
        setPlayingStream(null);
      } else {
        // Pause all other streams
        Object.values(audioRefs.current).forEach(a => a.pause());
        
        audio.volume = streamVolumes[streamKey] / 100;
        await audio.play();
        setPlayingStream(streamKey);
        
        audio.onended = () => setPlayingStream(null);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  }, [playingStream, streamVolumes]);

  // Stream volume control
  const handleVolumeChange = useCallback((streamKey: string, volume: number) => {
    setStreamVolumes(prev => ({ ...prev, [streamKey]: volume }));
    
    const audio = audioRefs.current[streamKey];
    if (audio) {
      audio.volume = volume / 100;
    }
  }, []);

  // Download separated stream
  const handleDownload = useCallback((streamKey: string, stream: any) => {
    const audioBlob = audioBufferToBlob(stream.audioBuffer);
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name?.split('.')[0] || 'separated'}_${streamKey}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [audioFile]);

  // Helper function to convert AudioBuffer to Blob
  function audioBufferToBlob(audioBuffer: AudioBuffer): Blob {
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, audioBuffer.numberOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * audioBuffer.numberOfChannels * 2, true);
    view.setUint16(32, audioBuffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Audio data
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Get user-friendly quality description
  const getQualityDescription = (quality: string) => {
    switch (quality) {
      case 'fast': return '⚡ Quick Preview (30 sec per minute)';
      case 'balanced': return '⚖️ Balanced Quality (1 min per minute)';
      case 'high_quality': return '💎 Studio Quality (2 min per minute)';
      default: return quality;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Smart Separation Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Wand2 className="w-6 h-6 text-purple-600" />
            <div>
              <div className="text-xl">🎯 Smart Audio Separation</div>
              <div className="text-sm font-normal text-muted-foreground">
                Magically separate any song into individual parts using AI
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Quick Start Presets */}
          <div>
            <label className="text-sm font-medium mb-3 block">Choose what you want to do:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(AISourceSeparationEngine.PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={cn(
                    "p-4 text-left border rounded-lg transition-all hover:shadow-md",
                    selectedPreset === key 
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                      : "border-gray-200 hover:border-purple-300"
                  )}
                >
                  <div className="font-medium text-base mb-1">{preset.name}</div>
                  <div className="text-sm text-muted-foreground">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Processing Quality */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Processing Speed & Quality:</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {['fast', 'balanced', 'high_quality'].map((quality) => (
                <button
                  key={quality}
                  onClick={() => setCustomSettings(prev => ({ ...prev, separationQuality: quality as any }))}
                  className={cn(
                    "p-3 text-center border rounded-lg transition-all text-sm",
                    customSettings.separationQuality === quality
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 hover:border-blue-300"
                  )}
                >
                  {getQualityDescription(quality)}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
            </Button>

            {audioBuffer && (
              <Button
                onClick={handleStartSeparation}
                disabled={isProcessing}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    ✨ Start Magic Separation
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Advanced Settings */}
          {showAdvancedSettings && (
            <Card className="bg-white/50">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customSettings.enableVocalIsolation}
                      onChange={(e) => setCustomSettings(prev => ({ ...prev, enableVocalIsolation: e.target.checked }))}
                    />
                    <span className="text-sm">🎤 Isolate Vocals</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customSettings.enableDrumSeparation}
                      onChange={(e) => setCustomSettings(prev => ({ ...prev, enableDrumSeparation: e.target.checked }))}
                    />
                    <span className="text-sm">🥁 Separate Drums</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customSettings.enableBassIsolation}
                      onChange={(e) => setCustomSettings(prev => ({ ...prev, enableBassIsolation: e.target.checked }))}
                    />
                    <span className="text-sm">🎸 Isolate Bass</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customSettings.enableInstrumentSeparation}
                      onChange={(e) => setCustomSettings(prev => ({ ...prev, enableInstrumentSeparation: e.target.checked }))}
                    />
                    <span className="text-sm">🎹 Separate Instruments</span>
                  </label>
                </div>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={customSettings.preserveOriginalQuality}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, preserveOriginalQuality: e.target.checked }))}
                  />
                  <span className="text-sm">💎 Keep Original Quality (larger files)</span>
                </label>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {progress && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  <div>
                    <div className="font-medium">{progress.userMessage}</div>
                    {progress.timeRemaining && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        About {Math.ceil(progress.timeRemaining / 60)} minute{Math.ceil(progress.timeRemaining / 60) !== 1 ? 's' : ''} remaining
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm font-mono font-medium">
                  {progress.percentage.toFixed(0)}%
                </div>
              </div>
              
              <Progress value={progress.percentage} className="h-2" />
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
                <div className="font-medium text-red-800">Something went wrong</div>
                <div className="text-sm text-red-600">{error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Separated Streams Results */}
      {separatedStreams && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              ✨ Your Audio Has Been Magically Separated!
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(separatedStreams).map(([key, stream]) => (
                <Card key={key} className="bg-white/70">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stream.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(stream.confidence * 100)}% confident
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePlayStream(key)}
                          className="w-8 h-8 p-0"
                        >
                          {playingStream === key ? 
                            <Pause className="w-4 h-4" /> : 
                            <Play className="w-4 h-4" />
                          }
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(key, stream)}
                          className="w-8 h-8 p-0"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <AudioSlider
                        value={[streamVolumes[key]]}
                        onValueChange={(value) => handleVolumeChange(key, value[0])}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        Volume: {streamVolumes[key]}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bulk Actions */}
            <div className="mt-6 pt-4 border-t flex flex-wrap gap-3">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download All Separated Files
              </Button>
              
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                Create Custom Mix
              </Button>
              
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Try Different Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Audio Loaded State */}
      {!audioBuffer && (
        <Card className="border-dashed border-gray-300">
          <CardContent className="pt-8 pb-8 text-center">
            <Headphones className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-gray-600 mb-2">
              Ready for Smart Audio Separation
            </div>
            <div className="text-sm text-gray-500">
              Upload an audio file to start separating vocals, instruments, and more
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}