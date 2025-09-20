import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Copy, Settings, Volume2, Headphones,
  Mic, Speaker, RotateCcw, Save, Upload, Download, Grid,
  Layers, Cable, Monitor, Radio, Shuffle
} from 'lucide-react';
import { AudioRoutingSystem, AudioBus, BusType, BusGroup } from '../../../lib/audio/routing-system';

export interface BusManagerProps {
  routingSystem: AudioRoutingSystem;
  onBusCreate?: (bus: AudioBus) => void;
  onBusUpdate?: (bus: AudioBus) => void;
  onBusDelete?: (busId: string) => void;
  className?: string;
}

export const BusManager: React.FC<BusManagerProps> = ({
  routingSystem,
  onBusCreate,
  onBusUpdate,
  onBusDelete,
  className = ''
}) => {
  const [buses, setBuses] = useState<AudioBus[]>([]);
  const [groups, setGroups] = useState<BusGroup[]>([]);
  const [selectedBus, setSelectedBus] = useState<AudioBus | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [filterType, setFilterType] = useState<BusType | 'all'>('all');
  const [groupBy, setGroupBy] = useState<'type' | 'group' | 'none'>('type');

  const [newBusData, setNewBusData] = useState({
    name: '',
    type: 'aux' as BusType,
    channels: 2,
    color: '#3b82f6',
    description: ''
  });

  const [newGroupData, setNewGroupData] = useState({
    name: '',
    busIds: [] as string[],
    color: '#8b5cf6'
  });

  const busTypes: { type: BusType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'input', label: 'Input', icon: <Mic className="w-4 h-4" />, color: '#10b981' },
    { type: 'output', label: 'Output', icon: <Speaker className="w-4 h-4" />, color: '#3b82f6' },
    { type: 'aux', label: 'Auxiliary', icon: <Cable className="w-4 h-4" />, color: '#f59e0b' },
    { type: 'group', label: 'Group', icon: <Layers className="w-4 h-4" />, color: '#8b5cf6' },
    { type: 'vca', label: 'VCA', icon: <Volume2 className="w-4 h-4" />, color: '#ef4444' },
    { type: 'matrix', label: 'Matrix', icon: <Grid className="w-4 h-4" />, color: '#06b6d4' },
    { type: 'monitor', label: 'Monitor', icon: <Monitor className="w-4 h-4" />, color: '#84cc16' },
    { type: 'headphone', label: 'Headphone', icon: <Headphones className="w-4 h-4" />, color: '#f97316' },
    { type: 'foldback', label: 'Foldback', icon: <Radio className="w-4 h-4" />, color: '#ec4899' },
    { type: 'talkback', label: 'Talkback', icon: <Shuffle className="w-4 h-4" />, color: '#6b7280' }
  ];

  useEffect(() => {
    loadBuses();

    // Subscribe to routing system events
    routingSystem.on('bus:created', handleBusCreated);
    routingSystem.on('bus:updated', handleBusUpdated);
    routingSystem.on('bus:deleted', handleBusDeleted);
    routingSystem.on('group:created', loadBuses);
    routingSystem.on('group:updated', loadBuses);
    routingSystem.on('group:deleted', loadBuses);

    return () => {
      routingSystem.removeAllListeners();
    };
  }, [routingSystem]);

  const loadBuses = useCallback(() => {
    setBuses(routingSystem.getAllBuses());
    // Load groups if routing system supports it
    // setGroups(routingSystem.getAllGroups());
  }, [routingSystem]);

  const handleBusCreated = useCallback((bus: AudioBus) => {
    setBuses(prev => [...prev, bus]);
    onBusCreate?.(bus);
  }, [onBusCreate]);

  const handleBusUpdated = useCallback((bus: AudioBus) => {
    setBuses(prev => prev.map(b => b.id === bus.id ? bus : b));
    onBusUpdate?.(bus);
  }, [onBusUpdate]);

  const handleBusDeleted = useCallback((busId: string) => {
    setBuses(prev => prev.filter(b => b.id !== busId));
    onBusDelete?.(busId);
  }, [onBusDelete]);

  const handleCreateBus = useCallback(async () => {
    try {
      await routingSystem.createBus({
        name: newBusData.name,
        type: newBusData.type,
        channels: newBusData.channels,
        color: newBusData.color,
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
        inputs: [],
        outputs: [],
        effects: [],
        sends: [],
        automation: []
      });

      setShowCreateModal(false);
      setNewBusData({
        name: '',
        type: 'aux',
        channels: 2,
        color: '#3b82f6',
        description: ''
      });
    } catch (error) {
      console.error('Failed to create bus:', error);
    }
  }, [routingSystem, newBusData]);

  const handleUpdateBus = useCallback(async (busId: string, updates: Partial<AudioBus>) => {
    await routingSystem.updateBus(busId, updates);
  }, [routingSystem]);

  const handleDeleteBus = useCallback(async (busId: string) => {
    if (confirm('Are you sure you want to delete this bus? All connected routes will be removed.')) {
      await routingSystem.deleteBus(busId);
    }
  }, [routingSystem]);

  const handleDuplicateBus = useCallback(async (bus: AudioBus) => {
    const duplicatedBus = {
      ...bus,
      name: `${bus.name} (Copy)`,
      id: undefined,
      metadata: undefined
    };

    await routingSystem.createBus(duplicatedBus);
  }, [routingSystem]);

  const getBusIcon = useCallback((type: BusType) => {
    const busType = busTypes.find(bt => bt.type === type);
    return busType?.icon || <Volume2 className="w-4 h-4" />;
  }, []);

  const getBusTypeColor = useCallback((type: BusType) => {
    const busType = busTypes.find(bt => bt.type === type);
    return busType?.color || '#6b7280';
  }, []);

  const getFilteredBuses = useCallback(() => {
    let filtered = buses;

    if (filterType !== 'all') {
      filtered = filtered.filter(bus => bus.type === filterType);
    }

    return filtered;
  }, [buses, filterType]);

  const getGroupedBuses = useCallback(() => {
    const filtered = getFilteredBuses();

    if (groupBy === 'none') {
      return { 'All Buses': filtered };
    }

    if (groupBy === 'type') {
      const grouped: Record<string, AudioBus[]> = {};

      busTypes.forEach(busType => {
        const busesOfType = filtered.filter(bus => bus.type === busType.type);
        if (busesOfType.length > 0) {
          grouped[busType.label] = busesOfType;
        }
      });

      return grouped;
    }

    if (groupBy === 'group') {
      const grouped: Record<string, AudioBus[]> = { 'Ungrouped': [] };

      filtered.forEach(bus => {
        if (bus.groupId) {
          const group = groups.find(g => g.id === bus.groupId);
          const groupName = group?.name || 'Unknown Group';
          if (!grouped[groupName]) {
            grouped[groupName] = [];
          }
          grouped[groupName].push(bus);
        } else {
          grouped['Ungrouped'].push(bus);
        }
      });

      return grouped;
    }

    return { 'All Buses': filtered };
  }, [getFilteredBuses, groupBy, groups]);

  const groupedBuses = getGroupedBuses();

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold mb-1">Bus Manager</h2>
          <p className="text-gray-400 text-sm">
            {buses.length} bus{buses.length !== 1 ? 'es' : ''} • {groups.length} group{groups.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Bus</span>
          </button>

          <button
            onClick={() => setShowGroupModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Layers className="w-4 h-4" />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as BusType | 'all')}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-700"
          >
            <option value="all">All Types</option>
            {busTypes.map(busType => (
              <option key={busType.type} value={busType.type}>
                {busType.label}
              </option>
            ))}
          </select>

          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'type' | 'group' | 'none')}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-700"
          >
            <option value="type">Group by Type</option>
            <option value="group">Group by Groups</option>
            <option value="none">No Grouping</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Upload className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bus Groups */}
      <div className="space-y-6">
        {Object.entries(groupedBuses).map(([groupName, groupBuses]) => (
          <div key={groupName}>
            <h3 className="text-white font-medium mb-3 flex items-center">
              <span>{groupName}</span>
              <span className="ml-2 text-gray-400 text-sm">({groupBuses.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupBuses.map((bus) => (
                <div
                  key={bus.id}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: getBusTypeColor(bus.type) }}
                      >
                        {getBusIcon(bus.type)}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{bus.name}</h4>
                        <p className="text-gray-400 text-xs capitalize">
                          {bus.type.replace('-', ' ')} • {bus.channels} ch
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setSelectedBus(bus);
                          setShowEditModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Edit Bus"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDuplicateBus(bus)}
                        className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                        title="Duplicate Bus"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteBus(bus.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete Bus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Volume</span>
                      <span className="text-white text-xs">{Math.round(bus.volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={bus.volume}
                      onChange={(e) => handleUpdateBus(bus.id, { volume: parseFloat(e.target.value) })}
                      className="w-full"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Pan</span>
                      <span className="text-white text-xs">
                        {bus.pan === 0 ? 'C' : bus.pan < 0 ? `L${Math.round(Math.abs(bus.pan) * 100)}` : `R${Math.round(bus.pan * 100)}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={bus.pan}
                      onChange={(e) => handleUpdateBus(bus.id, { pan: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateBus(bus.id, { muted: !bus.muted })}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          bus.muted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => handleUpdateBus(bus.id, { solo: !bus.solo })}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          bus.solo ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        S
                      </button>
                    </div>

                    <div className="text-gray-400 text-xs">
                      {bus.inputs.length} in • {bus.outputs.length} out
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {buses.length === 0 && (
        <div className="text-center py-12">
          <Volume2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-lg font-semibold mb-2">No buses found</h3>
          <p className="text-gray-400 mb-4">Create your first bus to start routing audio</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create First Bus
          </button>
        </div>
      )}

      {/* Create Bus Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Create New Bus</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newBusData.name}
                  onChange={(e) => setNewBusData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  placeholder="Enter bus name..."
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Type</label>
                <select
                  value={newBusData.type}
                  onChange={(e) => setNewBusData(prev => ({ ...prev, type: e.target.value as BusType }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                >
                  {busTypes.map(busType => (
                    <option key={busType.type} value={busType.type}>
                      {busType.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Channels</label>
                <select
                  value={newBusData.channels}
                  onChange={(e) => setNewBusData(prev => ({ ...prev, channels: parseInt(e.target.value) }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                >
                  <option value={1}>Mono (1)</option>
                  <option value={2}>Stereo (2)</option>
                  <option value={4}>Quad (4)</option>
                  <option value={6}>5.1 (6)</option>
                  <option value={8}>7.1 (8)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Color</label>
                <input
                  type="color"
                  value={newBusData.color}
                  onChange={(e) => setNewBusData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 bg-gray-700 rounded-lg border-none outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={newBusData.description}
                  onChange={(e) => setNewBusData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600 h-20 resize-none"
                  placeholder="Describe this bus..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBusData({
                    name: '',
                    type: 'aux',
                    channels: 2,
                    color: '#3b82f6',
                    description: ''
                  });
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBus}
                disabled={!newBusData.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create Bus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bus Modal */}
      {showEditModal && selectedBus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Edit Bus</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={selectedBus.name}
                  onChange={(e) => setSelectedBus({ ...selectedBus, name: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Color</label>
                <input
                  type="color"
                  value={selectedBus.color}
                  onChange={(e) => setSelectedBus({ ...selectedBus, color: e.target.value })}
                  className="w-full h-10 bg-gray-700 rounded-lg border-none outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Volume: {Math.round(selectedBus.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedBus.volume}
                  onChange={(e) => setSelectedBus({ ...selectedBus, volume: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Pan: {selectedBus.pan === 0 ? 'Center' : selectedBus.pan < 0 ? `Left ${Math.round(Math.abs(selectedBus.pan) * 100)}%` : `Right ${Math.round(selectedBus.pan * 100)}%`}
                </label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={selectedBus.pan}
                  onChange={(e) => setSelectedBus({ ...selectedBus, pan: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedBus.muted}
                    onChange={(e) => setSelectedBus({ ...selectedBus, muted: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-gray-300 text-sm">Muted</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedBus.solo}
                    onChange={(e) => setSelectedBus({ ...selectedBus, solo: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-gray-300 text-sm">Solo</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedBus(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await routingSystem.updateBus(selectedBus.id, selectedBus);
                  setShowEditModal(false);
                  setSelectedBus(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};