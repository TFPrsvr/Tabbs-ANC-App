import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Download, Upload, Star, Folder, File,
  Settings, Copy, Trash2, Edit, Save, X, Check, Filter
} from 'lucide-react';
import { ProjectTemplateManager, PresetCollection, AudioPreset, PresetCategory, PresetType } from '../../../lib/audio/project-templates';

export interface PresetManagerProps {
  templateManager: ProjectTemplateManager;
  onPresetApply?: (preset: AudioPreset) => void;
  onPresetEdit?: (preset: AudioPreset) => void;
  className?: string;
}

export interface PresetFilters {
  category?: PresetCategory;
  type?: PresetType;
  rating?: number;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  templateManager,
  onPresetApply,
  onPresetEdit,
  className = ''
}) => {
  const [collections, setCollections] = useState<PresetCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<PresetCollection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PresetFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<AudioPreset | null>(null);
  const [newPresetData, setNewPresetData] = useState({
    name: '',
    description: '',
    type: 'effect-chain' as PresetType,
    tags: '',
    data: '{}'
  });

  const categories: PresetCategory[] = [
    'effects', 'instruments', 'mixing', 'mastering', 'automation', 'midi', 'sampling'
  ];

  const types: PresetType[] = [
    'effect-chain', 'mixer-settings', 'automation-curve', 'midi-mapping',
    'instrument-patch', 'eq-curve', 'compressor-settings', 'reverb-space', 'delay-pattern'
  ];

  useEffect(() => {
    loadCollections();
  }, [templateManager]);

  const loadCollections = useCallback(() => {
    const allCollections = templateManager.getAllPresetCollections();
    setCollections(allCollections);
    if (allCollections.length > 0 && !selectedCollection) {
      setSelectedCollection(allCollections[0]);
    }
  }, [templateManager, selectedCollection]);

  const getFilteredPresets = useCallback(() => {
    if (!selectedCollection) return [];

    let presets = selectedCollection.presets;

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      presets = presets.filter(preset =>
        preset.name.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.type) {
      presets = presets.filter(preset => preset.type === filters.type);
    }

    if (filters.rating) {
      presets = presets.filter(preset => preset.rating >= filters.rating!);
    }

    return presets.sort((a, b) => b.rating - a.rating || b.downloads - a.downloads);
  }, [selectedCollection, searchQuery, filters]);

  const handleCreatePreset = useCallback(async () => {
    if (!selectedCollection || !newPresetData.name.trim()) return;

    try {
      const presetData = {
        name: newPresetData.name,
        description: newPresetData.description,
        type: newPresetData.type,
        tags: newPresetData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        rating: 0,
        downloads: 0,
        data: JSON.parse(newPresetData.data)
      };

      await templateManager.addPresetToCollection(selectedCollection.id, presetData);
      loadCollections();
      setShowCreateModal(false);
      setNewPresetData({
        name: '',
        description: '',
        type: 'effect-chain',
        tags: '',
        data: '{}'
      });
    } catch (error) {
      console.error('Failed to create preset:', error);
    }
  }, [selectedCollection, newPresetData, templateManager, loadCollections]);

  const handleDeletePreset = useCallback(async (preset: AudioPreset) => {
    if (!selectedCollection) return;

    // Remove preset from collection
    const updatedCollection = {
      ...selectedCollection,
      presets: selectedCollection.presets.filter(p => p.id !== preset.id)
    };

    setSelectedCollection(updatedCollection);
    loadCollections();
  }, [selectedCollection, loadCollections]);

  const handleDuplicatePreset = useCallback(async (preset: AudioPreset) => {
    if (!selectedCollection) return;

    const duplicatedPreset = {
      ...preset,
      name: `${preset.name} (Copy)`,
      downloads: 0
    };

    await templateManager.addPresetToCollection(selectedCollection.id, duplicatedPreset);
    loadCollections();
  }, [selectedCollection, templateManager, loadCollections]);

  const handleExportPreset = useCallback((preset: AudioPreset) => {
    const exportData = JSON.stringify(preset, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_preset.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportPreset = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCollection) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedPreset = JSON.parse(e.target?.result as string);
        await templateManager.addPresetToCollection(selectedCollection.id, {
          ...importedPreset,
          id: undefined // Let the manager assign new ID
        });
        loadCollections();
      } catch (error) {
        console.error('Failed to import preset:', error);
      }
    };
    reader.readAsText(file);
  }, [selectedCollection, templateManager, loadCollections]);

  const getTypeColor = useCallback((type: PresetType) => {
    const colors: Record<PresetType, string> = {
      'effect-chain': '#3b82f6',
      'mixer-settings': '#10b981',
      'automation-curve': '#f59e0b',
      'midi-mapping': '#8b5cf6',
      'instrument-patch': '#ef4444',
      'eq-curve': '#06b6d4',
      'compressor-settings': '#84cc16',
      'reverb-space': '#f97316',
      'delay-pattern': '#ec4899'
    };
    return colors[type] || '#6b7280';
  }, []);

  const renderStars = useCallback((rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
        }`}
      />
    ));
  }, []);

  const filteredPresets = getFilteredPresets();

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex h-full">
        {/* Collections Sidebar */}
        <div className="w-64 border-r border-gray-700 pr-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Collections</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {collections.map((collection) => (
              <div
                key={collection.id}
                onClick={() => setSelectedCollection(collection)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedCollection?.id === collection.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Folder className="w-4 h-4" />
                  <span className="font-medium truncate">{collection.name}</span>
                </div>
                <div className="text-xs opacity-75">
                  {collection.presets.length} preset{collection.presets.length !== 1 ? 's' : ''}
                </div>
                <div className="text-xs opacity-75 mt-1 capitalize">
                  {collection.category.replace('-', ' ')}
                </div>
              </div>
            ))}
          </div>

          {collections.length === 0 && (
            <div className="text-center py-8">
              <Folder className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No collections yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-blue-400 text-sm hover:text-blue-300 mt-2"
              >
                Create your first collection
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 pl-6">
          {selectedCollection ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white text-xl font-semibold mb-1">
                    {selectedCollection.name}
                  </h2>
                  <p className="text-gray-400 text-sm">{selectedCollection.description}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 transition-colors ${
                      showFilters ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                  <label className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportPreset}
                      className="hidden"
                    />
                  </label>
                  <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search presets..."
                    className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border-none outline-none focus:bg-gray-700"
                  />
                </div>

                {showFilters && (
                  <div className="bg-gray-800 rounded-lg p-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">Type</label>
                        <select
                          value={filters.type || ''}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            type: e.target.value as PresetType || undefined
                          }))}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
                        >
                          <option value="">All Types</option>
                          {types.map(type => (
                            <option key={type} value={type}>
                              {type.split('-').map(word =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">Min Rating</label>
                        <select
                          value={filters.rating || ''}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            rating: e.target.value ? parseInt(e.target.value) : undefined
                          }))}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
                        >
                          <option value="">Any Rating</option>
                          <option value="1">1+ Stars</option>
                          <option value="2">2+ Stars</option>
                          <option value="3">3+ Stars</option>
                          <option value="4">4+ Stars</option>
                          <option value="5">5 Stars</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() => setFilters({})}
                          className="w-full bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: getTypeColor(preset.type) }}
                      >
                        {preset.type.split('-').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onPresetApply?.(preset)}
                          className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                          title="Apply Preset"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingPreset(preset);
                            setShowEditModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Edit Preset"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicatePreset(preset)}
                          className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                          title="Duplicate Preset"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExportPreset(preset)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Export Preset"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete Preset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-white font-semibold mb-2 truncate">{preset.name}</h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{preset.description}</p>

                    <div className="flex items-center space-x-1 mb-3">
                      {renderStars(preset.rating)}
                      <span className="text-gray-400 text-xs ml-2">
                        ({preset.downloads} downloads)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {preset.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {preset.tags.length > 3 && (
                        <span className="text-gray-400 text-xs">+{preset.tags.length - 3}</span>
                      )}
                    </div>

                    <div className="text-gray-400 text-xs">
                      Created {preset.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {filteredPresets.length === 0 && (
                <div className="text-center py-12">
                  <File className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-semibold mb-2">No presets found</h3>
                  <p className="text-gray-400 mb-4">
                    {searchQuery.trim() || Object.keys(filters).length > 0
                      ? 'Try adjusting your search or filters'
                      : 'This collection is empty'
                    }
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Create First Preset
                  </button>
                </div>
              )}
            </>
          ) : (
            // No Collection Selected
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-white text-xl font-semibold mb-2">Select a Collection</h3>
                <p className="text-gray-400 mb-6">
                  Choose a preset collection from the sidebar to view and manage presets
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Create New Collection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Preset Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Create New Preset</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newPresetData.name}
                  onChange={(e) => setNewPresetData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  placeholder="Enter preset name..."
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newPresetData.description}
                  onChange={(e) => setNewPresetData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600 h-20 resize-none"
                  placeholder="Describe this preset..."
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Type</label>
                <select
                  value={newPresetData.type}
                  onChange={(e) => setNewPresetData(prev => ({ ...prev, type: e.target.value as PresetType }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                >
                  {types.map(type => (
                    <option key={type} value={type}>
                      {type.split('-').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newPresetData.tags}
                  onChange={(e) => setNewPresetData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Data (JSON)</label>
                <textarea
                  value={newPresetData.data}
                  onChange={(e) => setNewPresetData(prev => ({ ...prev, data: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600 h-32 resize-none font-mono text-sm"
                  placeholder='{"parameter": "value"}'
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPresetData({
                    name: '',
                    description: '',
                    type: 'effect-chain',
                    tags: '',
                    data: '{}'
                  });
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePreset}
                disabled={!newPresetData.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};