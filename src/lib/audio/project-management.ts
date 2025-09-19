import { EventEmitter } from 'events';

// Core project management interfaces
export interface AudioProject {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  modifiedAt: Date;
  lastOpenedAt?: Date;
  version: number;
  templateId?: string;
  owner: string;
  collaborators: ProjectCollaborator[];
  settings: ProjectSettings;
  metadata: ProjectMetadata;
  tracks: ProjectTrack[];
  timeline: Timeline;
  markers: TimelineMarker[];
  regions: TimelineRegion[];
  automation: AutomationData[];
  mixerState: MixerState;
  effects: ProjectEffect[];
  instruments: ProjectInstrument[];
  samples: ProjectSample[];
  presets: ProjectPreset[];
  exports: ProjectExport[];
  backups: ProjectBackup[];
  status: 'draft' | 'active' | 'completed' | 'archived' | 'deleted';
  tags: string[];
  notes: ProjectNote[];
}

export interface ProjectCollaborator {
  userId: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  permissions: CollaboratorPermissions;
  joinedAt: Date;
  lastActiveAt: Date;
  isOnline: boolean;
}

export interface CollaboratorPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canInvite: boolean;
  canChangeSettings: boolean;
  canViewHistory: boolean;
  canCreateBackups: boolean;
  canManageTracks: boolean;
  canManageEffects: boolean;
}

export interface ProjectSettings {
  sampleRate: number;
  bitDepth: 16 | 24 | 32;
  channels: number;
  tempo: number;
  timeSignature: [number, number];
  key: string;
  scale: string;
  masterVolume: number;
  clickTrack: boolean;
  countIn: number;
  recordingMode: 'overdub' | 'replace' | 'punch';
  quantization: number;
  snapToGrid: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  backupRetention: number;
  maxUndoSteps: number;
}

export interface ProjectMetadata {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  copyright?: string;
  publisher?: string;
  bpm?: number;
  duration?: number;
  totalTracks?: number;
  fileSize?: number;
  customFields?: Map<string, string>;
}

export interface ProjectTrack {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'instrument' | 'bus' | 'auxiliary';
  color: string;
  order: number;
  parentId?: string; // For folder organization
  muted: boolean;
  solo: boolean;
  armed: boolean;
  frozen: boolean;
  visible: boolean;
  height: number;
  volume: number;
  pan: number;
  sends: TrackSend[];
  clips: TrackClip[];
  automation: TrackAutomation[];
  effects: TrackEffect[];
  input: TrackInput;
  output: TrackOutput;
  monitoring: 'off' | 'input' | 'auto';
  recordEnabled: boolean;
  playbackDelay: number;
  createdAt: Date;
  modifiedAt: Date;
}

export interface TrackSend {
  id: string;
  targetTrackId: string;
  amount: number;
  enabled: boolean;
  preFader: boolean;
}

export interface TrackClip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  offset: number;
  fadeIn: number;
  fadeOut: number;
  gain: number;
  pitch: number;
  timeStretch: number;
  reversed: boolean;
  muted: boolean;
  locked: boolean;
  color: string;
  audioData?: Float32Array[];
  midiData?: MidiEvent[];
  markers: ClipMarker[];
  crossfades: Crossfade[];
}

export interface MidiEvent {
  type: 'noteOn' | 'noteOff' | 'controlChange' | 'programChange' | 'pitchBend';
  timestamp: number;
  channel: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
}

export interface ClipMarker {
  id: string;
  name: string;
  time: number;
  type: 'cue' | 'loop' | 'edit';
}

export interface Crossfade {
  id: string;
  startTime: number;
  duration: number;
  curve: 'linear' | 'exponential' | 'logarithmic' | 'sCurve';
}

export interface TrackAutomation {
  id: string;
  parameter: string;
  points: AutomationPoint[];
  enabled: boolean;
  mode: 'read' | 'write' | 'touch' | 'latch';
}

export interface AutomationPoint {
  time: number;
  value: number;
  curve: 'linear' | 'exponential' | 'logarithmic' | 'hold';
}

export interface TrackEffect {
  id: string;
  pluginId: string;
  name: string;
  enabled: boolean;
  bypassed: boolean;
  wet: number;
  parameters: Map<string, number>;
  presetId?: string;
  order: number;
}

export interface TrackInput {
  type: 'none' | 'audio' | 'midi' | 'sidechain';
  source?: string;
  gain: number;
  enabled: boolean;
}

