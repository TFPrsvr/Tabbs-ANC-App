import { EventEmitter } from 'events';

export interface AudioPlugin {
  id: string;
  name: string;
  version: string;
  manufacturer: string;
  category: PluginCategory;
  type: PluginType;
  format: PluginFormat;
  parameters: PluginParameter[];
  presets: PluginPreset[];
  metadata: PluginMetadata;
  isLoaded: boolean;
  isActive: boolean;
  bypassable: boolean;
  latency: number;
  sampleRate: number;
  blockSize: number;
}

export interface PluginParameter {
  id: string;
  name: string;
  type: ParameterType;
  value: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  step?: number;
  unit?: string;
  displayName?: string;
  description?: string;
  isAutomatable: boolean;
  group?: string;
}

export interface PluginPreset {
  id: string;
  name: string;
  description?: string;
  parameters: Record<string, number>;
  tags: string[];
  author?: string;
  createdAt: Date;
}

export interface PluginMetadata {
  description: string;
  website?: string;
  documentation?: string;
  supportedSampleRates: number[];
  maxChannels: number;
  hasMidiInput: boolean;
  hasMidiOutput: boolean;
  hasAudioInput: boolean;
  hasAudioOutput: boolean;
  isSynth: boolean;
  isEffect: boolean;
  license: string;
  fileSize: number;
  installDate: Date;
}

export interface PluginChain {
  id: string;
  name: string;
  plugins: PluginInstance[];
  enabled: boolean;
  wetDryMix: number;
  masterBypass: boolean;
}

export interface PluginInstance {
  id: string;
  pluginId: string;
  enabled: boolean;
  bypassed: boolean;
  parameterValues: Record<string, number>;
  presetId?: string;
  position: number;
  processingNode?: AudioNode;
}

export interface VST3Plugin extends AudioPlugin {
  vstInfo: {
    uniqueId: string;
    vendorVersion: number;
    sdkVersion: string;
    subCategories: string[];
    classFlags: number;
  };
}

export interface AudioUnitPlugin extends AudioPlugin {
  auInfo: {
    type: string;
    subtype: string;
    manufacturer: string;
    version: number;
  };
}

export interface WebAudioPlugin extends AudioPlugin {
  audioWorkletUrl?: string;
  processorName?: string;
  moduleCode?: string;
}

export interface PluginScanResult {
  found: AudioPlugin[];
  failed: PluginScanError[];
  scanTime: number;
  totalScanned: number;
}

export interface PluginScanError {
  path: string;
  error: string;
  timestamp: Date;
}

export type PluginCategory =
  | 'effect'
  | 'instrument'
  | 'analyzer'
  | 'generator'
  | 'filter'
  | 'dynamics'
  | 'reverb'
  | 'delay'
  | 'modulation'
  | 'distortion'
  | 'eq'
  | 'utility'
  | 'mastering'
  | 'sampler'
  | 'synthesizer'
  | 'drum-machine';

export type PluginType =
  | 'vst2'
  | 'vst3'
  | 'audio-unit'
  | 'ladspa'
  | 'lv2'
  | 'web-audio'
  | 'native';

export type PluginFormat =
  | 'native'
  | 'vst2-dll'
  | 'vst3-vst3'
  | 'au-component'
  | 'ladspa-so'
  | 'lv2-bundle'
  | 'web-audio-worklet';

export type ParameterType =
  | 'float'
  | 'int'
  | 'bool'
  | 'enum'
  | 'string'
  | 'midi-note'
  | 'frequency'
  | 'time'
  | 'gain-db'
  | 'percentage';

export class PluginSystem extends EventEmitter {
  private plugins: Map<string, AudioPlugin> = new Map();
  private instances: Map<string, PluginInstance> = new Map();
  private chains: Map<string, PluginChain> = new Map();
  private scanPaths: string[] = [];
  private audioContext: AudioContext | null = null;
  private workletNodes: Map<string, AudioWorkletNode> = new Map();
  private nativeProcessors: Map<string, any> = new Map();

  constructor(audioContext?: AudioContext) {
    super();
    this.audioContext = audioContext || null;
    this.initializeDefaultScanPaths();
    this.registerNativePlugins();
  }

