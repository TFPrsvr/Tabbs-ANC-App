import { EventEmitter } from 'events';

// Core collaboration interfaces
export interface CollaborationSession {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  participants: Participant[];
  audioProject: AudioProject;
  settings: SessionSettings;
  status: 'active' | 'paused' | 'ended';
  version: number;
}

export interface Participant {
  id: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer' | 'guest';
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  cursor?: CursorPosition;
  selection?: TimeRange;
  permissions: ParticipantPermissions;
  latency: number; // milliseconds
  audioQuality: 'low' | 'medium' | 'high' | 'lossless';
}

export interface ParticipantPermissions {
  canEdit: boolean;
  canRecord: boolean;
  canPlayback: boolean;
  canExport: boolean;
  canInvite: boolean;
  canChangeSettings: boolean;
  canDeleteTracks: boolean;
  canMute: boolean;
  canSolo: boolean;
}

export interface CursorPosition {
  timestamp: number; // seconds
  trackId?: string;
  x: number; // pixel position
  y: number; // pixel position
}

export interface TimeRange {
  start: number; // seconds
  end: number; // seconds
  trackId?: string;
}

export interface AudioProject {
  id: string;
  name: string;
  sampleRate: number;
  bitDepth: 16 | 24 | 32;
  tempo: number;
  timeSignature: [number, number];
  tracks: Track[];
  markers: Marker[];
  regions: Region[];
  masterBus: MasterBus;
  version: number;
  lastModified: Date;
}

export interface Track {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'instrument' | 'bus';
  color: string;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  volume: number; // -Infinity to +12 dB
  pan: number; // -1 to 1
  clips: AudioClip[];
  effects: Effect[];
  automation: AutomationLane[];
  lockedBy?: string; // participant ID
  lastModified: Date;
}

export interface AudioClip {
  id: string;
  name: string;
  startTime: number; // seconds
  duration: number; // seconds
  offset: number; // seconds into source file
  gain: number; // dB
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  reversed: boolean;
  pitched: number; // semitones
  timeStretched: number; // ratio
  audioData?: Float32Array[];
  waveformData?: WaveformData;
  lockedBy?: string;
}

export interface WaveformData {
  peaks: Float32Array;
  length: number;
  sampleRate: number;
  samplesPerPixel: number;
}

export interface Effect {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  parameters: Map<string, number>;
  preset?: string;
}

export interface AutomationLane {
  id: string;
  parameter: string;
  points: AutomationPoint[];
  enabled: boolean;
}

export interface AutomationPoint {
  time: number; // seconds
  value: number;
  curve: 'linear' | 'exponential' | 'logarithmic';
}

export interface Marker {
  id: string;
  name: string;
  time: number; // seconds
  color: string;
}

export interface Region {
  id: string;
  name: string;
  start: number; // seconds
  end: number; // seconds
  color: string;
  loop: boolean;
}

export interface MasterBus {
  volume: number;
  effects: Effect[];
  limitEnabled: boolean;
  limitThreshold: number;
}

export interface SessionSettings {
  sampleRate: number;
  bufferSize: 128 | 256 | 512 | 1024;
  latencyCompensation: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  clickTrack: boolean;
  countIn: number; // bars
  recordingMode: 'overdub' | 'replace' | 'punch';
  monitoring: 'auto' | 'always' | 'never';
  qualityMode: 'realtime' | 'high_quality';
  collaboration: CollaborationSettings;
}

export interface CollaborationSettings {
  allowGuests: boolean;
  requireApproval: boolean;
  maxParticipants: number;
  audioStreaming: boolean;
  videoChat: boolean;
  textChat: boolean;
  screenshare: boolean;
  conflictResolution: 'first_wins' | 'last_wins' | 'merge' | 'manual';
}

// Real-time events
export interface RealTimeEvent {
  id: string;
  sessionId: string;
  participantId: string;
  type: EventType;
  timestamp: number;
  data: any;
  version: number;
}

export type EventType =
  | 'participant_joined'
  | 'participant_left'
  | 'participant_cursor_moved'
  | 'participant_selection_changed'
  | 'track_created'
  | 'track_modified'
  | 'track_deleted'
  | 'clip_created'
  | 'clip_modified'
  | 'clip_deleted'
  | 'effect_added'
  | 'effect_modified'
  | 'effect_removed'
  | 'automation_modified'
  | 'playhead_moved'
  | 'transport_started'
  | 'transport_stopped'
  | 'recording_started'
  | 'recording_stopped'
  | 'chat_message'
  | 'lock_acquired'
  | 'lock_released'
  | 'conflict_detected'
  | 'sync_request'
  | 'audio_data'
  | 'voice_chat';

