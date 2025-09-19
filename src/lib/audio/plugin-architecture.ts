/**
 * Audio Plugin Architecture
 * Modular system for audio effects, processors, and extensions
 */

import { EventEmitter } from 'events';
import { AudioScienceUtils } from './index';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'effect' | 'analyzer' | 'generator' | 'utility' | 'instrument';
  type: 'native' | 'wasm' | 'javascript';
  tags: string[];
  inputs: number;
  outputs: number;
  sidechain?: boolean;
  midi?: boolean;
  presets: PluginPreset[];
  parameters: PluginParameter[];
  features: string[];
  compatibility: {
    minVersion: string;
    maxVersion?: string;
    platforms: string[];
  };
  license: string;
  homepage?: string;
  documentation?: string;
}

export interface PluginParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool' | 'enum' | 'string';
  defaultValue: any;
  minValue?: number;
  maxValue?: number;
  step?: number;
  unit?: string;
  curve?: 'linear' | 'logarithmic' | 'exponential';
  enumValues?: string[];
  description?: string;
  group?: string;
  automation?: boolean;
}

export interface PluginPreset {
  id: string;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  tags?: string[];
  isFactory: boolean;
  author?: string;
}

export interface PluginState {
  parameters: Record<string, any>;
  preset?: string;
  enabled: boolean;
  bypass: boolean;
  wetDryMix: number;
  latency: number;
  cpuUsage: number;
}

export interface AudioBuffer {
  channels: Float32Array[];
  sampleRate: number;
  length: number;
  timeStamp: number;
}

export interface ProcessingContext {
  sampleRate: number;
  blockSize: number;
  timestamp: number;
  tempo?: number;
  timeSignature?: [number, number];
  isPlaying: boolean;
  transport: {
    position: number;
    bar: number;
    beat: number;
    tick: number;
  };
}

export interface PluginHost {
  getSampleRate(): number;
  getBlockSize(): number;
  getContext(): ProcessingContext;
  requestParameterChange(pluginId: string, parameterId: string, value: any): void;
  sendMidiEvent(event: MidiEvent): void;
  reportLatency(pluginId: string, latency: number): void;
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void;
}

export interface MidiEvent {
  type: 'noteOn' | 'noteOff' | 'controlChange' | 'programChange' | 'pitchBend';
  channel: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  program?: number;
  timestamp: number;
}

export abstract class AudioPlugin extends EventEmitter {
  protected manifest: PluginManifest;
  protected state: PluginState;
  protected host?: PluginHost;
  protected isInitialized = false;

  constructor(manifest: PluginManifest) {
    super();
    this.manifest = manifest;
    this.state = this.initializeState();
  }

  private initializeState(): PluginState {
    const parameters: Record<string, any> = {};

    for (const param of this.manifest.parameters) {
      parameters[param.id] = param.defaultValue;
    }

    return {
      parameters,
      enabled: true,
      bypass: false,
      wetDryMix: 1.0,
      latency: 0,
      cpuUsage: 0
    };
  }

  // Abstract methods that plugins must implement
  public abstract initialize(host: PluginHost): Promise<void>;
  public abstract process(input: AudioBuffer, context: ProcessingContext): AudioBuffer;
  public abstract destroy(): void;

  // Optional methods plugins can override
  public onParameterChange(parameterId: string, value: any): void {
    this.state.parameters[parameterId] = value;
    this.emit('parameterChanged', parameterId, value);
  }

  public onMidiEvent(event: MidiEvent): void {
    this.emit('midiEvent', event);
  }

  public onPresetChange(presetId: string): void {
    const preset = this.manifest.presets.find(p => p.id === presetId);
    if (preset) {
      for (const [parameterId, value] of Object.entries(preset.parameters)) {
        this.onParameterChange(parameterId, value);
      }
      this.state.preset = presetId;
      this.emit('presetChanged', presetId);
    }
  }

  // Public API
  public getManifest(): PluginManifest {
    return { ...this.manifest };
  }

  public getState(): PluginState {
    return { ...this.state };
  }

  public setParameter(parameterId: string, value: any): void {
    const parameter = this.manifest.parameters.find(p => p.id === parameterId);
    if (!parameter) {
      throw new Error(`Parameter '${parameterId}' not found`);
    }

    // Validate and clamp value
    const validatedValue = this.validateParameterValue(parameter, value);
    this.onParameterChange(parameterId, validatedValue);
  }

