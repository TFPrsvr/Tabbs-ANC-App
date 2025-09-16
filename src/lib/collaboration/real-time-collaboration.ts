import { EventEmitter } from 'events';

export interface CollaborationSession {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  owner: string;
  participants: CollaborationParticipant[];
  permissions: SessionPermissions;
  settings: SessionSettings;
  status: 'active' | 'paused' | 'ended';
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  statistics: {
    totalEdits: number;
    totalParticipants: number;
    durationMs: number;
    activeTime: number;
  };
}

export interface CollaborationParticipant {
  userId: string;
  username: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer' | 'guest';
  permissions: ParticipantPermissions;
  status: 'online' | 'offline' | 'away' | 'busy';
  joinedAt: Date;
  lastSeen: Date;
  cursor?: CursorPosition;
  currentTool?: string;
  isRecording?: boolean;
  isPlaying?: boolean;
  color: string; // For visual identification
}

export interface SessionPermissions {
  allowViewers: boolean;
  allowGuests: boolean;
  requireApproval: boolean;
  maxParticipants: number;
  lockProject: boolean;
  sharePublicly: boolean;
  allowScreenShare: boolean;
  allowVoiceChat: boolean;
  allowFileShare: boolean;
}

export interface ParticipantPermissions {
  canEdit: boolean;
  canAddTracks: boolean;
  canDeleteTracks: boolean;
  canRecord: boolean;
  canExport: boolean;
  canInviteOthers: boolean;
  canChangeSettings: boolean;
  canManageParticipants: boolean;
  canUseChat: boolean;
  canShareScreen: boolean;
  canUseVoiceChat: boolean;
  timelineRegions?: TimelineRegion[];
  trackRestrictions?: string[];
}

export interface SessionSettings {
  autoSave: {
    enabled: boolean;
    intervalMs: number;
    maxVersions: number;
  };
  conflictResolution: {
    strategy: 'last-wins' | 'merge' | 'manual-resolve' | 'version-branch';
    lockTimeout: number;
    notifyConflicts: boolean;
  };
  quality: {
    audioLatency: 'low' | 'medium' | 'high';
    videoQuality: '480p' | '720p' | '1080p';
    framerate: 15 | 30 | 60;
  };
  communication: {
    enableChat: boolean;
    enableVoiceChat: boolean;
    enableVideoChat: boolean;
    enableScreenShare: boolean;
    chatHistory: number; // days
  };
  notifications: {
    joinLeave: boolean;
    edits: boolean;
    comments: boolean;
    mentions: boolean;
    conflicts: boolean;
  };
}

export interface TimelineRegion {
  id: string;
  startTime: number;
  endTime: number;
  trackIds?: string[];
  name?: string;
  color?: string;
}

export interface CursorPosition {
  timelinePosition: number;
  trackId?: string;
  selectedRegion?: { start: number; end: number };
  viewportStart: number;
  viewportEnd: number;
  zoomLevel: number;
}

export interface CollaborationOperation {
  id: string;
  sessionId: string;
  userId: string;
  type: 'timeline-edit' | 'track-edit' | 'effect-change' | 'cursor-move' | 'selection-change' | 'playback-control';
  timestamp: Date;
  data: Record<string, any>;
  vector: VectorClock;
  dependencies?: string[];
  isUndoable: boolean;
}

export interface VectorClock {
  [userId: string]: number;
}

export interface ConflictEvent {
  id: string;
  sessionId: string;
  type: 'edit-conflict' | 'lock-conflict' | 'version-conflict';
  operations: CollaborationOperation[];
  affectedRegions: TimelineRegion[];
  timestamp: Date;
  status: 'pending' | 'resolved' | 'escalated';
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  method: 'accept-first' | 'accept-last' | 'merge' | 'manual';
  chosenOperation?: string;
  mergedResult?: Record<string, any>;
  resolvedBy: string;
  resolvedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  content: string;
  type: 'text' | 'system' | 'mention' | 'file-share' | 'timeline-reference';
  timestamp: Date;
  metadata?: {
    timelinePosition?: number;
    trackId?: string;
    fileId?: string;
    mentions?: string[];
  };
  reactions: Array<{
    emoji: string;
    userId: string;
    timestamp: Date;
  }>;
  replyTo?: string;
  editedAt?: Date;
}