// Audio streaming interfaces
export interface AudioStream {
  participantId: string;
  sessionId: string;
  audioData: Float32Array[];
  timestamp: number;
  sampleRate: number;
  channels: number;
  latency: number;
}

export interface VoiceChatConfig {
  enabled: boolean;
  codec: 'opus' | 'aac' | 'mp3';
  bitrate: number;
  sampleRate: number;
  noiseReduction: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

export interface StreamingMetrics {
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number; // bytes/second
  audioDropouts: number;
  bufferUnderruns: number;
}

// Conflict resolution
export interface ConflictEvent {
  id: string;
  sessionId: string;
  type: 'concurrent_edit' | 'version_mismatch' | 'lock_conflict';
  participants: string[];
  conflictData: any;
  timestamp: number;
  resolved: boolean;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: 'accept_mine' | 'accept_theirs' | 'merge' | 'manual';
  result: any;
  resolvedBy: string;
  timestamp: number;
}

// Network sync
export interface SyncMessage {
  type: 'delta' | 'snapshot' | 'heartbeat' | 'acknowledgment';
  sessionId: string;
  participantId: string;
  version: number;
  timestamp: number;
  data?: any;
}

export interface DeltaOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy';
  path: string;
  value?: any;
  from?: string;
}

// WebRTC connection management
export interface RTCConnection {
  participantId: string;
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  audioSender?: RTCRtpSender;
  videoSender?: RTCRtpSender;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  stats: RTCStats;
}

export interface RTCStats {
  roundTripTime: number;
  availableIncomingBitrate: number;
  availableOutgoingBitrate: number;
  packetsLost: number;
  packetsReceived: number;
  packetsSent: number;
}

// Main collaboration manager
export class RealTimeCollaborationManager extends EventEmitter {
  private session: CollaborationSession | null = null;
  private connections: Map<string, RTCConnection> = new Map();
  private eventQueue: RealTimeEvent[] = [];
  private syncVersion: number = 0;
  private isConnected: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private audioContext: AudioContext;
  private audioProcessor: AudioWorkletNode | null = null;
  private voiceChatProcessor: VoiceChatProcessor;

  constructor() {
    super();
    this.audioContext = new AudioContext();
    this.voiceChatProcessor = new VoiceChatProcessor(this.audioContext);
    this.setupEventHandlers();
  }

  // Session management
  public async createSession(
    name: string,
    description: string,
    settings: SessionSettings
  ): Promise<CollaborationSession> {

    const session: CollaborationSession = {
      id: this.generateId(),
      name,
      description,
      createdBy: 'current_user', // Would be actual user ID
      createdAt: new Date(),
      participants: [],
      audioProject: this.createEmptyProject(),
      settings,
      status: 'active',
      version: 1
    };

    this.session = session;
    this.emit('sessionCreated', session);

    return session;
  }

  public async joinSession(sessionId: string, participant: Omit<Participant, 'id'>): Promise<void> {
    if (this.session?.id === sessionId) {
      throw new Error('Already in session');
    }

    // Simulate network request to join session
    await this.simulateNetworkDelay();

    const fullParticipant: Participant = {
      id: this.generateId(),
      ...participant,
      isOnline: true,
      lastSeen: new Date(),
      latency: 0
    };

    if (!this.session) {
      // Create mock session for demonstration
      this.session = {
        id: sessionId,
        name: 'Collaborative Session',
        createdBy: 'other_user',
        createdAt: new Date(),
        participants: [fullParticipant],
        audioProject: this.createEmptyProject(),
        settings: this.getDefaultSettings(),
        status: 'active',
        version: 1
      };
    } else {
      this.session.participants.push(fullParticipant);
    }

    this.isConnected = true;
    this.startHeartbeat();
    this.setupAudioProcessing();

    this.emit('sessionJoined', { session: this.session, participant: fullParticipant });
    this.broadcastEvent('participant_joined', { participant: fullParticipant });
  }

  public async leaveSession(): Promise<void> {
    if (!this.session || !this.isConnected) {
      throw new Error('Not in a session');
    }

    this.broadcastEvent('participant_left', { participantId: 'current_user' });

    this.isConnected = false;
    this.stopHeartbeat();
    this.cleanupAudioProcessing();
    this.closeAllConnections();

    const sessionId = this.session.id;
    this.session = null;

    this.emit('sessionLeft', { sessionId });
  }

