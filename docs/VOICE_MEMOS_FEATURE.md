# 🎤 Voice Memos Feature Documentation

## Overview

The Voice Memos feature provides a complete audio note-taking system for the ANC Audio Pro application. Users can record audio memos, add text notes, organize with tags, and manage their recordings all within a beautiful, responsive interface.

## Features

### 🎙️ Recording Capabilities
- **Professional Audio Recording**: Mono 44.1kHz WAV format optimized for voice
- **Real-time Level Monitoring**: Visual feedback with clipping detection
- **Pause/Resume Support**: Full control during recording
- **Maximum Duration**: 10 minutes per memo (configurable)
- **Microphone Permission Handling**: User-friendly permission flow

### 📝 Note-Taking Integration
- **Live Note-Taking**: Add notes during or after recording
- **Rich Metadata**: Title, notes, and custom tags
- **Auto-generated Titles**: Smart defaults based on timestamp
- **Character Counter**: Track note length in real-time

### 🏷️ Organization System
- **Tag Support**: Add multiple tags to each memo
- **Tag-based Filtering**: Quick access by tags
- **Search Functionality**: Search across titles, notes, and tags
- **Multi-sort Options**: Sort by date, title, or duration

### 📚 Library Management
- **Audio Playback**: In-browser playback of recorded memos
- **Edit Capabilities**: Update titles and notes after creation
- **Download Function**: Export memos as WAV files with metadata
- **Delete with Confirmation**: Safe deletion workflow
- **Storage Statistics**: Track total memos, duration, and storage used

### 💾 Persistent Storage
- **IndexedDB Integration**: Local browser storage for persistence
- **Automatic Backups**: Data persists across sessions
- **No Server Required**: Fully client-side storage
- **Export Options**: Download audio + metadata JSON

## Architecture

### Component Structure

```
src/components/audio/voice-memos/
├── VoiceMemoRecorder.tsx    # Recording interface with notes
├── VoiceMemoLibrary.tsx     # Library view with playback
├── VoiceMemoManager.tsx     # Main container component
└── index.ts                 # Module exports
```

### Storage Layer

```
src/lib/audio/
└── voice-memo-storage.ts    # IndexedDB manager
```

### Integration Points

```
src/app/dashboard/
├── page.tsx                        # Dashboard with voice memos tab
└── voice-memos/
    └── page.tsx                    # Dedicated voice memos page
```

## Usage

### Accessing Voice Memos

#### From Dashboard
1. Navigate to `/dashboard`
2. Click the **🎤 Voice Memos** tab
3. Start recording or view your library

#### Dedicated Page
- Visit `/dashboard/voice-memos` for a full-screen experience

### Recording a Voice Memo

1. Click "New Memo" button
2. Allow microphone access when prompted
3. Click the red "Record" button to start
4. Monitor your input levels (avoid red "CLIP" indicator)
5. Use Pause/Resume as needed
6. Click "Stop" when finished
7. Add title, notes, and tags
8. Click "Save Voice Memo"

### Managing Voice Memos

#### Library View
- **Search**: Use the search bar to find memos
- **Filter**: Click tags to filter by specific tags
- **Sort**: Choose sorting method (date, title, duration)
- **Play**: Click play button to listen
- **Edit**: Update title and notes
- **Download**: Export audio file with metadata
- **Delete**: Remove with confirmation

#### Storage Information
The header displays:
- Total number of memos
- Combined duration of all memos
- Total storage space used

## Technical Details

### Audio Specifications
- **Format**: WAV (Web Audio API)
- **Sample Rate**: 44.1 kHz
- **Bit Depth**: 16-bit (browser default)
- **Channels**: Mono (optimized for voice)
- **Codec**: PCM (uncompressed)

### Storage Details
- **Technology**: IndexedDB via `idb` library
- **Database Name**: `anc-voice-memos`
- **Version**: 1
- **Store Name**: `voiceMemos`

#### Indexes
- `by-date`: Indexed by creation date
- `by-title`: Indexed by title
- `by-tag`: Multi-entry index for tags

### Data Model

```typescript
interface VoiceMemo {
  id: string;              // Unique identifier
  title: string;           // User-defined title
  notes: string;           // Text notes
  tags: string[];          // Organizational tags
  audioBlob: Blob;         // Audio data
  duration: number;        // Recording length in seconds
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last modification timestamp
}
```

## API Reference

### VoiceMemoManager Props

```typescript
interface VoiceMemoManagerProps {
  className?: string;
}
```

### VoiceMemoRecorder Props

```typescript
interface VoiceMemoRecorderProps {
  onSave?: (memo: VoiceMemo) => void;
  onCancel?: () => void;
  className?: string;
}
```