export interface ScreenShareSession {
  id: string;
  sessionId: string;
  presenterId: string;
  presenterName: string;
  status: 'starting' | 'active' | 'paused' | 'ended';
  viewers: Array<{
    userId: string;
    joinedAt: Date;
    hasAudio: boolean;
    hasVideo: boolean;
  }>;
  settings: {
    shareAudio: boolean;
    shareVideo: boolean;
    allowControl: boolean;
    quality: 'low' | 'medium' | 'high';
  };
  startedAt: Date;
  endedAt?: Date;
}

export interface VoiceChatChannel {
  id: string;
  sessionId: string;
  name: string;
  participants: Array<{
    userId: string;
    username: string;
    isMuted: boolean;
    isDeafened: boolean;
    joinedAt: Date;
    audioLevel: number;
  }>;
  settings: {
    maxParticipants: number;
    noiseGate: boolean;
    noiseSuppression: boolean;
    echoCancellation: boolean;
    pushToTalk: boolean;
  };
  isActive: boolean;
}

export class RealTimeCollaborationEngine extends EventEmitter {
  private sessions: Map<string, CollaborationSession> = new Map();
  private operations: Map<string, CollaborationOperation> = new Map();
  private conflicts: Map<string, ConflictEvent> = new Map();
  private chatHistory: Map<string, ChatMessage[]> = new Map();
  private screenShares: Map<string, ScreenShareSession> = new Map();
  private voiceChannels: Map<string, VoiceChatChannel> = new Map();

  private wsConnections: Map<string, WebSocket> = new Map();
  private operationQueue: Map<string, CollaborationOperation[]> = new Map();
  private vectorClocks: Map<string, VectorClock> = new Map();

  constructor() {
    super();
    this.startHeartbeat();
  }

  async createSession(
    projectId: string,
    ownerId: string,
    config: Partial<CollaborationSession>
  ): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: `session_${Date.now()}`,
      projectId,
      name: config.name || `Collaboration Session`,
      description: config.description,
      owner: ownerId,
      participants: [
        {
          userId: ownerId,
          username: 'Owner', // Would be fetched from user service
          role: 'owner',
          permissions: this.getOwnerPermissions(),
          status: 'online',
          joinedAt: new Date(),
          lastSeen: new Date(),
          color: this.generateParticipantColor(ownerId)
        }
      ],
      permissions: config.permissions || this.getDefaultPermissions(),
      settings: config.settings || this.getDefaultSettings(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
      statistics: {
        totalEdits: 0,
        totalParticipants: 1,
        durationMs: 0,
        activeTime: 0
      }
    };

    this.sessions.set(session.id, session);
    this.chatHistory.set(session.id, []);
    this.operationQueue.set(session.id, []);
    this.vectorClocks.set(session.id, { [ownerId]: 0 });

