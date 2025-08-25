export const stripeConfig = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  successUrl: process.env.NEXT_PUBLIC_APP_URL + '/success',
  cancelUrl: process.env.NEXT_PUBLIC_APP_URL + '/cancel',
  currency: 'usd',
};

export const stripePlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'month' as const,
    stripePriceId: '',
    features: [
      '🎵 Basic audio processing',
      '📁 Up to 5 audio files',
      '⏱️ 10 minutes per file max',
      '🔊 2 audio stream separation',
      '📧 Email support',
    ],
    maxFiles: 5,
    maxDuration: 600, // 10 minutes
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    currency: 'usd',
    interval: 'month' as const,
    stripePriceId: 'price_XXXXXXXXXXXXX', // Replace with actual Price ID from Stripe
    features: [
      '🎵 Advanced audio processing',
      '📁 Up to 50 audio files',
      '⏱️ 60 minutes per file max',
      '🔊 5 audio stream separation',
      '🎛️ Advanced noise cancellation',
      '🎯 Selective hearing mode',
      '💬 Priority chat support',
      '📊 Usage analytics',
    ],
    maxFiles: 50,
    maxDuration: 3600, // 60 minutes
    popular: true,
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    currency: 'usd',
    interval: 'month' as const,
    stripePriceId: 'price_YYYYYYYYYYYYY', // Replace with actual Price ID from Stripe
    features: [
      '🎵 Professional audio processing',
      '📁 Unlimited audio files',
      '⏱️ Unlimited file duration',
      '🔊 Unlimited audio stream separation',
      '🎛️ Studio-grade noise cancellation',
      '🎯 AI-powered selective hearing',
      '📱 Mobile app access',
      '🔗 API access',
      '☁️ Cloud storage',
      '📞 Phone support',
      '🎓 Training materials',
    ],
    maxFiles: -1, // unlimited
    maxDuration: -1, // unlimited
    popular: false,
  },
] as const;

export const stripeWebhookEvents = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'checkout.session.completed',
] as const;