'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Save, Trash2, FileText, Tag, Calendar } from 'lucide-react';
import { AudioRecorder } from '../recording/AudioRecorder';
import { toast } from 'sonner';

export interface VoiceMemo {
  id: string;
  title: string;
  notes: string;
  tags: string[];
  audioBlob: Blob;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceMemoRecorderProps {
  onSave?: (memo: VoiceMemo) => void;
  onCancel?: () => void;
  className?: string;
}

export const VoiceMemoRecorder: React.FC<VoiceMemoRecorderProps> = ({
  onSave,
  onCancel,
  className = ''
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  const notesRef = useRef<HTMLTextAreaElement>(null);

  const handleRecordingStart = useCallback(() => {
    setIsRecording(true);
    toast.info('Recording started', {
      description: 'Speak clearly into your microphone'
    });
  }, []);

  const handleRecordingStop = useCallback(() => {
    setIsRecording(false);
  }, []);

  const handleRecordingComplete = useCallback((blob: Blob, recordedDuration: number) => {
    setAudioBlob(blob);
    setDuration(recordedDuration);
    setHasRecording(true);

    // Auto-generate title if empty
    if (!title.trim()) {
      const now = new Date();
      setTitle(`Voice Memo ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    }

    toast.success('Recording complete', {
      description: 'Add notes and tags to save your voice memo'
    });
  }, [title]);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  }, [tags]);

  const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  const handleSave = useCallback(() => {
    if (!audioBlob) {
      toast.error('No recording to save', {
        description: 'Please record audio before saving'
      });
      return;
    }

    if (!title.trim()) {
      toast.error('Title required', {
        description: 'Please enter a title for your voice memo'
      });
      return;
    }

    const memo: VoiceMemo = {
      id: `memo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      notes: notes.trim(),
      tags,
      audioBlob,
      duration,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onSave?.(memo);
    toast.success('Voice memo saved', {
      description: `"${memo.title}" has been saved successfully`
    });

    // Reset form
    setTitle('');
    setNotes('');
    setTags([]);
    setAudioBlob(null);
    setDuration(0);
    setHasRecording(false);
  }, [audioBlob, title, notes, tags, duration, onSave]);

  const handleDiscard = useCallback(() => {
    if (hasRecording) {
      if (window.confirm('Are you sure you want to discard this recording?')) {
        setTitle('');
        setNotes('');
        setTags([]);
        setAudioBlob(null);
        setDuration(0);
        setHasRecording(false);
        onCancel?.();
      }
    } else {
      onCancel?.();
    }
  }, [hasRecording, onCancel]);

  return (
    <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Voice Memo</h2>
            <p className="text-gray-400 text-sm">Record audio with notes</p>
          </div>
        </div>
        {hasRecording && (
          <div className="flex items-center space-x-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording saved</span>
          </div>
        )}
      </div>

      {/* Audio Recorder */}
      <div className="bg-black/30 rounded-xl p-4 border border-gray-700/50">
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          onRecordingStart={handleRecordingStart}
          onRecordingStop={handleRecordingStop}
          maxDuration={600} // 10 minutes max for voice memos
          sampleRate={44100}
          channels={1} // Mono for voice memos
          format="wav"
          className="bg-transparent"
        />
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <label className="flex items-center space-x-2 text-gray-300 text-sm font-medium">
          <FileText className="w-4 h-4" />
          <span>Title *</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a descriptive title..."
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          disabled={isRecording}
        />
      </div>

      {/* Notes Input */}
      <div className="space-y-2">
        <label className="flex items-center space-x-2 text-gray-300 text-sm font-medium">
          <FileText className="w-4 h-4" />
          <span>Notes</span>
        </label>
        <textarea
          ref={notesRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add additional notes, key points, or context..."
          rows={6}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
          disabled={isRecording}
        />
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>You can take notes during or after recording</span>
          <span>{notes.length} characters</span>
        </div>
      </div>

      {/* Tags Input */}
      <div className="space-y-2">
        <label className="flex items-center space-x-2 text-gray-300 text-sm font-medium">
          <Tag className="w-4 h-4" />
          <span>Tags</span>
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="Add tags (press Enter or comma)"
            className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            disabled={isRecording}
          />
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim() || isRecording}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map(tag => (
              <div
                key={tag}
                className="flex items-center space-x-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-full text-sm"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isRecording}
                  className="hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata Display */}
      {hasRecording && (
        <div className="flex items-center space-x-4 text-sm text-gray-400 bg-gray-800/30 rounded-lg px-4 py-3 border border-gray-700/50">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <span>Duration: {Math.floor(duration)}s</span>
          <div className="w-px h-4 bg-gray-700" />
          <span>Mono • 44.1kHz • WAV</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
        <button
          onClick={handleDiscard}
          disabled={isRecording}
          className="flex items-center space-x-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-5 h-5" />
          <span>Discard</span>
        </button>

        <button
          onClick={handleSave}
          disabled={!hasRecording || isRecording || !title.trim()}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
        >
          <Save className="w-5 h-5" />
          <span>Save Voice Memo</span>
        </button>
      </div>
    </div>
  );
};
