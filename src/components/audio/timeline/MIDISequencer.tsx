'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export interface MIDINote {
  id: string;
  pitch: number; // 0-127 (C-1 to G9)
  velocity: number; // 0-127
  startTime: number; // in beats
  duration: number; // in beats
  channel?: number;
}

export interface MIDITrack {
  id: string;
  name: string;
  channel: number;
  instrument: string;
  color?: string;
  muted: boolean;
  solo: boolean;
  notes: MIDINote[];
  volume: number;
  pan: number;
}

export interface MIDISequencerProps {
  tracks: MIDITrack[];
  onTrackChange: (trackId: string, changes: Partial<MIDITrack>) => void;
  onNoteChange: (noteId: string, changes: Partial<MIDINote>) => void;
  onNoteCreate: (trackId: string, note: Omit<MIDINote, 'id'>) => void;
  onNoteDelete: (noteId: string) => void;

  currentBeat: number;
  onBeatChange: (beat: number) => void;

  tempo: number;
  timeSignature: [number, number]; // [numerator, denominator]
  measures: number;

  zoom?: number;
  scrollPosition?: number;
  onZoomChange?: (zoom: number) => void;
  onScrollChange?: (position: number) => void;

  snapToGrid?: boolean;
  gridDivision?: number; // 1=whole, 2=half, 4=quarter, 8=eighth, 16=sixteenth
  showGrid?: boolean;
  showPianoRoll?: boolean;
  octaveRange?: [number, number]; // [minOctave, maxOctave]

  variant?: 'minimal' | 'standard' | 'professional';
  className?: string;

  onSelectionChange?: (selectedNotes: string[]) => void;
}

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const blackKeys = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

