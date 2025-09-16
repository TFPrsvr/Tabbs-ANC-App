"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Play, Pause, Square, SkipBack, SkipForward,
  Volume2, VolumeX, Settings, Download, Upload,
  Scissors, Copy, Trash2, Undo, Redo,
  Layers, BarChart3, Sliders,
  MousePointer, Hand, Move, ZoomIn, ZoomOut,
  Save, FileUp, FileDown, Share2, Headphones,
  Mic, MicOff, Split, Merge, RotateCcw
} from 'lucide-react';
import { ProfessionalWaveform } from './professional-waveform';
import { ComprehensiveMediaProcessor } from '@/lib/media/comprehensive-processor';

interface MediaTrack {
  id: string;
  name: string;
  type: 'audio' | 'video';
  buffer: AudioBuffer | null;
  volume: number;
  muted: boolean;
  solo: boolean;
  effects: AudioEffect[];
  regions: TrackRegion[];
}

interface TrackRegion {
  id: string;
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
  gain: number;
}

interface AudioEffect {
  id: string;
  type: string;
  enabled: boolean;
  parameters: Record<string, number>;
}

interface EditingSession {
  tracks: MediaTrack[];
  tempo: number;
  timeSignature: [number, number];
  sampleRate: number;
  masterVolume: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isRecording: boolean;
  loop: { enabled: boolean; start: number; end: number };
  metronome: { enabled: boolean; volume: number };
}

interface MediaEditingInterfaceProps {
  className?: string;
  onSave?: (session: EditingSession) => void;
  onExport?: (format: string) => void;
  onShare?: (shareData: any) => void;
  multiUser?: boolean;
  userId?: string;
}

