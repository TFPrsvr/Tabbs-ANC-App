"use client";

// Advanced Spatial Audio Processing and 3D Audio Engine

interface SpatialPosition {
  x: number;  // -1 to 1 (left to right)
  y: number;  // -1 to 1 (back to front)
  z: number;  // -1 to 1 (down to up)
}

interface ListenerOrientation {
  forward: SpatialPosition;
  up: SpatialPosition;
}

interface AudioSource {
  id: string;
  position: SpatialPosition;
  velocity: SpatialPosition;
  gain: number;
  directivity: {
    coneInnerAngle: number;
    coneOuterAngle: number;
    coneOuterGain: number;
  };
  distanceModel: 'linear' | 'inverse' | 'exponential';
  maxDistance: number;
  rolloffFactor: number;
  referenceDistance: number;
}

interface Room {
  dimensions: { width: number; height: number; depth: number };
  absorption: {
    low: number;    // 250Hz
    mid: number;    // 1kHz
    high: number;   // 4kHz
  };
  reverbTime: {
    rt60_low: number;
    rt60_mid: number;
    rt60_high: number;
  };
  earlyReflections: boolean;
  diffusion: number;
  density: number;
}

interface BinauralProcessingResult {
  leftChannel: Float32Array;
  rightChannel: Float32Array;
  spatialMetrics: {
    azimuth: number;
    elevation: number;
    distance: number;
    lateralization: number;
    externalization: number;
    envelopment: number;
  };
}

interface AmbisonicsConfig {
  order: number;  // 1st, 2nd, or 3rd order
  normalization: 'N3D' | 'SN3D';
  channelOrder: 'ACN' | 'FUMA';
}

class SpatialAudioProcessor {
  private sampleRate: number;
  private bufferSize: number;
  private listener: {
    position: SpatialPosition;
    orientation: ListenerOrientation;
    velocity: SpatialPosition;
  };
  private sources: Map<string, AudioSource>;
  private room: Room;
  private hrtfDatabase: HRTFDatabase;
  private reverbProcessor: ConvolutionReverb;
  private ambisonicsDecoder: AmbisonicsDecoder;
  private binaural: BinauralProcessor;

  constructor(sampleRate: number = 44100, bufferSize: number = 512) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;

    // Initialize listener at origin looking forward
    this.listener = {
      position: { x: 0, y: 0, z: 0 },
      orientation: {
        forward: { x: 0, y: 1, z: 0 },
        up: { x: 0, y: 0, z: 1 }
      },
      velocity: { x: 0, y: 0, z: 0 }
    };

    this.sources = new Map();
    this.room = this.createDefaultRoom();

