import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Pause, Square, RotateCcw, Save, Upload, Download, Settings,
  Plus, Minus, Eye, EyeOff, Lock, Unlock, Move, MousePointer,
  Scissors, Copy, Trash2, Grid, Sliders, Activity, Zap
} from 'lucide-react';
import { AutomationSystem, AutomationLane, AutomationPoint, AutomationMode, CurveType } from '../../../lib/audio/automation-system';

export interface AutomationEditorProps {
  automationSystem: AutomationSystem;
  targetId?: string;
  timeRange: [number, number];
  onPointSelect?: (laneId: string, pointId: string) => void;
  onValueChange?: (laneId: string, parameterId: string, value: number) => void;
  className?: string;
}

export interface ViewportState {
  timeStart: number;
  timeEnd: number;
  valueStart: number;
  valueEnd: number;
  zoom: number;
  scroll: { x: number; y: number };
}

export interface SelectionState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  selectedPoints: Set<string>;
}

export interface EditState {
  tool: 'select' | 'draw' | 'erase' | 'cut';
  mode: 'point' | 'curve' | 'region';
  snapToGrid: boolean;
  gridResolution: number;
}

export const AutomationEditor: React.FC<AutomationEditorProps> = ({
  automationSystem,
  targetId,
  timeRange,
  onPointSelect,
  onValueChange,
  className = ''
}) => {
  const [lanes, setLanes] = useState<AutomationLane[]>([]);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    timeStart: timeRange[0],
    timeEnd: timeRange[1],
    valueStart: 0,
    valueEnd: 1,
    zoom: 1,
    scroll: { x: 0, y: 0 }
  });
  const [selection, setSelection] = useState<SelectionState>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    selectedPoints: new Set()
  });
  const [editState, setEditState] = useState<EditState>({
    tool: 'select',
    mode: 'point',
    snapToGrid: true,
    gridResolution: 0.25
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const automationModes: { mode: AutomationMode; label: string; color: string }[] = [
    { mode: 'read', label: 'Read', color: '#10b981' },
    { mode: 'write', label: 'Write', color: '#ef4444' },
    { mode: 'touch', label: 'Touch', color: '#f59e0b' },
    { mode: 'latch', label: 'Latch', color: '#8b5cf6' },
    { mode: 'trim', label: 'Trim', color: '#06b6d4' },
    { mode: 'off', label: 'Off', color: '#6b7280' }
  ];

  const curveTypes: { type: CurveType; label: string }[] = [
    { type: 'linear', label: 'Linear' },
    { type: 'exponential', label: 'Exponential' },
    { type: 'logarithmic', label: 'Logarithmic' },
    { type: 'smooth', label: 'Smooth' },
    { type: 'stepped', label: 'Stepped' },
    { type: 'bezier', label: 'Bezier' },
    { type: 'spline', label: 'Spline' },
    { type: 'hold', label: 'Hold' }
  ];

  useEffect(() => {
    loadLanes();

    // Subscribe to automation system events
    automationSystem.on('lane:created', handleLaneCreated);
    automationSystem.on('lane:updated', handleLaneUpdated);
    automationSystem.on('lane:deleted', handleLaneDeleted);
    automationSystem.on('point:added', handlePointAdded);
    automationSystem.on('point:updated', handlePointUpdated);
    automationSystem.on('point:removed', handlePointRemoved);
    automationSystem.on('playhead:update', handlePlayheadUpdate);

    return () => {
      automationSystem.removeAllListeners();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [automationSystem, targetId]);

  useEffect(() => {
    drawCanvas();
  }, [lanes, viewport, selection, playheadPosition, editState]);

  const loadLanes = useCallback(() => {
    let allLanes = automationSystem.getAllLanes();

    if (targetId) {
      allLanes = allLanes.filter(lane => lane.targetId === targetId);
    }

    setLanes(allLanes);
  }, [automationSystem, targetId]);

  const handleLaneCreated = useCallback((lane: AutomationLane) => {
    if (!targetId || lane.targetId === targetId) {
      setLanes(prev => [...prev, lane]);
    }
  }, [targetId]);

  const handleLaneUpdated = useCallback((lane: AutomationLane) => {
    setLanes(prev => prev.map(l => l.id === lane.id ? lane : l));
  }, []);

  const handleLaneDeleted = useCallback((laneId: string) => {
    setLanes(prev => prev.filter(l => l.id !== laneId));
  }, []);

  const handlePointAdded = useCallback((laneId: string, point: AutomationPoint) => {
    setLanes(prev => prev.map(lane =>
      lane.id === laneId
        ? { ...lane, points: [...lane.points].sort((a, b) => a.time - b.time) }
        : lane
    ));
    drawCanvas();
  }, []);

  const handlePointUpdated = useCallback((laneId: string, point: AutomationPoint) => {
    drawCanvas();
  }, []);

  const handlePointRemoved = useCallback((laneId: string, pointId: string) => {
    drawCanvas();
  }, []);

  const handlePlayheadUpdate = useCallback((position: number) => {
    setPlayheadPosition(position);
  }, []);

  const timeToX = useCallback((time: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const timeRange = viewport.timeEnd - viewport.timeStart;
    const normalizedTime = (time - viewport.timeStart) / timeRange;
    return normalizedTime * canvas.width;
  }, [viewport]);

  const valueToY = useCallback((value: number, lane: AutomationLane): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const laneHeight = canvas.height / Math.max(lanes.length, 1);
    const laneIndex = lanes.findIndex(l => l.id === lane.id);
    const laneTop = laneIndex * laneHeight;

    const normalizedValue = (value - lane.minValue) / (lane.maxValue - lane.minValue);
    return laneTop + laneHeight - (normalizedValue * laneHeight * 0.8) - laneHeight * 0.1;
  }, [lanes, viewport]);

  const xToTime = useCallback((x: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const timeRange = viewport.timeEnd - viewport.timeStart;
    const normalizedX = x / canvas.width;
    let time = viewport.timeStart + normalizedX * timeRange;

    if (editState.snapToGrid) {
      time = Math.round(time / editState.gridResolution) * editState.gridResolution;
    }

    return time;
  }, [viewport, editState]);

  const yToValue = useCallback((y: number, lane: AutomationLane): number => {
    const canvas = canvasRef.current;
    if (!canvas) return lane.defaultValue;

    const laneHeight = canvas.height / Math.max(lanes.length, 1);
    const laneIndex = lanes.findIndex(l => l.id === lane.id);
    const laneTop = laneIndex * laneHeight;

    const normalizedY = 1 - ((y - laneTop - laneHeight * 0.1) / (laneHeight * 0.8));
    return lane.minValue + normalizedY * (lane.maxValue - lane.minValue);
  }, [lanes, viewport]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    if (editState.snapToGrid) {
      drawGrid(ctx, width, height);
    }

    // Draw lanes
    lanes.forEach((lane, index) => {
      drawLane(ctx, lane, index, width, height);
    });

    // Draw playhead
    drawPlayhead(ctx, width, height);

    // Draw selection rectangle
    if (selection.isSelecting) {
      drawSelectionRect(ctx);
    }
  }, [lanes, viewport, selection, playheadPosition, editState]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const timeRange = viewport.timeEnd - viewport.timeStart;
    const gridSpacing = editState.gridResolution;
    const pixelsPerSecond = width / timeRange;

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical grid lines (time)
    for (let time = Math.ceil(viewport.timeStart / gridSpacing) * gridSpacing; time <= viewport.timeEnd; time += gridSpacing) {
      const x = timeToX(time);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal grid lines (per lane)
    const laneHeight = height / Math.max(lanes.length, 1);
    lanes.forEach((lane, index) => {
      const laneTop = index * laneHeight;
      const laneBottom = laneTop + laneHeight;

      // Lane separator
      ctx.strokeStyle = '#4b5563';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, laneBottom);
      ctx.lineTo(width, laneBottom);
      ctx.stroke();

      // Value grid lines
      ctx.strokeStyle = '#374151';
      ctx.setLineDash([1, 3]);
      for (let i = 1; i < 4; i++) {
        const y = laneTop + (laneHeight * i / 4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    });

    ctx.setLineDash([]);
  }, [viewport, editState, lanes, timeToX]);

  const drawLane = useCallback((ctx: CanvasRenderingContext2D, lane: AutomationLane, index: number, width: number, height: number) => {
    const laneHeight = height / Math.max(lanes.length, 1);
    const laneTop = index * laneHeight;

    // Lane background
    ctx.fillStyle = lane.id === selectedLane ? '#1f2937' : '#0f172a';
    ctx.fillRect(0, laneTop, width, laneHeight);

    if (!lane.visible || !lane.enabled) return;

    // Draw automation curve
    if (lane.points.length > 0) {
      ctx.strokeStyle = lane.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Draw interpolated curve
      const step = (viewport.timeEnd - viewport.timeStart) / width;
      for (let x = 0; x <= width; x++) {
        const time = viewport.timeStart + (x / width) * (viewport.timeEnd - viewport.timeStart);
        const value = automationSystem.getValueAtTime(lane.id, time);
        const y = valueToY(value, lane);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw points
      lane.points.forEach(point => {
        const x = timeToX(point.time);
        const y = valueToY(point.value, lane);

        if (x >= 0 && x <= width && y >= laneTop && y <= laneTop + laneHeight) {
          ctx.fillStyle = point.selected ? '#fbbf24' : lane.color;
          ctx.beginPath();
          ctx.arc(x, y, point.selected ? 6 : 4, 0, Math.PI * 2);
          ctx.fill();

          // Draw point outline
          ctx.strokeStyle = point.locked ? '#ef4444' : '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }

    // Lane info
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`${lane.name} (${lane.mode})`, 8, laneTop + 20);

    // Current value indicator
    const currentValue = automationSystem.getValueAtTime(lane.id, playheadPosition);
    const valueText = `${currentValue.toFixed(2)}${lane.unit || ''}`;
    ctx.fillText(valueText, 8, laneTop + laneHeight - 8);
  }, [lanes, selectedLane, viewport, automationSystem, playheadPosition, timeToX, valueToY]);

  const drawPlayhead = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const x = timeToX(playheadPosition);

    if (x >= 0 && x <= width) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(x - 6, 0);
      ctx.lineTo(x + 6, 0);
      ctx.lineTo(x, 12);
      ctx.closePath();
      ctx.fill();
    }
  }, [playheadPosition, timeToX]);

  const drawSelectionRect = useCallback((ctx: CanvasRenderingContext2D) => {
    const { startX, startY, currentX, currentY } = selection;
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);

    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
  }, [selection]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    switch (editState.tool) {
      case 'select':
        // Start selection
        setSelection(prev => ({
          ...prev,
          isSelecting: true,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y
        }));
        break;

      case 'draw':
        // Add point
        const time = xToTime(x);
        const laneIndex = Math.floor(y / (canvas.height / lanes.length));
        const lane = lanes[laneIndex];

        if (lane && lane.enabled && !lane.locked) {
          const value = yToValue(y, lane);
          automationSystem.addPoint(lane.id, {
            time,
            value,
            curve: 'linear'
          });
        }
        break;

      case 'erase':
        // Find and remove nearby point
        const eraseTime = xToTime(x);
        const eraseLaneIndex = Math.floor(y / (canvas.height / lanes.length));
        const eraseLane = lanes[eraseLaneIndex];

        if (eraseLane) {
          const nearbyPoint = eraseLane.points.find(point => {
            const pointX = timeToX(point.time);
            const pointY = valueToY(point.value, eraseLane);
            const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);
            return distance < 10;
          });

          if (nearbyPoint) {
            automationSystem.removePoint(eraseLane.id, nearbyPoint.id);
          }
        }
        break;
    }
  }, [editState.tool, lanes, xToTime, yToValue, timeToX, valueToY, automationSystem]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selection.isSelecting) {
      setSelection(prev => ({
        ...prev,
        currentX: x,
        currentY: y
      }));
    }
  }, [selection.isSelecting]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (selection.isSelecting) {
      // Complete selection
      const { startX, startY, currentX, currentY } = selection;
      const startTime = xToTime(Math.min(startX, currentX));
      const endTime = xToTime(Math.max(startX, currentX));

      // Select points in region
      lanes.forEach(lane => {
        const laneHeight = canvasRef.current!.height / lanes.length;
        const laneIndex = lanes.findIndex(l => l.id === lane.id);
        const laneTop = laneIndex * laneHeight;
        const laneBottom = laneTop + laneHeight;

        if (Math.max(startY, currentY) >= laneTop && Math.min(startY, currentY) <= laneBottom) {
          automationSystem.selectPointsInRegion(lane.id, startTime, endTime);
        }
      });

      setSelection(prev => ({
        ...prev,
        isSelecting: false
      }));
    }
  }, [selection, lanes, xToTime, automationSystem]);

  const handlePlayback = useCallback(async () => {
    if (isPlaying) {
      await automationSystem.stopPlayback();
      setIsPlaying(false);
    } else {
      await automationSystem.startPlayback();
      setIsPlaying(true);
    }
  }, [isPlaying, automationSystem]);

  const handleRecord = useCallback(async () => {
    if (selectedLane) {
      await automationSystem.startRecording([selectedLane]);
    } else {
      await automationSystem.startRecording();
    }
  }, [selectedLane, automationSystem]);

  const createNewLane = useCallback(async () => {
    if (!targetId) return;

    const lane = await automationSystem.createLane({
      name: `Lane ${lanes.length + 1}`,
      targetId,
      parameterId: 'volume',
      enabled: true,
      mode: 'read',
      color: '#3b82f6',
      visible: true,
      locked: false,
      height: 100,
      minValue: 0,
      maxValue: 1,
      defaultValue: 0.8,
      curve: { type: 'linear', tension: 0.5, bias: 0, continuity: 0 }
    });

    setSelectedLane(lane.id);
  }, [targetId, lanes.length, automationSystem]);

  const updateLaneMode = useCallback(async (laneId: string, mode: AutomationMode) => {
    await automationSystem.updateLane(laneId, { mode });
  }, [automationSystem]);

  const zoomIn = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.5, 10)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.5, 0.1)
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: 1,
      timeStart: timeRange[0],
      timeEnd: timeRange[1]
    }));
  }, [timeRange]);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-white text-xl font-semibold">Automation Editor</h2>
          <span className="text-gray-400 text-sm">
            {lanes.length} lane{lanes.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePlayback}
            className={`p-2 rounded-lg transition-colors ${
              isPlaying ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={handleRecord}
            className="p-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Activity className="w-4 h-4" />
          </button>

          <button
            onClick={() => automationSystem.setPlayheadPosition(0)}
            className="p-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">Tool:</span>
            {[
              { tool: 'select', icon: <MousePointer className="w-4 h-4" />, label: 'Select' },
              { tool: 'draw', icon: <Plus className="w-4 h-4" />, label: 'Draw' },
              { tool: 'erase', icon: <Minus className="w-4 h-4" />, label: 'Erase' },
              { tool: 'cut', icon: <Scissors className="w-4 h-4" />, label: 'Cut' }
            ].map(({ tool, icon, label }) => (
              <button
                key={tool}
                onClick={() => setEditState(prev => ({ ...prev, tool: tool as any }))}
                className={`p-2 rounded transition-colors ${
                  editState.tool === tool
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editState.snapToGrid}
                onChange={(e) => setEditState(prev => ({ ...prev, snapToGrid: e.target.checked }))}
                className="rounded"
              />
              <span className="text-gray-300 text-sm">Snap to Grid</span>
            </label>

            <select
              value={editState.gridResolution}
              onChange={(e) => setEditState(prev => ({ ...prev, gridResolution: parseFloat(e.target.value) }))}
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm border-none outline-none focus:bg-gray-600"
            >
              <option value={0.125}>1/8</option>
              <option value={0.25}>1/4</option>
              <option value={0.5}>1/2</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={createNewLane}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Add Lane
          </button>

          <button onClick={zoomOut} className="p-1 text-gray-400 hover:text-white">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={resetZoom} className="p-1 text-gray-400 hover:text-white">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={zoomIn} className="p-1 text-gray-400 hover:text-white">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lane Controls */}
      <div className="mb-4 space-y-2">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
              selectedLane === lane.id ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-750'
            }`}
            onClick={() => setSelectedLane(lane.id)}
          >
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: lane.color }}
            />

            <div className="flex-1 min-w-0">
              <div className="text-white font-medium truncate">{lane.name}</div>
              <div className="text-gray-400 text-xs">{lane.parameterId}</div>
            </div>

            <select
              value={lane.mode}
              onChange={(e) => updateLaneMode(lane.id, e.target.value as AutomationMode)}
              className="bg-gray-600 text-white px-2 py-1 rounded text-xs border-none outline-none focus:bg-gray-500"
              onClick={(e) => e.stopPropagation()}
            >
              {automationModes.map(({ mode, label }) => (
                <option key={mode} value={mode}>{label}</option>
              ))}
            </select>

            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  automationSystem.updateLane(lane.id, { visible: !lane.visible });
                }}
                className={`p-1 rounded transition-colors ${
                  lane.visible ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {lane.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  automationSystem.updateLane(lane.id, { locked: !lane.locked });
                }}
                className={`p-1 rounded transition-colors ${
                  lane.locked ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                {lane.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  automationSystem.deleteLane(lane.id);
                }}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="bg-gray-800 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full cursor-crosshair"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        />
      </div>

      {/* Time ruler */}
      <div className="mt-2 h-6 bg-gray-800 rounded flex items-center px-2">
        <div className="text-gray-400 text-xs font-mono">
          {viewport.timeStart.toFixed(2)}s - {viewport.timeEnd.toFixed(2)}s
        </div>
      </div>
    </div>
  );
};