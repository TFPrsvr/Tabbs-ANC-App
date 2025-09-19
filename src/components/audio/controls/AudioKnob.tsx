'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface AudioKnobProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'vintage' | 'modern' | 'minimal';
  label?: string;
  unit?: string;
  disabled?: boolean;
  bipolar?: boolean;
  logarithmic?: boolean;
  sensitivity?: number;
  showValue?: boolean;
  precision?: number;
  className?: string;
  onChangeStart?: () => void;
  onChangeEnd?: () => void;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
  xl: 'w-24 h-24'
};

const variantClasses = {
  default: 'bg-gradient-to-b from-gray-300 to-gray-500 border-gray-400',
  vintage: 'bg-gradient-to-b from-amber-200 to-amber-600 border-amber-500',
  modern: 'bg-gradient-to-b from-blue-400 to-blue-600 border-blue-500',
  minimal: 'bg-gradient-to-b from-gray-100 to-gray-300 border-gray-300'
};

export const AudioKnob: React.FC<AudioKnobProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  size = 'md',
  variant = 'default',
  label,
  unit,
  disabled = false,
  bipolar = false,
  logarithmic = false,
  sensitivity = 1,
  showValue = true,
  precision = 0,
  className,
  onChangeStart,
  onChangeEnd
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const knobRef = useRef<HTMLDivElement>(null);
  const lastMouseY = useRef<number>(0);

  const normalizeValue = useCallback((val: number): number => {
    return Math.max(min, Math.min(max, val));
  }, [min, max]);

  const valueToAngle = useCallback((val: number): number => {
    const normalizedValue = (val - min) / (max - min);
    const startAngle = -135; // Start at 7:30 position
    const endAngle = 135;   // End at 4:30 position
    const totalAngle = endAngle - startAngle;

    if (bipolar) {
      const midPoint = (min + max) / 2;
      if (val >= midPoint) {
        const ratio = (val - midPoint) / (max - midPoint);
        return ratio * (totalAngle / 2);
      } else {
        const ratio = (midPoint - val) / (midPoint - min);
        return -ratio * (totalAngle / 2);
      }
    } else {
      return startAngle + (normalizedValue * totalAngle);
    }
  }, [min, max, bipolar]);

  const angleToValue = useCallback((angle: number): number => {
    const startAngle = -135;
    const endAngle = 135;
    const totalAngle = endAngle - startAngle;

    let normalizedAngle = (angle - startAngle) / totalAngle;
    normalizedAngle = Math.max(0, Math.min(1, normalizedAngle));

    if (logarithmic) {
      // Logarithmic scaling
      const logMin = Math.log(Math.max(min, 0.001));
      const logMax = Math.log(max);
      const logValue = logMin + normalizedAngle * (logMax - logMin);
      return Math.exp(logValue);
    } else {
      return min + normalizedAngle * (max - min);
    }
  }, [min, max, logarithmic]);

  const formatValue = useCallback((val: number): string => {
    const formatted = val.toFixed(precision);
    return unit ? `${formatted}${unit}` : formatted;
  }, [precision, unit]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled) return;

    event.preventDefault();
    setIsDragging(true);
    lastMouseY.current = event.clientY;
    onChangeStart?.();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, onChangeStart]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;

    const deltaY = lastMouseY.current - event.clientY;
    const sensitivity = event.shiftKey ? 0.1 : 1;
    const valueRange = max - min;
    const stepSize = step * sensitivity;
    const pixelSensitivity = valueRange / 100; // 100 pixels for full range

    const deltaValue = deltaY * pixelSensitivity * sensitivity;
    const newValue = normalizeValue(value + deltaValue);

    // Snap to step increments
    const steppedValue = Math.round(newValue / stepSize) * stepSize;
    const finalValue = normalizeValue(steppedValue);

    onChange(finalValue);
    setDisplayValue(finalValue);
    lastMouseY.current = event.clientY;
  }, [isDragging, value, onChange, normalizeValue, max, min, step]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onChangeEnd?.();

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [onChangeEnd]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (disabled) return;

    event.preventDefault();
    const sensitivity = event.shiftKey ? 0.1 : 1;
    const direction = event.deltaY > 0 ? -1 : 1;
    const stepSize = step * sensitivity;
    const newValue = normalizeValue(value + (direction * stepSize));

    onChange(newValue);
    setDisplayValue(newValue);
  }, [disabled, value, onChange, normalizeValue, step]);

  const handleDoubleClick = useCallback(() => {
    if (disabled) return;

    const defaultValue = bipolar ? (min + max) / 2 : min;
    onChange(defaultValue);
    setDisplayValue(defaultValue);
  }, [disabled, bipolar, min, max, onChange]);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const angle = valueToAngle(displayValue);
  const isAtCenter = bipolar && Math.abs(displayValue - (min + max) / 2) < step / 2;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      {label && (
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        <div
          ref={knobRef}
          className={cn(
            'relative rounded-full border-2 cursor-pointer transition-all duration-150',
            'shadow-lg hover:shadow-xl',
            'select-none touch-none',
            sizeClasses[size],
            variantClasses[variant],
            disabled && 'opacity-50 cursor-not-allowed',
            isDragging && 'shadow-2xl scale-105',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
          )}
          style={{
            background: variant === 'modern'
              ? `conic-gradient(from 0deg, #3b82f6, #1d4ed8, #3b82f6)`
              : undefined
          }}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={displayValue}
          aria-label={label || 'Audio control knob'}
        >
          {/* Knob indicator */}
          <div
            className="absolute w-1 h-4 bg-white rounded-full shadow-sm"
            style={{
              top: '10%',
              left: '50%',
              transformOrigin: '50% 400%',
              transform: `translateX(-50%) rotate(${angle}deg)`
            }}
          />

          {/* Center dot for bipolar knobs */}
          {bipolar && (
            <div
              className={cn(
                'absolute w-1 h-1 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
                isAtCenter ? 'bg-green-400' : 'bg-gray-400'
              )}
            />
          )}

          {/* Value arc for modern variant */}
          {variant === 'modern' && (
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ transform: 'rotate(-135deg)' }}
            >
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
                strokeDasharray="1 4"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(angle + 135) * 0.785} 999`}
                className="transition-all duration-150"
              />
            </svg>
          )}
        </div>

        {/* Value display */}
        {showValue && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-1 rounded border">
              {formatValue(displayValue)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};