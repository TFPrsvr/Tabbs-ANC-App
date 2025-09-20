import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, Grid, List, Plus, Download, Upload,
  Star, Clock, User, Tag, Play, Eye, Copy, Settings
} from 'lucide-react';
import { ProjectTemplateManager, AudioProjectTemplate, TemplateCategory } from '../../../lib/audio/project-templates';

export interface TemplateLibraryProps {
  templateManager: ProjectTemplateManager;
  onTemplateSelect?: (template: AudioProjectTemplate) => void;
  onCreateProject?: (template: AudioProjectTemplate, projectName: string) => void;
  className?: string;
}

export interface TemplateFilters {
  category?: TemplateCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags?: string[];
  author?: string;
  rating?: number;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  templateManager,
  onTemplateSelect,
  onCreateProject,
  className = ''
}) => {
  const [templates, setTemplates] = useState<AudioProjectTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<AudioProjectTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AudioProjectTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'rating' | 'downloads'>('updated');

  const categories: TemplateCategory[] = [
    'song-writing', 'mixing', 'mastering', 'podcast', 'live-performance',
    'sound-design', 'voice-over', 'orchestral', 'electronic', 'rock-band',
    'hip-hop', 'jazz', 'classical', 'ambient', 'experimental'
  ];

  const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];

  useEffect(() => {
    loadTemplates();
  }, [templateManager]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [templates, searchQuery, filters, sortBy]);

  const loadTemplates = useCallback(() => {
    const allTemplates = templateManager.getAllTemplates();
    setTemplates(allTemplates);
  }, [templateManager]);

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = templateManager.searchTemplates(searchQuery, filters);

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        case 'rating':
          // Simulate rating based on metadata
          return 0;
        case 'downloads':
          // Simulate downloads
          return 0;
        default:
          return 0;
      }
    });

    setFilteredTemplates(filtered);
  }, [templateManager, searchQuery, filters, sortBy]);

  const handleTemplateClick = useCallback((template: AudioProjectTemplate) => {
    setSelectedTemplate(template);
    onTemplateSelect?.(template);
  }, [onTemplateSelect]);

  const handleCreateProject = useCallback(async () => {
    if (!selectedTemplate || !projectName.trim()) return;

    try {
      await onCreateProject?.(selectedTemplate, projectName);
      setShowCreateModal(false);
      setProjectName('');
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  }, [selectedTemplate, projectName, onCreateProject]);

  const handleExportTemplate = useCallback(async (template: AudioProjectTemplate) => {
    try {
      const exported = await templateManager.exportTemplate(template.id);
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export template:', error);
    }
  }, [templateManager]);

  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, []);

  const getCategoryColor = useCallback((category: TemplateCategory) => {
    const colors: Record<TemplateCategory, string> = {
      'song-writing': '#3b82f6',
      'mixing': '#10b981',
      'mastering': '#f59e0b',
      'podcast': '#8b5cf6',
      'live-performance': '#ef4444',
      'sound-design': '#06b6d4',
      'voice-over': '#84cc16',
      'orchestral': '#f97316',
      'electronic': '#ec4899',
      'rock-band': '#6b7280',
      'hip-hop': '#14b8a6',
      'jazz': '#a855f7',
      'classical': '#059669',
      'ambient': '#0ea5e9',
      'experimental': '#dc2626'
    };
    return colors[category] || '#6b7280';
  }, []);

  const getDifficultyColor = useCallback((difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: '#10b981',
      intermediate: '#f59e0b',
      advanced: '#ef4444',
      expert: '#8b5cf6'
    };
    return colors[difficulty] || '#6b7280';
  }, []);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold mb-1">Template Library</h2>
          <p className="text-gray-400">Choose from professional audio project templates</p>
        </div>

        <div className="flex items-center space-x-2">
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
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Upload className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border-none outline-none focus:bg-gray-700"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-700"
        >
          <option value="updated">Recently Updated</option>
          <option value="name">Name</option>
          <option value="rating">Rating</option>
          <option value="downloads">Downloads</option>
        </select>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  category: e.target.value as TemplateCategory || undefined
                }))}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.split('-').map(word =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Difficulty</label>
              <select
                value={filters.difficulty || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  difficulty: e.target.value as any || undefined
                }))}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
              >
                <option value="">All Levels</option>
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Author</label>
              <input
                type="text"
                value={filters.author || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  author: e.target.value || undefined
                }))}
                placeholder="Filter by author..."
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none focus:bg-gray-600"
              />
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

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Template Grid/List */}
      <div className={`${
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }`}>
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer ${
              selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleTemplateClick(template)}
          >
            {viewMode === 'grid' ? (
              // Grid View
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: getCategoryColor(template.category) }}
                  >
                    {template.category.split('-').map(word =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportTemplate(template);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-white font-semibold mb-2 truncate">{template.name}</h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{template.description}</p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-400 text-xs">{template.metadata.author}</span>
                  </div>
                  <div
                    className="px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: getDifficultyColor(template.metadata.difficulty) }}
                  >
                    {template.metadata.difficulty}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{template.tracks.length} tracks</span>
                  <span>{template.metadata.bpm} BPM</span>
                  <span>{formatDuration(template.metadata.estimatedDuration)}</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="text-gray-400 text-xs">+{template.tags.length - 3}</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-400 text-xs">
                      {template.updatedAt.toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(template);
                      setShowCreateModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ) : (
              // List View
              <div className="flex items-center space-x-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: getCategoryColor(template.category) }}
                >
                  <Play className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-white font-semibold truncate">{template.name}</h3>
                    <div
                      className="px-2 py-1 rounded text-xs"
                      style={{ backgroundColor: getDifficultyColor(template.metadata.difficulty) }}
                    >
                      {template.metadata.difficulty}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm truncate mb-1">{template.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span>{template.metadata.author}</span>
                    <span>{template.tracks.length} tracks</span>
                    <span>{template.metadata.bpm} BPM</span>
                    <span>{formatDuration(template.metadata.estimatedDuration)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportTemplate(template);
                    }}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(template);
                      setShowCreateModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto mb-4" />
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-gray-400 mb-4">
            Try adjusting your search criteria or filters
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            Create Custom Template
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Create New Project</h3>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Using template:</p>
              <p className="text-white font-medium">{selectedTemplate.name}</p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setProjectName('');
                  setSelectedTemplate(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!projectName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};