'use client';

import React, { useState, useCallback } from 'react';
import {
  LiveSession,
  LivePerformanceSettings,
  Participant,
  LiveSessionStatus,
  ClickTrackSettings,
  LiveRecordingSettings
} from '@/lib/audio/streaming-system';

export interface LiveSessionManagerProps {
  sessions: LiveSession[];
  currentSession?: LiveSession;
  onCreateSession: (name: string, settings: LivePerformanceSettings) => Promise<void>;
  onJoinSession: (sessionId: string, participantName: string) => Promise<void>;
  onStartSession: (sessionId: string) => Promise<void>;
  onEndSession: (sessionId: string) => Promise<void>;
  onUpdateParticipantAudio: (sessionId: string, participantId: string, settings: any) => Promise<void>;
  onKickParticipant: (sessionId: string, participantId: string) => Promise<void>;
}

const defaultSettings: LivePerformanceSettings = {
  clickTrack: {
    enabled: false,
    tempo: 120,
    timeSignature: [4, 4],
    sound: 'click',
    volume: 0.7,
    accentBeats: true,
    countIn: 4,
    syncToHost: true
  },
  monitoring: {
    enabled: true,
    mixBus: 'main',
    headphoneLevel: 0.8,
    talkbackEnabled: true,
    soloInPlace: false,
    cueSystem: {
      enabled: false,
      cueBus: 'cue',
      prePost: 'pre',
      dim: -6,
      monoSplit: false
    }
  },
  collaboration: {
    maxParticipants: 8,
    audioSharing: true,
    chatEnabled: true,
    fileSharing: true,
    sessionLocking: false,
    permissions: {
      canRecord: false,
      canEditTracks: false,
      canAddEffects: false,
      canControlTransport: false,
      canInviteOthers: false
    }
  },
  recording: {
    enabled: false,
    format: 'wav',
    bitDepth: 24,
    sampleRate: 48000,
    recordIndividualTracks: true,
    recordMasterBus: true,
    autoSave: true,
    saveInterval: 300
  },
  effects: {
    lowLatencyMode: true,
    bufferOptimization: true,
    enabledEffects: [],
    cpuLimiting: true,
    maxCpuUsage: 75
  }
};

const SESSION_STATUS_COLORS = {
  created: 'bg-gray-100 text-gray-800',
  waiting: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-blue-100 text-blue-800',
  ended: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800'
};