  // Plugin Discovery and Management
  async scanForPlugins(paths?: string[]): Promise<PluginScanResult> {
    const scanPaths = paths || this.scanPaths;
    const startTime = Date.now();
    const found: AudioPlugin[] = [];
    const failed: PluginScanError[] = [];
    let totalScanned = 0;

    for (const path of scanPaths) {
      try {
        const plugins = await this.scanPath(path);
        found.push(...plugins);
        totalScanned += plugins.length;
      } catch (error) {
        failed.push({
          path,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }

    // Store discovered plugins
    found.forEach(plugin => {
      this.plugins.set(plugin.id, plugin);
    });

    const scanTime = Date.now() - startTime;
    const result: PluginScanResult = {
      found,
      failed,
      scanTime,
      totalScanned
    };

    this.emit('scan:completed', result);
    return result;
  }

  async loadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.isLoaded) return true;

    try {
      switch (plugin.type) {
        case 'web-audio':
          await this.loadWebAudioPlugin(plugin as WebAudioPlugin);
          break;
        case 'native':
          await this.loadNativePlugin(plugin);
          break;
        default:
          throw new Error(`Plugin type ${plugin.type} not supported in browser`);
      }

      plugin.isLoaded = true;
      this.emit('plugin:loaded', plugin);
      return true;
    } catch (error) {
      this.emit('plugin:load:error', plugin, error);
      return false;
    }
  }

  async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.isLoaded) return false;

    // Remove all instances of this plugin
    const instancesUsingPlugin = Array.from(this.instances.values())
      .filter(instance => instance.pluginId === pluginId);

    for (const instance of instancesUsingPlugin) {
      await this.destroyInstance(instance.id);
    }

