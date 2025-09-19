import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Users, MessageCircle, Eye, Edit, Share2, Clock,
  UserPlus, Settings, Bell, Lock, Unlock, Video
} from 'lucide-react';

export interface CollaborativeEditorProps {
  projectId: string;
  userId: string;
  userName: string;
  userColor?: string;
  onCollaboratorJoin?: (collaborator: Collaborator) => void;
  onCollaboratorLeave?: (collaboratorId: string) => void;
  onPermissionChange?: (collaboratorId: string, permission: Permission) => void;
  enableVoiceChat?: boolean;
  enableVideoChat?: boolean;
  className?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  permission: Permission;
  status: 'online' | 'away' | 'offline';
  cursor?: CursorPosition;
  selection?: Selection;
  lastActivity: Date;
}

export interface Permission {
  level: 'owner' | 'editor' | 'viewer' | 'commentator';
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canManageUsers: boolean;
}

export interface CursorPosition {
  trackId: string;
  timePosition: number;
  x: number;
  y: number;
}

export interface Selection {
  trackId: string;
  startTime: number;
  endTime: number;
  region?: 'audio' | 'midi' | 'automation';
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'audio' | 'file';
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface ProjectActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  projectId,
  userId,
  userName,
  userColor = '#3b82f6',
  onCollaboratorJoin,
  onCollaboratorLeave,
  onPermissionChange,
  enableVoiceChat = true,
  enableVideoChat = false,
  className = ''
}) => {
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [projectActivity, setProjectActivity] = useState<ProjectActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [voiceChatEnabled, setVoiceChatEnabled] = useState(false);
  const [videoChatEnabled, setVideoChatEnabled] = useState(false);

  const websocketRef = useRef<WebSocket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const rtcConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const connectToCollaboration = useCallback(async () => {
    try {
      const ws = new WebSocket(`wss://api.example.com/collaborate/${projectId}`);

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({
          type: 'join',
          userId,
          userName,
          userColor
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connectToCollaboration, 3000);
      };

      websocketRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
    }
  }, [projectId, userId, userName, userColor]);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'collaborator_joined':
        const newCollaborator: Collaborator = {
          id: data.userId,
          name: data.userName,
          email: data.email,
          avatar: data.avatar,
          color: data.userColor,
          permission: data.permission,
          status: 'online',
          lastActivity: new Date()
        };
        setCollaborators(prev => new Map(prev.set(data.userId, newCollaborator)));
        onCollaboratorJoin?.(newCollaborator);
        addSystemMessage(`${data.userName} joined the project`);
        break;

      case 'collaborator_left':
        setCollaborators(prev => {
          const updated = new Map(prev);
          updated.delete(data.userId);
          return updated;
        });
        onCollaboratorLeave?.(data.userId);
        addSystemMessage(`${data.userName} left the project`);
        break;

      case 'cursor_update':
        updateCollaboratorCursor(data.userId, data.cursor);
        break;

      case 'selection_update':
        updateCollaboratorSelection(data.userId, data.selection);
        break;

      case 'chat_message':
        addChatMessage(data.message);
        break;

      case 'project_activity':
        addProjectActivity(data.activity);
        break;

      case 'rtc_offer':
      case 'rtc_answer':
      case 'rtc_ice_candidate':
        handleRTCMessage(data);
        break;
    }
  }, [onCollaboratorJoin, onCollaboratorLeave]);

  const updateCollaboratorCursor = useCallback((userId: string, cursor: CursorPosition) => {
    setCollaborators(prev => {
      const collaborator = prev.get(userId);
      if (collaborator) {
        const updated = new Map(prev);
        updated.set(userId, { ...collaborator, cursor, lastActivity: new Date() });
        return updated;
      }
      return prev;
    });
  }, []);

  const updateCollaboratorSelection = useCallback((userId: string, selection: Selection) => {
    setCollaborators(prev => {
      const collaborator = prev.get(userId);
      if (collaborator) {
        const updated = new Map(prev);
        updated.set(userId, { ...collaborator, selection, lastActivity: new Date() });
        return updated;
      }
      return prev;
    });
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  const addSystemMessage = useCallback((text: string) => {
    const message: ChatMessage = {
      id: `system-${Date.now()}`,
      userId: 'system',
      userName: 'System',
      message: text,
      timestamp: new Date(),
      type: 'system'
    };
    addChatMessage(message);
  }, [addChatMessage]);

  const addProjectActivity = useCallback((activity: ProjectActivity) => {
    setProjectActivity(prev => [activity, ...prev.slice(0, 49)]);
  }, []);

  const sendChatMessage = useCallback(() => {
    if (!newMessage.trim() || !websocketRef.current) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId,
      userName,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    websocketRef.current.send(JSON.stringify({
      type: 'chat_message',
      message
    }));

    setNewMessage('');
  }, [newMessage, userId, userName]);

  const inviteCollaborator = useCallback(async (email: string, permission: Permission) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permission })
      });

      if (response.ok) {
        addSystemMessage(`Invitation sent to ${email}`);
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  }, [projectId, addSystemMessage]);

  const changeCollaboratorPermission = useCallback((collaboratorId: string, permission: Permission) => {
    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({
        type: 'change_permission',
        collaboratorId,
        permission
      }));
    }
    onPermissionChange?.(collaboratorId, permission);
  }, [onPermissionChange]);

  const initializeVoiceChat = useCallback(async () => {
    if (!enableVoiceChat) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoChatEnabled && enableVideoChat
      });
      localStreamRef.current = stream;
      setVoiceChatEnabled(true);

      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'voice_chat_start',
          hasVideo: videoChatEnabled && enableVideoChat
        }));
      }
    } catch (error) {
      console.error('Failed to initialize voice chat:', error);
    }
  }, [enableVoiceChat, enableVideoChat, videoChatEnabled]);

  const handleRTCMessage = useCallback(async (data: any) => {
    // WebRTC implementation for voice/video chat
    let connection = rtcConnectionsRef.current.get(data.fromUserId);

    if (!connection) {
      connection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      rtcConnectionsRef.current.set(data.fromUserId, connection);
    }

    switch (data.type) {
      case 'rtc_offer':
        await connection.setRemoteDescription(data.offer);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        if (websocketRef.current) {
          websocketRef.current.send(JSON.stringify({
            type: 'rtc_answer',
            toUserId: data.fromUserId,
            answer
          }));
        }
        break;

      case 'rtc_answer':
        await connection.setRemoteDescription(data.answer);
        break;

      case 'rtc_ice_candidate':
        await connection.addIceCandidate(data.candidate);
        break;
    }
  }, []);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  useEffect(() => {
    connectToCollaboration();
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [connectToCollaboration]);

  return (
    <div className={`bg-gray-900 rounded-lg ${className}`}>
      <div className="flex h-full">
        {/* Collaborators Panel */}
        {showCollaborators && (
          <div className="w-64 border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Collaborators ({collaborators.size})
                </h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <button className="text-gray-400 hover:text-white">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {enableVoiceChat && (
                <div className="flex items-center space-x-2 mb-4">
                  <button
                    onClick={initializeVoiceChat}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                      voiceChatEnabled
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Voice Chat
                  </button>
                  {enableVideoChat && (
                    <button
                      onClick={() => setVideoChatEnabled(!videoChatEnabled)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        videoChatEnabled
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {Array.from(collaborators.values()).map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: collaborator.color }}
                    >
                      {collaborator.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-white text-sm font-medium truncate">
                          {collaborator.name}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          collaborator.status === 'online' ? 'bg-green-500' :
                          collaborator.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div className="text-gray-400 text-xs">
                        {collaborator.permission.level}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {collaborator.permission.canEdit ? (
                        <Edit className="w-3 h-3 text-green-500" />
                      ) : (
                        <Eye className="w-3 h-3 text-gray-500" />
                      )}
                      {collaborator.permission.level === 'owner' ? (
                        <Lock className="w-3 h-3 text-yellow-500" />
                      ) : (
                        <Unlock className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCollaborators(!showCollaborators)}
                className="text-gray-400 hover:text-white"
              >
                <Users className="w-5 h-5" />
              </button>
              <div className="text-white font-medium">Real-time Collaboration</div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowActivity(!showActivity)}
                className={`p-2 rounded-lg transition-colors ${
                  showActivity ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowChat(!showChat)}
                className={`p-2 rounded-lg transition-colors ${
                  showChat ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              <button className="text-gray-400 hover:text-white">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="text-gray-400 hover:text-white">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex">
            {/* Activity Panel */}
            {showActivity && (
              <div className="w-80 border-r border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold">Project Activity</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {projectActivity.map((activity) => (
                      <div key={activity.id} className="p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                            style={{ backgroundColor: collaborators.get(activity.userId)?.color || '#6b7280' }}
                          >
                            {activity.userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm">
                              <span className="font-medium">{activity.userName}</span>
                              <span className="text-gray-400 ml-1">{activity.action}</span>
                              <span className="text-blue-400 ml-1">{activity.target}</span>
                            </div>
                            <div className="text-gray-400 text-xs mt-1">
                              {formatTime(activity.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Panel */}
            {showChat && (
              <div className="w-80 border-r border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold">Chat</h3>
                </div>
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                >
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-3 ${
                        message.type === 'system' ? 'justify-center' : ''
                      }`}
                    >
                      {message.type !== 'system' && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                          style={{ backgroundColor: collaborators.get(message.userId)?.color || '#6b7280' }}
                        >
                          {message.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`flex-1 min-w-0 ${message.type === 'system' ? 'text-center' : ''}`}>
                        {message.type !== 'system' && (
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-white text-sm font-medium">
                              {message.userName}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        )}
                        <div className={`text-sm ${
                          message.type === 'system'
                            ? 'text-gray-400 italic'
                            : 'text-gray-300'
                        }`}>
                          {message.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-700">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-700"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};