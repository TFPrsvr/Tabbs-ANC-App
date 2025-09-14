"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import {
  Play,
  Pause,
  Square,
  Volume2,
  ZoomIn,
  ZoomOut,
  Scissors,
  Download,
  Upload,
  RotateCcw,
  Settings,
  Layers
} from 'lucide-react';

interface TimelineMarker {
  id: string;
  time: number;
  type: 'cut' | 'bookmark' | 'selection';
  label?: string;
  color?: string;
}

interface WaveformRegion {
  id: string;
  start: number;
  end: number;
  color: string;
  label: string;
}

interface AudioAnalysis {
  peaks: Float32Array;
  duration: number;
  sampleRate: number;
  channels: number;
  rms: number[];
  spectralCentroid: number[];
  zeroCrossingRate: number[];
}

interface ProfessionalWaveformProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onRegionSelect?: (start: number, end: number) => void;
  onMarkerAdd?: (marker: TimelineMarker) => void;
  className?: string;
  showSpectogram?: boolean;
  multiTrack?: boolean;
}

export function ProfessionalWaveform({
  audioBuffer,
  isPlaying,
  currentTime,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onRegionSelect,
  onMarkerAdd,
  className = "",
  showSpectogram = false,
  multiTrack = false
}: ProfessionalWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spectrogramRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [zoom, setZoom] = useState(1);
  const [volume, setVolume] = useState([100]);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [regions, setRegions] = useState<WaveformRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<WaveformRegion | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [viewportStart, setViewportStart] = useState(0);
  const [showTimecodes, setShowTimecodes] = useState(true);
  const [waveformHeight, setWaveformHeight] = useState(200);

  // Analyze audio buffer and generate waveform data
  const analyzeAudio = useCallback(async (buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const duration = buffer.duration;

    // Generate peaks for waveform visualization
    const samplesPerPixel = Math.floor(channelData.length / 2000);
    const peaks = new Float32Array(2000);

    for (let i = 0; i < 2000; i++) {
      const start = i * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channelData.length);
      let max = 0;

      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channelData[j]));
      }
      peaks[i] = max;
    }

    // Calculate RMS (energy) for each segment
    const rmsSegments = 100;
    const rms: number[] = [];
    const samplesPerRMS = Math.floor(channelData.length / rmsSegments);

    for (let i = 0; i < rmsSegments; i++) {
      const start = i * samplesPerRMS;
      const end = Math.min(start + samplesPerRMS, channelData.length);
      let sum = 0;

      for (let j = start; j < end; j++) {
        sum += channelData[j] * channelData[j];
      }
      rms.push(Math.sqrt(sum / (end - start)));
    }

    // Calculate spectral centroid (brightness indicator)
    const spectralCentroid: number[] = [];
    const fftSize = 2048;

    for (let i = 0; i < channelData.length - fftSize; i += fftSize) {
      const segment = channelData.slice(i, i + fftSize);
      const centroid = calculateSpectralCentroid(segment, sampleRate);
      spectralCentroid.push(centroid);
    }

    // Calculate zero-crossing rate (indicates voice vs music)
    const zeroCrossingRate: number[] = [];
    const windowSize = sampleRate * 0.025; // 25ms windows

    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      let crossings = 0;
      for (let j = i; j < i + windowSize - 1; j++) {
        if ((channelData[j] >= 0) !== (channelData[j + 1] >= 0)) {
          crossings++;
        }
      }
      zeroCrossingRate.push(crossings / windowSize);
    }

    setAnalysis({
      peaks,
      duration,
      sampleRate,
      channels: buffer.numberOfChannels,
      rms,
      spectralCentroid,
      zeroCrossingRate
    });
  }, []);

  // Calculate spectral centroid for a segment
  const calculateSpectralCentroid = (segment: Float32Array, sampleRate: number): number => {
    // Simple FFT approximation for spectral centroid
    const bins = segment.length / 2;
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < bins; i++) {
      const frequency = (i * sampleRate) / (2 * bins);
      const magnitude = Math.abs(segment[i]);
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  };

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analysis) return;

    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;

    // Time grid lines (every second)
    const pixelsPerSecond = width / (analysis.duration / zoom);
    for (let i = 0; i <= analysis.duration; i++) {
      const x = (i * pixelsPerSecond) - (viewportStart * pixelsPerSecond);
      if (x >= 0 && x <= width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Amplitude grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw regions first (background)
    regions.forEach(region => {
      const startX = ((region.start - viewportStart) / (analysis.duration / zoom)) * width;
      const endX = ((region.end - viewportStart) / (analysis.duration / zoom)) * width;

      if (endX >= 0 && startX <= width) {
        ctx.fillStyle = region.color + '30';
        ctx.fillRect(Math.max(0, startX), 0, Math.min(width, endX - startX), height);

        // Region border
        ctx.strokeStyle = region.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, height);
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, height);
        ctx.stroke();
      }
    });

    // Draw waveform
    const samplesPerPixel = analysis.peaks.length / width * zoom;
    const centerY = height / 2;

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const sampleIndex = Math.floor((x + viewportStart) * samplesPerPixel);
      if (sampleIndex < analysis.peaks.length) {
        const peak = analysis.peaks[sampleIndex];
        const y = centerY - (peak * centerY * 0.9);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Draw negative waveform
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const sampleIndex = Math.floor((x + viewportStart) * samplesPerPixel);
      if (sampleIndex < analysis.peaks.length) {
        const peak = analysis.peaks[sampleIndex];
        const y = centerY + (peak * centerY * 0.9);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Draw RMS envelope for loudness visualization
    if (analysis.rms.length > 0) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();

      const rmsPixelsPerSample = width / analysis.rms.length * zoom;
      for (let i = 0; i < analysis.rms.length; i++) {
        const x = (i * rmsPixelsPerSample) - viewportStart;
        if (x >= 0 && x <= width) {
          const rmsValue = analysis.rms[i];
          const y = centerY - (rmsValue * centerY * 0.5);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw markers
    markers.forEach(marker => {
      const x = ((marker.time - viewportStart) / (analysis.duration / zoom)) * width;

      if (x >= 0 && x <= width) {
        ctx.strokeStyle = marker.color || '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Marker label
        if (marker.label) {
          ctx.fillStyle = marker.color || '#f59e0b';
          ctx.font = '12px Inter, sans-serif';
          ctx.fillText(marker.label, x + 5, 20);
        }
      }
    });

    // Draw playhead
    const playheadX = ((currentTime - viewportStart) / (analysis.duration / zoom)) * width;
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }

    // Draw selection
    if (isSelecting && Math.abs(selectionEnd - selectionStart) > 0) {
      const startX = Math.min(selectionStart, selectionEnd);
      const endX = Math.max(selectionStart, selectionEnd);

      ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
      ctx.fillRect(startX, 0, endX - startX, height);

      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
      ctx.stroke();
    }
  }, [analysis, currentTime, zoom, viewportStart, markers, regions, isSelecting, selectionStart, selectionEnd]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Handle canvas interactions
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !analysis) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const timeAtClick = (x / canvas.width) * (analysis.duration / zoom) + viewportStart;

    onSeek(Math.max(0, Math.min(analysis.duration, timeAtClick)));
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.shiftKey) {
      setIsSelecting(true);
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      setSelectionStart(x);
      setSelectionEnd(x);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelecting) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      setSelectionEnd(x);
    }
  };

  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelecting) {
      const canvas = canvasRef.current!;
      const startTime = (Math.min(selectionStart, selectionEnd) / canvas.width) * (analysis!.duration / zoom) + viewportStart;
      const endTime = (Math.max(selectionStart, selectionEnd) / canvas.width) * (analysis!.duration / zoom) + viewportStart;

      if (Math.abs(endTime - startTime) > 0.1) { // Minimum 0.1 second selection
        onRegionSelect?.(startTime, endTime);

        // Add selection as region
        const newRegion: WaveformRegion = {
          id: `region_${Date.now()}`,
          start: startTime,
          end: endTime,
          color: '#2563eb',
          label: `Selection ${regions.length + 1}`
        };
        setRegions(prev => [...prev, newRegion]);
      }

      setIsSelecting(false);
      setSelectionStart(0);
      setSelectionEnd(0);
    }
  };

  // Add marker at current position
  const addMarker = () => {
    const newMarker: TimelineMarker = {
      id: `marker_${Date.now()}`,
      time: currentTime,
      type: 'bookmark',
      label: `Marker ${markers.length + 1}`,
      color: '#f59e0b'
    };

    setMarkers(prev => [...prev, newMarker]);
    onMarkerAdd?.(newMarker);
  };

  // Effects
  useEffect(() => {
    if (audioBuffer) {
      analyzeAudio(audioBuffer);
    }
  }, [audioBuffer, analyzeAudio]);

  useEffect(() => {
    if (canvasRef.current && analysis) {
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = waveformHeight;
      }

      drawWaveform();
    }
  }, [analysis, drawWaveform, waveformHeight]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        drawWaveform();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  if (!audioBuffer || !analysis) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Load an audio file to see the professional waveform</p>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={isPlaying ? "secondary" : "default"}
            size="sm"
            onClick={isPlaying ? onPause : onPlay}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button variant="outline" size="sm" onClick={onStop}>
            <Square className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={addMarker}>
            <Scissors className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={200}
              min={0}
              step={5}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">{volume[0]}%</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.1, zoom * 0.5))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {zoom.toFixed(1)}x
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(10, zoom * 2))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Time Display */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
        <span>Current: {formatTime(currentTime)}</span>
        <span>Duration: {formatTime(analysis.duration)}</span>
        <span>Sample Rate: {analysis.sampleRate.toLocaleString()} Hz</span>
        <span>Channels: {analysis.channels}</span>
      </div>

      {/* Waveform Canvas */}
      <div ref={containerRef} className="relative bg-white rounded-lg border">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="w-full cursor-crosshair"
          style={{ height: waveformHeight }}
        />

        {/* Time ruler */}
        {showTimecodes && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gray-50 border-t">
            {/* Time markers will be drawn here */}
          </div>
        )}
      </div>

      {/* Regions and Markers */}
      {(regions.length > 0 || markers.length > 0) && (
        <div className="mt-4 space-y-2">
          {regions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Regions</h4>
              <div className="flex flex-wrap gap-2">
                {regions.map(region => (
                  <div
                    key={region.id}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: region.color }}
                    />
                    <span>{region.label}</span>
                    <span className="text-muted-foreground">
                      {formatTime(region.start)} - {formatTime(region.end)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {markers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Markers</h4>
              <div className="flex flex-wrap gap-2">
                {markers.map(marker => (
                  <div
                    key={marker.id}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm cursor-pointer hover:bg-gray-200"
                    onClick={() => onSeek(marker.time)}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: marker.color }}
                    />
                    <span>{marker.label}</span>
                    <span className="text-muted-foreground">{formatTime(marker.time)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p>• Click to seek • Shift+drag to select region • Scroll to zoom • Double-click markers to edit</p>
      </div>
    </Card>
  );
}