    this.emit('sessionCreated', session);
    return session;
  }

  async joinSession(sessionId: string, userId: string, username: string): Promise<CollaborationParticipant> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    // Check if user is already in session
    const existingParticipant = session.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      existingParticipant.status = 'online';
      existingParticipant.lastSeen = new Date();
      this.emit('participantReconnected', { session, participant: existingParticipant });
      return existingParticipant;
    }

    // Check session limits
    if (session.participants.length >= session.permissions.maxParticipants) {
      throw new Error('Session is full');
    }

    // Determine participant role and permissions
    const role = this.determineParticipantRole(session, userId);
    const permissions = this.getParticipantPermissions(role);

    const participant: CollaborationParticipant = {
      userId,
      username,
      role,
      permissions,
      status: 'online',
      joinedAt: new Date(),
      lastSeen: new Date(),
      color: this.generateParticipantColor(userId)
    };

    session.participants.push(participant);
    session.statistics.totalParticipants = Math.max(
      session.statistics.totalParticipants,
      session.participants.length
    );
    session.lastActivity = new Date();

    // Initialize vector clock for new participant
    const vectorClock = this.vectorClocks.get(sessionId)!;
    vectorClock[userId] = 0;

    this.sessions.set(sessionId, session);
    this.emit('participantJoined', { session, participant });

    // Send session state to new participant
    await this.sendSessionState(sessionId, userId);

    return participant;
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participantIndex = session.participants.findIndex(p => p.userId === userId);
    if (participantIndex === -1) return;

    const participant = session.participants[participantIndex];
    participant.status = 'offline';
    participant.lastSeen = new Date();

    this.emit('participantLeft', { session, participant });

    // Clean up user's operations and resources
    await this.cleanupParticipantResources(sessionId, userId);

    // If owner leaves, transfer ownership or end session
    if (participant.role === 'owner') {
      await this.handleOwnerLeave(session, userId);
    }
  }

  async applyOperation(operation: CollaborationOperation): Promise<void> {
    const session = this.sessions.get(operation.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participant = session.participants.find(p => p.userId === operation.userId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    // Check permissions
    if (!this.hasOperationPermission(participant, operation)) {
      throw new Error('Insufficient permissions');
    }

    // Update vector clock
    const vectorClock = this.vectorClocks.get(operation.sessionId)!;
    vectorClock[operation.userId] = (vectorClock[operation.userId] || 0) + 1;
    operation.vector = { ...vectorClock };

    // Check for conflicts
    const conflictingOps = await this.detectConflicts(operation);
    if (conflictingOps.length > 0) {
      await this.handleConflict(operation, conflictingOps);
      return;
    }

    // Apply operation
    await this.executeOperation(operation);

    // Store operation
    this.operations.set(operation.id, operation);
    const queue = this.operationQueue.get(operation.sessionId)!;
    queue.push(operation);

    // Update session statistics
    session.statistics.totalEdits++;
    session.lastActivity = new Date();

    // Broadcast to other participants
    this.broadcastOperation(operation);

    this.emit('operationApplied', operation);
  }

  async createChatMessage(
    sessionId: string,
    userId: string,
    content: string,
    type: ChatMessage['type'] = 'text',
    metadata?: ChatMessage['metadata']
  ): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participant = session.participants.find(p => p.userId === userId);
    if (!participant || !participant.permissions.canUseChat) {
      throw new Error('Chat permission denied');
    }

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sessionId,
      userId,
      username: participant.username,
      content,
      type,
      timestamp: new Date(),
      metadata,
      reactions: []
    };

    const chatHistory = this.chatHistory.get(sessionId)!;
    chatHistory.push(message);

    // Limit chat history
    const maxMessages = 1000;
    if (chatHistory.length > maxMessages) {
      chatHistory.splice(0, chatHistory.length - maxMessages);
    }

    this.broadcastChatMessage(message);
    this.emit('chatMessage', message);

    return message;
  }

  async startScreenShare(
    sessionId: string,
    presenterId: string,
    settings: ScreenShareSession['settings']
  ): Promise<ScreenShareSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.permissions.allowScreenShare) {
      throw new Error('Screen sharing not allowed');
    }

    // End any existing screen share
    const existingShare = Array.from(this.screenShares.values())
      .find(share => share.sessionId === sessionId && share.status === 'active');
    if (existingShare) {
      await this.endScreenShare(existingShare.id);
    }

    const presenter = session.participants.find(p => p.userId === presenterId);
    if (!presenter) {
      throw new Error('Presenter not found');
    }

    const screenShare: ScreenShareSession = {
      id: `screen_${Date.now()}`,
      sessionId,
      presenterId,
      presenterName: presenter.username,
      status: 'starting',
      viewers: [],
      settings,
      startedAt: new Date()
    };

    this.screenShares.set(screenShare.id, screenShare);

    // Initialize WebRTC connections for screen sharing
    await this.initializeScreenShare(screenShare);

    screenShare.status = 'active';
    this.emit('screenShareStarted', screenShare);

    return screenShare;
  }

  async joinVoiceChat(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.permissions.allowVoiceChat) {
      throw new Error('Voice chat not allowed');
    }

    const participant = session.participants.find(p => p.userId === userId);
    if (!participant || !participant.permissions.canUseVoiceChat) {
      throw new Error('Voice chat permission denied');
    }

    let voiceChannel = Array.from(this.voiceChannels.values())
      .find(channel => channel.sessionId === sessionId);

    if (!voiceChannel) {
      voiceChannel = await this.createVoiceChannel(sessionId);
    }

    // Check if already in voice chat
    const existingParticipant = voiceChannel.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      return;
    }

    voiceChannel.participants.push({
      userId,
      username: participant.username,
      isMuted: false,
      isDeafened: false,
      joinedAt: new Date(),
      audioLevel: 0
    });

    this.emit('voiceChatJoined', { voiceChannel, userId });
  }

  private async detectConflicts(operation: CollaborationOperation): Promise<CollaborationOperation[]> {
    const queue = this.operationQueue.get(operation.sessionId) || [];
    const conflicts: CollaborationOperation[] = [];

    // Check for operations affecting the same timeline regions
    if (operation.type === 'timeline-edit') {
      const operationRange = this.getOperationTimelineRange(operation);

      for (const queuedOp of queue.slice(-50)) { // Check last 50 operations
        if (queuedOp.userId === operation.userId) continue;
        if (queuedOp.type !== 'timeline-edit') continue;

        const queuedRange = this.getOperationTimelineRange(queuedOp);
        if (this.rangesOverlap(operationRange, queuedRange)) {
          conflicts.push(queuedOp);
        }
      }
    }

    return conflicts;
  }

  private async handleConflict(
    operation: CollaborationOperation,
    conflictingOps: CollaborationOperation[]
  ): Promise<void> {
    const session = this.sessions.get(operation.sessionId)!;

    const conflict: ConflictEvent = {
      id: `conflict_${Date.now()}`,
      sessionId: operation.sessionId,
      type: 'edit-conflict',
      operations: [operation, ...conflictingOps],
      affectedRegions: this.getAffectedRegions(operation, conflictingOps),
      timestamp: new Date(),
      status: 'pending'
    };

    this.conflicts.set(conflict.id, conflict);

    // Apply conflict resolution strategy
    switch (session.settings.conflictResolution.strategy) {
      case 'last-wins':
        await this.resolveConflictLastWins(conflict);
        break;
      case 'merge':
        await this.resolveConflictMerge(conflict);
        break;
      case 'version-branch':
        await this.resolveConflictVersionBranch(conflict);
        break;
      case 'manual-resolve':
      default:
        this.emit('conflictDetected', conflict);
        break;
    }
  }

  private async resolveConflictLastWins(conflict: ConflictEvent): Promise<void> {
    const latestOp = conflict.operations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    await this.executeOperation(latestOp);

    conflict.status = 'resolved';
    conflict.resolution = {
      method: 'accept-last',
      chosenOperation: latestOp.id,
      resolvedBy: 'system',
      resolvedAt: new Date()
    };

    this.emit('conflictResolved', conflict);
  }

  private async resolveConflictMerge(conflict: ConflictEvent): Promise<void> {
    // Implement intelligent merge logic
    const mergedResult = await this.mergeOperations(conflict.operations);

    conflict.status = 'resolved';
    conflict.resolution = {
      method: 'merge',
      mergedResult,
      resolvedBy: 'system',
      resolvedAt: new Date()
    };

    this.emit('conflictResolved', conflict);
  }

  private async mergeOperations(operations: CollaborationOperation[]): Promise<Record<string, any>> {
    // Simplified merge - in reality, this would be much more sophisticated
    const merged = {};

    operations.forEach(op => {
      Object.assign(merged, op.data);
    });

    return merged;
  }

  private async executeOperation(operation: CollaborationOperation): Promise<void> {
    // Execute the operation based on its type
    switch (operation.type) {
      case 'timeline-edit':
        await this.executeTimelineEdit(operation);
        break;
      case 'track-edit':
        await this.executeTrackEdit(operation);
        break;
      case 'effect-change':
        await this.executeEffectChange(operation);
        break;
      case 'cursor-move':
        await this.executeCursorMove(operation);
        break;
      case 'selection-change':
        await this.executeSelectionChange(operation);
        break;
      case 'playback-control':
        await this.executePlaybackControl(operation);
        break;
    }
  }

  private async executeTimelineEdit(operation: CollaborationOperation): Promise<void> {
    // Mock timeline edit execution
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private async executeTrackEdit(operation: CollaborationOperation): Promise<void> {
    // Mock track edit execution
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  private async executeEffectChange(operation: CollaborationOperation): Promise<void> {
    // Mock effect change execution
    await new Promise(resolve => setTimeout(resolve, 15));
  }

  private async executeCursorMove(operation: CollaborationOperation): Promise<void> {
    // Update participant cursor position
    const session = this.sessions.get(operation.sessionId)!;
    const participant = session.participants.find(p => p.userId === operation.userId);
    if (participant) {
      participant.cursor = operation.data.cursor;
    }
  }

  private async executeSelectionChange(operation: CollaborationOperation): Promise<void> {
    // Update participant selection
    const session = this.sessions.get(operation.sessionId)!;
    const participant = session.participants.find(p => p.userId === operation.userId);
    if (participant && participant.cursor) {
      participant.cursor.selectedRegion = operation.data.selection;
    }
  }

  private async executePlaybackControl(operation: CollaborationOperation): Promise<void> {
    // Handle playback control
    const session = this.sessions.get(operation.sessionId)!;
    const participant = session.participants.find(p => p.userId === operation.userId);
    if (participant) {
      participant.isPlaying = operation.data.isPlaying;
    }
  }

  private broadcastOperation(operation: CollaborationOperation): void {
    const session = this.sessions.get(operation.sessionId);
    if (!session) return;

    session.participants.forEach(participant => {
      if (participant.userId !== operation.userId && participant.status === 'online') {
        this.sendToParticipant(participant.userId, 'operation', operation);
      }
    });
  }

  private broadcastChatMessage(message: ChatMessage): void {
    const session = this.sessions.get(message.sessionId);
    if (!session) return;

    session.participants.forEach(participant => {
      if (participant.status === 'online') {
        this.sendToParticipant(participant.userId, 'chat-message', message);
      }
    });
  }

  private sendToParticipant(userId: string, type: string, data: any): void {
    const connection = this.wsConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify({ type, data }));
    }
  }

  private async sendSessionState(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const recentOperations = this.operationQueue.get(sessionId)?.slice(-100) || [];
    const chatHistory = this.chatHistory.get(sessionId)?.slice(-50) || [];

    const sessionState = {
      session,
      recentOperations,
      chatHistory,
      vectorClock: this.vectorClocks.get(sessionId)
    };

    this.sendToParticipant(userId, 'session-state', sessionState);
  }

  private async cleanupParticipantResources(sessionId: string, userId: string): Promise<void> {
    // Remove from voice chat
    const voiceChannel = Array.from(this.voiceChannels.values())
      .find(channel => channel.sessionId === sessionId);
    if (voiceChannel) {
      voiceChannel.participants = voiceChannel.participants
        .filter(p => p.userId !== userId);
    }

    // End screen share if presenting
    const screenShare = Array.from(this.screenShares.values())
      .find(share => share.sessionId === sessionId && share.presenterId === userId);
    if (screenShare) {
      await this.endScreenShare(screenShare.id);
    }
  }

  private async handleOwnerLeave(session: CollaborationSession, ownerId: string): Promise<void> {
    // Find suitable replacement owner
    const editors = session.participants.filter(p =>
      p.role === 'editor' && p.status === 'online' && p.userId !== ownerId
    );

    if (editors.length > 0) {
      // Transfer ownership to first editor
      const newOwner = editors[0];
      newOwner.role = 'owner';
      newOwner.permissions = this.getOwnerPermissions();
      session.owner = newOwner.userId;

      this.emit('ownershipTransferred', { session, newOwner, previousOwner: ownerId });
    } else {
      // End session if no suitable replacement
      await this.endSession(session.id);
    }
  }

  private async createVoiceChannel(sessionId: string): Promise<VoiceChatChannel> {
    const voiceChannel: VoiceChatChannel = {
      id: `voice_${sessionId}`,
      sessionId,
      name: 'Main Voice Channel',
      participants: [],
      settings: {
        maxParticipants: 10,
        noiseGate: true,
        noiseSuppression: true,
        echoCancellation: true,
        pushToTalk: false
      },
      isActive: true
    };

    this.voiceChannels.set(voiceChannel.id, voiceChannel);
    return voiceChannel;
  }

  private async initializeScreenShare(screenShare: ScreenShareSession): Promise<void> {
    // Initialize WebRTC for screen sharing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async endScreenShare(screenShareId: string): Promise<void> {
    const screenShare = this.screenShares.get(screenShareId);
    if (!screenShare) return;

    screenShare.status = 'ended';
    screenShare.endedAt = new Date();

    this.emit('screenShareEnded', screenShare);
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'ended';
    session.updatedAt = new Date();

    // Clean up all resources
    await this.cleanupSessionResources(sessionId);

    this.emit('sessionEnded', session);
  }

  private async cleanupSessionResources(sessionId: string): Promise<void> {
    // End all screen shares
    const screenShares = Array.from(this.screenShares.values())
      .filter(share => share.sessionId === sessionId);
    for (const share of screenShares) {
      await this.endScreenShare(share.id);
    }

    // Clean up voice channels
    const voiceChannels = Array.from(this.voiceChannels.values())
      .filter(channel => channel.sessionId === sessionId);
    voiceChannels.forEach(channel => {
      this.voiceChannels.delete(channel.id);
    });

    // Disconnect all participants
    const session = this.sessions.get(sessionId);
    if (session) {
      session.participants.forEach(participant => {
        const connection = this.wsConnections.get(participant.userId);
        if (connection) {
          connection.close();
          this.wsConnections.delete(participant.userId);
        }
      });
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.updateParticipantStatus();
      this.cleanupInactiveSessions();
    }, 30000); // Every 30 seconds
  }

  private updateParticipantStatus(): void {
    const now = Date.now();
    const timeoutMs = 60000; // 1 minute timeout

    for (const session of this.sessions.values()) {
      session.participants.forEach(participant => {
        if (participant.status === 'online' &&
            now - participant.lastSeen.getTime() > timeoutMs) {
          participant.status = 'away';
          this.emit('participantStatusChanged', { session, participant });
        }
      });
    }
  }

  private cleanupInactiveSessions(): void {
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > inactiveThreshold) {
        const activeParticipants = session.participants
          .filter(p => p.status === 'online').length;

        if (activeParticipants === 0) {
          this.endSession(sessionId);
        }
      }
    }
  }

  private getDefaultPermissions(): SessionPermissions {
    return {
      allowViewers: true,
      allowGuests: false,
      requireApproval: false,
      maxParticipants: 10,
      lockProject: false,
      sharePublicly: false,
      allowScreenShare: true,
      allowVoiceChat: true,
      allowFileShare: true
    };
  }

  private getDefaultSettings(): SessionSettings {
    return {
      autoSave: {
        enabled: true,
        intervalMs: 30000,
        maxVersions: 50
      },
      conflictResolution: {
        strategy: 'manual-resolve',
        lockTimeout: 5000,
        notifyConflicts: true
      },
      quality: {
        audioLatency: 'low',
        videoQuality: '720p',
        framerate: 30
      },
      communication: {
        enableChat: true,
        enableVoiceChat: true,
        enableVideoChat: true,
        enableScreenShare: true,
        chatHistory: 30
      },
      notifications: {
        joinLeave: true,
        edits: true,
        comments: true,
        mentions: true,
        conflicts: true
      }
    };
  }

  private getOwnerPermissions(): ParticipantPermissions {
    return {
      canEdit: true,
      canAddTracks: true,
      canDeleteTracks: true,
      canRecord: true,
      canExport: true,
      canInviteOthers: true,
      canChangeSettings: true,
      canManageParticipants: true,
      canUseChat: true,
      canShareScreen: true,
      canUseVoiceChat: true
    };
  }

  private getParticipantPermissions(role: CollaborationParticipant['role']): ParticipantPermissions {
    const basePermissions: ParticipantPermissions = {
      canEdit: false,
      canAddTracks: false,
      canDeleteTracks: false,
      canRecord: false,
      canExport: false,
      canInviteOthers: false,
      canChangeSettings: false,
      canManageParticipants: false,
      canUseChat: true,
      canShareScreen: false,
      canUseVoiceChat: true
    };

    switch (role) {
      case 'owner':
        return this.getOwnerPermissions();
      case 'editor':
        return {
          ...basePermissions,
          canEdit: true,
          canAddTracks: true,
          canRecord: true,
          canShareScreen: true
        };
      case 'viewer':
        return {
          ...basePermissions,
          canUseChat: true,
          canUseVoiceChat: true
        };
      case 'guest':
        return {
          ...basePermissions,
          canUseChat: false,
          canUseVoiceChat: false
        };
      default:
        return basePermissions;
    }
  }

  private determineParticipantRole(session: CollaborationSession, userId: string): CollaborationParticipant['role'] {
    // Logic to determine role based on session settings and user
    if (session.permissions.allowViewers) {
      return 'viewer';
    }
    return 'editor';
  }

  private generateParticipantColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];

    const hash = userId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  }

  private hasOperationPermission(
    participant: CollaborationParticipant,
    operation: CollaborationOperation
  ): boolean {
    switch (operation.type) {
      case 'timeline-edit':
      case 'track-edit':
      case 'effect-change':
        return participant.permissions.canEdit;
      case 'cursor-move':
      case 'selection-change':
        return true; // Always allowed
      case 'playback-control':
        return participant.permissions.canEdit;
      default:
        return false;
    }
  }

  private getOperationTimelineRange(operation: CollaborationOperation): { start: number; end: number } {
    // Extract timeline range from operation data
    return {
      start: operation.data.startTime || 0,
      end: operation.data.endTime || 0
    };
  }

  private rangesOverlap(range1: { start: number; end: number }, range2: { start: number; end: number }): boolean {
    return range1.start < range2.end && range2.start < range1.end;
  }

  private getAffectedRegions(
    operation: CollaborationOperation,
    conflictingOps: CollaborationOperation[]
  ): TimelineRegion[] {
    const regions: TimelineRegion[] = [];
    const allOps = [operation, ...conflictingOps];

    allOps.forEach(op => {
      const range = this.getOperationTimelineRange(op);
      regions.push({
        id: `region_${op.id}`,
        startTime: range.start,
        endTime: range.end,
        trackIds: op.data.trackIds,
        color: '#FF6B6B'
      });
    });

    return regions;
  }

  private async resolveConflictVersionBranch(conflict: ConflictEvent): Promise<void> {
    // Create version branches for conflicting operations
    conflict.operations.forEach(op => {
      // Create a branch for each conflicting operation
      // This would integrate with version control system
    });

    conflict.status = 'resolved';
    conflict.resolution = {
      method: 'manual', // Requires manual branch selection
      resolvedBy: 'system',
      resolvedAt: new Date()
    };
  }

  // Public getters and utilities
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.status === 'active');
  }

  getSessionsByUser(userId: string): CollaborationSession[] {
    return Array.from(this.sessions.values())
      .filter(session =>
        session.participants.some(p => p.userId === userId) ||
        session.owner === userId
      );
  }

  getChatHistory(sessionId: string, limit?: number): ChatMessage[] {
    const history = this.chatHistory.get(sessionId) || [];
    return limit ? history.slice(-limit) : history;
  }

  getActiveConflicts(sessionId: string): ConflictEvent[] {
    return Array.from(this.conflicts.values())
      .filter(conflict =>
        conflict.sessionId === sessionId &&
        conflict.status === 'pending'
      );
  }

  getScreenShare(sessionId: string): ScreenShareSession | undefined {
    return Array.from(this.screenShares.values())
      .find(share => share.sessionId === sessionId && share.status === 'active');
  }

  getVoiceChannel(sessionId: string): VoiceChatChannel | undefined {
    return Array.from(this.voiceChannels.values())
      .find(channel => channel.sessionId === sessionId && channel.isActive);
  }

  async addParticipantConnection(userId: string, connection: WebSocket): Promise<void> {
    this.wsConnections.set(userId, connection);

    connection.onclose = () => {
      this.wsConnections.delete(userId);
      this.handleParticipantDisconnect(userId);
    };

    connection.onerror = (error) => {
      this.emit('connectionError', { userId, error });
    };
  }

  private handleParticipantDisconnect(userId: string): void {
    // Update participant status in all sessions
    for (const session of this.sessions.values()) {
      const participant = session.participants.find(p => p.userId === userId);
      if (participant) {
        participant.status = 'offline';
        participant.lastSeen = new Date();
        this.emit('participantDisconnected', { session, participant });
      }
    }
  }
}

export const collaborationEngine = new RealTimeCollaborationEngine();