  // Real-time project synchronization
  public async updateTrack(trackId: string, updates: Partial<Track>): Promise<void> {
    if (!this.session) throw new Error('No active session');

    const track = this.session.audioProject.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Track not found');

    // Check for locks
    if (track.lockedBy && track.lockedBy !== 'current_user') {
      throw new Error(`Track is locked by ${track.lockedBy}`);
    }

    // Apply updates
    Object.assign(track, updates);
    track.lastModified = new Date();
    this.session.audioProject.version++;

    // Broadcast change
    this.broadcastEvent('track_modified', {
      trackId,
      updates,
      version: this.session.audioProject.version
    });

    this.emit('trackUpdated', { trackId, track });
  }

  public async addClip(trackId: string, clip: Omit<AudioClip, 'id'>): Promise<AudioClip> {
    if (!this.session) throw new Error('No active session');

    const track = this.session.audioProject.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Track not found');

    const fullClip: AudioClip = {
      id: this.generateId(),
      ...clip
    };

    track.clips.push(fullClip);
    track.lastModified = new Date();
    this.session.audioProject.version++;

    this.broadcastEvent('clip_created', {
      trackId,
      clip: fullClip,
      version: this.session.audioProject.version
    });

    this.emit('clipAdded', { trackId, clip: fullClip });
    return fullClip;
  }

  // Lock management for concurrent editing
  public async acquireLock(trackId: string): Promise<boolean> {
    if (!this.session) throw new Error('No active session');

    const track = this.session.audioProject.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Track not found');

    if (track.lockedBy && track.lockedBy !== 'current_user') {
      return false; // Already locked by someone else
    }

    track.lockedBy = 'current_user';

    this.broadcastEvent('lock_acquired', {
      trackId,
      participantId: 'current_user'
    });

    return true;
  }

  public async releaseLock(trackId: string): Promise<void> {
    if (!this.session) throw new Error('No active session');

    const track = this.session.audioProject.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Track not found');

    if (track.lockedBy !== 'current_user') {
      throw new Error('Lock not owned by current user');
    }

    track.lockedBy = undefined;

    this.broadcastEvent('lock_released', {
      trackId,
      participantId: 'current_user'
    });
  }

  // Cursor and selection synchronization
  public updateCursor(position: CursorPosition): void {
    if (!this.session) return;

    this.broadcastEvent('participant_cursor_moved', {
      participantId: 'current_user',
      position
    });
  }

  public updateSelection(selection: TimeRange | null): void {
    if (!this.session) return;

    this.broadcastEvent('participant_selection_changed', {
      participantId: 'current_user',
      selection
    });
  }

  // Transport control synchronization
  public startPlayback(position: number = 0): void {
    if (!this.session) return;

    this.broadcastEvent('transport_started', {
      position,
      timestamp: this.audioContext.currentTime
    });

    this.emit('playbackStarted', { position });
  }

  public stopPlayback(): void {
    if (!this.session) return;

    this.broadcastEvent('transport_stopped', {
      timestamp: this.audioContext.currentTime
    });

    this.emit('playbackStopped');
  }

  public setPlayheadPosition(position: number): void {
    if (!this.session) return;

    this.broadcastEvent('playhead_moved', {
      position,
      timestamp: this.audioContext.currentTime
    });
  }

  // Audio streaming
  public async startAudioStreaming(): Promise<void> {
    if (!this.session?.settings.collaboration.audioStreaming) {
      throw new Error('Audio streaming not enabled');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.session.settings.sampleRate,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      await this.setupAudioStreaming(stream);
      this.emit('audioStreamingStarted');

    } catch (error) {
      this.emit('audioStreamingError', error);
      throw error;
    }
  }

  public stopAudioStreaming(): void {
    this.cleanupAudioStreaming();
    this.emit('audioStreamingStopped');
  }

  // Voice chat
  public async enableVoiceChat(config: VoiceChatConfig): Promise<void> {
    await this.voiceChatProcessor.enable(config);
    this.emit('voiceChatEnabled');
  }

  public disableVoiceChat(): void {
    this.voiceChatProcessor.disable();
    this.emit('voiceChatDisabled');
  }

  // Chat messaging
  public sendChatMessage(message: string): void {
    if (!this.session) return;

    this.broadcastEvent('chat_message', {
      participantId: 'current_user',
      message,
      timestamp: Date.now()
    });
  }

  // Conflict resolution
  public resolveConflict(conflictId: string, resolution: ConflictResolution): void {
    // Implementation would handle specific conflict resolution strategies
    this.emit('conflictResolved', { conflictId, resolution });
  }

  // Network and connection management
  private setupEventHandlers(): void {
    this.on('eventReceived', this.handleIncomingEvent.bind(this));
    this.on('connectionStateChanged', this.handleConnectionStateChange.bind(this));
  }

