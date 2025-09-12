"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AudioUpload } from '@/components/audio/audio-upload';
import { AdvancedAudioWorkspace } from '@/components/audio/advanced-audio-workspace';
import { MobileDashboard } from '@/components/mobile/mobile-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AudioFile } from '@/types';
import { EMOJIS } from '@/constants';
import { Upload, Settings, User, BarChart3, Wand2, History } from 'lucide-react';

export default function Dashboard() {
  const { userId } = useAuth();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentAudioBuffer, setCurrentAudioBuffer] = useState<AudioBuffer | null>(null);
  const [activeTab, setActiveTab] = useState('processor');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(isMobileDevice || (isSmallScreen && isTouchDevice));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadUserAudioFiles = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/user/audio-files');
      if (response.ok) {
        const { files } = await response.json();
        setAudioFiles(files);
      }
    } catch (error) {
      console.error('Error loading audio files:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadUserAudioFiles();
    }
  }, [userId, loadUserAudioFiles]);

  const handleFileUpload = async (file: File, duration?: number) => {
    if (!userId) return;

    setIsProcessing(true);
    setCurrentFile(file);
    
    try {
      // Convert file to AudioBuffer
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setCurrentAudioBuffer(audioBuffer);

      // Upload file via API for storage
      const formData = new FormData();
      formData.append('file', file);
      if (duration) formData.append('duration', duration.toString());
      
      const response = await fetch('/api/user/audio-files', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        await loadUserAudioFiles();
      }
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Use mobile dashboard for mobile devices
  if (isMobile) {
    return <MobileDashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {EMOJIS.DASHBOARD} ANC Audio Pro Dashboard
            </h1>
            <p className="text-muted-foreground">
              Advanced AI-powered audio processing with smart separation, voice recognition, and auto captions
            </p>
          </div>
          
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="processor" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              ✨ AI Processor
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              📁 Upload
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              📂 Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="processor" className="space-y-6">
            {currentFile && currentAudioBuffer ? (
              <AdvancedAudioWorkspace
                audioFile={currentFile}
                audioBuffer={currentAudioBuffer}
              />
            ) : (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Wand2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-lg font-medium text-gray-600 mb-2">
                    Ready for AI Processing
                  </div>
                  <div className="text-sm text-gray-500 mb-6">
                    Upload an audio file to start using our advanced AI features
                  </div>
                  <Button 
                    onClick={() => setActiveTab('upload')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Go to Upload
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  📁 Upload Audio File
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AudioUpload 
                  onFileUpload={handleFileUpload}
                  isLoading={isProcessing}
                />
                {currentFile && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <div>
                        <div className="font-medium text-green-800 dark:text-green-200">
                          📄 {currentFile.name} loaded successfully!
                        </div>
                        <div className="text-sm text-green-600 dark:text-green-300">
                          Ready for AI processing. Go to the AI Processor tab to continue.
                        </div>
                      </div>
                      <Button 
                        onClick={() => setActiveTab('processor')}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Process Now
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  📂 Your Audio Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                {audioFiles.length > 0 ? (
                  <div className="space-y-4">
                    {audioFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{file.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {file.format?.toUpperCase()} • {Math.round(file.duration || 0)}s • {Math.round((file.file_size || 0) / 1024 / 1024 * 100) / 100}MB
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            file.is_processed 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {file.is_processed ? '✅ Processed' : '⏳ Processing'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      📁 No audio files uploaded yet
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Upload your first audio file to get started with AI processing
                    </p>
                    <Button 
                      onClick={() => setActiveTab('upload')}
                      variant="outline"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}