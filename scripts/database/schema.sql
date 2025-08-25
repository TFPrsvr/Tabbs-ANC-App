-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'unpaid');
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE audio_stream_type AS ENUM ('voice', 'music', 'ambient', 'noise');
CREATE TYPE plan_interval AS ENUM ('month', 'year');

-- Users table (extends Clerk user data)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment plans table
CREATE TABLE payment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  interval plan_interval NOT NULL,
  stripe_price_id TEXT UNIQUE NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  max_files INTEGER NOT NULL DEFAULT 5,
  max_duration INTEGER NOT NULL DEFAULT 600, -- seconds
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES payment_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications BOOLEAN NOT NULL DEFAULT true,
  audio_settings JSONB NOT NULL DEFAULT '{
    "noiseCancellation": {"enabled": false, "intensity": 50},
    "transparencyMode": {"enabled": false, "level": 50, "selectiveHearing": false},
    "voiceSeparation": {"enabled": false, "sensitivity": 50},
    "backgroundNoiseReduction": {"enabled": false, "threshold": 30}
  }',
  accessibility_settings JSONB NOT NULL DEFAULT '{
    "highContrast": false,
    "largeText": false,
    "reducedMotion": false,
    "screenReader": false,
    "keyboardNavigation": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Audio files table
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration DECIMAL(10,2), -- seconds with decimals
  format TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audio streams (separated components of audio files)
CREATE TABLE audio_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audio_file_id UUID NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type audio_stream_type NOT NULL,
  volume DECIMAL(3,2) NOT NULL DEFAULT 1.00 CHECK (volume >= 0 AND volume <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  frequency_range JSONB, -- {min: number, max: number}
  stream_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing jobs table
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audio_file_id UUID NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status processing_status NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  processing_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage analytics table
CREATE TABLE usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_audio_files_user_id ON audio_files(user_id);
CREATE INDEX idx_audio_files_created_at ON audio_files(created_at);
CREATE INDEX idx_audio_streams_audio_file_id ON audio_streams(audio_file_id);
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_created_at ON usage_analytics(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_plans_updated_at BEFORE UPDATE ON payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_files_updated_at BEFORE UPDATE ON audio_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_streams_updated_at BEFORE UPDATE ON audio_streams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default payment plans
INSERT INTO payment_plans (name, price, currency, interval, stripe_price_id, features, max_files, max_duration) VALUES
('Free', 0.00, 'usd', 'month', 'price_free', 
 '["🎵 Basic audio processing", "📁 Up to 5 audio files", "⏱️ 10 minutes per file max", "🔊 2 audio stream separation", "📧 Email support"]'::jsonb, 
 5, 600),
('Premium', 9.99, 'usd', 'month', 'price_premium_monthly',
 '["🎵 Advanced audio processing", "📁 Up to 50 audio files", "⏱️ 60 minutes per file max", "🔊 5 audio stream separation", "🎛️ Advanced noise cancellation", "🎯 Selective hearing mode", "💬 Priority chat support", "📊 Usage analytics"]'::jsonb,
 50, 3600),
('Professional', 29.99, 'usd', 'month', 'price_pro_monthly',
 '["🎵 Professional audio processing", "📁 Unlimited audio files", "⏱️ Unlimited file duration", "🔊 Unlimited audio stream separation", "🎛️ Studio-grade noise cancellation", "🎯 AI-powered selective hearing", "📱 Mobile app access", "🔗 API access", "☁️ Cloud storage", "📞 Phone support", "🎓 Training materials"]'::jsonb,
 -1, -1);