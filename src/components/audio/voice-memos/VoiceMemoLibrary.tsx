'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Search,
  Filter,
  Calendar,
  Clock,
  Tag,
  FileText,
  Edit2,
  Download,
  MoreVertical
} from 'lucide-react';
import { VoiceMemo } from './VoiceMemoRecorder';
import { toast } from 'sonner';

export interface VoiceMemoLibraryProps {
  memos: VoiceMemo[];
  onDelete?: (memoId: string) => void;
  onUpdate?: (memo: VoiceMemo) => void;
  className?: string;
}

export const VoiceMemoLibrary: React.FC<VoiceMemoLibraryProps> = ({
  memos,
  onDelete,
  onUpdate,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'duration'>('date');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get all unique tags from memos
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    memos.forEach(memo => {
      memo.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [memos]);

  // Filter and sort memos
  const filteredMemos = useMemo(() => {
    let filtered = memos.filter(memo => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        memo.title.toLowerCase().includes(searchLower) ||
        memo.notes.toLowerCase().includes(searchLower) ||
        memo.tags.some(tag => tag.includes(searchLower));

      // Tag filter
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every(tag => memo.tags.includes(tag));

      return matchesSearch && matchesTags;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'duration':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });

    return filtered;
  }, [memos, searchQuery, selectedTags, sortBy]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePlay = useCallback((memo: VoiceMemo) => {
    if (playingId === memo.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(URL.createObjectURL(memo.audioBlob));
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingId(null);
      };

      audio.play();
      setPlayingId(memo.id);
    }
  }, [playingId]);

  const handleDelete = useCallback((memo: VoiceMemo) => {
    if (window.confirm(`Delete "${memo.title}"?`)) {
      if (playingId === memo.id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      onDelete?.(memo.id);
      toast.success('Voice memo deleted');
    }
  }, [playingId, onDelete]);

  const handleDownload = useCallback((memo: VoiceMemo) => {
    const url = URL.createObjectURL(memo.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${memo.title.replace(/[^a-z0-9]/gi, '_')}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Download started');
  }, []);

  const startEditing = useCallback((memo: VoiceMemo) => {
    setEditingId(memo.id);
    setEditTitle(memo.title);
    setEditNotes(memo.notes);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditTitle('');
    setEditNotes('');
  }, []);

  const saveEditing = useCallback(() => {
    const memo = memos.find(m => m.id === editingId);
    if (memo && editTitle.trim()) {
      const updatedMemo: VoiceMemo = {
        ...memo,
        title: editTitle.trim(),
        notes: editNotes.trim(),
        updatedAt: new Date()
      };
      onUpdate?.(updatedMemo);
      toast.success('Voice memo updated');
      cancelEditing();
    }
  }, [editingId, editTitle, editNotes, memos, onUpdate, cancelEditing]);

  const toggleTagFilter = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-green-500 to-teal-600 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Voice Memos</h2>
              <p className="text-gray-400 text-sm">
                {filteredMemos.length} of {memos.length} memo{memos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
            <option value="duration">Sort by Duration</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memos by title, notes, or tags..."
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <Filter className="w-4 h-4" />
              <span>Filter by tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                  } border`}
                >
                  #{tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-3 py-1 rounded-full text-sm bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Memo List */}
      <div className="space-y-4">
        {filteredMemos.length === 0 ? (
          <div className="bg-gray-900/50 rounded-xl p-12 text-center border border-gray-800">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No voice memos found</h3>
            <p className="text-gray-500">
              {memos.length === 0
                ? 'Record your first voice memo to get started'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          filteredMemos.map(memo => (
            <div
              key={memo.id}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 border border-gray-700/50 hover:border-gray-600/50 transition-all shadow-lg hover:shadow-xl"
            >
              {editingId === memo.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Title"
                  />
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Notes"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditing}
                      disabled={!editTitle.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{memo.title}</h3>
                      <div className="flex items-center space-x-3 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{memo.createdAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(memo.duration)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePlay(memo)}
                        className={`p-2 rounded-lg transition-colors ${
                          playingId === memo.id
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                        title={playingId === memo.id ? 'Pause' : 'Play'}
                      >
                        {playingId === memo.id ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => startEditing(memo)}
                        className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(memo)}
                        className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(memo)}
                        className="p-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  {memo.notes && (
                    <p className="text-gray-300 text-sm mb-3 leading-relaxed bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                      {memo.notes}
                    </p>
                  )}

                  {/* Tags */}
                  {memo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {memo.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center space-x-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 px-2 py-1 rounded-full text-xs"
                        >
                          <Tag className="w-3 h-3" />
                          <span>#{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Playing Indicator */}
                  {playingId === memo.id && (
                    <div className="mt-3 flex items-center space-x-2 text-green-400 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" />
                        <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse delay-75" />
                        <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse delay-150" />
                      </div>
                      <span>Playing...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
