import { EventEmitter } from 'events';

export interface AudioProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  thumbnail?: string;
  tracks: TrackTemplate[];
  effects: EffectTemplate[];
  settings: ProjectSettings;
  metadata: TemplateMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackTemplate {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'aux' | 'group' | 'master';
  channel: number;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  color: string;
  effects: string[];
  sends: SendTemplate[];
  automation: AutomationTemplate[];
}

export interface EffectTemplate {
  id: string;
  name: string;
  plugin: string;
  parameters: Record<string, any>;
  enabled: boolean;
  preset?: string;
  order: number;
}

export interface SendTemplate {
  targetId: string;
  level: number;
  enabled: boolean;
}

export interface AutomationTemplate {
  parameter: string;
  points: AutomationPoint[];
  enabled: boolean;
}

export interface AutomationPoint {
  time: number;
  value: number;
  curve: 'linear' | 'exponential' | 'logarithmic' | 'bezier';
}

export interface ProjectSettings {
  sampleRate: number;
  bufferSize: number;
  bitDepth: number;
  tempo: number;
  timeSignature: [number, number];
  keySignature: string;
  swing: number;
  metronome: MetronomeSettings;
  recording: RecordingSettings;
  mixing: MixingSettings;
}

export interface MetronomeSettings {
  enabled: boolean;
  volume: number;
  sound: 'click' | 'beep' | 'tick' | 'custom';
  accentBeats: boolean;
  countIn: number;
}

export interface RecordingSettings {
  mode: 'overdub' | 'replace' | 'punch';
  monitoring: 'off' | 'input' | 'playback';
  latencyCompensation: boolean;
  autoArm: boolean;
  recordOnPlay: boolean;
}

export interface MixingSettings {
  masterVolume: number;
  headroom: number;
  dithering: boolean;
  clipProtection: boolean;
  soloInPlace: boolean;
  soloMode: 'destructive' | 'non-destructive';
}

export interface TemplateMetadata {
  author: string;
  version: string;
  genre: string;
  instruments: string[];
  bpm: number;
  key: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedDuration: number;
  requirements: string[];
  license: string;
}

export type TemplateCategory =
  | 'song-writing'
  | 'mixing'
  | 'mastering'
  | 'podcast'
  | 'live-performance'
  | 'sound-design'
  | 'voice-over'
  | 'orchestral'
  | 'electronic'
  | 'rock-band'
  | 'hip-hop'
  | 'jazz'
  | 'classical'
  | 'ambient'
  | 'experimental';

export interface PresetCollection {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  presets: AudioPreset[];
  author: string;
  version: string;
  createdAt: Date;
}

export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  type: PresetType;
  data: Record<string, any>;
  tags: string[];
  rating: number;
  downloads: number;
  createdAt: Date;
}

export type PresetCategory =
  | 'effects'
  | 'instruments'
  | 'mixing'
  | 'mastering'
  | 'automation'
  | 'midi'
  | 'sampling';

export type PresetType =
  | 'effect-chain'
  | 'mixer-settings'
  | 'automation-curve'
  | 'midi-mapping'
  | 'instrument-patch'
  | 'eq-curve'
  | 'compressor-settings'
  | 'reverb-space'
  | 'delay-pattern';

export class ProjectTemplateManager extends EventEmitter {
  private templates: Map<string, AudioProjectTemplate> = new Map();
  private presets: Map<string, PresetCollection> = new Map();
  private categories: Map<TemplateCategory, AudioProjectTemplate[]> = new Map();

  constructor() {
    super();
    this.initializeDefaultTemplates();
  }

  // Template Management
  async createTemplate(template: Omit<AudioProjectTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<AudioProjectTemplate> {
    const newTemplate: AudioProjectTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(newTemplate.id, newTemplate);
    this.categorizeTemplate(newTemplate);
    this.emit('template:created', newTemplate);

    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<AudioProjectTemplate>): Promise<AudioProjectTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(id, updatedTemplate);
    this.categorizeTemplate(updatedTemplate);
    this.emit('template:updated', updatedTemplate);

    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const template = this.templates.get(id);
    if (!template) return false;

    this.templates.delete(id);
    this.removeCategorizedTemplate(template);
    this.emit('template:deleted', id);

    return true;
  }

  getTemplate(id: string): AudioProjectTemplate | null {
    return this.templates.get(id) || null;
  }