    // Initialize processors
    this.hrtfDatabase = new HRTFDatabase(sampleRate);
    this.reverbProcessor = new ConvolutionReverb(sampleRate, bufferSize);
    this.ambisonicsDecoder = new AmbisonicsDecoder(sampleRate, 3); // 3rd order
    this.binaural = new BinauralProcessor(sampleRate);
  }

  // Main spatial audio processing
  public processSpatialAudio(
    audioSources: Map<string, Float32Array>,
    outputFormat: 'stereo' | 'binaural' | 'ambisonics' | 'surround_5_1' | 'surround_7_1'
  ): Float32Array | { channels: Float32Array[]; metadata: any } {
    const spatializedSources = new Map<string, BinauralProcessingResult>();

    // Process each audio source
    for (const [sourceId, audioData] of Array.from(audioSources.entries())) {
      const source = this.sources.get(sourceId);
      if (source) {
        const spatialResult = this.spatializeSource(audioData, source);
        spatializedSources.set(sourceId, spatialResult);
      }
    }

    // Mix and render according to output format
    switch (outputFormat) {
      case 'stereo':
        return this.renderStereo(spatializedSources);
      case 'binaural':
        return this.renderBinaural(spatializedSources);
      case 'ambisonics':
        return this.renderAmbisonics(spatializedSources);
      case 'surround_5_1':
        return this.renderSurround(spatializedSources, 6);
      case 'surround_7_1':
        return this.renderSurround(spatializedSources, 8);
      default:
        return this.renderStereo(spatializedSources);
    }
  }

  // Spatialize individual audio source
  private spatializeSource(audioData: Float32Array, source: AudioSource): BinauralProcessingResult {
    // Calculate relative position to listener
    const relativePosition = this.calculateRelativePosition(source.position);
    const distance = this.calculateDistance(relativePosition);
    const { azimuth, elevation } = this.calculateSphericalCoordinates(relativePosition);

    // Apply distance attenuation
    const attenuatedAudio = this.applyDistanceAttenuation(audioData, source, distance);

    // Apply directivity
    const directionalAudio = this.applyDirectivity(attenuatedAudio, source, azimuth, elevation);

    // Apply HRTF for binaural positioning
    const binauralResult = this.hrtfDatabase.process(directionalAudio, azimuth, elevation);

    // Apply room acoustics
    const acousticResult = this.reverbProcessor.process(binauralResult, source.position);

    // Calculate spatial metrics
    const spatialMetrics = this.calculateSpatialMetrics(
      relativePosition, azimuth, elevation, distance, source
    );

    return {
      leftChannel: acousticResult.leftChannel,
      rightChannel: acousticResult.rightChannel,
      spatialMetrics
    };
  }

  // Audio source management
  public addAudioSource(source: AudioSource): void {
    this.sources.set(source.id, source);
  }

  public removeAudioSource(sourceId: string): void {
    this.sources.delete(sourceId);
  }

  public updateSourcePosition(sourceId: string, position: SpatialPosition): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.position = position;
    }
  }

  public updateListenerPosition(position: SpatialPosition, orientation?: ListenerOrientation): void {
    this.listener.position = position;
    if (orientation) {
      this.listener.orientation = orientation;
    }
  }

  // Room acoustics configuration
  public setRoom(room: Room): void {
    this.room = room;
    this.reverbProcessor.updateRoom(room);
  }

  // Utility methods for spatial calculations
  private calculateRelativePosition(sourcePosition: SpatialPosition): SpatialPosition {
    return {
      x: sourcePosition.x - this.listener.position.x,
      y: sourcePosition.y - this.listener.position.y,
      z: sourcePosition.z - this.listener.position.z
    };
  }

  private calculateDistance(position: SpatialPosition): number {
    return Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
  }

  private calculateSphericalCoordinates(position: SpatialPosition): { azimuth: number; elevation: number } {
    const azimuth = Math.atan2(position.x, position.y);
    const distance2D = Math.sqrt(position.x ** 2 + position.y ** 2);
    const elevation = Math.atan2(position.z, distance2D);

    return {
      azimuth: azimuth * 180 / Math.PI,
      elevation: elevation * 180 / Math.PI
    };
  }

  private applyDistanceAttenuation(
    audioData: Float32Array,
    source: AudioSource,
    distance: number
  ): Float32Array {
    const output = new Float32Array(audioData.length);
    let attenuation = 1;

    switch (source.distanceModel) {
      case 'linear':
        attenuation = Math.max(0, 1 - source.rolloffFactor *
          (distance - source.referenceDistance) / (source.maxDistance - source.referenceDistance));
        break;

      case 'inverse':
        attenuation = source.referenceDistance /
          (source.referenceDistance + source.rolloffFactor * (distance - source.referenceDistance));
        break;

      case 'exponential':
        attenuation = Math.pow(distance / source.referenceDistance, -source.rolloffFactor);
        break;
    }

    // Apply gain and attenuation
    const finalGain = source.gain * Math.max(0, Math.min(1, attenuation));

    for (let i = 0; i < audioData.length; i++) {
      output[i] = (audioData[i] || 0) * finalGain;
    }

    return output;
  }

  private applyDirectivity(
    audioData: Float32Array,
    source: AudioSource,
    azimuth: number,
    elevation: number
  ): Float32Array {
    if (!source.directivity) {
      return audioData;
    }

    const output = new Float32Array(audioData.length);

    // Calculate angle between source direction and listener
    const angle = Math.abs(azimuth); // Simplified - assumes source faces forward

    let directivityGain = 1;

    if (angle > source.directivity.coneInnerAngle / 2) {
      if (angle < source.directivity.coneOuterAngle / 2) {
        // Transition zone
        const ratio = (angle - source.directivity.coneInnerAngle / 2) /
                     (source.directivity.coneOuterAngle / 2 - source.directivity.coneInnerAngle / 2);
        directivityGain = 1 - ratio * (1 - source.directivity.coneOuterGain);
      } else {
        // Outside cone
        directivityGain = source.directivity.coneOuterGain;
      }
    }

    for (let i = 0; i < audioData.length; i++) {
      output[i] = (audioData[i] || 0) * directivityGain;
    }

    return output;
  }

  private calculateSpatialMetrics(
    position: SpatialPosition,
    azimuth: number,
    elevation: number,
    distance: number,
    source: AudioSource
  ): any {
    return {
      azimuth,
      elevation,
      distance,
      lateralization: Math.abs(azimuth) / 90,  // 0-1 scale
      externalization: Math.min(1, distance / 2), // Simplification
      envelopment: this.calculateEnvelopment(source)
    };
  }

  private calculateEnvelopment(source: AudioSource): number {
    // Calculate sense of envelopment based on source characteristics
    const baseEnvelopment = 0.3; // Base level
    const distanceContribution = Math.min(0.4, source.maxDistance / 10);
    const directivityContribution = (180 - source.directivity.coneOuterAngle) / 180 * 0.3;

    return Math.min(1, baseEnvelopment + distanceContribution + directivityContribution);
  }

  // Rendering methods for different output formats
  private renderStereo(sources: Map<string, BinauralProcessingResult>): Float32Array {
    const leftChannel = new Float32Array(this.bufferSize);
    const rightChannel = new Float32Array(this.bufferSize);

    // Mix all spatialized sources
    for (const result of Array.from(sources.values())) {
      for (let i = 0; i < this.bufferSize; i++) {
        const leftSample = result.leftChannel?.[i];
        const rightSample = result.rightChannel?.[i];
        const currentLeftValue = leftChannel[i];
        if (currentLeftValue !== undefined) {
          leftChannel[i] = currentLeftValue + (leftSample ?? 0);
        }
        const currentRightValue = rightChannel[i];
        if (currentRightValue !== undefined) {
          rightChannel[i] = currentRightValue + (rightSample ?? 0);
        }
      }
    }

    // Interleave for stereo output
    const stereoOutput = new Float32Array(this.bufferSize * 2);
    for (let i = 0; i < this.bufferSize; i++) {
      stereoOutput[i * 2] = leftChannel[i] || 0;
      stereoOutput[i * 2 + 1] = rightChannel[i] || 0;
    }

    return stereoOutput;
  }

  private renderBinaural(sources: Map<string, BinauralProcessingResult>): any {
    const leftChannel = new Float32Array(this.bufferSize);
    const rightChannel = new Float32Array(this.bufferSize);

    // Mix with binaural processing
    for (const result of Array.from(sources.values())) {
      const binauralResult = this.binaural.process(result.leftChannel, result.rightChannel, result.spatialMetrics);

      for (let i = 0; i < this.bufferSize; i++) {
        const leftSample = binauralResult.leftChannel?.[i];
        const rightSample = binauralResult.rightChannel?.[i];
        const currentLeftValue = leftChannel[i];
        if (currentLeftValue !== undefined) {
          leftChannel[i] = currentLeftValue + (leftSample ?? 0);
        }
        const currentRightValue = rightChannel[i];
        if (currentRightValue !== undefined) {
          rightChannel[i] = currentRightValue + (rightSample ?? 0);
        }
      }
    }

    return {
      channels: [leftChannel, rightChannel],
      metadata: {
        format: 'binaural',
        headTracking: false,
        crossfeed: 0.3
      }
    };
  }

  private renderAmbisonics(sources: Map<string, BinauralProcessingResult>): any {
    // Convert to Ambisonics format
    const ambisonicChannels = this.ambisonicsDecoder.encode(sources);

    return {
      channels: ambisonicChannels,
      metadata: {
        format: 'ambisonics',
        order: 3,
        normalization: 'N3D',
        channelOrder: 'ACN'
      }
    };
  }

  private renderSurround(sources: Map<string, BinauralProcessingResult>, channelCount: number): any {
    const surroundChannels = Array(channelCount).fill(null).map(() => new Float32Array(this.bufferSize));

    // Pan sources to surround speakers
    for (const result of Array.from(sources.values())) {
      const panningGains = this.calculateSurroundPanning(result.spatialMetrics, channelCount);

      for (let ch = 0; ch < channelCount; ch++) {
        const gain = panningGains[ch] || 0;
        for (let i = 0; i < this.bufferSize; i++) {
          const leftValue = result.leftChannel?.[i] ?? 0;
          const rightValue = result.rightChannel?.[i] ?? 0;
          const channel = surroundChannels[ch];
          if (channel) {
            const currentChannelValue = channel[i];
            if (currentChannelValue !== undefined) {
              channel[i] = currentChannelValue + (leftValue + rightValue) * 0.5 * gain;
            }
          }
        }
      }
    }

    return {
      channels: surroundChannels,
      metadata: {
        format: channelCount === 6 ? '5.1' : '7.1',
        speakerLayout: this.getSpeakerLayout(channelCount)
      }
    };
  }

  private calculateSurroundPanning(spatialMetrics: any, channelCount: number): Float32Array {
    const gains = new Float32Array(channelCount);
    const azimuth = spatialMetrics.azimuth * Math.PI / 180;

    // Simplified VBAP (Vector Base Amplitude Panning)
    if (channelCount === 6) { // 5.1
      const speakers = [-30, 30, 0, 0, -110, 110]; // L, R, C, LFE, Ls, Rs
      for (let i = 0; i < speakers.length; i++) {
        const speakerAngle = (speakers[i] ?? 0) * Math.PI / 180;
        const angleDiff = Math.abs(azimuth - speakerAngle);
        gains[i] = Math.max(0, Math.cos(angleDiff));
      }
    } else if (channelCount === 8) { // 7.1
      const speakers = [-30, 30, 0, 0, -90, 90, -150, 150]; // L, R, C, LFE, Ls, Rs, Lb, Rb
      for (let i = 0; i < speakers.length; i++) {
        const speakerAngle = (speakers[i] ?? 0) * Math.PI / 180;
        const angleDiff = Math.abs(azimuth - speakerAngle);
        gains[i] = Math.max(0, Math.cos(angleDiff));
      }
    }

    // Normalize gains
    const totalGain = gains.reduce((sum, gain) => sum + gain, 0);
    if (totalGain > 0) {
      for (let i = 0; i < gains.length; i++) {
        const currentGain = gains[i];
        if (currentGain !== undefined) {
          gains[i] = currentGain / totalGain;
        }
      }
    }

    return gains;
  }

  private getSpeakerLayout(channelCount: number): any {
    if (channelCount === 6) {
      return {
        channels: ['L', 'R', 'C', 'LFE', 'Ls', 'Rs'],
        angles: [-30, 30, 0, 0, -110, 110]
      };
    } else if (channelCount === 8) {
      return {
        channels: ['L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lb', 'Rb'],
        angles: [-30, 30, 0, 0, -90, 90, -150, 150]
      };
    }
    return { channels: [], angles: [] };
  }

  private createDefaultRoom(): Room {
    return {
      dimensions: { width: 10, height: 3, depth: 8 },
      absorption: { low: 0.1, mid: 0.2, high: 0.3 },
      reverbTime: { rt60_low: 1.2, rt60_mid: 1.0, rt60_high: 0.8 },
      earlyReflections: true,
      diffusion: 0.7,
      density: 0.8
    };
  }
}

