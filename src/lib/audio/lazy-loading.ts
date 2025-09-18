"use client";

// Lazy loading utilities for heavy audio processing modules

export const loadSpatialAudioProcessor = async () => {
  const { SpatialAudioProcessor } = await import('./spatial-audio-processor');
  return SpatialAudioProcessor;
};

export const loadAdvancedDSP = async () => {
  const dspModule = await import('./advanced-dsp');
  return dspModule;
};

export const loadAudioAnalysisSuite = async () => {
  const analysisModule = await import('./audio-analysis-suite');
  return analysisModule;
};

export const loadMLModelService = async () => {
  const { MLModelService } = await import('./ml-model-service');
  return MLModelService;
};

export const loadProfessionalEffects = async () => {
  const effectsModule = await import('./professional-effects');
  return effectsModule;
};

// Audio engine lazy loaders
export const loadSourceSeparationEngine = async () => {
  const { AISourceSeparationEngine } = await import('./engines/source-separation');
  return AISourceSeparationEngine;
};

export const loadSpeechRecognitionEngine = async () => {
  const { SpeechRecognitionEngine } = await import('./engines/speech-recognition');
  return SpeechRecognitionEngine;
};

export const loadVoiceDetectionEngine = async () => {
  const { VoiceDetectionEngine } = await import('./engines/voice-detection');
  return VoiceDetectionEngine;
};

export const loadAudioSearchEngine = async () => {
  const { AudioSearchEngine } = await import('./engines/audio-search');
  return AudioSearchEngine;
};

// Preloading utilities
export const preloadCriticalAudioModules = async () => {
  // Load only the most critical modules for immediate use
  return Promise.all([
    import('./audio-processor'),
    import('./audio-visualizer'),
    import('./index')
  ]);
};

export const preloadAdvancedAudioModules = async () => {
  // Load advanced processing modules when needed
  return Promise.all([
    loadSpatialAudioProcessor(),
    loadAdvancedDSP(),
    loadAudioAnalysisSuite()
  ]);
};

export const preloadAudioEngines = async () => {
  // Load all audio processing engines
  return Promise.all([
    loadSourceSeparationEngine(),
    loadSpeechRecognitionEngine(),
    loadVoiceDetectionEngine(),
    loadAudioSearchEngine()
  ]);
};

// Dynamic audio processing loader with fallbacks
export class LazyAudioProcessor {
  private static instance: LazyAudioProcessor;
  private loadedModules: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  public static getInstance(): LazyAudioProcessor {
    if (!LazyAudioProcessor.instance) {
      LazyAudioProcessor.instance = new LazyAudioProcessor();
    }
    return LazyAudioProcessor.instance;
  }

  async loadModule(moduleName: string): Promise<any> {
    // Return cached module if already loaded
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }

    // Return existing promise if currently loading
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    // Create loading promise
    const loadingPromise = this.loadModuleInternal(moduleName);
    this.loadingPromises.set(moduleName, loadingPromise);

    try {
      const loadedModule = await loadingPromise;
      this.loadedModules.set(moduleName, loadedModule);
      this.loadingPromises.delete(moduleName);
      return loadedModule;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      console.error(`Failed to load audio module: ${moduleName}`, error);
      throw error;
    }
  }

  private async loadModuleInternal(moduleName: string): Promise<any> {
    switch (moduleName) {
      case 'spatial-audio':
        return loadSpatialAudioProcessor();
      case 'advanced-dsp':
        return loadAdvancedDSP();
      case 'audio-analysis':
        return loadAudioAnalysisSuite();
      case 'ml-models':
        return loadMLModelService();
      case 'professional-effects':
        return loadProfessionalEffects();
      case 'source-separation':
        return loadSourceSeparationEngine();
      case 'speech-recognition':
        return loadSpeechRecognitionEngine();
      case 'voice-detection':
        return loadVoiceDetectionEngine();
      case 'audio-search':
        return loadAudioSearchEngine();
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
  }

  // Preload modules based on user interaction
  async preloadOnUserAction(action: 'upload' | 'edit' | 'analyze' | 'separate'): Promise<void> {
    const moduleGroups = {
      upload: ['audio-analysis'],
      edit: ['professional-effects', 'advanced-dsp'],
      analyze: ['audio-analysis', 'ml-models'],
      separate: ['source-separation', 'voice-detection']
    };

    const modules = moduleGroups[action] || [];
    await Promise.all(modules.map(module => this.loadModule(module)));
  }

  // Get loading status
  getLoadingStatus(): { [key: string]: 'loaded' | 'loading' | 'not-loaded' } {
    const status: { [key: string]: 'loaded' | 'loading' | 'not-loaded' } = {};

    const allModules = [
      'spatial-audio', 'advanced-dsp', 'audio-analysis', 'ml-models',
      'professional-effects', 'source-separation', 'speech-recognition',
      'voice-detection', 'audio-search'
    ];

    allModules.forEach(module => {
      if (this.loadedModules.has(module)) {
        status[module] = 'loaded';
      } else if (this.loadingPromises.has(module)) {
        status[module] = 'loading';
      } else {
        status[module] = 'not-loaded';
      }
    });

    return status;
  }
}

// Hook for using lazy audio processor
export const useLazyAudioProcessor = () => {
  return LazyAudioProcessor.getInstance();
};