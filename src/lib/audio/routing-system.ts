import { EventEmitter } from 'events';

export interface AudioRoute {
  id: string;
  name: string;
  sourceId: string;
  targetId: string;
  sourceOutput: number;
  targetInput: number;
  gain: number;
  enabled: boolean;
  stereoLink: boolean;
  inverted: boolean;
  delay: number;
  filterType?: FilterType;
  filterFrequency?: number;
  filterQ?: number;
  metadata: RouteMetadata;
}

export interface AudioBus {
  id: string;
  name: string;
  type: BusType;
  channels: number;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  inputs: BusInput[];
  outputs: BusOutput[];
  effects: string[];
  sends: BusSend[];
  automation: AutomationLane[];
  groupId?: string;
  metadata: BusMetadata;
}

export interface BusInput {
  id: string;
  name: string;
  channel: number;
  gain: number;
  enabled: boolean;
  sourceType: 'hardware' | 'virtual' | 'plugin';
  sourceId?: string;
}

export interface BusOutput {
  id: string;
  name: string;
  channel: number;
  gain: number;
  enabled: boolean;
  targetType: 'hardware' | 'virtual' | 'plugin';
  targetId?: string;
}

export interface BusSend {
  id: string;
  targetBusId: string;
  level: number;
  enabled: boolean;
  preFader: boolean;
  soloSafe: boolean;
}

export interface AutomationLane {
  id: string;
  parameter: string;
  points: AutomationPoint[];
  enabled: boolean;
  mode: AutomationMode;
  color: string;
}

export interface AutomationPoint {
  time: number;
  value: number;
  curve: CurveType;
  locked: boolean;
}

export interface RouteMetadata {
  createdAt: Date;
  createdBy: string;
  description?: string;
  tags: string[];
  color?: string;
}

export interface BusMetadata {
  createdAt: Date;
  createdBy: string;
  description?: string;
  tags: string[];
  hardware?: HardwareMapping;
}

export interface HardwareMapping {
  deviceId: string;
  deviceName: string;
  inputChannels: number[];
  outputChannels: number[];
}

export type BusType =
  | 'input'
  | 'output'
  | 'aux'
  | 'group'
  | 'vca'
  | 'matrix'
  | 'monitor'
  | 'headphone'
  | 'foldback'
  | 'talkback';

export type FilterType =
  | 'highpass'
  | 'lowpass'
  | 'bandpass'
  | 'bandstop'
  | 'allpass'
  | 'shelf-high'
  | 'shelf-low'
  | 'peaking';

export type AutomationMode =
  | 'read'
  | 'write'
  | 'touch'
  | 'latch'
  | 'trim';

export type CurveType =
  | 'linear'
  | 'exponential'
  | 'logarithmic'
  | 'smooth'
  | 'stepped'
  | 'bezier';

export interface RoutingMatrix {
  inputs: AudioBus[];
  outputs: AudioBus[];
  routes: AudioRoute[];
  groups: BusGroup[];
}

export interface BusGroup {
  id: string;
  name: string;
  busIds: string[];
  volume: number;
  muted: boolean;
  solo: boolean;
  color: string;
}

export interface RoutingSnapshot {
  id: string;
  name: string;
  description: string;
  matrix: RoutingMatrix;
  timestamp: Date;
  author: string;
}

export class AudioRoutingSystem extends EventEmitter {
  private buses: Map<string, AudioBus> = new Map();
  private routes: Map<string, AudioRoute> = new Map();
  private groups: Map<string, BusGroup> = new Map();
  private snapshots: Map<string, RoutingSnapshot> = new Map();
  private audioContext: AudioContext | null = null;
  private gainNodes: Map<string, GainNode> = new Map();
  private panNodes: Map<string, StereoPannerNode> = new Map();
  private filterNodes: Map<string, BiquadFilterNode> = new Map();
  private delayNodes: Map<string, DelayNode> = new Map();

  constructor(audioContext?: AudioContext) {
    super();
    this.audioContext = audioContext || null;
    this.initializeDefaultBuses();
  }

