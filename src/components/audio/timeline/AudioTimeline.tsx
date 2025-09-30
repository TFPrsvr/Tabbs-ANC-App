'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TimelineMarker {
  id: string;
  time: number;
  label?: string;
  color?: string;
  type?: 'cue' | 'chapter' | 'marker' | 'loop';
}

export interface TimelineRegion {
  id: string;
  startTime: number;
  endTime: number;
  label?: string;
  color?: string;
  track?: number;
}

export interface AudioClip {
  id: string;
  startTime: number;
  duration: number;
  track: number;
  name: string;
  color?: string;
  fadeIn?: number;
  fadeOut?: number;
  gain?: number;
  muted?: boolean;
  locked?: boolean;
}

export interface AudioTrack {
  id: string;
  name: string;
  height: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  color?: string;
  clips: AudioClip[];
}

export interface AudioTimelineProps {
  tracks: AudioTrack[];
  duration: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onTrackChange: (trackId: string, changes: Partial<AudioTrack>) => void;
  onClipChange: (clipId: string, changes: Partial<AudioClip>) => void;
  onClipMove: (clipId: string, newStartTime: number, newTrack: number) => void;
  onClipResize: (clipId: string, newStartTime: number, newDuration: number) => void;

  markers?: TimelineMarker[];
  regions?: TimelineRegion[];
  onMarkerChange?: (markerId: string, time: number) => void;
  onRegionChange?: (regionId: string, startTime: number, endTime: number) => void;

  zoom?: number;
  scrollPosition?: number;
  onZoomChange?: (zoom: number) => void;
  onScrollChange?: (position: number) => void;

  snapToGrid?: boolean;
  gridSize?: number;
  showGrid?: boolean;
  showWaveforms?: boolean;
  showTimecode?: boolean;

  variant?: 'minimal' | 'standard' | 'professional';
  className?: string;

  onSelectionChange?: (selectedItems: string[]) => void;
}

const trackColors = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

