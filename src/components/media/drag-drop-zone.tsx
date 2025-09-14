"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, FileMusic, FileVideo, File, FolderOpen,
  X, Check, AlertCircle, Download, Share2,
  Copy, Link, Mail, MessageSquare, Twitter,
  Facebook, Linkedin, QrCode, Globe, Lock,
  Users, Clock, Eye, EyeOff, Settings
} from 'lucide-react';
import { MultiUserFileManager, MediaFile } from '@/lib/file-management/multi-user-system';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  mediaFile?: MediaFile;
}

interface ShareOptions {
  method: 'link' | 'email' | 'social' | 'embed' | 'qr';
  isPublic: boolean;
  permissions: ('read' | 'write' | 'comment' | 'download')[];
  expiryDays?: number;
  password?: string;
  allowComments: boolean;
  allowDownload: boolean;
  recipients?: string[];
}

interface DragDropZoneProps {
  userId: string;
  fileManager: MultiUserFileManager;
  onFilesUploaded?: (files: MediaFile[]) => void;
  onFileShared?: (file: MediaFile, shareData: any) => void;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  className?: string;
}

export function DragDropZone({
  userId,
  fileManager,
  onFilesUploaded,
  onFileShared,
  maxFiles = 10,
  maxSize = 1024 * 1024 * 1024, // 1GB
  acceptedTypes = ['audio/*', 'video/*'],
  className = ""
}: DragDropZoneProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedFileForSharing, setSelectedFileForSharing] = useState<MediaFile | null>(null);
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    method: 'link',
    isPublic: false,
    permissions: ['read'],
    allowComments: false,
    allowDownload: true
  });
  const [generatedShareLink, setGeneratedShareLink] = useState<string | null>(null);
  const [isBulkUpload, setIsBulkUpload] = useState(false);

  // Touch and gesture support
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();

  // File validation
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type === '*/*') return true;
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return { valid: false, error: 'File type not supported' };
    }

    // Check file size
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds limit' };
    }

    // Check for malicious files
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (suspiciousExtensions.includes(extension)) {
      return { valid: false, error: 'File type not allowed for security reasons' };
    }

    return { valid: true };
  }, [acceptedTypes, maxSize]);

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      console.error(`File ${file.name} rejected:`, errors);
    });

    // Validate and queue accepted files
    const validFiles: UploadItem[] = [];

    for (const file of acceptedFiles) {
      const validation = validateFile(file);

      if (validation.valid) {
        validFiles.push({
          id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          progress: 0,
          status: 'pending'
        });
      }
    }

    // Check total file count
    if (uploadQueue.length + validFiles.length > maxFiles) {
      console.error(`Cannot upload more than ${maxFiles} files at once`);
      return;
    }

    // Add to upload queue
    setUploadQueue(prev => [...prev, ...validFiles]);

    // Start uploads
    for (const uploadItem of validFiles) {
      uploadFile(uploadItem);
    }
  }, [uploadQueue, validateFile, maxFiles]);

  // Configure dropzone
  const {
    getRootProps,
    getInputProps,
    isDragActive: dropzoneIsDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles,
    maxSize,
    multiple: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false)
  });

  // Upload file function
  const uploadFile = async (uploadItem: UploadItem) => {
    try {
      // Update status to uploading
      setUploadQueue(prev => prev.map(item =>
        item.id === uploadItem.id ? { ...item, status: 'uploading' } : item
      ));

      // Simulate upload progress (in production, this would be real upload progress)
      const progressInterval = setInterval(() => {
        setUploadQueue(prev => prev.map(item => {
          if (item.id === uploadItem.id && item.progress < 90) {
            return { ...item, progress: item.progress + Math.random() * 20 };
          }
          return item;
        }));
      }, 200);

      // Upload file using file manager
      const result = await fileManager.uploadFile(uploadItem.file, userId, {
        autoProcess: true,
        tags: ['uploaded'],
        sharing: { isPublic: false, permissions: ['read'] }
      });

      clearInterval(progressInterval);

      if (result.success && result.fileId) {
        // Get the uploaded file details
        const fileResult = await fileManager.getFile(result.fileId, userId);

        if (fileResult.file) {
          // Update status to completed
          setUploadQueue(prev => prev.map(item =>
            item.id === uploadItem.id
              ? { ...item, status: 'completed', progress: 100, mediaFile: fileResult.file }
              : item
          ));

          // Notify parent component
          onFilesUploaded?.([fileResult.file]);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);

      setUploadQueue(prev => prev.map(item =>
        item.id === uploadItem.id
          ? { ...item, status: 'error', error: error.message }
          : item
      ));
    }
  };

  // Remove upload item
  const removeUploadItem = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  // Clear completed uploads
  const clearCompleted = () => {
    setUploadQueue(prev => prev.filter(item => item.status !== 'completed'));
  };

  // Share file
  const shareFile = async (file: MediaFile) => {
    setSelectedFileForSharing(file);
    setShowShareDialog(true);
  };

  // Generate share link
  const generateShareLink = async () => {
    if (!selectedFileForSharing) return;

    try {
      const result = await fileManager.shareFile(
        selectedFileForSharing.id,
        userId,
        {
          isPublic: shareOptions.isPublic,
          permissions: shareOptions.permissions,
          expiryDays: shareOptions.expiryDays
        }
      );

      if (result.success && result.shareToken) {
        const baseUrl = window.location.origin;
        const shareLink = `${baseUrl}/shared/${result.shareToken}`;
        setGeneratedShareLink(shareLink);

        // Notify parent component
        onFileShared?.(selectedFileForSharing, {
          shareLink,
          shareToken: result.shareToken,
          method: shareOptions.method
        });
      }
    } catch (error) {
      console.error('Share generation failed:', error);
    }
  };

  // Copy share link to clipboard
  const copyShareLink = async () => {
    if (generatedShareLink) {
      try {
        await navigator.clipboard.writeText(generatedShareLink);
        // Show success feedback
      } catch (error) {
        console.error('Copy to clipboard failed:', error);
      }
    }
  };

  // Generate QR code for share link
  const generateQRCode = async () => {
    if (generatedShareLink) {
      // Generate QR code (in production, use a QR code library)
      console.log('Generating QR code for:', generatedShareLink);
    }
  };

  // Touch event handlers for mobile
  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsLongPress(false);

    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      // Trigger context menu or selection mode
    }, 800);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (touchStartPos && longPressTimer.current) {
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);

      // Cancel long press if user moved too much
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = undefined;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
    setTouchStartPos(null);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('audio/')) return FileMusic;
    if (file.type.startsWith('video/')) return FileVideo;
    return File;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Drop Zone */}
      <Card
        {...getRootProps()}
        className={`
          relative border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragActive || dropzoneIsDragActive
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isDragReject ? 'border-red-500 bg-red-50' : ''}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <input {...getInputProps()} />

        <div className="p-12 text-center">
          <div className="flex justify-center mb-4">
            {isDragActive || dropzoneIsDragActive ? (
              <Download className="h-16 w-16 text-blue-500 animate-bounce" />
            ) : (
              <Upload className="h-16 w-16 text-gray-400" />
            )}
          </div>

          <h3 className="text-xl font-semibold mb-2">
            {isDragActive || dropzoneIsDragActive
              ? 'Drop files here!'
              : 'Drag & drop media files'
            }
          </h3>

          <p className="text-gray-600 mb-4">
            {isDragReject
              ? 'Some files are not supported'
              : `or click to browse • Max ${maxFiles} files • Up to ${formatFileSize(maxSize)} each`
            }
          </p>

          <div className="flex justify-center gap-2 mb-4">
            {acceptedTypes.includes('audio/*') && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileMusic className="h-3 w-3" />
                Audio
              </Badge>
            )}
            {acceptedTypes.includes('video/*') && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileVideo className="h-3 w-3" />
                Video
              </Badge>
            )}
          </div>

          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
        </div>

        {/* Touch feedback overlay */}
        {isLongPress && (
          <div className="absolute inset-0 bg-blue-200 bg-opacity-30 rounded-lg pointer-events-none" />
        )}
      </Card>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Upload Progress ({uploadQueue.length} file{uploadQueue.length !== 1 ? 's' : ''})
            </h3>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCompleted}
                disabled={!uploadQueue.some(item => item.status === 'completed')}
              >
                Clear Completed
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkUpload(!isBulkUpload)}
              >
                {isBulkUpload ? 'Individual' : 'Bulk'} View
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {uploadQueue.map((item) => {
              const Icon = getFileIcon(item.file);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className="h-8 w-8 text-gray-500 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{item.file.name}</span>
                        <span className="text-sm text-gray-500 flex-shrink-0">
                          {formatFileSize(item.file.size)}
                        </span>
                      </div>

                      {item.status === 'uploading' && (
                        <Progress value={item.progress} className="h-2" />
                      )}

                      {item.error && (
                        <div className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {item.error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === 'completed' && item.mediaFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => shareFile(item.mediaFile!)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}

                    {item.status === 'pending' && (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}

                    {item.status === 'uploading' && (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                    )}

                    {item.status === 'completed' && (
                      <Check className="h-5 w-5 text-green-600" />
                    )}

                    {item.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUploadItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Share Dialog */}
      {showShareDialog && selectedFileForSharing && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Share File</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowShareDialog(false);
                setSelectedFileForSharing(null);
                setGeneratedShareLink(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">{selectedFileForSharing.originalName}</h4>
              <p className="text-sm text-gray-600">
                {formatFileSize(selectedFileForSharing.size)} • {selectedFileForSharing.fileType}
              </p>
            </div>

            <Tabs value={shareOptions.method} onValueChange={(value) =>
              setShareOptions(prev => ({ ...prev, method: value as ShareOptions['method'] }))
            }>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="link" className="flex items-center gap-1">
                  <Link className="h-3 w-3" />
                  Link
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="social" className="flex items-center gap-1">
                  <Share2 className="h-3 w-3" />
                  Social
                </TabsTrigger>
                <TabsTrigger value="qr" className="flex items-center gap-1">
                  <QrCode className="h-3 w-3" />
                  QR Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShareOptions(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                  >
                    {shareOptions.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {shareOptions.isPublic ? 'Public' : 'Private'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShareOptions(prev => ({
                      ...prev,
                      allowDownload: !prev.allowDownload
                    }))}
                  >
                    {shareOptions.allowDownload ? <Download className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {shareOptions.allowDownload ? 'Allow Download' : 'View Only'}
                  </Button>
                </div>

                {!generatedShareLink ? (
                  <Button onClick={generateShareLink}>
                    Generate Share Link
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                      <input
                        type="text"
                        value={generatedShareLink}
                        readOnly
                        className="flex-1 bg-transparent text-sm"
                      />
                      <Button size="sm" onClick={copyShareLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="email" className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Recipients</label>
                  <input
                    type="email"
                    multiple
                    placeholder="Enter email addresses separated by commas"
                    className="w-full mt-1 p-2 border rounded"
                    onChange={(e) => setShareOptions(prev => ({
                      ...prev,
                      recipients: e.target.value.split(',').map(email => email.trim())
                    }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="justify-start">
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="qr" className="space-y-4">
                <div className="text-center">
                  {generatedShareLink ? (
                    <div className="space-y-4">
                      <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                        <QrCode className="h-16 w-16 text-gray-400" />
                        <span className="ml-2 text-sm text-gray-600">QR Code</span>
                      </div>
                      <Button size="sm" onClick={generateQRCode}>
                        Generate QR Code
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-600">
                      Generate a share link first to create QR code
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      )}
    </div>
  );
}