export interface TrackOutput {
  type: 'master' | 'bus' | 'auxiliary' | 'external';
  destination: string;
  gain: number;
  enabled: boolean;
}

export interface Timeline {
  duration: number;
  viewStart: number;
  viewEnd: number;
  zoomLevel: number;
  playheadPosition: number;
  loopStart?: number;
  loopEnd?: number;
  loopEnabled: boolean;
  snapToGrid: boolean;
  gridSize: number;
  timeFormat: 'bars' | 'seconds' | 'samples' | 'timecode';
}

export interface TimelineMarker {
  id: string;
  name: string;
  time: number;
  type: 'marker' | 'section' | 'rehearsal' | 'tempo' | 'timeSignature';
  color: string;
  description?: string;
}

export interface TimelineRegion {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  color: string;
  description?: string;
  loop: boolean;
}

export interface AutomationData {
  id: string;
  trackId: string;
  parameter: string;
  points: AutomationPoint[];
  enabled: boolean;
}

export interface MixerState {
  masterVolume: number;
  masterMute: boolean;
  tracks: TrackMixerState[];
  buses: BusMixerState[];
  sends: SendMixerState[];
  effects: EffectMixerState[];
}

export interface TrackMixerState {
  trackId: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  phase: boolean;
  highpass: number;
  lowpass: number;
}

export interface BusMixerState {
  busId: string;
  volume: number;
  mute: boolean;
  sends: number[];
}

export interface SendMixerState {
  sendId: string;
  amount: number;
  enabled: boolean;
}

export interface EffectMixerState {
  effectId: string;
  enabled: boolean;
  wet: number;
}

export interface ProjectEffect {
  id: string;
  name: string;
  type: string;
  version: string;
  parameters: Map<string, any>;
  presets: EffectPreset[];
  enabled: boolean;
}

export interface EffectPreset {
  id: string;
  name: string;
  parameters: Map<string, any>;
  createdAt: Date;
  isDefault: boolean;
}

export interface ProjectInstrument {
  id: string;
  name: string;
  type: string;
  version: string;
  parameters: Map<string, any>;
  presets: InstrumentPreset[];
  samples: InstrumentSample[];
  enabled: boolean;
}

export interface InstrumentPreset {
  id: string;
  name: string;
  bank: string;
  program: number;
  parameters: Map<string, any>;
  createdAt: Date;
}

export interface InstrumentSample {
  id: string;
  name: string;
  filePath: string;
  rootNote: number;
  velocityRange: [number, number];
  keyRange: [number, number];
  loopStart?: number;
  loopEnd?: number;
}

export interface ProjectSample {
  id: string;
  name: string;
  filePath: string;
  format: string;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  duration: number;
  fileSize: number;
  checksum: string;
  tags: string[];
  bpm?: number;
  key?: string;
  createdAt: Date;
  importedAt: Date;
}

export interface ProjectPreset {
  id: string;
  name: string;
  type: 'track' | 'effect' | 'instrument' | 'mixer' | 'project';
  data: any;
  description?: string;
  tags: string[];
  createdAt: Date;
  createdBy: string;
  isDefault: boolean;
  isShared: boolean;
}

