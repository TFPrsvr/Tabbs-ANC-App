'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface AccessibleControlProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

// Accessible Audio Knob with ARIA support
export const AccessibleAudioKnob: React.FC<AccessibleControlProps> = ({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  description,
  disabled = false,
  required = false,
  error,
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [announceValue, setAnnounceValue] = useState('');
  const knobRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  const formatValue = useCallback((val: number): string => {
    const formatted = val.toFixed(step < 1 ? 2 : 0);
    return unit ? `${formatted} ${unit}` : formatted;
  }, [step, unit]);

  const announceChange = useCallback((newValue: number) => {
    const announcement = `${label}: ${formatValue(newValue)}`;
    setAnnounceValue(announcement);

    // Clear announcement after screen reader reads it
    setTimeout(() => setAnnounceValue(''), 1000);
  }, [label, formatValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    let newValue = value;
    const largeStep = step * 10;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        e.preventDefault();
        newValue = Math.min(max, value + (e.shiftKey ? largeStep : step));
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        e.preventDefault();
        newValue = Math.max(min, value - (e.shiftKey ? largeStep : step));
        break;
      case 'Home':
        e.preventDefault();
        newValue = min;
        break;
      case 'End':
        e.preventDefault();
        newValue = max;
        break;
      case 'PageUp':
        e.preventDefault();
        newValue = Math.min(max, value + largeStep);
        break;
      case 'PageDown':
        e.preventDefault();
        newValue = Math.max(min, value - largeStep);
        break;
      default:
        return;
    }

    onChange(newValue);
    announceChange(newValue);
  }, [disabled, value, min, max, step, onChange, announceChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    announceChange(value);
  }, [value, announceChange]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const angle = ((value - min) / (max - min)) * 270 - 135;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Label */}
      <label
        htmlFor={id}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>

      {/* Knob container */}
      <div className="relative">
        <div
          ref={knobRef}
          id={id}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatValue(value)}
          aria-label={`${label}${description ? `. ${description}` : ''}`}
          aria-invalid={!!error}
          aria-describedby={description ? `${id}-description` : undefined}
          className={cn(
            'relative w-16 h-16 rounded-full border-4 cursor-pointer',
            'bg-gradient-to-b from-gray-200 to-gray-400 border-gray-500',
            'focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50',
            'transition-all duration-150',
            disabled && 'opacity-50 cursor-not-allowed',
            isFocused && 'ring-4 ring-blue-500 ring-opacity-50',
            error && 'border-red-500',
            'shadow-lg hover:shadow-xl'
          )}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {/* Knob indicator */}
          <div
            className="absolute w-1 h-4 bg-blue-500 rounded-full shadow-sm"
            style={{
              top: '10%',
              left: '50%',
              transformOrigin: '50% 400%',
              transform: `translateX(-50%) rotate(${angle}deg)`
            }}
          />

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-gray-600 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Value display */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border">
            {formatValue(value)}
          </span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div id={`${id}-description`} className="text-xs text-gray-500 text-center max-w-32">
          {description}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-600 text-center" role="alert">
          {error}
        </div>
      )}

      {/* Live region for announcements */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {announceValue}
      </div>

      {/* Usage instructions (visible on focus) */}
      {isFocused && (
        <div className="absolute top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg z-10 max-w-48">
          <div>Use arrow keys to adjust</div>
          <div>Hold Shift for large steps</div>
          <div>Home/End for min/max</div>
          <div>Page Up/Down for large steps</div>
        </div>
      )}
    </div>
  );
};

