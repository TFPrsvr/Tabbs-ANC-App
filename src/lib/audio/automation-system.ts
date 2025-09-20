import { EventEmitter } from 'events';

export interface AutomationLane {
  id: string;
  name: string;
  targetId: string;
  parameterId: string;
  points: AutomationPoint[];
  enabled: boolean;
  mode: AutomationMode;
  color: string;
  visible: boolean;
  locked: boolean;
  height: number;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  unit?: string;
  curve: AutomationCurve;
}

export interface AutomationPoint {
  id: string;
  time: number;
  value: number;
  curve: CurveType;
  tension?: number;
  selected: boolean;
  locked: boolean;
  metadata?: AutomationPointMetadata;
}

export interface AutomationPointMetadata {
  velocity?: number;
  pressure?: number;
  modulation?: number;
  aftertouch?: number;
  controller?: number;
  timestamp: Date;
  source: AutomationSource;
}

export interface AutomationCurve {
  type: CurveType;
  tension: number;
  bias: number;
  continuity: number;
}

export interface AutomationSnapshot {
  id: string;
  name: string;
  description: string;
  lanes: AutomationLane[];
  timestamp: Date;
  author: string;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  lanes: Omit<AutomationLane, 'id' | 'targetId'>[];
  tags: string[];
  author: string;
  createdAt: Date;
}

export interface MIDIController {
  id: string;
  name: string;
  type: ControllerType;
  channel: number;
  ccNumber?: number;
  minValue: number;
  maxValue: number;
  curve: ControllerCurve;
  enabled: boolean;
  learn: boolean;
  assignments: ControllerAssignment[];
}

export interface ControllerAssignment {
  id: string;
  targetId: string;
  parameterId: string;
  mode: AssignmentMode;
  range: [number, number];
  curve: ControllerCurve;
  enabled: boolean;
}

export interface AutomationPlayhead {
  position: number;
  isPlaying: boolean;
  isRecording: boolean;
  loopStart?: number;
  loopEnd?: number;
  snapToGrid: boolean;
  gridResolution: number;
}

export type AutomationMode =
  | 'read'
  | 'write'
  | 'touch'
  | 'latch'
  | 'trim'
  | 'off';

export type CurveType =
  | 'linear'
  | 'exponential'
  | 'logarithmic'
  | 'smooth'
  | 'stepped'
  | 'bezier'
  | 'spline'
  | 'hold';

export type AutomationSource =
  | 'manual'
  | 'midi-controller'
  | 'midi-keyboard'
  | 'mouse'
  | 'touch'
  | 'external'
  | 'automated';

export type ControllerType =
  | 'knob'
  | 'fader'
  | 'button'
  | 'encoder'
  | 'xy-pad'
  | 'wheel'
  | 'aftertouch'
  | 'velocity';

export type AssignmentMode =
  | 'absolute'
  | 'relative'
  | 'toggle'
  | 'trigger'
  | 'scaled';

export type ControllerCurve =
  | 'linear'
  | 'exponential'
  | 'logarithmic'
  | 'smooth'
  | 'custom';

export class AutomationSystem extends EventEmitter {
  private lanes: Map<string, AutomationLane> = new Map();
  private controllers: Map<string, MIDIController> = new Map();
  private snapshots: Map<string, AutomationSnapshot> = new Map();
  private templates: Map<string, AutomationTemplate> = new Map();
  private playhead: AutomationPlayhead;
  private recordingLanes: Set<string> = new Set();
  private midiAccess: MIDIAccess | null = null;
  private activeControllers: Map<string, any> = new Map();

  constructor() {
    super();
    this.playhead = {
      position: 0,
      isPlaying: false,
      isRecording: false,
      snapToGrid: true,
      gridResolution: 0.25
    };
    this.initializeMIDI();
  }

