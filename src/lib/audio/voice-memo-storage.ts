/**
 * Voice Memo Storage Manager
 * Uses IndexedDB for persistent local storage of voice memos with audio blobs
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { VoiceMemo } from '@/components/audio/voice-memos/VoiceMemoRecorder';

interface VoiceMemoDBSchema extends DBSchema {
  voiceMemos: {
    key: string;
    value: VoiceMemoRecord;
    indexes: {
      'by-date': Date;
      'by-title': string;
      'by-tag': string;
    };
  };
}

interface VoiceMemoRecord {
  id: string;
  title: string;
  notes: string;
  tags: string[];
  audioBlob: Blob;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'anc-voice-memos';
const DB_VERSION = 1;
const STORE_NAME = 'voiceMemos';

class VoiceMemoStorageManager {
  private db: IDBPDatabase<VoiceMemoDBSchema> | null = null;

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<VoiceMemoDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create object store
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Create indexes for efficient querying
          store.createIndex('by-date', 'createdAt');
          store.createIndex('by-title', 'title');
          store.createIndex('by-tag', 'tags', { multiEntry: true });
        },
      });
    } catch (error) {
      console.error('Failed to initialize voice memo database:', error);
      throw new Error('Unable to initialize voice memo storage');
    }
  }

  /**
   * Save a voice memo to storage
   */
  async saveMemo(memo: VoiceMemo): Promise<void> {
    await this.initialize();

    const record: VoiceMemoRecord = {
      id: memo.id,
      title: memo.title,
      notes: memo.notes,
      tags: memo.tags,
      audioBlob: memo.audioBlob,
      duration: memo.duration,
      createdAt: memo.createdAt.toISOString(),
      updatedAt: memo.updatedAt.toISOString(),
    };

    try {
      await this.db!.put(STORE_NAME, record);
    } catch (error) {
      console.error('Failed to save voice memo:', error);
      throw new Error('Unable to save voice memo');
    }
  }

  /**
   * Get a single voice memo by ID
   */
  async getMemo(id: string): Promise<VoiceMemo | null> {
    await this.initialize();

    try {
      const record = await this.db!.get(STORE_NAME, id);
      if (!record) return null;

      return this.recordToMemo(record);
    } catch (error) {
      console.error('Failed to get voice memo:', error);
      return null;
    }
  }

  /**
   * Get all voice memos
   */
  async getAllMemos(): Promise<VoiceMemo[]> {
    await this.initialize();

    try {
      const records = await this.db!.getAll(STORE_NAME);
      return records.map(record => this.recordToMemo(record));
    } catch (error) {
      console.error('Failed to get all voice memos:', error);
      return [];
    }
  }

  /**
   * Get voice memos by tag
   */
  async getMemosByTag(tag: string): Promise<VoiceMemo[]> {
    await this.initialize();

    try {
      const records = await this.db!.getAllFromIndex(STORE_NAME, 'by-tag', tag);
      return records.map(record => this.recordToMemo(record));
    } catch (error) {
      console.error('Failed to get voice memos by tag:', error);
      return [];
    }
  }

  /**
   * Update an existing voice memo
   */
  async updateMemo(memo: VoiceMemo): Promise<void> {
    await this.initialize();

    const record: VoiceMemoRecord = {
      id: memo.id,
      title: memo.title,
      notes: memo.notes,
      tags: memo.tags,
      audioBlob: memo.audioBlob,
      duration: memo.duration,
      createdAt: memo.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await this.db!.put(STORE_NAME, record);
    } catch (error) {
      console.error('Failed to update voice memo:', error);
      throw new Error('Unable to update voice memo');
    }
  }

  /**
   * Delete a voice memo by ID
   */
  async deleteMemo(id: string): Promise<void> {
    await this.initialize();

    try {
      await this.db!.delete(STORE_NAME, id);
    } catch (error) {
      console.error('Failed to delete voice memo:', error);
      throw new Error('Unable to delete voice memo');
    }
  }

  /**
   * Delete multiple voice memos by IDs
   */
  async deleteMemos(ids: string[]): Promise<void> {
    await this.initialize();

    try {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      await Promise.all([
        ...ids.map(id => tx.store.delete(id)),
        tx.done,
      ]);
    } catch (error) {
      console.error('Failed to delete voice memos:', error);
      throw new Error('Unable to delete voice memos');
    }
  }

  /**
   * Search voice memos by query
   */
  async searchMemos(query: string): Promise<VoiceMemo[]> {
    await this.initialize();

    try {
      const allRecords = await this.db!.getAll(STORE_NAME);
      const lowerQuery = query.toLowerCase();

      const filteredRecords = allRecords.filter(record => {
        return (
          record.title.toLowerCase().includes(lowerQuery) ||
          record.notes.toLowerCase().includes(lowerQuery) ||
          record.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      });

      return filteredRecords.map(record => this.recordToMemo(record));
    } catch (error) {
      console.error('Failed to search voice memos:', error);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    count: number;
    totalSize: number;
    totalDuration: number;
  }> {
    await this.initialize();

    try {
      const records = await this.db!.getAll(STORE_NAME);

      const stats = {
        count: records.length,
        totalSize: 0,
        totalDuration: 0,
      };

      for (const record of records) {
        stats.totalSize += record.audioBlob.size;
        stats.totalDuration += record.duration;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { count: 0, totalSize: 0, totalDuration: 0 };
    }
  }

  /**
   * Export voice memo as downloadable file
   */
  async exportMemo(id: string): Promise<void> {
    const memo = await this.getMemo(id);
    if (!memo) {
      throw new Error('Voice memo not found');
    }

    // Create download link for audio
    const audioUrl = URL.createObjectURL(memo.audioBlob);
    const audioLink = document.createElement('a');
    audioLink.href = audioUrl;
    audioLink.download = `${memo.title.replace(/[^a-z0-9]/gi, '_')}.wav`;
    document.body.appendChild(audioLink);
    audioLink.click();
    document.body.removeChild(audioLink);
    URL.revokeObjectURL(audioUrl);

    // Create and download metadata as JSON
    const metadata = {
      title: memo.title,
      notes: memo.notes,
      tags: memo.tags,
      duration: memo.duration,
      createdAt: memo.createdAt.toISOString(),
      updatedAt: memo.updatedAt.toISOString(),
    };

    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });
    const metadataUrl = URL.createObjectURL(metadataBlob);
    const metadataLink = document.createElement('a');
    metadataLink.href = metadataUrl;
    metadataLink.download = `${memo.title.replace(/[^a-z0-9]/gi, '_')}_metadata.json`;
    document.body.appendChild(metadataLink);
    metadataLink.click();
    document.body.removeChild(metadataLink);
    URL.revokeObjectURL(metadataUrl);
  }

  /**
   * Clear all voice memos (use with caution)
   */
  async clearAll(): Promise<void> {
    await this.initialize();

    try {
      await this.db!.clear(STORE_NAME);
    } catch (error) {
      console.error('Failed to clear voice memos:', error);
      throw new Error('Unable to clear voice memos');
    }
  }

  /**
   * Convert database record to VoiceMemo object
   */
  private recordToMemo(record: VoiceMemoRecord): VoiceMemo {
    return {
      id: record.id,
      title: record.title,
      notes: record.notes,
      tags: record.tags,
      audioBlob: record.audioBlob,
      duration: record.duration,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    };
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const voiceMemoStorage = new VoiceMemoStorageManager();

// Export utility functions
export const formatStorageSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};