export const MIDISequencer: React.FC<MIDISequencerProps> = ({
  tracks,
  onTrackChange,
  onNoteChange,
  onNoteCreate,
  onNoteDelete,
  currentBeat,
  onBeatChange,
  tempo = 120,
  timeSignature = [4, 4],
  measures = 32,
  zoom = 1,
  scrollPosition = 0,
  onZoomChange,
  onScrollChange,
  snapToGrid = true,
  gridDivision = 16,
  showGrid = true,
  showPianoRoll = true,
  octaveRange = [2, 6],
  variant = 'standard',
  className,
  onSelectionChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [dragState, setDragState] = useState<{
    type: 'playhead' | 'note' | 'resize' | 'create' | null;
    noteId?: string;
    startBeat?: number;
    startPitch?: number;
    edge?: 'start' | 'end';
    offset?: { x: number; y: number };
  }>({ type: null });

  const pianoRollWidth = showPianoRoll ? (variant === 'minimal' ? 60 : 80) : 0;
  const trackHeaderHeight = variant === 'minimal' ? 40 : 60;
  const noteHeight = variant === 'minimal' ? 12 : 16;
  const beatsPerPixel = 0.25 / zoom;
  const totalBeats = measures * timeSignature[0];

  // Calculate visible note range
  const [minOctave, maxOctave] = octaveRange;
  const minPitch = minOctave * 12;
  const maxPitch = (maxOctave + 1) * 12 - 1;
  const visiblePitches = maxPitch - minPitch + 1;

  // Convert beat to pixel position
  const beatToPixel = useCallback((beat: number): number => {
    return (beat / beatsPerPixel) - scrollPosition;
  }, [beatsPerPixel, scrollPosition]);

  // Convert pixel position to beat
  const pixelToBeat = useCallback((pixel: number): number => {
    return (pixel + scrollPosition) * beatsPerPixel;
  }, [beatsPerPixel, scrollPosition]);

  // Convert pitch to Y position
  const pitchToY = useCallback((pitch: number): number => {
    return trackHeaderHeight + (maxPitch - pitch) * noteHeight;
  }, [maxPitch, noteHeight, trackHeaderHeight]);

  // Convert Y position to pitch
  const yToPitch = useCallback((y: number): number => {
    return Math.round(maxPitch - (y - trackHeaderHeight) / noteHeight);
  }, [maxPitch, noteHeight, trackHeaderHeight]);

  // Snap beat to grid
  const snapBeat = useCallback((beat: number): number => {
    if (!snapToGrid) return beat;
    const gridSize = 4 / gridDivision; // Convert to beats
    return Math.round(beat / gridSize) * gridSize;
  }, [snapToGrid, gridDivision]);

  // Get note name from pitch
  const getPitchName = useCallback((pitch: number): string => {
    const octave = Math.floor(pitch / 12) - 1;
    const noteIndex = pitch % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }, []);

  // Check if pitch is a black key
  const isBlackKey = useCallback((pitch: number): boolean => {
    return blackKeys.includes(pitch % 12);
  }, []);

  // Draw sequencer
  const drawSequencer = useCallback(() => {
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

    // Draw track headers
    drawTrackHeaders(ctx, width);

    // Draw piano roll
    if (showPianoRoll) {
      drawPianoRoll(ctx, height);
    }

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, width, height);
    }

    // Draw beat ruler
    drawBeatRuler(ctx, width);

    // Draw notes
    tracks.forEach(track => {
      drawTrackNotes(ctx, track);
    });

    // Draw playhead
    drawPlayhead(ctx, currentBeat, height);

    // Draw selection
    if (selectedNotes.length > 0) {
      drawSelection(ctx);
    }

  }, [
    tracks, currentBeat, selectedNotes, beatToPixel, pitchToY,
    showPianoRoll, showGrid, variant, trackHeaderHeight, pianoRollWidth
  ]);

  // Draw track headers
  const drawTrackHeaders = useCallback((ctx: CanvasRenderingContext2D, width: number) => {
    if (variant === 'minimal') return;

    // Background
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, width, trackHeaderHeight);

    // Track info
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';

    let x = pianoRollWidth + 10;
    tracks.forEach((track, index) => {
      const trackWidth = 120;

      // Track background
      ctx.fillStyle = track.color || '#4b5563';
      ctx.fillRect(x, 5, trackWidth - 5, trackHeaderHeight - 10);

      // Track name
      ctx.fillStyle = '#ffffff';
      ctx.fillText(track.name, x + 5, 20);

      // Track instrument
      ctx.fillStyle = '#d1d5db';
      ctx.font = '10px sans-serif';
      ctx.fillText(track.instrument, x + 5, 35);

      // Track controls
      ctx.fillStyle = track.muted ? '#ef4444' : '#6b7280';
      ctx.fillRect(x + 5, trackHeaderHeight - 20, 15, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('M', x + 12, trackHeaderHeight - 11);

      ctx.fillStyle = track.solo ? '#fbbf24' : '#6b7280';
      ctx.fillRect(x + 25, trackHeaderHeight - 20, 15, 12);
      ctx.fillText('S', x + 32, trackHeaderHeight - 11);

      x += trackWidth;
    });

    ctx.textAlign = 'left';
    ctx.font = '12px sans-serif';
  }, [tracks, variant, trackHeaderHeight, pianoRollWidth]);

  // Draw piano roll
  const drawPianoRoll = useCallback((ctx: CanvasRenderingContext2D, height: number) => {
    // Background
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, trackHeaderHeight, pianoRollWidth, height - trackHeaderHeight);

    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
      const y = pitchToY(pitch);
      const isBlack = isBlackKey(pitch);

      // Key background
      ctx.fillStyle = isBlack ? '#1f2937' : '#ffffff';
      ctx.fillRect(0, y, pianoRollWidth, noteHeight);

      // Key border
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, y, pianoRollWidth, noteHeight);

      // Note name (only for C notes and selected octaves)
      if (pitch % 12 === 0) { // C notes
        ctx.fillStyle = isBlack ? '#ffffff' : '#000000';
        ctx.fillText(getPitchName(pitch), pianoRollWidth - 4, y + noteHeight - 2);
      }
    }
  }, [minPitch, maxPitch, pitchToY, noteHeight, pianoRollWidth, trackHeaderHeight, isBlackKey, getPitchName]);

  // Draw grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    const gridSize = 4 / gridDivision; // beats per grid line
    const startBeat = Math.floor(pixelToBeat(pianoRollWidth) / gridSize) * gridSize;
    const endBeat = pixelToBeat(width);

    // Vertical grid lines (beats)
    for (let beat = startBeat; beat <= endBeat; beat += gridSize) {
      const x = beatToPixel(beat) + pianoRollWidth;
      if (x >= pianoRollWidth && x <= width) {
        // Stronger lines for measure boundaries
        if (beat % timeSignature[0] === 0) {
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1;
        }

        ctx.beginPath();
        ctx.moveTo(x, trackHeaderHeight);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Horizontal grid lines (pitches)
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 0.5;

    for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
      const y = pitchToY(pitch);
      ctx.beginPath();
      ctx.moveTo(pianoRollWidth, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [
    beatToPixel, pixelToBeat, pitchToY, gridDivision, timeSignature,
    pianoRollWidth, trackHeaderHeight, minPitch, maxPitch
  ]);

  // Draw beat ruler
  const drawBeatRuler = useCallback((ctx: CanvasRenderingContext2D, width: number) => {
    // Background
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(pianoRollWidth, 0, width - pianoRollWidth, trackHeaderHeight);

    // Beat markers
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';

    const startBeat = Math.floor(pixelToBeat(pianoRollWidth));
    const endBeat = Math.ceil(pixelToBeat(width));

    for (let beat = startBeat; beat <= endBeat; beat++) {
      const x = beatToPixel(beat) + pianoRollWidth;

      if (x >= pianoRollWidth && x <= width) {
        // Major beat markers (measures)
        if (beat % timeSignature[0] === 0) {
          const measure = Math.floor(beat / timeSignature[0]) + 1;

          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, trackHeaderHeight);
          ctx.stroke();

          // Measure number
          ctx.fillText(measure.toString(), x, 15);
        }
        // Minor beat markers
        else {
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, trackHeaderHeight - 10);
          ctx.lineTo(x, trackHeaderHeight);
          ctx.stroke();

          // Beat number within measure
          const beatInMeasure = (beat % timeSignature[0]) + 1;
          ctx.font = '9px monospace';
          ctx.fillText(beatInMeasure.toString(), x, trackHeaderHeight - 5);
          ctx.font = '11px monospace';
        }
      }
    }
  }, [beatToPixel, pixelToBeat, pianoRollWidth, trackHeaderHeight, timeSignature]);

  // Draw notes for a track
  const drawTrackNotes = useCallback((ctx: CanvasRenderingContext2D, track: MIDITrack) => {
    track.notes.forEach(note => {
      drawNote(ctx, note, track);
    });
  }, []);

  // Draw individual note
  const drawNote = useCallback((
    ctx: CanvasRenderingContext2D,
    note: MIDINote,
    track: MIDITrack
  ) => {
    const noteX = beatToPixel(note.startTime) + pianoRollWidth;
    const noteWidth = note.duration / beatsPerPixel;
    const noteY = pitchToY(note.pitch);

    // Skip if note is not visible
    if (noteX + noteWidth < pianoRollWidth || noteX > canvasRef.current?.width!) return;
    if (noteY < trackHeaderHeight || noteY > canvasRef.current?.height!) return;

    // Note color based on velocity
    const velocityAlpha = note.velocity / 127;
    const baseColor = track.color || '#3b82f6';
    const noteColor = track.muted ? '#6b7280' : baseColor;

    // Note background
    ctx.fillStyle = noteColor;
    ctx.globalAlpha = velocityAlpha * 0.8 + 0.2;
    ctx.fillRect(noteX, noteY, noteWidth, noteHeight);

    // Note border
    ctx.globalAlpha = 1;
    ctx.strokeStyle = selectedNotes.includes(note.id) ? '#fbbf24' : '#1f2937';
    ctx.lineWidth = selectedNotes.includes(note.id) ? 2 : 1;
    ctx.strokeRect(noteX, noteY, noteWidth, noteHeight);

    // Velocity indicator (left edge)
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = velocityAlpha;
    ctx.fillRect(noteX, noteY, 2, noteHeight);
    ctx.globalAlpha = 1;

    // Note name (if wide enough)
    if (noteWidth > 30) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(getPitchName(note.pitch), noteX + 4, noteY + noteHeight - 2);
    }

  }, [beatToPixel, beatsPerPixel, pitchToY, pianoRollWidth, noteHeight, selectedNotes, getPitchName, trackHeaderHeight]);

  // Draw playhead
  const drawPlayhead = useCallback((
    ctx: CanvasRenderingContext2D,
    beat: number,
    height: number
  ) => {
    const x = beatToPixel(beat) + pianoRollWidth;

    if (x < pianoRollWidth || x > canvasRef.current?.width!) return;

    // Playhead line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, trackHeaderHeight);
    ctx.lineTo(x, height);
    ctx.stroke();

    // Playhead handle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x - 6, trackHeaderHeight);
    ctx.lineTo(x + 6, trackHeaderHeight);
    ctx.lineTo(x, trackHeaderHeight + 12);
    ctx.closePath();
    ctx.fill();
  }, [beatToPixel, pianoRollWidth, trackHeaderHeight]);

  // Draw selection
  const drawSelection = useCallback((ctx: CanvasRenderingContext2D) => {
    // This would draw selection highlights around selected notes
    // Implementation depends on selection state
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on playhead
    const playheadX = beatToPixel(currentBeat) + pianoRollWidth;
    if (Math.abs(x - playheadX) < 10 && y < trackHeaderHeight) {
      setDragState({ type: 'playhead', startBeat: currentBeat });
      return;
    }

    // Check if clicking on ruler
    if (y < trackHeaderHeight && x > pianoRollWidth) {
      const clickBeat = snapBeat(pixelToBeat(x - pianoRollWidth));
      onBeatChange(Math.max(0, clickBeat));
      return;
    }

    // Check if clicking in note area
    if (y > trackHeaderHeight && x > pianoRollWidth) {
      const clickBeat = pixelToBeat(x - pianoRollWidth);
      const clickPitch = yToPitch(y);

      // Check for existing notes
      let noteClicked = false;
      for (const track of tracks) {
        for (const note of track.notes) {
          const noteX = beatToPixel(note.startTime) + pianoRollWidth;
          const noteWidth = note.duration / beatsPerPixel;
          const noteY = pitchToY(note.pitch);

          if (x >= noteX && x <= noteX + noteWidth &&
              y >= noteY && y <= noteY + noteHeight) {

            // Check for resize handles
            if (x <= noteX + 8) {
              setDragState({
                type: 'resize',
                noteId: note.id,
                edge: 'start',
                startBeat: note.startTime
              });
            } else if (x >= noteX + noteWidth - 8) {
              setDragState({
                type: 'resize',
                noteId: note.id,
                edge: 'end',
                startBeat: note.startTime
              });
            } else {
              setDragState({
                type: 'note',
                noteId: note.id,
                startBeat: note.startTime,
                startPitch: note.pitch,
                offset: { x: x - noteX, y: y - noteY }
              });

              if (!selectedNotes.includes(note.id)) {
                setSelectedNotes([note.id]);
                onSelectionChange?.([note.id]);
              }
            }

            noteClicked = true;
            break;
          }
        }
        if (noteClicked) break;
      }

      // Create new note if no existing note was clicked
      if (!noteClicked && e.shiftKey && tracks.length > 0) {
        const newNote: Omit<MIDINote, 'id'> = {
          pitch: Math.max(0, Math.min(127, clickPitch)),
          velocity: 100,
          startTime: Math.max(0, snapBeat(clickBeat)),
          duration: 4 / gridDivision, // Default to one grid division
          channel: tracks[0].channel
        };

        onNoteCreate(tracks[0].id, newNote);
      } else if (!noteClicked) {
        // Clear selection
        setSelectedNotes([]);
        onSelectionChange?.([]);
      }
    }
  }, [
    currentBeat, beatToPixel, pixelToBeat, yToPitch, pitchToY, snapBeat,
    onBeatChange, tracks, selectedNotes, onSelectionChange, onNoteCreate,
    pianoRollWidth, trackHeaderHeight, noteHeight, beatsPerPixel, gridDivision
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragState.type === 'playhead') {
      const newBeat = Math.max(0, snapBeat(pixelToBeat(x - pianoRollWidth)));
      onBeatChange(newBeat);
    } else if (dragState.type === 'note' && dragState.noteId) {
      const newBeat = Math.max(0, snapBeat(pixelToBeat(x - pianoRollWidth)));
      const newPitch = Math.max(0, Math.min(127, yToPitch(y)));

      const deltaBeats = newBeat - (dragState.startBeat || 0);
      const deltaPitch = newPitch - (dragState.startPitch || 0);

      onNoteChange(dragState.noteId, {
        startTime: Math.max(0, (dragState.startBeat || 0) + deltaBeats),
        pitch: Math.max(0, Math.min(127, (dragState.startPitch || 0) + deltaPitch))
      });
    } else if (dragState.type === 'resize' && dragState.noteId) {
      const newBeat = Math.max(0, snapBeat(pixelToBeat(x - pianoRollWidth)));

      if (dragState.edge === 'start') {
        const note = tracks.flatMap(t => t.notes).find(n => n.id === dragState.noteId);
        if (note) {
          const maxStart = note.startTime + note.duration - (4 / gridDivision);
          const newStart = Math.max(0, Math.min(newBeat, maxStart));
          const newDuration = note.startTime + note.duration - newStart;

          onNoteChange(dragState.noteId, {
            startTime: newStart,
            duration: newDuration
          });
        }
      } else {
        const minEnd = (dragState.startBeat || 0) + (4 / gridDivision);
        const newEnd = Math.max(newBeat, minEnd);
        const newDuration = newEnd - (dragState.startBeat || 0);

        onNoteChange(dragState.noteId, {
          duration: newDuration
        });
      }
    }
  }, [
    dragState, pixelToBeat, yToPitch, snapBeat, onBeatChange, onNoteChange,
    pianoRollWidth, tracks, gridDivision
  ]);

  const handleMouseUp = useCallback(() => {
    setDragState({ type: null });
  }, []);

  // Keyboard event handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      selectedNotes.forEach(noteId => onNoteDelete(noteId));
      setSelectedNotes([]);
      onSelectionChange?.([]);
    }
  }, [selectedNotes, onNoteDelete, onSelectionChange]);

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
      const scrollDelta = e.deltaX || e.deltaY;
      const newScrollPosition = Math.max(0, scrollPosition + scrollDelta);
      onScrollChange?.(newScrollPosition);
    }
  }, [zoom, scrollPosition, onZoomChange, onScrollChange]);

  // Draw sequencer on canvas
  useEffect(() => {
    drawSequencer();
  }, [drawSequencer]);

  // Keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Calculate total height
  const totalHeight = trackHeaderHeight + visiblePitches * noteHeight;

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

      {/* Controls overlay */}
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

      {/* Grid division selector */}
      <div className="absolute bottom-2 right-2 flex gap-1 bg-black bg-opacity-50 rounded p-1">
        {[4, 8, 16, 32].map(division => (
          <button
            key={division}
            onClick={() => {/* Handle grid division change */}}
            className={cn(
              'text-white text-xs px-2 py-1 rounded',
              gridDivision === division
                ? 'bg-blue-500'
                : 'hover:bg-white hover:bg-opacity-20'
            )}
          >
            1/{division}
          </button>
        ))}
      </div>
    </div>
  );
};