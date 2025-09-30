import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Square, Circle, Clock, Mic, MicOff, Volume2 } from 'lucide-react';

export interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  maxDuration?: number;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  format?: 'wav' | 'mp3' | 'flac';
  enableMonitoring?: boolean;
  inputGain?: number;
  className?: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  currentLevel: number;
  peakLevel: number;
  clipping: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 3600,
  sampleRate = 48000,
  channels = 2,
  bitDepth = 24,
  format = 'wav',
  enableMonitoring = true,
  inputGain = 1.0,
  className = ''
}) => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    currentLevel: 0,
    peakLevel: 0,
    clipping: false
  });

  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const levelUpdateRef = useRef<number | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const updateLevels = useCallback(() => {
    if (!analyzerRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    let max = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const level = (dataArray[i] ?? 0) / 255;
      sum += level * level;
      max = Math.max(max, level);
    }

    const rms = Math.sqrt(sum / dataArray.length);
    const currentLevel = rms * 100;
    const peakLevel = max * 100;
    const clipping = peakLevel > 95;

    setState(prev => ({
      ...prev,
      currentLevel,
      peakLevel: Math.max(prev.peakLevel * 0.95, peakLevel),
      clipping
    }));

    if (state.isRecording && !state.isPaused) {
      levelUpdateRef.current = requestAnimationFrame(updateLevels);
    }
  }, [state.isRecording, state.isPaused]);

  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: channels,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      audioStreamRef.current = stream;
      setHasPermission(true);

      const audioContext = new AudioContext({ sampleRate });
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();

      analyzer.fftSize = 2048;
      analyzer.smoothingTimeConstant = 0.8;

      gainNode.gain.value = inputGain;

      source.connect(gainNode);
      gainNode.connect(analyzer);

      if (enableMonitoring) {
        gainNode.connect(audioContext.destination);
      }

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;
      gainNodeRef.current = gainNode;

      setIsInitialized(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      setHasPermission(false);
    }
  }, [sampleRate, channels, inputGain, enableMonitoring]);

  const startRecording = useCallback(async () => {
    if (!audioStreamRef.current) {
      await initializeAudio();
      return;
    }

    try {
      const mimeType = format === 'mp3' ? 'audio/mpeg' :
                     format === 'flac' ? 'audio/flac' : 'audio/wav';

      const mediaRecorder = new MediaRecorder(audioStreamRef.current, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm'
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete?.(blob, state.duration);
        chunksRef.current = [];
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0
      }));

      timerRef.current = setInterval(() => {
        setState(prev => {
          const newDuration = prev.duration + 0.1;
          if (newDuration >= maxDuration) {
            stopRecording();
            return prev;
          }
          return { ...prev, duration: newDuration };
        });
      }, 100);

      levelUpdateRef.current = requestAnimationFrame(updateLevels);
      onRecordingStart?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }, [format, maxDuration, updateLevels, onRecordingStart, onRecordingComplete, state.duration, initializeAudio]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));

      if (levelUpdateRef.current) {
        cancelAnimationFrame(levelUpdateRef.current);
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      levelUpdateRef.current = requestAnimationFrame(updateLevels);
    }
  }, [updateLevels]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (levelUpdateRef.current) {
      cancelAnimationFrame(levelUpdateRef.current);
      levelUpdateRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      currentLevel: 0,
      peakLevel: 0,
      clipping: false
    }));

    onRecordingStop?.();
  }, [onRecordingStop]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopRecording]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = inputGain;
    }
  }, [inputGain]);

  if (!hasPermission && !isInitialized) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <MicOff className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">
            Microphone Access Required
          </h3>
          <p className="text-gray-400 mb-4">
            {error || 'Please allow microphone access to start recording'}
          </p>
          <button
            onClick={initializeAudio}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Enable Microphone
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {state.isRecording ? (
              <Circle className="w-4 h-4 text-red-500 animate-pulse" />
            ) : (
              <Mic className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-white font-medium">
              {state.isRecording ? (state.isPaused ? 'Paused' : 'Recording') : 'Ready'}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg">
              {formatTime(state.duration)}
            </span>
            {maxDuration < 3600 && (
              <span className="text-sm">
                / {formatTime(maxDuration)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <div className="text-sm text-gray-400">
            {Math.round(state.currentLevel)}%
          </div>
          {state.clipping && (
            <div className="text-red-500 text-sm font-semibold">CLIP</div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-gray-400 text-sm">Input Level</span>
          <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-75 ease-out"
              style={{
                width: `${Math.min(state.currentLevel, 100)}%`,
                background: state.clipping
                  ? '#ef4444'
                  : state.currentLevel > 80
                    ? '#f59e0b'
                    : '#10b981'
              }}
            />
          </div>
          <span className="text-gray-400 text-sm w-12">
            {Math.round(state.peakLevel)}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-4">
        {!state.isRecording ? (
          <button
            onClick={startRecording}
            disabled={!isInitialized}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Circle className="w-5 h-5" />
            <span>Record</span>
          </button>
        ) : (
          <>
            {state.isPaused ? (
              <button
                onClick={resumeRecording}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Play className="w-5 h-5" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Pause className="w-5 h-5" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={stopRecording}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Square className="w-5 h-5" />
              <span>Stop</span>
            </button>
          </>
        )}
      </div>

      <div className="mt-4 text-center text-sm text-gray-400">
        {sampleRate / 1000}kHz • {channels} Channel{channels > 1 ? 's' : ''} • {bitDepth}-bit • {format.toUpperCase()}
      </div>
    </div>
  );
};