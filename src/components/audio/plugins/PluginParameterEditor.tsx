import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw, Save, Upload, Download, Eye, EyeOff, Link,
  Settings, Play, Pause, Volume2, Sliders, Activity, Zap
} from 'lucide-react';
import { PluginSystem, PluginInstance, AudioPlugin, PluginParameter, PluginPreset } from '../../../lib/audio/plugin-system';

export interface PluginParameterEditorProps {
  pluginSystem: PluginSystem;
  instance: PluginInstance;
  onParameterChange?: (parameterId: string, value: number) => void;
  onPresetLoad?: (presetId: string) => void;
  className?: string;
}

export interface ParameterGroup {
  name: string;
  parameters: PluginParameter[];
  collapsed: boolean;
}

export const PluginParameterEditor: React.FC<PluginParameterEditorProps> = ({
  pluginSystem,
  instance,
  onParameterChange,
  onPresetLoad,
  className = ''
}) => {
  const [plugin, setPlugin] = useState<AudioPlugin | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, number>>({});
  const [parameterGroups, setParameterGroups] = useState<ParameterGroup[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showAutomation, setShowAutomation] = useState<Record<string, boolean>>({});
  const [linkedParameters, setLinkedParameters] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'standard' | 'compact' | 'expert'>('standard');

  useEffect(() => {
    const pluginData = pluginSystem.getPlugin(instance.pluginId);
    setPlugin(pluginData);
    setParameterValues(instance.parameterValues);
    setSelectedPreset(instance.presetId || null);

    if (pluginData) {
      createParameterGroups(pluginData.parameters);
    }
  }, [pluginSystem, instance]);

  const createParameterGroups = useCallback((parameters: PluginParameter[]) => {
    const groups: Record<string, PluginParameter[]> = {};

    parameters.forEach(param => {
      const groupName = param.group || 'General';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(param);
    });

    const groupList: ParameterGroup[] = Object.entries(groups).map(([name, params]) => ({
      name,
      parameters: params.sort((a, b) => a.name.localeCompare(b.name)),
      collapsed: name !== 'General'
    }));

    setParameterGroups(groupList);
  }, []);

  const handleParameterChange = useCallback(async (parameterId: string, value: number) => {
    const newValues = { ...parameterValues, [parameterId]: value };
    setParameterValues(newValues);

    await pluginSystem.setParameterValue(instance.id, parameterId, value);
    onParameterChange?.(parameterId, value);

    // Update linked parameters
    if (linkedParameters.has(parameterId)) {
      const parameter = plugin?.parameters.find(p => p.id === parameterId);
      if (parameter) {
        const normalizedValue = (value - parameter.minValue) / (parameter.maxValue - parameter.minValue);

        linkedParameters.forEach(async (linkedParamId) => {
          if (linkedParamId !== parameterId) {
            const linkedParam = plugin?.parameters.find(p => p.id === linkedParamId);
            if (linkedParam) {
              const linkedValue = linkedParam.minValue + normalizedValue * (linkedParam.maxValue - linkedParam.minValue);
              await handleParameterChange(linkedParamId, linkedValue);
            }
          }
        });
      }
    }
  }, [pluginSystem, instance.id, parameterValues, onParameterChange, linkedParameters, plugin]);

  const resetParameter = useCallback(async (parameterId: string) => {
    const parameter = plugin?.parameters.find(p => p.id === parameterId);
    if (parameter) {
      await handleParameterChange(parameterId, parameter.defaultValue);
    }
  }, [plugin, handleParameterChange]);

  const resetAllParameters = useCallback(async () => {
    if (!plugin) return;

    for (const parameter of plugin.parameters) {
      await handleParameterChange(parameter.id, parameter.defaultValue);
    }
  }, [plugin, handleParameterChange]);

  const loadPreset = useCallback(async (presetId: string) => {
    const success = await pluginSystem.loadPreset(instance.id, presetId);
    if (success) {
      setSelectedPreset(presetId);
      setParameterValues(instance.parameterValues);
      onPresetLoad?.(presetId);
    }
  }, [pluginSystem, instance, onPresetLoad]);

  const toggleParameterGroup = useCallback((groupIndex: number) => {
    setParameterGroups(prev => prev.map((group, index) =>
      index === groupIndex ? { ...group, collapsed: !group.collapsed } : group
    ));
  }, []);

  const toggleParameterLink = useCallback((parameterId: string) => {
    setLinkedParameters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parameterId)) {
        newSet.delete(parameterId);
      } else {
        newSet.add(parameterId);
      }
      return newSet;
    });
  }, []);

  const formatParameterValue = useCallback((parameter: PluginParameter, value: number) => {
    switch (parameter.type) {
      case 'bool':
        return value > 0.5 ? 'On' : 'Off';
      case 'int':
        return Math.round(value).toString();
      case 'percentage':
        return `${Math.round(value * 100)}%`;
      case 'gain-db':
        return `${value.toFixed(1)} dB`;
      case 'frequency':
        if (value >= 1000) {
          return `${(value / 1000).toFixed(1)} kHz`;
        }
        return `${Math.round(value)} Hz`;
      case 'time':
        if (value >= 1) {
          return `${value.toFixed(2)} s`;
        }
        return `${(value * 1000).toFixed(0)} ms`;
      case 'float':
      default:
        return value.toFixed(parameter.step ? Math.abs(Math.log10(parameter.step)) : 2);
    }
  }, []);

  const getParameterColor = useCallback((parameter: PluginParameter) => {
    switch (parameter.type) {
      case 'gain-db':
        return '#ef4444'; // red
      case 'frequency':
        return '#3b82f6'; // blue
      case 'time':
        return '#10b981'; // green
      case 'percentage':
        return '#f59e0b'; // amber
      case 'bool':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  }, []);

  const renderParameter = useCallback((parameter: PluginParameter) => {
    const value = parameterValues[parameter.id] ?? parameter.defaultValue;
    const normalizedValue = (value - parameter.minValue) / (parameter.maxValue - parameter.minValue);
    const isLinked = linkedParameters.has(parameter.id);
    const color = getParameterColor(parameter);

    if (viewMode === 'compact') {
      return (
        <div key={parameter.id} className="flex items-center space-x-2 p-2 bg-gray-800 rounded">
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{parameter.name}</div>
            <input
              type="range"
              min={parameter.minValue}
              max={parameter.maxValue}
              step={parameter.step || (parameter.maxValue - parameter.minValue) / 100}
              value={value}
              onChange={(e) => handleParameterChange(parameter.id, parseFloat(e.target.value))}
              className="w-full mt-1"
              style={{ accentColor: color }}
            />
          </div>
          <div className="text-white text-xs w-16 text-right">
            {formatParameterValue(parameter, value)}
          </div>
        </div>
      );
    }

    return (
      <div
        key={parameter.id}
        className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h4 className="text-white font-medium">{parameter.displayName || parameter.name}</h4>
            {parameter.isAutomatable && (
              <button
                onClick={() => setShowAutomation(prev => ({
                  ...prev,
                  [parameter.id]: !prev[parameter.id]
                }))}
                className={`p-1 rounded transition-colors ${
                  showAutomation[parameter.id] ? 'text-blue-400' : 'text-gray-500'
                }`}
                title="Automation"
              >
                <Activity className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => toggleParameterLink(parameter.id)}
              className={`p-1 rounded transition-colors ${
                isLinked ? 'text-yellow-400' : 'text-gray-500'
              }`}
              title="Link Parameter"
            >
              <Link className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-white font-mono text-sm">
              {formatParameterValue(parameter, value)}
            </span>
            <button
              onClick={() => resetParameter(parameter.id)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Reset to Default"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {parameter.description && (
          <p className="text-gray-400 text-xs mb-3">{parameter.description}</p>
        )}

        <div className="space-y-2">
          {parameter.type === 'bool' ? (
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value > 0.5}
                onChange={(e) => handleParameterChange(parameter.id, e.target.checked ? 1 : 0)}
                className="rounded"
              />
              <span className="text-gray-300 text-sm">
                {value > 0.5 ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          ) : parameter.type === 'enum' ? (
            <select
              value={Math.round(value)}
              onChange={(e) => handleParameterChange(parameter.id, parseInt(e.target.value))}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
            >
              {/* Enum options would be defined in parameter metadata */}
              <option value={0}>Option 1</option>
              <option value={1}>Option 2</option>
              <option value={2}>Option 3</option>
            </select>
          ) : (
            <>
              <input
                type="range"
                min={parameter.minValue}
                max={parameter.maxValue}
                step={parameter.step || (parameter.maxValue - parameter.minValue) / 100}
                value={value}
                onChange={(e) => handleParameterChange(parameter.id, parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: color }}
              />

              {viewMode === 'expert' && (
                <input
                  type="number"
                  min={parameter.minValue}
                  max={parameter.maxValue}
                  step={parameter.step || 0.01}
                  value={value}
                  onChange={(e) => handleParameterChange(parameter.id, parseFloat(e.target.value))}
                  className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm border-none outline-none focus:bg-gray-600"
                />
              )}
            </>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatParameterValue(parameter, parameter.minValue)}</span>
            <div className="flex items-center space-x-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{parameter.type}</span>
            </div>
            <span>{formatParameterValue(parameter, parameter.maxValue)}</span>
          </div>

          {/* Progress indicator */}
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div
              className="h-1 rounded-full transition-all duration-150"
              style={{
                width: `${normalizedValue * 100}%`,
                backgroundColor: color
              }}
            />
          </div>
        </div>

        {/* Automation visualization */}
        {showAutomation[parameter.id] && (
          <div className="mt-3 p-2 bg-gray-700 rounded">
            <div className="text-gray-400 text-xs mb-2">Automation</div>
            <div className="h-8 bg-gray-600 rounded flex items-center px-2">
              <div className="text-gray-400 text-xs">No automation data</div>
            </div>
          </div>
        )}
      </div>
    );
  }, [
    parameterValues,
    linkedParameters,
    showAutomation,
    viewMode,
    handleParameterChange,
    resetParameter,
    toggleParameterLink,
    formatParameterValue,
    getParameterColor
  ]);

  if (!plugin) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <Settings className="w-8 h-8 mx-auto mb-2" />
          <p>Plugin not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold mb-1">{plugin.name}</h2>
          <p className="text-gray-400 text-sm">
            {plugin.manufacturer} • v{plugin.version} • {plugin.parameters.length} parameters
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="bg-gray-800 text-white px-3 py-1 rounded text-sm border-none outline-none focus:bg-gray-700"
          >
            <option value="standard">Standard</option>
            <option value="compact">Compact</option>
            <option value="expert">Expert</option>
          </select>

          <button
            onClick={resetAllParameters}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Reset All Parameters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Presets */}
      {plugin.presets.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">Presets</h3>
            <span className="text-gray-400 text-sm">{plugin.presets.length} available</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadPreset('')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                !selectedPreset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Default
            </button>
            {plugin.presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset.id)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedPreset === preset.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Parameters */}
      <div className="space-y-4">
        {parameterGroups.map((group, groupIndex) => (
          <div key={group.name} className="bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleParameterGroup(groupIndex)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <h3 className="text-white font-medium">{group.name}</h3>
                <span className="text-gray-400 text-sm">
                  ({group.parameters.length} parameter{group.parameters.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className={`transform transition-transform ${group.collapsed ? '' : 'rotate-180'}`}>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {!group.collapsed && (
              <div className="p-4 pt-0">
                <div className={`grid gap-4 ${
                  viewMode === 'compact'
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1'
                }`}>
                  {group.parameters.map(renderParameter)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Status:</span>
            <span className={instance.enabled ? 'text-green-400' : 'text-red-400'}>
              {instance.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Preset:</span>
            <span className="text-white">
              {selectedPreset
                ? plugin.presets.find(p => p.id === selectedPreset)?.name || 'Unknown'
                : 'Default'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Linked:</span>
            <span className="text-white">{linkedParameters.size} parameter{linkedParameters.size !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Automation:</span>
            <span className="text-white">
              {Object.values(showAutomation).filter(Boolean).length} active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};