  // Bus Management
  async createBus(busData: Omit<AudioBus, 'id' | 'metadata'>): Promise<AudioBus> {
    const bus: AudioBus = {
      ...busData,
      id: `bus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        createdAt: new Date(),
        createdBy: 'system',
        tags: []
      }
    };

    this.buses.set(bus.id, bus);
    await this.createBusNodes(bus);
    this.emit('bus:created', bus);

    return bus;
  }

  async updateBus(busId: string, updates: Partial<AudioBus>): Promise<AudioBus | null> {
    const bus = this.buses.get(busId);
    if (!bus) return null;

    const updatedBus = { ...bus, ...updates };
    this.buses.set(busId, updatedBus);
    await this.updateBusNodes(updatedBus);
    this.emit('bus:updated', updatedBus);

    return updatedBus;
  }

  async deleteBus(busId: string): Promise<boolean> {
    const bus = this.buses.get(busId);
    if (!bus) return false;

    // Remove all routes connected to this bus
    const connectedRoutes = Array.from(this.routes.values())
      .filter(route => route.sourceId === busId || route.targetId === busId);

    for (const route of connectedRoutes) {
      await this.deleteRoute(route.id);
    }

    // Remove bus from groups
    this.groups.forEach(group => {
      if (group.busIds.includes(busId)) {
        group.busIds = group.busIds.filter(id => id !== busId);
      }
    });

    this.buses.delete(busId);
    this.destroyBusNodes(busId);
    this.emit('bus:deleted', busId);

    return true;
  }

  getBus(busId: string): AudioBus | null {
    return this.buses.get(busId) || null;
  }

  getAllBuses(): AudioBus[] {
    return Array.from(this.buses.values());
  }

  getBusesByType(type: BusType): AudioBus[] {
    return Array.from(this.buses.values()).filter(bus => bus.type === type);
  }

  // Routing Management
  async createRoute(routeData: Omit<AudioRoute, 'id' | 'metadata'>): Promise<AudioRoute> {
    // Validate route
    if (!this.buses.has(routeData.sourceId) || !this.buses.has(routeData.targetId)) {
      throw new Error('Source or target bus not found');
    }

    // Check for routing loops
    if (this.wouldCreateLoop(routeData.sourceId, routeData.targetId)) {
      throw new Error('Route would create a feedback loop');
    }

    const route: AudioRoute = {
      ...routeData,
      id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        createdAt: new Date(),
        createdBy: 'system',
        tags: []
      }
    };

    this.routes.set(route.id, route);
    await this.createRouteConnections(route);
    this.emit('route:created', route);

    return route;
  }

  async updateRoute(routeId: string, updates: Partial<AudioRoute>): Promise<AudioRoute | null> {
    const route = this.routes.get(routeId);
    if (!route) return null;

    const updatedRoute = { ...route, ...updates };

    // Re-validate if source or target changed
    if (updates.sourceId || updates.targetId) {
      if (this.wouldCreateLoop(updatedRoute.sourceId, updatedRoute.targetId)) {
        throw new Error('Route update would create a feedback loop');
      }
    }

    this.routes.set(routeId, updatedRoute);
    await this.updateRouteConnections(updatedRoute);
    this.emit('route:updated', updatedRoute);

    return updatedRoute;
  }

  async deleteRoute(routeId: string): Promise<boolean> {
    const route = this.routes.get(routeId);
    if (!route) return false;

    this.routes.delete(routeId);
    this.destroyRouteConnections(routeId);
    this.emit('route:deleted', routeId);

    return true;
  }

  getRoute(routeId: string): AudioRoute | null {
    return this.routes.get(routeId) || null;
  }

  getAllRoutes(): AudioRoute[] {
    return Array.from(this.routes.values());
  }

  getRoutesForBus(busId: string): AudioRoute[] {
    return Array.from(this.routes.values())
      .filter(route => route.sourceId === busId || route.targetId === busId);
  }

  // Group Management
  async createGroup(groupData: Omit<BusGroup, 'id'>): Promise<BusGroup> {
    const group: BusGroup = {
      ...groupData,
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.groups.set(group.id, group);
    this.emit('group:created', group);

    return group;
  }

  async updateGroup(groupId: string, updates: Partial<BusGroup>): Promise<BusGroup | null> {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const updatedGroup = { ...group, ...updates };
    this.groups.set(groupId, updatedGroup);
    this.emit('group:updated', updatedGroup);

    return updatedGroup;
  }

  async deleteGroup(groupId: string): Promise<boolean> {
    const group = this.groups.get(groupId);
    if (!group) return false;

    // Remove group reference from buses
    group.busIds.forEach(busId => {
      const bus = this.buses.get(busId);
      if (bus) {
        bus.groupId = undefined;
      }
    });

    this.groups.delete(groupId);
    this.emit('group:deleted', groupId);

    return true;
  }

  // Automation
  async addAutomationPoint(busId: string, laneId: string, point: Omit<AutomationPoint, 'locked'>): Promise<boolean> {
    const bus = this.buses.get(busId);
    if (!bus) return false;

    const lane = bus.automation.find(l => l.id === laneId);
    if (!lane) return false;

    const newPoint: AutomationPoint = { ...point, locked: false };

    // Insert point in chronological order
    const insertIndex = lane.points.findIndex(p => p.time > newPoint.time);
    if (insertIndex === -1) {
      lane.points.push(newPoint);
    } else {
      lane.points.splice(insertIndex, 0, newPoint);
    }

    this.emit('automation:point:added', busId, laneId, newPoint);
    return true;
  }

  async removeAutomationPoint(busId: string, laneId: string, pointIndex: number): Promise<boolean> {
    const bus = this.buses.get(busId);
    if (!bus) return false;

    const lane = bus.automation.find(l => l.id === laneId);
    if (!lane || pointIndex < 0 || pointIndex >= lane.points.length) return false;

    lane.points.splice(pointIndex, 1);
    this.emit('automation:point:removed', busId, laneId, pointIndex);
    return true;
  }

  // Snapshot Management
  async createSnapshot(name: string, description: string): Promise<RoutingSnapshot> {
    const snapshot: RoutingSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      matrix: {
        inputs: this.getBusesByType('input'),
        outputs: this.getBusesByType('output'),
        routes: this.getAllRoutes(),
        groups: Array.from(this.groups.values())
      },
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

    // Clear current routing
    this.routes.clear();
    this.groups.clear();

    // Load snapshot data
    for (const route of snapshot.matrix.routes) {
      await this.createRoute(route);
    }

    for (const group of snapshot.matrix.groups) {
      await this.createGroup(group);
    }

    this.emit('snapshot:loaded', snapshot);
    return true;
  }

  // Matrix Operations
  getRoutingMatrix(): RoutingMatrix {
    return {
      inputs: this.getBusesByType('input'),
      outputs: this.getBusesByType('output'),
      routes: this.getAllRoutes(),
      groups: Array.from(this.groups.values())
    };
  }

  async clearAllRoutes(): Promise<void> {
    const routeIds = Array.from(this.routes.keys());
    for (const routeId of routeIds) {
      await this.deleteRoute(routeId);
    }
  }

  // Utility Methods
  private wouldCreateLoop(sourceId: string, targetId: string, visited: Set<string> = new Set()): boolean {
    if (sourceId === targetId) return true;
    if (visited.has(sourceId)) return true;

    visited.add(sourceId);

    const downstreamRoutes = Array.from(this.routes.values())
      .filter(route => route.sourceId === sourceId && route.enabled);

    for (const route of downstreamRoutes) {
      if (this.wouldCreateLoop(route.targetId, targetId, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  private async createBusNodes(bus: AudioBus): Promise<void> {
    if (!this.audioContext) return;

    const gainNode = this.audioContext.createGain();
    const panNode = this.audioContext.createStereoPanner();

    gainNode.gain.value = bus.volume;
    panNode.pan.value = bus.pan;

    gainNode.connect(panNode);

    this.gainNodes.set(bus.id, gainNode);
    this.panNodes.set(bus.id, panNode);
  }

  private async updateBusNodes(bus: AudioBus): Promise<void> {
    const gainNode = this.gainNodes.get(bus.id);
    const panNode = this.panNodes.get(bus.id);

    if (gainNode) {
      gainNode.gain.value = bus.muted ? 0 : bus.volume;
    }

    if (panNode) {
      panNode.pan.value = bus.pan;
    }
  }

  private destroyBusNodes(busId: string): void {
    const gainNode = this.gainNodes.get(busId);
    const panNode = this.panNodes.get(busId);
    const filterNode = this.filterNodes.get(busId);
    const delayNode = this.delayNodes.get(busId);

    if (gainNode) {
      gainNode.disconnect();
      this.gainNodes.delete(busId);
    }

    if (panNode) {
      panNode.disconnect();
      this.panNodes.delete(busId);
    }

    if (filterNode) {
      filterNode.disconnect();
      this.filterNodes.delete(busId);
    }

    if (delayNode) {
      delayNode.disconnect();
      this.delayNodes.delete(busId);
    }
  }

  private async createRouteConnections(route: AudioRoute): Promise<void> {
    if (!this.audioContext) return;

    const sourceGain = this.gainNodes.get(route.sourceId);
    const targetGain = this.gainNodes.get(route.targetId);

    if (!sourceGain || !targetGain) return;

    // Create route-specific gain node
    const routeGain = this.audioContext.createGain();
    routeGain.gain.value = route.enabled ? route.gain : 0;

    let currentNode: AudioNode = sourceGain;

    // Add filter if specified
    if (route.filterType && route.filterFrequency) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = route.filterType as BiquadFilterType;
      filter.frequency.value = route.filterFrequency;
      if (route.filterQ) {
        filter.Q.value = route.filterQ;
      }

      currentNode.connect(filter);
      currentNode = filter;
      this.filterNodes.set(route.id, filter);
    }

    // Add delay if specified
    if (route.delay > 0) {
      const delay = this.audioContext.createDelay();
      delay.delayTime.value = route.delay / 1000; // Convert ms to seconds

      currentNode.connect(delay);
      currentNode = delay;
      this.delayNodes.set(route.id, delay);
    }

    // Connect to route gain and then to target
    currentNode.connect(routeGain);
    routeGain.connect(targetGain);

    this.gainNodes.set(route.id, routeGain);
  }

  private async updateRouteConnections(route: AudioRoute): Promise<void> {
    const routeGain = this.gainNodes.get(route.id);
    if (routeGain) {
      routeGain.gain.value = route.enabled ? route.gain : 0;
    }

    const filterNode = this.filterNodes.get(route.id);
    if (filterNode && route.filterFrequency) {
      filterNode.frequency.value = route.filterFrequency;
      if (route.filterQ) {
        filterNode.Q.value = route.filterQ;
      }
    }

    const delayNode = this.delayNodes.get(route.id);
    if (delayNode && route.delay) {
      delayNode.delayTime.value = route.delay / 1000;
    }
  }

  private destroyRouteConnections(routeId: string): void {
    const routeGain = this.gainNodes.get(routeId);
    const filterNode = this.filterNodes.get(routeId);
    const delayNode = this.delayNodes.get(routeId);

    if (routeGain) {
      routeGain.disconnect();
      this.gainNodes.delete(routeId);
    }

    if (filterNode) {
      filterNode.disconnect();
      this.filterNodes.delete(routeId);
    }

    if (delayNode) {
      delayNode.disconnect();
      this.delayNodes.delete(routeId);
    }
  }

  private initializeDefaultBuses(): void {
    // Create default buses
    const defaultBuses = [
      {
        name: 'Main L/R',
        type: 'output' as BusType,
        channels: 2,
        color: '#ff0000',
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
        inputs: [],
        outputs: [],
        effects: [],
        sends: [],
        automation: []
      },
      {
        name: 'Monitor',
        type: 'monitor' as BusType,
        channels: 2,
        color: '#00ff00',
        volume: 0.7,
        pan: 0,
        muted: false,
        solo: false,
        inputs: [],
        outputs: [],
        effects: [],
        sends: [],
        automation: []
      }
    ];

    defaultBuses.forEach(busData => {
      this.createBus(busData);
    });
  }
}