    plugin.isLoaded = false;
    this.emit('plugin:unloaded', plugin);
    return true;
  }

  getPlugin(pluginId: string): AudioPlugin | null {
    return this.plugins.get(pluginId) || null;
  }

  getAllPlugins(): AudioPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByCategory(category: PluginCategory): AudioPlugin[] {
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.category === category);
  }

  searchPlugins(query: string, filters?: {
    category?: PluginCategory;
    type?: PluginType;
    manufacturer?: string;
  }): AudioPlugin[] {
    let plugins = Array.from(this.plugins.values());

    // Apply filters
    if (filters?.category) {
      plugins = plugins.filter(p => p.category === filters.category);
    }
    if (filters?.type) {
      plugins = plugins.filter(p => p.type === filters.type);
    }
    if (filters?.manufacturer) {
      plugins = plugins.filter(p =>
        p.manufacturer.toLowerCase().includes(filters.manufacturer!.toLowerCase())
      );
    }

    // Search by query
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      plugins = plugins.filter(p =>
        p.name.toLowerCase().includes(queryLower) ||
        p.manufacturer.toLowerCase().includes(queryLower) ||
        p.metadata.description.toLowerCase().includes(queryLower)
      );
    }

    return plugins;
  }

  // Plugin Instance Management
  async createInstance(pluginId: string, name?: string): Promise<PluginInstance> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!plugin.isLoaded) {
      await this.loadPlugin(pluginId);
    }

    const instance: PluginInstance = {
      id: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pluginId,
      enabled: true,
      bypassed: false,
      parameterValues: {},
      position: 0
    };

    // Initialize parameter values
    plugin.parameters.forEach(param => {
      instance.parameterValues[param.id] = param.defaultValue;
    });

    // Create audio processing node
    if (this.audioContext) {
      instance.processingNode = await this.createProcessingNode(plugin, instance);
    }

    this.instances.set(instance.id, instance);
    this.emit('instance:created', instance);

    return instance;
  }

  async destroyInstance(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    // Disconnect audio node
    if (instance.processingNode) {
      instance.processingNode.disconnect();
    }

    // Remove from chains
    this.chains.forEach(chain => {
      chain.plugins = chain.plugins.filter(p => p.id !== instanceId);
    });

    this.instances.delete(instanceId);
    this.emit('instance:destroyed', instanceId);

    return true;
  }

  getInstance(instanceId: string): PluginInstance | null {
    return this.instances.get(instanceId) || null;
  }

  getAllInstances(): PluginInstance[] {
    return Array.from(this.instances.values());
  }

  async setParameterValue(instanceId: string, parameterId: string, value: number): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const plugin = this.plugins.get(instance.pluginId);
    if (!plugin) return false;

    const parameter = plugin.parameters.find(p => p.id === parameterId);
    if (!parameter) return false;

    // Clamp value to valid range
    const clampedValue = Math.max(parameter.minValue, Math.min(parameter.maxValue, value));
    instance.parameterValues[parameterId] = clampedValue;

    // Update audio node parameter
    if (instance.processingNode) {
      await this.updateNodeParameter(instance.processingNode, parameterId, clampedValue);
    }

    this.emit('parameter:changed', instanceId, parameterId, clampedValue);
    return true;
  }

  async loadPreset(instanceId: string, presetId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const plugin = this.plugins.get(instance.pluginId);
    if (!plugin) return false;

    const preset = plugin.presets.find(p => p.id === presetId);
    if (!preset) return false;

    // Apply preset parameters
    for (const [paramId, value] of Object.entries(preset.parameters)) {
      await this.setParameterValue(instanceId, paramId, value);
    }

    instance.presetId = presetId;
    this.emit('preset:loaded', instanceId, presetId);

    return true;
  }

  // Plugin Chain Management
  async createChain(name: string): Promise<PluginChain> {
    const chain: PluginChain = {
      id: `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      plugins: [],
      enabled: true,
      wetDryMix: 1.0,
      masterBypass: false
    };

    this.chains.set(chain.id, chain);
    this.emit('chain:created', chain);

    return chain;
  }

  async addToChain(chainId: string, instanceId: string, position?: number): Promise<boolean> {
    const chain = this.chains.get(chainId);
    const instance = this.instances.get(instanceId);

    if (!chain || !instance) return false;

    // Remove from current position if already in chain
    chain.plugins = chain.plugins.filter(p => p.id !== instanceId);

    // Set position
    const insertPos = position !== undefined ? position : chain.plugins.length;
    instance.position = insertPos;

    // Insert at position
    chain.plugins.splice(insertPos, 0, instance);

    // Update positions
    chain.plugins.forEach((plugin, index) => {
      plugin.position = index;
    });

    // Reconnect audio chain
    if (this.audioContext) {
      await this.reconnectChain(chain);
    }

    this.emit('chain:updated', chain);
    return true;
  }

  async removeFromChain(chainId: string, instanceId: string): Promise<boolean> {
    const chain = this.chains.get(chainId);
    if (!chain) return false;

    const initialLength = chain.plugins.length;
    chain.plugins = chain.plugins.filter(p => p.id !== instanceId);

    if (chain.plugins.length !== initialLength) {
      // Update positions
      chain.plugins.forEach((plugin, index) => {
        plugin.position = index;
      });

      // Reconnect audio chain
      if (this.audioContext) {
        await this.reconnectChain(chain);
      }

      this.emit('chain:updated', chain);
      return true;
    }

    return false;
  }

  getChain(chainId: string): PluginChain | null {
    return this.chains.get(chainId) || null;
  }

  getAllChains(): PluginChain[] {
    return Array.from(this.chains.values());
  }

  // Audio Processing
  private async createProcessingNode(plugin: AudioPlugin, instance: PluginInstance): Promise<AudioNode> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    switch (plugin.type) {
      case 'web-audio':
        return await this.createWebAudioNode(plugin as WebAudioPlugin, instance);
      case 'native':
        return await this.createNativeNode(plugin, instance);
      default:
        throw new Error(`Plugin type ${plugin.type} not supported`);
    }
  }

  private async createWebAudioNode(plugin: WebAudioPlugin, instance: PluginInstance): Promise<AudioWorkletNode> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    // Register worklet if not already registered
    if (plugin.audioWorkletUrl && plugin.processorName) {
      try {
        await this.audioContext.audioWorklet.addModule(plugin.audioWorkletUrl);
      } catch (error) {
        // Worklet might already be registered
        console.warn('Worklet registration failed:', error);
      }

      const node = new AudioWorkletNode(this.audioContext, plugin.processorName, {
        numberOfInputs: plugin.metadata.hasAudioInput ? 1 : 0,
        numberOfOutputs: plugin.metadata.hasAudioOutput ? 1 : 0,
        channelCount: Math.min(plugin.metadata.maxChannels, 2)
      });

      // Initialize parameters
      plugin.parameters.forEach(param => {
        const audioParam = (node.parameters as any).get(param.id);
        if (audioParam) {
          audioParam.value = instance.parameterValues[param.id] || param.defaultValue;
        }
      });

      return node;
    }

    throw new Error('Invalid WebAudio plugin configuration');
  }

  private async createNativeNode(plugin: AudioPlugin, instance: PluginInstance): Promise<AudioNode> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const processor = this.nativeProcessors.get(plugin.id);
    if (!processor) {
      throw new Error(`Native processor for ${plugin.id} not found`);
    }

    // Create appropriate native node based on plugin category
    switch (plugin.category) {
      case 'eq':
        return this.createEQNode(plugin, instance);
      case 'dynamics':
        return this.createDynamicsNode(plugin, instance);
      case 'reverb':
        return this.createReverbNode(plugin, instance);
      case 'delay':
        return this.createDelayNode(plugin, instance);
      default:
        return this.createGenericProcessorNode(plugin, instance);
    }
  }

  private createEQNode(plugin: AudioPlugin, instance: PluginInstance): BiquadFilterNode {
    if (!this.audioContext) throw new Error('AudioContext not available');

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = instance.parameterValues['frequency'] || 1000;
    filter.Q.value = instance.parameterValues['q'] || 1;
    filter.gain.value = instance.parameterValues['gain'] || 0;

    return filter;
  }

  private createDynamicsNode(plugin: AudioPlugin, instance: PluginInstance): DynamicsCompressorNode {
    if (!this.audioContext) throw new Error('AudioContext not available');

    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = instance.parameterValues['threshold'] || -24;
    compressor.knee.value = instance.parameterValues['knee'] || 30;
    compressor.ratio.value = instance.parameterValues['ratio'] || 12;
    compressor.attack.value = instance.parameterValues['attack'] || 0.003;
    compressor.release.value = instance.parameterValues['release'] || 0.25;

    return compressor;
  }

  private createReverbNode(plugin: AudioPlugin, instance: PluginInstance): ConvolverNode {
    if (!this.audioContext) throw new Error('AudioContext not available');

    const convolver = this.audioContext.createConvolver();
    // Would load impulse response based on parameters
    return convolver;
  }

  private createDelayNode(plugin: AudioPlugin, instance: PluginInstance): DelayNode {
    if (!this.audioContext) throw new Error('AudioContext not available');

    const delay = this.audioContext.createDelay();
    delay.delayTime.value = instance.parameterValues['time'] || 0.5;

    return delay;
  }

  private createGenericProcessorNode(plugin: AudioPlugin, instance: PluginInstance): GainNode {
    if (!this.audioContext) throw new Error('AudioContext not available');

    // Fallback to gain node for unsupported categories
    const gain = this.audioContext.createGain();
    gain.gain.value = instance.parameterValues['gain'] || 1;

    return gain;
  }

  private async updateNodeParameter(node: AudioNode, parameterId: string, value: number): Promise<void> {
    // Update specific node parameters based on type and parameter
    if (node instanceof AudioWorkletNode) {
      const audioParam = (node.parameters as any).get(parameterId);
      if (audioParam) {
        audioParam.value = value;
      }
    } else if (node instanceof BiquadFilterNode) {
      switch (parameterId) {
        case 'frequency':
          node.frequency.value = value;
          break;
        case 'q':
          node.Q.value = value;
          break;
        case 'gain':
          node.gain.value = value;
          break;
      }
    } else if (node instanceof DynamicsCompressorNode) {
      switch (parameterId) {
        case 'threshold':
          node.threshold.value = value;
          break;
        case 'ratio':
          node.ratio.value = value;
          break;
        case 'attack':
          node.attack.value = value;
          break;
        case 'release':
          node.release.value = value;
          break;
      }
    }
  }

  private async reconnectChain(chain: PluginChain): Promise<void> {
    // Disconnect all nodes first
    chain.plugins.forEach(instance => {
      if (instance.processingNode) {
        instance.processingNode.disconnect();
      }
    });

    // Reconnect in order
    for (let i = 0; i < chain.plugins.length; i++) {
      const currentInstance = chain.plugins[i];
      const nextInstance = chain.plugins[i + 1];

      if (currentInstance?.processingNode) {
        if (nextInstance?.processingNode) {
          currentInstance.processingNode.connect(nextInstance.processingNode);
        }
      }
    }
  }

  // Private Helper Methods
  private async scanPath(path: string): Promise<AudioPlugin[]> {
    // In a real implementation, this would scan filesystem for plugin files
    // For web implementation, return web-audio plugins from registry
    return [];
  }

  private async loadWebAudioPlugin(plugin: WebAudioPlugin): Promise<void> {
    if (plugin.audioWorkletUrl && this.audioContext) {
      await this.audioContext.audioWorklet.addModule(plugin.audioWorkletUrl);
    }
  }

  private async loadNativePlugin(plugin: AudioPlugin): Promise<void> {
    // Native plugins are already registered in constructor
    return Promise.resolve();
  }

  private initializeDefaultScanPaths(): void {
    // Default plugin scan paths for different platforms
    if (typeof window !== 'undefined') {
      // Browser environment - use web-audio plugins only
      this.scanPaths = ['/plugins/web-audio'];
    } else {
      // Node.js environment - could scan local filesystem
      this.scanPaths = [
        '/usr/lib/vst',
        '/usr/lib/vst3',
        '/Library/Audio/Plug-Ins/VST',
        '/Library/Audio/Plug-Ins/VST3',
        'C:\\Program Files\\VstPlugins',
        'C:\\Program Files\\Common Files\\VST3'
      ];
    }
  }

  private registerNativePlugins(): void {
    // Register built-in native plugins
    const nativePlugins: AudioPlugin[] = [
      {
        id: 'native-eq',
        name: 'Parametric EQ',
        version: '1.0.0',
        manufacturer: 'Native',
        category: 'eq',
        type: 'native',
        format: 'native',
        parameters: [
          {
            id: 'frequency',
            name: 'Frequency',
            type: 'frequency',
            value: 1000,
            defaultValue: 1000,
            minValue: 20,
            maxValue: 20000,
            unit: 'Hz',
            isAutomatable: true
          },
          {
            id: 'q',
            name: 'Q Factor',
            type: 'float',
            value: 1,
            defaultValue: 1,
            minValue: 0.1,
            maxValue: 30,
            isAutomatable: true
          },
          {
            id: 'gain',
            name: 'Gain',
            type: 'gain-db',
            value: 0,
            defaultValue: 0,
            minValue: -24,
            maxValue: 24,
            unit: 'dB',
            isAutomatable: true
          }
        ],
        presets: [],
        metadata: {
          description: 'Built-in parametric equalizer',
          supportedSampleRates: [44100, 48000, 96000],
          maxChannels: 2,
          hasMidiInput: false,
          hasMidiOutput: false,
          hasAudioInput: true,
          hasAudioOutput: true,
          isSynth: false,
          isEffect: true,
          license: 'Built-in',
          fileSize: 0,
          installDate: new Date()
        },
        isLoaded: false,
        isActive: false,
        bypassable: true,
        latency: 0,
        sampleRate: 48000,
        blockSize: 512
      },
      {
        id: 'native-compressor',
        name: 'Dynamics Compressor',
        version: '1.0.0',
        manufacturer: 'Native',
        category: 'dynamics',
        type: 'native',
        format: 'native',
        parameters: [
          {
            id: 'threshold',
            name: 'Threshold',
            type: 'gain-db',
            value: -24,
            defaultValue: -24,
            minValue: -60,
            maxValue: 0,
            unit: 'dB',
            isAutomatable: true
          },
          {
            id: 'ratio',
            name: 'Ratio',
            type: 'float',
            value: 4,
            defaultValue: 4,
            minValue: 1,
            maxValue: 20,
            isAutomatable: true
          },
          {
            id: 'attack',
            name: 'Attack',
            type: 'time',
            value: 0.003,
            defaultValue: 0.003,
            minValue: 0,
            maxValue: 1,
            unit: 's',
            isAutomatable: true
          },
          {
            id: 'release',
            name: 'Release',
            type: 'time',
            value: 0.25,
            defaultValue: 0.25,
            minValue: 0,
            maxValue: 1,
            unit: 's',
            isAutomatable: true
          }
        ],
        presets: [],
        metadata: {
          description: 'Built-in dynamics compressor',
          supportedSampleRates: [44100, 48000, 96000],
          maxChannels: 2,
          hasMidiInput: false,
          hasMidiOutput: false,
          hasAudioInput: true,
          hasAudioOutput: true,
          isSynth: false,
          isEffect: true,
          license: 'Built-in',
          fileSize: 0,
          installDate: new Date()
        },
        isLoaded: false,
        isActive: false,
        bypassable: true,
        latency: 0,
        sampleRate: 48000,
        blockSize: 512
      }
    ];

    nativePlugins.forEach(plugin => {
      this.plugins.set(plugin.id, plugin);
      this.nativeProcessors.set(plugin.id, { type: plugin.category });
    });
  }
}