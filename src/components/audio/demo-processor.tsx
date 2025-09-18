"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Wand2,
  Upload,
  Play,
  Pause,
  BarChart3,
  Mic,
  Headphones,
  Volume2,
  Zap,
  Brain,
  Radio,
  TrendingUp
} from 'lucide-react';

interface DemoProcessorProps {
  onUploadClick: () => void;
}

export function DemoProcessor({ onUploadClick }: DemoProcessorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: Brain,
      title: 'AI Voice Separation',
      description: 'Isolate and enhance voice frequencies using advanced machine learning',
      color: 'from-blue-500 to-purple-600',
      metric: '99.2% accuracy'
    },
    {
      icon: Headphones,
      title: 'Active Noise Cancellation',
      description: 'Studio-grade ANC with adaptive filtering for pristine audio',
      color: 'from-green-500 to-blue-500',
      metric: '-35dB reduction'
    },
    {
      icon: Radio,
      title: 'Spatial Audio Processing',
      description: '3D audio positioning with binaural rendering technology',
      color: 'from-purple-500 to-pink-500',
      metric: '360° immersion'
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analysis',
      description: 'Live spectral analysis with psychoacoustic modeling',
      color: 'from-orange-500 to-red-500',
      metric: '<5ms latency'
    }
  ];

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setDemoProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 2;
        });
      }, 100);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isPlaying]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  const handleDemoPlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setDemoProgress(0);
      // Start demo audio processing simulation
      const interval = setInterval(() => {
        setDemoProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            return 100;
          }
          return prev + 2;
        });
      }, 100);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Demo Card */}
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">🧠 AI Audio Processor Demo</h3>
              <p className="text-sm text-muted-foreground font-normal">
                Experience the power of advanced audio processing without uploading files
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demo Controls */}
          <div className="flex items-center justify-between gap-6 max-w-2xl mx-auto">
            <Button
              onClick={handleDemoPlay}
              size="lg"
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause Demo
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  ▶️ Start Audio Demo
                </>
              )}
            </Button>
            <Button onClick={onUploadClick} variant="outline" size="lg" className="flex-1">
              <Upload className="w-5 h-5 mr-2" />
              📁 Upload Real File
            </Button>
          </div>

          {/* Demo Progress */}
          {isPlaying && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing demo audio...</span>
                <span>{Math.round(demoProgress)}%</span>
              </div>
              <Progress value={demoProgress} className="h-2" />
            </div>
          )}

          {/* Live Demo Visualization */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Input Level</span>
              </div>
              <div className="space-y-1">
                <Progress value={isPlaying ? 75 + Math.sin(Date.now() / 1000) * 15 : 0} className="h-1" />
                <div className="text-xs text-muted-foreground">-12.3 dB</div>
              </div>
            </Card>

            <Card className="p-4 bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">AI Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-xs">{isPlaying ? 'Active' : 'Standby'}</span>
              </div>
            </Card>

            <Card className="p-4 bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Output Level</span>
              </div>
              <div className="space-y-1">
                <Progress value={isPlaying ? 85 + Math.cos(Date.now() / 800) * 10 : 0} className="h-1" />
                <div className="text-xs text-muted-foreground">-8.7 dB</div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Feature Showcase */}
      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isActive = index === activeFeature;

          return (
            <Card
              key={index}
              className={`transition-all duration-500 cursor-pointer ${
                isActive
                  ? 'ring-2 ring-purple-400 shadow-lg scale-105'
                  : 'hover:shadow-md hover:scale-102'
              }`}
              onClick={() => setActiveFeature(index)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${feature.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{feature.title}</h4>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {feature.metric}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {feature.description}
                </p>
                {isActive && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Currently demonstrating</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-700 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            📊 Processing Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">44.1kHz</div>
              <div className="text-xs text-muted-foreground">Sample Rate</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">24-bit</div>
              <div className="text-xs text-muted-foreground">Bit Depth</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-green-200">
              <div className="text-2xl font-bold text-green-600">&lt;5ms</div>
              <div className="text-xs text-muted-foreground">Latency</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">99.2%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-br from-rose-200 via-pink-100 to-orange-200 dark:from-rose-300/20 dark:via-pink-200/20 dark:to-orange-300/20 border-rose-300">
        <CardContent className="pt-6 text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-xl font-bold mb-2 text-rose-800 dark:text-rose-100">Ready to Process Your Audio?</h3>
          <p className="mb-6 text-rose-700 dark:text-rose-200">
            Upload your audio files to experience the full power of AI-driven audio processing
          </p>
          <Button
            onClick={onUploadClick}
            size="lg"
            variant="secondary"
            className="bg-white text-rose-700 hover:bg-rose-50 shadow-lg border-2 border-rose-300 font-semibold transition-colors"
          >
            <Upload className="w-5 h-5 mr-2 text-rose-700" />
            <span className="text-rose-700 font-semibold">📁 Upload Audio File</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}