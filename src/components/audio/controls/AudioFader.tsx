'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface AudioFaderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pro' | 'vintage' | 'modern';
  label?: string;
  unit?: string;
  disabled?: boolean;
  logarithmic?: boolean;
  detentValue?: number;
  showValue?: boolean;
  showScale?: boolean;
  precision?: number;
  motorized?: boolean;
  className?: string;
  onChangeStart?: () => void;
  onChangeEnd?: () => void;
}

const sizeClasses = {
  vertical: {
    sm: 'w-8 h-32',
    md: 'w-10 h-40',
    lg: 'w-12 h-48'
  },
  horizontal: {
    sm: 'h-8 w-32',
    md: 'h-10 w-40',
    lg: 'h-12 w-48'
  }
};

const trackClasses = {
  default: 'bg-gray-300 dark:bg-gray-600',
  pro: 'bg-gradient-to-b from-gray-400 to-gray-600',
  vintage: 'bg-gradient-to-b from-amber-200 to-amber-400',
  modern: 'bg-gradient-to-b from-blue-200 to-blue-400'
};

const handleClasses = {
  default: 'bg-gradient-to-b from-gray-200 to-gray-400 border-gray-500',
  pro: 'bg-gradient-to-b from-gray-100 to-gray-300 border-gray-600',
  vintage: 'bg-gradient-to-b from-amber-100 to-amber-300 border-amber-600',
  modern: 'bg-gradient-to-b from-blue-100 to-blue-300 border-blue-600'
};

