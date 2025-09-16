"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { AudioSlider } from '../ui/slider';
import { Upload, FileAudio, FileVideo, File as FileIcon, Trash2, Play, Pause, Download, Archive, Mic, Video, Headphones, Volume2, VolumeX, RotateCcw, FastForward, Rewind, Settings } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

interface MediaFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  duration?: number;
  preview?: string;
  uploadProgress: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  streams?: {
    voice: string;
    music: string;
    ambient: string;
    noise: string;
  };
  metadata?: {
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
    codec?: string;
  };
}

interface MediaUploadProps {
  onFilesUploaded?: (files: MediaFile[]) => void;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
}

export function ComprehensiveMediaUpload({
  onFilesUploaded,
  maxFiles = 10,
  maxSize = 500 * 1024 * 1024, // 500MB default
  className
}: MediaUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video'>('audio');
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingFile, setPlayingFile] = useState<string | null>(null);
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState(6);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Comprehensive media format support
  const supportedFormats = {
    audio: [
      'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'opus', 'wma', 'aiff', 
      'au', 'ra', 'amr', 'ac3', 'mp2', 'wv', 'tta', 'dts', 'mka'
    ],
    video: [
      'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 
      'mpeg', '3gp', 'asf', 'rm', 'rmvb', 'vob', 'ogv', 'mts', 'ts'
    ],
    compressed: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
    document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'srt', 'vtt', 'ass']
  };

  const allSupportedFormats = [
    ...supportedFormats.audio,
    ...supportedFormats.video,
    ...supportedFormats.compressed,
    ...supportedFormats.document
  ];

  // Initialize audio context
  const initializeAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allSupportedFormats.includes(fileExtension)) {
      return `Unsupported format: ${fileExtension}. Supported: ${allSupportedFormats.join(', ')}`;
    }
    
    if (file.size > maxSize) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${maxSize / 1024 / 1024}MB`;
    }
    
    return null;
  }, [maxSize]);

  // Extract media metadata
  const extractMediaMetadata = useCallback(async (file: File): Promise<MediaFile['metadata']> => {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      const isVideo = supportedFormats.video.includes(file.name.split('.').pop()?.toLowerCase() || '');
      const element = isVideo ? video : audio;
      
      element.src = url;
      element.addEventListener('loadedmetadata', () => {
        const metadata: MediaFile['metadata'] = {
          channels: isVideo ? undefined : (audio as any).mozChannels || 2,
          sampleRate: isVideo ? undefined : (audio as any).mozSampleRate || 44100,
        };
        
        URL.revokeObjectURL(url);
        resolve(metadata);
      });
      
      element.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve({});
      });
    });
  }, []);

  // Handle file uploads
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of acceptedFiles) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      alert('Upload errors:\n' + errors.join('\n'));
    }

    if (validFiles.length === 0) return;

    const newFiles: MediaFile[] = [];

    for (const file of validFiles) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const isCompressed = supportedFormats.compressed.includes(fileExtension);
      
      if (isCompressed) {
        // Handle compressed files
        try {
          const extractedFiles = await handleCompressedFile(file);
          newFiles.push(...extractedFiles);
        } catch (error) {
          console.error('Failed to extract compressed file:', error);
        }
      } else {
        const metadata = await extractMediaMetadata(file);
        const mediaFile: MediaFile = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || `application/${fileExtension}`,
          uploadProgress: 0,
          processingStatus: 'pending',
          metadata,
          preview: supportedFormats.video.includes(fileExtension) ? URL.createObjectURL(file) : undefined
        };

        newFiles.push(mediaFile);
        
        // Simulate upload progress
        simulateUpload(mediaFile.id);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    onFilesUploaded?.(newFiles);
  }, [validateFile, extractMediaMetadata, onFilesUploaded]);

  // Handle compressed file extraction
  const handleCompressedFile = useCallback(async (zipFile: File): Promise<MediaFile[]> => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);
    const extractedFiles: MediaFile[] = [];

    for (const [filename, file] of Object.entries(contents.files)) {
      if (!file.dir) {
        const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
        if (allSupportedFormats.includes(fileExtension)) {
          const blob = await file.async('blob');
          const extractedFile = new File([blob], filename, { type: blob.type });
          
          const metadata = await extractMediaMetadata(extractedFile);
          const mediaFile: MediaFile = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file: extractedFile,
            name: filename,
            size: extractedFile.size,
            type: extractedFile.type || `application/${fileExtension}`,
            uploadProgress: 100,
            processingStatus: 'pending',
            metadata
          };

          extractedFiles.push(mediaFile);
        }
      }
    }

    return extractedFiles;
  }, [extractMediaMetadata]);

  // Simulate upload progress
  const simulateUpload = useCallback((fileId: string) => {
    const interval = setInterval(() => {
      setUploadedFiles(prev => prev.map(file => {
        if (file.id === fileId && file.uploadProgress < 100) {
          const newProgress = Math.min(file.uploadProgress + Math.random() * 15, 100);
          return {
            ...file,
            uploadProgress: newProgress,
            processingStatus: newProgress === 100 ? 'processing' : 'pending'
          };
        }
        return file;
      }));
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setUploadedFiles(prev => prev.map(file => 
        file.id === fileId 
          ? { ...file, uploadProgress: 100, processingStatus: 'completed' }
          : file
      ));
    }, 3000);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const constraints = recordingType === 'video' 
        ? { audio: true, video: { width: 1280, height: 720, facingMode: 'user' } }
        : { audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            sampleRate: 48000,
            channelCount: 2
          } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: recordingType === 'video' ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus'
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { 
          type: recordingType === 'video' ? 'video/webm' : 'audio/webm' 
        });
        
        const fileName = `recorded_${recordingType}_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        const recordedFile = new File([blob], fileName, { type: blob.type });

        const mediaFile: MediaFile = {
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file: recordedFile,
          name: fileName,
          size: recordedFile.size,
          type: recordedFile.type,
          uploadProgress: 100,
          processingStatus: 'completed',
          preview: recordingType === 'video' ? URL.createObjectURL(blob) : undefined
        };

        setUploadedFiles(prev => [...prev, mediaFile]);
        onFilesUploaded?.([mediaFile]);

        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please check permissions.');
    }
  }, [recordingType, onFilesUploaded]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // Create compressed archive
  const createArchive = useCallback(async (files: MediaFile[], format: 'zip' | 'tar' = 'zip') => {
    setBulkProcessing(true);
    
    try {
      const zip = new JSZip();
      
      for (const mediaFile of files) {
        zip.file(mediaFile.name, mediaFile.file);
      }

      const compressionOptions = {
        type: 'blob' as const,
        compression: compressionEnabled ? 'DEFLATE' as const : 'STORE' as const,
        compressionOptions: {
          level: compressionLevel
        }
      };

      const content = await zip.generateAsync(compressionOptions);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(content, `anc_audio_archive_${timestamp}.zip`);
      
    } catch (error) {
      console.error('Failed to create archive:', error);
      alert('Failed to create archive');
    } finally {
      setBulkProcessing(false);
    }
  }, [compressionEnabled, compressionLevel]);

  // Bulk export processed files
  const bulkExportProcessed = useCallback(async () => {
    const processedFiles = uploadedFiles.filter(f => f.processingStatus === 'completed' && f.streams);
    
    if (processedFiles.length === 0) {
      alert('No processed files available for export');
      return;
    }

    setBulkProcessing(true);
    const zip = new JSZip();

    try {
      for (const mediaFile of processedFiles) {
        const folder = zip.folder(mediaFile.name.split('.')[0]);
        
        if (mediaFile.streams && folder) {
          // Create mock stream files (in real implementation, these would be actual processed streams)
          Object.entries(mediaFile.streams).forEach(([streamType, streamUrl]) => {
            folder.file(`${streamType}_stream.wav`, `Mock ${streamType} stream data for ${mediaFile.name}`);
          });
        }
      }

      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(content, `anc_processed_streams_${timestamp}.zip`);

    } catch (error) {
      console.error('Failed to export processed files:', error);
      alert('Failed to export processed files');
    } finally {
      setBulkProcessing(false);
    }
  }, [uploadedFiles]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get file type icon
  const getFileIcon = (file: MediaFile) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (supportedFormats.audio.includes(extension)) {
      return <FileAudio className="w-8 h-8 text-blue-600" />;
    } else if (supportedFormats.video.includes(extension)) {
      return <FileVideo className="w-8 h-8 text-purple-600" />;
    } else {
      return <FileIcon className="w-8 h-8 text-gray-600" />;
    }
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': supportedFormats.audio.map(ext => `.${ext}`),
      'video/*': supportedFormats.video.map(ext => `.${ext}`),
      'application/*': [...supportedFormats.compressed, ...supportedFormats.document].map(ext => `.${ext}`)
    },
    maxFiles,
    maxSize,
    multiple: true
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [uploadedFiles]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-6 h-6" />
            📁 Comprehensive Media Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50",
              isDragActive ? "border-blue-500 bg-blue-100" : "border-gray-300"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">
              {isDragActive
                ? "Drop files here..."
                : "Drag & drop media files, or click to select"}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Supports: Audio, Video, Archives, Documents
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500 max-w-2xl mx-auto">
              <div><strong>Audio:</strong> MP3, WAV, FLAC, AAC, M4A, OGG, OPUS</div>
              <div><strong>Video:</strong> MP4, AVI, MKV, MOV, WEBM, FLV</div>
              <div><strong>Archives:</strong> ZIP, RAR, 7Z, TAR, GZ</div>
              <div><strong>Documents:</strong> SRT, VTT, ASS, TXT, PDF</div>
            </div>
          </div>

          {/* Compression Settings */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Archive Settings
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="compression"
                  checked={compressionEnabled}
                  onChange={(e) => setCompressionEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="compression" className="text-sm">Enable Compression</label>
              </div>
            </div>
            
            {compressionEnabled && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Compression Level: {compressionLevel}</label>
                <AudioSlider
                  value={[compressionLevel]}
                  onValueChange={(value) => setCompressionLevel(value[0])}
                  min={0}
                  max={9}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Faster</span>
                  <span>Smaller Size</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {recordingType === 'audio' ? <Mic className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            🎙️ Live Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="audio-recording"
                  name="recording-type"
                  value="audio"
                  checked={recordingType === 'audio'}
                  onChange={(e) => setRecordingType(e.target.value as 'audio')}
                  disabled={isRecording}
                />
                <label htmlFor="audio-recording" className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Audio
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="video-recording"
                  name="recording-type"
                  value="video"
                  checked={recordingType === 'video'}
                  onChange={(e) => setRecordingType(e.target.value as 'video')}
                  disabled={isRecording}
                />
                <label htmlFor="video-recording" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {isRecording ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    {recordingType === 'audio' ? <Mic className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    Start {recordingType === 'audio' ? 'Audio' : 'Video'} Recording
                  </>
                )}
              </Button>

              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-mono font-bold text-red-600">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-6 h-6" />
              🔧 Bulk Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => createArchive(uploadedFiles)}
                disabled={bulkProcessing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                Create Archive ({uploadedFiles.length} files)
              </Button>

              <Button
                onClick={bulkExportProcessed}
                disabled={bulkProcessing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Processed Streams
              </Button>

              <Button
                onClick={() => setUploadedFiles([])}
                disabled={bulkProcessing}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </div>

            {bulkProcessing && (
              <div className="mt-4 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                <span className="text-sm">Processing...</span>
              </div>
            )}
        </CardContent>
      </Card>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileIcon className="w-6 h-6" />
              📋 Uploaded Files ({uploadedFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getFileIcon(file)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium truncate">{file.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            file.processingStatus === 'completed' && "bg-green-100 text-green-800",
                            file.processingStatus === 'processing' && "bg-yellow-100 text-yellow-800",
                            file.processingStatus === 'pending' && "bg-gray-100 text-gray-800",
                            file.processingStatus === 'error' && "bg-red-100 text-red-800"
                          )}>
                            {file.processingStatus}
                          </span>
                          <Button
                            onClick={() => removeFile(file.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <span>{formatFileSize(file.size)}</span>
                        {file.metadata && (
                          <span className="ml-4">
                            {file.metadata.sampleRate && `${file.metadata.sampleRate}Hz`}
                            {file.metadata.channels && ` • ${file.metadata.channels}ch`}
                          </span>
                        )}
                      </div>

                      {file.uploadProgress < 100 && (
                        <div className="mb-2">
                          <Progress value={file.uploadProgress} className="w-full" />
                          <span className="text-xs text-gray-500">
                            Uploading... {file.uploadProgress.toFixed(0)}%
                          </span>
                        </div>
                      )}

                      {file.preview && (
                        <div className="mt-3">
                          <video
                            src={file.preview}
                            controls
                            className="max-w-xs rounded border"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}

                      {file.streams && (
                        <div className="mt-3 p-3 bg-green-50 rounded border">
                          <h5 className="font-medium text-green-800 mb-2">Processed Streams:</h5>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>🎤 Voice Stream</div>
                            <div>🎵 Music Stream</div>
                            <div>🌊 Ambient Stream</div>
                            <div>🔇 Noise Stream</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}