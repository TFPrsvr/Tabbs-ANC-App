'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export interface VUMeterProps {
  level: number; // 0-100 or -60 to 0 dB
  peak?: number;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'classic' | 'digital' | 'led' | 'professional' | 'broadcast';
  scale?: 'linear' | 'db' | 'vu';
  peakHold?: boolean;
  peakHoldTime?: number;
  showScale?: boolean;
  showNeedle?: boolean;
  ballistics?: 'fast' | 'medium' | 'slow' | 'vu';
  redlineThreshold?: number;
  yellowThreshold?: number;
  className?: string;
  label?: string;
  stereo?: boolean;
  leftLevel?: number;
  rightLevel?: number;
  onClip?: () => void;
}

const sizeClasses = {
  vertical: {
    sm: 'w-4 h-24',
    md: 'w-6 h-32',
    lg: 'w-8 h-48',
    xl: 'w-12 h-64'
  },
  horizontal: {
    sm: 'h-4 w-24',
    md: 'h-6 w-32',
    lg: 'h-8 w-48',
    xl: 'h-12 w-64'
  }
};

export const VUMeter: React.FC<VUMeterProps> = ({
  level,
  peak,
  orientation = 'vertical',
  size = 'md',
  variant = 'classic',
  scale = 'vu',
  peakHold = true,
  peakHoldTime = 2000,
  showScale = true,
  showNeedle = true,
  ballistics = 'vu',
  redlineThreshold = 90,
  yellowThreshold = 75,
  className,
  label,
  stereo = false,
  leftLevel,
  rightLevel,
  onClip
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [smoothedLevel, setSmoothedLevel] = useState(level);
  const [peakLevel, setPeakLevel] = useState(peak || level);
  const [peakTime, setPeakTime] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  // Ballistics constants
  const ballistic_constants = {
    fast: { attack: 0.1, release: 0.3 },
    medium: { attack: 0.2, release: 0.5 },
    slow: { attack: 0.3, release: 0.8 },
    vu: { attack: 0.1, release: 0.3 } // VU meter ballistics
  };

  // Convert level based on scale
  const convertLevel = useCallback((inputLevel: number): number => {
    switch (scale) {
      case 'db':
        // -60dB to 0dB range
        return Math.max(0, Math.min(100, ((inputLevel + 60) / 60) * 100));
      case 'linear':
        return Math.max(0, Math.min(100, inputLevel));
      case 'vu':
        // VU scale: -20 to +3 VU mapped to 0-100%
        return Math.max(0, Math.min(100, ((inputLevel + 20) / 23) * 100));
      default:
        return inputLevel;
    }
  }, [scale]);

  // Apply ballistics smoothing
  const applyBallistics = useCallback((currentLevel: number, targetLevel: number, deltaTime: number): number => {
    const ballistic = ballistic_constants[ballistics];
    const isAttack = targetLevel > currentLevel;
    const rate = isAttack ? ballistic.attack : ballistic.release;
    const timeConstant = rate * deltaTime / 16.67; // Normalize to 60fps

    return currentLevel + (targetLevel - currentLevel) * timeConstant;
  }, [ballistics]);

  // Update level with ballistics
  useEffect(() => {
    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastUpdateRef.current;
      if (deltaTime >= 16.67) { // ~60fps
        const targetLevel = convertLevel(level);
        const newSmoothedLevel = applyBallistics(smoothedLevel, targetLevel, deltaTime);
        setSmoothedLevel(newSmoothedLevel);

        // Update peak
        const currentPeak = peak !== undefined ? convertLevel(peak) : targetLevel;
        if (currentPeak > peakLevel || (timestamp - peakTime) > peakHoldTime) {
          setPeakLevel(currentPeak);
          setPeakTime(timestamp);
        }

        // Check for clipping
        if (newSmoothedLevel >= redlineThreshold && onClip) {
          onClip();
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
  }, [level, peak, smoothedLevel, peakLevel, peakTime, peakHoldTime, convertLevel, applyBallistics, redlineThreshold, onClip]);

  // Draw meter
  const drawMeter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    switch (variant) {
      case 'classic':
        drawClassicMeter(ctx, width, height);
        break;
      case 'digital':
        drawDigitalMeter(ctx, width, height);
        break;
      case 'led':
        drawLEDMeter(ctx, width, height);
        break;
      case 'professional':
        drawProfessionalMeter(ctx, width, height);
        break;
      case 'broadcast':
        drawBroadcastMeter(ctx, width, height);
        break;
      default:
        drawClassicMeter(ctx, width, height);
    }
  }, [variant, smoothedLevel, peakLevel, orientation, showScale, showNeedle, redlineThreshold, yellowThreshold, stereo, leftLevel, rightLevel]);

  // Classic analog VU meter
  const drawClassicMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (showNeedle) {
      // Draw analog needle meter
      const centerX = width / 2;
      const centerY = height - 20;
      const radius = Math.min(width, height) * 0.4;

      // Draw arc background
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, 0);
      ctx.stroke();

      // Draw scale markings
      if (showScale) {
        ctx.fillStyle = '#666';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';

        for (let i = 0; i <= 10; i++) {
          const angle = Math.PI + (i / 10) * Math.PI;
          const x1 = centerX + Math.cos(angle) * (radius - 10);
          const y1 = centerY + Math.sin(angle) * (radius - 10);
          const x2 = centerX + Math.cos(angle) * radius;
          const y2 = centerY + Math.sin(angle) * radius;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Scale labels
          const labelX = centerX + Math.cos(angle) * (radius + 15);
          const labelY = centerY + Math.sin(angle) * (radius + 15);
          const vuValue = -20 + (i / 10) * 23; // -20 to +3 VU
          ctx.fillText(vuValue.toString(), labelX, labelY);
        }
      }

      // Draw needle
      const needleAngle = Math.PI + (smoothedLevel / 100) * Math.PI;
      const needleLength = radius - 5;

      ctx.strokeStyle = smoothedLevel > redlineThreshold ? '#ff0000' : '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngle) * needleLength,
        centerY + Math.sin(needleAngle) * needleLength
      );
      ctx.stroke();

      // Needle pivot
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw bar meter
      drawBarMeter(ctx, width, height, 'classic');
    }
  }, [smoothedLevel, showScale, showNeedle, redlineThreshold]);

  // Digital bar meter
  const drawDigitalMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    drawBarMeter(ctx, width, height, 'digital');
  }, []);

  // LED segment meter
  const drawLEDMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const segments = 20;
    const segmentSpacing = 1;

    if (orientation === 'vertical') {
      const segmentHeight = (height - (segments - 1) * segmentSpacing) / segments;

      for (let i = 0; i < segments; i++) {
        const segmentLevel = ((segments - i) / segments) * 100;
        const y = i * (segmentHeight + segmentSpacing);

        let color = '#333';
        if (smoothedLevel >= segmentLevel) {
          if (segmentLevel > redlineThreshold) {
            color = '#ff0000';
          } else if (segmentLevel > yellowThreshold) {
            color = '#ffff00';
          } else {
            color = '#00ff00';
          }
        }

        ctx.fillStyle = color;
        ctx.fillRect(0, y, width, segmentHeight);

        // Peak indicator
        if (peakHold && Math.abs(peakLevel - segmentLevel) < (100 / segments)) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, y - 1, width, 2);
        }
      }
    } else {
      const segmentWidth = (width - (segments - 1) * segmentSpacing) / segments;

      for (let i = 0; i < segments; i++) {
        const segmentLevel = ((i + 1) / segments) * 100;
        const x = i * (segmentWidth + segmentSpacing);

        let color = '#333';
        if (smoothedLevel >= segmentLevel) {
          if (segmentLevel > redlineThreshold) {
            color = '#ff0000';
          } else if (segmentLevel > yellowThreshold) {
            color = '#ffff00';
          } else {
            color = '#00ff00';
          }
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, 0, segmentWidth, height);

        // Peak indicator
        if (peakHold && Math.abs(peakLevel - segmentLevel) < (100 / segments)) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - 1, 0, 2, height);
        }
      }
    }
  }, [smoothedLevel, peakLevel, peakHold, orientation, redlineThreshold, yellowThreshold]);

  // Professional meter
  const drawProfessionalMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Similar to LED but with more precise scale markings
    drawLEDMeter(ctx, width, height);

    // Add scale markings
    if (showScale) {
      ctx.fillStyle = '#fff';
      ctx.font = '8px sans-serif';

      const scaleValues = [-60, -40, -20, -10, -6, -3, 0];
      scaleValues.forEach(dbValue => {
        let position;
        if (scale === 'db') {
          position = ((dbValue + 60) / 60) * 100;
        } else {
          position = ((dbValue + 20) / 23) * 100;
        }

        if (orientation === 'vertical') {
          const y = height - (position / 100) * height;
          ctx.fillText(dbValue.toString(), width + 2, y + 2);
        } else {
          const x = (position / 100) * width;
          ctx.fillText(dbValue.toString(), x - 5, height + 10);
        }
      });
    }
  }, [showScale, scale, orientation]);

  // Broadcast meter
  const drawBroadcastMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // PPM-style meter with fast attack, slow release
    drawBarMeter(ctx, width, height, 'broadcast');

    // Add broadcast-specific markings
    if (showScale) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;

      // PPM scale markings
      const ppmMarks = [1, 2, 3, 4, 5, 6]; // PPM scale
      ppmMarks.forEach(mark => {
        const position = (mark / 6) * 100;

        if (orientation === 'vertical') {
          const y = height - (position / 100) * height;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        } else {
          const x = (position / 100) * width;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      });
    }
  }, [showScale, orientation]);

  // Generic bar meter
  const drawBarMeter = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, style: string) => {
    // Background
    ctx.fillStyle = style === 'digital' ? '#000' : '#333';
    ctx.fillRect(0, 0, width, height);

    if (stereo && leftLevel !== undefined && rightLevel !== undefined) {
      // Stereo meter
      const channelWidth = width / 2 - 1;

      // Left channel
      const leftHeight = (convertLevel(leftLevel) / 100) * height;
      const leftGradient = ctx.createLinearGradient(0, height, 0, 0);
      leftGradient.addColorStop(0, '#00ff00');
      leftGradient.addColorStop(0.7, '#ffff00');
      leftGradient.addColorStop(1, '#ff0000');
      ctx.fillStyle = leftGradient;
      ctx.fillRect(0, height - leftHeight, channelWidth, leftHeight);

      // Right channel
      const rightHeight = (convertLevel(rightLevel) / 100) * height;
      const rightGradient = ctx.createLinearGradient(0, height, 0, 0);
      rightGradient.addColorStop(0, '#00ff00');
      rightGradient.addColorStop(0.7, '#ffff00');
      rightGradient.addColorStop(1, '#ff0000');
      ctx.fillStyle = rightGradient;
      ctx.fillRect(channelWidth + 2, height - rightHeight, channelWidth, rightHeight);

    } else {
      // Mono meter
      if (orientation === 'vertical') {
        const meterHeight = (smoothedLevel / 100) * height;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(yellowThreshold / 100, '#ffff00');
        gradient.addColorStop(redlineThreshold / 100, '#ff0000');
        gradient.addColorStop(1, '#ff0000');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - meterHeight, width, meterHeight);

        // Peak indicator
        if (peakHold && peakLevel > smoothedLevel) {
          const peakY = height - (peakLevel / 100) * height;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, peakY - 1, width, 2);
        }

      } else {
        const meterWidth = (smoothedLevel / 100) * width;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(yellowThreshold / 100, '#ffff00');
        gradient.addColorStop(redlineThreshold / 100, '#ff0000');
        gradient.addColorStop(1, '#ff0000');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, meterWidth, height);

        // Peak indicator
        if (peakHold && peakLevel > smoothedLevel) {
          const peakX = (peakLevel / 100) * width;
          ctx.fillStyle = '#fff';
          ctx.fillRect(peakX - 1, 0, 2, height);
        }
      }
    }
  }, [smoothedLevel, peakLevel, peakHold, orientation, yellowThreshold, redlineThreshold, stereo, leftLevel, rightLevel, convertLevel]);

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

      <div className={cn(
        'relative bg-black rounded border border-gray-600',
        sizeClasses[orientation][size]
      )}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Clipping indicator */}
        {smoothedLevel >= redlineThreshold && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Numeric display */}
      <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
        {scale === 'db' ? `${(level - 60).toFixed(1)}dB` :
         scale === 'vu' ? `${(level - 20).toFixed(1)}VU` :
         `${level.toFixed(0)}%`}
      </div>
    </div>
  );
};