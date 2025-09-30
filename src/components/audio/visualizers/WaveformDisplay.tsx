'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface WaveformDisplayProps {
  audioData?: Float32Array[];
  width?: number;
  height?: number;
  className?: string;
  variant?: 'standard' | 'stereo' | 'minimal' | 'professional';
  color?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showCursor?: boolean;
  showPlayhead?: boolean;
  playheadPosition?: number;
  zoomLevel?: number;
  scrollPosition?: number;
  interactive?: boolean;
  onTimeClick?: (timePosition: number) => void;
  onRegionSelect?: (startTime: number, endTime: number) => void;
  markers?: WaveformMarker[];
  regions?: WaveformRegion[];
  amplitude?: number;
  smoothing?: boolean;
  realTime?: boolean;
  channelHeight?: number;
  showChannelLabels?: boolean;
}

export interface WaveformMarker {
  time: number;
  label?: string;
  color?: string;
}

export interface WaveformRegion {
  startTime: number;
  endTime: number;
  label?: string;
  color?: string;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  audioData,
  width = 800,
  height = 200,
  className,
  variant = 'standard',
  color = '#3b82f6',
  backgroundColor = 'transparent',
  showGrid = true,
  showCursor = true,
  showPlayhead = true,
  playheadPosition = 0,
  zoomLevel = 1,
  scrollPosition = 0,
  interactive = true,
  onTimeClick,
  onRegionSelect,
  markers = [],
  regions = [],
  amplitude = 1,
  smoothing = true,
  realTime = false,
  channelHeight = 80,
  showChannelLabels = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const channels = audioData?.length || 1;
  const effectiveHeight = variant === 'stereo' && channels > 1
    ? channelHeight * channels + (channels - 1) * 10
    : height;

  // Convert pixel position to time
  const pixelToTime = useCallback((pixel: number): number => {
    if (!audioData?.[0]) return 0;
    const samplesPerPixel = (audioData[0].length / zoomLevel) / width;
    const samplePosition = (pixel + scrollPosition) * samplesPerPixel;
    return samplePosition / 44100; // Assuming 44.1kHz sample rate
  }, [audioData, zoomLevel, width, scrollPosition]);