### VoiceMemoLibrary Props

```typescript
interface VoiceMemoLibraryProps {
  memos: VoiceMemo[];
  onDelete?: (memoId: string) => void;
  onUpdate?: (memo: VoiceMemo) => void;
  className?: string;
}
```

### Storage Manager Methods

```typescript
class VoiceMemoStorageManager {
  initialize(): Promise<void>
  saveMemo(memo: VoiceMemo): Promise<void>
  getMemo(id: string): Promise<VoiceMemo | null>
  getAllMemos(): Promise<VoiceMemo[]>
  getMemosByTag(tag: string): Promise<VoiceMemo[]>
  updateMemo(memo: VoiceMemo): Promise<void>
  deleteMemo(id: string): Promise<void>
  deleteMemos(ids: string[]): Promise<void>
  searchMemos(query: string): Promise<VoiceMemo[]>
  getStorageStats(): Promise<StorageStats>
  exportMemo(id: string): Promise<void>
  clearAll(): Promise<void>
}
```

## Browser Compatibility

### Required APIs
- ✅ MediaRecorder API
- ✅ Web Audio API
- ✅ IndexedDB
- ✅ Blob API
- ✅ getUserMedia

### Supported Browsers
- ✅ Chrome 49+
- ✅ Firefox 25+
- ✅ Safari 14+
- ✅ Edge 79+
- ✅ Mobile Safari 14+
- ✅ Chrome Mobile 49+

## Security & Privacy

### Local-Only Storage
- All voice memos stored locally in browser
- No automatic server uploads
- No data sharing without explicit user action
- Deletion is permanent and immediate

### Permissions
- Microphone access required for recording
- User prompted only when needed
- Permission state persists per browser standards

### Data Export
Users can manually export:
- Audio files (WAV format)
- Metadata (JSON format)
- Complete backup with both

## Performance Considerations

### Storage Limits
- **IndexedDB Quota**: Typically 50% of available disk space
- **Recommended**: Monitor storage stats regularly
- **Best Practice**: Export and archive old memos

### Memory Usage
- Audio data stored as Blobs (efficient)
- Only active playback loads full audio into memory
- Automatic cleanup on component unmount

### Optimization Tips
1. Keep recordings under 10 minutes
2. Regularly export and delete old memos
3. Use tags for organization instead of long titles
4. Monitor storage statistics

## Troubleshooting

### Microphone Not Working
1. Check browser permissions in settings
2. Ensure HTTPS connection (required for getUserMedia)
3. Verify microphone hardware connection
4. Check for browser microphone access conflicts

### Storage Issues
1. Check available disk space
2. Clear browser cache if quota exceeded
3. Export and delete old memos
4. Check IndexedDB in browser DevTools

### Audio Playback Problems
1. Verify browser audio support
2. Check system volume settings
3. Test with different browsers
4. Clear browser cache

### Performance Issues
1. Limit concurrent recordings
2. Close unused browser tabs
3. Update to latest browser version
4. Check system resources

## Future Enhancements

### Planned Features
- [ ] Audio transcription (speech-to-text)
- [ ] Cloud backup integration
- [ ] Sharing capabilities
- [ ] Audio enhancement during recording
- [ ] Batch export/import
- [ ] Advanced search filters
- [ ] Waveform visualization
- [ ] Voice commands integration
- [ ] Multi-device sync (optional cloud)
- [ ] Collaborative notes

### Integration Opportunities
- Integrate with existing ANC+ processing
- Apply real-time noise cancellation
- Use AI features for transcription
- Connect to project management
- Export to podcast workflow

## Development

### Adding New Features

1. **Storage Schema Changes**
   ```typescript
   // Update in voice-memo-storage.ts
   interface VoiceMemoDBSchema extends DBSchema {
     voiceMemos: {
       key: string;
       value: VoiceMemoRecord;
       indexes: {
         'by-date': Date;
         'by-title': string;
         'by-tag': string;
         'by-custom': CustomType; // Add new index
       };
     };
   }
   ```

2. **UI Enhancements**
   - Update components in `/components/audio/voice-memos/`
   - Maintain existing prop interfaces for compatibility
   - Follow existing design patterns

3. **Testing**
   ```bash
   npm run test -- voice-memo
   ```

### Code Style
- TypeScript strict mode enabled
- Functional components with hooks
- Error handling with try/catch
- Toast notifications for user feedback
- Responsive design with Tailwind CSS

## Support

For issues or feature requests:
1. Check this documentation
2. Review browser console for errors
3. Test in different browser
4. Report issue with reproduction steps

---

**Built with ❤️ for ANC Audio Pro**