  public getParameter(parameterId: string): any {
    return this.state.parameters[parameterId];
  }

  public setPreset(presetId: string): void {
    this.onPresetChange(presetId);
  }

  public setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
    this.emit('enabledChanged', enabled);
  }

  public setBypass(bypass: boolean): void {
    this.state.bypass = bypass;
    this.emit('bypassChanged', bypass);
  }

  public setWetDryMix(mix: number): void {
    this.state.wetDryMix = Math.max(0, Math.min(1, mix));
    this.emit('wetDryMixChanged', mix);
  }

  protected validateParameterValue(parameter: PluginParameter, value: any): any {
    switch (parameter.type) {
      case 'float':
        const floatValue = parseFloat(value);
        if (isNaN(floatValue)) return parameter.defaultValue;
        if (parameter.minValue !== undefined) {
          value = Math.max(parameter.minValue, floatValue);
        }
        if (parameter.maxValue !== undefined) {
          value = Math.min(parameter.maxValue, value);
        }
        return value;

      case 'int':
        const intValue = parseInt(value);
        if (isNaN(intValue)) return parameter.defaultValue;
        if (parameter.minValue !== undefined) {
          value = Math.max(parameter.minValue, intValue);
        }
        if (parameter.maxValue !== undefined) {
          value = Math.min(parameter.maxValue, value);
        }
        return Math.round(value);

      case 'bool':
        return Boolean(value);

      case 'enum':
        return parameter.enumValues?.includes(value) ? value : parameter.defaultValue;

      case 'string':
        return String(value);

      default:
        return parameter.defaultValue;
    }
  }

  protected applyWetDryMix(dry: AudioBuffer, wet: AudioBuffer): AudioBuffer {
    if (this.state.wetDryMix === 1.0) return wet;
    if (this.state.wetDryMix === 0.0) return dry;

    const result: AudioBuffer = {
      channels: [],
      sampleRate: wet.sampleRate,
      length: wet.length,
      timeStamp: wet.timeStamp
    };

    const wetAmount = this.state.wetDryMix;
    const dryAmount = 1.0 - wetAmount;

    for (let ch = 0; ch < Math.max(dry.channels.length, wet.channels.length); ch++) {
      const dryChannel = dry.channels[ch] || new Float32Array(dry.length);
      const wetChannel = wet.channels[ch] || new Float32Array(wet.length);
      const mixed = new Float32Array(wet.length);

      for (let i = 0; i < mixed.length; i++) {
        mixed[i] = (dryChannel[i] ?? 0) * dryAmount + (wetChannel[i] ?? 0) * wetAmount;
      }

      result.channels.push(mixed);
    }

    return result;
  }
}

// Example Plugin: Reverb
export class ReverbPlugin extends AudioPlugin {
  private delayLines: Float32Array[] = [];
  private feedback = 0.5;
  private dampening = 0.5;
  private roomSize = 0.5;
  private writeIndex = 0;

  constructor() {
    const manifest: PluginManifest = {
      id: 'reverb-v1',
      name: 'Algorithmic Reverb',
      version: '1.0.0',
      author: 'Audio Engine',
      description: 'High-quality algorithmic reverb with multiple room models',
      category: 'effect',
      type: 'javascript',
      tags: ['reverb', 'spatial', 'ambience'],
      inputs: 2,
      outputs: 2,
      presets: [
        {
          id: 'small-room',
          name: 'Small Room',
          description: 'Intimate room reverb',
          parameters: {
            roomSize: 0.3,
            feedback: 0.4,
            dampening: 0.6,
            wetDryMix: 0.3
          },
          isFactory: true
        },
        {
          id: 'large-hall',
          name: 'Large Hall',
          description: 'Spacious hall reverb',
          parameters: {
            roomSize: 0.8,
            feedback: 0.7,
            dampening: 0.3,
            wetDryMix: 0.4
          },
          isFactory: true
        }
      ],
      parameters: [
        {
          id: 'roomSize',
          name: 'Room Size',
          type: 'float',
          defaultValue: 0.5,
          minValue: 0.0,
          maxValue: 1.0,
          curve: 'logarithmic',
          description: 'Size of the reverberant space'
        },
        {
          id: 'feedback',
          name: 'Feedback',
          type: 'float',
          defaultValue: 0.5,
          minValue: 0.0,
          maxValue: 0.95,
          description: 'Amount of signal fed back into delays'
        },
        {
          id: 'dampening',
          name: 'Dampening',
          type: 'float',
          defaultValue: 0.5,
          minValue: 0.0,
          maxValue: 1.0,
          description: 'High frequency dampening'
        }
      ],
      features: ['realtime', 'automation', 'presets'],
      compatibility: {
        minVersion: '1.0.0',
        platforms: ['web', 'desktop']
      },
      license: 'MIT'
    };

    super(manifest);
  }

