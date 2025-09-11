# Audio Search Engine API Documentation

## Overview

The Audio Search Engine provides comprehensive search capabilities across audio content, including speaker identification, text search, and voice pattern matching.

## Core Components

### AudioSearchEngine Class
```typescript
import { AudioSearchEngine } from '@/lib/audio/engines/audio-search';

const searchEngine = new AudioSearchEngine((progress) => {
  console.log('Search progress:', progress);
});
```

### Initialization
```typescript
await searchEngine.initialize();
```

### Building Search Index
```typescript
const index = await searchEngine.buildSearchIndex(
  audioBuffer: AudioBuffer,
  voiceProfiles: VoiceProfile[],
  captions: CaptionSegment[]
);
```

## Search Methods

### Basic Text Search
```typescript
// Search for specific words
const results = await searchEngine.findWord('important', {
  confidenceThreshold: 75,
  maxResults: 50,
  sortBy: 'relevance'
});

// Search for phrases
const results = await searchEngine.findPhrase('action item', {
  timeRange: { startTime: 60, endTime: 300 }, // 1-5 minutes
  speakerFilter: ['John', 'Sarah']
});
```

### Speaker Search
```typescript
// Find all instances of a specific speaker
const results = await searchEngine.findSpeaker('John', {
  confidenceThreshold: 80,
  sortBy: 'time'
});
```

### Voice Pattern Matching
```typescript
// Find similar voices to a reference sample
const results = await searchEngine.findSimilarVoice(
  referenceAudioBuffer,
  { maxResults: 10, confidenceThreshold: 70 }
);
```

### Advanced Search
```typescript
// Multiple search criteria
const results = await searchEngine.advancedSearch([
  { type: 'word', query: 'deadline' },
  { type: 'speaker', query: 'manager' },
  { type: 'phrase', query: 'next week' }
], {
  sortBy: 'relevance',
  maxResults: 100
});
```

## Data Types

### SearchQuery Interface
```typescript
interface SearchQuery {
  type: 'voice' | 'speaker' | 'word' | 'phrase' | 'all';
  query: string;
  caseSensitive?: boolean;
  exactMatch?: boolean;
}
```

### SearchFilters Interface
```typescript
interface SearchFilters {
  timeRange?: {
    startTime: number; // seconds
    endTime: number;   // seconds
  };
  speakerFilter?: string[];
  confidenceThreshold: number; // 0-100
  maxResults?: number;
  sortBy: 'relevance' | 'time' | 'confidence';
}
```

### SearchResult Interface
```typescript
interface SearchResult {
  id: string;
  type: 'voice_match' | 'speaker_match' | 'text_match' | 'phrase_match';
  startTime: number;
  endTime: number;
  confidence: number; // 0-1
  matchText?: string;
  speakerName?: string;
  context: string;
  audioSegment?: AudioBuffer;
  highlightRanges?: Array<{ start: number; end: number }>;
}
```

## Search Index Structure

### AudioIndex Interface
```typescript
interface AudioIndex {
  speakers: Map<string, VoicePrint>;
  transcripts: TranscriptSegment[];
  voiceSegments: VoiceSegment[];
  wordIndex: Map<string, WordOccurrence[]>;
  phraseIndex: Map<string, PhraseOccurrence[]>;
}
```

### VoicePrint
```typescript
interface VoicePrint {
  speakerName: string;
  characteristics: {
    pitch: number;
    pitchRange: number;
    formants: number[];
    energy: number;
  };
  segments: Array<{ startTime: number; endTime: number; confidence: number }>;
  voiceprint: Float32Array;
}
```

## Utility Functions

### Natural Language Query Parsing
```typescript
import { parseNaturalLanguageQuery } from '@/lib/audio/engines/audio-search';

const query = parseNaturalLanguageQuery("find speaker john");
// Returns: { type: 'speaker', query: 'john' }
```

### Time Range Helpers
```typescript
import { createTimeRangeFilter } from '@/lib/audio/engines/audio-search';

const timeFilter = createTimeRangeFilter(5, 10); // 5-10 minutes
// Returns: { startTime: 300, endTime: 600 }
```

### Search Suggestions
```typescript
const suggestions = await searchEngine.getSearchSuggestions('mee');
// Returns: ['👤 Meeting Participant', '💬 "meeting" (15 times)', '📝 "next meeting"']
```

## Export Functionality

### Export Search Results
```typescript
const csvData = searchEngine.exportSearchResults(results, 'csv');
const jsonData = searchEngine.exportSearchResults(results, 'json');
const textData = searchEngine.exportSearchResults(results, 'txt');
```

## Performance Considerations

### Indexing
- Index building is CPU-intensive and runs in Web Worker
- Typical indexing time: 10-30 seconds per hour of audio
- Index size: ~1-5MB per hour of audio

### Search Performance
- Word search: <100ms for typical queries
- Phrase search: 100-500ms depending on complexity
- Voice pattern matching: 1-5 seconds depending on audio length

### Memory Usage
- Search index: ~1-5MB per hour of audio
- Active search results: ~100KB-1MB depending on result count

## Error Handling

### Common Errors
```typescript
try {
  const results = await searchEngine.searchAudio(query, filters);
} catch (error) {
  if (error.message.includes('index not built')) {
    // Need to build search index first
    await searchEngine.buildSearchIndex(audioBuffer, voices, captions);
  } else if (error.message.includes('worker not available')) {
    // Reinitialize search engine
    await searchEngine.initialize();
  }
}
```

### Progress Monitoring
```typescript
const searchEngine = new AudioSearchEngine((progress) => {
  switch (progress.stage) {
    case 'analyzing':
      console.log('Analyzing audio structure...');
      break;
    case 'indexing':
      console.log(`Building index... ${progress.percentage}%`);
      break;
    case 'searching':
      console.log(`Searching... found ${progress.resultsFound} results`);
      break;
    case 'complete':
      console.log(`Search complete! ${progress.resultsFound} total results`);
      break;
  }
});
```

## Integration Examples

### With React Components
```typescript
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);

const searchEngine = useMemo(() => 
  new AudioSearchEngine(setSearchProgress), []
);

const handleSearch = async (query: string) => {
  const results = await searchEngine.findWord(query, {
    confidenceThreshold: 75,
    maxResults: 50
  });
  setSearchResults(results);
};
```

### With Audio Player
```typescript
const handleResultClick = (result: SearchResult) => {
  // Jump to specific time in audio player
  audioPlayer.currentTime = result.startTime;
  
  // Highlight the match
  if (result.audioSegment) {
    // Play the specific audio segment
    playAudioSegment(result.audioSegment);
  }
};
```

## Web Worker Architecture

The search engine uses Web Workers for:
- Index building (background processing)
- Complex search operations
- Voice pattern analysis

### Worker Communication
```typescript
// Engine automatically handles worker communication
// No direct worker interaction needed in most cases

// For advanced use cases:
const worker = new Worker('/workers/audio-search-worker.js');
worker.postMessage({
  type: 'search',
  query: { type: 'word', query: 'hello' },
  filters: { confidenceThreshold: 75 }
});
```

## Testing

### Unit Tests
```typescript
describe('AudioSearchEngine', () => {
  test('should find exact word matches', async () => {
    const results = await engine.findWord('hello');
    expect(results).toHaveLength(5);
    expect(results[0].matchText).toBe('hello');
  });
});
```

### Integration Tests
```typescript
describe('Search Integration', () => {
  test('should build index and search', async () => {
    await engine.buildSearchIndex(audioBuffer, voices, captions);
    const results = await engine.findPhrase('good morning');
    expect(results.length).toBeGreaterThan(0);
  });
});
```