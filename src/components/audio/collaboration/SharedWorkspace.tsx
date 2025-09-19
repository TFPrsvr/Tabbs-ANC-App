import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Share2, Download, Upload, Copy, Link, Mail, Clock,
  Globe, Lock, Eye, Edit, Users, Settings, Check, X
} from 'lucide-react';

export interface SharedWorkspaceProps {
  projectId: string;
  projectName: string;
  ownerId: string;
  currentUserId: string;
  onShareSettingsChange?: (settings: ShareSettings) => void;
  onCollaboratorInvite?: (inviteData: InviteData) => void;
  className?: string;
}

export interface ShareSettings {
  visibility: 'private' | 'public' | 'link-only';
  allowComments: boolean;
  allowDownload: boolean;
  allowDuplication: boolean;
  requireApproval: boolean;
  expirationDate?: Date;
  password?: string;
}

export interface InviteData {
  email: string;
  permission: 'viewer' | 'commentator' | 'editor' | 'admin';
  message?: string;
  expiresAt?: Date;
}

export interface ShareLink {
  id: string;
  url: string;
  permission: 'viewer' | 'commentator' | 'editor';
  expiresAt?: Date;
  usageCount: number;
  maxUsage?: number;
  createdAt: Date;
}

export interface PendingInvite {
  id: string;
  email: string;
  permission: string;
  invitedBy: string;
  sentAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export const SharedWorkspace: React.FC<SharedWorkspaceProps> = ({
  projectId,
  projectName,
  ownerId,
  currentUserId,
  onShareSettingsChange,
  onCollaboratorInvite,
  className = ''
}) => {
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    visibility: 'private',
    allowComments: true,
    allowDownload: false,
    allowDuplication: false,
    requireApproval: true
  });

  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteData>({
    email: '',
    permission: 'viewer'
  });
  const [linkForm, setLinkForm] = useState({
    permission: 'viewer' as const,
    expiresIn: '7',
    maxUsage: ''
  });
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const isOwner = currentUserId === ownerId;

  const generateShareLink = useCallback(async () => {
    try {
      const expiresAt = linkForm.expiresIn !== 'never'
        ? new Date(Date.now() + parseInt(linkForm.expiresIn) * 24 * 60 * 60 * 1000)
        : undefined;

      const response = await fetch(`/api/projects/${projectId}/share-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission: linkForm.permission,
          expiresAt,
          maxUsage: linkForm.maxUsage ? parseInt(linkForm.maxUsage) : undefined
        })
      });

      if (response.ok) {
        const newLink: ShareLink = await response.json();
        setShareLinks(prev => [...prev, newLink]);
        setShowLinkModal(false);
        setLinkForm({ permission: 'viewer', expiresIn: '7', maxUsage: '' });
      }
    } catch (error) {
      console.error('Failed to generate share link:', error);
    }
  }, [projectId, linkForm]);

  const sendInvitation = useCallback(async () => {
    if (!inviteForm.email.trim()) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      });

      if (response.ok) {
        const invitation: PendingInvite = await response.json();
        setPendingInvites(prev => [...prev, invitation]);
        setShowInviteModal(false);
        setInviteForm({ email: '', permission: 'viewer' });
        onCollaboratorInvite?.(inviteForm);
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  }, [projectId, inviteForm, onCollaboratorInvite]);

  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);

  const revokeShareLink = useCallback(async (linkId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/share-links/${linkId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShareLinks(prev => prev.filter(link => link.id !== linkId));
      }
    } catch (error) {
      console.error('Failed to revoke share link:', error);
    }
  }, [projectId]);

  const cancelInvitation = useCallback(async (inviteId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations/${inviteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId));
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  }, [projectId]);

  const updateShareSettings = useCallback((newSettings: Partial<ShareSettings>) => {
    const updated = { ...shareSettings, ...newSettings };
    setShareSettings(updated);
    onShareSettingsChange?.(updated);
  }, [shareSettings, onShareSettingsChange]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getPublicUrl = useCallback(() => {
    return `${window.location.origin}/shared/${projectId}`;
  }, [projectId]);

  useEffect(() => {
    // Load existing share links and invitations
    const loadShareData = async () => {
      try {
        const [linksResponse, invitesResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/share-links`),
          fetch(`/api/projects/${projectId}/invitations`)
        ]);

        if (linksResponse.ok) {
          const links = await linksResponse.json();
          setShareLinks(links);
        }

        if (invitesResponse.ok) {
          const invites = await invitesResponse.json();
          setPendingInvites(invites);
        }
      } catch (error) {
        console.error('Failed to load share data:', error);
      }
    };

    loadShareData();
  }, [projectId]);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold mb-2">Share Project</h2>
          <p className="text-gray-400">{projectName}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Share Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Mail className="w-5 h-5" />
          <span>Invite by Email</span>
        </button>

        <button
          onClick={() => setShowLinkModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Link className="w-5 h-5" />
          <span>Create Share Link</span>
        </button>

        {shareSettings.visibility === 'public' && (
          <button
            onClick={() => copyToClipboard(getPublicUrl(), 'public')}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {copySuccess === 'public' ? <Check className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            <span>{copySuccess === 'public' ? 'Copied!' : 'Public Link'}</span>
          </button>
        )}
      </div>

      {/* Current Share Status */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">Current Sharing Status</h3>
          <div className="flex items-center space-x-2">
            {shareSettings.visibility === 'private' && <Lock className="w-4 h-4 text-red-400" />}
            {shareSettings.visibility === 'link-only' && <Link className="w-4 h-4 text-yellow-400" />}
            {shareSettings.visibility === 'public' && <Globe className="w-4 h-4 text-green-400" />}
            <span className="text-gray-300 text-sm capitalize">
              {shareSettings.visibility.replace('-', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">
              Comments: {shareSettings.allowComments ? 'Allowed' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">
              Download: {shareSettings.allowDownload ? 'Allowed' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Copy className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">
              Duplication: {shareSettings.allowDuplication ? 'Allowed' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">
              Approval: {shareSettings.requireApproval ? 'Required' : 'Not Required'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Share Links */}
      {shareLinks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Active Share Links</h3>
          <div className="space-y-3">
            {shareLinks.map((link) => (
              <div key={link.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium capitalize">{link.permission}</span>
                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                      {link.usageCount} uses
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(link.url, link.id)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {copySuccess === link.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => revokeShareLink(link.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-gray-400 text-sm">
                  {link.expiresAt ? `Expires ${formatDate(link.expiresAt)}` : 'No expiration'}
                  {link.maxUsage && ` • Max ${link.maxUsage} uses`}
                </div>
                <div className="text-gray-500 text-xs mt-1 font-mono truncate">
                  {link.url}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Pending Invitations</h3>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{invite.email}</div>
                    <div className="text-gray-400 text-sm">
                      {invite.permission} • Sent {formatDate(invite.sentAt)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      invite.status === 'pending' ? 'bg-yellow-600 text-white' :
                      invite.status === 'accepted' ? 'bg-green-600 text-white' :
                      invite.status === 'declined' ? 'bg-red-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {invite.status}
                    </span>
                    {isOwner && invite.status === 'pending' && (
                      <button
                        onClick={() => cancelInvitation(invite.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Invite Collaborator</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  placeholder="colleague@example.com"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Permission Level
                </label>
                <select
                  value={inviteForm.permission}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, permission: e.target.value as any }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                >
                  <option value="viewer">Viewer - Can view only</option>
                  <option value="commentator">Commentator - Can view and comment</option>
                  <option value="editor">Editor - Can view, comment, and edit</option>
                  {isOwner && <option value="admin">Admin - Full access</option>}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={inviteForm.message || ''}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600 h-20 resize-none"
                  placeholder="Add a personal message to your invitation..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendInvitation}
                disabled={!inviteForm.email.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Create Share Link</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Permission Level
                </label>
                <select
                  value={linkForm.permission}
                  onChange={(e) => setLinkForm(prev => ({ ...prev, permission: e.target.value as any }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                >
                  <option value="viewer">Viewer - Can view only</option>
                  <option value="commentator">Commentator - Can view and comment</option>
                  <option value="editor">Editor - Can view, comment, and edit</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Expires In
                </label>
                <select
                  value={linkForm.expiresIn}
                  onChange={(e) => setLinkForm(prev => ({ ...prev, expiresIn: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                >
                  <option value="1">1 day</option>
                  <option value="7">1 week</option>
                  <option value="30">1 month</option>
                  <option value="90">3 months</option>
                  <option value="never">Never</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Max Usage (Optional)
                </label>
                <input
                  type="number"
                  value={linkForm.maxUsage}
                  onChange={(e) => setLinkForm(prev => ({ ...prev, maxUsage: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border-none outline-none focus:bg-gray-600"
                  placeholder="Unlimited"
                  min="1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generateShareLink}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};