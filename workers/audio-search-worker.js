/**
 * Audio Search Web Worker
 * Handles indexing and searching of audio content in background
 */

class AudioSearchProcessor {
  constructor() {
    this.isInitialized = false;
    this.searchIndex = null;
  }

  async initialize() {
    this.isInitialized = true;
    console.log('Audio search processor initialized');
  }

  async buildIndex(audioBuffer, voiceProfiles, captions) {
    try {
      this.postProgress({
        stage: 'indexing',
        percentage: 10,
        userMessage: "📚 Analyzing voice patterns...",
        resultsFound: 0
      });

      // Build comprehensive search index
      const index = {
        speakers: new Map(),
        transcripts: [],
        voiceSegments: [],
        wordIndex: new Map(),
        phraseIndex: new Map()
      };

      // Index voice profiles and speakers
      await this.indexSpeakers(index, voiceProfiles);
      
      this.postProgress({
        stage: 'indexing',
        percentage: 40,
        userMessage: "📝 Processing transcripts...",
        resultsFound: 0
      });

      // Index captions and transcripts
      await this.indexTranscripts(index, captions);
      
      this.postProgress({
        stage: 'indexing',
        percentage: 70,
        userMessage: "🔤 Building word index...",
        resultsFound: 0
      });

      // Build word and phrase indices
      await this.buildWordIndex(index);
      await this.buildPhraseIndex(index);

      this.postProgress({
        stage: 'indexing',
        percentage: 100,
        userMessage: "✅ Search index ready!",
        resultsFound: 0
      });

      this.searchIndex = index;
      
      self.postMessage({
        type: 'indexBuilt',
        data: { index: this.serializeIndex(index) }
      });

    } catch (error) {
      this.postError(`Failed to build search index: ${error.message}`);
    }
  }

  async indexSpeakers(index, voiceProfiles) {
    for (const profile of voiceProfiles) {
      const voicePrint = {
        speakerName: profile.name,
        characteristics: profile.characteristics,
        segments: profile.segments.map(seg => ({
          startTime: seg.startTime,
          endTime: seg.endTime,
          confidence: seg.confidence
        })),
        voiceprint: new Float32Array(profile.voiceprint)
      };

      index.speakers.set(profile.name, voicePrint);

      // Create voice segments for pattern matching
      profile.segments.forEach((segment, segIndex) => {
        index.voiceSegments.push({
          id: `voice_${profile.id}_${segIndex}`,
          startTime: segment.startTime,
          endTime: segment.endTime,
          speakerName: profile.name,
          audioFeatures: this.extractAudioFeatures(profile.voiceprint),
          confidence: segment.confidence
        });
      });
    }
  }

  async indexTranscripts(index, captions) {
    for (const caption of captions) {
      const transcriptSegment = {
        id: caption.id,
        startTime: caption.startTime,
        endTime: caption.endTime,
        text: caption.text,
        speakerName: caption.speaker,
        words: this.extractWordTimings(caption),
        confidence: caption.confidence
      };

      index.transcripts.push(transcriptSegment);
    }
  }

  extractWordTimings(caption) {
    // Extract individual word timings from caption
    const words = caption.text.split(/\s+/);
    const totalDuration = caption.endTime - caption.startTime;
    const timePerWord = totalDuration / words.length;

    return words.map((word, index) => ({
      word: this.cleanWord(word),
      startTime: caption.startTime + (index * timePerWord),
      endTime: caption.startTime + ((index + 1) * timePerWord),
      confidence: caption.confidence
    }));
  }

  cleanWord(word) {
    // Remove punctuation and convert to lowercase
    return word.toLowerCase().replace(/[^\w]/g, '');
  }

  async buildWordIndex(index) {
    for (const transcript of index.transcripts) {
      for (const wordTiming of transcript.words) {
        const word = wordTiming.word;
        if (word.length < 2) continue; // Skip very short words

        if (!index.wordIndex.has(word)) {
          index.wordIndex.set(word, []);
        }

        index.wordIndex.get(word).push({
          word: word,
          startTime: wordTiming.startTime,
          endTime: wordTiming.endTime,
          speakerName: transcript.speakerName,
          segmentId: transcript.id,
          confidence: wordTiming.confidence
        });
      }
    }
  }

