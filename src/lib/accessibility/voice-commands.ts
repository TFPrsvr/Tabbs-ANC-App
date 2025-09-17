/**
 * Voice Commands System
 * Hands-free audio editing with natural language processing
 */

export interface VoiceCommand {
  id: string;
  phrase: string;
  pattern: RegExp;
  action: string;
  parameters?: Record<string, any>;
  confidence: number;
  contextRequired?: string[];
  description: string;
  examples: string[];
}

export interface VoiceCommandResult {
  recognized: boolean;
  command?: VoiceCommand;
  parameters: Record<string, any>;
  confidence: number;
  transcript: string;
  alternatives?: string[];
}

export interface VoiceCommandContext {
  currentTrack?: string;
  selectedRegion?: { start: number; end: number };
  playbackState: 'playing' | 'paused' | 'stopped';
  currentTime: number;
  duration: number;
  tracks: { id: string; name: string; type: string }[];
  activeTool?: string;
}

export class VoiceCommandProcessor {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private commands: VoiceCommand[] = [];
  private context: VoiceCommandContext = {
    playbackState: 'stopped',
    currentTime: 0,
    duration: 0,
    tracks: []
  };
  private onCommandCallback?: (result: VoiceCommandResult) => void;
  private wakeWord = 'hey audio';
  private isWakeWordMode = true;

  constructor() {
    this.initializeSpeechRecognition();
    this.setupDefaultCommands();
  }

  /**
   * Initialize speech recognition
   */
  private initializeSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition ||
                               (window as any).webkitSpeechRecognition;

      this.recognition = new SpeechRecognition();
      if (this.recognition) {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 5;

        this.recognition.onstart = () => {
          console.log('🎤 Voice recognition started');
          this.isListening = true;
        };

        this.recognition.onend = () => {
          console.log('🎤 Voice recognition ended');
          this.isListening = false;

          // Auto-restart if in continuous mode
          if (this.isWakeWordMode) {
            setTimeout(() => this.startListening(), 1000);
          }
        };

        this.recognition.onresult = (event) => {
          this.handleSpeechResult(event);
        };

        this.recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);