  getAllTemplates(): AudioProjectTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: TemplateCategory): AudioProjectTemplate[] {
    return this.categories.get(category) || [];
  }

  searchTemplates(query: string, filters?: {
    category?: TemplateCategory;
    tags?: string[];
    author?: string;
    difficulty?: string;
  }): AudioProjectTemplate[] {
    let templates = this.getAllTemplates();

    // Apply filters
    if (filters?.category) {
      templates = templates.filter(t => t.category === filters.category);
    }

    if (filters?.tags?.length) {
      templates = templates.filter(t =>
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (filters?.author) {
      templates = templates.filter(t =>
        t.metadata.author.toLowerCase().includes(filters.author!.toLowerCase())
      );
    }

    if (filters?.difficulty) {
      templates = templates.filter(t => t.metadata.difficulty === filters.difficulty);
    }

    // Search by query
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(queryLower) ||
        t.description.toLowerCase().includes(queryLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
        t.metadata.genre.toLowerCase().includes(queryLower)
      );
    }

    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Preset Management
  async createPresetCollection(collection: Omit<PresetCollection, 'id' | 'createdAt'>): Promise<PresetCollection> {
    const newCollection: PresetCollection = {
      ...collection,
      id: `preset-collection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    this.presets.set(newCollection.id, newCollection);
    this.emit('preset:collection:created', newCollection);

    return newCollection;
  }

  async addPresetToCollection(collectionId: string, preset: Omit<AudioPreset, 'id' | 'createdAt'>): Promise<AudioPreset | null> {
    const collection = this.presets.get(collectionId);
    if (!collection) return null;

    const newPreset: AudioPreset = {
      ...preset,
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    collection.presets.push(newPreset);
    this.emit('preset:added', newPreset, collectionId);

    return newPreset;
  }

  getPresetCollection(id: string): PresetCollection | null {
    return this.presets.get(id) || null;
  }

  getAllPresetCollections(): PresetCollection[] {
    return Array.from(this.presets.values());
  }

  searchPresets(query: string, filters?: {
    category?: PresetCategory;
    type?: PresetType;
    rating?: number;
  }): AudioPreset[] {
    const allPresets: AudioPreset[] = [];

    this.presets.forEach(collection => {
      allPresets.push(...collection.presets);
    });

    let presets = allPresets;

    // Apply filters
    if (filters?.category) {
      presets = presets.filter(p => {
        const collection = Array.from(this.presets.values()).find(c =>
          c.presets.some(preset => preset.id === p.id)
        );
        return collection?.category === filters.category;
      });
    }

    if (filters?.type) {
      presets = presets.filter(p => p.type === filters.type);
    }

    if (filters?.rating) {
      presets = presets.filter(p => p.rating >= filters.rating!);
    }

    // Search by query
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      presets = presets.filter(p =>
        p.name.toLowerCase().includes(queryLower) ||
        p.description.toLowerCase().includes(queryLower) ||
        p.tags.some(tag => tag.toLowerCase().includes(queryLower))
      );
    }

    return presets.sort((a, b) => b.rating - a.rating || b.downloads - a.downloads);
  }

  // Project Creation from Templates
  async createProjectFromTemplate(templateId: string, projectName: string): Promise<any> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const project = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: projectName,
      templateId: template.id,
      tracks: this.createTracksFromTemplate(template.tracks),
      effects: this.createEffectsFromTemplate(template.effects),
      settings: { ...template.settings },
      createdAt: new Date(),
      lastModified: new Date()
    };

    this.emit('project:created:from:template', project, template);
    return project;
  }

  async exportTemplate(templateId: string): Promise<string> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    return JSON.stringify(template, null, 2);
  }

  async importTemplate(templateData: string): Promise<AudioProjectTemplate> {
    try {
      const parsedTemplate = JSON.parse(templateData);

      // Validate template structure
      this.validateTemplateStructure(parsedTemplate);

      // Create new template with fresh ID and timestamps
      const template: AudioProjectTemplate = {
        ...parsedTemplate,
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.templates.set(template.id, template);
      this.categorizeTemplate(template);
      this.emit('template:imported', template);

      return template;
    } catch (error) {
      throw new Error(`Failed to import template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private Methods
  private categorizeTemplate(template: AudioProjectTemplate): void {
    if (!this.categories.has(template.category)) {
      this.categories.set(template.category, []);
    }

    const categoryTemplates = this.categories.get(template.category)!;
    const existingIndex = categoryTemplates.findIndex(t => t.id === template.id);

    if (existingIndex >= 0) {
      categoryTemplates[existingIndex] = template;
    } else {
      categoryTemplates.push(template);
    }
  }

  private removeCategorizedTemplate(template: AudioProjectTemplate): void {
    const categoryTemplates = this.categories.get(template.category);
    if (categoryTemplates) {
      const index = categoryTemplates.findIndex(t => t.id === template.id);
      if (index >= 0) {
        categoryTemplates.splice(index, 1);
      }
    }
  }

  private createTracksFromTemplate(trackTemplates: TrackTemplate[]): any[] {
    return trackTemplates.map(template => ({
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...template,
      clips: [],
      automation: template.automation.map(auto => ({ ...auto }))
    }));
  }

  private createEffectsFromTemplate(effectTemplates: EffectTemplate[]): any[] {
    return effectTemplates.map(template => ({
      id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...template
    }));
  }

  private validateTemplateStructure(template: any): void {
    const requiredFields = ['name', 'category', 'tracks', 'effects', 'settings', 'metadata'];

    for (const field of requiredFields) {
      if (!(field in template)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(template.tracks)) {
      throw new Error('tracks must be an array');
    }

    if (!Array.isArray(template.effects)) {
      throw new Error('effects must be an array');
    }
  }

  private initializeDefaultTemplates(): void {
    // Initialize with some default templates
    const defaultTemplates: Array<Omit<AudioProjectTemplate, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'Basic Song Recording',
        description: 'Simple template for recording a song with vocals and instruments',
        category: 'song-writing',
        tags: ['recording', 'vocals', 'instruments', 'basic'],
        tracks: [
          {
            id: 'master',
            name: 'Master',
            type: 'master',
            channel: 0,
            volume: 0.8,
            pan: 0,
            muted: false,
            solo: false,
            armed: false,
            color: '#ff0000',
            effects: [],
            sends: [],
            automation: []
          },
          {
            id: 'vocals',
            name: 'Lead Vocals',
            type: 'audio',
            channel: 1,
            volume: 0.7,
            pan: 0,
            muted: false,
            solo: false,
            armed: true,
            color: '#00ff00',
            effects: ['eq', 'compressor', 'reverb'],
            sends: [],
            automation: []
          },
          {
            id: 'guitar',
            name: 'Guitar',
            type: 'audio',
            channel: 2,
            volume: 0.6,
            pan: -0.3,
            muted: false,
            solo: false,
            armed: false,
            color: '#0000ff',
            effects: ['eq', 'amp-sim'],
            sends: [],
            automation: []
          }
        ],
        effects: [
          {
            id: 'eq',
            name: 'EQ',
            plugin: 'parametric-eq',
            parameters: { lowGain: 0, midGain: 0, highGain: 0 },
            enabled: true,
            order: 1
          },
          {
            id: 'compressor',
            name: 'Compressor',
            plugin: 'compressor',
            parameters: { ratio: 4, attack: 10, release: 100 },
            enabled: true,
            order: 2
          }
        ],
        settings: {
          sampleRate: 48000,
          bufferSize: 512,
          bitDepth: 24,
          tempo: 120,
          timeSignature: [4, 4],
          keySignature: 'C',
          swing: 0,
          metronome: {
            enabled: true,
            volume: 0.5,
            sound: 'click',
            accentBeats: true,
            countIn: 2
          },
          recording: {
            mode: 'overdub',
            monitoring: 'input',
            latencyCompensation: true,
            autoArm: false,
            recordOnPlay: false
          },
          mixing: {
            masterVolume: 0.8,
            headroom: 6,
            dithering: true,
            clipProtection: true,
            soloInPlace: false,
            soloMode: 'non-destructive'
          }
        },
        metadata: {
          author: 'System',
          version: '1.0',
          genre: 'General',
          instruments: ['vocals', 'guitar'],
          bpm: 120,
          key: 'C',
          difficulty: 'beginner',
          estimatedDuration: 30,
          requirements: [],
          license: 'MIT'
        }
      }
    ];

    defaultTemplates.forEach(template => {
      this.createTemplate(template);
    });
  }
}