export const AudioFader: React.FC<AudioFaderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  orientation = 'vertical',
  size = 'md',
  variant = 'default',
  label,
  unit,
  disabled = false,
  logarithmic = false,
  detentValue,
  showValue = true,
  showScale = false,
  precision = 0,
  motorized = false,
  className,
  onChangeStart,
  onChangeEnd
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [isMotorizing, setIsMotorizing] = useState(false);
  const faderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const normalizeValue = useCallback((val: number): number => {
    return Math.max(min, Math.min(max, val));
  }, [min, max]);

  const valueToPosition = useCallback((val: number): number => {
    let normalizedValue;

    if (logarithmic) {
      const logMin = Math.log(Math.max(min, 0.001));
      const logMax = Math.log(max);
      const logVal = Math.log(Math.max(val, 0.001));
      normalizedValue = (logVal - logMin) / (logMax - logMin);
    } else {
      normalizedValue = (val - min) / (max - min);
    }

    // For vertical faders, invert the position (0 at bottom)
    return orientation === 'vertical' ? 1 - normalizedValue : normalizedValue;
  }, [min, max, logarithmic, orientation]);

  const positionToValue = useCallback((position: number): number => {
    // For vertical faders, invert the position
    const normalizedPosition = orientation === 'vertical' ? 1 - position : position;

    if (logarithmic) {
      const logMin = Math.log(Math.max(min, 0.001));
      const logMax = Math.log(max);
      const logValue = logMin + normalizedPosition * (logMax - logMin);
      return Math.exp(logValue);
    } else {
      return min + normalizedPosition * (max - min);
    }
  }, [min, max, logarithmic, orientation]);

  const formatValue = useCallback((val: number): string => {
    const formatted = val.toFixed(precision);
    return unit ? `${formatted}${unit}` : formatted;
  }, [precision, unit]);

  const getPositionFromEvent = useCallback((event: MouseEvent | React.MouseEvent, rect: DOMRect): number => {
    if (orientation === 'vertical') {
      return (event.clientY - rect.top) / rect.height;
    } else {
      return (event.clientX - rect.left) / rect.width;
    }
  }, [orientation]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled) return;

    event.preventDefault();
    setIsDragging(true);
    lastPosition.current = { x: event.clientX, y: event.clientY };
    onChangeStart?.();

    // Check if clicking on track (jump to position)
    if (event.target === trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const position = getPositionFromEvent(event, rect);
      const newValue = normalizeValue(positionToValue(position));

      // Snap to step increments
      const steppedValue = Math.round(newValue / step) * step;
      const finalValue = normalizeValue(steppedValue);

      onChange(finalValue);
      setDisplayValue(finalValue);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, onChangeStart, getPositionFromEvent, positionToValue, normalizeValue, step, onChange]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const position = getPositionFromEvent(event, rect);
    const clampedPosition = Math.max(0, Math.min(1, position));

    let newValue = positionToValue(clampedPosition);

    // Apply detent behavior
    if (detentValue !== undefined) {
      const detentRange = (max - min) * 0.02; // 2% of range
      if (Math.abs(newValue - detentValue) < detentRange) {
        newValue = detentValue;
      }
    }

    // Snap to step increments
    const steppedValue = Math.round(newValue / step) * step;
    const finalValue = normalizeValue(steppedValue);

    onChange(finalValue);
    setDisplayValue(finalValue);
  }, [isDragging, getPositionFromEvent, positionToValue, detentValue, max, min, step, normalizeValue, onChange]);

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

    const defaultValue = detentValue !== undefined ? detentValue : (min + max) / 2;

    if (motorized) {
      setIsMotorizing(true);
      // Animate to position
      const startValue = displayValue;
      const endValue = defaultValue;
      const duration = 300;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        const currentValue = startValue + (endValue - startValue) * easeProgress;
        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsMotorizing(false);
          onChange(endValue);
        }
      };

      requestAnimationFrame(animate);
    } else {
      onChange(defaultValue);
      setDisplayValue(defaultValue);
    }
  }, [disabled, detentValue, min, max, motorized, displayValue, onChange]);

  useEffect(() => {
    if (!isMotorizing) {
      setDisplayValue(value);
    }
  }, [value, isMotorizing]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handlePosition = valueToPosition(displayValue);
  const isAtDetent = detentValue !== undefined && Math.abs(displayValue - detentValue) < step / 2;

  // Generate scale marks
  const scaleMarks = showScale ? Array.from({ length: 11 }, (_, i) => {
    const markValue = min + (max - min) * (i / 10);
    const position = valueToPosition(markValue);
    return { value: markValue, position };
  }) : [];

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      {/* Scale */}
      {showScale && orientation === 'vertical' && (
        <div className="relative h-full w-8 flex flex-col justify-between text-xs text-gray-500">
          {scaleMarks.reverse().map((mark, index) => (
            <div
              key={index}
              className="text-right leading-none"
              style={{
                position: 'absolute',
                top: `${mark.position * 100}%`,
                transform: 'translateY(-50%)'
              }}
            >
              {formatValue(mark.value)}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {label && (
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}

        <div className="relative">
          {/* Track */}
          <div
            ref={trackRef}
            className={cn(
              'relative rounded-lg border shadow-inner cursor-pointer',
              'transition-all duration-150',
              sizeClasses[orientation][size],
              trackClasses[variant],
              disabled && 'opacity-50 cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
            )}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            tabIndex={disabled ? -1 : 0}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={displayValue}
            aria-label={label || 'Audio fader'}
            aria-orientation={orientation}
          >
            {/* Value indicator track */}
            <div
              className={cn(
                'absolute bg-blue-500 bg-opacity-30 rounded',
                orientation === 'vertical'
                  ? 'left-1 right-1 bottom-1'
                  : 'top-1 bottom-1 left-1'
              )}
              style={{
                [orientation === 'vertical' ? 'height' : 'width']: `${(1 - handlePosition) * 100}%`
              }}
            />

            {/* Scale marks on track */}
            {showScale && (
              <div className="absolute inset-0">
                {scaleMarks.map((mark, index) => (
                  <div
                    key={index}
                    className="absolute w-2 h-0.5 bg-gray-600 bg-opacity-50"
                    style={orientation === 'vertical' ? {
                      top: `${mark.position * 100}%`,
                      right: '2px',
                      transform: 'translateY(-50%)'
                    } : {
                      left: `${mark.position * 100}%`,
                      bottom: '2px',
                      transform: 'translateX(-50%)'
                    }}
                  />
                ))}
              </div>
            )}

            {/* Handle */}
            <div
              className={cn(
                'absolute border-2 rounded shadow-lg cursor-grab active:cursor-grabbing',
                'transition-all duration-150',
                handleClasses[variant],
                orientation === 'vertical' ? 'w-full h-6 left-0' : 'h-full w-6 top-0',
                isDragging && 'shadow-xl scale-105',
                isMotorizing && 'transition-all duration-300 ease-out',
                isAtDetent && 'bg-green-200 border-green-500'
              )}
              style={orientation === 'vertical' ? {
                top: `${handlePosition * 100}%`,
                transform: 'translateY(-50%)'
              } : {
                left: `${handlePosition * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {/* Handle grip lines */}
              <div className={cn(
                'absolute inset-0 flex items-center justify-center',
                orientation === 'vertical' ? 'flex-col' : 'flex-row'
              )}>
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'bg-gray-600 opacity-60',
                      orientation === 'vertical' ? 'w-3 h-0.5 my-0.5' : 'h-3 w-0.5 mx-0.5'
                    )}
                  />
                ))}
              </div>

              {/* Motorized indicator */}
              {motorized && isMotorizing && (
                <div className="absolute inset-0 rounded bg-blue-400 bg-opacity-30 animate-pulse" />
              )}
            </div>

            {/* Detent indicator */}
            {detentValue !== undefined && (
              <div
                className="absolute w-1 h-1 bg-green-400 rounded-full"
                style={orientation === 'vertical' ? {
                  top: `${valueToPosition(detentValue) * 100}%`,
                  right: '1px',
                  transform: 'translateY(-50%)'
                } : {
                  left: `${valueToPosition(detentValue) * 100}%`,
                  bottom: '1px',
                  transform: 'translateX(-50%)'
                }}
              />
            )}
          </div>

          {/* Value display */}
          {showValue && (
            <div className={cn(
              'absolute text-xs font-mono text-gray-600 dark:text-gray-400',
              'bg-white dark:bg-gray-800 px-1 rounded border whitespace-nowrap',
              orientation === 'vertical'
                ? '-right-12 top-1/2 transform -translate-y-1/2'
                : '-bottom-6 left-1/2 transform -translate-x-1/2'
            )}>
              {formatValue(displayValue)}
            </div>
          )}
        </div>
      </div>

      {/* Horizontal scale */}
      {showScale && orientation === 'horizontal' && (
        <div className="relative w-full h-6 flex justify-between text-xs text-gray-500">
          {scaleMarks.map((mark, index) => (
            <div
              key={index}
              className="text-center leading-none"
              style={{
                position: 'absolute',
                left: `${mark.position * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {formatValue(mark.value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};