// Supporting classes for spatial audio processing

class HRTFDatabase {
  private sampleRate: number;
  private impulseResponses: Map<string, { left: Float32Array; right: Float32Array }>;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.impulseResponses = new Map();
    this.generateSyntheticHRTF();
  }

  private generateSyntheticHRTF(): void {
    // Generate simplified synthetic HRTF data
    for (let azimuth = -180; azimuth <= 180; azimuth += 15) {
      for (let elevation = -90; elevation <= 90; elevation += 15) {
        const key = `${azimuth}_${elevation}`;
        const leftIR = this.createImpulseResponse(azimuth, elevation, 'left');
        const rightIR = this.createImpulseResponse(azimuth, elevation, 'right');
        this.impulseResponses.set(key, { left: leftIR, right: rightIR });
      }
    }
  }

  private createImpulseResponse(azimuth: number, elevation: number, ear: 'left' | 'right'): Float32Array {
    const length = 256; // Typical HRTF length
    const ir = new Float32Array(length);

    // Simplified HRTF modeling
    const azimuthRad = azimuth * Math.PI / 180;
    const elevationRad = elevation * Math.PI / 180;

    // ITD (Interaural Time Difference)
    const headRadius = 0.085; // meters
    const speedOfSound = 343; // m/s
    const itdSamples = (headRadius / speedOfSound) * Math.sin(azimuthRad) * this.sampleRate;
    const delay = ear === 'left' ? -itdSamples : itdSamples;

    // ILD (Interaural Level Difference)
    const ild = Math.cos(azimuthRad + (ear === 'left' ? Math.PI / 2 : -Math.PI / 2));
    const gain = 0.5 + 0.5 * ild;

    // Generate simple impulse with delay and filtering
    const delayInt = Math.floor(Math.abs(delay));
    const mainPeak = Math.min(delayInt + 10, length - 1);

    if (ir[mainPeak] !== undefined) {
      ir[mainPeak] = gain;
    }

    // Add some frequency-dependent shaping
    for (let i = 1; i < length; i++) {
      const freq = i / length * this.sampleRate / 2;
      const shaping = this.calculateFrequencyShaping(freq, azimuth, elevation, ear);
      const currentIrValue = ir[i];
      if (currentIrValue !== undefined) {
        ir[i] = currentIrValue * shaping;
      }
    }

    return ir;
  }

  private calculateFrequencyShaping(freq: number, azimuth: number, elevation: number, ear: string): number {
    // Simplified frequency shaping based on head shadowing and pinna effects
    let shaping = 1.0;

    // High-frequency shadowing
    if (freq > 2000) {
      const shadowEffect = Math.cos((azimuth + (ear === 'left' ? 90 : -90)) * Math.PI / 180);
      shaping *= 0.7 + 0.3 * Math.max(0, shadowEffect);
    }

    // Pinna notch around 8-10kHz
    if (freq > 7000 && freq < 12000) {
      const notchEffect = Math.sin(elevation * Math.PI / 180);
      shaping *= 0.8 + 0.2 * Math.abs(notchEffect);
    }

    return shaping;
  }

  public process(
    audioData: Float32Array,
    azimuth: number,
    elevation: number
  ): { leftChannel: Float32Array; rightChannel: Float32Array } {
    // Find nearest HRTF
    const nearestAzimuth = Math.round(azimuth / 15) * 15;
    const nearestElevation = Math.round(elevation / 15) * 15;
    const key = `${nearestAzimuth}_${nearestElevation}`;

    const hrtf = this.impulseResponses.get(key) || this.impulseResponses.get('0_0');
    if (!hrtf) {
      // Fallback if no HRTF found
      return {
        leftChannel: new Float32Array(audioData.length),
        rightChannel: new Float32Array(audioData.length)
      };
    }

    // Convolve with HRTF
    const leftChannel = this.convolve(audioData, hrtf.left);
    const rightChannel = this.convolve(audioData, hrtf.right);

    return { leftChannel, rightChannel };
  }

  private convolve(signal: Float32Array, impulse: Float32Array): Float32Array {
    const outputLength = signal.length + impulse.length - 1;
    const output = new Float32Array(outputLength);

    for (let i = 0; i < signal.length; i++) {
      for (let j = 0; j < impulse.length; j++) {
        if (i + j < outputLength) {
          const signalValue = signal[i] ?? 0;
          const impulseValue = impulse[j] ?? 0;
          const outputIndex = i + j;
          if (output[outputIndex] !== undefined) {
            output[outputIndex] += signalValue * impulseValue;
          }
        }
      }
    }

    return output.slice(0, signal.length);
  }
}