  private async setupAudioProcessing(): Promise<void> {
    try {
      await this.audioContext.audioWorklet.addModule('/audio-collaboration-processor.js');
      this.audioProcessor = new AudioWorkletNode(this.audioContext, 'collaboration-processor');

      this.audioProcessor.port.onmessage = (event) => {
        this.handleAudioData(event.data);
      };

    } catch (error) {
      console.warn('AudioWorklet not available, using fallback processing');
      this.setupFallbackAudioProcessing();
    }
  }

  private setupFallbackAudioProcessing(): void {
    // Fallback using ScriptProcessorNode for older browsers
    const bufferSize = this.session?.settings.bufferSize || 256;
    const processor = this.audioContext.createScriptProcessor(bufferSize, 2, 2);

    processor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const outputBuffer = event.outputBuffer;

      // Process audio for collaboration
      this.processFallbackAudio(inputBuffer, outputBuffer);
    };

    this.audioProcessor = processor as any;
  }

  private async setupAudioStreaming(stream: MediaStream): Promise<void> {
    // Setup WebRTC connections for audio streaming
    for (const [participantId, connection] of this.connections) {
      if (connection.status === 'connected') {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          connection.audioSender = connection.peerConnection.addTrack(audioTrack, stream);
        }
      }
    }
  }

  private cleanupAudioStreaming(): void {
    for (const [participantId, connection] of this.connections) {
      if (connection.audioSender) {
        connection.peerConnection.removeTrack(connection.audioSender);
        connection.audioSender = undefined;
      }
    }
  }

  private cleanupAudioProcessing(): void {
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }
  }

  private handleIncomingEvent(event: RealTimeEvent): void {
    switch (event.type) {
      case 'participant_joined':
        this.handleParticipantJoined(event.data);
        break;
      case 'participant_left':
        this.handleParticipantLeft(event.data);
        break;
      case 'track_modified':
        this.handleTrackModified(event.data);
        break;
      case 'clip_created':
        this.handleClipCreated(event.data);
        break;
      case 'transport_started':
        this.handleTransportStarted(event.data);
        break;
      case 'transport_stopped':
        this.handleTransportStopped(event.data);
        break;
      case 'chat_message':
        this.handleChatMessage(event.data);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private handleParticipantJoined(data: any): void {
    if (this.session) {
      this.session.participants.push(data.participant);
      this.emit('participantJoined', data.participant);
    }
  }

  private handleParticipantLeft(data: any): void {
    if (this.session) {
      this.session.participants = this.session.participants.filter(
        p => p.id !== data.participantId
      );
      this.emit('participantLeft', data.participantId);
    }
  }

  private handleTrackModified(data: any): void {
    if (this.session) {
      const track = this.session.audioProject.tracks.find(t => t.id === data.trackId);
      if (track) {
        Object.assign(track, data.updates);
        this.emit('trackUpdatedRemotely', { trackId: data.trackId, track });
      }
    }
  }

  private handleClipCreated(data: any): void {
    if (this.session) {
      const track = this.session.audioProject.tracks.find(t => t.id === data.trackId);
      if (track) {
        track.clips.push(data.clip);
        this.emit('clipAddedRemotely', { trackId: data.trackId, clip: data.clip });
      }
    }
  }

  private handleTransportStarted(data: any): void {
    this.emit('remotePlaybackStarted', data);
  }

  private handleTransportStopped(data: any): void {
    this.emit('remotePlaybackStopped', data);
  }

  private handleChatMessage(data: any): void {
    this.emit('chatMessageReceived', data);
  }

  private handleConnectionStateChange(data: any): void {
    this.emit('connectionChanged', data);
  }

  private handleAudioData(data: any): void {
    // Process incoming audio data from other participants
    this.emit('audioDataReceived', data);
  }

  private processFallbackAudio(inputBuffer: AudioBuffer, outputBuffer: AudioBuffer): void {
    // Fallback audio processing for collaboration
    const inputChannels = [];
    const outputChannels = [];

    for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
      inputChannels.push(inputBuffer.getChannelData(channel));
      outputChannels.push(outputBuffer.getChannelData(channel));
    }

    // Simple pass-through for now
    for (let channel = 0; channel < outputChannels.length; channel++) {
      if (inputChannels[channel]) {
        outputChannels[channel]!.set(inputChannels[channel]!);
      }
    }
  }

  private broadcastEvent(type: EventType, data: any): void {
    if (!this.session) return;

    const event: RealTimeEvent = {
      id: this.generateId(),
      sessionId: this.session.id,
      participantId: 'current_user',
      type,
      timestamp: Date.now(),
      data,
      version: ++this.syncVersion
    };

    // Simulate network broadcast
    setTimeout(() => {
      this.emit('eventBroadcast', event);
    }, Math.random() * 50); // Simulate network latency
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeat(): void {
    // Send heartbeat to maintain connection
    this.emit('heartbeat', { timestamp: Date.now() });
  }

  private closeAllConnections(): void {
    for (const [participantId, connection] of this.connections) {
      connection.peerConnection.close();
    }
    this.connections.clear();
  }

  private createEmptyProject(): AudioProject {
    return {
      id: this.generateId(),
      name: 'New Project',
      sampleRate: 44100,
      bitDepth: 24,
      tempo: 120,
      timeSignature: [4, 4],
      tracks: [],
      markers: [],
      regions: [],
      masterBus: {
        volume: 0,
        effects: [],
        limitEnabled: true,
        limitThreshold: -0.1
      },
      version: 1,
      lastModified: new Date()
    };
  }

  private getDefaultSettings(): SessionSettings {
    return {
      sampleRate: 44100,
      bufferSize: 256,
      latencyCompensation: true,
      autoSave: true,
      autoSaveInterval: 30,
      clickTrack: false,
      countIn: 0,
      recordingMode: 'overdub',
      monitoring: 'auto',
      qualityMode: 'realtime',
      collaboration: {
        allowGuests: true,
        requireApproval: false,
        maxParticipants: 8,
        audioStreaming: true,
        videoChat: false,
        textChat: true,
        screenshare: false,
        conflictResolution: 'last_wins'
      }
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async simulateNetworkDelay(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, Math.random() * 100 + 50);
    });
  }

  // Getters
  public getCurrentSession(): CollaborationSession | null {
    return this.session;
  }

  public isInSession(): boolean {
    return this.session !== null && this.isConnected;
  }

  public getParticipants(): Participant[] {
    return this.session?.participants || [];
  }

  public getConnectionMetrics(): StreamingMetrics {
    return {
      latency: 0,
      jitter: 0,
      packetLoss: 0,
      bandwidth: 0,
      audioDropouts: 0,
      bufferUnderruns: 0
    };
  }
}

