"use client";

/**
 * Audio Voice Search Engine
 * User-friendly labels: "Find Voices", "Search through audio to find specific speakers or words"
 */

export interface SearchQuery {
  // What the user wants to search for
  type: 'voice' | 'speaker' | 'word' | 'phrase' | 'all';
  query: string; // Search term or speaker name
  caseSensitive?: boolean; // For text searches
  exactMatch?: boolean; // Exact word match vs partial
}

export interface SearchFilters {
  // User-friendly filter options
  timeRange?: {
    startTime: number; // seconds
    endTime: number; // seconds
  };
  speakerFilter?: string[]; // Only search specific speakers
  confidenceThreshold: number; // 0-100 - "Only show results we're confident about"
  maxResults?: number; // Limit number of results
  sortBy: 'relevance' | 'time' | 'confidence'; // "Sort by..."
}

export interface SearchResult {
  id: string;
  type: 'voice_match' | 'speaker_match' | 'text_match' | 'phrase_match';
  startTime: number; // seconds
  endTime: number; // seconds
  confidence: number; // 0-1
  matchText?: string; // What text was found
  speakerName?: string; // Which speaker
  context: string; // Surrounding text for context
  audioSegment?: AudioBuffer; // Audio clip of the match
  highlightRanges?: Array<{ start: number; end: number }>; // Which parts to highlight
}

export interface SearchProgress {
  stage: 'analyzing' | 'indexing' | 'searching' | 'complete';
  percentage: number;
  userMessage: string;
  resultsFound: number;
  currentSection?: string;
}

export interface AudioIndex {
  // Pre-built search index for fast searching
  speakers: Map<string, VoicePrint>;
  transcripts: TranscriptSegment[];
  voiceSegments: VoiceSegment[];
  wordIndex: Map<string, WordOccurrence[]>; // Fast word lookup
  phraseIndex: Map<string, PhraseOccurrence[]>; // Common phrases
}

interface VoicePrint {
  speakerName: string;
  characteristics: {
    pitch: number;
    pitchRange: number;
    formants: number[];
    energy: number;
  };
  segments: Array<{ startTime: number; endTime: number; confidence: number }>;
  voiceprint: Float32Array; // Audio fingerprint
}

interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speakerName?: string;
  words: WordTiming[];
  confidence: number;
}

interface VoiceSegment {
  id: string;
  startTime: number;
  endTime: number;
  speakerName: string;
  audioFeatures: Float32Array;
  confidence: number;
}

interface WordOccurrence {
  word: string;
  startTime: number;
  endTime: number;
  speakerName?: string;
  segmentId: string;
  confidence: number;
}

interface PhraseOccurrence {
  phrase: string;
  startTime: number;
  endTime: number;
  speakerName?: string;
  segmentId: string;
  confidence: number;
  wordCount: number;
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export class AudioSearchEngine {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private worker: Worker | null = null;
  private onProgress?: (progress: SearchProgress) => void;
  
  // Search index for fast lookups
  private audioIndex: AudioIndex | null = null;
  
  constructor(onProgressCallback?: (progress: SearchProgress) => void) {
    this.onProgress = onProgressCallback;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Initialize search worker
      this.worker = new Worker('/workers/audio-search-worker.js');
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      this.isInitialized = true;
      
      this.reportProgress({
        stage: 'analyzing',
        percentage: 100,
        userMessage: "🔍 Audio search engine ready!",
        resultsFound: 0
      });
      
    } catch (error) {
      console.error('Failed to initialize audio search:', error);
      throw new Error('Could not start audio search. Please check your device capabilities.');
    }
  }

  async buildSearchIndex(
    audioBuffer: AudioBuffer,
    voiceProfiles: any[],
    captions: any[]
  ): Promise<AudioIndex> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.reportProgress({
        stage: 'indexing',
        percentage: 10,
        userMessage: "📚 Building search index...",
        resultsFound: 0
      });

      if (!this.worker) {
        reject(new Error('Search worker not available'));
        return;
      }

      this.worker.postMessage({
        type: 'buildIndex',
        audioBuffer: this.prepareAudioForWorker(audioBuffer),
        voiceProfiles,
        captions
      });

