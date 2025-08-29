"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AudioSlider } from '../ui/slider';
import { Progress } from '../ui/progress';
import { 
  Play, Pause, Square, RotateCcw, FastForward, Rewind, 
  Volume2, VolumeX, Headphones, Mic, MicOff, Settings,
  SkipForward, SkipBack, Maximize, Minimize, Users,
  Radio, Zap, Eye, EyeOff, MessageSquare, Search,
  Filter, Waves, BarChart3, Target, Shield, Focus
} from 'lucide-react';
import { AdvancedAudioProcessor, ANCSettings } from '@/lib/audio/advanced-audio-processor';
import { cn } from '@/lib/utils';

interface AudioFile {
  id: string;
  name: string;
  url: string;
  duration: number;
  size: number;
}

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

interface VoiceInstance {
  id: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
  transcript?: string;
}

interface ClosedCaption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  confidence: number;
}

interface ANCPlusAudioPlayerProps {
  audioFile: AudioFile;
  deviceType?: 'speakers' | 'headphones' | 'earbuds';
  enableLiveListen?: boolean;
  className?: string;
}

export function ANCPlusAudioPlayer({
  audioFile,
  deviceType = 'headphones',
  enableLiveListen = false,
  className
}: ANCPlusAudioPlayerProps) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioFile.duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Audio processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [audioProcessor, setAudioProcessor] = useState<AdvancedAudioProcessor | null>(null);
  
  // Stream control state
  const [streams, setStreams] = useState<StreamInfo[]>([
    { id: 'voice', type: 'voice', name: 'Voice', volume: 80, isMuted: false, isActive: true, color: 'text-blue-600', icon: '🎤', frequency: '85-1100 Hz' },
    { id: 'music', type: 'music', name: 'Music', volume: 70, isMuted: false, isActive: true, color: 'text-purple-600', icon: '🎵', frequency: '20-8000 Hz' },
    { id: 'ambient', type: 'ambient', name: 'Ambient', volume: 60, isMuted: false, isActive: true, color: 'text-green-600', icon: '🌊', frequency: '20-200 Hz' },
    { id: 'noise', type: 'noise', name: 'Noise', volume: 20, isMuted: true, isActive: false, color: 'text-red-600', icon: '🔇', frequency: '8000+ Hz' }
  ]);
  
  // ANC+ settings
  const [ancSettings, setAncSettings] = useState<ANCSettings>({
    enabled: true,
    intensity: 75,
    adaptiveMode: true,
    transparencyMode: false,
    transparencyLevel: 30,
    selectiveHearing: true,
    voiceFocusMode: true,
    environmentalAwareness: false
  });
  
  // Live features state
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [voiceInstances, setVoiceInstances] = useState<VoiceInstance[]>([]);
  const [closedCaptions, setClosedCaptions] = useState<ClosedCaption[]>([]);
  const [currentCaption, setCurrentCaption] = useState<ClosedCaption | null>(null);
  
  // UI state
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showFrequencyVisualizer, setShowFrequencyVisualizer] = useState(true);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(256));
  const [voiceDetectionActive, setVoiceDetectionActive] = useState(false);
  
  // Audio elements and contexts
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  
  // Initialize audio processor
  useEffect(() => {
    const processor = new AdvancedAudioProcessor({
      sampleRate: 48000,
      bufferSize: 4096,
      enableRealTimeProcessing: true,
      voiceDetectionSensitivity: 0.7,
      separationQuality: 'high',
      enableClosedCaptions: true,
      deviceType
    });
    
    setAudioProcessor(processor);
    
    // Set up event listeners
    const handleVoiceDetection = (event: CustomEvent) => {
      const detection = event.detail;
      setVoiceDetectionActive(detection.isVoicePresent);
      
      if (detection.isVoicePresent && detection.confidence > 0.8) {
        const voiceInstance: VoiceInstance = {
          id: `voice-${Date.now()}`,
          startTime: detection.voiceStartTime || Date.now(),
          endTime: 0,
          confidence: detection.confidence
        };
        
        setVoiceInstances(prev => [...prev.slice(-20), voiceInstance]);
      }
    };
    
    const handleClosedCaption = (event: CustomEvent) => {
      const caption = event.detail;
      const newCaption: ClosedCaption = {
        id: `caption-${Date.now()}`,
        text: caption.transcript,
        startTime: caption.timestamp,
        endTime: caption.timestamp + 3000, // 3 second display
        confidence: caption.confidence
      };
      
      setCurrentCaption(newCaption);
      setClosedCaptions(prev => [...prev.slice(-50), newCaption]);
      
      // Clear caption after display time
      setTimeout(() => {
        setCurrentCaption(null);
      }, 3000);
    };
    
    const handleFrequencyData = (event: CustomEvent) => {
      setFrequencyData(event.detail.data);
    };
    
    const handleStreamsUpdated = (event: CustomEvent) => {
      // Update stream data from processor
      const streamData = event.detail;
      // This would update real-time stream visualization
    };
    
    window.addEventListener('audioProcessor:voiceDetected', handleVoiceDetection as EventListener);
    window.addEventListener('audioProcessor:closedCaption', handleClosedCaption as EventListener);
    window.addEventListener('audioProcessor:frequencyData', handleFrequencyData as EventListener);
    window.addEventListener('audioProcessor:streamsUpdated', handleStreamsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('audioProcessor:voiceDetected', handleVoiceDetection as EventListener);
      window.removeEventListener('audioProcessor:closedCaption', handleClosedCaption as EventListener);
      window.removeEventListener('audioProcessor:frequencyData', handleFrequencyData as EventListener);
      window.removeEventListener('audioProcessor:streamsUpdated', handleStreamsUpdated as EventListener);
      
      processor.destroy();
    };
  }, [deviceType]);
  
  // Initialize audio element
  useEffect(() => {
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
      audioElementRef.current.crossOrigin = 'anonymous';
      audioElementRef.current.preload = 'metadata';
    }
    
    const audio = audioElementRef.current;
    audio.src = audioFile.url;
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    const handleLoadStart = () => {
      setIsLoading(true);
    };
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [audioFile.url]);
  
  // Frequency visualizer
  useEffect(() => {
    if (!showFrequencyVisualizer || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, width, height);
      
      const barWidth = width / frequencyData.length;
      
      // Draw frequency bars
      for (let i = 0; i < frequencyData.length; i++) {
        const barHeight = (frequencyData[i] / 255) * height;
        
        // Color based on frequency range
        let color = '#3b82f6'; // Default blue
        if (i < 20) color = '#10b981'; // Low freq - green (ambient)
        else if (i < 80) color = '#3b82f6'; // Mid freq - blue (voice)
        else if (i < 160) color = '#8b5cf6'; // Mid-high freq - purple (music)
        else color = '#ef4444'; // High freq - red (noise)
        
        ctx.fillStyle = color;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }
      
      // Draw voice detection indicator
      if (voiceDetectionActive) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        
        // Voice indicator text
        ctx.fillStyle = '#3b82f6';
        ctx.font = '12px monospace';
        ctx.fillText('VOICE DETECTED', 10, 20);
      }
      
      requestAnimationFrame(draw);
    };
    
    draw();
  }, [frequencyData, voiceDetectionActive, showFrequencyVisualizer]);
  
  // Playback controls
  const handlePlay = useCallback(async () => {
    if (!audioElementRef.current || !audioProcessor) return;
    
    try {
      setIsLoading(true);
      
      // Start audio processing
      if (!isProcessing) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audioElementRef.current);
        await audioProcessor.startProcessing(source);
        setIsProcessing(true);
      }
      
      await audioElementRef.current.play();
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Playback failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [audioProcessor, isProcessing]);
  
  const handlePause = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
  }, []);
  
  const handleStop = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);
  
  const handleSeek = useCallback((time: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);
  
  const handleSpeedChange = useCallback((speed: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = speed;
      setPlaybackRate(speed);
    }
  }, []);
  
  // Stream controls
  const updateStreamVolume = useCallback((streamId: string, volume: number) => {
    setStreams(prev => prev.map(stream => 
      stream.id === streamId ? { ...stream, volume } : stream
    ));
    
    if (audioProcessor) {
      audioProcessor.setStreamVolume(streamId, volume / 100);
    }
  }, [audioProcessor]);
  
  const toggleStreamMute = useCallback((streamId: string) => {
    setStreams(prev => prev.map(stream => 
      stream.id === streamId ? { ...stream, isMuted: !stream.isMuted } : stream
    ));
  }, []);
  
  const toggleStreamActive = useCallback((streamId: string) => {
    setStreams(prev => prev.map(stream => 
      stream.id === streamId ? { ...stream, isActive: !stream.isActive } : stream
    ));
  }, []);
  
  // ANC+ controls
  const updateANCSettings = useCallback((updates: Partial<ANCSettings>) => {
    const newSettings = { ...ancSettings, ...updates };
    setAncSettings(newSettings);
    
    if (audioProcessor) {
      audioProcessor.updateANCSettings(newSettings);
    }
  }, [ancSettings, audioProcessor]);
  
  // Live listening controls
  const startLiveListening = useCallback(async () => {
    if (!enableLiveListen) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // We handle this with ANC
          sampleRate: 48000,
          channelCount: 2
        }
      });
      
      liveStreamRef.current = stream;
      
      if (audioProcessor) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        await audioProcessor.startProcessing(source);
      }
      
      setIsLiveListening(true);
      setMicrophoneEnabled(true);
      
    } catch (error) {
      console.error('Failed to start live listening:', error);
      alert('Microphone access denied or unavailable');
    }
  }, [enableLiveListen, audioProcessor]);
  
  const stopLiveListening = useCallback(() => {
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(track => track.stop());
      liveStreamRef.current = null;
    }
    
    if (audioProcessor) {
      audioProcessor.stopProcessing();
    }
    
    setIsLiveListening(false);
    setMicrophoneEnabled(false);
  }, [audioProcessor]);
  
  // Voice navigation
  const findNextVoiceInstance = useCallback(() => {
    if (audioProcessor) {
      const nextVoice = audioProcessor.findNextVoiceInstance();
      if (nextVoice && nextVoice.voiceStartTime) {
        const seekTime = (nextVoice.voiceStartTime - Date.now()) / 1000 + currentTime;
        handleSeek(Math.max(0, Math.min(duration, seekTime)));
      }
    }
  }, [audioProcessor, currentTime, duration, handleSeek]);
  
  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Player Card */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {deviceType === 'headphones' && <Headphones className="w-6 h-6 text-blue-400" />}
                {deviceType === 'earbuds' && <Headphones className="w-6 h-6 text-green-400" />}
                {deviceType === 'speakers' && <Volume2 className="w-6 h-6 text-purple-400" />}
                <span className="text-xl">🎧 {audioFile.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {ancSettings.enabled && <Shield className="w-4 h-4 text-green-400" />}
                {ancSettings.voiceFocusMode && <Focus className="w-4 h-4 text-blue-400" />}
                {isLiveListening && <Radio className="w-4 h-4 text-red-400 animate-pulse" />}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowFrequencyVisualizer(!showFrequencyVisualizer)}
                size="sm"
                variant="ghost"
                className="text-slate-300 hover:text-white"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                size="sm"
                variant="ghost"
                className="text-slate-300 hover:text-white"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={() => handleSeek(Math.max(0, currentTime - 30))}
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => handleSeek(Math.max(0, currentTime - 10))}
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white"
            >
              <Rewind className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={isPlaying ? handlePause : handlePlay}
              size="lg"
              disabled={isLoading}
              className="w-16 h-16 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              ) : isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
            
            <Button
              onClick={handleStop}
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white"
            >
              <Square className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white"
            >
              <FastForward className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => handleSeek(Math.min(duration, currentTime + 30))}
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={findNextVoiceInstance}
              size="sm"
              variant="outline"
              className="border-blue-600 text-blue-400 hover:text-blue-300 ml-4"
              title="Find next voice"
            >
              <Search className="w-4 h-4" />
              <span className="ml-1 text-xs">Voice</span>
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              
              {/* Voice instance markers */}
              {voiceInstances.map((voice, index) => {
                const position = ((voice.startTime - Date.now() + currentTime * 1000) / 1000 / duration) * 100;
                if (position >= 0 && position <= 100) {
                  return (
                    <div
                      key={voice.id}
                      className="absolute top-0 w-1 h-2 bg-blue-400 pointer-events-none"
                      style={{ left: `${position}%` }}
                      title={`Voice detected (${(voice.confidence * 100).toFixed(0)}% confidence)`}
                    />
                  );
                }
                return null;
              })}
            </div>
            
            <div className="flex justify-between text-sm text-slate-400">
              <span className="font-mono">{formatTime(currentTime)}</span>
              <div className="flex items-center gap-4">
                <select
                  value={playbackRate}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2.0}>2.0x</option>
                </select>
                <span>Speed</span>
              </div>
              <span className="font-mono">{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Frequency Visualizer */}
          {showFrequencyVisualizer && (
            <div className="bg-slate-800 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                width={800}
                height={120}
                className="w-full h-24 rounded"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>🌊 Ambient</span>
                <span>🎤 Voice</span>
                <span>🎵 Music</span>
                <span>🔇 Noise</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Live Listening Controls */}
      {enableLiveListen && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-6 h-6" />
              🔴 Live ANC+ Listening
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={isLiveListening ? stopLiveListening : startLiveListening}
                  variant={isLiveListening ? "destructive" : "default"}
                  className="flex items-center gap-2"
                >
                  {isLiveListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      Stop Live Listen
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Start Live Listen
                    </>
                  )}
                </Button>
                
                {isLiveListening && (
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">LIVE</span>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600">
                Real-time noise cancellation and voice enhancement
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Closed Captions */}
      {currentCaption && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <p className="text-lg font-medium text-green-800">
                  {currentCaption.text}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-green-600">
                    Confidence: {(currentCaption.confidence * 100).toFixed(0)}%
                  </span>
                  {currentCaption.speaker && (
                    <span className="text-sm text-green-600">
                      Speaker: {currentCaption.speaker}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* ANC+ Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            🛡️ ANC+ Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main ANC Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Active Noise Cancellation</h3>
              <p className="text-sm text-gray-600">
                AI-powered noise reduction with {deviceType} optimization
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => updateANCSettings({ enabled: !ancSettings.enabled })}
                variant={ancSettings.enabled ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                {ancSettings.enabled ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
          
          {ancSettings.enabled && (
            <div className="space-y-4">
              {/* ANC Intensity */}
              <div>
                <label className="text-sm font-medium">
                  ANC Intensity: {ancSettings.intensity}%
                </label>
                <AudioSlider
                  value={[ancSettings.intensity]}
                  onValueChange={(value) => updateANCSettings({ intensity: value[0] })}
                  max={100}
                  step={1}
                  className="w-full mt-2"
                />
              </div>
              
              {/* Advanced ANC Features */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Adaptive Mode</label>
                    <input
                      type="checkbox"
                      checked={ancSettings.adaptiveMode}
                      onChange={(e) => updateANCSettings({ adaptiveMode: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Voice Focus</label>
                    <input
                      type="checkbox"
                      checked={ancSettings.voiceFocusMode}
                      onChange={(e) => updateANCSettings({ voiceFocusMode: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Selective Hearing</label>
                    <input
                      type="checkbox"
                      checked={ancSettings.selectiveHearing}
                      onChange={(e) => updateANCSettings({ selectiveHearing: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Transparency Mode</label>
                    <input
                      type="checkbox"
                      checked={ancSettings.transparencyMode}
                      onChange={(e) => updateANCSettings({ transparencyMode: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                  
                  {ancSettings.transparencyMode && (
                    <div>
                      <label className="text-sm">
                        Transparency: {ancSettings.transparencyLevel}%
                      </label>
                      <AudioSlider
                        value={[ancSettings.transparencyLevel]}
                        onValueChange={(value) => updateANCSettings({ transparencyLevel: value[0] })}
                        max={100}
                        step={1}
                        className="w-full mt-1"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Environmental Awareness</label>
                    <input
                      type="checkbox"
                      checked={ancSettings.environmentalAwareness}
                      onChange={(e) => updateANCSettings({ environmentalAwareness: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Stream Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {streams.map((stream) => (
          <Card key={stream.id} className={cn(
            "transition-all hover:shadow-md",
            stream.isActive ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
          )}>
            <CardHeader className="pb-3">
              <CardTitle className={cn(
                "text-sm flex items-center justify-between",
                stream.color
              )}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{stream.icon}</span>
                  <div>
                    <div>{stream.name}</div>
                    <div className="text-xs font-normal text-gray-500">
                      {stream.frequency}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => toggleStreamActive(stream.id)}
                    size="sm"
                    variant="ghost"
                    className="w-8 h-8 p-0"
                  >
                    {stream.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                  <Button
                    onClick={() => toggleStreamMute(stream.id)}
                    size="sm"
                    variant="ghost"
                    className="w-8 h-8 p-0"
                  >
                    {stream.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <AudioSlider
                    value={[stream.volume]}
                    onValueChange={(value) => updateStreamVolume(stream.id, value[0])}
                    max={100}
                    step={1}
                    className="w-full"
                    disabled={!stream.isActive || stream.isMuted}
                  />
                </div>
                <span className="text-xs font-mono w-10 text-right">
                  {stream.isMuted || !stream.isActive ? 'OFF' : `${stream.volume}%`}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Processing Status */}
      {isProcessing && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-600 animate-pulse" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800">
                  AI Processing Active
                </p>
                <p className="text-sm text-yellow-600">
                  Real-time stream separation and enhancement
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span>Live Processing</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}