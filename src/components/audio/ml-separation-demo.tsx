'use client';

/**
 * ML Audio Separation Demo Component
 * Demonstrates the new ML model integration for real audio separation
 */

import React, { useState, useRef, useCallback } from 'react';
import { AdvancedAudioSeparator, AudioStem, SeparationResult } from '@/lib/audio';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, Pause, Download, Brain, Cpu, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ProcessingStatus {
  isProcessing: boolean;
  progress: number;
  stage: string;
  currentModel?: string;
  processingMode?: string;
}

export function MLSeparationDemo() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [separationResult, setSeparationResult] = useState<SeparationResult | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    stage: 'Ready'
  });

  // Configuration state
  const [modelType, setModelType] = useState<'spleeter' | 'demucs' | 'open-unmix'>('spleeter');
  const [quality, setQuality] = useState<'basic' | 'standard' | 'professional' | 'studio'>('standard');
  const [processingMode, setProcessingMode] = useState<'server' | 'browser' | 'hybrid'>('hybrid');
  const [useMLModels, setUseMLModels] = useState(true);
  const [selectedStems, setSelectedStems] = useState<string[]>(['vocals', 'drums', 'bass', 'other']);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const separatorRef = useRef<AdvancedAudioSeparator | null>(null);

  // Initialize audio separator
  React.useEffect(() => {
    separatorRef.current = new AdvancedAudioSeparator();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const supportedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/ogg'];
    if (!supportedTypes.includes(file.type)) {
      toast.error('Unsupported file format. Please use WAV, MP3, FLAC, or OGG.');
      return;
    }

    // Validate file size (50MB limit for demo)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size: 50MB');
      return;
    }

    setAudioFile(file);
    setSeparationResult(null);

    try {
      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Decode audio file
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      setAudioBuffer(audioBuffer);

      toast.success(`Audio loaded: ${file.name} (${audioBuffer.duration.toFixed(1)}s)`);
    } catch (error) {
      console.error('Failed to load audio:', error);
      toast.error('Failed to load audio file');
    }
  }, []);

  const handleSeparation = useCallback(async () => {
    if (!audioBuffer || !separatorRef.current) {
      toast.error('No audio file loaded');
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      progress: 0,
      stage: 'Initializing...',
      currentModel: modelType,
      processingMode
    });

    try {
      // Update progress during processing
      const progressInterval = setInterval(() => {
        setProcessingStatus(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 2, 90)
        }));
      }, 200);

      // Configure separation options
      const options = {
        quality,
        stemTypes: selectedStems as any[],
        preserveOriginal: true,
        adaptiveProcessing: true,
        useMLModels,
        modelType,
        processingMode
      };

      setProcessingStatus(prev => ({
        ...prev,
        stage: useMLModels ? `Processing with ${modelType} (${processingMode} mode)...` : 'Processing with DSP algorithms...'
      }));

      // Perform separation
      const result = await separatorRef.current.separateAudio(audioBuffer, options);

      clearInterval(progressInterval);
      setProcessingStatus(prev => ({
        ...prev,
        progress: 100,
        stage: 'Complete!'
      }));

      setSeparationResult(result);

      toast.success(`Separation complete! Generated ${result.stems.length} stems in ${(result.processingTime / 1000).toFixed(1)}s`);

    } catch (error) {
      console.error('Separation failed:', error);
      toast.error(`Separation failed: ${error.message}`);

      setProcessingStatus({
        isProcessing: false,
        progress: 0,
        stage: 'Error'
      });
    } finally {
      setTimeout(() => {
        setProcessingStatus(prev => ({
          ...prev,
          isProcessing: false
        }));
      }, 1000);
    }
  }, [audioBuffer, modelType, quality, processingMode, useMLModels, selectedStems]);

  const handleStemToggle = useCallback((stemType: string) => {
    setSelectedStems(prev =>
      prev.includes(stemType)
        ? prev.filter(s => s !== stemType)
        : [...prev, stemType]
    );
  }, []);

  const downloadStem = useCallback(async (stem: AudioStem) => {
    try {
      // Convert AudioBuffer to WAV blob
      const channelData = stem.buffer.getChannelData(0);
      const length = channelData.length;
      const arrayBuffer = new ArrayBuffer(44 + length * 2);
      const view = new DataView(arrayBuffer);

      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, stem.buffer.sampleRate, true);
      view.setUint32(28, stem.buffer.sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length * 2, true);

      // Convert audio data
      let offset = 44;
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }

      // Create and download
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stem.name.toLowerCase().replace(/\s+/g, '_')}.wav`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${stem.name}`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            ML Audio Separation Demo
          </CardTitle>
          <CardDescription>
            Test the new ML model integration with Spleeter, Demucs, and Open-Unmix for professional audio stem separation.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload Audio File</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={processingStatus.isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              {audioFile && (
                <Badge variant="secondary">
                  {audioFile.name} ({Math.round(audioFile.size / 1024 / 1024)}MB)
                </Badge>
              )}
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>ML Model</Label>
              <Select value={modelType} onValueChange={(value: any) => setModelType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spleeter">Spleeter (Fast)</SelectItem>
                  <SelectItem value="demucs">Demucs (High Quality)</SelectItem>
                  <SelectItem value="open-unmix">Open-Unmix (Research)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quality</Label>
              <Select value={quality} onValueChange={(value: any) => setQuality(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Processing Mode</Label>
              <Select value={processingMode} onValueChange={(value: any) => setProcessingMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Hybrid (Recommended)
                    </div>
                  </SelectItem>
                  <SelectItem value="server">
                    <div className="flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      Server (High Quality)
                    </div>
                  </SelectItem>
                  <SelectItem value="browser">
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      Browser (Fast)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Use ML Models
                <Switch
                  checked={useMLModels}
                  onCheckedChange={setUseMLModels}
                />
              </Label>
              <p className="text-xs text-muted-foreground">
                {useMLModels ? 'Using AI models' : 'Using DSP fallback'}
              </p>
            </div>
          </div>

          {/* Stem Selection */}
          <div className="space-y-2">
            <Label>Stems to Extract</Label>
            <div className="flex flex-wrap gap-2">
              {['vocals', 'drums', 'bass', 'piano', 'guitar', 'other'].map(stemType => (
                <Badge
                  key={stemType}
                  variant={selectedStems.includes(stemType) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleStemToggle(stemType)}
                >
                  {stemType.charAt(0).toUpperCase() + stemType.slice(1)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Processing */}
          <div className="space-y-4">
            <Button
              onClick={handleSeparation}
              disabled={!audioBuffer || processingStatus.isProcessing || selectedStems.length === 0}
              className="w-full"
              size="lg"
            >
              {processingStatus.isProcessing ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-pulse" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Separate Audio
                </>
              )}
            </Button>

            {processingStatus.isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{processingStatus.stage}</span>
                  <span>{processingStatus.progress}%</span>
                </div>
                <Progress value={processingStatus.progress} />
                {processingStatus.currentModel && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Brain className="h-3 w-3" />
                    Model: {processingStatus.currentModel} ({processingStatus.processingMode})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {separationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Separation Results</CardTitle>
                <CardDescription>
                  Processed in {(separationResult.processingTime / 1000).toFixed(1)}s •
                  Quality: {separationResult.quality} •
                  {separationResult.metadata?.processingMethod && (
                    <span className="ml-1">Method: {separationResult.metadata.processingMethod}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {separationResult.stems.map((stem) => (
                    <div key={stem.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div>
                          <h4 className="font-medium">{stem.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Confidence: {(stem.confidence * 100).toFixed(0)}%</span>
                            <span>Harmonic: {(stem.harmonicContent * 100).toFixed(0)}%</span>
                            <span>Rhythmic: {(stem.rhythmicContent * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadStem(stem)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}