  // Convert time to pixel position
  const timeToPixel = useCallback((time: number): number => {
    if (!audioData?.[0]) return 0;
    const samplePosition = time * 44100; // Assuming 44.1kHz sample rate
    const samplesPerPixel = (audioData[0].length / zoomLevel) / width;
    return (samplePosition / samplesPerPixel) - scrollPosition;
  }, [audioData, zoomLevel, width, scrollPosition]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = effectiveHeight;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, effectiveHeight);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      // Vertical grid lines (time)
      const gridSpacing = 50;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, effectiveHeight);
        ctx.stroke();
      }

      // Horizontal grid lines (amplitude)
      const horizontalSpacing = effectiveHeight / (channels * 4);
      for (let y = 0; y < effectiveHeight; y += horizontalSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Draw regions
    regions.forEach(region => {
      const startX = timeToPixel(region.startTime);
      const endX = timeToPixel(region.endTime);
      const regionWidth = endX - startX;

      if (regionWidth > 0 && startX < width && endX > 0) {
        ctx.fillStyle = region.color || 'rgba(255, 255, 0, 0.2)';
        ctx.fillRect(Math.max(0, startX), 0, Math.min(regionWidth, width - startX), effectiveHeight);
      }
    });

    // Draw waveform for each channel
    audioData.forEach((channelData, channelIndex) => {
      const channelY = variant === 'stereo' && channels > 1
        ? channelIndex * (channelHeight + 10)
        : 0;
      const channelHeightUsed = variant === 'stereo' && channels > 1
        ? channelHeight
        : effectiveHeight;

      drawChannelWaveform(ctx, channelData, channelY, channelHeightUsed, channelIndex);
    });

    // Draw markers
    markers.forEach(marker => {
      const x = timeToPixel(marker.time);
      if (x >= 0 && x <= width) {
        ctx.strokeStyle = marker.color || '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, effectiveHeight);
        ctx.stroke();

        if (marker.label) {
          ctx.fillStyle = marker.color || '#ff0000';
          ctx.font = '12px sans-serif';
          ctx.fillText(marker.label, x + 5, 15);
        }
      }
    });

    // Draw playhead
    if (showPlayhead && playheadPosition !== undefined) {
      const playheadX = timeToPixel(playheadPosition);
      if (playheadX >= 0 && playheadX <= width) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, effectiveHeight);
        ctx.stroke();
      }
    }

    // Draw selection
    if (isSelecting && selectionStart !== null && selectionEnd !== null) {
      const startX = Math.min(selectionStart, selectionEnd);
      const endX = Math.max(selectionStart, selectionEnd);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(startX, 0, endX - startX, effectiveHeight);
    }

    // Draw cursor
    if (showCursor && interactive) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cursorPosition, 0);
      ctx.lineTo(cursorPosition, effectiveHeight);
      ctx.stroke();
    }

  }, [
    audioData, width, effectiveHeight, backgroundColor, showGrid, regions, markers,
    showPlayhead, playheadPosition, isSelecting, selectionStart, selectionEnd,
    showCursor, interactive, cursorPosition, timeToPixel, channels, channelHeight, variant
  ]);

  // Draw individual channel waveform
  const drawChannelWaveform = useCallback((
    ctx: CanvasRenderingContext2D,
    channelData: Float32Array,
    yOffset: number,
    channelHeight: number,
    channelIndex: number
  ) => {
    const samplesPerPixel = Math.floor((channelData.length / zoomLevel) / width);
    const centerY = yOffset + channelHeight / 2;

    // Set waveform style
    ctx.strokeStyle = color;
    ctx.lineWidth = variant === 'minimal' ? 1 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (variant === 'professional') {
      // Professional view with filled waveform
      ctx.fillStyle = color + '40'; // Add transparency

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let x = 0; x < width; x++) {
        const startSample = Math.floor((x + scrollPosition) * samplesPerPixel);
        const endSample = Math.min(startSample + samplesPerPixel, channelData.length);

        let min = 0;
        let max = 0;

        // Find min/max in this pixel range
        for (let i = startSample; i < endSample; i++) {
          const sample = channelData[i] || 0;
          min = Math.min(min, sample);
          max = Math.max(max, sample);
        }

        const minY = centerY - (min * amplitude * channelHeight / 2);
        const maxY = centerY - (max * amplitude * channelHeight / 2);

        if (x === 0) {
          ctx.moveTo(x, maxY);
        } else {
          ctx.lineTo(x, maxY);
        }
      }

      // Draw bottom half
      for (let x = width - 1; x >= 0; x--) {
        const startSample = Math.floor((x + scrollPosition) * samplesPerPixel);
        const endSample = Math.min(startSample + samplesPerPixel, channelData.length);

        let min = 0;

        for (let i = startSample; i < endSample; i++) {
          const sample = channelData[i] || 0;
          min = Math.min(min, sample);
        }

        const minY = centerY - (min * amplitude * channelHeight / 2);
        ctx.lineTo(x, minY);
      }

      ctx.closePath();
      ctx.fill();

      // Draw outline
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const startSample = Math.floor((x + scrollPosition) * samplesPerPixel);
        const endSample = Math.min(startSample + samplesPerPixel, channelData.length);

        let min = 0;
        let max = 0;

        for (let i = startSample; i < endSample; i++) {
          const sample = channelData[i] || 0;
          min = Math.min(min, sample);
          max = Math.max(max, sample);
        }

        const minY = centerY - (min * amplitude * channelHeight / 2);
        const maxY = centerY - (max * amplitude * channelHeight / 2);

        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
      }
      ctx.stroke();

    } else {
      // Standard line waveform
      ctx.beginPath();

      for (let x = 0; x < width; x++) {
        const startSample = Math.floor((x + scrollPosition) * samplesPerPixel);
        const endSample = Math.min(startSample + samplesPerPixel, channelData.length);

        let rms = 0;
        let count = 0;

        // Calculate RMS for smoothing or just take average
        for (let i = startSample; i < endSample; i++) {
          const sample = channelData[i] || 0;
          if (smoothing) {
            rms += sample * sample;
          } else {
            rms += Math.abs(sample);
          }
          count++;
        }

        const value = count > 0
          ? smoothing
            ? Math.sqrt(rms / count) * Math.sign(rms)
            : rms / count
          : 0;

        const y = centerY - (value * amplitude * channelHeight / 2);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    // Draw center line
    if (variant !== 'minimal') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    }

    // Draw channel label
    if (showChannelLabels && variant === 'stereo' && channels > 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '12px sans-serif';
      const label = channelIndex === 0 ? 'L' : channelIndex === 1 ? 'R' : `${channelIndex + 1}`;
      ctx.fillText(label, 5, yOffset + 15);
    }

  }, [color, variant, amplitude, smoothing, scrollPosition, zoomLevel, width, showChannelLabels, channels]);

  // Mouse event handlers
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!interactive) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    setCursorPosition(x);

    if (isSelecting && selectionStart !== null) {
      setSelectionEnd(x);
    }
  }, [interactive, isSelecting, selectionStart]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!interactive) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;

    if (event.shiftKey) {
      // Start region selection
      setIsSelecting(true);
      setSelectionStart(x);
      setSelectionEnd(x);
    } else {
      // Time click
      const time = pixelToTime(x);
      onTimeClick?.(time);
    }
  }, [interactive, pixelToTime, onTimeClick]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionStart !== null && selectionEnd !== null) {
      const startTime = pixelToTime(Math.min(selectionStart, selectionEnd));
      const endTime = pixelToTime(Math.max(selectionStart, selectionEnd));
      onRegionSelect?.(startTime, endTime);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionStart, selectionEnd, pixelToTime, onRegionSelect]);

  // Real-time animation
  useEffect(() => {
    if (realTime) {
      const animate = () => {
        drawWaveform();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      drawWaveform();
      return undefined;
    }
  }, [drawWaveform, realTime]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair"
        width={width}
        height={effectiveHeight}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsSelecting(false);
          setSelectionStart(null);
          setSelectionEnd(null);
        }}
      />

      {/* Controls overlay */}
      {interactive && (
        <div className="absolute top-2 right-2 flex gap-2">
          <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            {pixelToTime(cursorPosition).toFixed(3)}s
          </div>
        </div>
      )}
    </div>
  );
};