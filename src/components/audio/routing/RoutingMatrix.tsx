import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Minus, Settings, Eye, EyeOff, Volume2, VolumeX,
  RotateCcw, Save, Upload, Download, Grid, List, Filter
} from 'lucide-react';
import { AudioRoutingSystem, AudioBus, AudioRoute, BusType } from '../../../lib/audio/routing-system';

export interface RoutingMatrixProps {
  routingSystem: AudioRoutingSystem;
  onRouteCreate?: (route: AudioRoute) => void;
  onRouteUpdate?: (route: AudioRoute) => void;
  onRouteDelete?: (routeId: string) => void;
  className?: string;
}

export interface MatrixCell {
  sourceId: string;
  targetId: string;
  route?: AudioRoute;
  crosspoint: boolean;
}

export const RoutingMatrix: React.FC<RoutingMatrixProps> = ({
  routingSystem,
  onRouteCreate,
  onRouteUpdate,
  onRouteDelete,
  className = ''
}) => {
  const [inputs, setInputs] = useState<AudioBus[]>([]);
  const [outputs, setOutputs] = useState<AudioBus[]>([]);
  const [routes, setRoutes] = useState<AudioRoute[]>([]);
  const [matrixCells, setMatrixCells] = useState<MatrixCell[][]>([]);
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<AudioRoute | null>(null);
  const [showRouteEditor, setShowRouteEditor] = useState(false);
  const [matrixZoom, setMatrixZoom] = useState(1);
  const [showOnlyConnected, setShowOnlyConnected] = useState(false);

  const matrixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRoutingData();

    // Subscribe to routing system events
    routingSystem.on('route:created', handleRouteCreated);
    routingSystem.on('route:updated', handleRouteUpdated);
    routingSystem.on('route:deleted', handleRouteDeleted);
    routingSystem.on('bus:created', loadRoutingData);
    routingSystem.on('bus:updated', loadRoutingData);
    routingSystem.on('bus:deleted', loadRoutingData);

    return () => {
      routingSystem.removeAllListeners();
    };
  }, [routingSystem]);

  useEffect(() => {
    buildMatrixCells();
  }, [inputs, outputs, routes]);

  const loadRoutingData = useCallback(() => {
    const allBuses = routingSystem.getAllBuses();
    setInputs(allBuses.filter(bus => ['input', 'aux', 'group'].includes(bus.type)));
    setOutputs(allBuses.filter(bus => ['output', 'monitor', 'headphone', 'aux'].includes(bus.type)));
    setRoutes(routingSystem.getAllRoutes());
  }, [routingSystem]);

  const buildMatrixCells = useCallback(() => {
    const cells: MatrixCell[][] = [];

    for (let i = 0; i < inputs.length; i++) {
      cells[i] = [];
      for (let j = 0; j < outputs.length; j++) {
        const input = inputs[i];
        const output = outputs[j];
        const route = routes.find(r => r.sourceId === input.id && r.targetId === output.id);

        cells[i][j] = {
          sourceId: input.id,
          targetId: output.id,
          route,
          crosspoint: !!route
        };
      }
    }

    setMatrixCells(cells);
  }, [inputs, outputs, routes]);

  const handleRouteCreated = useCallback((route: AudioRoute) => {
    setRoutes(prev => [...prev, route]);
    onRouteCreate?.(route);
  }, [onRouteCreate]);

  const handleRouteUpdated = useCallback((route: AudioRoute) => {
    setRoutes(prev => prev.map(r => r.id === route.id ? route : r));
    onRouteUpdate?.(route);
  }, [onRouteUpdate]);

  const handleRouteDeleted = useCallback((routeId: string) => {
    setRoutes(prev => prev.filter(r => r.id !== routeId));
    onRouteDelete?.(routeId);
  }, [onRouteDelete]);

  const handleCellClick = useCallback(async (cell: MatrixCell) => {
    if (cell.route) {
      // Route exists - delete it
      await routingSystem.deleteRoute(cell.route.id);
    } else {
      // No route - create one
      try {
        const newRoute = await routingSystem.createRoute({
          name: `${inputs.find(i => i.id === cell.sourceId)?.name} → ${outputs.find(o => o.id === cell.targetId)?.name}`,
          sourceId: cell.sourceId,
          targetId: cell.targetId,
          sourceOutput: 0,
          targetInput: 0,
          gain: 1.0,
          enabled: true,
          stereoLink: true,
          inverted: false,
          delay: 0
        });
      } catch (error) {
        console.error('Failed to create route:', error);
      }
    }
  }, [inputs, outputs, routingSystem]);

  const handleCellRightClick = useCallback((e: React.MouseEvent, cell: MatrixCell) => {
    e.preventDefault();
    if (cell.route) {
      setSelectedRoute(cell.route);
      setShowRouteEditor(true);
    }
  }, []);

  const handleRouteUpdate = useCallback(async (routeId: string, updates: Partial<AudioRoute>) => {
    await routingSystem.updateRoute(routeId, updates);
  }, [routingSystem]);

  const getCellColor = useCallback((cell: MatrixCell) => {
    if (!cell.route) return 'transparent';

    const route = cell.route;
    if (!route.enabled) return '#374151'; // gray-700

    const gain = route.gain;
    if (gain === 0) return '#1f2937'; // gray-800
    if (gain < 0.3) return '#059669'; // emerald-600
    if (gain < 0.7) return '#0891b2'; // cyan-600
    if (gain < 0.9) return '#7c3aed'; // violet-600

    return '#dc2626'; // red-600
  }, []);

  const getCellOpacity = useCallback((cell: MatrixCell) => {
    if (!cell.route) return 0;
    return Math.max(0.3, cell.route.gain);
  }, []);

  const getBusColor = useCallback((bus: AudioBus) => {
    const colors: Record<BusType, string> = {
      input: '#10b981',
      output: '#3b82f6',
      aux: '#f59e0b',
      group: '#8b5cf6',
      vca: '#ef4444',
      matrix: '#06b6d4',
      monitor: '#84cc16',
      headphone: '#f97316',
      foldback: '#ec4899',
      talkback: '#6b7280'
    };
    return colors[bus.type] || '#6b7280';
  }, []);

  const exportMatrix = useCallback(() => {
    const matrix = routingSystem.getRoutingMatrix();
    const data = JSON.stringify(matrix, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'routing-matrix.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [routingSystem]);

  const clearAllRoutes = useCallback(async () => {
    if (confirm('Are you sure you want to clear all routes?')) {
      await routingSystem.clearAllRoutes();
    }
  }, [routingSystem]);

  const filteredRoutes = showOnlyConnected
    ? routes.filter(route => route.enabled)
    : routes;

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold mb-1">Routing Matrix</h2>
          <p className="text-gray-400 text-sm">
            {routes.length} route{routes.length !== 1 ? 's' : ''} •
            {inputs.length} input{inputs.length !== 1 ? 's' : ''} •
            {outputs.length} output{outputs.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOnlyConnected(!showOnlyConnected)}
            className={`p-2 rounded-lg transition-colors ${
              showOnlyConnected ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Show only connected routes"
          >
            <Filter className="w-4 h-4" />
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'matrix' ? 'list' : 'matrix')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {viewMode === 'matrix' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>

          <button
            onClick={exportMatrix}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={clearAllRoutes}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Matrix Zoom</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={matrixZoom}
                onChange={(e) => setMatrixZoom(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-gray-400 text-xs mt-1">{Math.round(matrixZoom * 100)}%</div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Display Options</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showOnlyConnected}
                    onChange={(e) => setShowOnlyConnected(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-300 text-sm">Show only connected</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Quick Actions</label>
              <div className="space-y-2">
                <button
                  onClick={() => routingSystem.createSnapshot('Auto Save', 'Automatic snapshot')}
                  className="w-full bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Save Snapshot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'matrix' ? (
        /* Matrix View */
        <div className="overflow-auto">
          <div
            ref={matrixRef}
            className="matrix-container"
            style={{ transform: `scale(${matrixZoom})`, transformOrigin: 'top left' }}
          >
            <table className="routing-matrix border-collapse">
              <thead>
                <tr>
                  <th className="w-32 h-12 bg-gray-800 border border-gray-700 sticky left-0 z-10"></th>
                  {outputs.map((output) => (
                    <th
                      key={output.id}
                      className="min-w-24 h-12 bg-gray-800 border border-gray-700 text-white text-xs font-medium p-2"
                      style={{ backgroundColor: getBusColor(output) + '20' }}
                    >
                      <div className="transform -rotate-45 origin-center whitespace-nowrap">
                        {output.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inputs.map((input, i) => (
                  <tr key={input.id}>
                    <td
                      className="w-32 h-12 bg-gray-800 border border-gray-700 text-white text-xs font-medium p-2 sticky left-0 z-10"
                      style={{ backgroundColor: getBusColor(input) + '20' }}
                    >
                      <div className="truncate">{input.name}</div>
                    </td>
                    {outputs.map((output, j) => {
                      const cell = matrixCells[i]?.[j];
                      if (!cell) return null;

                      return (
                        <td
                          key={`${input.id}-${output.id}`}
                          className="w-12 h-12 border border-gray-700 cursor-pointer hover:bg-gray-600 transition-colors relative"
                          style={{
                            backgroundColor: getCellColor(cell),
                            opacity: getCellOpacity(cell)
                          }}
                          onClick={() => handleCellClick(cell)}
                          onContextMenu={(e) => handleCellRightClick(e, cell)}
                        >
                          {cell.route && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}

                          {cell.route && !cell.route.enabled && (
                            <div className="absolute top-0 right-0">
                              <EyeOff className="w-3 h-3 text-gray-400" />
                            </div>
                          )}

                          {cell.route && cell.route.gain === 0 && (
                            <div className="absolute bottom-0 left-0">
                              <VolumeX className="w-3 h-3 text-gray-400" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-gray-400 text-sm font-medium mb-2 px-2">
            <div className="col-span-3">Source</div>
            <div className="col-span-3">Target</div>
            <div className="col-span-2">Gain</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Actions</div>
          </div>

          {filteredRoutes.map((route) => {
            const sourceBus = inputs.find(b => b.id === route.sourceId) || outputs.find(b => b.id === route.sourceId);
            const targetBus = outputs.find(b => b.id === route.targetId) || inputs.find(b => b.id === route.targetId);

            return (
              <div
                key={route.id}
                className="grid grid-cols-12 gap-2 items-center bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors"
              >
                <div className="col-span-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sourceBus ? getBusColor(sourceBus) : '#6b7280' }}
                    />
                    <span className="text-white text-sm truncate">
                      {sourceBus?.name || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: targetBus ? getBusColor(targetBus) : '#6b7280' }}
                    />
                    <span className="text-white text-sm truncate">
                      {targetBus?.name || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="col-span-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={route.gain}
                    onChange={(e) => handleRouteUpdate(route.id, { gain: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-gray-400 text-xs">{Math.round(route.gain * 100)}%</div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRouteUpdate(route.id, { enabled: !route.enabled })}
                      className={`p-1 rounded transition-colors ${
                        route.enabled ? 'text-green-400' : 'text-gray-500'
                      }`}
                    >
                      {route.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleRouteUpdate(route.id, { gain: route.gain > 0 ? 0 : 1 })}
                      className={`p-1 rounded transition-colors ${
                        route.gain > 0 ? 'text-blue-400' : 'text-gray-500'
                      }`}
                    >
                      {route.gain > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedRoute(route);
                        setShowRouteEditor(true);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => routingSystem.deleteRoute(route.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredRoutes.length === 0 && (
            <div className="text-center py-12">
              <Grid className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">No routes found</h3>
              <p className="text-gray-400 mb-4">
                {showOnlyConnected
                  ? 'No active routes to display'
                  : 'Click on matrix cells to create routes'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Route Editor Modal */}
      {showRouteEditor && selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Route Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={selectedRoute.name}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, name: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Gain: {Math.round(selectedRoute.gain * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={selectedRoute.gain}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, gain: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Delay: {selectedRoute.delay}ms
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="1"
                  value={selectedRoute.delay}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, delay: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedRoute.enabled}
                    onChange={(e) => setSelectedRoute({ ...selectedRoute, enabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-gray-300 text-sm">Enabled</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedRoute.stereoLink}
                    onChange={(e) => setSelectedRoute({ ...selectedRoute, stereoLink: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-gray-300 text-sm">Stereo Link</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRouteEditor(false);
                  setSelectedRoute(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await routingSystem.updateRoute(selectedRoute.id, selectedRoute);
                  setShowRouteEditor(false);
                  setSelectedRoute(null);
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