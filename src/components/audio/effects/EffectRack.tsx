'use client';

import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AudioKnob, AudioButton, AudioSwitch } from '../controls';

export interface EffectParameter {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  type: 'knob' | 'fader' | 'switch' | 'select';
  options?: string[];
  logarithmic?: boolean;
  bipolar?: boolean;
}

export interface AudioEffect {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  bypassed: boolean;
  parameters: EffectParameter[];
  presets?: EffectPreset[];
  wetDry?: number;
  inputGain?: number;
  outputGain?: number;
}

export interface EffectPreset {
  id: string;
  name: string;
  parameters: Record<string, number>;
}

export interface EffectSlot {
  id: string;
  effect: AudioEffect | null;
  position: number;
}

export interface EffectRackProps {
  slots: EffectSlot[];
  onSlotChange: (slotId: string, effect: AudioEffect | null) => void;
  onParameterChange: (slotId: string, parameterId: string, value: number) => void;
  onEffectToggle: (slotId: string, enabled: boolean) => void;
  onEffectBypass: (slotId: string, bypassed: boolean) => void;
  onReorderSlots: (fromIndex: number, toIndex: number) => void;

  availableEffects?: AudioEffect[];
  variant?: 'compact' | 'standard' | 'professional' | 'vintage';
  orientation?: 'horizontal' | 'vertical';
  showWaveform?: boolean;
  className?: string;
  label?: string;
}

