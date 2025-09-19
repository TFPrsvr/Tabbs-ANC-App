'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface AudioButtonProps {
  onClick: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  children?: React.ReactNode;
  variant?: 'default' | 'toggle' | 'momentary' | 'led' | 'transport' | 'record';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'square' | 'round' | 'rectangular';
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  ledColor?: 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple';
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  haptic?: boolean;
}

const sizeClasses = {
  sm: {
    square: 'w-8 h-8 text-xs',
    round: 'w-8 h-8 text-xs',
    rectangular: 'w-12 h-8 text-xs px-2'
  },
  md: {
    square: 'w-10 h-10 text-sm',
    round: 'w-10 h-10 text-sm',
    rectangular: 'w-16 h-10 text-sm px-3'
  },
  lg: {
    square: 'w-12 h-12 text-base',
    round: 'w-12 h-12 text-base',
    rectangular: 'w-20 h-12 text-base px-4'
  }
};

const shapeClasses = {
  square: 'rounded-lg',
  round: 'rounded-full',
  rectangular: 'rounded-lg'
};

const variantClasses = {
  default: {
    base: 'bg-gradient-to-b from-gray-200 to-gray-400 border-gray-500 text-gray-800 shadow-md',
    active: 'from-gray-300 to-gray-500 shadow-inner',
    hover: 'from-gray-250 to-gray-450'
  },
  toggle: {
    base: 'bg-gradient-to-b from-gray-200 to-gray-400 border-gray-500 text-gray-800 shadow-md',
    active: 'from-blue-400 to-blue-600 border-blue-700 text-white shadow-inner',
    hover: 'from-gray-250 to-gray-450'
  },
  momentary: {
    base: 'bg-gradient-to-b from-gray-200 to-gray-400 border-gray-500 text-gray-800 shadow-md',
    active: 'from-gray-400 to-gray-600 shadow-inner scale-95',
    hover: 'from-gray-250 to-gray-450'
  },
  led: {
    base: 'bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700 text-gray-300 shadow-md',
    active: 'shadow-inner',
    hover: 'from-gray-750 to-gray-850'
  },
  transport: {
    base: 'bg-gradient-to-b from-gray-300 to-gray-500 border-gray-600 text-gray-800 shadow-md',
    active: 'from-green-400 to-green-600 border-green-700 text-white shadow-inner',
    hover: 'from-gray-350 to-gray-550'
  },
  record: {
    base: 'bg-gradient-to-b from-gray-300 to-gray-500 border-gray-600 text-gray-800 shadow-md',
    active: 'from-red-500 to-red-700 border-red-800 text-white shadow-inner',
    hover: 'from-gray-350 to-gray-550'
  }
};

const ledColors = {
  red: 'bg-red-500 shadow-red-500/50',
  green: 'bg-green-500 shadow-green-500/50',
  blue: 'bg-blue-500 shadow-blue-500/50',
  yellow: 'bg-yellow-500 shadow-yellow-500/50',
  orange: 'bg-orange-500 shadow-orange-500/50',
  purple: 'bg-purple-500 shadow-purple-500/50'
};

export const AudioButton: React.FC<AudioButtonProps> = ({
  onClick,
  onMouseDown,
  onMouseUp,
  children,
  variant = 'default',
  size = 'md',
  shape = 'square',
  active = false,
  disabled = false,
  loading = false,
  ledColor = 'green',
  label,
  icon,
  className,
  haptic = false
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const triggerHapticFeedback = useCallback(() => {
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
  }, [haptic]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled || loading) return;

    event.preventDefault();
    setIsPressed(true);
    triggerHapticFeedback();
    onMouseDown?.();

    const handleMouseUp = () => {
      setIsPressed(false);
      onMouseUp?.();
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, loading, onMouseDown, onMouseUp, triggerHapticFeedback]);

  const handleClick = useCallback(() => {
    if (disabled || loading) return;
    onClick();
  }, [disabled, loading, onClick]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const buttonVariant = variantClasses[variant];
  const isActive = variant === 'momentary' ? isPressed : active;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className={cn(
          'relative border-2 font-medium transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
          'select-none touch-none',
          'flex items-center justify-center',
          sizeClasses[size][shape],
          shapeClasses[shape],
          buttonVariant.base,
          isActive && buttonVariant.active,
          !disabled && !loading && `hover:${buttonVariant.hover}`,
          disabled && 'opacity-50 cursor-not-allowed',
          loading && 'cursor-wait',
          isPressed && variant === 'momentary' && 'transform',
          className
        )}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
        type="button"
        aria-pressed={variant === 'toggle' ? active : undefined}
        aria-label={label}
      >
        {/* LED indicator */}
        {variant === 'led' && (
          <div className="absolute -top-1 -right-1">
            <div
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-150',
                isActive
                  ? cn(ledColors[ledColor], 'shadow-lg animate-pulse')
                  : 'bg-gray-600'
              )}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex items-center justify-center gap-1">
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {icon}
              {children}
            </>
          )}
        </div>

        {/* Transport/Record pulse effect */}
        {(variant === 'transport' || variant === 'record') && isActive && (
          <div className="absolute inset-0 rounded-inherit">
            <div
              className={cn(
                'absolute inset-0 rounded-inherit animate-ping',
                variant === 'transport' ? 'bg-green-400' : 'bg-red-400',
                'opacity-30'
              )}
            />
          </div>
        )}

        {/* Pressed state overlay */}
        {isPressed && (
          <div className="absolute inset-0 bg-black bg-opacity-10 rounded-inherit" />
        )}
      </button>

      {/* Label */}
      {label && (
        <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
          {label}
        </span>
      )}
    </div>
  );
};

// Common transport control buttons
export const PlayButton: React.FC<Omit<AudioButtonProps, 'variant' | 'children'>> = (props) => (
  <AudioButton {...props} variant="transport" label="Play">
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  </AudioButton>
);

export const PauseButton: React.FC<Omit<AudioButtonProps, 'variant' | 'children'>> = (props) => (
  <AudioButton {...props} variant="toggle" label="Pause">
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  </AudioButton>
);

export const StopButton: React.FC<Omit<AudioButtonProps, 'variant' | 'children'>> = (props) => (
  <AudioButton {...props} variant="momentary" label="Stop">
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z" />
    </svg>
  </AudioButton>
);

export const RecordButton: React.FC<Omit<AudioButtonProps, 'variant' | 'children'>> = (props) => (
  <AudioButton {...props} variant="record" label="Record" shape="round">
    <div className="w-3 h-3 bg-current rounded-full" />
  </AudioButton>
);

export const MuteButton: React.FC<Omit<AudioButtonProps, 'variant' | 'children'>> = (props) => (
  <AudioButton {...props} variant="toggle" label="Mute">
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      {props.active ? (
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      ) : (
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      )}
    </svg>
  </AudioButton>
);

export const SoloButton: React.FC<Omit<AudioButtonProps, 'variant' | 'children'>> = (props) => (
  <AudioButton {...props} variant="toggle" label="Solo">
    <span className="font-bold text-xs">S</span>
  </AudioButton>
);