  async buildPhraseIndex(index) {
    // Build index for common phrases (2-5 word combinations)
    for (const transcript of index.transcripts) {
      const words = transcript.words;
      
      // Build 2-word phrases
      for (let i = 0; i < words.length - 1; i++) {
        this.addPhraseToIndex(index, words.slice(i, i + 2), transcript);
      }
      
      // Build 3-word phrases
      for (let i = 0; i < words.length - 2; i++) {
        this.addPhraseToIndex(index, words.slice(i, i + 3), transcript);
      }
      
      // Build 4-word phrases for important combinations
      for (let i = 0; i < words.length - 3; i++) {
        const phrase = words.slice(i, i + 4);
        const phraseText = phrase.map(w => w.word).join(' ');
        
        // Only index phrases with important keywords
        if (this.isImportantPhrase(phraseText)) {
          this.addPhraseToIndex(index, phrase, transcript);
        }
      }
    }
  }

  addPhraseToIndex(index, wordGroup, transcript) {
    const phraseText = wordGroup.map(w => w.word).join(' ');
    const startTime = wordGroup[0].startTime;
    const endTime = wordGroup[wordGroup.length - 1].endTime;

    if (!index.phraseIndex.has(phraseText)) {
      index.phraseIndex.set(phraseText, []);
    }

    index.phraseIndex.get(phraseText).push({
      phrase: phraseText,
      startTime: startTime,
      endTime: endTime,
      speakerName: transcript.speakerName,
      segmentId: transcript.id,
      confidence: Math.min(...wordGroup.map(w => w.confidence)),
      wordCount: wordGroup.length
    });
  }

  isImportantPhrase(phraseText) {
    const importantWords = [
      'important', 'decision', 'action', 'next step', 'follow up',
      'question', 'problem', 'solution', 'agree', 'disagree',
      'deadline', 'meeting', 'schedule', 'priority', 'urgent'
    ];
    
    return importantWords.some(word => phraseText.includes(word));
  }

  async search(query, filters, serializedIndex) {
    try {
      this.searchIndex = this.deserializeIndex(serializedIndex);
      
      this.postProgress({
        stage: 'searching',
        percentage: 0,
        userMessage: this.getSearchMessage(query),
        resultsFound: 0
      });

      let results = [];
      
      switch (query.type) {
        case 'speaker':
          results = await this.searchBySpeaker(query, filters);
          break;
        case 'word':
          results = await this.searchByWord(query, filters);
          break;
        case 'phrase':
          results = await this.searchByPhrase(query, filters);
          break;
        case 'voice':
          results = await this.searchByVoicePattern(query, filters);
          break;
        case 'all':
          results = await this.searchAll(query, filters);
          break;
      }

      // Apply filters
      results = this.applyFilters(results, filters);
      
      // Sort results
      results = this.sortResults(results, filters.sortBy);
      
      // Limit results
      if (filters.maxResults) {
        results = results.slice(0, filters.maxResults);
      }

      this.postProgress({
        stage: 'complete',
        percentage: 100,
        userMessage: `✅ Found ${results.length} results!`,
        resultsFound: results.length
      });

      self.postMessage({
        type: 'searchComplete',
        data: { results }
      });

    } catch (error) {
      this.postError(`Search failed: ${error.message}`);
    }
  }

  async searchBySpeaker(query, filters) {
    const results = [];
    const searchTerm = query.query.toLowerCase();
    
    this.searchIndex.speakers.forEach((voicePrint, speakerName) => {
      if (searchTerm === '*' || speakerName.toLowerCase().includes(searchTerm)) {
        // Add all segments for this speaker
        voicePrint.segments.forEach(segment => {
          results.push({
            id: `speaker_${speakerName}_${segment.startTime}`,
            type: 'speaker_match',
            startTime: segment.startTime,
            endTime: segment.endTime,
            confidence: segment.confidence,
            speakerName: speakerName,
            context: this.getContextForTimeRange(segment.startTime, segment.endTime),
            matchText: speakerName
          });
        });
      }
    });

    return results;
  }

  async searchByWord(query, filters) {
    const results = [];
    const searchTerm = this.cleanWord(query.query);
    
    // Handle regex patterns for complex searches
    if (searchTerm.includes('|')) {
      const words = searchTerm.split('|');
      for (const word of words) {
        const wordResults = this.findWordOccurrences(word.trim());
        results.push(...wordResults);
      }
    } else {
      results.push(...this.findWordOccurrences(searchTerm));
    }

    return results;
  }

