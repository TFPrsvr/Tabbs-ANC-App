'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export interface PPMMeterProps {
  level: number; // Input level (typically -60 to +20 dB)
  peak?: number;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'bbc' | 'iec1' | 'iec2' | 'din' | 'nordic';
  stereo?: boolean;
  leftLevel?: number;
  rightLevel?: number;
  showScale?: boolean;
  showNumeric?: boolean;
  peakHold?: boolean;
  peakHoldTime?: number;
  className?: string;
  label?: string;
  onOverload?: () => void;
}

const sizeClasses = {
  vertical: {
    sm: 'w-6 h-32',
    md: 'w-8 h-48',
    lg: 'w-10 h-64',
    xl: 'w-12 h-80'
  },
  horizontal: {
    sm: 'h-6 w-32',
    md: 'h-8 w-48',
    lg: 'h-10 w-64',
    xl: 'h-12 w-80'
  }
};

// PPM standards and their characteristics
const ppmStandards = {
  bbc: {
    name: 'BBC',
    scale: [-12, -8, -4, 0, 2, 4, 6], // PPM scale
    overloadThreshold: 6,
    integrationTime: 10, // ms
    fallbackTime: 2800, // ms
    segments: 21
  },
  iec1: {
    name: 'IEC I',
    scale: [-50, -40, -30, -20, -16, -12, -8, -4, 0],
    overloadThreshold: 0,
    integrationTime: 10,
    fallbackTime: 1700,
    segments: 25
  },
  iec2: {
    name: 'IEC II',
    scale: [-42, -36, -30, -24, -18, -12, -6, 0],
    overloadThreshold: 0,
    integrationTime: 5,
    fallbackTime: 2800,
    segments: 21
  },
  din: {
    name: 'DIN',
    scale: [-50, -40, -30, -20, -10, -5, 0, 5],
    overloadThreshold: 5,
    integrationTime: 5,
    fallbackTime: 1500,
    segments: 28
  },
  nordic: {
    name: 'Nordic',
    scale: [-36, -30, -24, -18, -12, -9, -6, -3, 0],
    overloadThreshold: 0,
    integrationTime: 5,
    fallbackTime: 3000,
    segments: 18
  }
};