export const AudioTimeline: React.FC<AudioTimelineProps> = ({
  tracks,
  duration,
  currentTime,
  onTimeChange,
  onTrackChange,
  onClipChange,
  onClipMove,
  onClipResize,
  markers = [],
  regions = [],
  onMarkerChange,
  onRegionChange,
  zoom = 1,
  scrollPosition = 0,
  onZoomChange,
  onScrollChange,
  snapToGrid = true,
  gridSize = 1,
  showGrid = true,
  showWaveforms = false,
  showTimecode = true,
  variant = 'standard',
  className,
  onSelectionChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [dragState, setDragState] = useState<{
    type: 'playhead' | 'clip' | 'marker' | 'region' | null;
    itemId?: string;
    startX?: number;
    startTime?: number;
    offset?: number;
  }>({ type: null });
  const [resizeState, setResizeState] = useState<{
    clipId?: string;
    edge: 'start' | 'end';
    originalStart?: number;
    originalDuration?: number;
  } | null>(null);

  const pixelsPerSecond = 50 * zoom;
  const trackHeaderWidth = variant === 'minimal' ? 80 : 120;
  const timelineHeight = variant === 'minimal' ? 40 : 60;
  const defaultTrackHeight = variant === 'minimal' ? 60 : 80;

  // Convert time to pixel position
  const timeToPixel = useCallback((time: number): number => {
    return (time * pixelsPerSecond) - scrollPosition;
  }, [pixelsPerSecond, scrollPosition]);

  // Convert pixel position to time
  const pixelToTime = useCallback((pixel: number): number => {
    return (pixel + scrollPosition) / pixelsPerSecond;
  }, [pixelsPerSecond, scrollPosition]);

  // Snap time to grid
  const snapTime = useCallback((time: number): number => {
    if (!snapToGrid) return time;
    return Math.round(time / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Draw timeline
  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const { width, height } = canvas;

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // Draw timeline ruler
    drawTimelineRuler(ctx, width);

    // Draw tracks
    let trackY = timelineHeight;
    tracks.forEach((track, index) => {
      const trackHeight = track.height ?? defaultTrackHeight;
      drawTrack(ctx, track, trackY, trackHeight, width, index);
      trackY += trackHeight;
    });

    // Draw markers
    markers.forEach(marker => {
      drawMarker(ctx, marker, height);
    });

    // Draw regions
    regions.forEach(region => {
      drawRegion(ctx, region, timelineHeight, height - timelineHeight);
    });

    // Draw playhead
    drawPlayhead(ctx, currentTime, height);

    // Draw selection
    if (selectedItems.length > 0) {
      drawSelection(ctx);
    }

  }, [
    tracks, currentTime, markers, regions, selectedItems, timeToPixel,
    timelineHeight, defaultTrackHeight, variant, showGrid, gridSize
  ]);

  // Draw timeline ruler
  const drawTimelineRuler = useCallback((ctx: CanvasRenderingContext2D, width: number) => {
    // Background
    ctx.fillStyle = '#374151';
    ctx.fillRect(trackHeaderWidth, 0, width - trackHeaderWidth, timelineHeight);

    // Grid and time markers
    const startTime = pixelToTime(trackHeaderWidth);
    const endTime = pixelToTime(width);
    const timeStep = getTimeStep(zoom);

    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#d1d5db';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';

    for (let time = Math.floor(startTime / timeStep) * timeStep; time <= endTime; time += timeStep) {
      const x = timeToPixel(time) + trackHeaderWidth;

      if (x >= trackHeaderWidth && x <= width) {
        // Major grid line
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, timelineHeight);
        ctx.stroke();

        // Time label
        if (showTimecode) {
          const timeLabel = formatTime(time);
          ctx.fillText(timeLabel, x, timelineHeight - 5);
        }

        // Minor grid lines
        if (showGrid && timeStep >= 1) {
          ctx.strokeStyle = '#4b5563';
          for (let i = 1; i < 4; i++) {
            const minorTime = time + (timeStep * i / 4);
            const minorX = timeToPixel(minorTime) + trackHeaderWidth;
            if (minorX >= trackHeaderWidth && minorX <= width) {
              ctx.beginPath();
              ctx.moveTo(minorX, timelineHeight - 10);
              ctx.lineTo(minorX, timelineHeight);
              ctx.stroke();
            }
          }
          ctx.strokeStyle = '#6b7280';
        }
      }
    }

    // Vertical grid lines on tracks
    if (showGrid) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      const totalHeight = tracks.reduce((sum, track) => sum + (track.height ?? defaultTrackHeight), timelineHeight);

      for (let time = Math.floor(startTime / gridSize) * gridSize; time <= endTime; time += gridSize) {
        const x = timeToPixel(time) + trackHeaderWidth;
        if (x >= trackHeaderWidth && x <= width) {
          ctx.beginPath();
          ctx.moveTo(x, timelineHeight);
          ctx.lineTo(x, totalHeight);
          ctx.stroke();
        }
      }
    }
  }, [timeToPixel, pixelToTime, zoom, showTimecode, showGrid, gridSize, trackHeaderWidth, timelineHeight, tracks, defaultTrackHeight]);

  // Draw track
  const drawTrack = useCallback((
    ctx: CanvasRenderingContext2D,
    track: AudioTrack,
    y: number,
    height: number,
    width: number,
    index: number
  ) => {
    // Track background
    const trackColor = track.color ?? trackColors[index % trackColors.length];
    ctx.fillStyle = track.muted ? '#4b5563' : track.solo ? '#fbbf24' : '#374151';
    ctx.fillRect(trackHeaderWidth, y, width - trackHeaderWidth, height);

    // Track header
    ctx.fillStyle = (track.color ?? trackColor) + '40';
    ctx.fillRect(0, y, trackHeaderWidth, height);

    // Track border
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, y, width, height);

    // Track name
    ctx.fillStyle = '#ffffff';
    ctx.font = variant === 'minimal' ? '12px sans-serif' : '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(track.name, 8, y + 20);

    // Track controls (simplified)
    if (variant !== 'minimal') {
      const buttonY = y + height - 25;

      // Mute button
      ctx.fillStyle = track.muted ? '#ef4444' : '#6b7280';
      ctx.fillRect(8, buttonY, 20, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('M', 18, buttonY + 11);

      // Solo button
      ctx.fillStyle = track.solo ? '#fbbf24' : '#6b7280';
      ctx.fillRect(32, buttonY, 20, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('S', 42, buttonY + 11);

      // Arm button
      ctx.fillStyle = track.armed ? '#ef4444' : '#6b7280';
      ctx.fillRect(56, buttonY, 20, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('R', 66, buttonY + 11);
    }

    // Draw clips
    track.clips.forEach(clip => {
      drawClip(ctx, clip, track, y, height);
    });

  }, [trackHeaderWidth, variant, timeToPixel]);

  // Draw audio clip
  const drawClip = useCallback((
    ctx: CanvasRenderingContext2D,
    clip: AudioClip,
    track: AudioTrack,
    trackY: number,
    trackHeight: number
  ) => {
    const clipX = timeToPixel(clip.startTime) + trackHeaderWidth;
    const clipWidth = clip.duration * pixelsPerSecond;
    const clipY = trackY + 4;
    const clipHeight = trackHeight - 8;

    // Skip if clip is not visible
    const canvasWidth = canvasRef.current?.width ?? 0;
    if (clipX + clipWidth < trackHeaderWidth || clipX > canvasWidth) return;

    // Clip background
    const clipColor = clip.color ?? track.color ?? '#3b82f6';
    ctx.fillStyle = clip.muted ? '#6b7280' : clipColor;
    ctx.fillRect(clipX, clipY, clipWidth, clipHeight);

    // Clip border
    ctx.strokeStyle = selectedItems.includes(clip.id) ? '#fbbf24' : '#1f2937';
    ctx.lineWidth = selectedItems.includes(clip.id) ? 2 : 1;
    ctx.strokeRect(clipX, clipY, clipWidth, clipHeight);

    // Clip name
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    const textY = clipY + clipHeight / 2 + 4;

    // Clip text with overflow handling
    const maxTextWidth = clipWidth - 8;
    let displayName = clip.name;
    const textWidth = ctx.measureText(displayName).width;

    if (textWidth > maxTextWidth && maxTextWidth > 20) {
      while (ctx.measureText(displayName + '...').width > maxTextWidth && displayName.length > 0) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '...';
    }

    if (maxTextWidth > 20) {
      ctx.fillText(displayName, clipX + 4, textY);
    }

    // Fade indicators
    if ((clip.fadeIn ?? 0) > 0) {
      const fadeWidth = (clip.fadeIn ?? 0) * pixelsPerSecond;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(clipX, clipY + clipHeight);
      ctx.lineTo(clipX + fadeWidth, clipY);
      ctx.lineTo(clipX, clipY);
      ctx.closePath();
      ctx.fill();
    }

    if ((clip.fadeOut ?? 0) > 0) {
      const fadeWidth = (clip.fadeOut ?? 0) * pixelsPerSecond;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(clipX + clipWidth, clipY);
      ctx.lineTo(clipX + clipWidth - fadeWidth, clipY + clipHeight);
      ctx.lineTo(clipX + clipWidth, clipY + clipHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Waveform (simplified)
    if (showWaveforms && clipWidth > 20) {
      drawSimpleWaveform(ctx, clipX, clipY, clipWidth, clipHeight);
    }

    // Locked indicator
    if (clip.locked) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🔒', clipX + clipWidth - 4, clipY + 12);
    }

  }, [timeToPixel, pixelsPerSecond, trackHeaderWidth, selectedItems, showWaveforms]);

  // Draw simple waveform representation
  const drawSimpleWaveform = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;

    const centerY = y + height / 2;
    const samples = Math.floor(width / 2);

    ctx.beginPath();
    for (let i = 0; i < samples; i++) {
      const sampleX = x + (i / samples) * width;
      const amplitude = (Math.random() - 0.5) * height * 0.6;

      if (i === 0) {
        ctx.moveTo(sampleX, centerY + amplitude);
      } else {
        ctx.lineTo(sampleX, centerY + amplitude);
      }
    }
    ctx.stroke();
  }, []);

  // Draw marker
  const drawMarker = useCallback((
    ctx: CanvasRenderingContext2D,
    marker: TimelineMarker,
    height: number
  ) => {
    const x = timeToPixel(marker.time) + trackHeaderWidth;
    const canvasWidth = canvasRef.current?.width ?? 0;

    if (x < trackHeaderWidth || x > canvasWidth) return;

    const color = marker.color ?? '#fbbf24';

    // Marker line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    // Marker flag
    if (marker.label) {
      const flagWidth = 60;
      const flagHeight = 20;

      ctx.fillStyle = color;
      ctx.fillRect(x, 0, flagWidth, flagHeight);

      ctx.fillStyle = '#000000';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(marker.label, x + 4, 14);
    }
  }, [timeToPixel, trackHeaderWidth]);

  // Draw region
  const drawRegion = useCallback((
    ctx: CanvasRenderingContext2D,
    region: TimelineRegion,
    y: number,
    height: number
  ) => {
    const startX = timeToPixel(region.startTime) + trackHeaderWidth;
    const endX = timeToPixel(region.endTime) + trackHeaderWidth;
    const width = endX - startX;

    const canvasWidth = canvasRef.current?.width ?? 0;
    if (endX < trackHeaderWidth || startX > canvasWidth) return;

    const color = region.color ?? '#10b981';

    // Region background
    ctx.fillStyle = color + '40';
    ctx.fillRect(startX, y, width, height);

    // Region borders
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX, y + height);
    ctx.moveTo(endX, y);
    ctx.lineTo(endX, y + height);
    ctx.stroke();

    // Region label
    if (region.label && width > 50) {
      ctx.fillStyle = color;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(region.label, startX + width / 2, y + 16);
    }
  }, [timeToPixel, trackHeaderWidth]);

  // Draw playhead
  const drawPlayhead = useCallback((
    ctx: CanvasRenderingContext2D,
    time: number,
    height: number
  ) => {
    const x = timeToPixel(time) + trackHeaderWidth;
    const canvasWidth = canvasRef.current?.width ?? 0;

    if (x < trackHeaderWidth || x > canvasWidth) return;

    // Playhead line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    // Playhead handle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x - 6, 0);
    ctx.lineTo(x + 6, 0);
    ctx.lineTo(x, 12);
    ctx.closePath();
    ctx.fill();
  }, [timeToPixel, trackHeaderWidth]);

  // Draw selection
  const drawSelection = useCallback((ctx: CanvasRenderingContext2D) => {
    // This would draw selection highlights around selected items
    // Implementation depends on selection state
  }, []);

  // Get appropriate time step for ruler
  const getTimeStep = useCallback((zoomLevel: number): number => {
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300];
    const targetPixelSpacing = 50;
    const timePerPixel = 1 / (50 * zoomLevel);
    const targetTimeSpacing = targetPixelSpacing * timePerPixel;

    return steps.find(step => step >= targetTimeSpacing) ?? steps[steps.length - 1] ?? 1;
  }, []);

  // Format time as MM:SS.mmm
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toFixed(1).padStart(4, '0')}`;
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on playhead
    const playheadX = timeToPixel(currentTime) + trackHeaderWidth;
    if (Math.abs(x - playheadX) < 10 && y < timelineHeight) {
      setDragState({ type: 'playhead', startX: x, startTime: currentTime });
      return;
    }

    // Check if clicking on timeline ruler
    if (y < timelineHeight && x > trackHeaderWidth) {
      const clickTime = snapTime(pixelToTime(x - trackHeaderWidth));
      onTimeChange(clickTime);
      return;
    }

    // Check for clip clicks
    let trackY = timelineHeight;
    for (const track of tracks) {
      const trackHeight = track.height ?? defaultTrackHeight;

      if (y >= trackY && y < trackY + trackHeight) {
        // Check clips in this track
        for (const clip of track.clips) {
          const clipX = timeToPixel(clip.startTime) + trackHeaderWidth;
          const clipWidth = clip.duration * pixelsPerSecond;

          if (x >= clipX && x <= clipX + clipWidth) {
            // Check for resize handles
            if (x <= clipX + 8) {
              setResizeState({
                clipId: clip.id,
                edge: 'start',
                originalStart: clip.startTime,
                originalDuration: clip.duration
              });
            } else if (x >= clipX + clipWidth - 8) {
              setResizeState({
                clipId: clip.id,
                edge: 'end',
                originalStart: clip.startTime,
                originalDuration: clip.duration
              });
            } else {
              // Clip move
              setDragState({
                type: 'clip',
                itemId: clip.id,
                startX: x,
                startTime: clip.startTime,
                offset: x - clipX
              });

              if (!selectedItems.includes(clip.id)) {
                setSelectedItems([clip.id]);
                onSelectionChange?.([clip.id]);
              }
            }
            return;
          }
        }
      }

      trackY += trackHeight;
    }

    // Clear selection if clicking empty area
    setSelectedItems([]);
    onSelectionChange?.([]);
  }, [currentTime, timeToPixel, pixelToTime, snapTime, onTimeChange, tracks, trackHeaderWidth, timelineHeight, defaultTrackHeight, pixelsPerSecond, selectedItems, onSelectionChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragState.type === 'playhead') {
      const newTime = Math.max(0, snapTime(pixelToTime(x - trackHeaderWidth)));
      onTimeChange(newTime);
    } else if (dragState.type === 'clip' && dragState.itemId) {
      const deltaX = x - (dragState.startX ?? 0);
      const deltaTime = deltaX / pixelsPerSecond;
      const newStartTime = Math.max(0, snapTime((dragState.startTime ?? 0) + deltaTime));

      // Determine target track
      let trackY = timelineHeight;
      let targetTrack = 0;

      for (let i = 0; i < tracks.length; i++) {
        const trackHeight = tracks[i]?.height ?? defaultTrackHeight;
        if (y >= trackY && y < trackY + trackHeight) {
          targetTrack = i;
          break;
        }
        trackY += trackHeight;
      }

      onClipMove(dragState.itemId, newStartTime, targetTrack);
    } else if (resizeState) {
      const clip = tracks.flatMap(t => t.clips).find(c => c.id === resizeState.clipId);
      if (clip) {
        const newTime = snapTime(pixelToTime(x - trackHeaderWidth));

        if (resizeState.edge === 'start') {
          const maxStart = (resizeState.originalStart ?? 0) + (resizeState.originalDuration ?? 0) - 0.1;
          const newStart = Math.max(0, Math.min(newTime, maxStart));
          const newDuration = (resizeState.originalStart ?? 0) + (resizeState.originalDuration ?? 0) - newStart;
          onClipResize(resizeState.clipId ?? '', newStart, newDuration);
        } else {
          const minEnd = (resizeState.originalStart ?? 0) + 0.1;
          const newEnd = Math.max(newTime, minEnd);
          const newDuration = newEnd - (resizeState.originalStart ?? 0);
          onClipResize(resizeState.clipId ?? '', resizeState.originalStart ?? 0, newDuration);
        }
      }
    }
  }, [dragState, resizeState, timeToPixel, pixelToTime, snapTime, onTimeChange, pixelsPerSecond, tracks, trackHeaderWidth, timelineHeight, defaultTrackHeight, onClipMove, onClipResize]);

  const handleMouseUp = useCallback(() => {
    setDragState({ type: null });
    setResizeState(null);
  }, []);

  // Zoom and scroll handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));
      onZoomChange?.(newZoom);
    } else {
      // Scroll
      const scrollDelta = e.deltaX ?? e.deltaY;
      const newScrollPosition = Math.max(0, scrollPosition + scrollDelta);
      onScrollChange?.(newScrollPosition);
    }
  }, [zoom, scrollPosition, onZoomChange, onScrollChange]);

  // Draw timeline on canvas
  useEffect(() => {
    drawTimeline();
  }, [drawTimeline]);

  // Calculate total height
  const totalHeight = timelineHeight + tracks.reduce((sum, track) => sum + (track.height ?? defaultTrackHeight), 0);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-gray-800 border border-gray-600 rounded overflow-hidden',
        'select-none cursor-default',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ height: totalHeight }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: dragState.type ? 'grabbing' : 'default' }}
      />

      {/* Timeline controls overlay */}
      <div className="absolute top-2 right-2 flex gap-2 bg-black bg-opacity-50 rounded p-1">
        <button
          onClick={() => onZoomChange?.(Math.min(10, zoom * 1.2))}
          className="text-white text-xs px-2 py-1 hover:bg-white hover:bg-opacity-20 rounded"
        >
          +
        </button>
        <button
          onClick={() => onZoomChange?.(Math.max(0.1, zoom * 0.8))}
          className="text-white text-xs px-2 py-1 hover:bg-white hover:bg-opacity-20 rounded"
        >
          −
        </button>
        <span className="text-white text-xs px-2 py-1">
          {(zoom * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
};