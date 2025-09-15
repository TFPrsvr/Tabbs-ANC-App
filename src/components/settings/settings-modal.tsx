"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Volume2, Headphones, Mic, Monitor, Palette, Shield, Bell } from 'lucide-react';
import { NotificationsSettings } from './notifications-settings';

interface SettingsModalProps {
  children: React.ReactNode;
}

export function SettingsModal({ children }: SettingsModalProps) {
  const [audioSettings, setAudioSettings] = useState({
    outputGain: [0.8],
    inputGain: [0.7],
    sampleRate: '48000',
    bufferSize: '512',
    enableANC: true,
    enableSpatialAudio: false,
    voiceSeparation: true,
    realTimeProcessing: true
  });

  const [displaySettings, setDisplaySettings] = useState({
    theme: 'system',
    visualizations: true,
    animations: true,
    highContrast: false,
    colorBlindMode: false
  });

  const [privacySettings, setPrivacySettings] = useState({
    telemetry: false,
    analytics: true,
    crashReports: true,
    personalizedAds: false
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            🔧 ANC Audio Pro Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="audio" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="processing" className="flex items-center gap-2">
              <Headphones className="w-4 h-4" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Display
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  🎚️ Audio Levels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Output Gain: {Math.round(audioSettings.outputGain[0] * 100)}%</Label>
                  <Slider
                    value={audioSettings.outputGain}
                    onValueChange={(value) => setAudioSettings(prev => ({ ...prev, outputGain: value }))}
                    max={1}
                    min={0}
                    step={0.01}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Input Gain: {Math.round(audioSettings.inputGain[0] * 100)}%</Label>
                  <Slider
                    value={audioSettings.inputGain}
                    onValueChange={(value) => setAudioSettings(prev => ({ ...prev, inputGain: value }))}
                    max={1}
                    min={0}
                    step={0.01}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sample Rate</Label>
                    <Select
                      value={audioSettings.sampleRate}
                      onValueChange={(value) => setAudioSettings(prev => ({ ...prev, sampleRate: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="44100">44.1 kHz (CD Quality)</SelectItem>
                        <SelectItem value="48000">48 kHz (Professional)</SelectItem>
                        <SelectItem value="96000">96 kHz (High-Res)</SelectItem>
                        <SelectItem value="192000">192 kHz (Studio)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Buffer Size</Label>
                    <Select
                      value={audioSettings.bufferSize}
                      onValueChange={(value) => setAudioSettings(prev => ({ ...prev, bufferSize: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="128">128 samples (Low Latency)</SelectItem>
                        <SelectItem value="256">256 samples (Balanced)</SelectItem>
                        <SelectItem value="512">512 samples (Stable)</SelectItem>
                        <SelectItem value="1024">1024 samples (High Quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationsSettings />
          </TabsContent>

          <TabsContent value="processing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="w-5 h-5" />
                  🧠 AI Processing Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Active Noise Cancellation</Label>
                    <p className="text-sm text-muted-foreground">
                      Advanced hybrid ANC with adaptive filtering
                    </p>
                  </div>
                  <Switch
                    checked={audioSettings.enableANC}
                    onCheckedChange={(checked) => setAudioSettings(prev => ({ ...prev, enableANC: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Spatial Audio Processing</Label>
                    <p className="text-sm text-muted-foreground">
                      3D audio positioning and binaural rendering
                    </p>
                  </div>
                  <Switch
                    checked={audioSettings.enableSpatialAudio}
                    onCheckedChange={(checked) => setAudioSettings(prev => ({ ...prev, enableSpatialAudio: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Voice Separation</Label>
                    <p className="text-sm text-muted-foreground">
                      AI-powered isolation of voice frequencies
                    </p>
                  </div>
                  <Switch
                    checked={audioSettings.voiceSeparation}
                    onCheckedChange={(checked) => setAudioSettings(prev => ({ ...prev, voiceSeparation: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Real-Time Processing</Label>
                    <p className="text-sm text-muted-foreground">
                      Live audio analysis and instant adjustments
                    </p>
                  </div>
                  <Switch
                    checked={audioSettings.realTimeProcessing}
                    onCheckedChange={(checked) => setAudioSettings(prev => ({ ...prev, realTimeProcessing: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="display" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  🎨 Appearance & Interface
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={displaySettings.theme}
                    onValueChange={(value) => setDisplaySettings(prev => ({ ...prev, theme: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Audio Visualizations</Label>
                    <p className="text-sm text-muted-foreground">
                      Show spectrum analyzer and waveform displays
                    </p>
                  </div>
                  <Switch
                    checked={displaySettings.visualizations}
                    onCheckedChange={(checked) => setDisplaySettings(prev => ({ ...prev, visualizations: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Smooth Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable UI transitions and animations
                    </p>
                  </div>
                  <Switch
                    checked={displaySettings.animations}
                    onCheckedChange={(checked) => setDisplaySettings(prev => ({ ...prev, animations: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Improved visibility for accessibility
                    </p>
                  </div>
                  <Switch
                    checked={displaySettings.highContrast}
                    onCheckedChange={(checked) => setDisplaySettings(prev => ({ ...prev, highContrast: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Color Blind Friendly</Label>
                    <p className="text-sm text-muted-foreground">
                      Adjust colors for color vision deficiency
                    </p>
                  </div>
                  <Switch
                    checked={displaySettings.colorBlindMode}
                    onCheckedChange={(checked) => setDisplaySettings(prev => ({ ...prev, colorBlindMode: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  🔒 Privacy & Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Telemetry Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Share usage data to improve the app
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.telemetry}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, telemetry: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Analytics</Label>
                    <p className="text-sm text-muted-foreground">
                      Anonymous usage analytics for app improvement
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.analytics}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, analytics: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Crash Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send error reports to help fix bugs
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.crashReports}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, crashReports: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Personalized Recommendations</Label>
                    <p className="text-sm text-muted-foreground">
                      Use your data to suggest audio processing presets
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.personalizedAds}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, personalizedAds: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline">Reset to Defaults</Button>
          <Button>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}