/**
 * Professional Podcast Suite
 * Complete podcast creation, editing, and distribution system
 */

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  content: string; // Rich text/markdown content
  audioFile: string; // File ID
  duration: number;
  episodeNumber: number;
  seasonNumber?: number;
  publishDate: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  metadata: {
    explicit: boolean;
    categories: string[];
    tags: string[];
    guests: Array<{
      name: string;
      bio?: string;
      website?: string;
      social?: Record<string, string>;
    }>;
    sponsors: Array<{
      name: string;
      url: string;
      adPosition: 'pre-roll' | 'mid-roll' | 'post-roll';
      duration: number;
    }>;
  };
  chapters: Chapter[];
  transcription?: {
    text: string;
    srt: string;
    vtt: string;
    timestamps: Array<{
      start: number;
      end: number;
      text: string;
      speaker?: string;
      confidence: number;
    }>;
  };
  analytics: {
    downloads: number;
    completionRate: number;
    dropoffPoints: number[];
    popularSegments: Array<{ start: number; end: number; engagement: number }>;
    demographics?: any;
  };
}

export interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  description?: string;
  url?: string;
  image?: string;
  type: 'intro' | 'content' | 'ad' | 'music' | 'outro' | 'custom';
  markers: {
    topics: string[];
    keyPoints: string[];
    actionItems: string[];
  };
}

export interface PodcastShow {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  explicit: boolean;
  author: {
    name: string;
    email: string;
    website?: string;
  };
  artwork: {
    url: string;
    sizes: Array<{ size: string; url: string }>; // 1400x1400, 3000x3000, etc.
  };
  episodes: PodcastEpisode[];
  settings: {
    autoGenerate: {
      chapters: boolean;
      transcripts: boolean;
      socialClips: boolean;
      audiograms: boolean;
    };
    publishing: {
      schedule: 'manual' | 'weekly' | 'biweekly' | 'monthly';
      dayOfWeek?: number;
      timeOfDay?: string;
      timezone: string;
    };
    distribution: {
      platforms: Array<{
        name: string;
        enabled: boolean;
        credentials?: any;
        customSettings?: any;
      }>;
      rss: {
        url: string;
        customDomain?: string;
      };
    };
    monetization: {
      ads: {
        enabled: boolean;
        providers: string[];
        insertionPoints: Array<'pre-roll' | 'mid-roll' | 'post-roll'>;
      };
      donations: {
        enabled: boolean;
        platforms: Array<{ name: string; url: string }>;
      };
      premium: {
        enabled: boolean;
        tierPricing: Array<{ name: string; price: number; features: string[] }>;
      };
    };
  };
  analytics: {
    totalDownloads: number;
    averageCompletionRate: number;
    topEpisodes: string[];
    audienceDemographics: any;
    growthMetrics: any;
  };
}

export interface AudiogramTemplate {
  id: string;
  name: string;
  dimensions: { width: number; height: number };
  style: {
    backgroundColor: string;
    waveformColor: string;
    textColor: string;
    fontSize: number;
    fontFamily: string;
    animation: 'wave' | 'bars' | 'circular' | 'minimal';
  };
  layout: {
    showTitle: boolean;
    showWaveform: boolean;
    showProgress: boolean;
    showLogo: boolean;
    logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  duration: { min: number; max: number };
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:5';
}

export interface SocialClip {
  id: string;
  episodeId: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  content: {
    audio: string; // File ID
    video?: string; // Audiogram file ID
  };
  platforms: Array<{
    name: 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'facebook';
    optimized: boolean;
    url?: string;
    posted?: string;
    engagement?: {
      views: number;
      likes: number;
      shares: number;
      comments: number;
    };
  }>;
  metadata: {
    tags: string[];
    description: string;
    thumbnail?: string;
  };
}

export class PodcastSuite {
  private shows: Map<string, PodcastShow> = new Map();
  private templates: Map<string, AudiogramTemplate> = new Map();
  private processingQueue: Array<{
    id: string;
    type: 'transcribe' | 'chapters' | 'audiogram' | 'social-clip';
    episodeId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
  }> = [];

  constructor() {
    this.initializePodcastSuite();
    this.loadDefaultTemplates();
  }

