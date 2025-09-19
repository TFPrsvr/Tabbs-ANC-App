'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface AudioSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: 'default' | 'toggle' | 'rocker' | 'slide' | 'flip';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  label?: string;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple';
  animated?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: {
    switch: 'w-8 h-5',
    thumb: 'w-3 h-3',
    rocker: 'w-6 h-8',
    slide: 'w-10 h-6'
  },
  md: {
    switch: 'w-10 h-6',
    thumb: 'w-4 h-4',
    rocker: 'w-8 h-10',
    slide: 'w-12 h-7'
  },
  lg: {
    switch: 'w-12 h-7',
    thumb: 'w-5 h-5',
    rocker: 'w-10 h-12',
    slide: 'w-14 h-8'
  }
};

const colorClasses = {
  blue: 'bg-blue-500 shadow-blue-500/30',
  green: 'bg-green-500 shadow-green-500/30',
  red: 'bg-red-500 shadow-red-500/30',
  orange: 'bg-orange-500 shadow-orange-500/30',
  purple: 'bg-purple-500 shadow-purple-500/30'
};

export const AudioSwitch: React.FC<AudioSwitchProps> = ({
  checked,
  onChange,
  variant = 'default',
  size = 'md',
  disabled = false,
  label,
  labelPosition = 'top',
  color = 'blue',
  animated = true,
  className
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;
    onChange(!checked);
  }, [disabled, checked, onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const handleMouseDown = useCallback(() => {
    if (disabled) return;
    setIsPressed(true);
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const renderSwitch = () => {
    switch (variant) {
      case 'toggle':
        return (
          <div
            className={cn(
              'relative inline-flex items-center rounded-full border-2 cursor-pointer transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
              sizeClasses[size].switch,
              checked
                ? cn('border-current shadow-lg', colorClasses[color])
                : 'bg-gray-300 border-gray-400',
              disabled && 'opacity-50 cursor-not-allowed',
              isPressed && 'scale-95',
              animated && 'transition-all duration-200'
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            tabIndex={disabled ? -1 : 0}
            role="switch"
            aria-checked={checked}
            aria-label={label}
          >
            <div
              className={cn(
                'absolute rounded-full bg-white shadow-md transition-all duration-200',
                'border border-gray-300',
                sizeClasses[size].thumb,
                checked
                  ? 'translate-x-full transform'
                  : 'translate-x-0.5 transform'
              )}
              style={{
                left: checked ? 'auto' : '2px',
                right: checked ? '2px' : 'auto'
              }}
            />
          </div>
        );

      case 'rocker':
        return (
          <div
            className={cn(
              'relative rounded-lg border-2 border-gray-400 bg-gradient-to-b from-gray-200 to-gray-400',
              'cursor-pointer shadow-md overflow-hidden',
              sizeClasses[size].rocker,
              disabled && 'opacity-50 cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="switch"
            aria-checked={checked}
            aria-label={label}
          >
            {/* Rocker plate */}
            <div
              className={cn(
                'absolute inset-1 rounded bg-gradient-to-b transition-all duration-200',
                'shadow-inner',
                checked
                  ? 'from-gray-400 to-gray-200 transform origin-bottom -rotate-12'
                  : 'from-gray-200 to-gray-400 transform origin-top rotate-12'
              )}
            />

            {/* ON/OFF labels */}
            <div className="absolute inset-0 flex flex-col justify-between items-center py-1 text-xs font-bold text-gray-700">
              <span className={cn('transition-opacity duration-200', checked ? 'opacity-100' : 'opacity-30')}>
                ON
              </span>
              <span className={cn('transition-opacity duration-200', !checked ? 'opacity-100' : 'opacity-30')}>
                OFF
              </span>
            </div>
          </div>
        );

      case 'slide':
        return (
          <div
            className={cn(
              'relative rounded-lg border-2 bg-gray-300 cursor-pointer shadow-inner',
              'transition-all duration-200',
              sizeClasses[size].slide,
              checked ? cn('border-current', colorClasses[color]) : 'border-gray-400',
              disabled && 'opacity-50 cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="switch"
            aria-checked={checked}
            aria-label={label}
          >
            {/* Track */}
            <div className="absolute inset-1 rounded bg-gray-200 shadow-inner" />

            {/* Slider */}
            <div
              className={cn(
                'absolute top-1 bottom-1 w-6 rounded shadow-md transition-all duration-300',
                'bg-gradient-to-b from-white to-gray-100 border border-gray-300',
                checked
                  ? 'right-1 transform translate-x-0'
                  : 'left-1 transform translate-x-0'
              )}
            >
              {/* Grip lines */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="space-y-0.5">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="w-2 h-0.5 bg-gray-400 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'flip':
        return (
          <div
            className={cn(
              'relative cursor-pointer perspective-1000',
              sizeClasses[size].switch,
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="switch"
            aria-checked={checked}
            aria-label={label}
          >
            <div
              className={cn(
                'relative w-full h-full transition-transform duration-500 transform-style-preserve-3d',
                checked && 'rotate-y-180'
              )}
            >
              {/* Front face (OFF) */}
              <div
                className={cn(
                  'absolute inset-0 rounded-lg border-2 border-gray-400 backface-hidden',
                  'bg-gradient-to-b from-gray-200 to-gray-400 shadow-md',
                  'flex items-center justify-center text-xs font-bold text-gray-700'
                )}
              >
                OFF
              </div>

              {/* Back face (ON) */}
              <div
                className={cn(
                  'absolute inset-0 rounded-lg border-2 backface-hidden rotate-y-180',
                  'shadow-md flex items-center justify-center text-xs font-bold text-white',
                  cn('border-current', colorClasses[color])
                )}
              >
                ON
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div
            className={cn(
              'relative inline-flex items-center rounded-full border-2 cursor-pointer',
              'transition-all duration-200 shadow-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
              sizeClasses[size].switch,
              checked
                ? cn('border-current shadow-lg', colorClasses[color])
                : 'bg-gray-300 border-gray-400',
              disabled && 'opacity-50 cursor-not-allowed',
              isPressed && 'scale-95'
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            tabIndex={disabled ? -1 : 0}
            role="switch"
            aria-checked={checked}
            aria-label={label}
          >
            <div
              className={cn(
                'absolute rounded-full bg-white shadow-lg transition-all duration-200',
                'border border-gray-200',
                sizeClasses[size].thumb,
                checked
                  ? 'translate-x-full transform'
                  : 'translate-x-0.5 transform'
              )}
              style={{
                left: checked ? 'auto' : '2px',
                right: checked ? '2px' : 'auto'
              }}
            />
          </div>
        );
    }
  };

  const labelElement = label && (
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
      {label}
    </span>
  );

  const switchElement = (
    <div className={cn('inline-flex', className)}>
      {renderSwitch()}
    </div>
  );

  if (!label) {
    return switchElement;
  }

  // Layout with label
  const layouts = {
    top: 'flex flex-col items-center gap-2',
    bottom: 'flex flex-col-reverse items-center gap-2',
    left: 'flex items-center gap-3',
    right: 'flex flex-row-reverse items-center gap-3'
  };

  return (
    <div className={cn(layouts[labelPosition], className)}>
      {labelElement}
      {switchElement}
    </div>
  );
};

// Specialized audio switches
export const BypassSwitch: React.FC<Omit<AudioSwitchProps, 'label' | 'color'>> = (props) => (
  <AudioSwitch {...props} label="Bypass" color="orange" />
);

export const PowerSwitch: React.FC<Omit<AudioSwitchProps, 'label' | 'color' | 'variant'>> = (props) => (
  <AudioSwitch {...props} label="Power" color="green" variant="rocker" />
);

export const PolaritySwitch: React.FC<Omit<AudioSwitchProps, 'label' | 'color'>> = (props) => (
  <AudioSwitch {...props} label="Polarity" color="red" />
);

export const PhantomSwitch: React.FC<Omit<AudioSwitchProps, 'label' | 'color'>> = (props) => (
  <AudioSwitch {...props} label="+48V" color="red" />
);

export const HighPassSwitch: React.FC<Omit<AudioSwitchProps, 'label' | 'color'>> = (props) => (
  <AudioSwitch {...props} label="Hi-Cut" color="blue" />
);