export interface ProjectExport {
  id: string;
  name: string;
  format: string;
  quality: string;
  filePath: string;
  fileSize: number;
  duration: number;
  settings: ExportSettings;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ExportSettings {
  format: 'wav' | 'mp3' | 'flac' | 'aac' | 'm4a';
  sampleRate: number;
  bitDepth: number;
  bitrate?: number;
  quality?: string;
  channels: number;
  normalize: boolean;
  fadeOut: number;
  includeMetadata: boolean;
  startTime?: number;
  endTime?: number;
  selectedTracks?: string[];
}

export interface ProjectBackup {
  id: string;
  version: number;
  filePath: string;
  fileSize: number;
  compressed: boolean;
  automatic: boolean;
  description?: string;
  createdAt: Date;
  restorable: boolean;
}

export interface ProjectNote {
  id: string;
  content: string;
  timestamp?: number;
  trackId?: string;
  createdAt: Date;
  createdBy: string;
  type: 'general' | 'todo' | 'issue' | 'idea';
  priority: 'low' | 'medium' | 'high';
  resolved: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  settings: ProjectSettings;
  tracks: Omit<ProjectTrack, 'clips'>[];
  effects: ProjectEffect[];
  instruments: ProjectInstrument[];
  mixerState: MixerState;
  createdAt: Date;
  createdBy: string;
  usageCount: number;
  isPublic: boolean;
  version: string;
}

export interface ProjectHistory {
  id: string;
  projectId: string;
  action: HistoryAction;
  timestamp: Date;
  userId: string;
  description: string;
  data: any;
  undoable: boolean;
}

export type HistoryAction =
  | 'project_created'
  | 'project_opened'
  | 'project_saved'
  | 'track_added'
  | 'track_deleted'
  | 'track_modified'
  | 'clip_added'
  | 'clip_deleted'
  | 'clip_modified'
  | 'effect_added'
  | 'effect_removed'
  | 'automation_modified'
  | 'mixer_changed'
  | 'export_created'
  | 'backup_created';

export interface ProjectSearchFilters {
  name?: string;
  owner?: string;
  tags?: string[];
  status?: AudioProject['status'][];
  createdAfter?: Date;
  createdBefore?: Date;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  hasCollaborators?: boolean;
  minDuration?: number;
  maxDuration?: number;
  sampleRate?: number[];
  genre?: string[];
  sortBy?: 'name' | 'createdAt' | 'modifiedAt' | 'duration' | 'owner';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ProjectStatistics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  archivedProjects: number;
  totalDuration: number;
  totalFileSize: number;
  averageProjectDuration: number;
  mostUsedTags: string[];
  collaborationStats: {
    totalCollaborators: number;
    averageCollaboratorsPerProject: number;
    mostActiveCollaborators: string[];
  };
  activityStats: {
    projectsCreatedThisMonth: number;
    projectsModifiedThisWeek: number;
    exportsThisMonth: number;
    backupsThisWeek: number;
  };
}

// Main project management system
export class AudioProjectManager extends EventEmitter {
  private projects: Map<string, AudioProject> = new Map();
  private templates: Map<string, ProjectTemplate> = new Map();
  private history: Map<string, ProjectHistory[]> = new Map();
  private activeProject: AudioProject | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private backupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupAutoSave();
    this.setupAutoBackup();
    this.loadDefaultTemplates();
  }

  // Project lifecycle management
  public async createProject(
    name: string,
    settings: Partial<ProjectSettings> = {},
    templateId?: string
  ): Promise<AudioProject> {

    let template: ProjectTemplate | undefined;
    if (templateId) {
      template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }
    }

    const project: AudioProject = {
      id: this.generateId(),
      name,
      description: '',
      createdAt: new Date(),
      modifiedAt: new Date(),
      version: 1,
      templateId,
      owner: 'current_user', // Would be actual user ID
      collaborators: [],
      settings: {
        sampleRate: 44100,
        bitDepth: 24,
        channels: 2,
        tempo: 120,
        timeSignature: [4, 4],
        key: 'C',
        scale: 'major',
        masterVolume: 0,
        clickTrack: false,
        countIn: 0,
        recordingMode: 'overdub',
        quantization: 16,
        snapToGrid: true,
        autoSave: true,
        autoSaveInterval: 300, // 5 minutes
        backupRetention: 10,
        maxUndoSteps: 100,
        ...template?.settings,
        ...settings
      },
      metadata: {
        totalTracks: 0,
        duration: 0,
        fileSize: 0
      },
      tracks: template ? this.createTracksFromTemplate(template.tracks) : [],
      timeline: {
        duration: 300, // 5 minutes default
        viewStart: 0,
        viewEnd: 60, // 1 minute view
        zoomLevel: 1,
        playheadPosition: 0,
        loopEnabled: false,
        snapToGrid: true,
        gridSize: 1, // 1 beat
        timeFormat: 'bars'
      },
      markers: [],
      regions: [],
      automation: [],
      mixerState: template?.mixerState || this.createDefaultMixerState(),
      effects: template ? [...template.effects] : [],
      instruments: template ? [...template.instruments] : [],
      samples: [],
      presets: [],
      exports: [],
      backups: [],
      status: 'draft',
      tags: [],
      notes: []
    };

    this.projects.set(project.id, project);
    this.addToHistory(project.id, {
      action: 'project_created',
      description: `Project "${name}" created`,
      data: { templateId }
    });

    this.emit('projectCreated', project);

    if (template) {
      template.usageCount++;
    }