  // Automation Lane Management
  async createLane(laneData: Omit<AutomationLane, 'id' | 'points'>): Promise<AutomationLane> {
    const lane: AutomationLane = {
      ...laneData,
      id: `lane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: []
    };

    this.lanes.set(lane.id, lane);
    this.emit('lane:created', lane);

    return lane;
  }

  async updateLane(laneId: string, updates: Partial<AutomationLane>): Promise<AutomationLane | null> {
    const lane = this.lanes.get(laneId);
    if (!lane) return null;

    const updatedLane = { ...lane, ...updates };
    this.lanes.set(laneId, updatedLane);
    this.emit('lane:updated', updatedLane);

    return updatedLane;
  }

  async deleteLane(laneId: string): Promise<boolean> {
    const lane = this.lanes.get(laneId);
    if (!lane) return false;

    this.lanes.delete(laneId);
    this.recordingLanes.delete(laneId);
    this.emit('lane:deleted', laneId);

    return true;
  }

  getLane(laneId: string): AutomationLane | null {
    return this.lanes.get(laneId) || null;
  }

  getAllLanes(): AutomationLane[] {
    return Array.from(this.lanes.values());
  }

  getLanesForTarget(targetId: string): AutomationLane[] {
    return Array.from(this.lanes.values())
      .filter(lane => lane.targetId === targetId);
  }

  // Automation Point Management
  async addPoint(laneId: string, pointData: Omit<AutomationPoint, 'id' | 'selected' | 'locked'>): Promise<AutomationPoint | null> {
    const lane = this.lanes.get(laneId);
    if (!lane) return null;

    const point: AutomationPoint = {
      ...pointData,
      id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      selected: false,
      locked: false
    };

    // Insert point in chronological order
    const insertIndex = lane.points.findIndex(p => p.time > point.time);
    if (insertIndex === -1) {
      lane.points.push(point);
    } else {
      lane.points.splice(insertIndex, 0, point);
    }

    this.emit('point:added', laneId, point);
    return point;
  }

  async updatePoint(laneId: string, pointId: string, updates: Partial<AutomationPoint>): Promise<AutomationPoint | null> {
    const lane = this.lanes.get(laneId);
    if (!lane) return null;

    const pointIndex = lane.points.findIndex(p => p.id === pointId);
    if (pointIndex === -1) return null;

    const updatedPoint = { ...lane.points[pointIndex], ...updates };
    lane.points[pointIndex] = updatedPoint;

    // Re-sort if time changed
    if (updates.time !== undefined) {
      lane.points.sort((a, b) => a.time - b.time);
    }

    this.emit('point:updated', laneId, updatedPoint);
    return updatedPoint;
  }

  async removePoint(laneId: string, pointId: string): Promise<boolean> {
    const lane = this.lanes.get(laneId);
    if (!lane) return false;

    const pointIndex = lane.points.findIndex(p => p.id === pointId);
    if (pointIndex === -1) return false;

    lane.points.splice(pointIndex, 1);
    this.emit('point:removed', laneId, pointId);

    return true;
  }

  async removeSelectedPoints(laneId: string): Promise<number> {
    const lane = this.lanes.get(laneId);
    if (!lane) return 0;

    const initialLength = lane.points.length;
    lane.points = lane.points.filter(point => !point.selected);
    const removedCount = initialLength - lane.points.length;

    if (removedCount > 0) {
      this.emit('points:removed', laneId, removedCount);
    }

    return removedCount;
  }

  // Point Selection and Manipulation
  selectPointsInRegion(laneId: string, startTime: number, endTime: number, startValue?: number, endValue?: number): number {
    const lane = this.lanes.get(laneId);
    if (!lane) return 0;

    let selectedCount = 0;

    lane.points.forEach(point => {
      const inTimeRange = point.time >= startTime && point.time <= endTime;
      const inValueRange = startValue === undefined || endValue === undefined ||
        (point.value >= Math.min(startValue, endValue) && point.value <= Math.max(startValue, endValue));

      if (inTimeRange && inValueRange) {
        point.selected = true;
        selectedCount++;
      }
    });

    if (selectedCount > 0) {
      this.emit('points:selected', laneId, selectedCount);
    }

    return selectedCount;
  }

  clearSelection(laneId?: string): void {
    if (laneId) {
      const lane = this.lanes.get(laneId);
      if (lane) {
        lane.points.forEach(point => { point.selected = false; });
        this.emit('selection:cleared', laneId);
      }
    } else {
      this.lanes.forEach((lane, id) => {
        lane.points.forEach(point => { point.selected = false; });
      });
      this.emit('selection:cleared:all');
    }
  }

  moveSelectedPoints(laneId: string, deltaTime: number, deltaValue: number): boolean {
    const lane = this.lanes.get(laneId);
    if (!lane) return false;

    const selectedPoints = lane.points.filter(point => point.selected);
    if (selectedPoints.length === 0) return false;

    selectedPoints.forEach(point => {
      point.time = Math.max(0, point.time + deltaTime);
      point.value = Math.max(lane.minValue, Math.min(lane.maxValue, point.value + deltaValue));
    });

    // Re-sort points by time
    lane.points.sort((a, b) => a.time - b.time);

    this.emit('points:moved', laneId, selectedPoints.length);
    return true;
  }

  // Value Interpolation and Playback
  getValueAtTime(laneId: string, time: number): number {
    const lane = this.lanes.get(laneId);
    if (!lane || !lane.enabled || lane.points.length === 0) {
      return lane?.defaultValue || 0;
    }

    // Find surrounding points
    const pointsBefore = lane.points.filter(p => p.time <= time);
    const pointsAfter = lane.points.filter(p => p.time > time);

    if (pointsBefore.length === 0) {
      return pointsAfter[0]?.value || lane.defaultValue;
    }

    if (pointsAfter.length === 0) {
      return pointsBefore[pointsBefore.length - 1].value;
    }

    const beforePoint = pointsBefore[pointsBefore.length - 1];
    const afterPoint = pointsAfter[0];

    // Interpolate based on curve type
    return this.interpolateValue(beforePoint, afterPoint, time);
  }

  private interpolateValue(pointA: AutomationPoint, pointB: AutomationPoint, time: number): number {
    const timeDelta = pointB.time - pointA.time;
    const valueDelta = pointB.value - pointA.value;
    const normalizedTime = (time - pointA.time) / timeDelta;

    switch (pointA.curve) {
      case 'linear':
        return pointA.value + valueDelta * normalizedTime;

      case 'exponential':
        return pointA.value + valueDelta * (normalizedTime * normalizedTime);

      case 'logarithmic':
        return pointA.value + valueDelta * Math.sqrt(normalizedTime);

      case 'smooth':
        const smoothed = normalizedTime * normalizedTime * (3 - 2 * normalizedTime);
        return pointA.value + valueDelta * smoothed;

      case 'stepped':
        return normalizedTime < 1 ? pointA.value : pointB.value;

      case 'hold':
        return pointA.value;

      case 'bezier':
        const tension = pointA.tension || 0.5;
        const bezier = this.cubicBezier(normalizedTime, 0, tension, 1 - tension, 1);
        return pointA.value + valueDelta * bezier;

      default:
        return pointA.value + valueDelta * normalizedTime;
    }
  }

  private cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const oneMinusT = 1 - t;
    return oneMinusT * oneMinusT * oneMinusT * p0 +
           3 * oneMinusT * oneMinusT * t * p1 +
           3 * oneMinusT * t * t * p2 +
           t * t * t * p3;
  }

  // Playback and Recording
  async startPlayback(): Promise<void> {
    this.playhead.isPlaying = true;
    this.emit('playback:started');
    this.updatePlayhead();
  }

  async stopPlayback(): Promise<void> {
    this.playhead.isPlaying = false;
    this.playhead.isRecording = false;
    this.recordingLanes.clear();
    this.emit('playback:stopped');
  }

  async pausePlayback(): Promise<void> {
    this.playhead.isPlaying = false;
    this.emit('playback:paused');
  }

  setPlayheadPosition(position: number): void {
    this.playhead.position = Math.max(0, position);
    if (this.playhead.snapToGrid) {
      this.playhead.position = Math.round(this.playhead.position / this.playhead.gridResolution) * this.playhead.gridResolution;
    }
    this.emit('playhead:moved', this.playhead.position);
  }

  async startRecording(laneIds: string[] = []): Promise<void> {
    this.playhead.isRecording = true;

    if (laneIds.length > 0) {
      laneIds.forEach(id => this.recordingLanes.add(id));
    } else {
      // Record on all enabled lanes
      this.lanes.forEach((lane, id) => {
        if (lane.enabled && lane.mode !== 'read' && lane.mode !== 'off') {
          this.recordingLanes.add(id);
        }
      });
    }

    this.emit('recording:started', Array.from(this.recordingLanes));
  }

  async stopRecording(): Promise<void> {
    this.playhead.isRecording = false;
    const recordedLanes = Array.from(this.recordingLanes);
    this.recordingLanes.clear();
    this.emit('recording:stopped', recordedLanes);
  }

  private updatePlayhead(): void {
    if (!this.playhead.isPlaying) return;

    // Simulate time progression (in a real implementation, this would be synced to audio clock)
    const timeStep = 1 / 60; // 60fps updates
    this.playhead.position += timeStep;

    // Check for loop boundaries
    if (this.playhead.loopStart !== undefined && this.playhead.loopEnd !== undefined) {
      if (this.playhead.position >= this.playhead.loopEnd) {
        this.playhead.position = this.playhead.loopStart;
      }
    }

    // Update automation values
    this.lanes.forEach((lane, laneId) => {
      if (lane.enabled && lane.mode === 'read') {
        const value = this.getValueAtTime(laneId, this.playhead.position);
        this.emit('automation:value', laneId, lane.targetId, lane.parameterId, value);
      }
    });

    this.emit('playhead:update', this.playhead.position);

    if (this.playhead.isPlaying) {
      requestAnimationFrame(() => this.updatePlayhead());
    }
  }

  // MIDI Controller Management
  async initializeMIDI(): Promise<void> {
    try {
      this.midiAccess = await navigator.requestMIDIAccess();

      this.midiAccess.inputs.forEach((input) => {
        input.onmidimessage = (event) => this.handleMIDIMessage(event);
      });

      this.emit('midi:connected', this.midiAccess.inputs.size);
    } catch (error) {
      console.warn('MIDI access not available:', error);
    }
  }

  async createController(controllerData: Omit<MIDIController, 'id' | 'assignments'>): Promise<MIDIController> {
    const controller: MIDIController = {
      ...controllerData,
      id: `controller-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assignments: []
    };

    this.controllers.set(controller.id, controller);
    this.emit('controller:created', controller);

    return controller;
  }