export const PPMMeter: React.FC<PPMMeterProps> = ({
  level,
  peak,
  orientation = 'vertical',
  size = 'md',
  variant = 'bbc',
  stereo = false,
  leftLevel,
  rightLevel,
  showScale = true,
  showNumeric = true,
  peakHold = true,
  peakHoldTime = 3000,
  className,
  label,
  onOverload
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayLevel, setDisplayLevel] = useState(level);
  const [peakLevel, setPeakLevel] = useState(peak || level);
  const [peakTime, setPeakTime] = useState(0);
  const [overloadDetected, setOverloadDetected] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  const standard = ppmStandards[variant];

  // Convert dB to percentage for display
  const dbToPercent = useCallback((db: number): number => {
    const minDb = standard.scale[0];
    const maxDb = standard.scale[standard.scale.length - 1];
    return Math.max(0, Math.min(100, ((db - minDb) / (maxDb - minDb)) * 100));
  }, [standard]);

  // PPM ballistics - fast attack, slow release
  const applyPPMBallistics = useCallback((currentLevel: number, targetLevel: number, deltaTime: number): number => {
    if (targetLevel > currentLevel) {
      // Fast attack - quasi-instantaneous
      return targetLevel;
    } else {
      // Slow release according to standard
      const fallbackRate = 1000 / standard.fallbackTime; // per second
      const decrease = fallbackRate * (deltaTime / 1000) * 100; // Convert to percentage
      return Math.max(targetLevel, currentLevel - decrease);
    }
  }, [standard]);

  // Animation loop
  useEffect(() => {
    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastUpdateRef.current;

      if (deltaTime >= 16.67) { // ~60fps
        const targetLevel = dbToPercent(level);
        const newDisplayLevel = applyPPMBallistics(displayLevel, targetLevel, deltaTime);
        setDisplayLevel(newDisplayLevel);

        // Update peak
        const currentPeak = peak !== undefined ? dbToPercent(peak) : targetLevel;
        if (currentPeak > peakLevel || (timestamp - peakTime) > peakHoldTime) {
          setPeakLevel(currentPeak);
          setPeakTime(timestamp);
        }

        // Check for overload
        const overloadDb = standard.overloadThreshold;
        if (level >= overloadDb) {
          if (!overloadDetected) {
            setOverloadDetected(true);
            onOverload?.();
          }
        } else if (level < overloadDb - 3) { // 3dB hysteresis
          setOverloadDetected(false);
        }

        lastUpdateRef.current = timestamp;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [level, peak, displayLevel, peakLevel, peakTime, peakHoldTime, dbToPercent, applyPPMBallistics, standard, overloadDetected, onOverload]);

  // Draw meter
  const drawMeter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (stereo && leftLevel !== undefined && rightLevel !== undefined) {
      drawStereoMeter(ctx, width, height);
    } else {
      drawMonoMeter(ctx, width, height);
    }

    if (showScale) {
      drawScale(ctx, width, height);
    }
  }, [displayLevel, peakLevel, peakHold, orientation, stereo, leftLevel, rightLevel, showScale, standard]);

  // Draw mono meter
  const drawMonoMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const segments = standard.segments;
    const segmentSpacing = 1;

    if (orientation === 'vertical') {
      const segmentHeight = (height - (segments - 1) * segmentSpacing) / segments;

      for (let i = 0; i < segments; i++) {
        const segmentLevel = ((segments - i) / segments) * 100;
        const y = i * (segmentHeight + segmentSpacing);

        // Determine segment color based on level and standard
        let color = getSegmentColor(segmentLevel, displayLevel >= segmentLevel);

        ctx.fillStyle = color;
        ctx.fillRect(0, y, width, segmentHeight);

        // Add segment separators
        if (i > 0) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, y - segmentSpacing, width, segmentSpacing);
        }
      }

      // Peak indicator
      if (peakHold && peakLevel > displayLevel) {
        const peakY = height - (peakLevel / 100) * height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, peakY - 1, width, 2);
      }

    } else {
      const segmentWidth = (width - (segments - 1) * segmentSpacing) / segments;

      for (let i = 0; i < segments; i++) {
        const segmentLevel = ((i + 1) / segments) * 100;
        const x = i * (segmentWidth + segmentSpacing);

        let color = getSegmentColor(segmentLevel, displayLevel >= segmentLevel);

        ctx.fillStyle = color;
        ctx.fillRect(x, 0, segmentWidth, height);

        // Add segment separators
        if (i > 0) {
          ctx.fillStyle = '#000';
          ctx.fillRect(x - segmentSpacing, 0, segmentSpacing, height);
        }
      }

      // Peak indicator
      if (peakHold && peakLevel > displayLevel) {
        const peakX = (peakLevel / 100) * width;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(peakX - 1, 0, 2, height);
      }
    }
  }, [displayLevel, peakLevel, peakHold, orientation, standard]);

  // Draw stereo meter
  const drawStereoMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const leftDisplayLevel = dbToPercent(leftLevel || 0);
    const rightDisplayLevel = dbToPercent(rightLevel || 0);

    if (orientation === 'vertical') {
      const channelWidth = (width - 2) / 2;

      // Left channel
      drawChannelBar(ctx, 0, 0, channelWidth, height, leftDisplayLevel, 'L');

      // Right channel
      drawChannelBar(ctx, channelWidth + 2, 0, channelWidth, height, rightDisplayLevel, 'R');

    } else {
      const channelHeight = (height - 2) / 2;

      // Left channel (top)
      drawChannelBar(ctx, 0, 0, width, channelHeight, leftDisplayLevel, 'L');

      // Right channel (bottom)
      drawChannelBar(ctx, 0, channelHeight + 2, width, channelHeight, rightDisplayLevel, 'R');
    }
  }, [leftLevel, rightLevel, orientation, dbToPercent]);

  // Draw individual channel bar
  const drawChannelBar = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    level: number,
    channel: string
  ) => {
    const segments = Math.floor(standard.segments / 2);
    const segmentSpacing = 1;

    if (orientation === 'vertical') {
      const segmentHeight = (h - (segments - 1) * segmentSpacing) / segments;

      for (let i = 0; i < segments; i++) {
        const segmentLevel = ((segments - i) / segments) * 100;
        const segY = y + i * (segmentHeight + segmentSpacing);

        let color = getSegmentColor(segmentLevel, level >= segmentLevel);

        ctx.fillStyle = color;
        ctx.fillRect(x, segY, w, segmentHeight);
      }
    } else {
      const segmentWidth = (w - (segments - 1) * segmentSpacing) / segments;

      for (let i = 0; i < segments; i++) {
        const segmentLevel = ((i + 1) / segments) * 100;
        const segX = x + i * (segmentWidth + segmentSpacing);

        let color = getSegmentColor(segmentLevel, level >= segmentLevel);

        ctx.fillStyle = color;
        ctx.fillRect(segX, y, segmentWidth, h);
      }
    }

    // Channel label
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(channel, x + w/2, y + h/2);
  }, [orientation, standard]);

  // Get segment color based on level and standard
  const getSegmentColor = useCallback((segmentLevel: number, isLit: boolean): string => {
    if (!isLit) return '#222';

    // Convert back to dB for threshold checking
    const minDb = standard.scale[0];
    const maxDb = standard.scale[standard.scale.length - 1];
    const segmentDb = minDb + (segmentLevel / 100) * (maxDb - minDb);

    // Color coding based on standard
    switch (variant) {
      case 'bbc':
        if (segmentDb >= 6) return '#ff0000'; // Red above PPM 6
        if (segmentDb >= 4) return '#ffff00'; // Yellow at PPM 4-6
        if (segmentDb >= 0) return '#00ff00'; // Green at PPM 0-4
        return '#00aa00'; // Dark green below PPM 0

      case 'iec1':
      case 'iec2':
        if (segmentDb >= -3) return '#ff0000'; // Red above -3dB
        if (segmentDb >= -6) return '#ffff00'; // Yellow at -6 to -3dB
        if (segmentDb >= -12) return '#00ff00'; // Green at -12 to -6dB
        return '#00aa00'; // Dark green below -12dB

      case 'din':
        if (segmentDb >= 0) return '#ff0000'; // Red above 0dB
        if (segmentDb >= -6) return '#ffff00'; // Yellow at -6 to 0dB
        if (segmentDb >= -18) return '#00ff00'; // Green at -18 to -6dB
        return '#00aa00'; // Dark green below -18dB

      case 'nordic':
        if (segmentDb >= -3) return '#ff0000'; // Red above -3dB
        if (segmentDb >= -9) return '#ffff00'; // Yellow at -9 to -3dB
        if (segmentDb >= -18) return '#00ff00'; // Green at -18 to -9dB
        return '#00aa00'; // Dark green below -18dB

      default:
        return '#00ff00';
    }
  }, [standard, variant]);

  // Draw scale markings
  const drawScale = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#ccc';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';

    standard.scale.forEach(dbValue => {
      const position = dbToPercent(dbValue);

      if (orientation === 'vertical') {
        const y = height - (position / 100) * height;

        // Scale line
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(stereo ? width/2 - 10 : width - 10, y);
        ctx.lineTo(stereo ? width/2 + 10 : width, y);
        ctx.stroke();

        // Scale label
        const labelX = stereo ? width/2 + 12 : width + 2;
        ctx.fillText(dbValue.toString(), labelX, y + 2);
      } else {
        const x = (position / 100) * width;

        // Scale line
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, stereo ? height/2 - 10 : height - 10);
        ctx.lineTo(x, stereo ? height/2 + 10 : height);
        ctx.stroke();

        // Scale label
        const labelY = stereo ? height/2 + 20 : height + 12;
        ctx.save();
        ctx.translate(x, labelY);
        ctx.rotate(-Math.PI/2);
        ctx.fillText(dbValue.toString(), 0, 0);
        ctx.restore();
      }
    });
  }, [standard, orientation, stereo, dbToPercent]);

  // Update canvas when meter changes
  useEffect(() => {
    drawMeter();
  }, [drawMeter]);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, [size]);

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      {label && (
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className={cn(
          'relative bg-black rounded border border-gray-600',
          sizeClasses[orientation][size]
        )}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Overload indicator */}
          {overloadDetected && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="w-3 h-3 bg-red-500 rounded animate-pulse" />
            </div>
          )}
        </div>

        {/* Scale display */}
        {showScale && orientation === 'vertical' && (
          <div className="flex flex-col justify-between h-full text-xs text-gray-500">
            {standard.scale.slice().reverse().map((value, index) => (
              <div key={index} className="leading-none">
                {value > 0 ? `+${value}` : value}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standard indicator */}
      <div className="text-xs font-mono text-gray-500">
        {standard.name}
      </div>

      {/* Numeric display */}
      {showNumeric && (
        <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {stereo ? (
            <div className="flex gap-2">
              <span>L: {(leftLevel || 0).toFixed(1)}dB</span>
              <span>R: {(rightLevel || 0).toFixed(1)}dB</span>
            </div>
          ) : (
            <span>{level.toFixed(1)}dB</span>
          )}
        </div>
      )}
    </div>
  );
};