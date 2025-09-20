'use client';

import React, { useState, useCallback } from 'react';
import {
  LiveSession,
  Participant,
  ParticipantPermissions
} from '@/lib/audio/streaming-system';

export interface CollaborationPanelProps {
  session?: LiveSession;
  currentUserId: string;
  onInviteParticipant: (email: string, permissions: ParticipantPermissions) => Promise<void>;
  onUpdatePermissions: (participantId: string, permissions: ParticipantPermissions) => Promise<void>;
  onSendMessage: (message: string) => Promise<void>;
  onShareFile: (file: File) => Promise<void>;
  messages: ChatMessage[];
  sharedFiles: SharedFile[];
}

export interface ChatMessage {
  id: string;
  participantId: string;
  participantName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'file';
}

export interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: Date;
  downloadUrl: string;
}

const defaultPermissions: ParticipantPermissions = {
  canRecord: false,
  canEditTracks: false,
  canAddEffects: false,
  canControlTransport: false,
  canInviteOthers: false
};

export function CollaborationPanel({
  session,
  currentUserId,
  onInviteParticipant,
  onUpdatePermissions,
  onSendMessage,
  onShareFile,
  messages,
  sharedFiles
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'files' | 'invite'>('participants');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<ParticipantPermissions>(defaultPermissions);
  const [chatMessage, setChatMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const isHost = session && session.participants.find(p => p.id === currentUserId)?.role === 'host';

  const handleInvite = useCallback(async () => {
    if (inviteEmail.trim()) {
      await onInviteParticipant(inviteEmail, invitePermissions);
      setInviteEmail('');
      setInvitePermissions(defaultPermissions);
    }
  }, [inviteEmail, invitePermissions, onInviteParticipant]);

  const handleSendMessage = useCallback(async () => {
    if (chatMessage.trim()) {
      await onSendMessage(chatMessage);
      setChatMessage('');
    }
  }, [chatMessage, onSendMessage]);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await onShareFile(file);
    }
  }, [onShareFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await onShareFile(file);
    }
  }, [onShareFile]);

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'host': return 'bg-purple-100 text-purple-800';
      case 'performer': return 'bg-blue-100 text-blue-800';
      case 'listener': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!session) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">👥</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Collaboration Panel</h3>
        <p className="text-gray-600">Join or create a live session to collaborate with others</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Collaboration</h2>
          <p className="text-gray-600">Session: {session.name}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {session.participants.length}/{session.settings.collaboration.maxParticipants} participants
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['participants', 'chat', 'files', 'invite'].map((tab) => (
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
            {tab === 'chat' && messages.length > 0 && (
              <span className="ml-1 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                {messages.length}
              </span>
            )}
            {tab === 'files' && sharedFiles.length > 0 && (
              <span className="ml-1 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                {sharedFiles.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'participants' && (
          <div className="space-y-4">
            {session.participants.map((participant) => (
              <div key={participant.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{participant.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(participant.role)}`}>
                          {participant.role}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          participant.connection.status === 'connected' ? 'bg-green-500' :
                          participant.connection.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="text-xs text-gray-500">
                          {participant.connection.latency}ms latency
                        </span>
                      </div>
                    </div>
                  </div>

                  {isHost && participant.id !== currentUserId && (
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                        Edit Permissions
                      </button>
                      <button className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700">
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Audio Controls */}
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Input</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={participant.audioSettings.inputGain * 100}
                      className="w-full"
                      disabled={!isHost && participant.id !== currentUserId}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Output</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={participant.audioSettings.outputGain * 100}
                      className="w-full"
                      disabled={!isHost && participant.id !== currentUserId}
                    />
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        participant.audioSettings.muted
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                      disabled={!isHost && participant.id !== currentUserId}
                    >
                      {participant.audioSettings.muted ? 'Muted' : 'Live'}
                    </button>
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        participant.audioSettings.solo
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                      disabled={!isHost && participant.id !== currentUserId}
                    >
                      {participant.audioSettings.solo ? 'Solo' : 'Normal'}
                    </button>
                  </div>
                </div>

                {/* Permissions */}
                {(isHost || participant.id === currentUserId) && (
                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Permissions</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          participant.permissions.canRecord ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        Record
                      </div>
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          participant.permissions.canEditTracks ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        Edit Tracks
                      </div>
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          participant.permissions.canAddEffects ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        Add Effects
                      </div>
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          participant.permissions.canControlTransport ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        Control Transport
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-96">
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">💬</div>
                  <p>No messages yet.</p>
                  <p className="text-sm">Start a conversation with your collaborators!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${
                    message.type === 'system' ? 'justify-center' : 'justify-start'
                  }`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'system'
                        ? 'bg-gray-100 text-gray-600 text-sm'
                        : 'bg-blue-500 text-white'
                    }`}>
                      {message.type !== 'system' && (
                        <div className="text-xs opacity-75 mb-1">{message.participantName}</div>
                      )}
                      <div>{message.message}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              <div className="text-4xl mb-2">📁</div>
              <p className="text-lg font-medium text-gray-900 mb-1">Drop files here</p>
              <p className="text-sm text-gray-600 mb-4">or click to browse</p>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer"
              >
                Choose Files
              </label>
            </div>

            {/* Shared Files List */}
            {sharedFiles.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">Shared Files</h3>
                {sharedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {file.type.startsWith('audio/') ? '🎵' :
                         file.type.startsWith('image/') ? '🖼️' :
                         file.type.startsWith('video/') ? '🎥' : '📄'}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{file.name}</h4>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • Shared by {file.uploadedBy} • {file.uploadedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(file.downloadUrl, '_blank')}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Download
                      </button>
                      {file.type.startsWith('audio/') && (
                        <button className="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-700">
                          Import
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📂</div>
                <p>No files shared yet.</p>
                <p className="text-sm">Share audio files, project files, and more with your collaborators.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invite' && isHost && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Collaborators</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="canRecord"
                        checked={invitePermissions.canRecord}
                        onChange={(e) => setInvitePermissions(prev => ({ ...prev, canRecord: e.target.checked }))}
                        className="mr-3"
                      />
                      <label htmlFor="canRecord" className="text-sm text-gray-700">
                        Can record session
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="canEditTracks"
                        checked={invitePermissions.canEditTracks}
                        onChange={(e) => setInvitePermissions(prev => ({ ...prev, canEditTracks: e.target.checked }))}
                        className="mr-3"
                      />
                      <label htmlFor="canEditTracks" className="text-sm text-gray-700">
                        Can edit tracks and add/remove content
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="canAddEffects"
                        checked={invitePermissions.canAddEffects}
                        onChange={(e) => setInvitePermissions(prev => ({ ...prev, canAddEffects: e.target.checked }))}
                        className="mr-3"
                      />
                      <label htmlFor="canAddEffects" className="text-sm text-gray-700">
                        Can add and modify effects
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="canControlTransport"
                        checked={invitePermissions.canControlTransport}
                        onChange={(e) => setInvitePermissions(prev => ({ ...prev, canControlTransport: e.target.checked }))}
                        className="mr-3"
                      />
                      <label htmlFor="canControlTransport" className="text-sm text-gray-700">
                        Can control playback (play, stop, record)
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="canInviteOthers"
                        checked={invitePermissions.canInviteOthers}
                        onChange={(e) => setInvitePermissions(prev => ({ ...prev, canInviteOthers: e.target.checked }))}
                        className="mr-3"
                      />
                      <label htmlFor="canInviteOthers" className="text-sm text-gray-700">
                        Can invite other participants
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Send Invitation
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Session Link</h4>
              <p className="text-sm text-gray-600 mb-3">
                Share this link for participants to join directly:
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={`${window.location.origin}/session/${session.id}`}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/session/${session.id}`)}
                  className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invite' && !isHost && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔒</div>
            <p>Only the session host can invite participants.</p>
          </div>
        )}
      </div>
    </div>
  );
}