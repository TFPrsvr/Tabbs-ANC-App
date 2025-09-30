import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Minus, ArrowUp, ArrowDown, Settings, Play, Pause, Volume2,
  VolumeX, Eye, EyeOff, RotateCcw, Save, Upload, Download, Copy,
  Trash2, Move, GripVertical as Grip
} from 'lucide-react';
import { PluginSystem, PluginChain, PluginInstance, AudioPlugin } from '../../../lib/audio/plugin-system';

export interface PluginChainEditorProps {
  pluginSystem: PluginSystem;
  chain: PluginChain;
  onChainUpdate?: (chain: PluginChain) => void;
  onInstanceSelect?: (instance: PluginInstance) => void;
  className?: string;
}

export interface DragState {
  isDragging: boolean;
  draggedIndex: number;
  dropIndex: number;
}

export const PluginChainEditor: React.FC<PluginChainEditorProps> = ({
  pluginSystem,
  chain,
  onChainUpdate,
  onInstanceSelect,
  className = ''
}) => {
  const [localChain, setLocalChain] = useState<PluginChain>(chain);
  const [selectedInstance, setSelectedInstance] = useState<PluginInstance | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: -1,
    dropIndex: -1
  });

  const draggedElementRef = useRef<HTMLDivElement>(null);
  const dropZoneRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setLocalChain(chain);
  }, [chain]);

  const handleChainChange = useCallback((updatedChain: PluginChain) => {
    setLocalChain(updatedChain);
    onChainUpdate?.(updatedChain);
  }, [onChainUpdate]);

  const handleInstanceSelect = useCallback((instance: PluginInstance) => {
    setSelectedInstance(instance);
    onInstanceSelect?.(instance);
  }, [onInstanceSelect]);

  const toggleChainEnabled = useCallback(() => {
    const updated = { ...localChain, enabled: !localChain.enabled };
    handleChainChange(updated);
  }, [localChain, handleChainChange]);

  const toggleMasterBypass = useCallback(() => {
    const updated = { ...localChain, masterBypass: !localChain.masterBypass };
    handleChainChange(updated);
  }, [localChain, handleChainChange]);

  const updateWetDryMix = useCallback((value: number) => {
    const updated = { ...localChain, wetDryMix: value };
    handleChainChange(updated);
  }, [localChain, handleChainChange]);

  const toggleInstanceEnabled = useCallback(async (instanceId: string) => {
    const updated = {
      ...localChain,
      plugins: localChain.plugins.map(instance =>
        instance.id === instanceId
          ? { ...instance, enabled: !instance.enabled }
          : instance
      )
    };
    handleChainChange(updated);
  }, [localChain, handleChainChange]);

  const toggleInstanceBypassed = useCallback(async (instanceId: string) => {
    const updated = {
      ...localChain,
      plugins: localChain.plugins.map(instance =>
        instance.id === instanceId
          ? { ...instance, bypassed: !instance.bypassed }
          : instance
      )
    };
    handleChainChange(updated);
  }, [localChain, handleChainChange]);

  const removeInstance = useCallback(async (instanceId: string) => {
    if (confirm('Are you sure you want to remove this plugin from the chain?')) {
      await pluginSystem.removeFromChain(localChain.id, instanceId);
      const updated = {
        ...localChain,
        plugins: localChain.plugins.filter(instance => instance.id !== instanceId)
      };
      handleChainChange(updated);
    }
  }, [pluginSystem, localChain, handleChainChange]);

  const duplicateInstance = useCallback(async (instanceId: string) => {
    const instance = localChain.plugins.find(p => p.id === instanceId);
    if (!instance) return;

    try {
      const newInstance = await pluginSystem.createInstance(instance.pluginId);

      // Copy parameter values
      Object.keys(instance.parameterValues).forEach(paramId => {
        pluginSystem.setParameterValue(newInstance.id, paramId, instance.parameterValues[paramId] ?? 0);
      });

      await pluginSystem.addToChain(localChain.id, newInstance.id, instance.position + 1);

      const updated = {
        ...localChain,
        plugins: [
          ...localChain.plugins.slice(0, instance.position + 1),
          newInstance,
          ...localChain.plugins.slice(instance.position + 1)
        ].map((plugin, index) => ({ ...plugin, position: index }))
      };
      handleChainChange(updated);
    } catch (error) {
      console.error('Failed to duplicate instance:', error);
    }
  }, [pluginSystem, localChain, handleChainChange]);

  const moveInstance = useCallback(async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const plugins = [...localChain.plugins];
    const [movedPlugin] = plugins.splice(fromIndex, 1);
    if (movedPlugin) {
      plugins.splice(toIndex, 0, movedPlugin);
    }

    // Update positions
    const updatedPlugins = plugins.map((plugin, index) => ({
      ...plugin,
      position: index
    }));

    const updated = { ...localChain, plugins: updatedPlugins };
    handleChainChange(updated);

    // Update plugin system
    for (let i = 0; i < updatedPlugins.length; i++) {
      await pluginSystem.addToChain(localChain.id, updatedPlugins[i]?.id ?? '', i);
    }
  }, [pluginSystem, localChain, handleChainChange]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragState({
      isDragging: true,
      draggedIndex: index,
      dropIndex: -1
    });

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    setDragState(prev => ({
      ...prev,
      dropIndex: index
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    const { draggedIndex, dropIndex } = dragState;

    if (draggedIndex !== -1 && dropIndex !== -1 && draggedIndex !== dropIndex) {
      moveInstance(draggedIndex, dropIndex);
    }

    setDragState({
      isDragging: false,
      draggedIndex: -1,
      dropIndex: -1
    });
  }, [dragState, moveInstance]);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    handleDragEnd();
  }, [handleDragEnd]);

  const getPluginInfo = useCallback((pluginId: string) => {
    return pluginSystem.getPlugin(pluginId);
  }, [pluginSystem]);

  const exportChain = useCallback(() => {
    const chainData = JSON.stringify(localChain, null, 2);
    const blob = new Blob([chainData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localChain.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chain.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [localChain]);

  const clearChain = useCallback(async () => {
    if (confirm('Are you sure you want to remove all plugins from this chain?')) {
      for (const instance of localChain.plugins) {
        await pluginSystem.removeFromChain(localChain.id, instance.id);
      }

      const updated = { ...localChain, plugins: [] };
      handleChainChange(updated);
    }
  }, [pluginSystem, localChain, handleChainChange]);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-white text-xl font-semibold">{localChain.name}</h2>
          <span className="text-gray-400 text-sm">
            {localChain.plugins.length} plugin{localChain.plugins.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleChainEnabled}
            className={`p-2 rounded-lg transition-colors ${
              localChain.enabled ? 'text-green-400' : 'text-gray-500'
            }`}
            title={localChain.enabled ? 'Disable Chain' : 'Enable Chain'}
          >
            {localChain.enabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleMasterBypass}
            className={`p-2 rounded-lg transition-colors ${
              localChain.masterBypass ? 'text-red-400' : 'text-gray-400'
            }`}
            title="Master Bypass"
          >
            {localChain.masterBypass ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={exportChain}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={clearChain}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chain Settings */}
      {showSettings && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Chain Name</label>
              <input
                type="text"
                value={localChain.name}
                onChange={(e) => handleChainChange({ ...localChain, name: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Wet/Dry Mix: {Math.round(localChain.wetDryMix * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localChain.wetDryMix}
                onChange={(e) => updateWetDryMix(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Plugin Chain */}
      <div className="space-y-3">
        {localChain.plugins.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
            <Plus className="w-8 h-8 text-gray-600 mx-auto mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">Empty Chain</h3>
            <p className="text-gray-400">Add plugins to start building your chain</p>
          </div>
        ) : (
          localChain.plugins.map((instance, index) => {
            const plugin = getPluginInfo(instance.pluginId);
            const isSelected = selectedInstance?.id === instance.id;
            const isDraggedOver = dragState.isDragging && dragState.dropIndex === index;
            const isDragged = dragState.isDragging && dragState.draggedIndex === index;

            return (
              <div
                key={instance.id}
                className={`relative ${isDraggedOver ? 'border-t-2 border-blue-500' : ''}`}
              >
                <div
                  ref={(el) => { if (dropZoneRefs.current) dropZoneRefs.current[index] = el; }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`bg-gray-800 rounded-lg p-4 transition-all cursor-move ${
                    isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-750'
                  } ${isDragged ? 'opacity-50' : ''}`}
                  onClick={() => handleInstanceSelect(instance)}
                >
                  <div className="flex items-center space-x-4">
                    {/* Drag Handle */}
                    <div className="text-gray-500 cursor-grab active:cursor-grabbing">
                      <Grip className="w-4 h-4" />
                    </div>

                    {/* Plugin Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-white font-medium truncate">
                          {plugin?.name || 'Unknown Plugin'}
                        </h4>
                        <span className="text-gray-400 text-sm">
                          {plugin?.manufacturer}
                        </span>
                        {instance.presetId && (
                          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                            Preset
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>Position {index + 1}</span>
                        <span>{plugin?.category}</span>
                        <span>{Object.keys(instance.parameterValues).length} params</span>
                      </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="flex items-center space-x-2">
                      {!instance.enabled && (
                        <div className="w-2 h-2 bg-red-500 rounded-full" title="Disabled" />
                      )}
                      {instance.bypassed && (
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Bypassed" />
                      )}
                      {instance.enabled && !instance.bypassed && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Active" />
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleInstanceEnabled(instance.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          instance.enabled ? 'text-green-400' : 'text-gray-500'
                        }`}
                        title={instance.enabled ? 'Disable' : 'Enable'}
                      >
                        {instance.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleInstanceBypassed(instance.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          instance.bypassed ? 'text-yellow-400' : 'text-gray-400'
                        }`}
                        title="Bypass"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateInstance(instance.id);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (index > 0) moveInstance(index, index - 1);
                        }}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (index < localChain.plugins.length - 1) moveInstance(index, index + 1);
                        }}
                        disabled={index === localChain.plugins.length - 1}
                        className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeInstance(instance.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInstanceSelect(instance);
                        }}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Settings"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Parameter Preview */}
                  {isSelected && plugin && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {plugin.parameters.slice(0, 8).map((param) => (
                          <div key={param.id} className="text-xs">
                            <div className="text-gray-400 mb-1 truncate">{param.name}</div>
                            <div className="text-white">
                              {instance.parameterValues[param.id]?.toFixed(2) || param.defaultValue.toFixed(2)}
                              {param.unit && <span className="text-gray-400 ml-1">{param.unit}</span>}
                            </div>
                          </div>
                        ))}
                        {plugin.parameters.length > 8 && (
                          <div className="text-xs text-gray-400 flex items-center">
                            +{plugin.parameters.length - 8} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Drop indicator for end of list */}
                {index === localChain.plugins.length - 1 && dragState.isDragging && (
                  <div
                    onDragOver={(e) => handleDragOver(e, index + 1)}
                    onDrop={(e) => handleDrop(e, index + 1)}
                    className={`h-2 ${
                      dragState.dropIndex === index + 1 ? 'border-b-2 border-blue-500' : ''
                    }`}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Chain Summary */}
      <div className="mt-6 bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Status:</span>
            <span className={localChain.enabled ? 'text-green-400' : 'text-red-400'}>
              {localChain.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Plugins:</span>
            <span className="text-white">{localChain.plugins.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Active:</span>
            <span className="text-white">
              {localChain.plugins.filter(p => p.enabled && !p.bypassed).length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Wet/Dry:</span>
            <span className="text-white">{Math.round(localChain.wetDryMix * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};