      (this.worker as any)._indexResolve = resolve;
      (this.worker as any)._indexReject = reject;
    });
  }

  async searchAudio(
    query: SearchQuery,
    filters: SearchFilters
  ): Promise<SearchResult[]> {
    if (!this.audioIndex) {
      throw new Error('Search index not built. Please process the audio first.');
    }

    return new Promise((resolve, reject) => {
      this.reportProgress({
        stage: 'searching',
        percentage: 0,
        userMessage: this.getSearchMessage(query),
        resultsFound: 0
      });

      if (!this.worker) {
        reject(new Error('Search worker not available'));
        return;
      }

      this.worker.postMessage({
        type: 'search',
        query,
        filters,
        index: this.serializeIndex(this.audioIndex)
      });

      (this.worker as any)._searchResolve = resolve;
      (this.worker as any)._searchReject = reject;
    });
  }

  // Quick search methods for common use cases
  async findSpeaker(speakerName: string, filters?: Partial<SearchFilters>): Promise<SearchResult[]> {
    return this.searchAudio(
      { type: 'speaker', query: speakerName },
      { maxResults: 50, sortBy: 'time', confidenceThreshold: 70, ...filters }
    );
  }

  async findWord(word: string, filters?: Partial<SearchFilters>): Promise<SearchResult[]> {
    return this.searchAudio(
      { type: 'word', query: word, caseSensitive: false },
      { maxResults: 100, sortBy: 'relevance', confidenceThreshold: 75, ...filters }
    );
  }

  async findPhrase(phrase: string, filters?: Partial<SearchFilters>): Promise<SearchResult[]> {
    return this.searchAudio(
      { type: 'phrase', query: phrase, caseSensitive: false },
      { maxResults: 50, sortBy: 'relevance', confidenceThreshold: 80, ...filters }
    );
  }

  async findSimilarVoice(referenceAudio: AudioBuffer, filters?: Partial<SearchFilters>): Promise<SearchResult[]> {
    // Find voices similar to a reference audio clip
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Search worker not available'));
        return;
      }

      this.reportProgress({
        stage: 'searching',
        percentage: 0,
        userMessage: "🎤 Finding similar voices...",
        resultsFound: 0
      });

      this.worker.postMessage({
        type: 'findSimilarVoice',
        referenceAudio: this.prepareAudioForWorker(referenceAudio),
        filters: { maxResults: 20, sortBy: 'relevance', confidenceThreshold: 60, ...filters }
      });

      (this.worker as any)._voiceSearchResolve = resolve;
      (this.worker as any)._voiceSearchReject = reject;
    });
  }

  // Advanced search with multiple criteria
  async advancedSearch(queries: SearchQuery[], filters: SearchFilters): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    
    for (const query of queries) {
      this.reportProgress({
        stage: 'searching',
        percentage: (queries.indexOf(query) / queries.length) * 100,
        userMessage: this.getSearchMessage(query),
        resultsFound: allResults.length
      });

      const results = await this.searchAudio(query, filters);
      allResults.push(...results);
    }

    // Remove duplicates and sort
    const uniqueResults = this.deduplicateResults(allResults);
    return this.sortResults(uniqueResults, filters.sortBy);
  }

  // Search suggestions as user types
  async getSearchSuggestions(partialQuery: string): Promise<string[]> {
    if (!this.audioIndex || partialQuery.length < 2) return [];

    const suggestions: string[] = [];
    const lowerQuery = partialQuery.toLowerCase();

    // Speaker name suggestions
    this.audioIndex.speakers.forEach((voicePrint, speakerName) => {
      if (speakerName.toLowerCase().includes(lowerQuery)) {
        suggestions.push(`👤 ${speakerName}`);
      }
    });

    // Word suggestions from transcript
    this.audioIndex.wordIndex.forEach((occurrences, word) => {
      if (word.toLowerCase().startsWith(lowerQuery) && occurrences.length > 0) {
        suggestions.push(`💬 "${word}" (${occurrences.length} times)`);
      }
    });

    // Phrase suggestions
    this.audioIndex.phraseIndex.forEach((occurrences, phrase) => {
      if (phrase.toLowerCase().includes(lowerQuery) && occurrences.length > 0) {
        suggestions.push(`📝 "${phrase}"`);
      }
    });

    return suggestions.slice(0, 10); // Limit suggestions
  }

  // Export search results
  exportSearchResults(results: SearchResult[], format: 'csv' | 'json' | 'txt'): string {
    switch (format) {
      case 'csv':
        return this.exportToCSV(results);
      case 'json':
        return this.exportToJSON(results);
      case 'txt':
        return this.exportToTXT(results);
      default:
        return this.exportToTXT(results);
    }
  }

  private getSearchMessage(query: SearchQuery): string {
    switch (query.type) {
      case 'speaker':
        return `👤 Looking for ${query.query}...`;
      case 'voice':
        return `🎤 Finding voice patterns...`;
      case 'word':
        return `💬 Searching for "${query.query}"...`;
      case 'phrase':
        return `📝 Looking for phrase "${query.query}"...`;
      default:
        return `🔍 Searching audio...`;
    }
  }

  private prepareAudioForWorker(audioBuffer: AudioBuffer) {
    // Convert AudioBuffer to transferable format
    const channels = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i).slice());
    }
    
    return {
      channels,
      sampleRate: audioBuffer.sampleRate,
      length: audioBuffer.length,
      duration: audioBuffer.duration
    };
  }

  private serializeIndex(index: AudioIndex): any {
    // Convert index to transferable format for worker
    return {
      speakers: Array.from(index.speakers.entries()),
      transcripts: index.transcripts,
      voiceSegments: index.voiceSegments,
      wordIndex: Array.from(index.wordIndex.entries()),
      phraseIndex: Array.from(index.phraseIndex.entries())
    };
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const unique = new Map<string, SearchResult>();
    
    for (const result of results) {
      const key = `${result.startTime}-${result.endTime}-${result.type}`;
      if (!unique.has(key) || unique.get(key)!.confidence < result.confidence) {
        unique.set(key, result);
      }
    }
    
    return Array.from(unique.values());
  }

  private sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
    switch (sortBy) {
      case 'time':
        return results.sort((a, b) => a.startTime - b.startTime);
      case 'confidence':
        return results.sort((a, b) => b.confidence - a.confidence);
      case 'relevance':
      default:
        return results.sort((a, b) => {
          // Combine confidence and text relevance
          const aScore = a.confidence * (a.matchText?.length || 0);
          const bScore = b.confidence * (b.matchText?.length || 0);
          return bScore - aScore;
        });
    }
  }

  private exportToCSV(results: SearchResult[]): string {
    const headers = ['Time', 'Type', 'Speaker', 'Match Text', 'Context', 'Confidence'];
    let csv = headers.join(',') + '\n';
    
    for (const result of results) {
      const row = [
        this.formatTime(result.startTime),
        result.type.replace('_', ' '),
        result.speakerName || '',
        `"${result.matchText || ''}"`,
        `"${result.context}"`,
        Math.round(result.confidence * 100) + '%'
      ];
      csv += row.join(',') + '\n';
    }
    
    return csv;
  }

  private exportToJSON(results: SearchResult[]): string {
    const exportData = {
      format: 'anc-audio-search-results',
      version: '1.0',
      timestamp: new Date().toISOString(),
      totalResults: results.length,
      results: results.map(result => ({
        id: result.id,
        type: result.type,
        startTime: result.startTime,
        endTime: result.endTime,
        confidence: result.confidence,
        matchText: result.matchText,
        speakerName: result.speakerName,
        context: result.context
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  private exportToTXT(results: SearchResult[]): string {
    let txt = `Audio Search Results\n`;
    txt += `Total Results: ${results.length}\n`;
    txt += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    for (const result of results) {
      txt += `[${this.formatTime(result.startTime)}] `;
      if (result.speakerName) {
        txt += `${result.speakerName}: `;
      }
      txt += `${result.context}\n`;
      if (result.matchText) {
        txt += `  Match: "${result.matchText}" (${Math.round(result.confidence * 100)}% confident)\n`;
      }
      txt += '\n';
    }
    
    return txt;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'indexBuilt':
        this.audioIndex = this.deserializeIndex(data.index);
        if ((this.worker as any)._indexResolve) {
          (this.worker as any)._indexResolve(this.audioIndex);
        }
        break;
      case 'searchComplete':
        if ((this.worker as any)._searchResolve) {
          (this.worker as any)._searchResolve(data.results);
        }
        break;
      case 'voiceSearchComplete':
        if ((this.worker as any)._voiceSearchResolve) {
          (this.worker as any)._voiceSearchResolve(data.results);
        }
        break;
      case 'progress':
        this.reportProgress(data);
        break;
      case 'error':
        this.handleError(data);
        break;
    }
  }

  private deserializeIndex(serializedIndex: any): AudioIndex {
    return {
      speakers: new Map(serializedIndex.speakers),
      transcripts: serializedIndex.transcripts,
      voiceSegments: serializedIndex.voiceSegments,
      wordIndex: new Map(serializedIndex.wordIndex),
      phraseIndex: new Map(serializedIndex.phraseIndex)
    };
  }

  private handleError(data: any) {
    const errorMessage = `Search failed: ${data.message}`;
    
    if ((this.worker as any)._searchReject) {
      (this.worker as any)._searchReject(new Error(errorMessage));
    }
    if ((this.worker as any)._indexReject) {
      (this.worker as any)._indexReject(new Error(errorMessage));
    }
    if ((this.worker as any)._voiceSearchReject) {
      (this.worker as any)._voiceSearchReject(new Error(errorMessage));
    }
  }

  private reportProgress(progress: SearchProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  // User-friendly search presets
  static readonly SEARCH_PRESETS = {
    FIND_ALL_SPEAKERS: {
      name: "👥 Find All Speakers",
      description: "See when each person talks throughout the audio",
      query: { type: 'speaker' as const, query: '*' },
      filters: { sortBy: 'time' as const, confidenceThreshold: 70, maxResults: 500 }
    },

    FIND_QUESTIONS: {
      name: "❓ Find All Questions", 
      description: "Locate questions and interrogative phrases",
      query: { type: 'phrase' as const, query: '?' },
      filters: { sortBy: 'time' as const, confidenceThreshold: 75, maxResults: 100 }
    },

    FIND_IMPORTANT_MOMENTS: {
      name: "⭐ Find Important Moments",
      description: "Key phrases like 'important', 'decision', 'action item'",
      query: { type: 'word' as const, query: 'important|decision|action|key|critical' },
      filters: { sortBy: 'relevance' as const, confidenceThreshold: 80, maxResults: 50 }
    },

    FIND_AGREEMENTS: {
      name: "✅ Find Agreements",
      description: "When people say 'yes', 'agree', 'sounds good'",
      query: { type: 'phrase' as const, query: 'yes|agree|sounds good|exactly|absolutely' },
      filters: { sortBy: 'time' as const, confidenceThreshold: 75, maxResults: 100 }
    }
  };

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioIndex = null;
    this.isInitialized = false;
  }
}

// Helper functions for common search tasks
export function createTimeRangeFilter(startMinutes: number, endMinutes: number): SearchFilters['timeRange'] {
  return {
    startTime: startMinutes * 60,
    endTime: endMinutes * 60
  };
}

export function createSpeakerFilter(speakerNames: string[]): SearchFilters['speakerFilter'] {
  return speakerNames;
}

// Smart search query parsing
export function parseNaturalLanguageQuery(query: string): SearchQuery {
  const lowerQuery = query.toLowerCase().trim();
  
  // Detect search type based on query patterns
  if (lowerQuery.startsWith('find ') || lowerQuery.startsWith('show ')) {
    if (lowerQuery.includes('speaker') || lowerQuery.includes('person') || lowerQuery.includes('voice')) {
      return { type: 'speaker', query: extractNameFromQuery(query) };
    }
  }
  
  if (lowerQuery.includes('"') || lowerQuery.includes('phrase')) {
    const phrase = extractQuotedText(query) || query.replace(/find|phrase|show/gi, '').trim();
    return { type: 'phrase', query: phrase };
  }
  
  if (lowerQuery.split(' ').length === 1) {
    return { type: 'word', query: query };
  }
  
  return { type: 'phrase', query: query };
}

function extractNameFromQuery(query: string): string {
  // Extract names from queries like "find speaker john" or "show person sarah"
  const words = query.toLowerCase().split(' ');
  const nameIndicators = ['speaker', 'person', 'voice', 'find', 'show'];
  
  for (let i = 0; i < words.length; i++) {
    if (nameIndicators.includes(words[i]) && i + 1 < words.length) {
      return words[i + 1];
    }
  }
  
  return query;
}

function extractQuotedText(query: string): string | null {
  const match = query.match(/"([^"]*)"/);
  return match ? match[1] : null;
}