// Voice chat processor
class VoiceChatProcessor {
  private audioContext: AudioContext;
  private mediaStream: MediaStream | null = null;
  private enabled: boolean = false;
  private config: VoiceChatConfig | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  public async enable(config: VoiceChatConfig): Promise<void> {
    this.config = config;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate,
          echoCancellation: config.echoCancellation,
          noiseSuppression: config.noiseReduction,
          autoGainControl: config.autoGainControl
        }
      });

      this.enabled = true;
    } catch (error) {
      throw new Error(`Failed to enable voice chat: ${error}`);
    }
  }

  public disable(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.enabled = false;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }
}

// Export collaboration presets
export const CollaborationPresets = {
  MUSIC_PRODUCTION: {
    sampleRate: 48000,
    bufferSize: 256 as const,
    latencyCompensation: true,
    autoSave: true,
    autoSaveInterval: 60,
    clickTrack: true,
    countIn: 2,
    recordingMode: 'overdub' as const,
    monitoring: 'auto' as const,
    qualityMode: 'high_quality' as const,
    collaboration: {
      allowGuests: false,
      requireApproval: true,
      maxParticipants: 4,
      audioStreaming: true,
      videoChat: false,
      textChat: true,
      screenshare: false,
      conflictResolution: 'manual' as const
    }
  },

  PODCAST_RECORDING: {
    sampleRate: 44100,
    bufferSize: 512 as const,
    latencyCompensation: false,
    autoSave: true,
    autoSaveInterval: 30,
    clickTrack: false,
    countIn: 0,
    recordingMode: 'replace' as const,
    monitoring: 'always' as const,
    qualityMode: 'realtime' as const,
    collaboration: {
      allowGuests: true,
      requireApproval: false,
      maxParticipants: 8,
      audioStreaming: true,
      videoChat: true,
      textChat: true,
      screenshare: true,
      conflictResolution: 'first_wins' as const
    }
  },

  LIVE_JAMMING: {
    sampleRate: 44100,
    bufferSize: 128 as const,
    latencyCompensation: true,
    autoSave: false,
    autoSaveInterval: 0,
    clickTrack: true,
    countIn: 1,
    recordingMode: 'overdub' as const,
    monitoring: 'auto' as const,
    qualityMode: 'realtime' as const,
    collaboration: {
      allowGuests: true,
      requireApproval: false,
      maxParticipants: 6,
      audioStreaming: true,
      videoChat: false,
      textChat: false,
      screenshare: false,
      conflictResolution: 'last_wins' as const
    }
  }
};