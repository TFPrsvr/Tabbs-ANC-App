import React, { useState, useRef, useCallback } from 'react';
import {
  Play, Pause, Square, RotateCcw, Save, Upload, Download,
  Mic, Settings, Volume2, Scissors, Copy, Trash2
} from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';

export interface RecordingStudioProps {
  onSave?: (recording: AudioRecording) => void;
  onExport?: (recording: AudioRecording, format: ExportFormat) => void;
  maxTracks?: number;
  className?: string;
}

export interface AudioRecording {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  sampleRate: number;
  channels: number;
  createdAt: Date;
  waveformData: number[];
}

export interface RecordingTrack {
  id: string;
  name: string;
  recording: AudioRecording | null;
  volume: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
}

export interface ExportFormat {
  format: 'wav' | 'mp3' | 'flac' | 'aac';
  quality: 'low' | 'medium' | 'high' | 'lossless';
  sampleRate: number;
  bitDepth?: number;
  bitrate?: number;
}

export const RecordingStudio: React.FC<RecordingStudioProps> = ({
  onSave,
  onExport,
  maxTracks = 8,
  className = ''
}) => {
  const [tracks, setTracks] = useState<RecordingTrack[]>(() =>
    Array.from({ length: maxTracks }, (_, i) => ({
      id: `track-${i + 1}`,
      name: `Track ${i + 1}`,
      recording: null,
      volume: 0.8,
      muted: false,
      solo: false,
      armed: i === 0
    }))
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<string>('track-1');
  const [showSettings, setShowSettings] = useState(false);
  const [projectName, setProjectName] = useState('Untitled Project');

  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackSourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());

  const handleRecordingComplete = useCallback((audioBlob: Blob, duration: number) => {
    const recording: AudioRecording = {
      id: `recording-${Date.now()}`,
      name: `Recording ${new Date().toLocaleTimeString()}`,
      blob: audioBlob,
      duration,
      sampleRate: 48000,
      channels: 2,
      createdAt: new Date(),
      waveformData: []
    };

    setTracks(prev => prev.map(track =>
      track.id === selectedTrack
        ? { ...track, recording }
        : track
    ));

    setTotalDuration(prev => Math.max(prev, duration));
    generateWaveform(recording);
  }, [selectedTrack]);

  const generateWaveform = useCallback(async (recording: AudioRecording) => {
    try {
      const arrayBuffer = await recording.blob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const samples = audioBuffer.getChannelData(0);
      const blockSize = Math.floor(samples.length / 1000);
      const waveformData: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, samples.length);
        let sum = 0;

        for (let j = start; j < end; j++) {
          sum += Math.abs(samples[j] ?? 0);
        }

        waveformData.push(sum / (end - start));
      }

      setTracks(prev => prev.map(track =>
        track.recording?.id === recording.id
          ? { ...track, recording: { ...recording, waveformData } }
          : track
      ));

      audioContext.close();
    } catch (error) {
      console.error('Failed to generate waveform:', error);
    }
  }, []);

  const playAllTracks = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;
    const activeTrackData = await Promise.all(
      tracks
        .filter(track => track.recording && !track.muted)
        .map(async track => {
          const arrayBuffer = await track.recording!.blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          return { track, audioBuffer };
        })
    );

    activeTrackData.forEach(({ track, audioBuffer }) => {
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = track.volume * (track.solo ? 1 : 0.8);

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      source.start(0, currentTime);
      playbackSourcesRef.current.set(track.id, source);
      gainNodesRef.current.set(track.id, gainNode);
    });

    setIsPlaying(true);
  }, [tracks, currentTime]);

  const stopPlayback = useCallback(() => {
    playbackSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (error) {
        console.error('Error stopping source:', error);
      }
    });

    playbackSourcesRef.current.clear();
    gainNodesRef.current.clear();
    setIsPlaying(false);
  }, []);

  const resetPlayback = useCallback(() => {
    stopPlayback();
    setCurrentTime(0);
  }, [stopPlayback]);

  const armTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track => ({
      ...track,
      armed: track.id === trackId
    })));
    setSelectedTrack(trackId);
  }, []);

  const toggleMute = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, muted: !track.muted }
        : track
    ));
  }, []);

  const toggleSolo = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, solo: !track.solo }
        : track
    ));
  }, []);

  const updateVolume = useCallback((trackId: string, volume: number) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, volume }
        : track
    ));

    const gainNode = gainNodesRef.current.get(trackId);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }, []);

  const deleteRecording = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, recording: null }
        : track
    ));
  }, []);

  const duplicateRecording = useCallback((sourceTrackId: string, targetTrackId: string) => {
    const sourceTrack = tracks.find(t => t.id === sourceTrackId);
    if (sourceTrack?.recording) {
      setTracks(prev => prev.map(track =>
        track.id === targetTrackId
          ? { ...track, recording: { ...sourceTrack.recording!, id: `recording-${Date.now()}` } }
          : track
      ));
    }
  }, [tracks]);

  const exportProject = useCallback((format: ExportFormat) => {
    const recordingsToExport = tracks
      .filter(track => track.recording)
      .map(track => track.recording!);

    if (recordingsToExport.length === 0) return;

    recordingsToExport.forEach(recording => {
      onExport?.(recording, format);
    });
  }, [tracks, onExport]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-gray-800 text-white px-3 py-1 rounded border-none outline-none focus:bg-gray-700"
          />
          <div className="text-gray-400 text-sm">
            {tracks.filter(t => t.recording).length} tracks
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => exportProject({ format: 'wav', quality: 'lossless', sampleRate: 48000, bitDepth: 24 })}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {!isPlaying ? (
                <button
                  onClick={playAllTracks}
                  className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors"
                >
                  <Play className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={stopPlayback}
                  className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-colors"
                >
                  <Pause className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={resetPlayback}
                className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="text-white font-mono text-lg">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`bg-gray-800 rounded-lg p-4 border-2 transition-colors ${
              track.armed ? 'border-red-500' : 'border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
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

                <input
                  type="text"
                  value={track.name}
                  onChange={(e) => setTracks(prev => prev.map(t =>
                    t.id === track.id ? { ...t, name: e.target.value } : t
                  ))}
                  className="bg-transparent text-white border-none outline-none focus:bg-gray-700 px-2 py-1 rounded"
                />
              </div>

              <div className="flex items-center space-x-2">
                {track.recording && (
                  <>
                    <button
                      onClick={() => duplicateRecording(track.id, tracks.find(t => !t.recording)?.id || '')}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      disabled={!tracks.some(t => !t.recording)}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRecording(track.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => toggleMute(track.id)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    track.muted
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  M
                </button>

                <button
                  onClick={() => toggleSolo(track.id)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    track.solo
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  S
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                {track.recording ? (
                  <div className="bg-gray-700 rounded-lg p-2 h-16 flex items-center">
                    <div className="flex-1 h-8 flex items-end space-x-px">
                      {track.recording.waveformData.slice(0, 100).map((amplitude, i) => (
                        <div
                          key={i}
                          className="bg-blue-500 w-1 transition-all duration-75"
                          style={{ height: `${Math.max(2, amplitude * 32)}px` }}
                        />
                      ))}
                    </div>
                    <div className="text-gray-400 text-sm ml-4">
                      {formatTime(track.recording.duration)}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center text-gray-400">
                    {track.armed ? 'Ready to record' : 'Empty track'}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 w-32">
                <Volume2 className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => updateVolume(track.id, parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-gray-400 text-sm w-8">
                  {Math.round(track.volume * 100)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tracks.some(track => track.armed) && (
        <div className="mt-6">
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            sampleRate={48000}
            channels={2}
            bitDepth={24}
            format="wav"
            maxDuration={3600}
          />
        </div>
      )}
    </div>
  );
};