import { EventEmitter } from 'events';

export interface StreamingCredentials {
  platform: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  channelId?: string;
  userId?: string;
}

export interface StreamConfig {
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  scheduledTime?: Date;
  privacy: 'public' | 'unlisted' | 'private';
  monetization?: boolean;
  chatEnabled?: boolean;
  recordingEnabled?: boolean;
}

export interface UploadProgress {
  platform: string;
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  estimatedTimeRemaining: number;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface LiveStreamSettings {
  streamKey: string;
  serverUrl: string;
  bitrate: number;
  resolution: { width: number; height: number };
  frameRate: number;
  audioCodec: 'AAC' | 'MP3';
  videoCodec: 'H264' | 'H265';
  latencyMode: 'normal' | 'low' | 'ultra-low';
}

export interface PlatformAnalytics {
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  subscribers: number;
  watchTime: number;
  engagement: number;
  revenue?: number;
  demographics: {
    ageGroups: Record<string, number>;
    geography: Record<string, number>;
    devices: Record<string, number>;
  };
}

export class StreamingPlatformManager extends EventEmitter {
  private credentials: Map<string, StreamingCredentials> = new Map();
  private uploadQueue: Map<string, UploadProgress> = new Map();
  private liveStreams: Map<string, LiveStreamSettings> = new Map();

  constructor() {
    super();
  }