  public async initialize(host: PluginHost): Promise<void> {
    this.host = host;

    // Initialize delay lines
    const sampleRate = host.getSampleRate();
    const delayTimes = [
      0.03, 0.032, 0.037, 0.041, 0.043, 0.047, 0.051, 0.053
    ];

    this.delayLines = delayTimes.map(time => {
      const length = Math.floor(time * sampleRate);
      return new Float32Array(length);
    });

    this.isInitialized = true;
  }

  public process(input: AudioBuffer, context: ProcessingContext): AudioBuffer {
    if (!this.isInitialized || this.state.bypass) {
      return input;
    }

    const output: AudioBuffer = {
      channels: [],
      sampleRate: input.sampleRate,
      length: input.length,
      timeStamp: input.timeStamp
    };

    this.roomSize = this.state.parameters.roomSize;
    this.feedback = this.state.parameters.feedback;
    this.dampening = this.state.parameters.dampening;

    // Process each channel
    for (let ch = 0; ch < input.channels.length; ch++) {
      const inputChannel = input.channels[ch]!;
      const outputChannel = new Float32Array(inputChannel.length);

      for (let i = 0; i < inputChannel.length; i++) {
        const inputSample = inputChannel[i] ?? 0;
        let reverbSample = 0;

        // Process through delay lines
        for (let d = 0; d < this.delayLines.length; d++) {
          const delayLine = this.delayLines[d]!;
          const readIndex = (this.writeIndex - 1 + delayLine.length) % delayLine.length;

          // Read delayed sample
          const delayedSample = delayLine[readIndex] ?? 0;
          reverbSample += delayedSample * 0.125; // Mix delayed signals

          // Write new sample with feedback
          const feedbackSample = inputSample + delayedSample * this.feedback * this.roomSize;

          // Apply dampening (simple low-pass)
          const dampenedSample = feedbackSample * this.dampening +
                                (delayLine[(readIndex - 1 + delayLine.length) % delayLine.length] ?? 0) * (1 - this.dampening);

          delayLine[this.writeIndex % delayLine.length] = dampenedSample;
        }

        outputChannel[i] = reverbSample;
        this.writeIndex++;
      }

      output.channels.push(outputChannel);
    }

    // Apply wet/dry mix
    return this.applyWetDryMix(input, output);
  }

  public destroy(): void {
    this.delayLines = [];
    this.isInitialized = false;
  }
}

// Example Plugin: Compressor
export class CompressorPlugin extends AudioPlugin {
  private envelope = 0;
  private gainReduction = 0;

