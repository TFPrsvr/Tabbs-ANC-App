'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export interface LUFSMeterProps {
  momentaryLUFS: number; // -70 to +5 LUFS
  shortTermLUFS: number;
  integratedLUFS: number;
  truePeak?: number; // dBTP
  range?: number; // LRA (Loudness Range)
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  standard?: 'ebu_r128' | 'atsc_a85' | 'arib_tr_b32' | 'free_tv' | 'streaming';
  showTarget?: boolean;
  showTolerance?: boolean;
  showNumeric?: boolean;
  showRange?: boolean;
  className?: string;
  label?: string;
  onComplianceChange?: (compliant: boolean) => void;
}

const sizeClasses = {
  vertical: {
    sm: 'w-8 h-40',
    md: 'w-10 h-56',
    lg: 'w-12 h-72',
    xl: 'w-16 h-96'
  },
  horizontal: {
    sm: 'h-8 w-40',
    md: 'h-10 w-56',
    lg: 'h-12 w-72',
    xl: 'h-16 w-96'
  }
};

// Broadcast standards
const lufsStandards = {
  ebu_r128: {
    name: 'EBU R128',
    target: -23,
    tolerance: 1.0,
    maxTruePeak: -1,
    maxRange: 20,
    gateThreshold: -70
  },
  atsc_a85: {
    name: 'ATSC A/85',
    target: -24,
    tolerance: 2.0,
    maxTruePeak: -2,
    maxRange: 15,
    gateThreshold: -70
  },
  arib_tr_b32: {
    name: 'ARIB TR-B32',
    target: -24,
    tolerance: 1.0,
    maxTruePeak: -1,
    maxRange: 18,
    gateThreshold: -70
  },
  free_tv: {
    name: 'Free TV OP-59',
    target: -24,
    tolerance: 2.0,
    maxTruePeak: -2,
    maxRange: 15,
    gateThreshold: -70
  },
  streaming: {
    name: 'Streaming',
    target: -16, // Common for Spotify, Apple Music
    tolerance: 1.0,
    maxTruePeak: -1,
    maxRange: 12,
    gateThreshold: -70
  }
};