// Accessible Audio Fader with ARIA support
export const AccessibleAudioFader: React.FC<AccessibleControlProps> = ({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  description,
  disabled = false,
  required = false,
  error,
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [announceValue, setAnnounceValue] = useState('');
  const faderRef = useRef<HTMLDivElement>(null);

  const formatValue = useCallback((val: number): string => {
    const formatted = val.toFixed(step < 1 ? 2 : 0);
    return unit ? `${formatted} ${unit}` : formatted;
  }, [step, unit]);

  const announceChange = useCallback((newValue: number) => {
    const announcement = `${label}: ${formatValue(newValue)}`;
    setAnnounceValue(announcement);
    setTimeout(() => setAnnounceValue(''), 1000);
  }, [label, formatValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    let newValue = value;
    const largeStep = step * 10;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newValue = Math.min(max, value + (e.shiftKey ? largeStep : step));
        break;
      case 'ArrowDown':
        e.preventDefault();
        newValue = Math.max(min, value - (e.shiftKey ? largeStep : step));
        break;
      case 'Home':
        e.preventDefault();
        newValue = min;
        break;
      case 'End':
        e.preventDefault();
        newValue = max;
        break;
      case 'PageUp':
        e.preventDefault();
        newValue = Math.min(max, value + largeStep);
        break;
      case 'PageDown':
        e.preventDefault();
        newValue = Math.max(min, value - largeStep);
        break;
      default:
        return;
    }

    onChange(newValue);
    announceChange(newValue);
  }, [disabled, value, min, max, step, onChange, announceChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    announceChange(value);
  }, [value, announceChange]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const position = (value - min) / (max - min);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Label */}
      <label
        htmlFor={id}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>

      {/* Fader container */}
      <div className="relative">
        <div
          ref={faderRef}
          id={id}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatValue(value)}
          aria-label={`${label}${description ? `. ${description}` : ''}`}
          aria-invalid={!!error}
          aria-describedby={description ? `${id}-description` : undefined}
          aria-orientation="vertical"
          className={cn(
            'relative w-10 h-40 bg-gray-300 dark:bg-gray-600 rounded-lg shadow-inner cursor-pointer',
            'focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50',
            'transition-all duration-150',
            disabled && 'opacity-50 cursor-not-allowed',
            isFocused && 'ring-4 ring-blue-500 ring-opacity-50',
            error && 'border-2 border-red-500'
          )}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {/* Track fill */}
          <div
            className="absolute left-1 right-1 bottom-1 bg-blue-500 rounded"
            style={{ height: `${position * 100}%` }}
          />

          {/* Handle */}
          <div
            className={cn(
              'absolute w-full h-6 bg-white border-2 border-gray-400 rounded shadow-md',
              'left-0 transform -translate-y-1/2',
              isFocused && 'border-blue-500 shadow-lg'
            )}
            style={{ bottom: `${position * 100}%` }}
          >
            {/* Handle grip lines */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="w-4 h-0.5 bg-gray-600 my-0.5" />
              ))}
            </div>
          </div>
        </div>

        {/* Value display */}
        <div className="absolute -right-12 top-1/2 transform -translate-y-1/2">
          <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border">
            {formatValue(value)}
          </span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div id={`${id}-description`} className="text-xs text-gray-500 text-center max-w-32">
          {description}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-600 text-center" role="alert">
          {error}
        </div>
      )}

      {/* Live region for announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announceValue}
      </div>

      {/* Usage instructions (visible on focus) */}
      {isFocused && (
        <div className="absolute left-full ml-2 top-0 p-2 bg-black text-white text-xs rounded shadow-lg z-10 max-w-48">
          <div>↑↓ arrows to adjust</div>
          <div>Hold Shift for large steps</div>
          <div>Home/End for min/max</div>
        </div>
      )}
    </div>
  );
};

// Accessible Audio Button with enhanced ARIA support
export interface AccessibleButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'toggle' | 'danger';
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
}

export const AccessibleAudioButton: React.FC<AccessibleButtonProps> = ({
  onClick,
  children,
  variant = 'default',
  active = false,
  disabled = false,
  loading = false,
  ariaLabel,
  ariaDescribedBy,
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled && !loading) {
        onClick();
      }
    }
  }, [onClick, disabled, loading]);

  const variantClasses = {
    default: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    toggle: active
      ? 'bg-blue-500 hover:bg-blue-600 text-white'
      : 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-pressed={variant === 'toggle' ? active : undefined}
      className={cn(
        'px-4 py-2 rounded font-medium transition-all duration-150',
        'focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50',
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        loading && 'cursor-wait',
        isFocused && 'ring-4 ring-blue-500 ring-opacity-50',
        className
      )}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// Screen reader announcements utility
export const useScreenReaderAnnouncements = () => {
  const [announcement, setAnnouncement] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message);

    // Clear after screen reader has time to read
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  const AnnouncementRegion = React.memo(function AnnouncementRegion() {
    return (
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {announcement}
      </div>
    );
  });

  return { announce, AnnouncementRegion };
};

// Keyboard navigation helper
export const useKeyboardNavigation = (items: string[], onSelect: (item: string) => void) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        const selectedItem = items[focusedIndex];
        if (selectedItem !== undefined) {
          onSelect(selectedItem);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
    }
  }, [items, focusedIndex, onSelect]);

  return { focusedIndex, handleKeyDown, setFocusedIndex };
};

// High contrast mode detector
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const highContrastMedia = window.matchMedia('(prefers-contrast: high)');
      setIsHighContrast(highContrastMedia.matches);
    };

    checkHighContrast();

    const highContrastMedia = window.matchMedia('(prefers-contrast: high)');
    highContrastMedia.addEventListener('change', checkHighContrast);

    return () => {
      highContrastMedia.removeEventListener('change', checkHighContrast);
    };
  }, []);

  return isHighContrast;
};

// Reduced motion detector
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};