  findWordOccurrences(word) {
    const results = [];
    const occurrences = this.searchIndex.wordIndex.get(word) || [];
    
    for (const occurrence of occurrences) {
      results.push({
        id: `word_${word}_${occurrence.startTime}`,
        type: 'text_match',
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        confidence: occurrence.confidence,
        speakerName: occurrence.speakerName,
        matchText: word,
        context: this.getContextForTimeRange(occurrence.startTime, occurrence.endTime),
        highlightRanges: [{ start: 0, end: word.length }]
      });
    }

    return results;
  }

  async searchByPhrase(query, filters) {
    const results = [];
    const searchPhrase = query.query.toLowerCase();
    
    // Direct phrase lookup
    const phraseOccurrences = this.searchIndex.phraseIndex.get(searchPhrase) || [];
    for (const occurrence of phraseOccurrences) {
      results.push({
        id: `phrase_${searchPhrase}_${occurrence.startTime}`,
        type: 'phrase_match',
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        confidence: occurrence.confidence,
        speakerName: occurrence.speakerName,
        matchText: searchPhrase,
        context: this.getContextForTimeRange(occurrence.startTime, occurrence.endTime),
        highlightRanges: [{ start: 0, end: searchPhrase.length }]
      });
    }

    // Fuzzy phrase search in transcripts
    for (const transcript of this.searchIndex.transcripts) {
      if (transcript.text.toLowerCase().includes(searchPhrase)) {
        const matchStart = transcript.text.toLowerCase().indexOf(searchPhrase);
        results.push({
          id: `fuzzy_phrase_${searchPhrase}_${transcript.startTime}`,
          type: 'phrase_match',
          startTime: transcript.startTime,
          endTime: transcript.endTime,
          confidence: transcript.confidence * 0.9, // Slightly lower confidence for fuzzy matches
          speakerName: transcript.speakerName,
          matchText: transcript.text.substr(matchStart, searchPhrase.length),
          context: transcript.text,
          highlightRanges: [{ start: matchStart, end: matchStart + searchPhrase.length }]
        });
      }
    }

    return results;
  }

  async searchByVoicePattern(query, filters) {
    // This would implement voice similarity matching
    // For now, return speaker segments as a placeholder
    return this.searchBySpeaker({ type: 'speaker', query: '*' }, filters);
  }

  async searchAll(query, filters) {
    const results = [];
    
    // Search words
    const wordResults = await this.searchByWord(query, filters);
    results.push(...wordResults);
    
    // Search phrases
    const phraseResults = await this.searchByPhrase(query, filters);
    results.push(...phraseResults);
    
    // Search speakers
    const speakerResults = await this.searchBySpeaker(query, filters);
    results.push(...speakerResults);

    return results;
  }

  async findSimilarVoice(referenceAudio, filters) {
    try {
      this.postProgress({
        stage: 'searching',
        percentage: 0,
        userMessage: "🎤 Analyzing reference voice...",
        resultsFound: 0
      });

      // Extract features from reference audio
      const referenceFeatures = this.extractAudioFeatures(referenceAudio.channels[0]);
      
      this.postProgress({
        stage: 'searching',
        percentage: 30,
        userMessage: "🔍 Comparing with indexed voices...",
        resultsFound: 0
      });

      const results = [];
      let processed = 0;
      const total = this.searchIndex.voiceSegments.length;

      // Compare with all voice segments
      for (const segment of this.searchIndex.voiceSegments) {
        const similarity = this.calculateVoiceSimilarity(referenceFeatures, segment.audioFeatures);
        
        if (similarity > 0.5) { // Threshold for similarity
          results.push({
            id: `voice_similar_${segment.id}`,
            type: 'voice_match',
            startTime: segment.startTime,
            endTime: segment.endTime,
            confidence: similarity,
            speakerName: segment.speakerName,
            context: this.getContextForTimeRange(segment.startTime, segment.endTime),
            matchText: `Similar to reference voice (${Math.round(similarity * 100)}% match)`
          });
        }

        processed++;
        if (processed % 10 === 0) {
          this.postProgress({
            stage: 'searching',
            percentage: 30 + (processed / total * 60),
            userMessage: `🔍 Processed ${processed}/${total} voice segments...`,
            resultsFound: results.length
          });
        }
      }

      // Sort by similarity
      results.sort((a, b) => b.confidence - a.confidence);

      self.postMessage({
        type: 'voiceSearchComplete',
        data: { results: results.slice(0, filters.maxResults || 20) }
      });

    } catch (error) {
      this.postError(`Voice search failed: ${error.message}`);
    }
  }

