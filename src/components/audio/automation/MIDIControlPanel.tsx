import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Plus, Minus, Edit, Trash2, Play, Pause, Activity,
  Sliders, Gamepad2, Volume2, RotateCcw, Link, Unlink, Zap,
  Mic, Speaker, Music, Target, Disc, Square
} from 'lucide-react';
import { AutomationSystem, MIDIController, ControllerAssignment, ControllerType, AssignmentMode, ControllerCurve } from '../../../lib/audio/automation-system';

export interface MIDIControlPanelProps {
  automationSystem: AutomationSystem;
  onControllerAssign?: (controllerId: string, assignment: ControllerAssignment) => void;
  onParameterControl?: (targetId: string, parameterId: string, value: number) => void;
  className?: string;
}

export interface ControllerMappingState {
  isLearning: boolean;
  learningControllerId: string | null;
  lastMIDIMessage: any;
  activeAssignments: Map<string, number>;
}

export const MIDIControlPanel: React.FC<MIDIControlPanelProps> = ({
  automationSystem,
  onControllerAssign,
  onParameterControl,
  className = ''
}) => {
  const [controllers, setControllers] = useState<MIDIController[]>([]);
  const [selectedController, setSelectedController] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [mappingState, setMappingState] = useState<ControllerMappingState>({
    isLearning: false,
    learningControllerId: null,
    lastMIDIMessage: null,
    activeAssignments: new Map()
  });

  const [newControllerData, setNewControllerData] = useState({
    name: '',
    type: 'knob' as ControllerType,
    channel: 0,
    ccNumber: 1,
    minValue: 0,
    maxValue: 127
  });

  const [newAssignmentData, setNewAssignmentData] = useState({
    targetId: '',
    parameterId: '',
    mode: 'absolute' as AssignmentMode,
    rangeMin: 0,
    rangeMax: 1,
    curve: 'linear' as ControllerCurve
  });

  const controllerTypes: { type: ControllerType; label: string; icon: React.ReactNode }[] = [
    { type: 'knob', label: 'Knob', icon: <Volume2 className="w-4 h-4" /> },
    { type: 'fader', label: 'Fader', icon: <Sliders className="w-4 h-4" /> },
    { type: 'button', label: 'Button', icon: <Square className="w-4 h-4" /> },
    { type: 'encoder', label: 'Encoder', icon: <RotateCcw className="w-4 h-4" /> },
    { type: 'xy-pad', label: 'XY Pad', icon: <Target className="w-4 h-4" /> },
    { type: 'wheel', label: 'Wheel', icon: <Activity className="w-4 h-4" /> },
    { type: 'aftertouch', label: 'Aftertouch', icon: <Mic className="w-4 h-4" /> },
    { type: 'velocity', label: 'Velocity', icon: <Zap className="w-4 h-4" /> }
  ];

  const assignmentModes: { mode: AssignmentMode; label: string; description: string }[] = [
    { mode: 'absolute', label: 'Absolute', description: 'Direct value mapping' },
    { mode: 'relative', label: 'Relative', description: 'Incremental changes' },
    { mode: 'toggle', label: 'Toggle', description: 'On/off switching' },
    { mode: 'trigger', label: 'Trigger', description: 'Momentary activation' },
    { mode: 'scaled', label: 'Scaled', description: 'Custom range mapping' }
  ];

  const controllerCurves: { curve: ControllerCurve; label: string }[] = [
    { curve: 'linear', label: 'Linear' },
    { curve: 'exponential', label: 'Exponential' },
    { curve: 'logarithmic', label: 'Logarithmic' },
    { curve: 'smooth', label: 'Smooth' },
    { curve: 'custom', label: 'Custom' }
  ];

  useEffect(() => {
    loadControllers();

    // Subscribe to automation system events
    automationSystem.on('controller:created', handleControllerCreated);
    automationSystem.on('controller:value', handleControllerValue);
    automationSystem.on('midi:message', handleMIDIMessage);
    automationSystem.on('midi:connected', handleMIDIConnected);

    return () => {
      automationSystem.removeAllListeners();
    };
  }, [automationSystem]);

  const loadControllers = useCallback(() => {
    const allControllers = automationSystem.getAllControllers();
    setControllers(allControllers);
  }, [automationSystem]);

  const handleControllerCreated = useCallback((controller: MIDIController) => {
    setControllers(prev => [...prev, controller]);
  }, []);

  const handleControllerValue = useCallback((targetId: string, parameterId: string, value: number) => {
    onParameterControl?.(targetId, parameterId, value);

    // Update active assignments visualization
    setMappingState(prev => ({
      ...prev,
      activeAssignments: new Map(prev.activeAssignments.set(`${targetId}:${parameterId}`, value))
    }));
  }, [onParameterControl]);

  const handleMIDIMessage = useCallback((message: any) => {
    setMappingState(prev => ({
      ...prev,
      lastMIDIMessage: message
    }));

    // Auto-configure controller if learning
    if (mappingState.isLearning && mappingState.learningControllerId) {
      const controller = controllers.find(c => c.id === mappingState.learningControllerId);
      if (controller && message.messageType === 0xB0) { // CC message
        // Update controller with learned CC number
        setControllers(prev => prev.map(c =>
          c.id === mappingState.learningControllerId
            ? { ...c, ccNumber: message.data1, channel: message.channel }
            : c
        ));

        stopLearning();
      }
    }
  }, [mappingState, controllers]);

  const handleMIDIConnected = useCallback((inputCount: number) => {
    console.log(`MIDI connected: ${inputCount} inputs available`);
  }, []);

  const createController = useCallback(async () => {
    try {
      await automationSystem.createController({
        name: newControllerData.name,
        type: newControllerData.type,
        channel: newControllerData.channel,
        ccNumber: newControllerData.ccNumber,
        minValue: newControllerData.minValue,
        maxValue: newControllerData.maxValue,
        curve: 'linear',
        enabled: true,
        learn: false
      });

      setShowCreateModal(false);
      setNewControllerData({
        name: '',
        type: 'knob',
        channel: 0,
        ccNumber: 1,
        minValue: 0,
        maxValue: 127
      });
    } catch (error) {
      console.error('Failed to create controller:', error);
    }
  }, [automationSystem, newControllerData]);

  const deleteController = useCallback(async (controllerId: string) => {
    if (confirm('Are you sure you want to delete this controller?')) {
      setControllers(prev => prev.filter(c => c.id !== controllerId));
    }
  }, []);

  const createAssignment = useCallback(async () => {
    if (!selectedController) return;

    const assignment = {
      targetId: newAssignmentData.targetId,
      parameterId: newAssignmentData.parameterId,
      mode: newAssignmentData.mode,
      range: [newAssignmentData.rangeMin, newAssignmentData.rangeMax] as [number, number],
      curve: newAssignmentData.curve,
      enabled: true
    };

    await automationSystem.assignController(selectedController, assignment);
    onControllerAssign?.(selectedController, assignment as ControllerAssignment);

    setShowAssignModal(false);
    setNewAssignmentData({
      targetId: '',
      parameterId: '',
      mode: 'absolute',
      rangeMin: 0,
      rangeMax: 1,
      curve: 'linear'
    });
  }, [selectedController, newAssignmentData, automationSystem, onControllerAssign]);

  const removeAssignment = useCallback((controllerId: string, assignmentId: string) => {
    setControllers(prev => prev.map(controller =>
      controller.id === controllerId
        ? {
            ...controller,
            assignments: controller.assignments.filter(a => a.id !== assignmentId)
          }
        : controller
    ));
  }, []);

  const startLearning = useCallback((controllerId: string) => {
    setMappingState(prev => ({
      ...prev,
      isLearning: true,
      learningControllerId: controllerId
    }));
  }, []);

  const stopLearning = useCallback(() => {
    setMappingState(prev => ({
      ...prev,
      isLearning: false,
      learningControllerId: null
    }));
  }, []);

  const getControllerIcon = useCallback((type: ControllerType) => {
    const controllerType = controllerTypes.find(ct => ct.type === type);
    return controllerType?.icon || <Volume2 className="w-4 h-4" />;
  }, []);

  const getControllerTypeLabel = useCallback((type: ControllerType) => {
    const controllerType = controllerTypes.find(ct => ct.type === type);
    return controllerType?.label || type;
  }, []);

  const getModeLabel = useCallback((mode: AssignmentMode) => {
    const assignmentMode = assignmentModes.find(am => am.mode === mode);
    return assignmentMode?.label || mode;
  }, []);

  const formatValue = useCallback((value: number, assignment: ControllerAssignment) => {
    const [min, max] = assignment.range;
    const normalizedValue = (value - min) / (max - min);
    return `${(normalizedValue * 100).toFixed(1)}%`;
  }, []);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold mb-1">MIDI Control Panel</h2>
          <p className="text-gray-400 text-sm">
            {controllers.length} controller{controllers.length !== 1 ? 's' : ''} •
            {controllers.reduce((sum, c) => sum + c.assignments.length, 0)} assignment{controllers.reduce((sum, c) => sum + c.assignments.length, 0) !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Controller</span>
          </button>

          {mappingState.isLearning && (
            <button
              onClick={stopLearning}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Square className="w-4 h-4" />
              <span>Stop Learning</span>
            </button>
          )}
        </div>
      </div>

      {/* MIDI Status */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-medium">MIDI Status</h3>
          {mappingState.isLearning && (
            <div className="flex items-center space-x-2 text-green-400">
              <Activity className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Learning MIDI...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Controllers: {controllers.filter(c => c.enabled).length} active</span>
          </div>
          <div className="flex items-center space-x-2">
            <Link className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">
              Assignments: {controllers.reduce((sum, c) => sum + c.assignments.filter(a => a.enabled).length, 0)} active
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">
              Last MIDI: {mappingState.lastMIDIMessage ? `CC${mappingState.lastMIDIMessage.data1}` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Controllers List */}
      <div className="space-y-4">
        {controllers.map((controller) => (
          <div
            key={controller.id}
            className={`bg-gray-800 rounded-lg p-4 transition-colors ${
              selectedController === controller.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-750'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-lg">
                  {getControllerIcon(controller.type)}
                </div>
                <div>
                  <h4 className="text-white font-medium">{controller.name}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span>{getControllerTypeLabel(controller.type)}</span>
                    <span>•</span>
                    <span>Ch {controller.channel + 1}</span>
                    {controller.ccNumber && (
                      <>
                        <span>•</span>
                        <span>CC{controller.ccNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${controller.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />

                {mappingState.isLearning && mappingState.learningControllerId === controller.id ? (
                  <button
                    onClick={stopLearning}
                    className="p-1 bg-red-600 text-white rounded transition-colors"
                    title="Stop Learning"
                  >
                    <Square className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => startLearning(controller.id)}
                    className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                    title="Learn MIDI"
                  >
                    <Target className="w-3 h-3" />
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedController(controller.id);
                    setShowAssignModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                  title="Add Assignment"
                >
                  <Plus className="w-3 h-3" />
                </button>

                <button
                  onClick={() => deleteController(controller.id)}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete Controller"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Controller Range */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Range</span>
                <span className="text-white">{controller.minValue} - {controller.maxValue}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '50%' }} />
              </div>
            </div>

            {/* Assignments */}
            {controller.assignments.length > 0 && (
              <div>
                <h5 className="text-white font-medium mb-2">
                  Assignments ({controller.assignments.length})
                </h5>
                <div className="space-y-2">
                  {controller.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-2 bg-gray-700 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-white font-medium truncate">
                            {assignment.targetId}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-blue-400">{assignment.parameterId}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                          <span>{getModeLabel(assignment.mode)}</span>
                          <span>{assignment.range[0]} - {assignment.range[1]}</span>
                          <span className="capitalize">{assignment.curve}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {mappingState.activeAssignments.has(`${assignment.targetId}:${assignment.parameterId}`) && (
                          <div className="text-green-400 text-xs">
                            {formatValue(
                              mappingState.activeAssignments.get(`${assignment.targetId}:${assignment.parameterId}`) || 0,
                              assignment
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => {
                            // Toggle assignment enabled state
                            setControllers(prev => prev.map(c =>
                              c.id === controller.id
                                ? {
                                    ...c,
                                    assignments: c.assignments.map(a =>
                                      a.id === assignment.id
                                        ? { ...a, enabled: !a.enabled }
                                        : a
                                    )
                                  }
                                : c
                            ));
                          }}
                          className={`p-1 rounded transition-colors ${
                            assignment.enabled ? 'text-green-400' : 'text-gray-500'
                          }`}
                        >
                          {assignment.enabled ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                        </button>

                        <button
                          onClick={() => removeAssignment(controller.id, assignment.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {controller.assignments.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Target className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">No assignments</p>
                <button
                  onClick={() => {
                    setSelectedController(controller.id);
                    setShowAssignModal(true);
                  }}
                  className="text-blue-400 text-sm hover:text-blue-300 mt-1"
                >
                  Create first assignment
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {controllers.length === 0 && (
        <div className="text-center py-12">
          <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-lg font-semibold mb-2">No MIDI Controllers</h3>
          <p className="text-gray-400 mb-4">Create your first MIDI controller to start automation</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Controller
          </button>
        </div>
      )}

      {/* Create Controller Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Create MIDI Controller</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newControllerData.name}
                  onChange={(e) => setNewControllerData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  placeholder="Enter controller name..."
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Type</label>
                <select
                  value={newControllerData.type}
                  onChange={(e) => setNewControllerData(prev => ({ ...prev, type: e.target.value as ControllerType }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                >
                  {controllerTypes.map(({ type, label }) => (
                    <option key={type} value={type}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">MIDI Channel</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={newControllerData.channel}
                    onChange={(e) => setNewControllerData(prev => ({ ...prev, channel: parseInt(e.target.value) }))}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">CC Number</label>
                  <input
                    type="number"
                    min="0"
                    max="127"
                    value={newControllerData.ccNumber}
                    onChange={(e) => setNewControllerData(prev => ({ ...prev, ccNumber: parseInt(e.target.value) }))}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Min Value</label>
                  <input
                    type="number"
                    value={newControllerData.minValue}
                    onChange={(e) => setNewControllerData(prev => ({ ...prev, minValue: parseFloat(e.target.value) }))}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Max Value</label>
                  <input
                    type="number"
                    value={newControllerData.maxValue}
                    onChange={(e) => setNewControllerData(prev => ({ ...prev, maxValue: parseFloat(e.target.value) }))}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createController}
                disabled={!newControllerData.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create Controller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Create Assignment</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Target ID</label>
                <input
                  type="text"
                  value={newAssignmentData.targetId}
                  onChange={(e) => setNewAssignmentData(prev => ({ ...prev, targetId: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  placeholder="e.g., mixer-channel-1"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Parameter ID</label>
                <input
                  type="text"
                  value={newAssignmentData.parameterId}
                  onChange={(e) => setNewAssignmentData(prev => ({ ...prev, parameterId: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  placeholder="e.g., volume"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Mode</label>
                <select
                  value={newAssignmentData.mode}
                  onChange={(e) => setNewAssignmentData(prev => ({ ...prev, mode: e.target.value as AssignmentMode }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                >
                  {assignmentModes.map(({ mode, label, description }) => (
                    <option key={mode} value={mode} title={description}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Range Min</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAssignmentData.rangeMin}
                    onChange={(e) => setNewAssignmentData(prev => ({ ...prev, rangeMin: parseFloat(e.target.value) }))}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Range Max</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAssignmentData.rangeMax}
                    onChange={(e) => setNewAssignmentData(prev => ({ ...prev, rangeMax: parseFloat(e.target.value) }))}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Curve</label>
                <select
                  value={newAssignmentData.curve}
                  onChange={(e) => setNewAssignmentData(prev => ({ ...prev, curve: e.target.value as ControllerCurve }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                >
                  {controllerCurves.map(({ curve, label }) => (
                    <option key={curve} value={curve}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createAssignment}
                disabled={!newAssignmentData.targetId.trim() || !newAssignmentData.parameterId.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};