    return project;
  }

  public async openProject(projectId: string): Promise<AudioProject> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (this.activeProject && this.activeProject.id !== projectId) {
      await this.saveProject(this.activeProject.id);
    }

    this.activeProject = project;
    project.lastOpenedAt = new Date();

    this.addToHistory(projectId, {
      action: 'project_opened',
      description: `Project "${project.name}" opened`,
      data: {}
    });

    this.emit('projectOpened', project);
    return project;
  }

  public async saveProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    project.modifiedAt = new Date();
    project.version++;

    // Update metadata
    project.metadata.totalTracks = project.tracks.length;
    project.metadata.duration = this.calculateProjectDuration(project);
    project.metadata.fileSize = this.calculateProjectSize(project);

    this.addToHistory(projectId, {
      action: 'project_saved',
      description: `Project "${project.name}" saved`,
      data: { version: project.version }
    });

    this.emit('projectSaved', project);
  }

  public async closeProject(projectId: string, saveFirst: boolean = true): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (saveFirst) {
      await this.saveProject(projectId);
    }

    if (this.activeProject?.id === projectId) {
      this.activeProject = null;
    }

    this.emit('projectClosed', project);
  }

  public async deleteProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Create final backup before deletion
    await this.createBackup(projectId, `Final backup before deletion`);

    project.status = 'deleted';
    project.modifiedAt = new Date();

    this.emit('projectDeleted', project);
  }

  public async duplicateProject(projectId: string, newName: string): Promise<AudioProject> {
    const originalProject = this.projects.get(projectId);
    if (!originalProject) {
      throw new Error(`Project ${projectId} not found`);
    }

    const duplicatedProject: AudioProject = {
      ...JSON.parse(JSON.stringify(originalProject)), // Deep clone
      id: this.generateId(),
      name: newName,
      createdAt: new Date(),
      modifiedAt: new Date(),
      version: 1,
      owner: 'current_user',
      collaborators: [],
      exports: [],
      backups: [],
      status: 'draft'
    };

    // Generate new IDs for all nested objects
    duplicatedProject.tracks = duplicatedProject.tracks.map(track => ({
      ...track,
      id: this.generateId(),
      clips: track.clips.map(clip => ({ ...clip, id: this.generateId() })),
      automation: track.automation.map(auto => ({ ...auto, id: this.generateId() })),
      effects: track.effects.map(effect => ({ ...effect, id: this.generateId() }))
    }));

    this.projects.set(duplicatedProject.id, duplicatedProject);

    this.addToHistory(duplicatedProject.id, {
      action: 'project_created',
      description: `Project duplicated from "${originalProject.name}"`,
      data: { originalProjectId: projectId }
    });

    this.emit('projectDuplicated', { original: originalProject, duplicate: duplicatedProject });

    return duplicatedProject;
  }

  // Track management
  public async addTrack(
    projectId: string,
    trackData: Partial<ProjectTrack>,
    position?: number
  ): Promise<ProjectTrack> {

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const track: ProjectTrack = {
      id: this.generateId(),
      name: trackData.name || `Track ${project.tracks.length + 1}`,
      type: trackData.type || 'audio',
      color: trackData.color || this.getRandomTrackColor(),
      order: position !== undefined ? position : project.tracks.length,
      muted: false,
      solo: false,
      armed: false,
      frozen: false,
      visible: true,
      height: 80,
      volume: 0,
      pan: 0,
      sends: [],
      clips: [],
      automation: [],
      effects: [],
      input: {
        type: 'none',
        gain: 0,
        enabled: false
      },
      output: {
        type: 'master',
        destination: 'master',
        gain: 0,
        enabled: true
      },
      monitoring: 'auto',
      recordEnabled: false,
      playbackDelay: 0,
      createdAt: new Date(),
      modifiedAt: new Date(),
      ...trackData
    };

    if (position !== undefined) {
      project.tracks.splice(position, 0, track);
      // Update order of subsequent tracks
      for (let i = position + 1; i < project.tracks.length; i++) {
        project.tracks[i].order = i;
      }
    } else {
      project.tracks.push(track);
    }

    project.modifiedAt = new Date();

    this.addToHistory(projectId, {
      action: 'track_added',
      description: `Track "${track.name}" added`,
      data: { trackId: track.id, type: track.type }
    });

    this.emit('trackAdded', { projectId, track });

    return track;
  }

  public async deleteTrack(projectId: string, trackId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const trackIndex = project.tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) {
      throw new Error(`Track ${trackId} not found`);
    }

    const track = project.tracks[trackIndex];
    project.tracks.splice(trackIndex, 1);

    // Update order of subsequent tracks
    for (let i = trackIndex; i < project.tracks.length; i++) {
      project.tracks[i].order = i;
    }

    project.modifiedAt = new Date();

    this.addToHistory(projectId, {
      action: 'track_deleted',
      description: `Track "${track.name}" deleted`,
      data: { trackId, trackName: track.name }
    });

    this.emit('trackDeleted', { projectId, trackId, track });
  }

  public async updateTrack(
    projectId: string,
    trackId: string,
    updates: Partial<ProjectTrack>
  ): Promise<void> {

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const track = project.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track ${trackId} not found`);
    }

    const oldValues = { ...track };
    Object.assign(track, updates);
    track.modifiedAt = new Date();
    project.modifiedAt = new Date();

    this.addToHistory(projectId, {
      action: 'track_modified',
      description: `Track "${track.name}" modified`,
      data: { trackId, updates, oldValues }
    });

    this.emit('trackUpdated', { projectId, trackId, track, updates });
  }

  // Clip management
  public async addClip(
    projectId: string,
    trackId: string,
    clipData: Partial<TrackClip>
  ): Promise<TrackClip> {

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const track = project.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track ${trackId} not found`);
    }

    const clip: TrackClip = {
      id: this.generateId(),
      name: clipData.name || `Clip ${track.clips.length + 1}`,
      startTime: clipData.startTime || 0,
      duration: clipData.duration || 4, // 4 seconds default
      offset: 0,
      fadeIn: 0,
      fadeOut: 0,
      gain: 0,
      pitch: 0,
      timeStretch: 1,
      reversed: false,
      muted: false,
      locked: false,
      color: track.color,
      markers: [],
      crossfades: [],
      ...clipData
    };

    track.clips.push(clip);
    track.modifiedAt = new Date();
    project.modifiedAt = new Date();

    this.addToHistory(projectId, {
      action: 'clip_added',
      description: `Clip "${clip.name}" added to track "${track.name}"`,
      data: { trackId, clipId: clip.id }
    });

    this.emit('clipAdded', { projectId, trackId, clip });

    return clip;
  }

  public async deleteClip(projectId: string, trackId: string, clipId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const track = project.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track ${trackId} not found`);
    }

    const clipIndex = track.clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) {
      throw new Error(`Clip ${clipId} not found`);
    }

    const clip = track.clips[clipIndex];
    track.clips.splice(clipIndex, 1);
    track.modifiedAt = new Date();
    project.modifiedAt = new Date();

    this.addToHistory(projectId, {
      action: 'clip_deleted',
      description: `Clip "${clip.name}" deleted from track "${track.name}"`,
      data: { trackId, clipId, clipName: clip.name }
    });

    this.emit('clipDeleted', { projectId, trackId, clipId, clip });
  }

  // Template management
  public async createTemplate(
    name: string,
    description: string,
    category: string,
    projectId: string
  ): Promise<ProjectTemplate> {

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const template: ProjectTemplate = {
      id: this.generateId(),
      name,
      description,
      category,
      tags: [...project.tags],
      settings: { ...project.settings },
      tracks: project.tracks.map(track => ({
        ...track,
        clips: [] // Templates don't include clips
      })),
      effects: [...project.effects],
      instruments: [...project.instruments],
      mixerState: { ...project.mixerState },
      createdAt: new Date(),
      createdBy: 'current_user',
      usageCount: 0,
      isPublic: false,
      version: '1.0.0'
    };

    this.templates.set(template.id, template);

    this.emit('templateCreated', template);

    return template;
  }

  public getTemplates(category?: string): ProjectTemplate[] {
    const templates = Array.from(this.templates.values());
    return category ? templates.filter(t => t.category === category) : templates;
  }

  // Search and filtering
  public searchProjects(filters: ProjectSearchFilters): AudioProject[] {
    let projects = Array.from(this.projects.values());

    // Apply filters
    if (filters.name) {
      const searchTerm = filters.name.toLowerCase();
      projects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.owner) {
      projects = projects.filter(p => p.owner === filters.owner);
    }

    if (filters.tags && filters.tags.length > 0) {
      projects = projects.filter(p =>
        filters.tags!.some(tag => p.tags.includes(tag))
      );
    }

    if (filters.status && filters.status.length > 0) {
      projects = projects.filter(p => filters.status!.includes(p.status));
    }

    if (filters.createdAfter) {
      projects = projects.filter(p => p.createdAt >= filters.createdAfter!);
    }

    if (filters.createdBefore) {
      projects = projects.filter(p => p.createdAt <= filters.createdBefore!);
    }

    if (filters.modifiedAfter) {
      projects = projects.filter(p => p.modifiedAt >= filters.modifiedAfter!);
    }

    if (filters.modifiedBefore) {
      projects = projects.filter(p => p.modifiedAt <= filters.modifiedBefore!);
    }

    if (filters.hasCollaborators !== undefined) {
      projects = projects.filter(p =>
        filters.hasCollaborators ? p.collaborators.length > 0 : p.collaborators.length === 0
      );
    }

    if (filters.minDuration !== undefined) {
      projects = projects.filter(p => (p.metadata.duration || 0) >= filters.minDuration!);
    }

    if (filters.maxDuration !== undefined) {
      projects = projects.filter(p => (p.metadata.duration || 0) <= filters.maxDuration!);
    }

    if (filters.sampleRate && filters.sampleRate.length > 0) {
      projects = projects.filter(p => filters.sampleRate!.includes(p.settings.sampleRate));
    }

    if (filters.genre && filters.genre.length > 0) {
      projects = projects.filter(p =>
        filters.genre!.includes(p.metadata.genre || '')
      );
    }

    // Sort results
    const sortBy = filters.sortBy || 'modifiedAt';
    const sortOrder = filters.sortOrder || 'desc';

    projects.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'createdAt':
          valueA = a.createdAt.getTime();
          valueB = b.createdAt.getTime();
          break;
        case 'modifiedAt':
          valueA = a.modifiedAt.getTime();
          valueB = b.modifiedAt.getTime();
          break;
        case 'duration':
          valueA = a.metadata.duration || 0;
          valueB = b.metadata.duration || 0;
          break;
        case 'owner':
          valueA = a.owner.toLowerCase();
          valueB = b.owner.toLowerCase();
          break;
        default:
          valueA = a.modifiedAt.getTime();
          valueB = b.modifiedAt.getTime();
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit;

    if (limit !== undefined) {
      projects = projects.slice(offset, offset + limit);
    }

    return projects;
  }

  // Statistics and analytics
  public getProjectStatistics(): ProjectStatistics {
    const projects = Array.from(this.projects.values());

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const archivedProjects = projects.filter(p => p.status === 'archived').length;

    const totalDuration = projects.reduce((sum, p) => sum + (p.metadata.duration || 0), 0);
    const totalFileSize = projects.reduce((sum, p) => sum + (p.metadata.fileSize || 0), 0);
    const averageProjectDuration = totalProjects > 0 ? totalDuration / totalProjects : 0;

    // Calculate tag usage
    const tagCounts = new Map<string, number>();
    projects.forEach(p => {
      p.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const mostUsedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    // Collaboration stats
    const allCollaborators = new Set<string>();
    projects.forEach(p => {
      p.collaborators.forEach(c => allCollaborators.add(c.userId));
    });

    const totalCollaborators = allCollaborators.size;
    const averageCollaboratorsPerProject = totalProjects > 0 ?
      projects.reduce((sum, p) => sum + p.collaborators.length, 0) / totalProjects : 0;

    // Activity stats (simplified)
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const projectsCreatedThisMonth = projects.filter(p => p.createdAt >= thisMonth).length;
    const projectsModifiedThisWeek = projects.filter(p => p.modifiedAt >= thisWeek).length;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      archivedProjects,
      totalDuration,
      totalFileSize,
      averageProjectDuration,
      mostUsedTags,
      collaborationStats: {
        totalCollaborators,
        averageCollaboratorsPerProject,
        mostActiveCollaborators: [] // Would need user activity tracking
      },
      activityStats: {
        projectsCreatedThisMonth,
        projectsModifiedThisWeek,
        exportsThisMonth: 0, // Would need export tracking
        backupsThisWeek: 0 // Would need backup tracking
      }
    };
  }

  // Backup and versioning
  public async createBackup(projectId: string, description?: string): Promise<ProjectBackup> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const backup: ProjectBackup = {
      id: this.generateId(),
      version: project.version,
      filePath: `/backups/${projectId}_v${project.version}_${Date.now()}.backup`,
      fileSize: this.calculateProjectSize(project),
      compressed: true,
      automatic: false,
      description,
      createdAt: new Date(),
      restorable: true
    };

    project.backups.push(backup);

    // Clean up old backups if retention limit exceeded
    if (project.backups.length > project.settings.backupRetention) {
      const backupsToRemove = project.backups
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, project.backups.length - project.settings.backupRetention);

      project.backups = project.backups.filter(b => !backupsToRemove.includes(b));
    }

    this.addToHistory(projectId, {
      action: 'backup_created',
      description: `Backup created: ${description || 'Manual backup'}`,
      data: { backupId: backup.id, version: project.version }
    });

    this.emit('backupCreated', { projectId, backup });

    return backup;
  }

  // Export management
  public async exportProject(
    projectId: string,
    settings: ExportSettings,
    name?: string
  ): Promise<ProjectExport> {

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const exportJob: ProjectExport = {
      id: this.generateId(),
      name: name || `${project.name}_export_${Date.now()}`,
      format: settings.format,
      quality: settings.quality || 'high',
      filePath: `/exports/${this.generateId()}.${settings.format}`,
      fileSize: 0,
      duration: 0,
      settings,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    project.exports.push(exportJob);

    this.addToHistory(projectId, {
      action: 'export_created',
      description: `Export "${exportJob.name}" created`,
      data: { exportId: exportJob.id, format: settings.format }
    });

    this.emit('exportCreated', { projectId, export: exportJob });

    // Start export process (would be async in real implementation)
    this.processExport(projectId, exportJob.id);

    return exportJob;
  }

  // Collaboration
  public async addCollaborator(
    projectId: string,
    userId: string,
    role: ProjectCollaborator['role'],
    permissions?: Partial<CollaboratorPermissions>
  ): Promise<void> {

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (project.collaborators.some(c => c.userId === userId)) {
      throw new Error(`User ${userId} is already a collaborator`);
    }

    const collaborator: ProjectCollaborator = {
      userId,
      role,
      permissions: {
        canEdit: role === 'editor' || role === 'owner',
        canDelete: role === 'owner',
        canExport: role !== 'viewer',
        canInvite: role === 'owner',
        canChangeSettings: role === 'owner',
        canViewHistory: true,
        canCreateBackups: role !== 'viewer',
        canManageTracks: role === 'editor' || role === 'owner',
        canManageEffects: role === 'editor' || role === 'owner',
        ...permissions
      },
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isOnline: false
    };

    project.collaborators.push(collaborator);
    project.modifiedAt = new Date();

    this.emit('collaboratorAdded', { projectId, collaborator });
  }

  // Utility methods
  private setupAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      if (this.activeProject && this.activeProject.settings.autoSave) {
        this.saveProject(this.activeProject.id);
      }
    }, 60000); // Check every minute
  }

  private setupAutoBackup(): void {
    this.backupInterval = setInterval(() => {
      if (this.activeProject) {
        this.createBackup(this.activeProject.id, 'Automatic backup');
      }
    }, 3600000); // Every hour
  }

  private loadDefaultTemplates(): void {
    // Load built-in templates
    const templates = [
      {
        id: 'basic_stereo',
        name: 'Basic Stereo Project',
        description: 'Simple stereo project with basic tracks',
        category: 'basic'
      },
      {
        id: 'podcast',
        name: 'Podcast Project',
        description: 'Template for podcast recording and editing',
        category: 'voice'
      },
      {
        id: 'music_production',
        name: 'Music Production',
        description: 'Full music production template with instruments',
        category: 'music'
      }
    ];

    // Create templates (simplified)
    templates.forEach(templateData => {
      const template: ProjectTemplate = {
        ...templateData,
        tags: [],
        settings: {
          sampleRate: 44100,
          bitDepth: 24,
          channels: 2,
          tempo: 120,
          timeSignature: [4, 4],
          key: 'C',
          scale: 'major',
          masterVolume: 0,
          clickTrack: false,
          countIn: 0,
          recordingMode: 'overdub',
          quantization: 16,
          snapToGrid: true,
          autoSave: true,
          autoSaveInterval: 300,
          backupRetention: 10,
          maxUndoSteps: 100
        },
        tracks: [],
        effects: [],
        instruments: [],
        mixerState: this.createDefaultMixerState(),
        createdAt: new Date(),
        createdBy: 'system',
        usageCount: 0,
        isPublic: true,
        version: '1.0.0'
      };

      this.templates.set(template.id, template);
    });
  }

  private createTracksFromTemplate(templateTracks: Omit<ProjectTrack, 'clips'>[]): ProjectTrack[] {
    return templateTracks.map(templateTrack => ({
      ...templateTrack,
      id: this.generateId(),
      clips: [],
      automation: templateTrack.automation.map(auto => ({
        ...auto,
        id: this.generateId()
      })),
      effects: templateTrack.effects.map(effect => ({
        ...effect,
        id: this.generateId()
      })),
      createdAt: new Date(),
      modifiedAt: new Date()
    }));
  }

  private createDefaultMixerState(): MixerState {
    return {
      masterVolume: 0,
      masterMute: false,
      tracks: [],
      buses: [],
      sends: [],
      effects: []
    };
  }

  private addToHistory(projectId: string, historyData: Partial<ProjectHistory>): void {
    const history: ProjectHistory = {
      id: this.generateId(),
      projectId,
      action: historyData.action!,
      timestamp: new Date(),
      userId: 'current_user',
      description: historyData.description!,
      data: historyData.data || {},
      undoable: true,
      ...historyData
    };

    if (!this.history.has(projectId)) {
      this.history.set(projectId, []);
    }

    const projectHistory = this.history.get(projectId)!;
    projectHistory.push(history);

    // Limit history size
    const maxHistory = 1000;
    if (projectHistory.length > maxHistory) {
      projectHistory.splice(0, projectHistory.length - maxHistory);
    }

    this.emit('historyAdded', { projectId, history });
  }

  private calculateProjectDuration(project: AudioProject): number {
    let maxDuration = 0;

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        maxDuration = Math.max(maxDuration, clipEnd);
      }
    }

    return maxDuration;
  }

  private calculateProjectSize(project: AudioProject): number {
    // Simplified size calculation
    let totalSize = 1024; // Base project size in bytes

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.audioData) {
          totalSize += clip.audioData.reduce((sum, channel) => sum + channel.length * 4, 0);
        }
      }
    }

    return totalSize;
  }

  private getRandomTrackColor(): string {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
      '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private async processExport(projectId: string, exportId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) return;

    const exportJob = project.exports.find(e => e.id === exportId);
    if (!exportJob) return;

    // Simulate export process
    exportJob.status = 'processing';

    const progressInterval = setInterval(() => {
      exportJob.progress += 10;
      this.emit('exportProgress', { projectId, exportId, progress: exportJob.progress });

      if (exportJob.progress >= 100) {
        clearInterval(progressInterval);
        exportJob.status = 'completed';
        exportJob.completedAt = new Date();
        exportJob.fileSize = 1024 * 1024; // 1MB placeholder
        exportJob.duration = this.calculateProjectDuration(project);

        this.emit('exportCompleted', { projectId, export: exportJob });
      }
    }, 500);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Public API
  public getProject(projectId: string): AudioProject | undefined {
    return this.projects.get(projectId);
  }

  public getActiveProject(): AudioProject | null {
    return this.activeProject;
  }

  public getAllProjects(): AudioProject[] {
    return Array.from(this.projects.values());
  }

  public getProjectHistory(projectId: string): ProjectHistory[] {
    return this.history.get(projectId) || [];
  }

  public getTemplate(templateId: string): ProjectTemplate | undefined {
    return this.templates.get(templateId);
  }

  public destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    this.removeAllListeners();
  }
}

// Project management presets
export const ProjectManagementPresets = {
  BASIC_STEREO: {
    name: 'Basic Stereo Project',
    settings: {
      sampleRate: 44100,
      bitDepth: 24,
      channels: 2,
      tempo: 120,
      timeSignature: [4, 4] as [number, number]
    }
  },

  HIGH_QUALITY: {
    name: 'High Quality Project',
    settings: {
      sampleRate: 96000,
      bitDepth: 32,
      channels: 2,
      tempo: 120,
      timeSignature: [4, 4] as [number, number]
    }
  },

  PODCAST: {
    name: 'Podcast Project',
    settings: {
      sampleRate: 48000,
      bitDepth: 24,
      channels: 1,
      tempo: 120,
      timeSignature: [4, 4] as [number, number]
    }
  }
};