const CONNECTION_QUALITY_COLORS = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-yellow-100 text-yellow-800',
  poor: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export function LiveSessionManager({
  sessions,
  currentSession,
  onCreateSession,
  onJoinSession,
  onStartSession,
  onEndSession,
  onUpdateParticipantAudio,
  onKickParticipant
}: LiveSessionManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [settings, setSettings] = useState<LivePerformanceSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'sessions' | 'participants' | 'settings'>('sessions');

  const updateNested = useCallback((path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key) current = current[key];
      }

      const lastKey = keys[keys.length - 1];
      if (lastKey) current[lastKey] = value;
      return newSettings;
    });
  }, []);

  const handleCreateSession = useCallback(async () => {
    if (sessionName.trim()) {
      await onCreateSession(sessionName, settings);
      setSessionName('');
      setShowCreateForm(false);
    }
  }, [sessionName, settings, onCreateSession]);

  const handleJoinSession = useCallback(async () => {
    if (selectedSessionId && participantName.trim()) {
      await onJoinSession(selectedSessionId, participantName);
      setParticipantName('');
      setSelectedSessionId('');
      setShowJoinForm(false);
    }
  }, [selectedSessionId, participantName, onJoinSession]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Sessions</h2>
          <p className="text-gray-600">Collaborate in real-time with other musicians</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowJoinForm(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Join Session
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Session
          </button>
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create Live Session</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Name</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter session name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Click Track Settings */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Click Track</h4>
                  <input
                    type="checkbox"
                    checked={settings.clickTrack.enabled}
                    onChange={(e) => updateNested('clickTrack.enabled', e.target.checked)}
                    className="mr-2"
                  />
                </div>

                {settings.clickTrack.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tempo (BPM)</label>
                      <input
                        type="number"
                        value={settings.clickTrack.tempo}
                        onChange={(e) => updateNested('clickTrack.tempo', parseInt(e.target.value))}
                        min="60"
                        max="200"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Signature</label>
                      <select
                        value={`${settings.clickTrack.timeSignature[0]}/${settings.clickTrack.timeSignature[1]}`}
                        onChange={(e) => {
                          const [num, den] = e.target.value.split('/').map(Number);
                          updateNested('clickTrack.timeSignature', [num, den]);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="4/4">4/4</option>
                        <option value="3/4">3/4</option>
                        <option value="2/4">2/4</option>
                        <option value="6/8">6/8</option>
                        <option value="12/8">12/8</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Click Sound</label>
                      <select
                        value={settings.clickTrack.sound}
                        onChange={(e) => updateNested('clickTrack.sound', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="click">Click</option>
                        <option value="beep">Beep</option>
                        <option value="cowbell">Cowbell</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Count In (Bars)</label>
                      <input
                        type="number"
                        value={settings.clickTrack.countIn}
                        onChange={(e) => updateNested('clickTrack.countIn', parseInt(e.target.value))}
                        min="0"
                        max="8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Recording Settings */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Session Recording</h4>
                  <input
                    type="checkbox"
                    checked={settings.recording.enabled}
                    onChange={(e) => updateNested('recording.enabled', e.target.checked)}
                    className="mr-2"
                  />
                </div>

                {settings.recording.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                      <select
                        value={settings.recording.format}
                        onChange={(e) => updateNested('recording.format', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="wav">WAV</option>
                        <option value="flac">FLAC</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bit Depth</label>
                      <select
                        value={settings.recording.bitDepth}
                        onChange={(e) => updateNested('recording.bitDepth', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={16}>16-bit</option>
                        <option value={24}>24-bit</option>
                        <option value={32}>32-bit</option>
                      </select>
                    </div>

                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.recording.recordIndividualTracks}
                          onChange={(e) => updateNested('recording.recordIndividualTracks', e.target.checked)}
                          className="mr-2"
                        />
                        <label className="text-sm text-gray-700">Record individual participant tracks</label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.recording.recordMasterBus}
                          onChange={(e) => updateNested('recording.recordMasterBus', e.target.checked)}
                          className="mr-2"
                        />
                        <label className="text-sm text-gray-700">Record master mix</label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.recording.autoSave}
                          onChange={(e) => updateNested('recording.autoSave', e.target.checked)}
                          className="mr-2"
                        />
                        <label className="text-sm text-gray-700">Auto-save recording</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Collaboration Settings */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Collaboration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
                    <input
                      type="number"
                      value={settings.collaboration.maxParticipants}
                      onChange={(e) => updateNested('collaboration.maxParticipants', parseInt(e.target.value))}
                      min="2"
                      max="16"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.collaboration.audioSharing}
                        onChange={(e) => updateNested('collaboration.audioSharing', e.target.checked)}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">Audio sharing</label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.collaboration.chatEnabled}
                        onChange={(e) => updateNested('collaboration.chatEnabled', e.target.checked)}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">Text chat</label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.collaboration.fileSharing}
                        onChange={(e) => updateNested('collaboration.fileSharing', e.target.checked)}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">File sharing</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!sessionName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Session Modal */}
      {showJoinForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Join Live Session</h3>
              <button
                onClick={() => setShowJoinForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a session</option>
                  {sessions.filter(s => s.status === 'waiting' || s.status === 'active').map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} ({session.participants.length}/{session.settings.collaboration.maxParticipants} participants)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowJoinForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinSession}
                disabled={!participantName.trim() || !selectedSessionId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Join Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['sessions', 'participants', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🎵</div>
                <p>No live sessions available.</p>
                <p className="text-sm">Create a session to start collaborating.</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{session.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${SESSION_STATUS_COLORS[session.status]}`}>
                          {session.status.toUpperCase()}
                        </span>
                        <span>•</span>
                        <span>{session.participants.length}/{session.settings.collaboration.maxParticipants} participants</span>
                        <span>•</span>
                        <span>Host: {session.host}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {session.status === 'waiting' && (
                        <button
                          onClick={() => onStartSession(session.id)}
                          className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          Start
                        </button>
                      )}
                      {session.status === 'active' && (
                        <button
                          onClick={() => onEndSession(session.id)}
                          className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                        >
                          End
                        </button>
                      )}
                    </div>
                  </div>

                  {session.status === 'active' && (
                    <div className="bg-green-50 p-3 rounded text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-green-800">Session Duration: {formatDuration(session.duration)}</span>
                        {session.recording && (
                          <span className="text-red-600 flex items-center">
                            <div className="w-2 h-2 bg-red-600 rounded-full mr-1 animate-pulse"></div>
                            Recording
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'participants' && currentSession && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Session Participants</h3>
            {currentSession.participants.map((participant) => (
              <div key={participant.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{participant.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span className="capitalize">{participant.role}</span>
                      <span>•</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${CONNECTION_QUALITY_COLORS[participant.connection.quality]}`}>
                        {participant.connection.quality}
                      </span>
                      <span>•</span>
                      <span>{participant.connection.latency}ms latency</span>
                    </div>
                  </div>

                  {participant.role !== 'host' && (
                    <button
                      onClick={() => onKickParticipant(currentSession.id, participant.id)}
                      className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Input Gain</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={participant.audioSettings.inputGain * 100}
                      onChange={(e) => onUpdateParticipantAudio(
                        currentSession.id,
                        participant.id,
                        { inputGain: parseInt(e.target.value) / 100 }
                      )}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => onUpdateParticipantAudio(
                        currentSession.id,
                        participant.id,
                        { muted: !participant.audioSettings.muted }
                      )}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        participant.audioSettings.muted
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {participant.audioSettings.muted ? 'Muted' : 'Unmuted'}
                    </button>
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => onUpdateParticipantAudio(
                        currentSession.id,
                        participant.id,
                        { solo: !participant.audioSettings.solo }
                      )}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        participant.audioSettings.solo
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {participant.audioSettings.solo ? 'Solo' : 'Normal'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Monitor Mix</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={participant.audioSettings.monitorMix * 100}
                      onChange={(e) => onUpdateParticipantAudio(
                        currentSession.id,
                        participant.id,
                        { monitorMix: parseInt(e.target.value) / 100 }
                      )}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && currentSession && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Session Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Click Track</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Enabled</span>
                    <span className={currentSession.settings.clickTrack.enabled ? 'text-green-600' : 'text-gray-400'}>
                      {currentSession.settings.clickTrack.enabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {currentSession.settings.clickTrack.enabled && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Tempo</span>
                        <span className="text-sm font-medium">{currentSession.settings.clickTrack.tempo} BPM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Time Signature</span>
                        <span className="text-sm font-medium">
                          {currentSession.settings.clickTrack.timeSignature[0]}/{currentSession.settings.clickTrack.timeSignature[1]}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Recording</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Status</span>
                    <span className={currentSession.recording?.status === 'recording' ? 'text-red-600' : 'text-gray-400'}>
                      {currentSession.recording?.status || 'Not recording'}
                    </span>
                  </div>
                  {currentSession.settings.recording.enabled && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Format</span>
                        <span className="text-sm font-medium">{currentSession.settings.recording.format.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Quality</span>
                        <span className="text-sm font-medium">
                          {currentSession.settings.recording.bitDepth}-bit / {currentSession.settings.recording.sampleRate / 1000}kHz
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}