  constructor() {
    const manifest: PluginManifest = {
      id: 'compressor-v1',
      name: 'Dynamic Compressor',
      version: '1.0.0',
      author: 'Audio Engine',
      description: 'Professional dynamic range compressor',
      category: 'effect',
      type: 'javascript',
      tags: ['dynamics', 'compressor', 'leveling'],
      inputs: 2,
      outputs: 2,
      sidechain: true,
      presets: [
        {
          id: 'vocal',
          name: 'Vocal',
          description: 'Gentle compression for vocals',
          parameters: {
            threshold: -20,
            ratio: 3,
            attack: 0.003,
            release: 0.1,
            knee: 2,
            makeupGain: 3
          },
          isFactory: true
        },
        {
          id: 'drum-bus',
          name: 'Drum Bus',
          description: 'Punchy compression for drums',
          parameters: {
            threshold: -15,
            ratio: 4,
            attack: 0.001,
            release: 0.05,
            knee: 1,
            makeupGain: 4
          },
          isFactory: true
        }
      ],
      parameters: [
        {
          id: 'threshold',
          name: 'Threshold',
          type: 'float',
          defaultValue: -20,
          minValue: -60,
          maxValue: 0,
          unit: 'dB',
          description: 'Level above which compression begins'
        },
        {
          id: 'ratio',
          name: 'Ratio',
          type: 'float',
          defaultValue: 4,
          minValue: 1,
          maxValue: 20,
          unit: ':1',
          curve: 'logarithmic',
          description: 'Compression ratio'
        },
        {
          id: 'attack',
          name: 'Attack',
          type: 'float',
          defaultValue: 0.003,
          minValue: 0.0001,
          maxValue: 0.1,
          unit: 's',
          curve: 'logarithmic',
          description: 'Time to reach full compression'
        },
        {
          id: 'release',
          name: 'Release',
          type: 'float',
          defaultValue: 0.1,
          minValue: 0.01,
          maxValue: 2.0,
          unit: 's',
          curve: 'logarithmic',
          description: 'Time to release compression'
        },
        {
          id: 'knee',
          name: 'Knee',
          type: 'float',
          defaultValue: 2,
          minValue: 0,
          maxValue: 10,
          unit: 'dB',
          description: 'Soft knee amount'
        },
        {
          id: 'makeupGain',
          name: 'Makeup Gain',
          type: 'float',
          defaultValue: 0,
          minValue: -20,
          maxValue: 20,
          unit: 'dB',
          description: 'Output gain compensation'
        }
      ],
      features: ['realtime', 'automation', 'presets', 'sidechain'],
      compatibility: {
        minVersion: '1.0.0',
        platforms: ['web', 'desktop']
      },
      license: 'MIT'
    };

    super(manifest);
  }

  public async initialize(host: PluginHost): Promise<void> {
    this.host = host;
    this.isInitialized = true;
  }

  public process(input: AudioBuffer, context: ProcessingContext): AudioBuffer {
    if (!this.isInitialized || this.state.bypass) {
      return input;
    }

    const threshold = AudioScienceUtils.dbToLinear(this.state.parameters.threshold);
    const ratio = this.state.parameters.ratio;
    const attack = this.state.parameters.attack;
    const release = this.state.parameters.release;
    const knee = this.state.parameters.knee;
    const makeupGain = AudioScienceUtils.dbToLinear(this.state.parameters.makeupGain);

    const sampleRate = context.sampleRate;
    const attackCoeff = Math.exp(-1 / (attack * sampleRate));
    const releaseCoeff = Math.exp(-1 / (release * sampleRate));

    const output: AudioBuffer = {
      channels: [],
      sampleRate: input.sampleRate,
      length: input.length,
      timeStamp: input.timeStamp
    };

    for (let ch = 0; ch < input.channels.length; ch++) {
      const inputChannel = input.channels[ch]!;
      const outputChannel = new Float32Array(inputChannel.length);

      for (let i = 0; i < inputChannel.length; i++) {
        const inputLevel = Math.abs(inputChannel[i] ?? 0);

        // Peak detection with smoothing
        const targetEnv = inputLevel;
        if (targetEnv > this.envelope) {
          this.envelope = targetEnv + (this.envelope - targetEnv) * attackCoeff;
        } else {
          this.envelope = targetEnv + (this.envelope - targetEnv) * releaseCoeff;
        }

        // Calculate compression
        let gain = 1;
        if (this.envelope > threshold) {
          const overThreshold = AudioScienceUtils.linearToDb(this.envelope) - AudioScienceUtils.linearToDb(threshold);

          // Soft knee
          let compressedOverThreshold: number;
          if (knee > 0 && overThreshold < knee) {
            const kneeRatio = overThreshold / knee;
            const softRatio = 1 + (ratio - 1) * kneeRatio * kneeRatio;
            compressedOverThreshold = overThreshold / softRatio;
          } else {
            compressedOverThreshold = overThreshold / ratio;
          }

          const targetLevel = AudioScienceUtils.linearToDb(threshold) + compressedOverThreshold;
          gain = AudioScienceUtils.dbToLinear(targetLevel) / this.envelope;
        }

        this.gainReduction = Math.min(this.gainReduction, gain);

        outputChannel[i] = (inputChannel[i] ?? 0) * gain * makeupGain;
      }

      output.channels.push(outputChannel);
    }

    return output;
  }

  public destroy(): void {
    this.envelope = 0;
    this.gainReduction = 0;
    this.isInitialized = false;
  }

  public getGainReduction(): number {
    return AudioScienceUtils.linearToDb(this.gainReduction);
  }
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, AudioPlugin> = new Map();
  private pluginOrder: string[] = [];
  private host: PluginHost;
  private isProcessing = false;

