'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface TouchControlsProps {
  children: React.ReactNode;
  enableGestures?: boolean;
  enableHaptics?: boolean;
  sensitivity?: number;
  className?: string;
}

export interface TouchGestureState {
  isActive: boolean;
  type: 'pinch' | 'pan' | 'tap' | 'longPress' | 'swipe' | null;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  scale: number;
  velocity: { x: number; y: number };
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  children,
  enableGestures = true,
  enableHaptics = true,
  sensitivity = 1,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gestureState, setGestureState] = useState<TouchGestureState>({
    isActive: false,
    type: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    scale: 1,
    velocity: { x: 0, y: 0 }
  });

  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchTime = useRef<number>(0);
  const initialDistance = useRef<number>(0);
  const lastPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Haptic feedback
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || !('vibrate' in navigator)) return;

    const patterns = {
      light: 10,
      medium: 25,
      heavy: 50
    };

    navigator.vibrate(patterns[intensity]);
  }, [enableHaptics]);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touches: React.TouchList): number => {
    if (touches.length < 2) return 0;

    const touch1 = touches[0];
    const touch2 = touches[1];

    return Math.sqrt(
      Math.pow((touch2?.clientX ?? 0) - (touch1?.clientX ?? 0), 2) +
      Math.pow((touch2?.clientY ?? 0) - (touch1?.clientY ?? 0), 2)
    );
  }, []);

  // Get center point of multiple touches
  const getTouchCenter = useCallback((touches: React.TouchList): { x: number; y: number } => {
    let x = 0;
    let y = 0;

    for (let i = 0; i < touches.length; i++) {
      x += touches[i]?.clientX ?? 0;
      y += touches[i]?.clientY ?? 0;
    }

    return {
      x: x / touches.length,
      y: y / touches.length
    };
  }, []);

  // Calculate velocity
  const calculateVelocity = useCallback((
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
    timeMs: number
  ): { x: number; y: number } => {
    const deltaX = endPos.x - startPos.x;
    const deltaY = endPos.y - startPos.y;
    const timeSec = timeMs / 1000;

    return {
      x: deltaX / timeSec,
      y: deltaY / timeSec
    };
  }, []);

  // Determine swipe direction
  const getSwipeDirection = useCallback((
    deltaX: number,
    deltaY: number
  ): 'up' | 'down' | 'left' | 'right' | undefined => {
    const threshold = 30 * sensitivity;

    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
      return undefined;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }, [sensitivity]);

  // Touch start handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableGestures) return;

    const touches = e.touches;
    const now = Date.now();

    if (touches.length === 1) {
      const touch = touches[0];
      const position = { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };

      setGestureState({
        isActive: true,
        type: 'tap',
        startPosition: position,
        currentPosition: position,
        scale: 1,
        velocity: { x: 0, y: 0 }
      });

      lastPosition.current = position;
      lastTouchTime.current = now;

      // Set up long press detection
      gestureTimeoutRef.current = setTimeout(() => {
        setGestureState(prev => ({
          ...prev,
          type: 'longPress'
        }));
        triggerHaptic('medium');
      }, 500);

    } else if (touches.length === 2) {
      // Pinch gesture
      const center = getTouchCenter(touches);
      const distance = getTouchDistance(touches);

      initialDistance.current = distance;

      setGestureState({
        isActive: true,
        type: 'pinch',
        startPosition: center,
        currentPosition: center,
        scale: 1,
        velocity: { x: 0, y: 0 }
      });

      // Clear any existing timeout
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    }
  }, [enableGestures, getTouchCenter, getTouchDistance, triggerHaptic]);

  // Touch move handler
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableGestures || !gestureState.isActive) return;

    e.preventDefault(); // Prevent scrolling

    const touches = e.touches;
    const now = Date.now();

    if (touches.length === 1 && gestureState.type !== 'longPress') {
      const touch = touches[0];
      const currentPosition = { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };

      const deltaX = currentPosition.x - gestureState.startPosition.x;
      const deltaY = currentPosition.y - gestureState.startPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Convert tap to pan if moved enough
      if (distance > 10 * sensitivity && gestureState.type === 'tap') {
        setGestureState(prev => ({
          ...prev,
          type: 'pan',
          currentPosition
        }));

        if (gestureTimeoutRef.current) {
          clearTimeout(gestureTimeoutRef.current);
        }
      } else if (gestureState.type === 'pan') {
        const timeDelta = now - lastTouchTime.current;
        const velocity = calculateVelocity(lastPosition.current, currentPosition, timeDelta);

        setGestureState(prev => ({
          ...prev,
          currentPosition,
          velocity
        }));
      }

      lastPosition.current = currentPosition;
      lastTouchTime.current = now;

    } else if (touches.length === 2 && gestureState.type === 'pinch') {
      const center = getTouchCenter(touches);
      const distance = getTouchDistance(touches);
      const scale = distance / initialDistance.current;

      setGestureState(prev => ({
        ...prev,
        currentPosition: center,
        scale
      }));
    }
  }, [
    enableGestures, gestureState, sensitivity, calculateVelocity,
    getTouchCenter, getTouchDistance
  ]);

  // Touch end handler
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableGestures || !gestureState.isActive) return;

    const now = Date.now();
    const timeDelta = now - lastTouchTime.current;

    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }

    // Determine final gesture type
    if (gestureState.type === 'pan') {
      const deltaX = gestureState.currentPosition.x - gestureState.startPosition.x;
      const deltaY = gestureState.currentPosition.y - gestureState.startPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Check for swipe (fast movement)
      if (distance > 50 * sensitivity && timeDelta < 300) {
        const direction = getSwipeDirection(deltaX, deltaY);

        setGestureState(prev => ({
          ...prev,
          type: 'swipe',
          direction
        }));

        triggerHaptic('light');
      }
    } else if (gestureState.type === 'tap') {
      triggerHaptic('light');
    } else if (gestureState.type === 'pinch') {
      triggerHaptic('medium');
    }

    // Reset gesture state after a brief delay
    setTimeout(() => {
      setGestureState({
        isActive: false,
        type: null,
        startPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        scale: 1,
        velocity: { x: 0, y: 0 }
      });
    }, 100);
  }, [
    enableGestures, gestureState, sensitivity, getSwipeDirection, triggerHaptic
  ]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'touch-none select-none', // Disable default touch behaviors
        gestureState.isActive && 'cursor-grabbing',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}

      {/* Gesture feedback overlay */}
      {gestureState.isActive && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {gestureState.type === 'pinch' && (
            <div
              className="absolute w-2 h-2 bg-blue-500 rounded-full transform -translate-x-1 -translate-y-1"
              style={{
                left: gestureState.currentPosition.x,
                top: gestureState.currentPosition.y
              }}
            />
          )}

          {gestureState.type === 'longPress' && (
            <div
              className="absolute w-8 h-8 border-2 border-yellow-500 rounded-full animate-pulse transform -translate-x-4 -translate-y-4"
              style={{
                left: gestureState.startPosition.x,
                top: gestureState.startPosition.y
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Touch-optimized knob component
export interface TouchKnobProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  unit?: string;
  disabled?: boolean;
  sensitivity?: number;
  className?: string;
}

export const TouchKnob: React.FC<TouchKnobProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  size = 'md',
  label,
  unit,
  disabled = false,
  sensitivity = 1,
  className
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setStartY(touch?.clientY ?? 0);
    setStartValue(value);

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [disabled, value]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled) return;

    e.preventDefault();
    const touch = e.touches[0];
    const deltaY = startY - (touch?.clientY ?? 0); // Inverted for natural feel
    const range = max - min;
    const pixelsPerValue = 200 / range; // 200 pixels for full range
    const deltaValue = (deltaY / pixelsPerValue) * sensitivity;

    const newValue = Math.max(min, Math.min(max, startValue + deltaValue));
    const steppedValue = Math.round(newValue / step) * step;

    onChange(steppedValue);
  }, [isDragging, disabled, startY, startValue, min, max, step, sensitivity, onChange]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const angle = ((value - min) / (max - min)) * 270 - 135; // -135° to 135°

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {label && (
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
          {label}
        </label>
      )}

      <div
        className={cn(
          'relative rounded-full border-4 border-gray-300 dark:border-gray-600',
          'bg-gradient-to-b from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-900',
          'shadow-lg touch-none',
          sizeClasses[size],
          disabled ? 'opacity-50' : 'active:scale-95',
          isDragging && 'scale-105 shadow-xl'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Knob indicator */}
        <div
          className="absolute w-1 h-4 bg-blue-500 rounded-full shadow-md"
          style={{
            top: '10%',
            left: '50%',
            transformOrigin: '50% 350%',
            transform: `translateX(-50%) rotate(${angle}deg)`
          }}
        />

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-gray-600 rounded-full transform -translate-x-1 -translate-y-1" />
      </div>

      {/* Value display */}
      <div className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border">
        {value.toFixed(step < 1 ? 2 : 0)}{unit}
      </div>
    </div>
  );
};

// Touch-optimized fader component
export interface TouchFaderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

export const TouchFader: React.FC<TouchFaderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  orientation = 'vertical',
  size = 'md',
  label,
  unit,
  disabled = false,
  className
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const sizeClasses = {
    vertical: {
      sm: 'w-8 h-24',
      md: 'w-10 h-32',
      lg: 'w-12 h-40'
    },
    horizontal: {
      sm: 'h-8 w-24',
      md: 'h-10 w-32',
      lg: 'h-12 w-40'
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    e.preventDefault();
    setIsDragging(true);

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled) return;

    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();

    let position: number;
    if (orientation === 'vertical') {
      position = (rect.bottom - (touch?.clientY ?? 0)) / rect.height;
    } else {
      position = ((touch?.clientX ?? 0) - rect.left) / rect.width;
    }

    position = Math.max(0, Math.min(1, position));
    const newValue = min + position * (max - min);
    const steppedValue = Math.round(newValue / step) * step;

    onChange(Math.max(min, Math.min(max, steppedValue)));
  }, [isDragging, disabled, orientation, min, max, step, onChange]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const position = (value - min) / (max - min);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {label && (
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
          {label}
        </label>
      )}

      <div
        className={cn(
          'relative bg-gray-300 dark:bg-gray-600 rounded-full shadow-inner touch-none',
          sizeClasses[orientation][size],
          disabled ? 'opacity-50' : '',
          isDragging && 'shadow-lg'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Track fill */}
        <div
          className={cn(
            'absolute bg-blue-500 rounded-full',
            orientation === 'vertical'
              ? 'left-1 right-1 bottom-1'
              : 'top-1 bottom-1 left-1'
          )}
          style={{
            [orientation === 'vertical' ? 'height' : 'width']: `${position * 100}%`
          }}
        />

        {/* Handle */}
        <div
          className={cn(
            'absolute bg-white border-2 border-gray-400 rounded-full shadow-md',
            orientation === 'vertical'
              ? 'w-full h-6 left-0 transform -translate-y-1/2'
              : 'h-full w-6 top-0 transform -translate-x-1/2',
            isDragging && 'scale-110 border-blue-500'
          )}
          style={{
            [orientation === 'vertical' ? 'bottom' : 'left']: `${position * 100}%`
          }}
        />
      </div>

      {/* Value display */}
      <div className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border">
        {value.toFixed(step < 1 ? 2 : 0)}{unit}
      </div>
    </div>
  );
};