/**
 * Advanced Audio Worklet for Real-Time Audio Processing
 * Handles stream separation, voice detection, and ANC processing in a dedicated thread
 */

class AdvancedAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    this.sampleRate = options.processorOptions.sampleRate || 48000;
    this.bufferSize = options.processorOptions.bufferSize || 4096;
    
    // Processing state
    this.isProcessing = false;
    this.frameCounter = 0;
    
    // Voice detection parameters
    this.voiceThreshold = 0.02;
    this.voiceFrameCount = 0;
    this.lastVoiceTime = 0;
    this.voiceHistoryLength = 10;
    this.voiceHistory = new Array(this.voiceHistoryLength).fill(false);
    
    // Stream separation buffers
    this.separationHistory = {
      voice: new Float32Array(this.bufferSize),
      music: new Float32Array(this.bufferSize),
      ambient: new Float32Array(this.bufferSize),
      noise: new Float32Array(this.bufferSize)
    };
    
    // Frequency analysis
    this.fftSize = 1024;
    this.halfFFT = this.fftSize / 2;
    this.analysisBuffer = new Float32Array(this.fftSize);
    this.frequencyData = new Float32Array(this.halfFFT);
    this.previousPhase = new Float32Array(this.halfFFT);
    this.currentPhase = new Float32Array(this.halfFFT);
    
    // ANC processing
    this.ancEnabled = true;
    this.ancIntensity = 0.5;
    this.adaptiveMode = true;
    this.noiseProfile = new Float32Array(this.halfFFT);
    this.noiseLearningRate = 0.01;
    
    // Performance monitoring
    this.processingTimes = [];
    this.lastStatsReport = 0;
    this.statsInterval = 1000; // Report every 1000 frames
    
    // Setup message handling
    this.port.onmessage = this.handleMessage.bind(this);
    
    // Initialize processing components
    this.initializeProcessing();
  }
  
  initializeProcessing() {
    // Initialize noise profile with default values
    for (let i = 0; i < this.halfFFT; i++) {
      this.noiseProfile[i] = 0.1; // Default noise floor
    }
    
    // Send ready message
    this.port.postMessage({
      type: 'ready',
      sampleRate: this.sampleRate,
      bufferSize: this.bufferSize
    });
  }
  
  handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'updateSettings':
        this.updateSettings(data);
        break;
      case 'enableProcessing':
        this.isProcessing = data.enabled;
        break;
      case 'setANCIntensity':
        this.ancIntensity = Math.max(0, Math.min(1, data.intensity));
        break;
      case 'setVoiceThreshold':
        this.voiceThreshold = Math.max(0, Math.min(1, data.threshold));
        break;
    }
  }
  
  updateSettings(settings) {
    if (settings.ancEnabled !== undefined) {
      this.ancEnabled = settings.ancEnabled;
    }
    if (settings.ancIntensity !== undefined) {
      this.ancIntensity = Math.max(0, Math.min(1, settings.ancIntensity));
    }
    if (settings.adaptiveMode !== undefined) {
      this.adaptiveMode = settings.adaptiveMode;
    }
    if (settings.voiceThreshold !== undefined) {
      this.voiceThreshold = Math.max(0, Math.min(1, settings.voiceThreshold));
    }
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || input.length === 0) {
      return true;
    }
    
    const startTime = performance.now();
    
    try {
      // Process each channel
      for (let channel = 0; channel < input.length; channel++) {
        const inputChannel = input[channel];
        const outputChannel = output[channel];
        
        if (this.isProcessing) {
          this.processChannel(inputChannel, outputChannel, channel);
        } else {
          // Pass through without processing
          outputChannel.set(inputChannel);
        }
      }
      
      this.frameCounter++;
      
      // Performance monitoring
      const processingTime = performance.now() - startTime;
      this.processingTimes.push(processingTime);
      
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      
      // Send periodic stats
      if (this.frameCounter % this.statsInterval === 0) {
        this.sendProcessingStats();
      }
      
    } catch (error) {
      console.error('Audio processing error:', error);
      // Send error to main thread
      this.port.postMessage({
        type: 'error',
        error: error.message
      });
    }
    
    return true;
  }
  
  processChannel(inputData, outputData, channelIndex) {
    const bufferLength = inputData.length;
    
    // Perform frequency analysis
    this.performFrequencyAnalysis(inputData);
    
    // Voice activity detection
    const voiceDetection = this.detectVoiceActivity(inputData);
    
    // Stream separation
    const separatedStreams = this.separateAudioStreams(inputData);
    
    // Apply ANC processing
    if (this.ancEnabled) {
      this.applyNoiseReduction(separatedStreams, voiceDetection);
    }
    
    // Mix streams back together
    this.mixStreams(separatedStreams, outputData);
    
    // Send real-time data to main thread
    if (this.frameCounter % 10 === 0) { // Send every 10 frames for performance
      this.sendRealtimeData({
        voiceDetection,
        separatedStreams: this.prepareStreamData(separatedStreams),
        frequencyData: Array.from(this.frequencyData.slice(0, 128)) // Send subset for visualization
      });
    }
  }
  
  performFrequencyAnalysis(inputData) {
    const bufferLength = inputData.length;
    
    // Copy input to analysis buffer (with zero padding if needed)
    this.analysisBuffer.fill(0);
    for (let i = 0; i < Math.min(bufferLength, this.fftSize); i++) {
      this.analysisBuffer[i] = inputData[i];
    }
    
    // Simple FFT implementation (basic version for demo)
    // In production, would use a proper FFT library
    this.computeSimpleFFT(this.analysisBuffer, this.frequencyData);
    
    // Update noise profile for ANC
    if (this.adaptiveMode) {
      this.updateNoiseProfile();
    }
  }
  
  computeSimpleFFT(timeData, freqData) {
    // Simplified FFT computation
    // This is a basic implementation - production would use optimized FFT
    const N = timeData.length;
    
    for (let k = 0; k < this.halfFFT; k++) {
      let realSum = 0;
      let imagSum = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        realSum += timeData[n] * Math.cos(angle);
        imagSum += timeData[n] * Math.sin(angle);
      }
      
      // Magnitude
      freqData[k] = Math.sqrt(realSum * realSum + imagSum * imagSum) / N;
    }
  }
  
  detectVoiceActivity(inputData) {
    const bufferLength = inputData.length;
    
    // Calculate energy
    let energy = 0;
    for (let i = 0; i < bufferLength; i++) {
      energy += inputData[i] * inputData[i];
    }
    energy = Math.sqrt(energy / bufferLength);
    
    // Calculate zero crossing rate
    let zeroCrossings = 0;
    for (let i = 1; i < bufferLength; i++) {
      if ((inputData[i] >= 0) !== (inputData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / bufferLength;
    
    // Calculate spectral centroid (simplified)
    let weightedSum = 0;
    let magnitudeSum = 0;
    const startFreq = Math.floor(85 * this.halfFFT / (this.sampleRate / 2)); // 85 Hz
    const endFreq = Math.floor(1100 * this.halfFFT / (this.sampleRate / 2)); // 1100 Hz
    
    for (let i = startFreq; i < Math.min(endFreq, this.halfFFT); i++) {
      const magnitude = this.frequencyData[i];
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    
    // Voice detection logic
    const energyThreshold = this.voiceThreshold;
    const zcrThreshold = 0.3;
    const isVoicePresent = 
      energy > energyThreshold && 
      zcr < zcrThreshold && 
      spectralCentroid > startFreq;
    
    // Update voice history
    this.voiceHistory[this.voiceFrameCount % this.voiceHistoryLength] = isVoicePresent;
    this.voiceFrameCount++;
    
    // Calculate confidence based on recent history
    const recentVoiceCount = this.voiceHistory.reduce((sum, val) => sum + (val ? 1 : 0), 0);
    const confidence = recentVoiceCount / this.voiceHistoryLength;
    
    const result = {
      isVoicePresent,
      confidence,
      energy,
      zeroCrossingRate: zcr,
      spectralCentroid,
      voiceStartTime: isVoicePresent && !this.voiceHistory[(this.voiceFrameCount - 2) % this.voiceHistoryLength] ? 
        currentFrame * this.bufferSize / this.sampleRate * 1000 : undefined
    };
    
    if (isVoicePresent) {
      this.lastVoiceTime = this.frameCounter;
    }
    
    return result;
  }
  
  separateAudioStreams(inputData) {
    const bufferLength = inputData.length;
    
    // Initialize output streams
    const streams = {
      voice: new Float32Array(bufferLength),
      music: new Float32Array(bufferLength),
      ambient: new Float32Array(bufferLength),
      noise: new Float32Array(bufferLength)
    };
    
    // Frequency-based separation (simplified approach)
    // In production, would use machine learning models
    
    for (let i = 0; i < bufferLength; i++) {
      const sample = inputData[i];
      const timeRatio = i / bufferLength;
      const freqIndex = Math.floor(timeRatio * this.halfFFT);
      
      // Get frequency magnitude for this time sample (approximation)
      const freqMagnitude = freqIndex < this.frequencyData.length ? 
        this.frequencyData[freqIndex] : 0;
      
      // Calculate frequency in Hz
      const frequency = (freqIndex / this.halfFFT) * (this.sampleRate / 2);
      
      // Separate based on frequency characteristics
      if (frequency >= 85 && frequency <= 1100) {
        // Voice range
        streams.voice[i] = sample * this.getVoiceWeight(frequency, freqMagnitude);
      } else {
        streams.voice[i] = sample * 0.1; // Minimal voice content outside range
      }
      
      if (frequency >= 20 && frequency <= 8000) {
        // Music range
        streams.music[i] = sample * this.getMusicWeight(frequency, freqMagnitude);
      } else {
        streams.music[i] = sample * 0.1;
      }
      
      if (frequency >= 20 && frequency <= 200) {
        // Ambient range
        streams.ambient[i] = sample * this.getAmbientWeight(frequency, freqMagnitude);
      } else {
        streams.ambient[i] = sample * 0.1;
      }
      
      if (frequency >= 8000) {
        // Noise range
        streams.noise[i] = sample * this.getNoiseWeight(frequency, freqMagnitude);
      } else {
        streams.noise[i] = sample * 0.1;
      }
    }
    
    return streams;
  }
  
  getVoiceWeight(frequency, magnitude) {
    // Enhanced voice detection based on frequency and magnitude
    if (frequency >= 85 && frequency <= 1100) {
      // Peak sensitivity around 300-500 Hz (typical speech fundamental)
      const peakFreq = 400;
      const distance = Math.abs(frequency - peakFreq) / peakFreq;
      const frequencyWeight = Math.max(0.3, 1 - distance);
      
      // Magnitude weighting (voices typically have consistent energy)
      const magnitudeWeight = Math.min(1, magnitude * 5);
      
      return frequencyWeight * magnitudeWeight;
    }
    return 0.1;
  }
  
  getMusicWeight(frequency, magnitude) {
    // Music spans broader frequency range with harmonic content
    if (frequency >= 20 && frequency <= 8000) {
      // Higher weight for harmonic frequencies
      const harmonicWeight = magnitude > 0.05 ? 0.9 : 0.6;
      return harmonicWeight;
    }
    return 0.1;
  }
  
  getAmbientWeight(frequency, magnitude) {
    // Ambient sounds are typically low frequency, sustained
    if (frequency >= 20 && frequency <= 200) {
      return 0.8;
    }
    return 0.1;
  }
  
  getNoiseWeight(frequency, magnitude) {
    // High frequency content is often noise
    if (frequency >= 8000) {
      return 0.9;
    }
    return 0.1;
  }
  
  updateNoiseProfile() {
    // Update noise profile for adaptive ANC
    // Learn from periods without voice activity
    const timeSinceVoice = this.frameCounter - this.lastVoiceTime;
    
    if (timeSinceVoice > 50) { // 50 frames without voice
      for (let i = 0; i < this.halfFFT; i++) {
        // Exponential moving average
        this.noiseProfile[i] = 
          (1 - this.noiseLearningRate) * this.noiseProfile[i] + 
          this.noiseLearningRate * this.frequencyData[i];
      }
    }
  }
  
  applyNoiseReduction(streams, voiceDetection) {
    // Apply ANC processing to each stream
    const intensity = this.ancIntensity;
    
    // Noise stream - heavy reduction
    this.reduceNoise(streams.noise, intensity * 0.9);
    
    // Ambient stream - moderate reduction
    this.reduceNoise(streams.ambient, intensity * 0.5);
    
    // Music stream - light reduction to preserve quality
    this.reduceNoise(streams.music, intensity * 0.3);
    
    // Voice stream - adaptive reduction based on voice detection
    const voiceReduction = voiceDetection.isVoicePresent ? 
      intensity * 0.2 : // Less reduction when voice is present
      intensity * 0.6;   // More reduction when no voice
    this.reduceNoise(streams.voice, voiceReduction);
  }
  
  reduceNoise(streamData, reductionAmount) {
    const bufferLength = streamData.length;
    
    for (let i = 0; i < bufferLength; i++) {
      // Simple noise reduction using spectral subtraction approach
      const frequencyRatio = i / bufferLength;
      const freqIndex = Math.floor(frequencyRatio * this.halfFFT);
      
      if (freqIndex < this.noiseProfile.length) {
        const noiseLevel = this.noiseProfile[freqIndex];
        const signalLevel = Math.abs(streamData[i]);
        
        // Calculate reduction factor
        const reductionFactor = Math.min(reductionAmount, noiseLevel / Math.max(signalLevel, 0.001));
        
        // Apply reduction
        streamData[i] *= (1 - reductionFactor);
      }
    }
  }
  
  mixStreams(streams, outputData) {
    const bufferLength = outputData.length;
    
    // Clear output buffer
    outputData.fill(0);
    
    // Mix all streams
    for (let i = 0; i < bufferLength; i++) {
      outputData[i] = 
        streams.voice[i] * 0.4 +    // Voice stream weight
        streams.music[i] * 0.3 +    // Music stream weight
        streams.ambient[i] * 0.2 +  // Ambient stream weight
        streams.noise[i] * 0.1;     // Noise stream weight (minimal)
      
      // Prevent clipping
      outputData[i] = Math.max(-1, Math.min(1, outputData[i]));
    }
  }
  
  prepareStreamData(streams) {
    // Prepare stream data for transmission (reduce size)
    const sampleCount = 32; // Send only a subset for visualization
    const stride = Math.floor(streams.voice.length / sampleCount);
    
    return {
      voice: this.sampleArray(streams.voice, stride, sampleCount),
      music: this.sampleArray(streams.music, stride, sampleCount),
      ambient: this.sampleArray(streams.ambient, stride, sampleCount),
      noise: this.sampleArray(streams.noise, stride, sampleCount)
    };
  }
  
  sampleArray(array, stride, count) {
    const result = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const index = Math.min(i * stride, array.length - 1);
      result[i] = array[index];
    }
    return result;
  }
  
  sendRealtimeData(data) {
    this.port.postMessage({
      type: 'realtime-data',
      timestamp: performance.now(),
      frameCount: this.frameCounter,
      ...data
    });
  }
  
  sendProcessingStats() {
    const avgProcessingTime = this.processingTimes.length > 0 ?
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length : 0;
    
    const maxProcessingTime = this.processingTimes.length > 0 ?
      Math.max(...this.processingTimes) : 0;
    
    const cpuUsage = (avgProcessingTime / (this.bufferSize / this.sampleRate * 1000)) * 100;
    
    this.port.postMessage({
      type: 'processing-stats',
      stats: {
        frameCount: this.frameCounter,
        averageProcessingTime: avgProcessingTime.toFixed(2),
        maxProcessingTime: maxProcessingTime.toFixed(2),
        estimatedCPUUsage: cpuUsage.toFixed(1),
        sampleRate: this.sampleRate,
        bufferSize: this.bufferSize,
        timestamp: performance.now()
      }
    });
    
    // Reset processing times array
    this.processingTimes = [];
  }
}

// Register the processor
registerProcessor('advanced-audio-processor', AdvancedAudioProcessor);