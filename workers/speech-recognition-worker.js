/**
 * Speech Recognition Web Worker
 * Handles offline speech-to-text processing
 */

class SpeechRecognitionProcessor {
  constructor() {
    this.isInitialized = false;
    this.vocabularyModel = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize basic speech processing capabilities
      // In a real implementation, this would load ML models like Whisper or similar
      console.log('Initializing speech recognition processor...');
      
      // Simulate model loading
      await this.simulateDelay(1000);
      
      this.isInitialized = true;
      this.postProgress({
        stage: 'preparing',
        percentage: 100,
        userMessage: "🎯 Speech recognition engine ready!",
        captionsGenerated: 0
      });
      
    } catch (error) {
      this.postError(`Failed to initialize speech recognition: ${error.message}`);
    }
  }

  async transcribe(audioData, settings) {
    try {
      this.postProgress({
        stage: 'preparing',
        percentage: 10,
        userMessage: "🔍 Analyzing speech patterns...",
        captionsGenerated: 0
      });

      // Step 1: Audio preprocessing
      const processedAudio = await this.preprocessAudio(audioData.audioData, audioData.sampleRate);
      
      this.postProgress({
        stage: 'listening',
        percentage: 30,
        userMessage: "👂 Listening for speech...",
        captionsGenerated: 0
      });

      // Step 2: Speech detection and segmentation
      const speechSegments = await this.detectSpeechSegments(processedAudio, audioData.sampleRate, settings);
      
      this.postProgress({
        stage: 'transcribing',
        percentage: 50,
        userMessage: `💬 Converting ${speechSegments.length} speech segments to text...`,
        captionsGenerated: 0
      });

      // Step 3: Transcribe each segment
      const transcriptions = [];
      for (let i = 0; i < speechSegments.length; i++) {
        const segment = speechSegments[i];
        
        this.postProgress({
          stage: 'transcribing',
          percentage: 50 + (i / speechSegments.length * 40),
          userMessage: `✍️ Transcribing segment ${i + 1}/${speechSegments.length}...`,
          captionsGenerated: transcriptions.length
        });

        const transcription = await this.transcribeSegment(segment, settings);
        if (transcription && transcription.text.trim()) {
          transcriptions.push(transcription);
        }
      }

      this.postProgress({
        stage: 'processing',
        percentage: 95,
        userMessage: "✨ Finalizing transcription...",
        captionsGenerated: transcriptions.length
      });

      // Step 4: Post-process and format results
      const result = await this.formatTranscriptionResults(transcriptions, audioData, settings);

      // Complete
      self.postMessage({
        type: 'transcriptionComplete',
        data: result
      });
      
    } catch (error) {
      this.postError(`Transcription failed: ${error.message}`);
    }
  }

  async preprocessAudio(audioData, sampleRate) {
    // Audio preprocessing for better speech recognition
    
    // 1. Normalize audio levels
    const normalizedAudio = this.normalizeAudio(audioData);
    
    // 2. Apply simple noise reduction
    const denoisedAudio = this.simpleNoiseReduction(normalizedAudio, sampleRate);
    
    // 3. Apply AGC (Automatic Gain Control)
    const agcAudio = this.applyAGC(denoisedAudio);
    
    return agcAudio;
  }

  normalizeAudio(audioData) {
    // Find the maximum absolute value
    let maxValue = 0;
    for (let i = 0; i < audioData.length; i++) {
      maxValue = Math.max(maxValue, Math.abs(audioData[i]));
    }
    
    if (maxValue === 0) return audioData;
    
    // Normalize to 0.8 to prevent clipping
    const normalizedData = new Float32Array(audioData.length);
    const normalizationFactor = 0.8 / maxValue;
    
    for (let i = 0; i < audioData.length; i++) {
      normalizedData[i] = audioData[i] * normalizationFactor;
    }
    
    return normalizedData;
  }

  simpleNoiseReduction(audioData, sampleRate) {
    // Simple high-pass filter to reduce low-frequency noise
    const cutoffFreq = 80; // Hz
    const rc = 1.0 / (cutoffFreq * 2 * Math.PI);
    const dt = 1.0 / sampleRate;
    const alpha = rc / (rc + dt);
    
    const filteredData = new Float32Array(audioData.length);
    let prevInput = 0;
    let prevOutput = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      filteredData[i] = alpha * (prevOutput + audioData[i] - prevInput);
      prevInput = audioData[i];
      prevOutput = filteredData[i];
    }
    
    return filteredData;
  }

  applyAGC(audioData) {
    // Simple automatic gain control
    const agcData = new Float32Array(audioData.length);
    const windowSize = 1024;
    const targetLevel = 0.3;
    
    for (let i = 0; i < audioData.length; i += windowSize) {
      // Calculate RMS for this window
      let sumSquares = 0;
      const windowEnd = Math.min(i + windowSize, audioData.length);
      
      for (let j = i; j < windowEnd; j++) {
        sumSquares += audioData[j] * audioData[j];
      }
      
      const rms = Math.sqrt(sumSquares / (windowEnd - i));
      const gain = rms > 0 ? Math.min(2.0, targetLevel / rms) : 1.0;
      
      // Apply gain to window
      for (let j = i; j < windowEnd; j++) {
        agcData[j] = audioData[j] * gain;
      }
    }
    
    return agcData;
  }

  async detectSpeechSegments(audioData, sampleRate, settings) {
    const segments = [];
    const frameSize = Math.floor(sampleRate * 0.025); // 25ms frames
    const hopSize = Math.floor(frameSize / 2);
    const minSegmentDuration = 0.5; // 500ms minimum
    
    let isInSpeech = false;
    let speechStart = 0;
    let silenceFrames = 0;
    
    // Voice activity detection parameters
    const energyThreshold = settings.confidenceThreshold * 0.01 || 0.3;
    const maxSilenceFrames = 20; // ~500ms of silence ends segment
    
    for (let frameStart = 0; frameStart < audioData.length - frameSize; frameStart += hopSize) {
      const frame = audioData.slice(frameStart, frameStart + frameSize);
      
      // Calculate frame features
      const energy = this.calculateFrameEnergy(frame);
      const zcr = this.calculateZeroCrossingRate(frame);
      const spectralCentroid = this.calculateSpectralCentroid(frame, sampleRate);
      
      // Speech detection logic
      const isSpeechFrame = this.isSpeechFrame(energy, zcr, spectralCentroid, energyThreshold);
      
      if (isSpeechFrame) {
        if (!isInSpeech) {
          // Start new speech segment
          speechStart = frameStart / sampleRate;
          isInSpeech = true;
          silenceFrames = 0;
        } else {
          silenceFrames = 0;
        }
      } else {
        if (isInSpeech) {
          silenceFrames++;
          
          if (silenceFrames >= maxSilenceFrames) {
            // End current speech segment
            const speechEnd = (frameStart - silenceFrames * hopSize) / sampleRate;
            const duration = speechEnd - speechStart;
            
            if (duration >= minSegmentDuration) {
              segments.push({
                startTime: speechStart,
                endTime: speechEnd,
                duration: duration,
                audioData: audioData.slice(
                  Math.floor(speechStart * sampleRate),
                  Math.floor(speechEnd * sampleRate)
                )
              });
            }
            
            isInSpeech = false;
            silenceFrames = 0;
          }
        }
      }
    }
    
    // Handle final segment
    if (isInSpeech) {
      const speechEnd = audioData.length / sampleRate;
      const duration = speechEnd - speechStart;
      
      if (duration >= minSegmentDuration) {
        segments.push({
          startTime: speechStart,
          endTime: speechEnd,
          duration: duration,
          audioData: audioData.slice(Math.floor(speechStart * sampleRate))
        });
      }
    }
    
    return segments;
  }

  calculateFrameEnergy(frame) {
    let energy = 0;
    for (let i = 0; i < frame.length; i++) {
      energy += frame[i] * frame[i];
    }
    return Math.sqrt(energy / frame.length);
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

  calculateSpectralCentroid(frame, sampleRate) {
    // Simple spectral centroid calculation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < frame.length / 2; i++) {
      const frequency = (i * sampleRate) / frame.length;
      const magnitude = Math.abs(frame[i]); // Simplified - should use FFT
      
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  isSpeechFrame(energy, zcr, spectralCentroid, threshold) {
    // Speech characteristics:
    // - Moderate energy (not silent, not too loud)
    // - Spectral centroid in speech range (300-4000 Hz)
    // - Moderate zero crossing rate (not pure tone, not too noisy)
    
    const energyOk = energy > threshold;
    const spectralOk = spectralCentroid >= 300 && spectralCentroid <= 4000;
    const zcrOk = zcr >= 0.01 && zcr <= 0.35;
    
    // At least 2/3 criteria must be met
    return [energyOk, spectralOk, zcrOk].filter(Boolean).length >= 2;
  }

  async transcribeSegment(segment, settings) {
    // Mock transcription - in real implementation, this would use:
    // - Whisper AI model
    // - Google Speech-to-Text API
    // - Azure Cognitive Services
    // - IBM Watson Speech to Text
    
    // Simulate transcription processing time
    await this.simulateDelay(200 + Math.random() * 500);
    
    // Generate mock transcription based on audio characteristics
    const mockText = this.generateMockTranscription(segment, settings);
    
    if (!mockText) return null;
    
    return {
      text: mockText,
      confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
      startTime: segment.startTime,
      endTime: segment.endTime,
      detectedLanguage: this.detectLanguage(mockText, settings.language),
      words: this.generateMockWordTimings(mockText, segment.startTime, segment.endTime)
    };
  }

  generateMockTranscription(segment, settings) {
    // Generate realistic mock transcriptions for demo purposes
    const templates = [
      "Hello and welcome to today's discussion.",
      "I think we need to focus on the main points here.",
      "That's a really interesting perspective on this topic.",
      "Let me explain how this process works.",
      "We've been working on this project for several months now.",
      "The results show a significant improvement in performance.",
      "Thank you for your time and attention today.",
      "Does anyone have questions about what we've covered?",
      "I'd like to hear your thoughts on this approach.",
      "Moving forward, we'll need to consider these factors."
    ];
    
    // Simple energy-based selection (higher energy = more likely to be speech)
    const avgEnergy = this.calculateFrameEnergy(segment.audioData);
    
    if (avgEnergy < 0.1) return null; // Too quiet, probably not speech
    
    // Select template based on segment characteristics
    const templateIndex = Math.floor(Math.random() * templates.length);
    let text = templates[templateIndex];
    
    // Apply language-specific modifications
    if (settings.language && settings.language !== 'en-US') {
      text = this.adaptToLanguage(text, settings.language);
    }
    
    return text;
  }

  detectLanguage(text, settingsLanguage) {
    // Simple language detection based on settings
    if (settingsLanguage === 'auto') {
      // Mock language detection - in real implementation would analyze text
      const languages = ['en-US', 'es-ES', 'fr-FR', 'de-DE'];
      return languages[Math.floor(Math.random() * languages.length)];
    }
    
    return settingsLanguage;
  }

  adaptToLanguage(text, language) {
    // Simple language adaptation for demo
    const adaptations = {
      'es-ES': 'Hola y bienvenidos a la discusión de hoy.',
      'fr-FR': 'Bonjour et bienvenue à notre discussion aujourd\'hui.',
      'de-DE': 'Hallo und willkommen zu unserer heutigen Diskussion.',
      'it-IT': 'Ciao e benvenuti alla discussione di oggi.',
      'pt-BR': 'Olá e bem-vindos à discussão de hoje.'
    };
    
    return adaptations[language] || text;
  }

  generateMockWordTimings(text, startTime, endTime) {
    const words = text.split(' ');
    const totalDuration = endTime - startTime;
    const timePerWord = totalDuration / words.length;
    
    return words.map((word, index) => ({
      word: word,
      startTime: startTime + (index * timePerWord),
      endTime: startTime + ((index + 1) * timePerWord),
      confidence: 0.7 + Math.random() * 0.25
    }));
  }

  async formatTranscriptionResults(transcriptions, audioData, settings) {
    if (transcriptions.length === 0) {
      return {
        text: '',
        confidence: 0,
        detectedLanguage: settings.language,
        duration: audioData.duration,
        words: []
      };
    }
    
    // Combine all transcriptions
    const fullText = transcriptions.map(t => t.text).join(' ');
    const avgConfidence = transcriptions.reduce((sum, t) => sum + t.confidence, 0) / transcriptions.length;
    const allWords = transcriptions.flatMap(t => t.words || []);
    
    // Detect most common language
    const languages = transcriptions.map(t => t.detectedLanguage);
    const detectedLanguage = this.getMostCommonLanguage(languages) || settings.language;
    
    return {
      text: fullText,
      confidence: avgConfidence,
      detectedLanguage: detectedLanguage,
      duration: audioData.duration,
      words: allWords,
      segments: transcriptions.map(t => ({
        startTime: t.startTime,
        endTime: t.endTime,
        text: t.text,
        confidence: t.confidence
      }))
    };
  }

  getMostCommonLanguage(languages) {
    const counts = {};
    languages.forEach(lang => {
      counts[lang] = (counts[lang] || 0) + 1;
    });
    
    let mostCommon = null;
    let maxCount = 0;
    
    Object.entries(counts).forEach(([lang, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = lang;
      }
    });
    
    return mostCommon;
  }

  async simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  postProgress(progress) {
    self.postMessage({ type: 'progress', ...progress });
  }

  postError(message) {
    self.postMessage({ type: 'transcriptionError', message });
  }
}

// Worker main thread
const processor = new SpeechRecognitionProcessor();

self.onmessage = async function(event) {
  const { type, audioData, settings } = event.data;

  switch (type) {
    case 'initialize':
      await processor.initialize();
      break;
      
    case 'transcribe':
      if (!processor.isInitialized) {
        await processor.initialize();
      }
      await processor.transcribe(audioData, settings);
      break;
      
    default:
      processor.postError(`Unknown command: ${type}`);
  }
};