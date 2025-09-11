/**
 * Voice Detection & Speaker Recognition Web Worker
 * Processes voice activity detection and speaker clustering in background
 */

class VoiceDetectionProcessor {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    this.isInitialized = true;
    console.log('Voice detection processor initialized');
  }

  async detectVoices(audioData, settings, sampleRate, duration) {
    try {
      this.postProgress({
        stage: 'analyzing',
        percentage: 10,
        userMessage: "🔍 Analyzing audio for voice patterns...",
        speakersFound: 0
      });

      // Step 1: Voice Activity Detection (VAD)
      const voiceSegments = await this.detectVoiceActivity(audioData.audioData, settings, sampleRate);
      
      this.postProgress({
        stage: 'segmenting',
        percentage: 30,
        userMessage: `📋 Found ${voiceSegments.length} voice segments...`,
        speakersFound: 0
      });

      // Step 2: Extract voice features for each segment
      const voiceFeatures = await this.extractVoiceFeatures(audioData.audioData, voiceSegments, sampleRate);
      
      this.postProgress({
        stage: 'clustering',
        percentage: 50,
        userMessage: "🤖 Identifying different speakers...",
        speakersFound: 0
      });

      // Step 3: Cluster segments by speaker
      const speakerClusters = await this.clusterSpeakers(voiceFeatures, settings);
      
      this.postProgress({
        stage: 'profiling',
        percentage: 70,
        userMessage: `👥 Creating profiles for ${speakerClusters.length} speakers...`,
        speakersFound: speakerClusters.length
      });

      // Step 4: Create speaker profiles
      const voiceProfiles = await this.createSpeakerProfiles(speakerClusters, voiceSegments, audioData.audioData, sampleRate, settings);
      
      // Complete
      self.postMessage({
        type: 'voicesDetected',
        voiceProfiles
      });
      
    } catch (error) {
      this.postError(`Voice detection failed: ${error.message}`);
    }
  }

  async detectVoiceActivity(audioData, settings, sampleRate) {
    const voiceSegments = [];
    const frameSize = Math.floor(sampleRate * 0.025); // 25ms frames
    const hopSize = Math.floor(frameSize / 2); // 50% overlap
    const vadThreshold = settings.vadThreshold || 0.3;
    
    let isInVoiceSegment = false;
    let segmentStart = 0;
    let voiceFrameCount = 0;
    let silenceFrameCount = 0;
    
    // Process audio in frames
    for (let frameStart = 0; frameStart < audioData.length - frameSize; frameStart += hopSize) {
      const frame = audioData.slice(frameStart, frameStart + frameSize);
      
      // Calculate frame energy and spectral features
      const frameEnergy = this.calculateFrameEnergy(frame);
      const spectralCentroid = this.calculateSpectralCentroid(frame, sampleRate);
      const zeroCrossingRate = this.calculateZeroCrossingRate(frame);
      
      // Voice activity decision based on multiple features
      const isVoiceFrame = this.isVoiceFrame(frameEnergy, spectralCentroid, zeroCrossingRate, vadThreshold);
      
      if (isVoiceFrame) {
        if (!isInVoiceSegment) {
          // Start new voice segment
          segmentStart = frameStart / sampleRate;
          isInVoiceSegment = true;
          voiceFrameCount = 1;
          silenceFrameCount = 0;
        } else {
          voiceFrameCount++;
          silenceFrameCount = 0;
        }
      } else {
        if (isInVoiceSegment) {
          silenceFrameCount++;
          
          // End segment if enough silence frames (but allow short pauses)
          if (silenceFrameCount > 10) { // ~250ms of silence
            const segmentEnd = (frameStart - silenceFrameCount * hopSize) / sampleRate;
            const segmentDuration = segmentEnd - segmentStart;
            
            // Only keep segments longer than minimum duration
            if (segmentDuration >= settings.minSegmentDuration) {
              voiceSegments.push({
                startTime: segmentStart,
                endTime: segmentEnd,
                duration: segmentDuration,
                confidence: Math.min(0.95, voiceFrameCount / (voiceFrameCount + silenceFrameCount))
              });
            }
            
            isInVoiceSegment = false;
            voiceFrameCount = 0;
            silenceFrameCount = 0;
          }
        }
      }
    }
    
    // Handle final segment
    if (isInVoiceSegment) {
      const segmentEnd = audioData.length / sampleRate;
      const segmentDuration = segmentEnd - segmentStart;
      
      if (segmentDuration >= settings.minSegmentDuration) {
        voiceSegments.push({
          startTime: segmentStart,
          endTime: segmentEnd,
          duration: segmentDuration,
          confidence: Math.min(0.95, voiceFrameCount / (voiceFrameCount + silenceFrameCount || 1))
        });
      }
    }
    
    return voiceSegments;
  }

  calculateFrameEnergy(frame) {
    let energy = 0;
    for (let i = 0; i < frame.length; i++) {
      energy += frame[i] * frame[i];
    }
    return energy / frame.length;
  }

  calculateSpectralCentroid(frame, sampleRate) {
    // Simple spectral centroid calculation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < frame.length / 2; i++) {
      const frequency = (i * sampleRate) / frame.length;
      const magnitude = Math.abs(frame[i]);
      
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  calculateZeroCrossingRate(frame) {
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0) !== (frame[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / frame.length;
  }

  isVoiceFrame(energy, spectralCentroid, zcr, threshold) {
    // Voice typically has:
    // - Moderate energy (not too high, not too low)
    // - Spectral centroid in speech range (300-3000 Hz)
    // - Moderate zero crossing rate
    
    const energyScore = energy > threshold && energy < 10.0;
    const spectralScore = spectralCentroid > 300 && spectralCentroid < 4000;
    const zcrScore = zcr > 0.01 && zcr < 0.3;
    
    // At least 2 out of 3 criteria must be met
    return [energyScore, spectralScore, zcrScore].filter(Boolean).length >= 2;
  }

  async extractVoiceFeatures(audioData, voiceSegments, sampleRate) {
    const features = [];
    
    for (const segment of voiceSegments) {
      const startSample = Math.floor(segment.startTime * sampleRate);
      const endSample = Math.floor(segment.endTime * sampleRate);
      const segmentAudio = audioData.slice(startSample, endSample);
      
      // Extract voice characteristics
      const feature = {
        segment,
        pitch: this.estimatePitch(segmentAudio, sampleRate),
        formants: this.estimateFormants(segmentAudio, sampleRate),
        energy: this.calculateFrameEnergy(segmentAudio),
        spectralCentroid: this.calculateSpectralCentroid(segmentAudio, sampleRate),
        mfcc: this.calculateMFCC(segmentAudio, sampleRate), // Simplified MFCC
        voiceprint: this.createVoiceprint(segmentAudio, sampleRate)
      };
      
      features.push(feature);
    }
    
    return features;
  }

  estimatePitch(audioData, sampleRate) {
    // Simple pitch estimation using autocorrelation
    const minPeriod = Math.floor(sampleRate / 800); // ~800 Hz max
    const maxPeriod = Math.floor(sampleRate / 50);  // ~50 Hz min
    
    let bestPeriod = 0;
    let bestScore = 0;
    
    for (let period = minPeriod; period < maxPeriod && period < audioData.length / 2; period++) {
      let correlation = 0;
      let energy = 0;
      
      for (let i = 0; i < audioData.length - period; i++) {
        correlation += audioData[i] * audioData[i + period];
        energy += audioData[i] * audioData[i];
      }
      
      const normalizedCorrelation = energy > 0 ? correlation / energy : 0;
      
      if (normalizedCorrelation > bestScore) {
        bestScore = normalizedCorrelation;
        bestPeriod = period;
      }
    }
    
    return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
  }

  estimateFormants(audioData, sampleRate) {
    // Simplified formant estimation - look for spectral peaks
    const fftSize = 512;
    const spectrum = this.simpleFFT(audioData.slice(0, fftSize));
    const formants = [];
    
    // Look for first 3 formants in typical ranges
    const formantRanges = [
      [200, 1000],   // F1
      [800, 2500],   // F2
      [1500, 4000]   // F3
    ];
    
    formantRanges.forEach(([min, max]) => {
      const minBin = Math.floor(min * fftSize / sampleRate);
      const maxBin = Math.floor(max * fftSize / sampleRate);
      
      let peakBin = minBin;
      let peakMagnitude = 0;
      
      for (let bin = minBin; bin < maxBin && bin < spectrum.length; bin++) {
        if (spectrum[bin] > peakMagnitude) {
          peakMagnitude = spectrum[bin];
          peakBin = bin;
        }
      }
      
      formants.push(peakBin * sampleRate / fftSize);
    });
    
    return formants;
  }

  calculateMFCC(audioData, sampleRate) {
    // Simplified MFCC calculation (normally would use mel filter banks)
    const fftSize = 512;
    const spectrum = this.simpleFFT(audioData.slice(0, fftSize));
    const mfcc = [];
    
    // Create simple frequency bands
    const numBands = 12;
    const bandSize = spectrum.length / numBands;
    
    for (let band = 0; band < numBands; band++) {
      const startBin = Math.floor(band * bandSize);
      const endBin = Math.floor((band + 1) * bandSize);
      
      let bandEnergy = 0;
      for (let bin = startBin; bin < endBin; bin++) {
        bandEnergy += spectrum[bin];
      }
      
      mfcc.push(Math.log(bandEnergy + 1e-10)); // Log energy in band
    }
    
    return mfcc;
  }

  createVoiceprint(audioData, sampleRate) {
    // Create a compact voice fingerprint for speaker comparison
    const features = [];
    
    // Pitch statistics
    const pitch = this.estimatePitch(audioData, sampleRate);
    features.push(pitch / 1000); // Normalize
    
    // Spectral features
    const spectralCentroid = this.calculateSpectralCentroid(audioData, sampleRate);
    features.push(spectralCentroid / 5000); // Normalize
    
    // Energy
    const energy = this.calculateFrameEnergy(audioData);
    features.push(Math.min(1.0, energy * 10)); // Normalize
    
    // Formants (simplified)
    const formants = this.estimateFormants(audioData, sampleRate);
    formants.slice(0, 3).forEach(f => features.push(f / 4000)); // Normalize
    
    // MFCC coefficients
    const mfcc = this.calculateMFCC(audioData, sampleRate);
    features.push(...mfcc.slice(0, 8).map(c => c / 10)); // Normalize
    
    return new Float32Array(features);
  }

  simpleFFT(audioData) {
    // Very simplified FFT - just magnitude spectrum
    const spectrum = new Float32Array(audioData.length / 2);
    
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0, imag = 0;
      
      for (let n = 0; n < audioData.length; n++) {
        const angle = -2 * Math.PI * k * n / audioData.length;
        real += audioData[n] * Math.cos(angle);
        imag += audioData[n] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }

  async clusterSpeakers(voiceFeatures, settings) {
    const clusteringThreshold = settings.clusteringThreshold || 1.5;
    const clusters = [];
    
    // Simple clustering based on voiceprint similarity
    for (const feature of voiceFeatures) {
      let bestCluster = null;
      let bestDistance = Infinity;
      
      // Find closest existing cluster
      for (const cluster of clusters) {
        const distance = this.calculateVoiceprintDistance(feature.voiceprint, cluster.centroid);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCluster = cluster;
        }
      }
      
      // Add to closest cluster if similar enough, otherwise create new cluster
      if (bestCluster && bestDistance < clusteringThreshold) {
        bestCluster.features.push(feature);
        // Update centroid
        this.updateClusterCentroid(bestCluster);
      } else {
        // Create new cluster
        clusters.push({
          id: clusters.length,
          features: [feature],
          centroid: new Float32Array(feature.voiceprint)
        });
      }
    }
    
    return clusters;
  }

  calculateVoiceprintDistance(voiceprint1, voiceprint2) {
    // Euclidean distance between voiceprints
    let distance = 0;
    const length = Math.min(voiceprint1.length, voiceprint2.length);
    
    for (let i = 0; i < length; i++) {
      const diff = voiceprint1[i] - voiceprint2[i];
      distance += diff * diff;
    }
    
    return Math.sqrt(distance);
  }

  updateClusterCentroid(cluster) {
    const numFeatures = cluster.features.length;
    const featureLength = cluster.features[0].voiceprint.length;
    
    // Calculate average voiceprint
    for (let i = 0; i < featureLength; i++) {
      let sum = 0;
      for (const feature of cluster.features) {
        sum += feature.voiceprint[i];
      }
      cluster.centroid[i] = sum / numFeatures;
    }
  }

  async createSpeakerProfiles(speakerClusters, voiceSegments, audioData, sampleRate, settings) {
    const profiles = [];
    
    for (const cluster of speakerClusters) {
      const speakerId = cluster.id;
      
      // Calculate speaker characteristics
      const pitches = cluster.features.map(f => f.pitch).filter(p => p > 0);
      const energies = cluster.features.map(f => f.energy);
      const formants = cluster.features.map(f => f.formants);
      
      const avgPitch = pitches.length > 0 ? pitches.reduce((a, b) => a + b) / pitches.length : 0;
      const pitchRange = pitches.length > 0 ? Math.max(...pitches) - Math.min(...pitches) : 0;
      const avgEnergy = energies.reduce((a, b) => a + b) / energies.length;
      
      // Estimate gender from pitch
      let gender = 'unknown';
      if (avgPitch > 0) {
        if (avgPitch < 165) gender = 'male';
        else if (avgPitch > 185) gender = 'female';
      }
      
      // Calculate speaking rate (rough estimate)
      const totalDuration = cluster.features.reduce((sum, f) => sum + f.segment.duration, 0);
      const speakingRate = totalDuration > 0 ? cluster.features.length * 60 / totalDuration : 0; // segments per minute as proxy
      
      // Create profile
      const profile = {
        id: speakerId,
        confidence: this.calculateSpeakerConfidence(cluster),
        autoName: settings.autoNaming ? this.generateSpeakerName(speakerId, gender, avgPitch) : null,
        voiceprint: cluster.centroid,
        segments: cluster.features.map(f => ({
          startTime: f.segment.startTime,
          endTime: f.segment.endTime,
          confidence: f.segment.confidence
        })),
        characteristics: {
          pitch: avgPitch,
          pitchRange,
          speakingRate,
          energy: avgEnergy,
          gender
        }
      };
      
      profiles.push(profile);
    }
    
    // Sort by total speaking time (most active speaker first)
    profiles.sort((a, b) => {
      const aTime = a.segments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0);
      const bTime = b.segments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0);
      return bTime - aTime;
    });
    
    return profiles;
  }

  calculateSpeakerConfidence(cluster) {
    // Confidence based on cluster coherence and segment count
    const numSegments = cluster.features.length;
    
    if (numSegments < 2) return 0.5;
    
    // Calculate intra-cluster variability
    let totalVariability = 0;
    for (let i = 0; i < cluster.features.length; i++) {
      const distance = this.calculateVoiceprintDistance(cluster.features[i].voiceprint, cluster.centroid);
      totalVariability += distance;
    }
    
    const avgVariability = totalVariability / numSegments;
    
    // Lower variability = higher confidence
    const variabilityScore = Math.max(0, 1 - avgVariability / 2);
    
    // More segments = higher confidence (up to a point)
    const segmentScore = Math.min(1, numSegments / 10);
    
    return Math.min(0.95, (variabilityScore + segmentScore) / 2);
  }

  generateSpeakerName(id, gender, pitch) {
    const names = {
      male: ['Alex', 'David', 'John', 'Michael', 'Chris'],
      female: ['Sarah', 'Emma', 'Lisa', 'Anna', 'Kate'],
      unknown: ['Speaker']
    };
    
    if (gender === 'unknown') {
      return `Speaker ${id + 1}`;
    }
    
    const nameList = names[gender] || names.unknown;
    const nameIndex = id % nameList.length;
    return nameList[nameIndex];
  }

  postProgress(progress) {
    self.postMessage({ type: 'progress', ...progress });
  }

  postError(message) {
    self.postMessage({ type: 'error', message });
  }
}

// Worker main thread
const processor = new VoiceDetectionProcessor();

self.onmessage = async function(event) {
  const { type, audioData, settings, sampleRate, duration } = event.data;

  switch (type) {
    case 'initialize':
      await processor.initialize();
      break;
      
    case 'detectVoices':
      if (!processor.isInitialized) {
        await processor.initialize();
      }
      await processor.detectVoices(audioData, settings, sampleRate, duration);
      break;
      
    default:
      processor.postError(`Unknown command: ${type}`);
  }
};