class ConvolutionReverb {
  private sampleRate: number;
  private bufferSize: number;
  private impulseResponse: Float32Array;

  constructor(sampleRate: number, bufferSize: number) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.impulseResponse = this.generateRoomImpulse();
  }

  private generateRoomImpulse(): Float32Array {
    // Generate synthetic room impulse response
    const length = Math.floor(2.0 * this.sampleRate); // 2 seconds
    const impulse = new Float32Array(length);

    // Early reflections
    const numEarlyReflections = 20;
    for (let i = 0; i < numEarlyReflections; i++) {
      const delay = 0.01 + Math.random() * 0.05; // 10-60ms
      const amplitude = Math.random() * 0.3 + 0.1;
      const sampleIndex = Math.floor(delay * this.sampleRate);

      if (sampleIndex < length) {
        const currentValue = impulse[sampleIndex];
        if (currentValue !== undefined) {
          impulse[sampleIndex] = currentValue + amplitude;
        }
      }
    }

    // Late reverberation (exponential decay)
    const rt60 = 1.5; // seconds
    const decayRate = Math.log(0.001) / (rt60 * this.sampleRate); // -60dB decay

    for (let i = Math.floor(0.08 * this.sampleRate); i < length; i++) {
      const noise = (Math.random() - 0.5) * 2;
      const decay = Math.exp(decayRate * i);
      const currentImpulseValue = impulse[i];
      if (currentImpulseValue !== undefined) {
        impulse[i] = currentImpulseValue + noise * decay * 0.1;
      }
    }

    return impulse;
  }

  public updateRoom(room: Room): void {
    // Update impulse response based on room parameters
    this.impulseResponse = this.generateRoomImpulseFromParameters(room);
  }

  private generateRoomImpulseFromParameters(room: Room): Float32Array {
    // More sophisticated room impulse generation
    const length = Math.floor(Math.max(room.reverbTime.rt60_mid, 2.0) * this.sampleRate);
    const impulse = new Float32Array(length);

    // Calculate room reflections based on dimensions
    const volume = room.dimensions.width * room.dimensions.height * room.dimensions.depth;
    const surfaceArea = 2 * (room.dimensions.width * room.dimensions.height +
                            room.dimensions.width * room.dimensions.depth +
                            room.dimensions.height * room.dimensions.depth);

    // Generate impulse with room characteristics
    this.addEarlyReflections(impulse, room);
    this.addLateReverb(impulse, room);

    return impulse;
  }

  private addEarlyReflections(impulse: Float32Array, room: Room): void {
    // Add reflections from room surfaces
    const speedOfSound = 343; // m/s

    // Calculate reflection times for each surface
    const reflectionTimes = [
      room.dimensions.width / speedOfSound,     // Side walls
      room.dimensions.height / speedOfSound,    // Floor/ceiling
      room.dimensions.depth / speedOfSound      // Front/back walls
    ];

    for (const time of reflectionTimes) {
      const sampleIndex = Math.floor(time * this.sampleRate);
      if (sampleIndex < impulse.length && impulse[sampleIndex] !== undefined) {
        impulse[sampleIndex] += 0.5 * (1 - room.absorption.mid);
      }
    }
  }

  private addLateReverb(impulse: Float32Array, room: Room): void {
    const rt60 = room.reverbTime.rt60_mid;
    const decayRate = Math.log(0.001) / (rt60 * this.sampleRate);

    for (let i = Math.floor(0.1 * this.sampleRate); i < impulse.length; i++) {
      const noise = (Math.random() - 0.5) * 2;
      const decay = Math.exp(decayRate * i);
      const diffusion = room.diffusion;

      const currentValue = impulse[i];
      if (currentValue !== undefined) {
        impulse[i] = currentValue + noise * decay * diffusion * 0.2;
      }
    }
  }

  public process(
    binauralInput: { leftChannel: Float32Array; rightChannel: Float32Array },
    sourcePosition: SpatialPosition
  ): { leftChannel: Float32Array; rightChannel: Float32Array } {
    // Apply room reverb
    const leftWithReverb = this.convolveWithReverb(binauralInput.leftChannel);
    const rightWithReverb = this.convolveWithReverb(binauralInput.rightChannel);

    return {
      leftChannel: leftWithReverb,
      rightChannel: rightWithReverb
    };
  }

  private convolveWithReverb(input: Float32Array): Float32Array {
    // Simplified convolution (would use FFT convolution in practice)
    const output = new Float32Array(input.length);
    const reverbGain = 0.3; // Mix level

    // Direct sound
    for (let i = 0; i < input.length; i++) {
      if (output[i] !== undefined) {
        output[i] = input[i] ?? 0;
      }
    }

    // Add reverb
    const reverbLength = Math.min(this.impulseResponse.length, input.length);
    for (let i = 0; i < input.length; i++) {
      let reverbSample = 0;
      for (let j = 0; j < reverbLength && i - j >= 0; j++) {
        const inputValue = input[i - j] || 0;
        const impulseValue = this.impulseResponse[j] || 0;
        reverbSample += inputValue * impulseValue;
      }
      const currentOutputValue = output[i];
      if (currentOutputValue !== undefined) {
        output[i] = currentOutputValue + reverbSample * reverbGain;
      }
    }

    return output;
  }
}

