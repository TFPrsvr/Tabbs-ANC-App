import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, Grid, List, Play, Pause, Settings, Download,
  Upload, RefreshCw as Refresh, Star, Clock, User, Tag, Zap, Music, Volume2,
  Activity, Sliders, Waves, Radio, Cpu, AlertCircle, CheckCircle
} from 'lucide-react';
import { PluginSystem, AudioPlugin, PluginCategory, PluginType, PluginScanResult } from '../../../lib/audio/plugin-system';

export interface PluginBrowserProps {
  pluginSystem: PluginSystem;
  onPluginSelect?: (plugin: AudioPlugin) => void;
  onPluginLoad?: (plugin: AudioPlugin) => void;
  onInstanceCreate?: (plugin: AudioPlugin) => void;
  className?: string;
}

export interface PluginFilters {
  category?: PluginCategory;
  type?: PluginType;
  manufacturer?: string;
  loaded?: boolean;
  format?: string;
}

export const PluginBrowser: React.FC<PluginBrowserProps> = ({
  pluginSystem,
  onPluginSelect,
  onPluginLoad,
  onInstanceCreate,
  className = ''
}) => {
  const [plugins, setPlugins] = useState<AudioPlugin[]>([]);
  const [filteredPlugins, setFilteredPlugins] = useState<AudioPlugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PluginFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<AudioPlugin | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<PluginScanResult | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'manufacturer' | 'category' | 'type'>('name');

  const categories: { category: PluginCategory; label: string; icon: React.ReactNode; color: string }[] = [
    { category: 'effect', label: 'Effects', icon: <Zap className="w-4 h-4" />, color: '#3b82f6' },
    { category: 'instrument', label: 'Instruments', icon: <Music className="w-4 h-4" />, color: '#10b981' },
    { category: 'analyzer', label: 'Analyzers', icon: <Activity className="w-4 h-4" />, color: '#f59e0b' },
    { category: 'generator', label: 'Generators', icon: <Radio className="w-4 h-4" />, color: '#8b5cf6' },
    { category: 'filter', label: 'Filters', icon: <Sliders className="w-4 h-4" />, color: '#06b6d4' },
    { category: 'dynamics', label: 'Dynamics', icon: <Volume2 className="w-4 h-4" />, color: '#ef4444' },
    { category: 'reverb', label: 'Reverb', icon: <Waves className="w-4 h-4" />, color: '#84cc16' },
    { category: 'delay', label: 'Delay', icon: <Clock className="w-4 h-4" />, color: '#f97316' },
    { category: 'modulation', label: 'Modulation', icon: <Activity className="w-4 h-4" />, color: '#ec4899' },
    { category: 'distortion', label: 'Distortion', icon: <Zap className="w-4 h-4" />, color: '#dc2626' },
    { category: 'eq', label: 'EQ', icon: <Sliders className="w-4 h-4" />, color: '#059669' },
    { category: 'utility', label: 'Utility', icon: <Settings className="w-4 h-4" />, color: '#6b7280' },
    { category: 'mastering', label: 'Mastering', icon: <Star className="w-4 h-4" />, color: '#7c3aed' },
    { category: 'sampler', label: 'Samplers', icon: <Grid className="w-4 h-4" />, color: '#0ea5e9' },
    { category: 'synthesizer', label: 'Synthesizers', icon: <Music className="w-4 h-4" />, color: '#f43f5e' },
    { category: 'drum-machine', label: 'Drums', icon: <Grid className="w-4 h-4" />, color: '#a855f7' }
  ];

  const types: { type: PluginType; label: string }[] = [
    { type: 'vst2', label: 'VST 2.4' },
    { type: 'vst3', label: 'VST3' },
    { type: 'audio-unit', label: 'Audio Unit' },
    { type: 'ladspa', label: 'LADSPA' },
    { type: 'lv2', label: 'LV2' },
    { type: 'web-audio', label: 'Web Audio' },
    { type: 'native', label: 'Native' }
  ];

  useEffect(() => {
    loadPlugins();

    // Subscribe to plugin system events
    pluginSystem.on('scan:completed', handleScanCompleted);
    pluginSystem.on('plugin:loaded', handlePluginLoaded);
    pluginSystem.on('plugin:unloaded', handlePluginUnloaded);

    return () => {
      pluginSystem.removeAllListeners();
    };
  }, [pluginSystem]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [plugins, searchQuery, filters, sortBy]);

  const loadPlugins = useCallback(() => {
    const allPlugins = pluginSystem.getAllPlugins();
    setPlugins(allPlugins);
  }, [pluginSystem]);

  const handleScanCompleted = useCallback((result: PluginScanResult) => {
    setScanResult(result);
    setIsScanning(false);
    loadPlugins();
  }, [loadPlugins]);

  const handlePluginLoaded = useCallback((plugin: AudioPlugin) => {
    setPlugins(prev => prev.map(p => p.id === plugin.id ? plugin : p));
    onPluginLoad?.(plugin);
  }, [onPluginLoad]);

  const handlePluginUnloaded = useCallback((plugin: AudioPlugin) => {
    setPlugins(prev => prev.map(p => p.id === plugin.id ? plugin : p));
  }, []);

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = plugins;

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    if (filters.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }
    if (filters.manufacturer) {
      filtered = filtered.filter(p =>
        p.manufacturer.toLowerCase().includes(filters.manufacturer!.toLowerCase())
      );
    }
    if (filters.loaded !== undefined) {
      filtered = filtered.filter(p => p.isLoaded === filters.loaded);
    }

    // Search by query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.manufacturer.toLowerCase().includes(query) ||
        p.metadata.description.toLowerCase().includes(query)
      );
    }

    // Sort plugins
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'manufacturer':
          return a.manufacturer.localeCompare(b.manufacturer);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    setFilteredPlugins(filtered);
  }, [plugins, searchQuery, filters, sortBy]);

  const handleScanPlugins = useCallback(async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      await pluginSystem.scanForPlugins();
    } catch (error) {
      console.error('Plugin scan failed:', error);
      setIsScanning(false);
    }
  }, [pluginSystem]);

  const handlePluginClick = useCallback((plugin: AudioPlugin) => {
    setSelectedPlugin(plugin);
    onPluginSelect?.(plugin);
  }, [onPluginSelect]);

  const handleLoadPlugin = useCallback(async (plugin: AudioPlugin) => {
    try {
      await pluginSystem.loadPlugin(plugin.id);
    } catch (error) {
      console.error('Failed to load plugin:', error);
    }
  }, [pluginSystem]);

  const handleUnloadPlugin = useCallback(async (plugin: AudioPlugin) => {
    try {
      await pluginSystem.unloadPlugin(plugin.id);
    } catch (error) {
      console.error('Failed to unload plugin:', error);
    }
  }, [pluginSystem]);

  const handleCreateInstance = useCallback(async (plugin: AudioPlugin) => {
    if (!plugin.isLoaded) {
      await handleLoadPlugin(plugin);
    }
    onInstanceCreate?.(plugin);
  }, [handleLoadPlugin, onInstanceCreate]);

  const getCategoryInfo = useCallback((category: PluginCategory) => {
    return categories.find(c => c.category === category) || {
      category,
      label: category,
      icon: <Settings className="w-4 h-4" />,
      color: '#6b7280'
    };
  }, []);

  const getTypeLabel = useCallback((type: PluginType) => {
    return types.find(t => t.type === type)?.label || type;
  }, []);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold mb-1">Plugin Browser</h2>
          <p className="text-gray-400">
            {plugins.length} plugin{plugins.length !== 1 ? 's' : ''} •
            {plugins.filter(p => p.isLoaded).length} loaded •
            {filteredPlugins.length} shown
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleScanPlugins}
            disabled={isScanning}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Refresh className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Plugins'}</span>
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 transition-colors ${
              showFilters ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium">Scan Results</h3>
            <span className="text-gray-400 text-sm">{scanResult.scanTime}ms</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-300">{scanResult.found.length} plugins found</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-gray-300">{scanResult.failed.length} failed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span className="text-gray-300">{scanResult.totalScanned} total scanned</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Sort */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plugins..."
            className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border-none outline-none focus:bg-gray-700"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-700"
        >
          <option value="name">Sort by Name</option>
          <option value="manufacturer">Sort by Manufacturer</option>
          <option value="category">Sort by Category</option>
          <option value="type">Sort by Type</option>
        </select>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  category: e.target.value as PluginCategory || undefined
                }))}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.category} value={cat.category}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Type</label>
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  type: e.target.value as PluginType || undefined
                }))}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
              >
                <option value="">All Types</option>
                {types.map(type => (
                  <option key={type.type} value={type.type}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Manufacturer</label>
              <input
                type="text"
                value={filters.manufacturer || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  manufacturer: e.target.value || undefined
                }))}
                placeholder="Filter by manufacturer..."
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Status</label>
              <select
                value={filters.loaded !== undefined ? filters.loaded.toString() : ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  loaded: e.target.value === '' ? undefined : e.target.value === 'true'
                }))}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
              >
                <option value="">All Status</option>
                <option value="true">Loaded</option>
                <option value="false">Not Loaded</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">
          {filteredPlugins.length} plugin{filteredPlugins.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Plugin Grid/List */}
      <div className={`${
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
      }`}>
        {filteredPlugins.map((plugin) => {
          const categoryInfo = getCategoryInfo(plugin.category);

          return (
            <div
              key={plugin.id}
              className={`bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer ${
                selectedPlugin?.id === plugin.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handlePluginClick(plugin)}
            >
              {viewMode === 'grid' ? (
                // Grid View
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: categoryInfo.color }}
                      >
                        {categoryInfo.icon}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                            {getTypeLabel(plugin.type)}
                          </span>
                          {plugin.isLoaded && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {plugin.isLoaded ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnloadPlugin(plugin);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Unload Plugin"
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadPlugin(plugin);
                          }}
                          className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                          title="Load Plugin"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-white font-semibold mb-1 truncate">{plugin.name}</h3>
                  <p className="text-gray-400 text-sm mb-2">{plugin.manufacturer}</p>
                  <p className="text-gray-400 text-xs mb-3 line-clamp-2">{plugin.metadata.description}</p>

                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span className="capitalize">{categoryInfo.label}</span>
                    <span>v{plugin.version}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-gray-400 text-xs">
                      {plugin.parameters.length} params
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateInstance(plugin);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                // List View
                <div className="flex items-center space-x-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: categoryInfo.color }}
                  >
                    {categoryInfo.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-white font-semibold truncate">{plugin.name}</h3>
                      <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                        {getTypeLabel(plugin.type)}
                      </span>
                      {plugin.isLoaded && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>{plugin.manufacturer}</span>
                      <span className="capitalize">{categoryInfo.label}</span>
                      <span>v{plugin.version}</span>
                      <span>{plugin.parameters.length} params</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {plugin.isLoaded ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnloadPlugin(plugin);
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Unload Plugin"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadPlugin(plugin);
                        }}
                        className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                        title="Load Plugin"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateInstance(plugin);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPlugins.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            {plugins.length === 0 ? (
              <Music className="w-12 h-12 mx-auto mb-4" />
            ) : (
              <Search className="w-12 h-12 mx-auto mb-4" />
            )}
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">
            {plugins.length === 0 ? 'No plugins found' : 'No matching plugins'}
          </h3>
          <p className="text-gray-400 mb-4">
            {plugins.length === 0
              ? 'Scan for plugins to get started'
              : 'Try adjusting your search criteria or filters'
            }
          </p>
          {plugins.length === 0 && (
            <button
              onClick={handleScanPlugins}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Scan for Plugins
            </button>
          )}
        </div>
      )}
    </div>
  );
};