          // Restart on error
          if (event.error === 'network' || event.error === 'aborted') {
            setTimeout(() => this.startListening(), 2000);
          }
        };
      }
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }

  /**
   * Setup default voice commands
   */
  private setupDefaultCommands(): void {
    this.commands = [
      // Playback controls
      {
        id: 'play',
        phrase: 'play',
        pattern: /^(play|start|resume)$/i,
        action: 'playback.play',
        confidence: 0.9,
        description: 'Start or resume playback',
        examples: ['play', 'start', 'resume']
      },
      {
        id: 'pause',
        phrase: 'pause',
        pattern: /^(pause|stop|halt)$/i,
        action: 'playback.pause',
        confidence: 0.9,
        description: 'Pause playback',
        examples: ['pause', 'stop', 'halt']
      },
      {
        id: 'seek_to_time',
        phrase: 'go to {time}',
        pattern: /^(?:go to|jump to|seek to|move to)\s+(\d+(?::\d+)?(?:\.\d+)?|\d+\s*(?:minute|min|second|sec)s?|\d+\s*hours?)/i,
        action: 'playback.seek',
        confidence: 0.8,
        description: 'Seek to specific time',
        examples: ['go to 2:30', 'jump to 45 seconds', 'seek to 1 minute']
      },

      // Editing commands
      {
        id: 'cut_region',
        phrase: 'cut from {start} to {end}',
        pattern: /^cut\s+from\s+(\d+(?::\d+)?(?:\.\d+)?)\s+to\s+(\d+(?::\d+)?(?:\.\d+)?)$/i,
        action: 'edit.cut',
        confidence: 0.85,
        description: 'Cut audio between specified times',
        examples: ['cut from 1:30 to 2:45', 'cut from 30 seconds to 1 minute']
      },
      {
        id: 'copy_selection',
        phrase: 'copy selection',
        pattern: /^copy\s+(?:selection|this|current)?$/i,
        action: 'edit.copy',
        confidence: 0.9,
        contextRequired: ['selectedRegion'],
        description: 'Copy currently selected audio',
        examples: ['copy', 'copy selection', 'copy this']
      },
      {
        id: 'paste_at_time',
        phrase: 'paste at {time}',
        pattern: /^paste\s+(?:at\s+)?(\d+(?::\d+)?(?:\.\d+)?)$/i,
        action: 'edit.paste',
        confidence: 0.8,
        description: 'Paste clipboard at specific time',
        examples: ['paste at 2:00', 'paste at 30 seconds']
      },
      {
        id: 'delete_selection',
        phrase: 'delete selection',
        pattern: /^(?:delete|remove)\s+(?:selection|this|current)?$/i,
        action: 'edit.delete',
        confidence: 0.9,
        contextRequired: ['selectedRegion'],
        description: 'Delete currently selected audio',
        examples: ['delete selection', 'remove this', 'delete current']
      },

      // Track operations
      {
        id: 'select_track',
        phrase: 'select track {name}',
        pattern: /^select\s+track\s+(.+)$/i,
        action: 'track.select',
        confidence: 0.8,
        description: 'Select track by name',
        examples: ['select track vocals', 'select track drums']
      },
      {
        id: 'mute_track',
        phrase: 'mute track {name}',
        pattern: /^mute\s+(?:track\s+)?(.+)$/i,
        action: 'track.mute',
        confidence: 0.85,
        description: 'Mute specific track',
        examples: ['mute track vocals', 'mute drums']
      },
      {
        id: 'solo_track',
        phrase: 'solo track {name}',
        pattern: /^solo\s+(?:track\s+)?(.+)$/i,
        action: 'track.solo',
        confidence: 0.85,
        description: 'Solo specific track',
        examples: ['solo track vocals', 'solo drums']
      },
      {
        id: 'adjust_volume',
        phrase: 'set volume to {level}',
        pattern: /^(?:set|adjust|change)\s+volume\s+(?:to\s+)?(\d+)(?:\s*percent)?$/i,
        action: 'track.volume',
        confidence: 0.8,
        description: 'Adjust track volume',
        examples: ['set volume to 50', 'adjust volume to 80 percent']
      },

      // Audio processing
      {
        id: 'separate_audio',
        phrase: 'separate audio',
        pattern: /^(?:separate|split|isolate)\s+(?:audio|sounds?|voices?|instruments?)$/i,
        action: 'process.separate',
        confidence: 0.85,
        description: 'Separate audio into stems',
        examples: ['separate audio', 'split voices', 'isolate instruments']
      },
      {
        id: 'remove_noise',
        phrase: 'remove noise',
        pattern: /^(?:remove|reduce|clean)\s+(?:noise|background|static)$/i,
        action: 'process.denoise',
        confidence: 0.9,
        description: 'Apply noise reduction',
        examples: ['remove noise', 'clean background', 'reduce static']
      },
      {
        id: 'enhance_vocals',
        phrase: 'enhance vocals',
        pattern: /^(?:enhance|improve|boost)\s+(?:vocals?|voice|speech)$/i,
        action: 'process.enhance_vocals',
        confidence: 0.85,
        description: 'Enhance vocal clarity',
        examples: ['enhance vocals', 'improve voice', 'boost speech']
      },

      // Export and save
      {
        id: 'save_project',
        phrase: 'save project',
        pattern: /^save\s+(?:project|file|this)?$/i,
        action: 'file.save',
        confidence: 0.9,
        description: 'Save current project',
        examples: ['save', 'save project', 'save file']
      },
      {
        id: 'export_audio',
        phrase: 'export as {format}',
        pattern: /^export\s+(?:as\s+)?(\w+)$/i,
        action: 'file.export',
        confidence: 0.8,
        description: 'Export in specific format',
        examples: ['export as MP3', 'export as WAV', 'export as FLAC']
      },

      // Navigation and UI
      {
        id: 'zoom_in',
        phrase: 'zoom in',
        pattern: /^zoom\s+in$/i,
        action: 'ui.zoom_in',
        confidence: 0.9,
        description: 'Zoom in on timeline',
        examples: ['zoom in']
      },
      {
        id: 'zoom_out',
        phrase: 'zoom out',
        pattern: /^zoom\s+out$/i,
        action: 'ui.zoom_out',
        confidence: 0.9,
        description: 'Zoom out on timeline',
        examples: ['zoom out']
      },
      {
        id: 'fit_to_window',
        phrase: 'fit to window',
        pattern: /^fit\s+(?:to\s+)?(?:window|screen)$/i,
        action: 'ui.fit_to_window',
        confidence: 0.9,
        description: 'Fit entire track to window',
        examples: ['fit to window', 'fit to screen']
      },

      // Help and information
      {
        id: 'show_help',
        phrase: 'help',
        pattern: /^(?:help|what can I say|commands)$/i,
        action: 'system.help',
        confidence: 0.95,
        description: 'Show available voice commands',
        examples: ['help', 'what can I say', 'commands']
      },
      {
        id: 'current_status',
        phrase: 'status',
        pattern: /^(?:status|current time|where am I)$/i,
        action: 'system.status',
        confidence: 0.9,
        description: 'Get current playback status',
        examples: ['status', 'current time', 'where am I']
      }
    ];
  }

  /**
   * Start listening for voice commands
   */
  startListening(): void {
    if (!this.recognition || this.isListening) return;

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    if (!this.recognition || !this.isListening) return;

    this.recognition.stop();
    this.isListening = false;
  }

  /**
   * Toggle wake word mode
   */
  toggleWakeWordMode(enabled: boolean): void {
    this.isWakeWordMode = enabled;

    if (enabled) {
      this.startListening();
    } else {
      this.stopListening();
    }
  }

  /**
   * Set wake word
   */
  setWakeWord(wakeWord: string): void {
    this.wakeWord = wakeWord.toLowerCase();
  }

  /**
   * Update command context
   */
  updateContext(context: Partial<VoiceCommandContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Set command callback
   */
  onCommand(callback: (result: VoiceCommandResult) => void): void {
    this.onCommandCallback = callback;
  }

  /**
   * Handle speech recognition results
   */
  private handleSpeechResult(event: SpeechRecognitionEvent): void {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i]?.[0]?.transcript ?? '';

      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Process final transcript
    if (finalTranscript) {
      this.processTranscript(finalTranscript.trim());
    }

    // Show interim results for user feedback
    if (interimTranscript && this.onCommandCallback) {
      this.onCommandCallback({
        recognized: false,
        confidence: 0.5,
        transcript: interimTranscript.trim(),
        parameters: {}
      });
    }
  }

  /**
   * Process transcript and execute commands
   */
  private processTranscript(transcript: string): void {
    console.log('🎤 Processing transcript:', transcript);

    // Check for wake word first
    if (this.isWakeWordMode) {
      const lowerTranscript = transcript.toLowerCase();
      if (!lowerTranscript.includes(this.wakeWord)) {
        return; // Ignore if wake word not detected
      }

      // Remove wake word from transcript
      const wakeWordIndex = lowerTranscript.indexOf(this.wakeWord);
      transcript = transcript.substring(wakeWordIndex + this.wakeWord.length).trim();

      if (!transcript) return; // No command after wake word
    }

    // Find matching command
    const result = this.matchCommand(transcript);

    if (result.recognized && this.onCommandCallback) {
      console.log('🎯 Command recognized:', result.command?.phrase, result.parameters);
      this.onCommandCallback(result);
    } else {
      console.log('❓ Command not recognized:', transcript);

      // Provide helpful feedback
      if (this.onCommandCallback) {
        this.onCommandCallback({
          recognized: false,
          confidence: 0,
          transcript,
          parameters: {},
          alternatives: this.getSuggestions(transcript)
        });
      }
    }
  }

  /**
   * Match transcript to command
   */
  private matchCommand(transcript: string): VoiceCommandResult {
    let bestMatch: VoiceCommand | null = null;
    let bestConfidence = 0;
    let parameters: Record<string, any> = {};

    for (const command of this.commands) {
      const match = transcript.match(command.pattern);

      if (match) {
        // Check context requirements
        if (command.contextRequired) {
          const hasRequiredContext = command.contextRequired.every(req => {
            switch (req) {
              case 'selectedRegion':
                return this.context.selectedRegion !== undefined;
              case 'currentTrack':
                return this.context.currentTrack !== undefined;
              default:
                return true;
            }
          });

          if (!hasRequiredContext) continue;
        }

        // Extract parameters from regex groups
        const extractedParams = this.extractParameters(command, match);

        // Calculate confidence based on pattern match and context
        let confidence = command.confidence;

        // Boost confidence for exact matches
        if (transcript.toLowerCase() === command.phrase.toLowerCase()) {
          confidence += 0.1;
        }

        // Consider similarity to examples
        const similarityBoost = this.calculateSimilarity(transcript, command.examples);
        confidence += similarityBoost * 0.05;

        if (confidence > bestConfidence) {
          bestMatch = command;
          bestConfidence = confidence;
          parameters = extractedParams;
        }
      }
    }

    if (bestMatch && bestConfidence > 0.7) {
      return {
        recognized: true,
        command: bestMatch,
        parameters,
        confidence: bestConfidence,
        transcript
      };
    }

    return {
      recognized: false,
      confidence: bestConfidence,
      transcript,
      parameters: {}
    };
  }

  /**
   * Extract parameters from regex match
   */
  private extractParameters(command: VoiceCommand, match: RegExpMatchArray): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Extract time values
    if (match[1]) {
      const timeValue = this.parseTimeValue(match[1]);
      if (timeValue !== null) {
        if (command.action.includes('seek') || command.phrase.includes('{time}')) {
          parameters.time = timeValue;
        } else if (command.phrase.includes('{start}')) {
          parameters.start = timeValue;
        }
      } else {
        // Non-time parameter (track name, format, etc.)
        parameters.value = match[1].trim();
      }
    }

    // Extract end time for range commands
    if (match[2]) {
      const timeValue = this.parseTimeValue(match[2]);
      if (timeValue !== null) {
        parameters.end = timeValue;
      }
    }

    // Extract track names
    if (command.phrase.includes('{name}') && match[1]) {
      parameters.trackName = this.findTrackByName(match[1].trim());
    }

    // Extract format names
    if (command.phrase.includes('{format}') && match[1]) {
      parameters.format = match[1].toLowerCase();
    }

    // Extract numeric levels
    if (command.phrase.includes('{level}') && match[1]) {
      parameters.level = parseInt(match[1], 10);
    }

    return parameters;
  }

  /**
   * Parse time values from speech (e.g., "2:30", "45 seconds", "1 minute")
   */
  private parseTimeValue(timeStr: string): number | null {
    const cleaned = timeStr.toLowerCase().trim();

    // Format: MM:SS or HH:MM:SS
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':').map(p => parseInt(p, 10));
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
      }
    }

    // Format: "X seconds", "X minutes", "X hours"
    const numberMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(second|sec|minute|min|hour)s?/);
    if (numberMatch) {
      const value = parseFloat(numberMatch[1]);
      const unit = numberMatch[2];

      switch (unit) {
        case 'second':
        case 'sec':
          return value;
        case 'minute':
        case 'min':
          return value * 60;
        case 'hour':
          return value * 3600;
      }
    }

    // Plain number (assume seconds)
    const numberValue = parseFloat(cleaned);
    if (!isNaN(numberValue)) {
      return numberValue;
    }

    return null;
  }

  /**
   * Find track by name (fuzzy matching)
   */
  private findTrackByName(name: string): string | null {
    const lowerName = name.toLowerCase();

    // Exact match first
    for (const track of this.context.tracks) {
      if (track.name.toLowerCase() === lowerName) {
        return track.id;
      }
    }

    // Partial match
    for (const track of this.context.tracks) {
      if (track.name.toLowerCase().includes(lowerName) ||
          lowerName.includes(track.name.toLowerCase())) {
        return track.id;
      }
    }

    // Type-based matching (vocals, drums, bass, etc.)
    for (const track of this.context.tracks) {
      if (track.type.toLowerCase() === lowerName ||
          track.name.toLowerCase().includes(lowerName)) {
        return track.id;
      }
    }

    return null;
  }

  /**
   * Calculate similarity between transcript and examples
   */
  private calculateSimilarity(transcript: string, examples: string[]): number {
    const lowerTranscript = transcript.toLowerCase();
    let maxSimilarity = 0;

    for (const example of examples) {
      const lowerExample = example.toLowerCase();
      const similarity = this.levenshteinSimilarity(lowerTranscript, lowerExample);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  /**
   * Calculate Levenshtein similarity (0-1)
   */
  private levenshteinSimilarity(a: string, b: string): number {
    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Get command suggestions based on partial transcript
   */
  private getSuggestions(transcript: string): string[] {
    const suggestions: Array<{ command: VoiceCommand; similarity: number }> = [];

    for (const command of this.commands) {
      const similarity = this.calculateSimilarity(transcript, command.examples);
      if (similarity > 0.3) {
        suggestions.push({ command, similarity });
      }
    }

    // Sort by similarity and return top 3
    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(s => s.command.examples[0]);
  }

  /**
   * Get all available commands
   */
  getAvailableCommands(): VoiceCommand[] {
    return [...this.commands];
  }

  /**
   * Add custom command
   */
  addCommand(command: VoiceCommand): void {
    this.commands.push(command);
  }

  /**
   * Remove command
   */
  removeCommand(commandId: string): void {
    this.commands = this.commands.filter(cmd => cmd.id !== commandId);
  }

  /**
   * Check if voice recognition is supported
   */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Get current listening state
   */
  getListeningState(): boolean {
    return this.isListening;
  }
}