  async assignController(controllerId: string, assignment: Omit<ControllerAssignment, 'id'>): Promise<boolean> {
    const controller = this.controllers.get(controllerId);
    if (!controller) return false;

    const newAssignment: ControllerAssignment = {
      ...assignment,
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    controller.assignments.push(newAssignment);
    this.emit('controller:assigned', controllerId, newAssignment);

    return true;
  }

  private handleMIDIMessage(event: MIDIMessageEvent): void {
    const [status, data1, data2] = event.data!;
    const messageType = status & 0xF0;
    const channel = status & 0x0F;

    // Handle CC messages
    if (messageType === 0xB0) {
      const ccNumber = data1;
      const value = data2;

      this.controllers.forEach((controller) => {
        if (controller.enabled && controller.channel === channel && controller.ccNumber === ccNumber) {
          this.handleControllerInput(controller, value);
        }
      });
    }

    this.emit('midi:message', { status, data1, data2, channel, messageType });
  }

  private handleControllerInput(controller: MIDIController, midiValue: number): void {
    // Convert MIDI value (0-127) to controller range
    const normalizedValue = midiValue / 127;
    const controllerValue = controller.minValue + normalizedValue * (controller.maxValue - controller.minValue);

    // Apply controller curve
    const curvedValue = this.applyControllerCurve(normalizedValue, controller.curve);
    const finalValue = controller.minValue + curvedValue * (controller.maxValue - controller.minValue);

    // Update assigned parameters
    controller.assignments.forEach((assignment) => {
      if (assignment.enabled) {
        const [rangeMin, rangeMax] = assignment.range;
        const scaledValue = rangeMin + (finalValue - controller.minValue) / (controller.maxValue - controller.minValue) * (rangeMax - rangeMin);

        // Record automation if recording is active
        if (this.playhead.isRecording) {
          const lane = Array.from(this.lanes.values()).find(l =>
            l.targetId === assignment.targetId && l.parameterId === assignment.parameterId
          );

          if (lane && this.recordingLanes.has(lane.id)) {
            this.addPoint(lane.id, {
              time: this.playhead.position,
              value: scaledValue,
              curve: 'linear',
              metadata: {
                source: 'midi-controller',
                controller: parseInt(controller.ccNumber?.toString() || '0'),
                timestamp: new Date()
              }
            });
          }
        }

        this.emit('controller:value', assignment.targetId, assignment.parameterId, scaledValue);
      }
    });
  }

  private applyControllerCurve(value: number, curve: ControllerCurve): number {
    switch (curve) {
      case 'linear':
        return value;
      case 'exponential':
        return value * value;
      case 'logarithmic':
        return Math.sqrt(value);
      case 'smooth':
        return value * value * (3 - 2 * value);
      default:
        return value;
    }
  }

  // Snapshots and Templates
  async createSnapshot(name: string, description: string): Promise<AutomationSnapshot> {
    const snapshot: AutomationSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      lanes: Array.from(this.lanes.values()).map(lane => ({ ...lane })),
      timestamp: new Date(),
      author: 'system'
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.emit('snapshot:created', snapshot);

    return snapshot;
  }

  async loadSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    // Clear current lanes
    this.lanes.clear();

    // Load snapshot lanes
    snapshot.lanes.forEach(lane => {
      this.lanes.set(lane.id, { ...lane });
    });

    this.emit('snapshot:loaded', snapshot);
    return true;
  }

