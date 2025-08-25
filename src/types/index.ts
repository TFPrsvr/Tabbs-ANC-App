export interface AudioStream {
  id: string;
  name: string;
  type: 'voice' | 'noise' | 'music' | 'ambient';
  volume: number;
  isActive: boolean;
  isMuted: boolean;
  frequency?: number;
  source?: AudioBufferSourceNode;
}

export interface AudioProcessingSettings {
  noiseCancellation: {
    enabled: boolean;
    intensity: number;
  };
  transparencyMode: {
    enabled: boolean;
    level: number;
    selectiveHearing: boolean;
  };
  voiceSeparation: {
    enabled: boolean;
    sensitivity: number;
  };
  backgroundNoiseReduction: {
    enabled: boolean;
    threshold: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: {
    plan: 'free' | 'premium' | 'pro';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt?: Date;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    audioSettings: AudioProcessingSettings;
    notifications: boolean;
  };
}

export interface AudioFile {
  id: string;
  name: string;
  size: number;
  duration: number;
  format: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  processed: boolean;
  streams?: AudioStream[];
}

export interface ProcessingJob {
  id: string;
  audioFileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  maxFiles: number;
  maxDuration: number;
  stripePriceId: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}