export function MediaEditingInterface({
  className = "",
  onSave,
  onExport,
  onShare,
  multiUser = false,
  userId
}: MediaEditingInterfaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaProcessor = useRef<ComprehensiveMediaProcessor>(new ComprehensiveMediaProcessor());

  // Core editing state
  const [session, setSession] = useState<EditingSession>({
    tracks: [],
    tempo: 120,
    timeSignature: [4, 4],
    sampleRate: 44100,
    masterVolume: 100,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    isRecording: false,
    loop: { enabled: false, start: 0, end: 0 },
    metronome: { enabled: false, volume: 50 }
  });

  // UI state
  const [selectedTool, setSelectedTool] = useState<'pointer' | 'hand' | 'scissors' | 'zoom'>('pointer');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<TrackRegion[]>([]);
  const [undoStack, setUndoStack] = useState<EditingSession[]>([]);
  const [redoStack, setRedoStack] = useState<EditingSession[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTrack, setRecordingTrack] = useState<string | null>(null);
  const [showMixer, setShowMixer] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  // Touch/stylus support
  const [touchSupport, setTouchSupport] = useState({
    multiTouch: false,
    pressure: false,
    tilt: false,
    stylus: false
  });

  // Keyboard shortcuts
  const keyboardShortcuts = {
    'Space': () => togglePlayback(),
    'Escape': () => stop(),
    'Ctrl+Z': () => undo(),
    'Ctrl+Y': () => redo(),
    'Ctrl+S': () => saveSession(),
    'Ctrl+C': () => copySelection(),
    'Ctrl+V': () => pasteSelection(),
    'Ctrl+X': () => cutSelection(),
    'Delete': () => deleteSelection(),
    '1': () => setSelectedTool('pointer'),
    '2': () => setSelectedTool('hand'),
    '3': () => setSelectedTool('scissors'),
    '4': () => setSelectedTool('zoom'),
    'R': () => startRecording(),
    'M': () => toggleMute(),
    'S': () => toggleSolo(),
    'L': () => toggleLoop(),
  };

  // Initialize touch support detection
  useEffect(() => {
    const detectTouchSupport = () => {
      setTouchSupport({
        multiTouch: 'ontouchstart' in window && navigator.maxTouchPoints > 1,
        pressure: 'ontouchstart' in window && 'force' in TouchEvent.prototype,
        tilt: 'ontouchstart' in window && 'altitudeAngle' in TouchEvent.prototype,
        stylus: 'ontouchstart' in window && navigator.maxTouchPoints > 1
      });
    };

    detectTouchSupport();
  }, []);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.ctrlKey ? `Ctrl+${event.key}` : event.key;
      const shortcut = keyboardShortcuts[key as keyof typeof keyboardShortcuts];

      if (shortcut && !event.target || (event.target as HTMLElement).tagName !== 'INPUT') {
        event.preventDefault();
        shortcut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Media processing functions
  const loadAudioFile = useCallback(async (file: File) => {
    try {
      const audioBuffer = await mediaProcessor.current.loadAudioFile(file);

      const newTrack: MediaTrack = {
        id: `track_${Date.now()}`,
        name: file.name,
        type: 'audio',
        buffer: audioBuffer,
        volume: 100,
        muted: false,
        solo: false,
        effects: [],
        regions: [{
          id: `region_${Date.now()}`,
          start: 0,
          end: audioBuffer.duration,
          fadeIn: 0,
          fadeOut: 0,
          gain: 1
        }]
      };

      setSession(prev => ({
        ...prev,
        tracks: [...prev.tracks, newTrack],
        duration: Math.max(prev.duration, audioBuffer.duration)
      }));

      // Save state for undo
      saveUndoState();
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  }, []);

  // Playback controls
  const togglePlayback = useCallback(() => {
    setSession(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const stop = useCallback(() => {
    setSession(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  const seek = useCallback((time: number) => {
    setSession(prev => ({ ...prev, currentTime: time }));
  }, []);

  // Recording functions
  const startRecording = useCallback(async () => {
    if (!recordingTrack) return;

    try {
      setIsRecording(true);
      setSession(prev => ({ ...prev, isRecording: true }));

      // Start recording logic here
      // This would integrate with Web Audio API MediaRecorder
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  }, [recordingTrack]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setSession(prev => ({ ...prev, isRecording: false }));
  }, []);

  // Edit operations
  const saveUndoState = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), { ...session }]); // Keep last 20 states
    setRedoStack([]);
  }, [session]);

  const undo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [session, ...prev]);
      setSession(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  }, [undoStack, session]);

  const redo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setUndoStack(prev => [...prev, session]);
      setSession(nextState);
      setRedoStack(prev => prev.slice(1));
    }
  }, [redoStack, session]);

  const copySelection = useCallback(() => {
    const selectedRegions = session.tracks
      .filter(track => selectedTracks.includes(track.id))
      .flatMap(track => track.regions);

    setClipboard(selectedRegions);
  }, [session.tracks, selectedTracks]);

  const pasteSelection = useCallback(() => {
    if (clipboard.length > 0) {
      // Paste logic here
      saveUndoState();
    }
  }, [clipboard]);

  const cutSelection = useCallback(() => {
    copySelection();
    deleteSelection();
  }, [copySelection]);

  const deleteSelection = useCallback(() => {
    setSession(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        selectedTracks.includes(track.id)
          ? { ...track, regions: [] }
          : track
      )
    }));
    saveUndoState();
  }, [selectedTracks]);

  // Track controls
  const toggleMute = useCallback(() => {
    setSession(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        selectedTracks.includes(track.id)
          ? { ...track, muted: !track.muted }
          : track
      )
    }));
  }, [selectedTracks]);

  const toggleSolo = useCallback(() => {
    setSession(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        selectedTracks.includes(track.id)
          ? { ...track, solo: !track.solo }
          : track
      )
    }));
  }, [selectedTracks]);

  const toggleLoop = useCallback(() => {
    setSession(prev => ({
      ...prev,
      loop: { ...prev.loop, enabled: !prev.loop.enabled }
    }));
  }, []);

  // File operations
  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        await loadAudioFile(file);
      }
    }

    // Reset input
    event.target.value = '';
  }, [loadAudioFile]);

  const saveSession = useCallback(() => {
    onSave?.(session);
  }, [session, onSave]);

  const exportProject = useCallback((format: string) => {
    onExport?.(format);
  }, [onExport]);

  const shareProject = useCallback(() => {
    const shareData = {
      session,
      userId,
      timestamp: Date.now()
    };
    onShare?.(shareData);
  }, [session, userId, onShare]);

  // Touch event handlers for cross-platform support
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (touchSupport.multiTouch && event.touches.length > 1) {
      // Multi-touch gestures (zoom, pan)
      event.preventDefault();
    }
  }, [touchSupport]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (selectedTool === 'hand' || event.touches.length > 1) {
      event.preventDefault();
    }
  }, [selectedTool]);

  // Stylus support
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === 'pen') {
      setTouchSupport(prev => ({ ...prev, stylus: true }));

      // Use pressure and tilt data for precise editing
      const pressure = event.pressure || 0.5;
      const tiltX = (event as any).tiltX || 0;
      const tiltY = (event as any).tiltY || 0;

      // Implement pressure-sensitive drawing/editing here
    }
  }, []);

  return (
    <div className={`flex flex-col h-screen bg-gray-50 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2">
          {/* Transport Controls */}
          <div className="flex items-center gap-1 mr-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => seek(Math.max(0, session.currentTime - 10))}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant={session.isPlaying ? "secondary" : "default"}
              size="sm"
              onClick={togglePlayback}
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              {session.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="sm" onClick={stop}>
              <Square className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => seek(Math.min(session.duration, session.currentTime + 10))}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!recordingTrack}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>

          {/* Tools */}
          <div className="flex items-center gap-1">
            {(['pointer', 'hand', 'scissors', 'zoom'] as const).map((tool) => {
              const icons = {
                pointer: MousePointer,
                hand: Hand,
                scissors: Scissors,
                zoom: ZoomIn
              };
              const Icon = icons[tool];

              return (
                <Button
                  key={tool}
                  variant={selectedTool === tool ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedTool(tool)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={undoStack.length === 0}
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={redoStack.length === 0}
          >
            <Redo className="h-4 w-4" />
          </Button>

          {/* File Controls */}
          <Button variant="ghost" size="sm" onClick={handleFileUpload}>
            <Upload className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={saveSession}>
            <Save className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={() => exportProject('wav')}>
            <Download className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={shareProject}>
            <Share2 className="h-4 w-4" />
          </Button>

          {/* View Controls */}
          <Button
            variant={showMixer ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowMixer(!showMixer)}
          >
            <Sliders className="h-4 w-4" />
          </Button>

          <Button
            variant={showEffects ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowEffects(!showEffects)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b text-sm">
        <div className="flex items-center gap-4">
          <span>Time: {Math.floor(session.currentTime / 60)}:{(session.currentTime % 60).toFixed(2).padStart(5, '0')}</span>
          <span>Tempo: {session.tempo} BPM</span>
          <span>Sample Rate: {session.sampleRate.toLocaleString()} Hz</span>
          {touchSupport.stylus && <Badge variant="secondary">Stylus Ready</Badge>}
          {touchSupport.multiTouch && <Badge variant="secondary">Multi-Touch</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={session.loop.enabled ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleLoop}
          >
            Loop
          </Button>

          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <Slider
              value={[session.masterVolume]}
              onValueChange={([value]) => setSession(prev => ({ ...prev, masterVolume: value }))}
              max={200}
              min={0}
              className="w-20"
            />
            <span>{session.masterVolume}%</span>
          </div>
        </div>
      </div>

      {/* Main Editing Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track List */}
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium mb-2">Tracks ({session.tracks.length})</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFileUpload}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Track
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {session.tracks.map((track, index) => (
              <div
                key={track.id}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedTracks.includes(track.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setSelectedTracks(prev =>
                    prev.includes(track.id)
                      ? prev.filter(id => id !== track.id)
                      : [...prev, track.id]
                  );
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm truncate">{track.name}</span>
                  <Badge variant={track.type === 'audio' ? 'default' : 'secondary'}>
                    {track.type}
                  </Badge>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant={track.muted ? "destructive" : "ghost"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSession(prev => ({
                        ...prev,
                        tracks: prev.tracks.map(t =>
                          t.id === track.id ? { ...t, muted: !t.muted } : t
                        )
                      }));
                    }}
                  >
                    {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </Button>

                  <Button
                    variant={track.solo ? "secondary" : "ghost"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSession(prev => ({
                        ...prev,
                        tracks: prev.tracks.map(t =>
                          t.id === track.id ? { ...t, solo: !t.solo } : t
                        )
                      }));
                    }}
                  >
                    <Headphones className="h-3 w-3" />
                  </Button>

                  <Button
                    variant={recordingTrack === track.id ? "destructive" : "ghost"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecordingTrack(recordingTrack === track.id ? null : track.id);
                    }}
                  >
                    <Mic className="h-3 w-3" />
                  </Button>
                </div>

                <Slider
                  value={[track.volume]}
                  onValueChange={([value]) => {
                    setSession(prev => ({
                      ...prev,
                      tracks: prev.tracks.map(t =>
                        t.id === track.id ? { ...t, volume: value } : t
                      )
                    }));
                  }}
                  max={200}
                  min={0}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Area */}
        <div className="flex-1 flex flex-col">
          {/* Timeline Header */}
          <div className="h-12 bg-white border-b flex items-center px-4">
            <div className="text-sm text-muted-foreground">Timeline</div>
          </div>

          {/* Waveform Display */}
          <div
            className="flex-1 overflow-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onPointerDown={handlePointerDown}
          >
            {session.tracks.length > 0 ? (
              <div className="p-4 space-y-4">
                {session.tracks.map((track) => (
                  <Card key={track.id} className="p-2">
                    <div className="text-sm font-medium mb-2">{track.name}</div>
                    <ProfessionalWaveform
                      audioBuffer={track.buffer}
                      isPlaying={session.isPlaying}
                      currentTime={session.currentTime}
                      onPlay={() => setSession(prev => ({ ...prev, isPlaying: true }))}
                      onPause={() => setSession(prev => ({ ...prev, isPlaying: false }))}
                      onStop={stop}
                      onSeek={seek}
                      className="min-h-[150px]"
                    />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tracks loaded</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload audio or video files to start editing
                  </p>
                  <Button onClick={handleFileUpload}>
                    <Upload className="h-4 w-4 mr-2" />
                    Load Media Files
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Panels */}
        {(showMixer || showEffects) && (
          <div className="w-80 bg-white border-l">
            <Tabs defaultValue={showMixer ? "mixer" : "effects"}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mixer">Mixer</TabsTrigger>
                <TabsTrigger value="effects">Effects</TabsTrigger>
              </TabsList>

              <TabsContent value="mixer" className="p-4 space-y-4">
                <h3 className="font-medium">Master Mix</h3>
                {/* Mixer controls would go here */}
              </TabsContent>

              <TabsContent value="effects" className="p-4 space-y-4">
                <h3 className="font-medium">Audio Effects</h3>
                {/* Effects controls would go here */}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="px-4 py-2 bg-gray-100 border-t text-xs text-muted-foreground">
        <span className="mr-4">Space: Play/Pause</span>
        <span className="mr-4">Ctrl+Z: Undo</span>
        <span className="mr-4">Ctrl+S: Save</span>
        <span className="mr-4">1-4: Tools</span>
        <span className="mr-4">R: Record</span>
        <span>L: Loop</span>
      </div>
    </div>
  );
}