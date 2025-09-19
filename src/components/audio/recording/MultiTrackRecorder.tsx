import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Play, Pause, Square, RotateCcw, Mic, MicOff, Volume2,
  Settings, Clock, FileAudio, Layers, Headphones
} from 'lucide-react';

export interface MultiTrackRecorderProps {
  maxTracks?: number;
  sampleRate?: number;
  bufferSize?: number;
  enableMetronome?: boolean;
  enableClickTrack?: boolean;
  onProjectSave?: (project: MultiTrackProject) => void;
  className?: string;
}

export interface TrackConfig {
  id: string;
  name: string;
  input: number;
  enabled: boolean;
  armed: boolean;
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  monitoring: boolean;
  recordEnable: boolean;
}

export interface MultiTrackProject {
  id: string;
  name: string;
  tracks: TrackConfig[];
  recordings: Map<string, AudioBuffer>;
  settings: ProjectSettings;
  createdAt: Date;
  lastModified: Date;
}

export interface ProjectSettings {
  sampleRate: number;
  bufferSize: number;
  tempo: number;
  timeSignature: [number, number];
  recordingMode: 'overdub' | 'replace' | 'punch';
  monitoringMode: 'off' | 'input' | 'playback';
}

export const MultiTrackRecorder: React.FC<MultiTrackRecorderProps> = ({
  maxTracks = 16,
  sampleRate = 48000,
  bufferSize = 512,
  enableMetronome = true,
  enableClickTrack = true,
  onProjectSave,
  className = ''
}) => {
  const [tracks, setTracks] = useState<TrackConfig[]>(() =>
    Array.from({ length: maxTracks }, (_, i) => ({
      id: `track-${i + 1}`,
      name: `Track ${i + 1}`,
      input: i,
      enabled: true,
      armed: false,
      muted: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      monitoring: false,
      recordEnable: true
    }))
  );

  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    sampleRate,
    bufferSize,
    tempo: 120,
    timeSignature: [4, 4],
    recordingMode: 'overdub',
    monitoringMode: 'input'
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [countIn, setCountIn] = useState(0);
  const [inputLevels, setInputLevels] = useState<Map<string, number>>(new Map());

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingNodesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const panNodesRef = useRef<Map<string, StereoPannerNode>>(new Map());
  const analyzerNodesRef = useRef<Map<string, AnalyserNode>>(new Map());
  const recordedBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const metronomeRef = useRef<{
    oscillator: OscillatorNode | null;
    gain: GainNode | null;
    nextBeatTime: number;
    beatCount: number;
  }>({
    oscillator: null,
    gain: null,
    nextBeatTime: 0,
    beatCount: 0
  });

  const initializeAudioContext = useCallback(async () => {
    try {
      const audioContext = new AudioContext({
        sampleRate: projectSettings.sampleRate,
        latencyHint: 'interactive'
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: maxTracks,
          sampleRate: projectSettings.sampleRate,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      audioContextRef.current = audioContext;
      mediaStreamRef.current = stream;

      tracks.forEach(track => {
        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        const panNode = audioContext.createStereoPanner();
        const analyzer = audioContext.createAnalyser();

        gainNode.gain.value = track.volume;
        panNode.pan.value = track.pan;
        analyzer.fftSize = 512;
        analyzer.smoothingTimeConstant = 0.8;

        source.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(analyzer);

        if (track.monitoring) {
          analyzer.connect(audioContext.destination);
        }

        recordingNodesRef.current.set(track.id, source);
        gainNodesRef.current.set(track.id, gainNode);
        panNodesRef.current.set(track.id, panNode);
        analyzerNodesRef.current.set(track.id, analyzer);
      });

      setupMetronome(audioContext);
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }, [tracks, maxTracks, projectSettings.sampleRate]);

  const setupMetronome = useCallback((audioContext: AudioContext) => {
    if (!enableMetronome) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 800;
    gain.gain.value = 0;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    metronomeRef.current = {
      oscillator,
      gain,
      nextBeatTime: audioContext.currentTime,
      beatCount: 0
    };
  }, [enableMetronome]);

  const scheduleMetronome = useCallback(() => {
    if (!audioContextRef.current || !metronomeRef.current.oscillator || !metronomeEnabled) return;

    const audioContext = audioContextRef.current;
    const metronome = metronomeRef.current;
    const secondsPerBeat = 60 / projectSettings.tempo;

    while (metronome.nextBeatTime < audioContext.currentTime + 0.1) {
      const isDownbeat = metronome.beatCount % projectSettings.timeSignature[0] === 0;
      const frequency = isDownbeat ? 1000 : 800;
      const volume = isDownbeat ? 0.3 : 0.2;

      if (metronome.oscillator) {
        metronome.oscillator.frequency.setValueAtTime(frequency, metronome.nextBeatTime);
      }

      if (metronome.gain) {
        metronome.gain.gain.setValueAtTime(volume, metronome.nextBeatTime);
        metronome.gain.gain.exponentialRampToValueAtTime(0.001, metronome.nextBeatTime + 0.1);
      }

      metronome.nextBeatTime += secondsPerBeat;
      metronome.beatCount++;
    }

    if (isPlaying || isRecording) {
      requestAnimationFrame(scheduleMetronome);
    }
  }, [isPlaying, isRecording, metronomeEnabled, projectSettings.tempo, projectSettings.timeSignature]);

  const updateInputLevels = useCallback(() => {
    analyzerNodesRef.current.forEach((analyzer, trackId) => {
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += (dataArray[i] / 255) ** 2;
      }

      const rms = Math.sqrt(sum / dataArray.length);
      setInputLevels(prev => new Map(prev.set(trackId, rms * 100)));
    });

    if (isRecording || isPlaying) {
      requestAnimationFrame(updateInputLevels);
    }
  }, [isRecording, isPlaying]);

  const startRecording = useCallback(async () => {
    if (!audioContextRef.current) {
      await initializeAudioContext();
    }

    if (countIn > 0) {
      setMetronomeEnabled(true);
      setTimeout(() => {
        setIsRecording(true);
        setIsPlaying(true);
        scheduleMetronome();
        updateInputLevels();
      }, (60 / projectSettings.tempo) * countIn * 1000);
    } else {
      setIsRecording(true);
      setIsPlaying(true);
      scheduleMetronome();
      updateInputLevels();
    }
  }, [countIn, projectSettings.tempo, initializeAudioContext, scheduleMetronome, updateInputLevels]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setIsPlaying(false);
    setMetronomeEnabled(false);
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      setMetronomeEnabled(false);
    } else {
      setIsPlaying(true);
      scheduleMetronome();
      updateInputLevels();
    }
  }, [isPlaying, scheduleMetronome, updateInputLevels]);

  const armTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track => ({
      ...track,
      armed: track.id === trackId ? !track.armed : track.armed
    })));
  }, []);

  const toggleMute = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, muted: !track.muted } : track
    ));
  }, []);

  const toggleSolo = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, solo: !track.solo } : track
    ));
  }, []);

  const toggleMonitoring = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, monitoring: !track.monitoring } : track
    ));

    const analyzer = analyzerNodesRef.current.get(trackId);
    if (analyzer && audioContextRef.current) {
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        if (track.monitoring) {
          analyzer.disconnect(audioContextRef.current.destination);
        } else {
          analyzer.connect(audioContextRef.current.destination);
        }
      }
    }
  }, [tracks]);

  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, volume } : track
    ));

    const gainNode = gainNodesRef.current.get(trackId);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }, []);

  const updateTrackPan = useCallback((trackId: string, pan: number) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, pan } : track
    ));

    const panNode = panNodesRef.current.get(trackId);
    if (panNode) {
      panNode.pan.value = pan;
    }
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-white text-xl font-semibold">Multi-Track Recorder</h2>
          <div className="text-gray-400 text-sm">
            {projectSettings.sampleRate / 1000}kHz • {projectSettings.tempo} BPM
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMetronomeEnabled(!metronomeEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              metronomeEnabled
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5" />
          </button>
          <Settings className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Circle className="w-5 h-5" />
                  <span>Record</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Square className="w-5 h-5" />
                  <span>Stop</span>
                </button>
              )}

              <button
                onClick={togglePlayback}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => setCurrentTime(0)}
                className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="text-white font-mono text-lg">
              {formatTime(currentTime)}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={countIn}
              onChange={(e) => setCountIn(parseInt(e.target.value))}
              className="bg-gray-800 text-white px-3 py-1 rounded border-none outline-none"
            >
              <option value={0}>No Count-in</option>
              <option value={1}>1 Bar</option>
              <option value={2}>2 Bars</option>
              <option value={4}>4 Bars</option>
            </select>

            <div className="text-gray-400 text-sm">
              {projectSettings.timeSignature[0]}/{projectSettings.timeSignature[1]}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-gray-400 text-sm mb-2 px-2">
          <div className="col-span-2">Track</div>
          <div className="col-span-1 text-center">Arm</div>
          <div className="col-span-1 text-center">M</div>
          <div className="col-span-1 text-center">S</div>
          <div className="col-span-1 text-center">Mon</div>
          <div className="col-span-2">Volume</div>
          <div className="col-span-2">Pan</div>
          <div className="col-span-2">Level</div>
        </div>

        {tracks.map((track) => (
          <div
            key={track.id}
            className={`grid grid-cols-12 gap-2 items-center bg-gray-800 rounded-lg p-3 transition-colors ${
              track.armed ? 'ring-2 ring-red-500' : ''
            }`}
          >
            <div className="col-span-2">
              <input
                type="text"
                value={track.name}
                onChange={(e) => setTracks(prev => prev.map(t =>
                  t.id === track.id ? { ...t, name: e.target.value } : t
                ))}
                className="bg-transparent text-white border-none outline-none w-full"
              />
            </div>

            <div className="col-span-1 flex justify-center">
              <button
                onClick={() => armTrack(track.id)}
                className={`p-2 rounded-lg transition-colors ${
                  track.armed
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            <div className="col-span-1 flex justify-center">
              <button
                onClick={() => toggleMute(track.id)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  track.muted
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                M
              </button>
            </div>

            <div className="col-span-1 flex justify-center">
              <button
                onClick={() => toggleSolo(track.id)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  track.solo
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                S
              </button>
            </div>

            <div className="col-span-1 flex justify-center">
              <button
                onClick={() => toggleMonitoring(track.id)}
                className={`p-2 rounded-lg transition-colors ${
                  track.monitoring
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Headphones className="w-4 h-4" />
              </button>
            </div>

            <div className="col-span-2 flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={track.volume}
                onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-gray-400 text-xs w-8">
                {Math.round(track.volume * 100)}
              </span>
            </div>

            <div className="col-span-2 flex items-center space-x-2">
              <span className="text-gray-400 text-xs">L</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={track.pan}
                onChange={(e) => updateTrackPan(track.id, parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-gray-400 text-xs">R</span>
            </div>

            <div className="col-span-2">
              <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full transition-all duration-75 ease-out"
                  style={{
                    width: `${Math.min(inputLevels.get(track.id) || 0, 100)}%`,
                    background: (inputLevels.get(track.id) || 0) > 90
                      ? '#ef4444'
                      : (inputLevels.get(track.id) || 0) > 75
                        ? '#f59e0b'
                        : '#10b981'
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};