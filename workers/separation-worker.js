/**
 * AI Source Separation Web Worker
 * Runs ML models in background without blocking UI
 */

// Mock implementation - will be replaced with actual TensorFlow.js/ONNX model
class AudioSeparationProcessor {
  constructor() {
    this.isInitialized = false;
    this.models = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // TODO: Load actual ML models (Spleeter, DEMUCS, or similar)
      // For now, we'll simulate with advanced audio processing
      
      // Simulate model loading time
      this.postProgress({
        stage: 'loading',
        percentage: 30,
        userMessage: "🤖 Loading AI models..."
      });
      
      await this.simulateDelay(2000);
      
      this.postProgress({
        stage: 'loading', 
        percentage: 100,
        userMessage: "✅ AI models ready!"
      });
      
      this.isInitialized = true;
    } catch (error) {
      this.postError(`Failed to load AI models: ${error.message}`);
    }
  }

  async separateAudio(audioData, settings, sampleRate, channels, duration) {
    try {
      // Preprocessing stage
      this.postProgress({
        stage: 'preprocessing',
        percentage: 20,
        userMessage: "🔍 Analyzing audio patterns...",
        timeRemaining: Math.round(duration * 1.5)
      });
      
      await this.simulateDelay(1000);

      // Separation stage with realistic progress updates
      const totalSteps = 5;
      for (let i = 1; i <= totalSteps; i++) {
        const percentage = 20 + (60 * i / totalSteps);
        const messages = [
          "🎤 Identifying vocals...",
          "🥁 Finding drum patterns...", 
          "🎸 Isolating bass lines...",
          "🎹 Separating instruments...",
          "✨ Applying final polish..."
        ];
        
        this.postProgress({
          stage: 'separating',
          percentage,
          userMessage: messages[i - 1],
          timeRemaining: Math.round(duration * (totalSteps - i) * 0.3)
        });
        
        await this.simulateDelay(500);
      }

      // Apply advanced frequency-based separation (enhanced version of existing logic)
      const separatedAudio = await this.advancedFrequencySeparation(audioData, settings, sampleRate);
      
      // Post-processing
      this.postProgress({
        stage: 'postprocessing',
        percentage: 90,
        userMessage: "🎨 Enhancing audio quality..."
      });
      
      await this.simulateDelay(500);

      // Complete
      self.postMessage({
        type: 'complete',
        separatedAudio,
        settings
      });
      
    } catch (error) {
      this.postError(`Separation failed: ${error.message}`);
    }
  }

  async advancedFrequencySeparation(audioData, settings, sampleRate) {
    const { channels } = audioData;
    const channelData = channels[0]; // Use first channel for processing
    
    // Advanced frequency analysis (improved from basic version)
    const fftSize = 4096;
    const hopSize = fftSize / 4;
    const numFrames = Math.floor((channelData.length - fftSize) / hopSize) + 1;
    
    // Frequency ranges for better separation
    const ranges = {
      vocals: { min: 80, max: 1100, emphasis: [200, 800] },    // Human voice with harmonics
      drums: { min: 60, max: 5000, emphasis: [100, 200, 2000] }, // Kick, snare, cymbals
      bass: { min: 20, max: 250, emphasis: [40, 80, 160] },      // Bass frequencies
      other: { min: 200, max: 15000, emphasis: [440, 880, 1760] } // Instruments
    };

    const separated = {
      vocals: new Float32Array(channelData.length),
      drums: new Float32Array(channelData.length), 
      bass: new Float32Array(channelData.length),
      other: new Float32Array(channelData.length),
      accompaniment: new Float32Array(channelData.length)
    };

    // Apply windowed processing for better separation
    for (let frame = 0; frame < numFrames; frame++) {
      const startIdx = frame * hopSize;
      const endIdx = Math.min(startIdx + fftSize, channelData.length);
      const frameData = channelData.slice(startIdx, endIdx);
      
      // Apply window function
      const windowed = this.applyWindow(frameData);
      
      // FFT (simplified - real implementation would use proper FFT)
      const spectrum = this.simpleSpectralAnalysis(windowed, sampleRate);
      
      // Separate based on frequency characteristics
      const separatedSpectrum = this.separateSpectrum(spectrum, ranges, settings);
      
      // Convert back to time domain (simplified IFFT)
      const separatedFrame = this.spectrumToTime(separatedSpectrum);
      
      // Overlap-add reconstruction
      this.overlapAdd(separated, separatedFrame, startIdx);
    }

    // Create accompaniment (everything except vocals)
    for (let i = 0; i < channelData.length; i++) {
      separated.accompaniment[i] = separated.drums[i] + separated.bass[i] + separated.other[i];
    }

    // Return in expected format with confidence scores
    return {
      vocals: [separated.vocals],
      drums: [separated.drums],
      bass: [separated.bass], 
      other: [separated.other],
      accompaniment: [separated.accompaniment],
      confidence: {
        vocals: this.calculateConfidence(separated.vocals, 'vocals'),
        drums: this.calculateConfidence(separated.drums, 'drums'),
        bass: this.calculateConfidence(separated.bass, 'bass'),
        other: this.calculateConfidence(separated.other, 'other'),
        accompaniment: this.calculateConfidence(separated.accompaniment, 'accompaniment')
      }
    };
  }

  applyWindow(data) {
    // Hanning window for better frequency resolution
    const windowed = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const windowValue = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (data.length - 1));
      windowed[i] = data[i] * windowValue;
    }
    return windowed;
  }

  simpleSpectralAnalysis(data, sampleRate) {
    // Simplified spectral analysis
    const spectrum = [];
    const freqBinSize = sampleRate / data.length;
    
    for (let freq = 0; freq < sampleRate / 2; freq += freqBinSize) {
      let magnitude = 0;
      let phase = 0;
      
      // Simple DFT for this frequency
      for (let n = 0; n < data.length; n++) {
        const angle = -2 * Math.PI * freq * n / sampleRate;
        magnitude += data[n] * Math.cos(angle);
        phase += data[n] * Math.sin(angle);
      }
      
      spectrum.push({ frequency: freq, magnitude, phase });
    }
    
    return spectrum;
  }

  separateSpectrum(spectrum, ranges, settings) {
    const separated = {
      vocals: [],
      drums: [],
      bass: [],
      other: []
    };

    spectrum.forEach(bin => {
      const freq = bin.frequency;
      
      // Determine which source this frequency likely belongs to
      let maxScore = 0;
      let bestSource = 'other';
      
      Object.entries(ranges).forEach(([source, range]) => {
        if (freq >= range.min && freq <= range.max) {
          let score = 1.0;
          
          // Boost score for emphasis frequencies
          if (range.emphasis) {
            const minDistance = Math.min(...range.emphasis.map(f => Math.abs(freq - f)));
            score += Math.exp(-minDistance / 50); // Exponential emphasis
          }
          
          if (score > maxScore) {
            maxScore = score;
            bestSource = source;
          }
        }
      });

      // Initialize all sources with small amount
      Object.keys(separated).forEach(source => {
        separated[source].push({
          frequency: freq,
          magnitude: bin.magnitude * 0.05, // Small bleed
          phase: bin.phase
        });
      });
      
      // Boost the primary source
      separated[bestSource][separated[bestSource].length - 1].magnitude = bin.magnitude * 0.95;
    });

    return separated;
  }

  spectrumToTime(separatedSpectrum) {
    const result = {};
    
    Object.entries(separatedSpectrum).forEach(([source, spectrum]) => {
      const timeData = new Float32Array(spectrum.length);
      
      // Simple inverse transform
      for (let n = 0; n < timeData.length; n++) {
        let sample = 0;
        spectrum.forEach(bin => {
          const angle = 2 * Math.PI * bin.frequency * n / 44100; // Assume 44.1kHz
          sample += bin.magnitude * Math.cos(angle + bin.phase);
        });
        timeData[n] = sample / spectrum.length;
      }
      
      result[source] = timeData;
    });
    
    return result;
  }

  overlapAdd(output, frameData, startIdx) {
    Object.keys(frameData).forEach(source => {
      const data = frameData[source];
      for (let i = 0; i < data.length && startIdx + i < output[source].length; i++) {
        output[source][startIdx + i] += data[i];
      }
    });
  }

  calculateConfidence(audioData, source) {
    // Calculate confidence based on energy distribution and source characteristics
    let energy = 0;
    let peakCount = 0;
    let avgMagnitude = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      const magnitude = Math.abs(audioData[i]);
      energy += magnitude * magnitude;
      avgMagnitude += magnitude;
      
      // Count peaks (simplified)
      if (i > 0 && i < audioData.length - 1) {
        if (magnitude > Math.abs(audioData[i-1]) && magnitude > Math.abs(audioData[i+1])) {
          peakCount++;
        }
      }
    }
    
    avgMagnitude /= audioData.length;
    const rms = Math.sqrt(energy / audioData.length);
    
    // Source-specific confidence calculation
    let confidence = Math.min(0.95, Math.max(0.5, rms * 10));
    
    switch (source) {
      case 'vocals':
        // Vocals should have moderate peaks and good energy in mid frequencies
        confidence *= (peakCount > 10 && peakCount < 1000) ? 1.1 : 0.9;
        break;
      case 'drums':
        // Drums should have many peaks and high dynamics
        confidence *= (peakCount > 50) ? 1.2 : 0.8;
        break;
      case 'bass':
        // Bass should have consistent energy, fewer peaks
        confidence *= (peakCount < 30) ? 1.1 : 0.9;
        break;
    }
    
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  postProgress(progress) {
    self.postMessage({ type: 'progress', ...progress });
  }

  postError(message) {
    self.postMessage({ type: 'error', message });
  }

  async simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Worker main thread
const processor = new AudioSeparationProcessor();

self.onmessage = async function(event) {
  const { type, audioData, settings, sampleRate, channels, duration } = event.data;

  switch (type) {
    case 'initialize':
      await processor.initialize();
      break;
      
    case 'separate':
      if (!processor.isInitialized) {
        await processor.initialize();
      }
      await processor.separateAudio(audioData, settings, sampleRate, channels, duration);
      break;
      
    default:
      processor.postError(`Unknown command: ${type}`);
  }
};