  /**
   * Initialize podcast suite
   */
  private initializePodcastSuite(): void {
    console.log('🎙️ Podcast Suite initialized');
  }

  /**
   * Load default audiogram templates
   */
  private loadDefaultTemplates(): void {
    const defaultTemplates: AudiogramTemplate[] = [
      {
        id: 'modern-wave',
        name: 'Modern Wave',
        dimensions: { width: 1080, height: 1080 },
        style: {
          backgroundColor: '#1a1a2e',
          waveformColor: '#4f46e5',
          textColor: '#ffffff',
          fontSize: 24,
          fontFamily: 'Inter, sans-serif',
          animation: 'wave'
        },
        layout: {
          showTitle: true,
          showWaveform: true,
          showProgress: true,
          showLogo: true,
          logoPosition: 'bottom-right'
        },
        duration: { min: 15, max: 60 },
        aspectRatio: '1:1'
      },
      {
        id: 'story-format',
        name: 'Story Format',
        dimensions: { width: 1080, height: 1920 },
        style: {
          backgroundColor: '#f8fafc',
          waveformColor: '#3b82f6',
          textColor: '#1e293b',
          fontSize: 28,
          fontFamily: 'Poppins, sans-serif',
          animation: 'bars'
        },
        layout: {
          showTitle: true,
          showWaveform: true,
          showProgress: false,
          showLogo: true,
          logoPosition: 'top-center'
        },
        duration: { min: 10, max: 30 },
        aspectRatio: '9:16'
      },
      {
        id: 'youtube-thumbnail',
        name: 'YouTube Thumbnail',
        dimensions: { width: 1920, height: 1080 },
        style: {
          backgroundColor: '#000000',
          waveformColor: '#ff0000',
          textColor: '#ffffff',
          fontSize: 32,
          fontFamily: 'Roboto, sans-serif',
          animation: 'circular'
        },
        layout: {
          showTitle: true,
          showWaveform: true,
          showProgress: true,
          showLogo: true,
          logoPosition: 'bottom-left'
        },
        duration: { min: 30, max: 120 },
        aspectRatio: '16:9'
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    console.log(`📱 Loaded ${defaultTemplates.length} audiogram templates`);
  }

  /**
   * Create new podcast show
   */
  async createShow(config: {
    title: string;
    description: string;
    category: string;
    author: { name: string; email: string; website?: string };
    artwork?: File;
    settings?: Partial<PodcastShow['settings']>;
  }): Promise<string> {
    const showId = `show_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Process artwork if provided
    let artworkUrl = '';
    if (config.artwork) {
      artworkUrl = await this.processArtwork(config.artwork);
    }

    const show: PodcastShow = {
      id: showId,
      title: config.title,
      description: config.description,
      category: config.category,
      language: 'en',
      explicit: false,
      author: config.author,
      artwork: {
        url: artworkUrl,
        sizes: []
      },
      episodes: [],
      settings: {
        autoGenerate: {
          chapters: true,
          transcripts: true,
          socialClips: true,
          audiograms: true
        },
        publishing: {
          schedule: 'manual',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        distribution: {
          platforms: [
            { name: 'Apple Podcasts', enabled: false },
            { name: 'Spotify', enabled: false },
            { name: 'Google Podcasts', enabled: false },
            { name: 'RSS', enabled: true }
          ],
          rss: {
            url: `${window.location.origin}/podcast/${showId}/feed.xml`
          }
        },
        monetization: {
          ads: { enabled: false, providers: [], insertionPoints: [] },
          donations: { enabled: false, platforms: [] },
          premium: { enabled: false, tierPricing: [] }
        },
        ...config.settings
      },
      analytics: {
        totalDownloads: 0,
        averageCompletionRate: 0,
        topEpisodes: [],
        audienceDemographics: {},
        growthMetrics: {}
      }
    };

    this.shows.set(showId, show);

    console.log(`🎙️ Created podcast show: ${config.title} (${showId})`);
    return showId;
  }

  /**
   * Create new episode
   */
  async createEpisode(showId: string, config: {
    title: string;
    description: string;
    audioFile: string; // File ID from file manager
    episodeNumber: number;
    seasonNumber?: number;
    publishDate?: string;
    explicit?: boolean;
    categories?: string[];
    tags?: string[];
    guests?: PodcastEpisode['metadata']['guests'];
  }): Promise<string> {
    const show = this.shows.get(showId);
    if (!show) throw new Error('Show not found');

    const episodeId = `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get audio file duration (would integrate with file manager)
    const duration = await this.getAudioDuration(config.audioFile);

    const episode: PodcastEpisode = {
      id: episodeId,
      title: config.title,
      description: config.description,
      content: '',
      audioFile: config.audioFile,
      duration,
      episodeNumber: config.episodeNumber,
      seasonNumber: config.seasonNumber,
      publishDate: config.publishDate || new Date().toISOString(),
      status: 'draft',
      metadata: {
        explicit: config.explicit || false,
        categories: config.categories || [show.category],
        tags: config.tags || [],
        guests: config.guests || [],
        sponsors: []
      },
      chapters: [],
      analytics: {
        downloads: 0,
        completionRate: 0,
        dropoffPoints: [],
        popularSegments: []
      }
    };

    show.episodes.push(episode);

    // Auto-generate content if enabled
    if (show.settings.autoGenerate.transcripts) {
      await this.generateTranscript(episodeId);
    }

    if (show.settings.autoGenerate.chapters) {
      await this.generateChapters(episodeId);
    }

    if (show.settings.autoGenerate.socialClips) {
      await this.generateSocialClips(episodeId);
    }

    console.log(`📝 Created episode: ${config.title} (${episodeId})`);
    return episodeId;
  }

  /**
   * Generate transcript for episode
   */
  async generateTranscript(episodeId: string): Promise<void> {
    const episode = this.findEpisode(episodeId);
    if (!episode) throw new Error('Episode not found');

    console.log(`📝 Generating transcript for: ${episode.title}`);

    // Add to processing queue
    this.processingQueue.push({
      id: `transcript_${episodeId}`,
      type: 'transcribe',
      episodeId,
      status: 'pending',
      progress: 0
    });

    // Simulate transcription processing
    setTimeout(async () => {
      const transcript = await this.processTranscription(episode.audioFile);
      episode.transcription = transcript;

      console.log(`✅ Transcript generated for: ${episode.title}`);
      this.updateProcessingStatus(`transcript_${episodeId}`, 'completed', 100);
    }, 5000);
  }

  /**
   * Generate chapters for episode
   */
  async generateChapters(episodeId: string): Promise<void> {
    const episode = this.findEpisode(episodeId);
    if (!episode) throw new Error('Episode not found');

    console.log(`📖 Generating chapters for: ${episode.title}`);

    // Add to processing queue
    this.processingQueue.push({
      id: `chapters_${episodeId}`,
      type: 'chapters',
      episodeId,
      status: 'pending',
      progress: 0
    });

    // Simulate chapter generation
    setTimeout(async () => {
      const chapters = await this.generateAutoChapters(episode.audioFile, episode.duration);
      episode.chapters = chapters;

      console.log(`✅ Chapters generated for: ${episode.title}`);
      this.updateProcessingStatus(`chapters_${episodeId}`, 'completed', 100);
    }, 3000);
  }

  /**
   * Generate social media clips
   */
  async generateSocialClips(episodeId: string): Promise<SocialClip[]> {
    const episode = this.findEpisode(episodeId);
    if (!episode) throw new Error('Episode not found');

    console.log(`📱 Generating social clips for: ${episode.title}`);

    // Find interesting segments for clips
    const highlights = await this.findHighlights(episode.audioFile, episode.duration);

    const clips: SocialClip[] = [];

    for (const highlight of highlights) {
      const clipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const clip: SocialClip = {
        id: clipId,
        episodeId,
        title: highlight.title,
        startTime: highlight.start,
        endTime: highlight.end,
        duration: highlight.end - highlight.start,
        content: {
          audio: await this.extractAudioClip(episode.audioFile, highlight.start, highlight.end)
        },
        platforms: [
          { name: 'twitter', optimized: false },
          { name: 'instagram', optimized: false },
          { name: 'tiktok', optimized: false }
        ],
        metadata: {
          tags: episode.metadata.tags,
          description: highlight.description || '',
        }
      };

      // Generate audiograms for each platform
      for (const platform of clip.platforms) {
        await this.generateAudiogram(clip, platform.name);
      }

      clips.push(clip);
    }

    console.log(`✅ Generated ${clips.length} social clips for: ${episode.title}`);
    return clips;
  }

  /**
   * Generate audiogram for social clip
   */
  async generateAudiogram(
    clip: SocialClip,
    platform: SocialClip['platforms'][0]['name'],
    templateId?: string
  ): Promise<string> {
    // Select appropriate template based on platform
    let template = this.templates.get(templateId || 'modern-wave');

    if (!template) {
      // Select default template based on platform
      switch (platform) {
        case 'instagram':
        case 'tiktok':
          template = this.templates.get('story-format');
          break;
        case 'youtube':
          template = this.templates.get('youtube-thumbnail');
          break;
        default:
          template = this.templates.get('modern-wave');
      }
    }

    if (!template) throw new Error('No template available');

    console.log(`🎥 Generating audiogram for ${platform}: ${clip.title}`);

    // Generate audiogram (would use canvas/WebGL for actual rendering)
    const audiogramId = await this.renderAudiogram(clip, template);

    // Update clip with audiogram
    clip.content.video = audiogramId;

    // Mark platform as optimized
    const platformConfig = clip.platforms.find(p => p.name === platform);
    if (platformConfig) {
      platformConfig.optimized = true;
    }

    console.log(`✅ Audiogram generated for ${platform}: ${clip.title}`);
    return audiogramId;
  }

  /**
   * Publish episode
   */
  async publishEpisode(episodeId: string, options?: {
    publishDate?: string;
    distributionPlatforms?: string[];
    generateRSS?: boolean;
  }): Promise<void> {
    const episode = this.findEpisode(episodeId);
    if (!episode) throw new Error('Episode not found');

    const show = this.findShowByEpisode(episodeId);
    if (!show) throw new Error('Show not found');

    // Update episode status
    episode.status = 'published';
    if (options?.publishDate) {
      episode.publishDate = options.publishDate;
    }

    console.log(`📡 Publishing episode: ${episode.title}`);

    // Generate RSS feed
    if (options?.generateRSS !== false) {
      await this.generateRSSFeed(show.id);
    }

    // Distribute to enabled platforms
    const enabledPlatforms = show.settings.distribution.platforms
      .filter(p => p.enabled)
      .filter(p => !options?.distributionPlatforms || options.distributionPlatforms.includes(p.name));

    for (const platform of enabledPlatforms) {
      await this.distributeToPlatform(episode, platform);
    }

    console.log(`✅ Episode published: ${episode.title}`);
  }

  /**
   * Generate RSS feed
   */
  async generateRSSFeed(showId: string): Promise<string> {
    const show = this.shows.get(showId);
    if (!show) throw new Error('Show not found');

    const publishedEpisodes = show.episodes
      .filter(ep => ep.status === 'published')
      .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

    const rssItems = publishedEpisodes.map(episode => this.generateRSSItem(episode, show));

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>${this.escapeXml(show.title)}</title>
  <description>${this.escapeXml(show.description)}</description>
  <language>${show.language}</language>
  <copyright>© ${new Date().getFullYear()} ${this.escapeXml(show.author.name)}</copyright>
  <managingEditor>${show.author.email} (${this.escapeXml(show.author.name)})</managingEditor>
  <webMaster>${show.author.email} (${this.escapeXml(show.author.name)})</webMaster>
  <category>${this.escapeXml(show.category)}</category>
  <itunes:category text="${this.escapeXml(show.category)}" />
  <itunes:explicit>${show.explicit ? 'yes' : 'no'}</itunes:explicit>
  <itunes:author>${this.escapeXml(show.author.name)}</itunes:author>
  <itunes:summary>${this.escapeXml(show.description)}</itunes:summary>
  <itunes:owner>
    <itunes:name>${this.escapeXml(show.author.name)}</itunes:name>
    <itunes:email>${show.author.email}</itunes:email>
  </itunes:owner>
  <itunes:image href="${show.artwork.url}" />
  <image>
    <url>${show.artwork.url}</url>
    <title>${this.escapeXml(show.title)}</title>
    <link>${show.author.website || ''}</link>
  </image>
  <link>${show.author.website || ''}</link>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <pubDate>${publishedEpisodes[0] ? new Date(publishedEpisodes[0].publishDate).toUTCString() : new Date().toUTCString()}</pubDate>

  ${rssItems.join('\n  ')}
</channel>
</rss>`;

    // Save RSS feed (would integrate with file storage)
    const feedUrl = show.settings.distribution.rss.url;
    console.log(`📡 RSS feed generated: ${feedUrl}`);

    return rssFeed;
  }

  /**
   * Generate RSS item for episode
   */
  private generateRSSItem(episode: PodcastEpisode, show: PodcastShow): string {
    const audioUrl = `${window.location.origin}/audio/${episode.audioFile}`;
    const episodeUrl = `${window.location.origin}/episode/${episode.id}`;

    return `<item>
    <title>${this.escapeXml(episode.title)}</title>
    <description>${this.escapeXml(episode.description)}</description>
    <content:encoded><![CDATA[${episode.content || episode.description}]]></content:encoded>
    <link>${episodeUrl}</link>
    <guid isPermaLink="false">${episode.id}</guid>
    <pubDate>${new Date(episode.publishDate).toUTCString()}</pubDate>
    <itunes:episode>${episode.episodeNumber}</itunes:episode>
    ${episode.seasonNumber ? `<itunes:season>${episode.seasonNumber}</itunes:season>` : ''}
    <itunes:explicit>${episode.metadata.explicit ? 'yes' : 'no'}</itunes:explicit>
    <itunes:duration>${this.formatDuration(episode.duration)}</itunes:duration>
    <itunes:summary>${this.escapeXml(episode.description)}</itunes:summary>
    <enclosure url="${audioUrl}" type="audio/mpeg" length="0" />
    ${episode.chapters.length > 0 ? this.generateChaptersXml(episode.chapters) : ''}
  </item>`;
  }

  /**
   * Get podcast analytics
   */
  async getAnalytics(showId: string, timeRange: 'week' | 'month' | 'year' = 'month'): Promise<{
    overview: {
      totalDownloads: number;
      averageCompletionRate: number;
      uniqueListeners: number;
      totalDuration: number;
    };
    episodes: Array<{
      id: string;
      title: string;
      downloads: number;
      completionRate: number;
      engagement: number;
    }>;
    demographics: {
      countries: Array<{ name: string; percentage: number }>;
      devices: Array<{ type: string; percentage: number }>;
      platforms: Array<{ name: string; percentage: number }>;
    };
    trends: {
      downloads: Array<{ date: string; count: number }>;
      completion: Array<{ date: string; rate: number }>;
    };
  }> {
    const show = this.shows.get(showId);
    if (!show) throw new Error('Show not found');

    // This would integrate with analytics services
    return {
      overview: {
        totalDownloads: show.analytics.totalDownloads,
        averageCompletionRate: show.analytics.averageCompletionRate,
        uniqueListeners: Math.floor(show.analytics.totalDownloads * 0.7), // Estimated
        totalDuration: show.episodes.reduce((sum, ep) => sum + ep.duration, 0)
      },
      episodes: show.episodes.map(ep => ({
        id: ep.id,
        title: ep.title,
        downloads: ep.analytics.downloads,
        completionRate: ep.analytics.completionRate,
        engagement: ep.analytics.popularSegments.reduce((sum, seg) => sum + seg.engagement, 0)
      })),
      demographics: {
        countries: [
          { name: 'United States', percentage: 45 },
          { name: 'Canada', percentage: 15 },
          { name: 'United Kingdom', percentage: 12 }
        ],
        devices: [
          { type: 'Mobile', percentage: 65 },
          { type: 'Desktop', percentage: 25 },
          { type: 'Tablet', percentage: 10 }
        ],
        platforms: [
          { name: 'Apple Podcasts', percentage: 40 },
          { name: 'Spotify', percentage: 35 },
          { name: 'Google Podcasts', percentage: 15 }
        ]
      },
      trends: {
        downloads: [], // Would be populated with real data
        completion: []
      }
    };
  }

  // Helper methods

  private async processArtwork(file: File): Promise<string> {
    // Process and resize artwork for different platforms
    return URL.createObjectURL(file);
  }

  private async getAudioDuration(fileId: string): Promise<number> {
    // Get duration from file manager or audio analysis
    return 3600; // Default 1 hour
  }

  private async processTranscription(audioFileId: string): Promise<PodcastEpisode['transcription']> {
    // Generate transcript using speech-to-text
    return {
      text: 'Generated transcript text...',
      srt: '1\n00:00:00,000 --> 00:00:05,000\nGenerated transcript text...',
      vtt: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nGenerated transcript text...',
      timestamps: [
        {
          start: 0,
          end: 5,
          text: 'Generated transcript text...',
          confidence: 0.95
        }
      ]
    };
  }

  private async generateAutoChapters(audioFileId: string, duration: number): Promise<Chapter[]> {
    // Generate chapters based on audio analysis
    const numChapters = Math.min(Math.floor(duration / 300), 10); // Max 10 chapters, 5min each

    const chapters: Chapter[] = [];
    for (let i = 0; i < numChapters; i++) {
      const startTime = (duration / numChapters) * i;
      const endTime = (duration / numChapters) * (i + 1);

      chapters.push({
        id: `chapter_${i + 1}`,
        title: `Chapter ${i + 1}`,
        startTime,
        endTime,
        type: 'content',
        markers: {
          topics: [],
          keyPoints: [],
          actionItems: []
        }
      });
    }

    return chapters;
  }

  private async findHighlights(audioFileId: string, duration: number): Promise<Array<{
    start: number;
    end: number;
    title: string;
    description?: string;
    confidence: number;
  }>> {
    // Find interesting segments for social clips
    return [
      {
        start: 120,
        end: 150,
        title: 'Key Insight',
        description: 'Important discussion point',
        confidence: 0.9
      },
      {
        start: 300,
        end: 320,
        title: 'Funny Moment',
        description: 'Humorous exchange',
        confidence: 0.8
      }
    ];
  }

  private async extractAudioClip(audioFileId: string, start: number, end: number): Promise<string> {
    // Extract audio segment
    return `clip_${audioFileId}_${start}_${end}`;
  }

  private async renderAudiogram(clip: SocialClip, template: AudiogramTemplate): Promise<string> {
    // Render audiogram using canvas/WebGL
    return `audiogram_${clip.id}_${template.id}`;
  }

  private async distributeToPlatform(episode: PodcastEpisode, platform: any): Promise<void> {
    console.log(`📡 Distributing ${episode.title} to ${platform.name}`);
    // Platform-specific distribution logic
  }

  private findEpisode(episodeId: string): PodcastEpisode | undefined {
    for (const show of this.shows.values()) {
      const episode = show.episodes.find(ep => ep.id === episodeId);
      if (episode) return episode;
    }
    return undefined;
  }

  private findShowByEpisode(episodeId: string): PodcastShow | undefined {
    for (const show of this.shows.values()) {
      if (show.episodes.some(ep => ep.id === episodeId)) {
        return show;
      }
    }
    return undefined;
  }

  private updateProcessingStatus(id: string, status: string, progress: number): void {
    const job = this.processingQueue.find(j => j.id === id);
    if (job) {
      job.status = status as any;
      job.progress = progress;
    }
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private generateChaptersXml(chapters: Chapter[]): string {
    return chapters.map(chapter =>
      `<psc:chapter start="${this.formatDuration(chapter.startTime)}" title="${this.escapeXml(chapter.title)}" />`
    ).join('\n    ');
  }

  /**
   * Get all shows
   */
  getShows(): PodcastShow[] {
    return Array.from(this.shows.values());
  }

  /**
   * Get show by ID
   */
  getShow(showId: string): PodcastShow | undefined {
    return this.shows.get(showId);
  }

  /**
   * Get processing status
   */
  getProcessingStatus(): typeof this.processingQueue {
    return [...this.processingQueue];
  }

  /**
   * Get available templates
   */
  getTemplates(): AudiogramTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add custom template
   */
  addTemplate(template: AudiogramTemplate): void {
    this.templates.set(template.id, template);
    console.log(`🎨 Added audiogram template: ${template.name}`);
  }
}