  constructor(host: PluginHost) {
    super();
    this.host = host;
  }

  public async loadPlugin(plugin: AudioPlugin): Promise<void> {
    try {
      await plugin.initialize(this.host);
      this.plugins.set(plugin.getManifest().id, plugin);
      this.pluginOrder.push(plugin.getManifest().id);

      // Set up event listeners
      plugin.on('parameterChanged', (parameterId, value) => {
        this.emit('pluginParameterChanged', plugin.getManifest().id, parameterId, value);
      });

      this.emit('pluginLoaded', plugin.getManifest().id);
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.getManifest().id}:`, error);
      throw error;
    }
  }

  public unloadPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.destroy();
      plugin.removeAllListeners();
      this.plugins.delete(pluginId);
      this.pluginOrder = this.pluginOrder.filter(id => id !== pluginId);
      this.emit('pluginUnloaded', pluginId);
    }
  }

  public processAudioChain(input: AudioBuffer, context: ProcessingContext): AudioBuffer {
    if (this.isProcessing) {
      console.warn('Plugin chain is already processing');
      return input;
    }

    this.isProcessing = true;
    let output = input;

    try {
      for (const pluginId of this.pluginOrder) {
        const plugin = this.plugins.get(pluginId);
        if (plugin && plugin.getState().enabled) {
          const processingStart = performance.now();
          output = plugin.process(output, context);
          const processingTime = performance.now() - processingStart;

          // Update CPU usage
          plugin.getState().cpuUsage = processingTime;
        }
      }
    } catch (error) {
      console.error('Error in plugin chain processing:', error);
    } finally {
      this.isProcessing = false;
    }

    return output;
  }

  public getPlugin(pluginId: string): AudioPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  public getLoadedPlugins(): AudioPlugin[] {
    return Array.from(this.plugins.values());
  }

  public getPluginOrder(): string[] {
    return [...this.pluginOrder];
  }

  public reorderPlugin(pluginId: string, newIndex: number): void {
    const currentIndex = this.pluginOrder.indexOf(pluginId);
    if (currentIndex === -1) return;

    this.pluginOrder.splice(currentIndex, 1);
    this.pluginOrder.splice(newIndex, 0, pluginId);
    this.emit('pluginOrderChanged', this.pluginOrder);
  }

  public setPluginParameter(pluginId: string, parameterId: string, value: any): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.setParameter(parameterId, value);
    }
  }

  public setPluginPreset(pluginId: string, presetId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.setPreset(presetId);
    }
  }

  public setPluginEnabled(pluginId: string, enabled: boolean): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.setEnabled(enabled);
    }
  }

  public setPluginBypass(pluginId: string, bypass: boolean): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.setBypass(bypass);
    }
  }

  public getChainLatency(): number {
    let totalLatency = 0;
    for (const plugin of this.plugins.values()) {
      if (plugin.getState().enabled) {
        totalLatency += plugin.getState().latency;
      }
    }
    return totalLatency;
  }

  public getTotalCpuUsage(): number {
    let totalCpu = 0;
    for (const plugin of this.plugins.values()) {
      if (plugin.getState().enabled) {
        totalCpu += plugin.getState().cpuUsage;
      }
    }
    return totalCpu;
  }

  public saveChainState(): Record<string, any> {
    const state: Record<string, any> = {
      pluginOrder: this.pluginOrder,
      plugins: {}
    };

    for (const [pluginId, plugin] of this.plugins) {
      state.plugins[pluginId] = {
        manifest: plugin.getManifest(),
        state: plugin.getState()
      };
    }

    return state;
  }

  public async loadChainState(state: Record<string, any>): Promise<void> {
    // Clear current plugins
    for (const pluginId of Array.from(this.plugins.keys())) {
      this.unloadPlugin(pluginId);
    }

    // Load plugins from state
    this.pluginOrder = state.pluginOrder || [];

    for (const [pluginId, pluginData] of Object.entries(state.plugins)) {
      // Note: In a real implementation, this would need to instantiate
      // the correct plugin class based on the manifest
      console.log(`Would load plugin ${pluginId} with state:`, pluginData);
    }
  }

  public destroy(): void {
    for (const pluginId of Array.from(this.plugins.keys())) {
      this.unloadPlugin(pluginId);
    }
    this.removeAllListeners();
  }
}

export default PluginManager;