export const LUFSMeter: React.FC<LUFSMeterProps> = ({
  momentaryLUFS,
  shortTermLUFS,
  integratedLUFS,
  truePeak = 0,
  range = 0,
  orientation = 'vertical',
  size = 'md',
  standard = 'ebu_r128',
  showTarget = true,
  showTolerance = true,
  showNumeric = true,
  showRange = true,
  className,
  label,
  onComplianceChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compliance, setCompliance] = useState(true);
  const animationFrameRef = useRef<number>();

  const standardConfig = lufsStandards[standard];

  // Check compliance
  const checkCompliance = useCallback(() => {
    const targetRange = [
      standardConfig.target - standardConfig.tolerance,
      standardConfig.target + standardConfig.tolerance
    ];

    const lufsCompliant = integratedLUFS >= targetRange[0] && integratedLUFS <= targetRange[1];
    const peakCompliant = truePeak <= standardConfig.maxTruePeak;
    const rangeCompliant = range <= standardConfig.maxRange;

    const isCompliant = lufsCompliant && peakCompliant && rangeCompliant;

    if (isCompliant !== compliance) {
      setCompliance(isCompliant);
      onComplianceChange?.(isCompliant);
    }
  }, [integratedLUFS, truePeak, range, standardConfig, compliance, onComplianceChange]);

  // Convert LUFS to display position (0-100%)
  const lufsToPercent = useCallback((lufs: number): number => {
    const minLUFS = -70;
    const maxLUFS = 5;
    return Math.max(0, Math.min(100, ((lufs - minLUFS) / (maxLUFS - minLUFS)) * 100));
  }, []);

  // Draw meter
  const drawMeter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    if (orientation === 'vertical') {
      drawVerticalMeter(ctx, width, height);
    } else {
      drawHorizontalMeter(ctx, width, height);
    }

    // Draw scale
    drawScale(ctx, width, height);

    // Draw target and tolerance zones
    if (showTarget) {
      drawTargetZone(ctx, width, height);
    }

  }, [momentaryLUFS, shortTermLUFS, integratedLUFS, orientation, showTarget, showTolerance, standardConfig, lufsToPercent]);

  // Draw vertical meter
  const drawVerticalMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const meterWidth = Math.floor(width / 3) - 4;
    const spacing = 2;

    // Momentary LUFS (leftmost)
    drawLUFSBar(ctx, spacing, 0, meterWidth, height, momentaryLUFS, '#00ff00', 'M');

    // Short-term LUFS (center)
    drawLUFSBar(ctx, meterWidth + spacing * 2, 0, meterWidth, height, shortTermLUFS, '#ffff00', 'S');

    // Integrated LUFS (rightmost)
    drawLUFSBar(ctx, (meterWidth + spacing) * 2, 0, meterWidth, height, integratedLUFS, '#ff6600', 'I');

  }, [momentaryLUFS, shortTermLUFS, integratedLUFS, lufsToPercent]);

  // Draw horizontal meter
  const drawHorizontalMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const meterHeight = Math.floor(height / 3) - 4;
    const spacing = 2;

    // Momentary LUFS (top)
    drawLUFSBar(ctx, 0, spacing, width, meterHeight, momentaryLUFS, '#00ff00', 'M', true);

    // Short-term LUFS (center)
    drawLUFSBar(ctx, 0, meterHeight + spacing * 2, width, meterHeight, shortTermLUFS, '#ffff00', 'S', true);

    // Integrated LUFS (bottom)
    drawLUFSBar(ctx, 0, (meterHeight + spacing) * 2, width, meterHeight, integratedLUFS, '#ff6600', 'I', true);

  }, [momentaryLUFS, shortTermLUFS, integratedLUFS, lufsToPercent]);

  // Draw individual LUFS bar
  const drawLUFSBar = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    lufsValue: number,
    color: string,
    label: string,
    horizontal = false
  ) => {
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, h);

    // Level bar
    const percent = lufsToPercent(lufsValue);

    if (horizontal) {
      const barWidth = (percent / 100) * w;

      // Create gradient
      const gradient = ctx.createLinearGradient(x, y, x + w, y);
      gradient.addColorStop(0, '#004400');
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, '#ff0000');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, h);
    } else {
      const barHeight = (percent / 100) * h;

      // Create gradient
      const gradient = ctx.createLinearGradient(x, y + h, x, y);
      gradient.addColorStop(0, '#004400');
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, '#ff0000');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y + h - barHeight, w, barHeight);
    }

    // Border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    if (horizontal) {
      ctx.fillText(label, x + w/2, y + h/2 + 3);
    } else {
      ctx.fillText(label, x + w/2, y + h - 5);
    }

  }, [lufsToPercent]);

  // Draw scale markings
  const drawScale = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const scaleValues = [-60, -50, -40, -30, -20, -15, -10, -5, 0];

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ccc';
    ctx.font = '8px sans-serif';

    scaleValues.forEach(lufs => {
      const percent = lufsToPercent(lufs);

      if (orientation === 'vertical') {
        const y = height - (percent / 100) * height;

        // Scale line
        ctx.beginPath();
        ctx.moveTo(width - 20, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // Scale label
        ctx.textAlign = 'right';
        ctx.fillText(lufs.toString(), width - 22, y + 2);
      } else {
        const x = (percent / 100) * width;

        // Scale line
        ctx.beginPath();
        ctx.moveTo(x, height - 20);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Scale label
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x, height - 22);
        ctx.rotate(-Math.PI/2);
        ctx.fillText(lufs.toString(), 0, 0);
        ctx.restore();
      }
    });
  }, [orientation, lufsToPercent]);

  // Draw target zone
  const drawTargetZone = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const target = standardConfig.target;
    const tolerance = standardConfig.tolerance;

    const targetPercent = lufsToPercent(target);
    const upperPercent = lufsToPercent(target + tolerance);
    const lowerPercent = lufsToPercent(target - tolerance);

    // Target line
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    if (orientation === 'vertical') {
      const targetY = height - (targetPercent / 100) * height;
      ctx.beginPath();
      ctx.moveTo(0, targetY);
      ctx.lineTo(width - 25, targetY);
      ctx.stroke();

      // Tolerance zone
      if (showTolerance) {
        const upperY = height - (upperPercent / 100) * height;
        const lowerY = height - (lowerPercent / 100) * height;

        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.fillRect(0, upperY, width - 25, lowerY - upperY);

        // Tolerance lines
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        ctx.beginPath();
        ctx.moveTo(0, upperY);
        ctx.lineTo(width - 25, upperY);
        ctx.moveTo(0, lowerY);
        ctx.lineTo(width - 25, lowerY);
        ctx.stroke();

        ctx.setLineDash([]);
      }
    } else {
      const targetX = (targetPercent / 100) * width;
      ctx.beginPath();
      ctx.moveTo(targetX, 0);
      ctx.lineTo(targetX, height - 25);
      ctx.stroke();

      // Tolerance zone
      if (showTolerance) {
        const upperX = (upperPercent / 100) * width;
        const lowerX = (lowerPercent / 100) * width;

        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.fillRect(lowerX, 0, upperX - lowerX, height - 25);

        // Tolerance lines
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        ctx.beginPath();
        ctx.moveTo(upperX, 0);
        ctx.lineTo(upperX, height - 25);
        ctx.moveTo(lowerX, 0);
        ctx.lineTo(lowerX, height - 25);
        ctx.stroke();

        ctx.setLineDash([]);
      }
    }
  }, [orientation, standardConfig, showTolerance, lufsToPercent]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawMeter();
      checkCompliance();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawMeter, checkCompliance]);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, [size]);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {label && (
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className={cn(
          'relative bg-black rounded border',
          compliance ? 'border-green-500' : 'border-red-500',
          sizeClasses[orientation][size]
        )}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Compliance indicator */}
          <div className={cn(
            'absolute -top-1 -right-1 w-3 h-3 rounded-full',
            compliance ? 'bg-green-500' : 'bg-red-500 animate-pulse'
          )} />
        </div>
      </div>

      {/* Standard indicator */}
      <div className="text-xs font-mono text-gray-500">
        {standardConfig.name}
      </div>

      {/* Numeric display */}
      {showNumeric && (
        <div className="text-xs font-mono space-y-1">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-gray-500">M</div>
              <div className={cn(
                momentaryLUFS > standardConfig.target + standardConfig.tolerance ? 'text-red-500' :
                momentaryLUFS < standardConfig.target - standardConfig.tolerance ? 'text-yellow-500' :
                'text-green-500'
              )}>
                {momentaryLUFS.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">S</div>
              <div className={cn(
                shortTermLUFS > standardConfig.target + standardConfig.tolerance ? 'text-red-500' :
                shortTermLUFS < standardConfig.target - standardConfig.tolerance ? 'text-yellow-500' :
                'text-green-500'
              )}>
                {shortTermLUFS.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">I</div>
              <div className={cn(
                integratedLUFS > standardConfig.target + standardConfig.tolerance ? 'text-red-500' :
                integratedLUFS < standardConfig.target - standardConfig.tolerance ? 'text-yellow-500' :
                'text-green-500'
              )}>
                {integratedLUFS.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Target and True Peak */}
          <div className="text-center space-y-1">
            <div className="text-gray-500 text-xs">
              Target: {standardConfig.target} LUFS ±{standardConfig.tolerance}
            </div>
            <div className={cn(
              'text-xs',
              truePeak > standardConfig.maxTruePeak ? 'text-red-500' : 'text-green-500'
            )}>
              True Peak: {truePeak.toFixed(1)} dBTP
            </div>
            {showRange && (
              <div className={cn(
                'text-xs',
                range > standardConfig.maxRange ? 'text-red-500' : 'text-green-500'
              )}>
                Range: {range.toFixed(1)} LU
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};