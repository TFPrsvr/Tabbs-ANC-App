import { neon } from '@neondatabase/serverless';
import type { 
  User, 
  AudioFile, 
  AudioStream, 
  ProcessingJob, 
  Subscription,
  PaymentPlan 
} from '../../types';

// Initialize database connection only when DATABASE_URL is available
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

// TypeScript assertion for runtime safety
const getSql = () => {
  if (!sql) throw new Error('Database connection not initialized');
  return sql;
};

export class NeonDatabaseService {
  private static checkConnection() {
    if (!sql) {
      console.warn('Database connection not available - DATABASE_URL not set');
      return false;
    }
    return true;
  }

  static async createUser(clerkId: string, email: string, name: string, avatarUrl?: string): Promise<User | null> {
    if (!this.checkConnection()) return null;
    
    try {
      const result = await getSql()`
        INSERT INTO users (clerk_id, email, name, avatar_url)
        VALUES (${clerkId}, ${email}, ${name}, ${avatarUrl})
        RETURNING *
      `;

      if (result.length > 0) {
        const user = result[0] as User;
        await this.createDefaultUserPreferences(user.id);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  static async getUserByClerkId(clerkId: string): Promise<User | null> {
    if (!this.checkConnection()) return null;
    
    try {
      const result = await getSql()`
        SELECT u.*, 
               s.id as subscription_id, s.status as subscription_status,
               pp.name as plan_name, pp.max_files, pp.max_duration,
               up.theme, up.notifications, up.audio_settings, up.accessibility_settings
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN payment_plans pp ON s.plan_id = pp.id
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE u.clerk_id = ${clerkId}
      `;

      if (result.length > 0) {
        return result[0] as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  static async createDefaultUserPreferences(userId: string) {
    if (!this.checkConnection()) return;
    
    try {
      await getSql()`
        INSERT INTO user_preferences (user_id)
        VALUES (${userId})
        ON CONFLICT (user_id) DO NOTHING
      `;
    } catch (error) {
      console.error('Error creating user preferences:', error);
    }
  }

  static async uploadAudioFile(
    userId: string, 
    name: string,
    originalName: string,
    fileSize: number,
    duration?: number,
    format: string = 'mp3',
    mimeType: string = 'audio/mpeg',
    fileUrl: string = ''
  ): Promise<AudioFile | null> {
    if (!this.checkConnection()) return null;
    
    try {
      const result = await getSql()`
        INSERT INTO audio_files (user_id, name, original_name, file_size, duration, format, mime_type, file_url)
        VALUES (${userId}, ${name}, ${originalName}, ${fileSize}, ${duration || 0}, ${format}, ${mimeType}, ${fileUrl})
        RETURNING *
      `;

      if (result.length > 0) {
        return result[0] as AudioFile;
      }
      return null;
    } catch (error) {
      console.error('Error uploading audio file:', error);
      return null;
    }
  }

  static async getUserAudioFiles(userId: string): Promise<AudioFile[]> {
    if (!this.checkConnection()) return [];
    
    try {
      const result = await getSql()`
        SELECT af.*,
               json_agg(
                 json_build_object(
                   'id', ast.id,
                   'name', ast.name,
                   'type', ast.type,
                   'volume', ast.volume,
                   'is_active', ast.is_active,
                   'is_muted', ast.is_muted
                 )
               ) FILTER (WHERE ast.id IS NOT NULL) as audio_streams,
               json_agg(
                 json_build_object(
                   'id', pj.id,
                   'status', pj.status,
                   'progress', pj.progress
                 )
               ) FILTER (WHERE pj.id IS NOT NULL) as processing_jobs
        FROM audio_files af
        LEFT JOIN audio_streams ast ON af.id = ast.audio_file_id
        LEFT JOIN processing_jobs pj ON af.id = pj.audio_file_id
        WHERE af.user_id = ${userId}
        GROUP BY af.id
        ORDER BY af.created_at DESC
      `;

      return result as AudioFile[];
    } catch (error) {
      console.error('Error fetching audio files:', error);
      return [];
    }
  }

  static async createAudioStreams(
    audioFileId: string,
    streams: Omit<AudioStream, 'id' | 'audioFileId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<AudioStream[]> {
    if (!this.checkConnection()) return [];
    
    try {
      const values = streams.map(stream => 
        `('${audioFileId}', '${stream.name}', '${stream.type}', ${stream.volume}, ${stream.isActive}, ${stream.isMuted}, ${stream.frequency || 0})`
      ).join(', ');

      const result = await getSql()`
        INSERT INTO audio_streams (audio_file_id, name, type, volume, is_active, is_muted, frequency_range)
        VALUES ${getSql().unsafe(values)}
        RETURNING *
      `;

      return result as AudioStream[];
    } catch (error) {
      console.error('Error creating audio streams:', error);
      return [];
    }
  }

  static async updateAudioStream(
    streamId: string,
    updates: Partial<Pick<AudioStream, 'volume' | 'isActive' | 'isMuted'>>
  ): Promise<AudioStream | null> {
    if (!this.checkConnection()) return null;
    
    try {
      const setParts = [];
      if (updates.volume !== undefined) setParts.push(`volume = ${updates.volume}`);
      if (updates.isActive !== undefined) setParts.push(`is_active = ${updates.isActive}`);
      if (updates.isMuted !== undefined) setParts.push(`is_muted = ${updates.isMuted}`);

      if (setParts.length === 0) return null;

      const result = await getSql()`
        UPDATE audio_streams 
        SET ${getSql().unsafe(setParts.join(', '))}
        WHERE id = ${streamId}
        RETURNING *
      `;

      if (result.length > 0) {
        return result[0] as AudioStream;
      }
      return null;
    } catch (error) {
      console.error('Error updating audio stream:', error);
      return null;
    }
  }

  static async createProcessingJob(
    audioFileId: string,
    userId: string,
    settings: Record<string, unknown> = {}
  ): Promise<ProcessingJob | null> {
    if (!this.checkConnection()) return null;
    
    try {
      const result = await getSql()`
        INSERT INTO processing_jobs (audio_file_id, user_id, processing_settings)
        VALUES (${audioFileId}, ${userId}, ${JSON.stringify(settings)})
        RETURNING *
      `;

      if (result.length > 0) {
        return result[0] as ProcessingJob;
      }
      return null;
    } catch (error) {
      console.error('Error creating processing job:', error);
      return null;
    }
  }

  static async updateProcessingJob(
    jobId: string,
    updates: Partial<Pick<ProcessingJob, 'status' | 'progress' | 'error'>>
  ): Promise<ProcessingJob | null> {
    if (!this.checkConnection()) return null;
    
    try {
      const setParts = [];
      if (updates.status !== undefined) setParts.push(`status = '${updates.status}'`);
      if (updates.progress !== undefined) setParts.push(`progress = ${updates.progress}`);
      if (updates.error !== undefined) setParts.push(`error_message = '${updates.error}'`);

      if (updates.status === 'processing') {
        setParts.push(`started_at = NOW()`);
      }
      if (updates.status === 'completed' || updates.status === 'failed') {
        setParts.push(`completed_at = NOW()`);
      }

      if (setParts.length === 0) return null;

      const result = await getSql()`
        UPDATE processing_jobs 
        SET ${getSql().unsafe(setParts.join(', '))}
        WHERE id = ${jobId}
        RETURNING *
      `;

      if (result.length > 0) {
        return result[0] as ProcessingJob;
      }
      return null;
    } catch (error) {
      console.error('Error updating processing job:', error);
      return null;
    }
  }

  static async getPaymentPlans(): Promise<PaymentPlan[]> {
    if (!this.checkConnection()) return [];
    
    try {
      const result = await getSql()`
        SELECT * FROM payment_plans 
        WHERE is_active = true 
        ORDER BY price ASC
      `;

      return result as PaymentPlan[];
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      return [];
    }
  }

  static async getUserSubscription(userId: string): Promise<Subscription | null> {
    if (!this.checkConnection()) return null;
    
    try {
      const result = await getSql()`
        SELECT s.*, pp.name as plan_name, pp.max_files, pp.max_duration, pp.features
        FROM subscriptions s
        JOIN payment_plans pp ON s.plan_id = pp.id
        WHERE s.user_id = ${userId} AND s.status = 'active'
      `;

      if (result.length > 0) {
        return result[0] as Subscription;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  static async trackUsage(
    userId: string,
    eventType: string,
    eventData: Record<string, unknown> = {},
    sessionId?: string
  ): Promise<void> {
    if (!this.checkConnection()) return;
    
    try {
      await getSql()`
        INSERT INTO usage_analytics (user_id, event_type, event_data, session_id)
        VALUES (${userId}, ${eventType}, ${JSON.stringify(eventData)}, ${sessionId || ''})
      `;
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }

  // Check if user can upload more files
  static async canUserUploadFile(
    clerkUserId: string,
    fileSizeBytes: number,
    fileDurationSeconds: number
  ): Promise<boolean> {
    if (!this.checkConnection()) return true; // Allow uploads when database is unavailable
    
    try {
      const result = await getSql()`
        SELECT can_user_upload_file(${clerkUserId}, ${fileSizeBytes}, ${fileDurationSeconds}) as can_upload
      `;

      if (result.length > 0) {
        return result[0]?.can_upload ?? false;
      }
      return false;
    } catch (error) {
      console.error('Error checking upload limits:', error);
      return false;
    }
  }
}

// For backward compatibility, export as DatabaseService
export const DatabaseService = NeonDatabaseService;
export default NeonDatabaseService;