class AmbisonicsDecoder {
  private sampleRate: number;
  private order: number;
  private channelCount: number;

  constructor(sampleRate: number, order: number) {
    this.sampleRate = sampleRate;
    this.order = order;
    this.channelCount = (order + 1) ** 2;
  }

  public encode(sources: Map<string, BinauralProcessingResult>): Float32Array[] {
    const firstSource = sources.values().next().value;
    const bufferLength = firstSource?.leftChannel.length || 512;
    const ambisonicChannels = Array(this.channelCount).fill(null)
      .map(() => new Float32Array(bufferLength));

    // Encode sources to Ambisonics
    for (const result of Array.from(sources.values())) {
      const { azimuth, elevation } = result.spatialMetrics;
      const encodingCoeffs = this.calculateEncodingCoefficients(azimuth, elevation);

      const monoSource = new Float32Array(result.leftChannel.length);
      for (let i = 0; i < monoSource.length; i++) {
        const leftValue = result.leftChannel?.[i] ?? 0;
        const rightValue = result.rightChannel?.[i] ?? 0;
        monoSource[i] = (leftValue + rightValue) * 0.5;
      }

      // Apply encoding coefficients
      for (let ch = 0; ch < this.channelCount; ch++) {
        const coeff = encodingCoeffs[ch] || 0;
        for (let i = 0; i < monoSource.length; i++) {
          const monoSample = monoSource[i] ?? 0;
          const channel = ambisonicChannels[ch];
          if (channel) {
            const currentChannelValue = channel[i];
            if (currentChannelValue !== undefined) {
              channel[i] = currentChannelValue + monoSample * coeff;
            }
          }
        }
      }
    }

    return ambisonicChannels;
  }