  extractAudioFeatures(audioData) {
    // Extract basic audio features for voice comparison
    const features = new Float32Array(10);
    
    // Energy
    let energy = 0;
    for (let i = 0; i < audioData.length; i++) {
      energy += audioData[i] * audioData[i];
    }
    features[0] = Math.sqrt(energy / audioData.length);
    
    // Zero crossing rate
    let crossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        crossings++;
      }
    }
    features[1] = crossings / audioData.length;
    
    // Spectral centroid (simplified)
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = 0; i < audioData.length / 2; i++) {
      const magnitude = Math.abs(audioData[i]);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    features[2] = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    
    // Additional features would be added in a real implementation
    for (let i = 3; i < features.length; i++) {
      features[i] = Math.random() * 0.1; // Placeholder
    }
    
    return features;
  }

  calculateVoiceSimilarity(features1, features2) {
    // Calculate Euclidean distance between feature vectors
    let distance = 0;
    const length = Math.min(features1.length, features2.length);
    
    for (let i = 0; i < length; i++) {
      const diff = features1[i] - features2[i];
      distance += diff * diff;
    }
    
    // Convert distance to similarity score (0-1)
    const similarity = 1 / (1 + Math.sqrt(distance));
    return similarity;
  }

  getContextForTimeRange(startTime, endTime) {
    // Find transcript segments that overlap with this time range
    const contexts = [];
    
    for (const transcript of this.searchIndex.transcripts) {
      const overlap = Math.max(0, 
        Math.min(endTime, transcript.endTime) - Math.max(startTime, transcript.startTime)
      );
      
      if (overlap > 0) {
        contexts.push(transcript.text);
      }
    }
    
    return contexts.join(' ').substring(0, 200) + '...'; // Limit context length
  }

  applyFilters(results, filters) {
    let filtered = results;

    // Confidence threshold
    if (filters.confidenceThreshold) {
      const threshold = filters.confidenceThreshold / 100;
      filtered = filtered.filter(r => r.confidence >= threshold);
    }

    // Time range filter
    if (filters.timeRange) {
      const { startTime, endTime } = filters.timeRange;
      filtered = filtered.filter(r => 
        r.startTime >= startTime && r.endTime <= endTime
      );
    }

    // Speaker filter
    if (filters.speakerFilter && filters.speakerFilter.length > 0) {
      filtered = filtered.filter(r => 
        !r.speakerName || filters.speakerFilter.includes(r.speakerName)
      );
    }

    return filtered;
  }

  sortResults(results, sortBy) {
    switch (sortBy) {
      case 'time':
        return results.sort((a, b) => a.startTime - b.startTime);
      case 'confidence':
        return results.sort((a, b) => b.confidence - a.confidence);
      case 'relevance':
      default:
        return results.sort((a, b) => {
          // Combine confidence and match quality
          const aScore = a.confidence * (a.matchText?.length || 0);
          const bScore = b.confidence * (b.matchText?.length || 0);
          return bScore - aScore;
        });
    }
  }

  getSearchMessage(query) {
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

  serializeIndex(index) {
    return {
      speakers: Array.from(index.speakers.entries()),
      transcripts: index.transcripts,
      voiceSegments: index.voiceSegments,
      wordIndex: Array.from(index.wordIndex.entries()),
      phraseIndex: Array.from(index.phraseIndex.entries())
    };
  }

  deserializeIndex(serialized) {
    return {
      speakers: new Map(serialized.speakers),
      transcripts: serialized.transcripts,
      voiceSegments: serialized.voiceSegments,
      wordIndex: new Map(serialized.wordIndex),
      phraseIndex: new Map(serialized.phraseIndex)
    };
  }

  postProgress(progress) {
    self.postMessage({ type: 'progress', ...progress });
  }

  postError(message) {
    self.postMessage({ type: 'error', message });
  }
}

// Worker main thread
const processor = new AudioSearchProcessor();

self.onmessage = async function(event) {
  const { type, audioBuffer, voiceProfiles, captions, query, filters, referenceAudio, index } = event.data;

  switch (type) {
    case 'initialize':
      await processor.initialize();
      break;
      
    case 'buildIndex':
      if (!processor.isInitialized) {
        await processor.initialize();
      }
      await processor.buildIndex(audioBuffer, voiceProfiles, captions);
      break;
      
    case 'search':
      await processor.search(query, filters, index);
      break;
      
    case 'findSimilarVoice':
      await processor.findSimilarVoice(referenceAudio, filters);
      break;
      
    default:
      processor.postError(`Unknown command: ${type}`);
  }
};