  async createTemplate(name: string, description: string, category: string, laneIds: string[]): Promise<AutomationTemplate> {
    const selectedLanes = laneIds.map(id => this.lanes.get(id)).filter(Boolean) as AutomationLane[];

    const template: AutomationTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      lanes: selectedLanes.map(({ id, targetId, ...lane }) => lane),
      tags: [],
      author: 'system',
      createdAt: new Date()
    };

    this.templates.set(template.id, template);
    this.emit('template:created', template);

    return template;
  }

  // Utility Methods
  quantizePoints(laneId: string, gridResolution: number): number {
    const lane = this.lanes.get(laneId);
    if (!lane) return 0;

    let quantizedCount = 0;

    lane.points.forEach(point => {
      const quantizedTime = Math.round(point.time / gridResolution) * gridResolution;
      if (point.time !== quantizedTime) {
        point.time = quantizedTime;
        quantizedCount++;
      }
    });

    if (quantizedCount > 0) {
      lane.points.sort((a, b) => a.time - b.time);
      this.emit('points:quantized', laneId, quantizedCount);
    }

    return quantizedCount;
  }

  smoothPoints(laneId: string, strength: number = 0.5): boolean {
    const lane = this.lanes.get(laneId);
    if (!lane || lane.points.length < 3) return false;

    for (let i = 1; i < lane.points.length - 1; i++) {
      const prevPoint = lane.points[i - 1];
      const currentPoint = lane.points[i];
      const nextPoint = lane.points[i + 1];

      const averageValue = (prevPoint.value + currentPoint.value + nextPoint.value) / 3;
      currentPoint.value = currentPoint.value * (1 - strength) + averageValue * strength;
    }

    this.emit('points:smoothed', laneId);
    return true;
  }

  getPlayheadState(): AutomationPlayhead {
    return { ...this.playhead };
  }

  getAllControllers(): MIDIController[] {
    return Array.from(this.controllers.values());
  }

  getAllSnapshots(): AutomationSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  getAllTemplates(): AutomationTemplate[] {
    return Array.from(this.templates.values());
  }
}