export const EffectRack: React.FC<EffectRackProps> = ({
  slots,
  onSlotChange,
  onParameterChange,
  onEffectToggle,
  onEffectBypass,
  onReorderSlots,
  availableEffects = [],
  variant = 'standard',
  orientation = 'horizontal',
  showWaveform = false,
  className,
  label
}) => {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<string | null>(null);
  const [showEffectBrowser, setShowEffectBrowser] = useState(false);
  const rackRef = useRef<HTMLDivElement>(null);

  // Handle parameter changes
  const handleParameterChange = useCallback((slotId: string, parameterId: string, value: number) => {
    onParameterChange(slotId, parameterId, value);
  }, [onParameterChange]);

  // Handle effect selection
  const handleEffectSelect = useCallback((slotId: string, effect: AudioEffect) => {
    onSlotChange(slotId, { ...effect });
    setShowEffectBrowser(false);
    setSelectedSlot(slotId);
  }, [onSlotChange]);

  // Handle drag and drop reordering
  const handleDragStart = useCallback((e: React.DragEvent, slotId: string) => {
    setDraggedSlot(slotId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSlotId: string) => {
    e.preventDefault();

    if (!draggedSlot || draggedSlot === targetSlotId) return;

    const fromIndex = slots.findIndex(slot => slot.id === draggedSlot);
    const toIndex = slots.findIndex(slot => slot.id === targetSlotId);

    if (fromIndex !== -1 && toIndex !== -1) {
      onReorderSlots(fromIndex, toIndex);
    }

    setDraggedSlot(null);
  }, [draggedSlot, slots, onReorderSlots]);

  // Render effect parameter control
  const renderParameter = useCallback((effect: AudioEffect, parameter: EffectParameter, slotId: string) => {
    const handleChange = (value: number) => handleParameterChange(slotId, parameter.id, value);

    switch (parameter.type) {
      case 'knob':
        return (
          <AudioKnob
            key={parameter.id}
            value={parameter.value}
            onChange={handleChange}
            min={parameter.min}
            max={parameter.max}
            step={parameter.step || 1}
            label={parameter.name}
            unit={parameter.unit}
            size={variant === 'compact' ? 'sm' : 'md'}
            variant={variant === 'vintage' ? 'vintage' : 'default'}
            logarithmic={parameter.logarithmic}
            bipolar={parameter.bipolar}
            precision={parameter.step && parameter.step < 1 ? 2 : 0}
          />
        );

      case 'switch':
        return (
          <AudioSwitch
            key={parameter.id}
            checked={parameter.value > 0.5}
            onChange={(checked) => handleChange(checked ? 1 : 0)}
            label={parameter.name}
            size={variant === 'compact' ? 'sm' : 'md'}
            variant={variant === 'vintage' ? 'rocker' : 'toggle'}
          />
        );

      case 'select':
        return (
          <div key={parameter.id} className="flex flex-col items-center gap-1">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {parameter.name}
            </label>
            <select
              value={Math.round(parameter.value)}
              onChange={(e) => handleChange(parseInt(e.target.value))}
              className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
            >
              {parameter.options?.map((option, index) => (
                <option key={index} value={index}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  }, [handleParameterChange, variant]);

  // Render individual effect slot
  const renderEffectSlot = useCallback((slot: EffectSlot) => {
    const isSelected = selectedSlot === slot.id;
    const isDragging = draggedSlot === slot.id;

    return (
      <div
        key={slot.id}
        className={cn(
          'relative border-2 rounded-lg p-3 transition-all duration-200',
          'min-h-32 flex flex-col',
          isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600',
          isDragging && 'opacity-50 scale-95',
          slot.effect ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 border-dashed',
          variant === 'vintage' && 'bg-amber-50 dark:bg-amber-900/20 border-amber-400',
          'cursor-pointer hover:shadow-md'
        )}
        draggable={!!slot.effect}
        onDragStart={(e) => handleDragStart(e, slot.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, slot.id)}
        onClick={() => setSelectedSlot(slot.id)}
      >
        {slot.effect ? (
          <>
            {/* Effect header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm text-gray-800 dark:text-gray-200">
                  {slot.effect.name}
                </h3>
                <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  {slot.effect.type}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Power button */}
                <AudioButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onEffectToggle(slot.id, !slot.effect!.enabled);
                  }}
                  variant="led"
                  active={slot.effect.enabled}
                  size="sm"
                  ledColor={slot.effect.enabled ? 'green' : 'red'}
                />

                {/* Bypass button */}
                <AudioButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onEffectBypass(slot.id, !slot.effect!.bypassed);
                  }}
                  variant="toggle"
                  active={slot.effect.bypassed}
                  size="sm"
                >
                  BYP
                </AudioButton>

                {/* Remove button */}
                <AudioButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlotChange(slot.id, null);
                    setSelectedSlot(null);
                  }}
                  variant="default"
                  size="sm"
                >
                  ×
                </AudioButton>
              </div>
            </div>

            {/* Effect parameters */}
            <div className={cn(
              'grid gap-2 flex-1',
              orientation === 'horizontal'
                ? 'grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
            )}>
              {slot.effect.parameters.slice(0, variant === 'compact' ? 4 : 8).map(parameter =>
                renderParameter(slot.effect!, parameter, slot.id)
              )}
            </div>

            {/* Wet/Dry mix if available */}
            {slot.effect.wetDry !== undefined && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <AudioKnob
                  value={slot.effect.wetDry}
                  onChange={(value) => handleParameterChange(slot.id, 'wetDry', value)}
                  min={0}
                  max={100}
                  label="MIX"
                  unit="%"
                  size="sm"
                />
              </div>
            )}

            {/* Preset selector */}
            {slot.effect.presets && slot.effect.presets.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <select
                  className="w-full text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                  onChange={(e) => {
                    const preset = slot.effect!.presets!.find(p => p.id === e.target.value);
                    if (preset) {
                      Object.entries(preset.parameters).forEach(([paramId, value]) => {
                        handleParameterChange(slot.id, paramId, value);
                      });
                    }
                  }}
                >
                  <option value="">Select Preset</option>
                  {slot.effect.presets.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Effect status indicator */}
            <div className={cn(
              'absolute top-1 right-1 w-2 h-2 rounded-full',
              slot.effect.enabled && !slot.effect.bypassed ? 'bg-green-400' :
              slot.effect.bypassed ? 'bg-yellow-400' :
              'bg-red-400'
            )} />
          </>
        ) : (
          /* Empty slot */
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-2xl mb-2">+</div>
            <div className="text-xs text-center">
              Click to add effect
            </div>
          </div>
        )}
      </div>
    );
  }, [
    selectedSlot, draggedSlot, variant, orientation, onEffectToggle, onEffectBypass,
    onSlotChange, handleDragStart, handleDragOver, handleDrop, renderParameter, handleParameterChange
  ]);

  // Render effect browser
  const renderEffectBrowser = () => {
    if (!showEffectBrowser || !selectedSlot) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Select Effect</h3>
            <AudioButton
              onClick={() => setShowEffectBrowser(false)}
              variant="default"
              size="sm"
            >
              ×
            </AudioButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableEffects.map(effect => (
              <div
                key={effect.id}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleEffectSelect(selectedSlot, effect)}
              >
                <div className="font-medium">{effect.name}</div>
                <div className="text-sm text-gray-500">{effect.type}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {effect.parameters.length} parameters
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            {label}
          </h2>

          {/* Rack controls */}
          <div className="flex items-center gap-2">
            <AudioButton
              onClick={() => {
                // Clear all effects
                slots.forEach(slot => {
                  if (slot.effect) {
                    onSlotChange(slot.id, null);
                  }
                });
              }}
              variant="default"
              size="sm"
            >
              Clear All
            </AudioButton>

            <AudioButton
              onClick={() => {
                if (selectedSlot) {
                  setShowEffectBrowser(true);
                }
              }}
              variant="default"
              size="sm"
              disabled={!selectedSlot}
            >
              Add Effect
            </AudioButton>
          </div>
        </div>
      )}

      {/* Effect rack */}
      <div
        ref={rackRef}
        className={cn(
          'flex gap-3 p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600',
          'bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900',
          variant === 'vintage' && 'from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 border-amber-400',
          orientation === 'vertical' ? 'flex-col' : 'flex-row',
          'overflow-x-auto'
        )}
      >
        {slots.map(slot => renderEffectSlot(slot))}

        {/* Add slot button */}
        <div
          className={cn(
            'border-2 border-dashed border-gray-400 rounded-lg p-3 min-h-32',
            'flex items-center justify-center cursor-pointer',
            'hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800',
            'text-gray-400 hover:text-gray-600'
          )}
          onClick={() => {
            const newSlot: EffectSlot = {
              id: `slot_${Date.now()}`,
              effect: null,
              position: slots.length
            };
            // This would need to be handled by parent component
            console.log('Add new slot:', newSlot);
          }}
        >
          <div className="text-center">
            <div className="text-2xl mb-1">+</div>
            <div className="text-xs">Add Slot</div>
          </div>
        </div>
      </div>

      {/* Signal chain visualization */}
      {showWaveform && (
        <div className="h-16 bg-black rounded border border-gray-600 relative overflow-hidden">
          {/* Simplified waveform visualization */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="100%" height="100%" className="text-green-400">
              <path
                d="M 0 32 Q 50 16 100 32 T 200 32 T 300 32 T 400 32 T 500 32 T 600 32 T 700 32 T 800 32"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                opacity="0.7"
              />
            </svg>
          </div>

          {/* Effect processing indicators */}
          {slots.map((slot, index) => {
            if (!slot.effect || !slot.effect.enabled || slot.effect.bypassed) return null;

            const x = (index / slots.length) * 100;
            return (
              <div
                key={slot.id}
                className="absolute top-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                style={{ left: `${x}%` }}
              />
            );
          })}
        </div>
      )}

      {/* Effect browser modal */}
      {renderEffectBrowser()}
    </div>
  );
};