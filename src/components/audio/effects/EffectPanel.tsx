'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AudioKnob, AudioFader, AudioButton, AudioSwitch } from '../controls';
import { AudioEffect, EffectParameter } from './EffectRack';

export interface EffectPanelProps {
  effect: AudioEffect;
  onParameterChange: (parameterId: string, value: number) => void;
  onToggle: (enabled: boolean) => void;
  onBypass: (bypassed: boolean) => void;
  onPresetChange: (presetId: string) => void;
  variant?: 'minimal' | 'standard' | 'professional' | 'vintage';
  size?: 'sm' | 'md' | 'lg';
  showAdvanced?: boolean;
  className?: string;
}

export const EffectPanel: React.FC<EffectPanelProps> = ({
  effect,
  onParameterChange,
  onToggle,
  onBypass,
  onPresetChange,
  variant = 'standard',
  size = 'md',
  showAdvanced = false,
  className
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('main');
  const [showPresets, setShowPresets] = useState(false);

  // Group parameters by section
  const parameterSections = React.useMemo(() => {
    const sections: Record<string, EffectParameter[]> = {
      main: [],
      eq: [],
      dynamics: [],
      modulation: [],
      advanced: []
    };

    effect.parameters.forEach(param => {
      const section = getParameterSection(param.name, param.id);
      if (sections[section]) {
        sections[section].push(param);
      } else {
        sections.main.push(param);
      }
    });

    return sections;
  }, [effect.parameters]);

  // Determine parameter section based on name/id
  const getParameterSection = useCallback((name: string, id: string): string => {
    const lowerName = name.toLowerCase();
    const lowerId = id.toLowerCase();

    if (lowerName.includes('eq') || lowerName.includes('frequency') ||
        lowerName.includes('bass') || lowerName.includes('treble') ||
        lowerName.includes('mid') || lowerName.includes('high') || lowerName.includes('low')) {
      return 'eq';
    }

    if (lowerName.includes('compress') || lowerName.includes('threshold') ||
        lowerName.includes('ratio') || lowerName.includes('attack') ||
        lowerName.includes('release') || lowerName.includes('gate')) {
      return 'dynamics';
    }

    if (lowerName.includes('lfo') || lowerName.includes('modulation') ||
        lowerName.includes('rate') || lowerName.includes('depth') ||
        lowerName.includes('sync') || lowerName.includes('wave')) {
      return 'modulation';
    }

    if (lowerName.includes('mode') || lowerName.includes('algorithm') ||
        lowerName.includes('advanced') || lowerId.includes('internal')) {
      return 'advanced';
    }

    return 'main';
  }, []);

  // Render parameter control
  const renderParameter = useCallback((parameter: EffectParameter) => {
    const handleChange = (value: number) => onParameterChange(parameter.id, value);

    const controlSize = size === 'lg' ? 'md' : size === 'sm' ? 'sm' : 'sm';

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
            size={controlSize}
            variant={variant === 'vintage' ? 'vintage' : variant === 'professional' ? 'modern' : 'default'}
            logarithmic={parameter.logarithmic}
            bipolar={parameter.bipolar}
            precision={parameter.step && parameter.step < 1 ? 2 : 0}
          />
        );

      case 'fader':
        return (
          <AudioFader
            key={parameter.id}
            value={parameter.value}
            onChange={handleChange}
            min={parameter.min}
            max={parameter.max}
            step={parameter.step || 1}
            label={parameter.name}
            unit={parameter.unit}
            size={controlSize}
            variant={variant === 'vintage' ? 'vintage' : variant === 'professional' ? 'pro' : 'default'}
            logarithmic={parameter.logarithmic}
            showValue
            className="h-24"
          />
        );

      case 'switch':
        return (
          <AudioSwitch
            key={parameter.id}
            checked={parameter.value > 0.5}
            onChange={(checked) => handleChange(checked ? 1 : 0)}
            label={parameter.name}
            size={controlSize}
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
              className={cn(
                'text-xs border rounded px-2 py-1',
                'bg-white dark:bg-gray-700',
                'border-gray-300 dark:border-gray-600',
                size === 'sm' ? 'text-xs' : 'text-sm'
              )}
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
  }, [onParameterChange, variant, size]);

  // Render section tabs
  const renderSectionTabs = () => {
    const activeSections = Object.entries(parameterSections)
      .filter(([_, params]) => params.length > 0)
      .filter(([section]) => showAdvanced || section !== 'advanced');

    if (activeSections.length <= 1) return null;

    return (
      <div className="flex border-b border-gray-200 dark:border-gray-600 mb-3">
        {activeSections.map(([section, params]) => (
          <button
            key={section}
            onClick={() => setSelectedSection(section)}
            className={cn(
              'px-3 py-2 text-xs font-medium capitalize transition-colors',
              'border-b-2 -mb-px',
              selectedSection === section
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {section} ({params.length})
          </button>
        ))}
      </div>
    );
  };

  // Render effect header
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h3 className={cn(
          'font-bold text-gray-800 dark:text-gray-200',
          size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'
        )}>
          {effect.name}
        </h3>

        <span className={cn(
          'text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          {effect.type}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Preset selector */}
        {effect.presets && effect.presets.length > 0 && (
          <div className="relative">
            <AudioButton
              onClick={() => setShowPresets(!showPresets)}
              variant="default"
              size={size === 'lg' ? 'md' : 'sm'}
            >
              Presets
            </AudioButton>

            {showPresets && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-10 min-w-32">
                {effect.presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onPresetChange(preset.id);
                      setShowPresets(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bypass button */}
        <AudioButton
          onClick={() => onBypass(!effect.bypassed)}
          variant="toggle"
          active={effect.bypassed}
          size={size === 'lg' ? 'md' : 'sm'}
          ledColor="yellow"
        >
          BYP
        </AudioButton>

        {/* Power button */}
        <AudioButton
          onClick={() => onToggle(!effect.enabled)}
          variant="led"
          active={effect.enabled}
          size={size === 'lg' ? 'md' : 'sm'}
          ledColor={effect.enabled ? 'green' : 'red'}
        >
          PWR
        </AudioButton>
      </div>
    </div>
  );

  // Render controls grid
  const renderControls = () => {
    const currentParams = parameterSections[selectedSection] || [];

    if (currentParams.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          No {selectedSection} parameters
        </div>
      );
    }

    const gridCols = variant === 'minimal' ? 'grid-cols-2' :
                    size === 'lg' ? 'grid-cols-4' :
                    size === 'sm' ? 'grid-cols-2' : 'grid-cols-3';

    return (
      <div className={cn('grid gap-4', gridCols)}>
        {currentParams.map(parameter => renderParameter(parameter))}
      </div>
    );
  };

  // Render input/output controls
  const renderIOControls = () => {
    if (variant === 'minimal') return null;

    return (
      <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
        {/* Input gain */}
        {effect.inputGain !== undefined && (
          <AudioKnob
            value={effect.inputGain}
            onChange={(value) => onParameterChange('inputGain', value)}
            min={-20}
            max={20}
            label="INPUT"
            unit="dB"
            size="sm"
            bipolar
            precision={1}
          />
        )}

        {/* Wet/Dry mix */}
        {effect.wetDry !== undefined && (
          <AudioKnob
            value={effect.wetDry}
            onChange={(value) => onParameterChange('wetDry', value)}
            min={0}
            max={100}
            label="MIX"
            unit="%"
            size="sm"
            precision={0}
          />
        )}

        {/* Output gain */}
        {effect.outputGain !== undefined && (
          <AudioKnob
            value={effect.outputGain}
            onChange={(value) => onParameterChange('outputGain', value)}
            min={-20}
            max={20}
            label="OUTPUT"
            unit="dB"
            size="sm"
            bipolar
            precision={1}
          />
        )}
      </div>
    );
  };

  const panelVariantClasses = {
    minimal: 'p-3',
    standard: 'p-4',
    professional: 'p-6',
    vintage: 'p-4'
  };

  const backgroundClasses = {
    minimal: 'bg-white dark:bg-gray-800',
    standard: 'bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
    professional: 'bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900',
    vintage: 'bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800'
  };

  return (
    <div
      className={cn(
        'border rounded-lg shadow-sm',
        panelVariantClasses[variant],
        backgroundClasses[variant],
        variant === 'vintage' ? 'border-amber-400' : 'border-gray-300 dark:border-gray-600',
        !effect.enabled && 'opacity-60',
        effect.bypassed && 'bg-yellow-50 dark:bg-yellow-900/20',
        className
      )}
    >
      {renderHeader()}
      {renderSectionTabs()}
      {renderControls()}
      {renderIOControls()}

      {/* Effect status overlay */}
      {(!effect.enabled || effect.bypassed) && (
        <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm font-medium">
            {!effect.enabled ? 'DISABLED' : 'BYPASSED'}
          </div>
        </div>
      )}
    </div>
  );
};