  async authenticatePlatform(platform: string, authCode?: string): Promise<boolean> {
    try {
      const platformConfig = this.getPlatformConfig(platform);

      if (authCode) {
        const credentials = await this.exchangeCodeForTokens(platform, authCode);
        this.credentials.set(platform, credentials);
      } else {
        const authUrl = this.generateAuthUrl(platform);
        this.emit('authRequired', { platform, authUrl });
        return false;
      }

      this.emit('authenticated', { platform });
      return true;
    } catch (error) {
      this.emit('error', { platform, error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async uploadContent(
    platform: string,
    audioFile: File,
    config: StreamConfig,
    thumbnailFile?: File
  ): Promise<string> {
    const uploadId = `${platform}-${Date.now()}`;

    const progress: UploadProgress = {
      platform,
      fileName: audioFile.name,
      bytesUploaded: 0,
      totalBytes: audioFile.size,
      percentage: 0,
      estimatedTimeRemaining: 0,
      status: 'queued'
    };

    this.uploadQueue.set(uploadId, progress);
    this.emit('uploadStarted', { uploadId, progress });

    try {
      const credentials = this.credentials.get(platform);
      if (!credentials) {
        throw new Error(`Not authenticated with ${platform}`);
      }

      progress.status = 'uploading';
      this.uploadQueue.set(uploadId, progress);

      let contentUrl: string;

      switch (platform) {
        case 'youtube':
          contentUrl = await this.uploadToYouTube(audioFile, config, credentials, uploadId);
          break;
        case 'spotify':
          contentUrl = await this.uploadToSpotify(audioFile, config, credentials, uploadId);
          break;
        case 'apple-podcasts':
          contentUrl = await this.uploadToApplePodcasts(audioFile, config, credentials, uploadId);
          break;
        case 'soundcloud':
          contentUrl = await this.uploadToSoundCloud(audioFile, config, credentials, uploadId);
          break;
        case 'twitch':
          contentUrl = await this.uploadToTwitch(audioFile, config, credentials, uploadId);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      progress.status = 'completed';
      progress.percentage = 100;
      this.uploadQueue.set(uploadId, progress);
      this.emit('uploadCompleted', { uploadId, contentUrl });

      return contentUrl;
    } catch (error) {
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : String(error);
      this.uploadQueue.set(uploadId, progress);
      this.emit('uploadError', { uploadId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async startLiveStream(platform: string, config: StreamConfig): Promise<LiveStreamSettings> {
    try {
      const credentials = this.credentials.get(platform);
      if (!credentials) {
        throw new Error(`Not authenticated with ${platform}`);
      }

      let streamSettings: LiveStreamSettings;

      switch (platform) {
        case 'youtube':
          streamSettings = await this.startYouTubeLiveStream(config, credentials);
          break;
        case 'twitch':
          streamSettings = await this.startTwitchLiveStream(config, credentials);
          break;
        case 'facebook':
          streamSettings = await this.startFacebookLiveStream(config, credentials);
          break;
        default:
          throw new Error(`Live streaming not supported on ${platform}`);
      }

      this.liveStreams.set(platform, streamSettings);
      this.emit('liveStreamStarted', { platform, streamSettings });

      return streamSettings;
    } catch (error) {
      this.emit('error', { platform, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getAnalytics(platform: string, contentId?: string): Promise<PlatformAnalytics> {
    try {
      const credentials = this.credentials.get(platform);
      if (!credentials) {
        throw new Error(`Not authenticated with ${platform}`);
      }

      let analytics: PlatformAnalytics;

      switch (platform) {
        case 'youtube':
          analytics = await this.getYouTubeAnalytics(credentials, contentId);
          break;
        case 'spotify':
          analytics = await this.getSpotifyAnalytics(credentials, contentId);
          break;
        case 'soundcloud':
          analytics = await this.getSoundCloudAnalytics(credentials, contentId);
          break;
        default:
          throw new Error(`Analytics not available for ${platform}`);
      }

      return analytics;
    } catch (error) {
      this.emit('error', { platform, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async scheduleContent(
    platform: string,
    audioFile: File,
    config: StreamConfig & { scheduledTime: Date }
  ): Promise<string> {
    const scheduleId = `${platform}-scheduled-${Date.now()}`;

    // Store for later execution
    const scheduledContent = {
      id: scheduleId,
      platform,
      audioFile,
      config,
      status: 'scheduled'
    };

    // Set up timer for automatic upload
    const delay = config.scheduledTime.getTime() - Date.now();

    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.uploadContent(platform, audioFile, config);
          this.emit('scheduledContentPublished', { scheduleId, platform });
        } catch (error) {
          this.emit('scheduledContentError', { scheduleId, error: error instanceof Error ? error.message : String(error) });
        }
      }, delay);
    }

    return scheduleId;
  }

  async batchUpload(
    platforms: string[],
    audioFile: File,
    configs: Record<string, StreamConfig>
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const promises = platforms.map(async (platform) => {
      try {
        const config = configs[platform] || configs.default;
        const url = await this.uploadContent(platform, audioFile, config);
        results[platform] = url;
      } catch (error) {
        results[platform] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  private async uploadToYouTube(
    file: File,
    config: StreamConfig,
    credentials: StreamingCredentials,
    uploadId: string
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('snippet', JSON.stringify({
      title: config.title,
      description: config.description,
      tags: config.tags,
      categoryId: this.getYouTubeCategory(config.category)
    }));
    formData.append('status', JSON.stringify({
      privacyStatus: config.privacy,
      madeForKids: false
    }));

    const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`YouTube upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return `https://www.youtube.com/watch?v=${result.id}`;
  }

  private async uploadToSpotify(
    file: File,
    config: StreamConfig,
    credentials: StreamingCredentials,
    uploadId: string
  ): Promise<string> {
    // Spotify requires distribution through Spotify for Artists
    const response = await fetch('https://api.spotify.com/v1/me/shows', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: config.title,
        description: config.description,
        language: 'en',
        explicit: false
      })
    });

    if (!response.ok) {
      throw new Error(`Spotify upload failed: ${response.statusText}`);
    }

    const show = await response.json();
    return show.external_urls.spotify;
  }

  private async uploadToSoundCloud(
    file: File,
    config: StreamConfig,
    credentials: StreamingCredentials,
    uploadId: string
  ): Promise<string> {
    const formData = new FormData();
    formData.append('track[asset_data]', file);
    formData.append('track[title]', config.title);
    formData.append('track[description]', config.description);
    formData.append('track[sharing]', config.privacy);
    formData.append('track[tag_list]', config.tags.join(' '));

    const response = await fetch('https://api.soundcloud.com/tracks', {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${credentials.accessToken}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`SoundCloud upload failed: ${response.statusText}`);
    }

    const track = await response.json();
    return track.permalink_url;
  }

  private async startYouTubeLiveStream(
    config: StreamConfig,
    credentials: StreamingCredentials
  ): Promise<LiveStreamSettings> {
    const response = await fetch('https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        snippet: {
          title: config.title,
          description: config.description
        },
        cdn: {
          format: '1080p',
          ingestionType: 'rtmp'
        }
      })
    });

    const stream = await response.json();

    return {
      streamKey: stream.cdn.ingestionInfo.streamName,
      serverUrl: stream.cdn.ingestionInfo.ingestionAddress,
      bitrate: 4000,
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      audioCodec: 'AAC',
      videoCodec: 'H264',
      latencyMode: 'normal'
    };
  }

  private async getYouTubeAnalytics(
    credentials: StreamingCredentials,
    videoId?: string
  ): Promise<PlatformAnalytics> {
    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${credentials.channelId}&metrics=views,likes,comments,shares&dimensions=day`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      }
    );

    const data = await response.json();

    return {
      platform: 'youtube',
      views: data.rows?.[0]?.[0] || 0,
      likes: data.rows?.[0]?.[1] || 0,
      comments: data.rows?.[0]?.[2] || 0,
      shares: data.rows?.[0]?.[3] || 0,
      subscribers: 0,
      watchTime: 0,
      engagement: 0,
      demographics: {
        ageGroups: {},
        geography: {},
        devices: {}
      }
    };
  }

  private getPlatformConfig(platform: string) {
    const configs: Record<string, { authUrl: string; clientId: string | undefined; scopes: string[] }> = {
      'youtube': {
        authUrl: 'https://accounts.google.com/oauth2/auth',
        clientId: process.env.YOUTUBE_CLIENT_ID,
        scopes: ['https://www.googleapis.com/auth/youtube.upload']
      },
      'spotify': {
        authUrl: 'https://accounts.spotify.com/authorize',
        clientId: process.env.SPOTIFY_CLIENT_ID,
        scopes: ['ugc-image-upload', 'user-modify-playback-state']
      },
      'soundcloud': {
        authUrl: 'https://soundcloud.com/connect',
        clientId: process.env.SOUNDCLOUD_CLIENT_ID,
        scopes: ['non-expiring']
      }
    };

    return configs[platform];
  }

  private generateAuthUrl(platform: string): string {
    const config = this.getPlatformConfig(platform);
    const params = new URLSearchParams({
      client_id: config.clientId || '',
      response_type: 'code',
      scope: config.scopes.join(' '),
      redirect_uri: `${window.location.origin}/auth/callback`
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  private async exchangeCodeForTokens(platform: string, code: string): Promise<StreamingCredentials> {
    const config = this.getPlatformConfig(platform);

    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, code })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await response.json();

    return {
      platform,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000)
    };
  }

  private getYouTubeCategory(category: string): string {
    const categories: Record<string, string> = {
      'music': '10',
      'entertainment': '24',
      'education': '27',
      'news': '25',
      'sports': '17',
      'gaming': '20',
      'technology': '28'
    };

    return categories[category.toLowerCase()] || '10';
  }

  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.uploadQueue.get(uploadId);
  }

  getAllUploads(): UploadProgress[] {
    return Array.from(this.uploadQueue.values());
  }

  cancelUpload(uploadId: string): boolean {
    const progress = this.uploadQueue.get(uploadId);
    if (progress && progress.status === 'uploading') {
      progress.status = 'error';
      progress.error = 'Upload cancelled by user';
      this.uploadQueue.set(uploadId, progress);
      this.emit('uploadCancelled', { uploadId });
      return true;
    }
    return false;
  }

  isAuthenticated(platform: string): boolean {
    const credentials = this.credentials.get(platform);
    if (!credentials) return false;

    if (credentials.expiresAt && credentials.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  getSupportedPlatforms(): string[] {
    return ['youtube', 'spotify', 'apple-podcasts', 'soundcloud', 'twitch', 'facebook'];
  }

  getLiveStreamingPlatforms(): string[] {
    return ['youtube', 'twitch', 'facebook'];
  }

  private async uploadToApplePodcasts(
    audioFile: File,
    config: StreamConfig,
    credentials: StreamingCredentials,
    uploadId: string
  ): Promise<string> {
    // TODO: Implement Apple Podcasts upload
    throw new Error('Apple Podcasts upload not yet implemented');
  }

  private async uploadToTwitch(
    audioFile: File,
    config: StreamConfig,
    credentials: StreamingCredentials,
    uploadId: string
  ): Promise<string> {
    // TODO: Implement Twitch upload
    throw new Error('Twitch upload not yet implemented');
  }

  private async startTwitchLiveStream(
    config: StreamConfig,
    credentials: StreamingCredentials
  ): Promise<LiveStreamSettings> {
    // TODO: Implement Twitch live stream
    throw new Error('Twitch live streaming not yet implemented');
  }

  private async startFacebookLiveStream(
    config: StreamConfig,
    credentials: StreamingCredentials
  ): Promise<LiveStreamSettings> {
    // TODO: Implement Facebook live stream
    throw new Error('Facebook live streaming not yet implemented');
  }

  private async getSpotifyAnalytics(
    credentials: StreamingCredentials,
    contentId?: string
  ): Promise<PlatformAnalytics> {
    // TODO: Implement Spotify analytics
    return {
      platform: 'spotify',
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      subscribers: 0,
      watchTime: 0,
      engagement: 0,
      demographics: {
        ageGroups: {},
        geography: {},
        devices: {}
      }
    };
  }

  private async getSoundCloudAnalytics(
    credentials: StreamingCredentials,
    contentId?: string
  ): Promise<PlatformAnalytics> {
    // TODO: Implement SoundCloud analytics
    return {
      platform: 'soundcloud',
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      subscribers: 0,
      watchTime: 0,
      engagement: 0,
      demographics: {
        ageGroups: {},
        geography: {},
        devices: {}
      }
    };
  }
}

export const streamingManager = new StreamingPlatformManager();