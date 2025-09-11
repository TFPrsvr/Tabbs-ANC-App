"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { SmartAudioSeparation } from './smart-audio-separation';
import { 
  AISourceSeparationEngine, 
  SeparatedStreams,
  SeparationProgress 
} from '@/lib/audio/engines/source-separation';
import { 
  VoiceDetectionEngine, 
  VoiceProfile,
  VoiceDetectionProgress 
} from '@/lib/audio/engines/voice-detection';
import { 
  SpeechRecognitionEngine, 
  CaptionSegment,
  TranscriptionProgress 
} from '@/lib/audio/engines/speech-recognition';
import { cn } from '@/lib/utils';
import { AudioSearchInterface } from './audio-search-interface';
import { 
  Wand2, Users, MessageSquare, Download, Play, Pause, 
  Volume2, VolumeX, Settings, RotateCcw, CheckCircle,
  AlertCircle, Clock, Zap, Eye, EyeOff, Edit3, Save,
  FileText, Globe, Mic, Headphones, Music, Sparkles, Search
} from 'lucide-react';

interface AdvancedAudioWorkspaceProps {
  audioFile: File | null;
  audioBuffer: AudioBuffer | null;
  className?: string;
}

export function AdvancedAudioWorkspace({
  audioFile,
  audioBuffer,
  className
}: AdvancedAudioWorkspaceProps) {
  // Core engines
  const [separationEngine] = useState(() => new AISourceSeparationEngine());
  const [voiceEngine] = useState(() => new VoiceDetectionEngine());
  const [speechEngine] = useState(() => new SpeechRecognitionEngine());

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'separation' | 'voices' | 'captions' | 'complete'>('separation');
  const [overallProgress, setOverallProgress] = useState(0);
  
  // Results states
  const [separatedStreams, setSeparatedStreams] = useState<SeparatedStreams | null>(null);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  
  // Progress states
  const [separationProgress, setSeparationProgress] = useState<SeparationProgress | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<VoiceDetectionProgress | null>(null);
  const [captionProgress, setCaptionProgress] = useState<TranscriptionProgress | null>(null);
  
  // UI states
  const [activeTab, setActiveTab] = useState('wizard');
  const [selectedPreset, setSelectedPreset] = useState('smart_complete');
  const [error, setError] = useState<string | null>(null);
  const [playingStream, setPlayingStream] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // User-friendly presets that combine all features
  const workflowPresets = {
    smart_complete: {
      name: "✨ Smart Complete Analysis",
      description: "Full AI processing - separate audio, identify speakers, and create captions",
      icon: <Sparkles className="w-5 h-5" />,
      steps: ['separation', 'voices', 'captions'],
      settings: {
        separation: AISourceSeparationEngine.PRESETS.KARAOKE.settings,
        voices: VoiceDetectionEngine.PRESETS.PODCAST.settings,
        captions: SpeechRecognitionEngine.PRESETS.PODCAST.settings
      }
    },
    podcast_pro: {
      name: "🎙️ Podcast Pro",
      description: "Perfect for interviews - identify speakers and create searchable transcripts",
      icon: <Mic className="w-5 h-5" />,
      steps: ['voices', 'captions'],
      settings: {
        voices: VoiceDetectionEngine.PRESETS.PODCAST.settings,
        captions: SpeechRecognitionEngine.PRESETS.PODCAST.settings
      }
    },
    music_magic: {
      name: "🎵 Music Magic",
      description: "Separate vocals from instruments - perfect for karaoke or remixing",
      icon: <Music className="w-5 h-5" />,
      steps: ['separation'],
      settings: {
        separation: AISourceSeparationEngine.PRESETS.FULL_SEPARATION.settings
      }
    },
    meeting_master: {
      name: "💼 Meeting Master",
      description: "Identify all participants and create detailed meeting notes",
      icon: <Users className="w-5 h-5" />,
      steps: ['voices', 'captions'],
      settings: {
        voices: VoiceDetectionEngine.PRESETS.MEETING.settings,
        captions: SpeechRecognitionEngine.PRESETS.MEETING_NOTES.settings
      }
    },
    accessibility_plus: {
      name: "♿ Accessibility Plus",
      description: "Create perfect captions for accessibility compliance",
      icon: <MessageSquare className="w-5 h-5" />,
      steps: ['captions'],
      settings: {
        captions: SpeechRecognitionEngine.PRESETS.ACCESSIBILITY.settings
      }
    }
  };

  // Initialize engines
  useEffect(() => {
    const initializeEngines = async () => {
      try {
        await Promise.all([
          separationEngine.initialize(),
          voiceEngine.initialize(),
          speechEngine.initialize()
        ]);
      } catch (error) {
        console.error('Failed to initialize engines:', error);
        setError('Failed to initialize audio processing engines');
      }
    };

    initializeEngines();

    return () => {
      separationEngine.dispose();
      voiceEngine.dispose();
      speechEngine.dispose();
    };
  }, [separationEngine, voiceEngine, speechEngine]);

  // Main processing workflow
  const handleStartProcessing = useCallback(async () => {
    if (!audioBuffer) {
      setError("No audio loaded. Please upload an audio file first.");
      return;
    }

    const preset = workflowPresets[selectedPreset as keyof typeof workflowPresets];
    if (!preset) return;

    try {
      setIsProcessing(true);
      setError(null);
      setOverallProgress(0);
      
      const totalSteps = preset.steps.length;
      let completedSteps = 0;

      // Step 1: Audio Separation (if included)
      if (preset.steps.includes('separation')) {
        setCurrentStep('separation');
        
        const separationCallback = (progress: SeparationProgress) => {
          setSeparationProgress(progress);
          setOverallProgress((completedSteps / totalSteps) * 100 + (progress.percentage / totalSteps));
        };

        separationEngine.onProgress = separationCallback;
        const streams = await separationEngine.separateAudio(audioBuffer, preset.settings.separation!);
        setSeparatedStreams(streams);
        completedSteps++;
      }

      // Step 2: Voice Detection (if included)
      let detectedVoices: VoiceProfile[] = [];
      if (preset.steps.includes('voices')) {
        setCurrentStep('voices');
        
        const voiceCallback = (progress: VoiceDetectionProgress) => {
          setVoiceProgress(progress);
          setOverallProgress((completedSteps / totalSteps) * 100 + (progress.percentage / totalSteps));
        };

        voiceEngine.onProgress = voiceCallback;
        detectedVoices = await voiceEngine.detectVoices(audioBuffer, preset.settings.voices!);
        setVoiceProfiles(detectedVoices);
        completedSteps++;
      }

      // Step 3: Speech Recognition (if included)
      if (preset.steps.includes('captions')) {
        setCurrentStep('captions');
        
        const captionCallback = (progress: TranscriptionProgress) => {
          setCaptionProgress(progress);
          setOverallProgress((completedSteps / totalSteps) * 100 + (progress.percentage / totalSteps));
        };

        speechEngine.onProgress = captionCallback;
        const generatedCaptions = await speechEngine.transcribeAudio(
          audioBuffer,
          preset.settings.captions!,
          detectedVoices.map(profile => ({
            startTime: profile.segments[0]?.startTime || 0,
            endTime: profile.segments[profile.segments.length - 1]?.endTime || 0,
            speaker: profile.name
          }))
        );
        setCaptions(generatedCaptions);
        completedSteps++;
      }

      setCurrentStep('complete');
      setOverallProgress(100);

    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [audioBuffer, selectedPreset, separationEngine, voiceEngine, speechEngine]);

  // Get current status message
  const getCurrentStatusMessage = () => {
    if (!isProcessing) {
      if (currentStep === 'complete') {
        return "🎉 All processing complete! Explore your results below.";
      }
      return "Ready to start processing your audio";
    }

    const preset = workflowPresets[selectedPreset as keyof typeof workflowPresets];
    const stepNames = {
      separation: "🎯 Smart Audio Separation",
      voices: "👥 Speaker Recognition", 
      captions: "📝 Auto Captions"
    };

    return `${stepNames[currentStep]} in progress...`;
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle navigation to specific time
  const handleJumpToTime = useCallback((time: number) => {
    setCurrentTime(time);
    // In a real implementation, this would also update the audio player
    console.log(`Jumping to time: ${formatTime(time)}`);
  }, []);

  // Handle audio segment playback
  const handlePlaySegment = useCallback((audioBuffer: AudioBuffer) => {
    // In a real implementation, this would play the specific audio segment
    console.log('Playing audio segment:', audioBuffer);
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Workflow Selection */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Wand2 className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-xl">🚀 Advanced Audio Processing</div>
              <div className="text-sm font-normal text-muted-foreground">
                Choose what you want to do with your audio
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Preset Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(workflowPresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => setSelectedPreset(key)}
                disabled={isProcessing}
                className={cn(
                  "p-4 text-left border rounded-lg transition-all hover:shadow-md",
                  selectedPreset === key 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                    : "border-gray-200 hover:border-blue-300",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  {preset.icon}
                  <div className="font-medium">{preset.name}</div>
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {preset.description}
                </div>
                <div className="flex flex-wrap gap-1">
                  {preset.steps.map(step => (
                    <Badge key={step} variant="secondary" className="text-xs">
                      {step === 'separation' && '🎯'}
                      {step === 'voices' && '👥'}
                      {step === 'captions' && '📝'}
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Start Processing Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {audioFile ? (
                <>
                  📁 <strong>{audioFile.name}</strong> ({formatTime(audioBuffer?.duration || 0)})
                </>
              ) : (
                "Upload an audio file to get started"
              )}
            </div>

            <Button
              onClick={handleStartProcessing}
              disabled={!audioBuffer || isProcessing}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  ✨ Start Processing
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {isProcessing && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  <div>
                    <div className="font-medium">{getCurrentStatusMessage()}</div>
                    {(separationProgress || voiceProgress || captionProgress) && (
                      <div className="text-sm text-muted-foreground">
                        {separationProgress?.userMessage || 
                         voiceProgress?.userMessage || 
                         captionProgress?.userMessage}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm font-mono font-medium">
                  {overallProgress.toFixed(0)}%
                </div>
              </div>
              
              <Progress value={overallProgress} className="h-2" />
              
              {/* Step indicators */}
              <div className="flex items-center justify-center gap-4">
                {workflowPresets[selectedPreset as keyof typeof workflowPresets].steps.map((step, index) => {
                  const isActive = currentStep === step;
                  const isComplete = ['separation', 'voices', 'captions'].indexOf(step) < ['separation', 'voices', 'captions'].indexOf(currentStep);
                  
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                        isComplete ? "bg-green-500 text-white border-green-500" :
                        isActive ? "bg-blue-500 text-white border-blue-500" :
                        "bg-gray-200 text-gray-600 border-gray-300"
                      )}>
                        {isComplete ? <CheckCircle className="w-4 h-4" /> : index + 1}
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        isActive ? "text-blue-600" : isComplete ? "text-green-600" : "text-gray-500"
                      )}>
                        {step === 'separation' && '🎯 Separation'}
                        {step === 'voices' && '👥 Voices'}
                        {step === 'captions' && '📝 Captions'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <div className="font-medium text-red-800">Something went wrong</div>
                <div className="text-sm text-red-600">{error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Tabs */}
      {(separatedStreams || voiceProfiles.length > 0 || captions.length > 0) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="wizard" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Wizard
            </TabsTrigger>
            <TabsTrigger value="search" disabled={!audioBuffer || (voiceProfiles.length === 0 && captions.length === 0)} className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
              {(voiceProfiles.length > 0 || captions.length > 0) && <Badge variant="secondary" className="ml-1">
                ✨
              </Badge>}
            </TabsTrigger>
            <TabsTrigger value="streams" disabled={!separatedStreams} className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Audio
              {separatedStreams && <Badge variant="secondary" className="ml-1">
                {Object.keys(separatedStreams).length}
              </Badge>}
            </TabsTrigger>
            <TabsTrigger value="voices" disabled={voiceProfiles.length === 0} className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Speakers
              {voiceProfiles.length > 0 && <Badge variant="secondary" className="ml-1">
                {voiceProfiles.length}
              </Badge>}
            </TabsTrigger>
            <TabsTrigger value="captions" disabled={captions.length === 0} className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Captions
              {captions.length > 0 && <Badge variant="secondary" className="ml-1">
                {captions.length}
              </Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🎯 Processing Wizard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-lg font-medium mb-2">
                    {currentStep === 'complete' ? 
                      "🎉 All done! Check out your results in the other tabs." :
                      "Choose a preset above and click 'Start Processing' to begin!"
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Each preset automatically runs the perfect combination of AI tools for your needs.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <AudioSearchInterface
              audioBuffer={audioBuffer}
              voiceProfiles={voiceProfiles}
              captions={captions}
              onJumpToTime={handleJumpToTime}
              onPlaySegment={handlePlaySegment}
            />
          </TabsContent>

          <TabsContent value="streams" className="space-y-6">
            {separatedStreams && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-6 h-6" />
                    🎵 Separated Audio Streams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Object.entries(separatedStreams).map(([key, stream]) => (
                      <Card key={key} className="bg-white/70">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{stream.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(stream.confidence * 100)}% confident
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
                                <Play className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground text-center">
                            Ready for download or further processing
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="voices" className="space-y-6">
            {voiceProfiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    👥 Identified Speakers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {voiceProfiles.map((profile, index) => (
                      <Card key={profile.id} className="bg-white/70">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: profile.color }}
                              />
                              <span className="font-medium">{profile.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(profile.confidence * 100)}% confident
                              </Badge>
                            </div>
                            <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Voice Tone</div>
                              <div className="font-medium">{Math.round(profile.characteristics.averagePitch)} Hz</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Gender</div>
                              <div className="font-medium capitalize">{profile.characteristics.gender}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Speaking Time</div>
                              <div className="font-medium">
                                {formatTime(profile.segments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0))}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Segments</div>
                              <div className="font-medium">{profile.segments.length}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="captions" className="space-y-6">
            {captions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-6 h-6" />
                      📝 Auto-Generated Captions
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export SRT
                      </Button>
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        Export Text
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {captions.map((caption, index) => (
                      <div key={caption.id} className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
                        <div className="text-xs text-muted-foreground font-mono min-w-[60px]">
                          {formatTime(caption.startTime)}
                        </div>
                        <div className="flex-1">
                          {caption.speaker && (
                            <div className="text-xs font-medium text-blue-600 mb-1">
                              {caption.speaker}:
                            </div>
                          )}
                          <div className="text-sm">{caption.text}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Confidence: {Math.round(caption.confidence * 100)}%
                            {caption.language && ` • Language: ${caption.language}`}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default AdvancedAudioWorkspace;