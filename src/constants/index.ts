export const APP_NAME = 'ANC Audio Pro';
export const APP_DESCRIPTION = 'Professional hybrid ANC headphone app with advanced voice separation and noise control';

export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg', // MP3
  'audio/wav',  // WAV
  'audio/mp4',  // M4A
  'audio/aac',  // AAC
  'audio/ogg',  // OGG
  'audio/flac', // FLAC
] as const;

export const AUDIO_FORMAT_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
  '.flac',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_DURATION = 7200; // 2 hours in seconds

export const AUDIO_PROCESSING_MODES = {
  NOISE_CANCELLATION: 'noise_cancellation',
  TRANSPARENCY: 'transparency',
  VOICE_SEPARATION: 'voice_separation',
  BACKGROUND_REDUCTION: 'background_reduction',
} as const;

export const AUDIO_STREAM_TYPES = {
  VOICE: 'voice',
  MUSIC: 'music',
  AMBIENT: 'ambient',
  NOISE: 'noise',
} as const;

export const FREQUENCY_RANGES = {
  SUB_BASS: { min: 20, max: 60, label: 'Sub Bass' },
  BASS: { min: 60, max: 250, label: 'Bass' },
  LOW_MID: { min: 250, max: 500, label: 'Low Mid' },
  MID: { min: 500, max: 2000, label: 'Mid' },
  HIGH_MID: { min: 2000, max: 4000, label: 'High Mid' },
  PRESENCE: { min: 4000, max: 6000, label: 'Presence' },
  BRILLIANCE: { min: 6000, max: 20000, label: 'Brilliance' },
} as const;

export const ACCESSIBILITY_FEATURES = {
  HIGH_CONTRAST: 'high_contrast',
  LARGE_TEXT: 'large_text',
  REDUCED_MOTION: 'reduced_motion',
  SCREEN_READER: 'screen_reader',
  KEYBOARD_NAVIGATION: 'keyboard_navigation',
} as const;

export const EMOJIS = {
  AUDIO: '🎵',
  HEADPHONES: '🎧',
  MICROPHONE: '🎤',
  SPEAKER: '🔊',
  MUTE: '🔇',
  VOLUME_UP: '🔊',
  VOLUME_DOWN: '🔉',
  SETTINGS: '⚙️',
  UPLOAD: '📁',
  PROCESSING: '⚡',
  SUCCESS: '✅',
  ERROR: '❌',
  PREMIUM: '⭐',
  PROFESSIONAL: '💎',
  MOBILE: '📱',
  DESKTOP: '💻',
  CLOUD: '☁️',
  ANALYTICS: '📊',
  SUPPORT: '💬',
} as const;

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  UPLOAD: '/upload',
  PROCESSING: '/processing',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  PRICING: '/pricing',
  DOCS: '/docs',
  SUPPORT: '/support',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  ONBOARDING: '/onboarding',
} as const;