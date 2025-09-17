'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Clock, User, MessageSquare, Volume2, Filter, Download, X, Play, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AudioSearchEngine, SearchResult, SearchFilters } from '@/lib/audio/engines/audio-search';

interface AudioSearchInterfaceProps {
  audioBuffer: AudioBuffer | null;
  voiceProfiles: any[];
  captions: any[];
  onJumpToTime: (time: number) => void;
  onPlaySegment?: (audioBuffer: AudioBuffer) => void;
}

export function AudioSearchInterface({
  audioBuffer,
  voiceProfiles,
  captions,
  onJumpToTime,
  onPlaySegment
}: AudioSearchInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    confidenceThreshold: 75,
    maxResults: 50,
    sortBy: 'relevance'
  });
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchProgress, setSearchProgress] = useState<any>(null);

  const searchEngine = useMemo(() => 
    new AudioSearchEngine((progress) => setSearchProgress(progress)), []
  );

  const [searchIndex, setSearchIndex] = useState<any>(null);

  useEffect(() => {
    if (audioBuffer && voiceProfiles.length > 0 && captions.length > 0 && !searchIndex) {
      buildSearchIndex();
    }
  }, [audioBuffer, voiceProfiles, captions]);

  const buildSearchIndex = useCallback(async () => {
    if (!audioBuffer) return;
    
    try {
      setIsSearching(true);
      await searchEngine.initialize();
      const index = await searchEngine.buildSearchIndex(
        audioBuffer,
        voiceProfiles,
        captions
      );
      setSearchIndex(index);
    } catch (error) {
      console.error('Failed to build search index:', error);
    } finally {
      setIsSearching(false);
    }
  }, [audioBuffer, voiceProfiles, captions, searchEngine]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !searchIndex) return;
    
    setIsSearching(true);
    
    try {
      const searchFilters = {
        ...filters,
        speakerFilter: selectedSpeakers.length > 0 ? selectedSpeakers : undefined
      };

      let results: SearchResult[] = [];
      
      if (searchQuery.startsWith('"') && searchQuery.endsWith('"')) {
        const phrase = searchQuery.slice(1, -1);
        results = await searchEngine.findPhrase(phrase, searchFilters);
      } else if (searchQuery.toLowerCase().startsWith('find speaker ')) {
        const speakerName = searchQuery.slice(13).trim();
        results = await searchEngine.findSpeaker(speakerName, searchFilters);
      } else if (searchQuery.toLowerCase().includes('|')) {
        const words = searchQuery.split('|');
        const allResults = await Promise.all(
          words.map(word => searchEngine.findWord(word.trim(), searchFilters))
        );
        results = allResults.flat().sort((a, b) => b.confidence - a.confidence);
      } else {
        results = await searchEngine.findWord(searchQuery, searchFilters);
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchIndex, filters, selectedSpeakers, searchEngine]);

  const handleQuickSearch = useCallback((type: string) => {
    switch (type) {
      case 'speakers':
        setSearchQuery('show all speakers');
        break;
      case 'questions':
        setSearchQuery('what|when|where|who|how|why');
        break;
      case 'important':
        setSearchQuery('important|urgent|priority|deadline');
        break;
      case 'agreements':
        setSearchQuery('yes|okay|agree|sounds good');
        break;
    }
  }, []);

  const exportResults = useCallback((format: 'csv' | 'json' | 'txt') => {
    if (searchResults.length === 0) return;
    
    const data = searchEngine.exportSearchResults(searchResults, format);
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [searchResults, searchEngine]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'speaker_match':
        return <User className="w-4 h-4" />;
      case 'voice_match':
        return <Volume2 className="w-4 h-4" />;
      case 'phrase_match':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (!audioBuffer) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Process your audio first to enable search functionality</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            🔍 Search Through Your Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search for words, phrases, or speakers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
                disabled={isSearching || !searchIndex}
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !searchIndex}
              className="px-6"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Search Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSearch('speakers')}
            >
              👥 Find All Speakers
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSearch('questions')}
            >
              ❓ Find All Questions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSearch('important')}
            >
              ⭐ Find Important Moments
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSearch('agreements')}
            >
              ✅ Find Agreements
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Confidence Threshold */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Confidence Level: {filters.confidenceThreshold}%
                    </label>
                    <Slider
                      value={[filters.confidenceThreshold]}
                      onValueChange={([value]) =>
                        setFilters(prev => ({ ...prev, confidenceThreshold: value ?? 75 }))
                      }
                      max={100}
                      min={1}
                      step={5}
                    />
                  </div>

                  {/* Max Results */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Results</label>
                    <Select
                      value={filters.maxResults?.toString()}
                      onValueChange={(value) => 
                        setFilters(prev => ({ ...prev, maxResults: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 results</SelectItem>
                        <SelectItem value="50">50 results</SelectItem>
                        <SelectItem value="100">100 results</SelectItem>
                        <SelectItem value="200">200 results</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value: 'relevance' | 'time' | 'confidence') =>
                        setFilters(prev => ({ ...prev, sortBy: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        <SelectItem value="confidence">Confidence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Speaker Filter */}
                {voiceProfiles.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter by Speakers</label>
                    <div className="flex flex-wrap gap-2">
                      {voiceProfiles.map((profile) => (
                        <Button
                          key={profile.id}
                          variant={selectedSpeakers.includes(profile.name) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedSpeakers(prev => 
                              prev.includes(profile.name)
                                ? prev.filter(s => s !== profile.name)
                                : [...prev, profile.name]
                            );
                          }}
                        >
                          {profile.name}
                        </Button>
                      ))}
                      {selectedSpeakers.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSpeakers([])}
                        >
                          <X className="w-4 h-4" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search Progress */}
          {searchProgress && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">
                    {searchProgress.stage === 'analyzing' && 'Analyzing audio structure...'}
                    {searchProgress.stage === 'indexing' && `Building search index... ${searchProgress.percentage || 0}%`}
                    {searchProgress.stage === 'searching' && `Searching... found ${searchProgress.resultsFound || 0} results`}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Search Results ({searchResults.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportResults('txt')}
              >
                <Download className="w-4 h-4 mr-1" />
                Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportResults('csv')}
              >
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportResults('json')}
              >
                <Download className="w-4 h-4 mr-1" />
                JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getResultIcon(result.type)}
                          <Badge className={getConfidenceColor(result.confidence)}>
                            {Math.round(result.confidence * 100)}%
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(result.startTime)}
                          </Badge>
                          {result.speakerName && (
                            <Badge variant="secondary">
                              {result.speakerName}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {result.context}
                        </p>
                        
                        {result.matchText && (
                          <p className="text-sm font-medium">
                            Match: "{result.matchText}"
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => onJumpToTime(result.startTime)}
                        >
                          <SkipForward className="w-4 h-4 mr-1" />
                          Jump
                        </Button>
                        {result.audioSegment && onPlaySegment && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPlaySegment(result.audioSegment!)}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {searchQuery && searchResults.length === 0 && !isSearching && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No results found for "{searchQuery}"</p>
              <div className="text-sm space-y-1">
                <p>Try:</p>
                <ul className="list-disc list-inside">
                  <li>Different spelling or related words</li>
                  <li>Lowering the confidence threshold</li>
                  <li>Using quotes for exact phrases: "meeting time"</li>
                  <li>Searching for speaker names: "find speaker John"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}