  private calculateEncodingCoefficients(azimuth: number, elevation: number): Float32Array {
    const coeffs = new Float32Array(this.channelCount);
    const azimuthRad = azimuth * Math.PI / 180;
    const elevationRad = elevation * Math.PI / 180;

    // Calculate spherical harmonics for encoding
    let index = 0;

    for (let l = 0; l <= this.order; l++) {
      for (let m = -l; m <= l; m++) {
        coeffs[index] = this.sphericalHarmonic(l, m, azimuthRad, elevationRad);
        index++;
      }
    }

    return coeffs;
  }

  private sphericalHarmonic(l: number, m: number, azimuth: number, elevation: number): number {
    // Simplified spherical harmonics calculation
    // In practice, would use proper associated Legendre polynomials

    if (l === 0) {
      return 1 / Math.sqrt(4 * Math.PI); // W (omni)
    }

    if (l === 1) {
      if (m === -1) return Math.sqrt(3 / (4 * Math.PI)) * Math.sin(azimuth) * Math.cos(elevation); // Y
      if (m === 0) return Math.sqrt(3 / (4 * Math.PI)) * Math.sin(elevation); // Z
      if (m === 1) return Math.sqrt(3 / (4 * Math.PI)) * Math.cos(azimuth) * Math.cos(elevation); // X
    }

    // Higher orders would be calculated here
    return 0;
  }
}

class BinauralProcessor {
  private sampleRate: number;
  private crossfeedGain: number = 0.3;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public process(
    leftChannel: Float32Array,
    rightChannel: Float32Array,
    spatialMetrics: any
  ): { leftChannel: Float32Array; rightChannel: Float32Array } {
    const output = {
      leftChannel: new Float32Array(leftChannel.length),
      rightChannel: new Float32Array(rightChannel.length)
    };

    // Apply crossfeed for better externalization
    for (let i = 0; i < leftChannel.length; i++) {
      const leftValue = leftChannel[i] || 0;
      const rightValue = rightChannel[i] || 0;
      output.leftChannel[i] = leftValue + rightValue * this.crossfeedGain;
      output.rightChannel[i] = rightValue + leftValue * this.crossfeedGain;
    }

    return output;
  }
}

// Export the spatial audio processor
export {
  SpatialAudioProcessor,
  type SpatialPosition,
  type AudioSource,
  type Room,
  type BinauralProcessingResult,
  type AmbisonicsConfig
};