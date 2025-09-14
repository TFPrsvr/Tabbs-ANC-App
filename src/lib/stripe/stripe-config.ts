"use client";

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      {
        // Enable modern features
        locale: 'auto',
        apiVersion: '2023-10-16',
      }
    );
  }
  return stripePromise;
};

// Stripe configuration for different regions
export const stripeConfig = {
  // Supported countries
  supportedCountries: [
    'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
    'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'LU', 'GR',
    'JP', 'SG', 'HK', 'MY', 'TH', 'PH', 'IN', 'BR', 'MX', 'AR'
  ],

  // Supported currencies by region
  currencies: {
    US: 'usd',
    CA: 'cad',
    GB: 'gbp',
    EU: 'eur',
    AU: 'aud',
    JP: 'jpy',
    SG: 'sgd',
    HK: 'hkd',
    IN: 'inr',
    BR: 'brl',
    MX: 'mxn',
  },

  // Payment methods by region
  paymentMethods: {
    US: [
      'card',
      'apple_pay',
      'google_pay',
      'link',
      'us_bank_account',
      'affirm',
      'afterpay_clearpay',
      'klarna',
    ],
    CA: [
      'card',
      'apple_pay',
      'google_pay',
      'link',
    ],
    GB: [
      'card',
      'apple_pay',
      'google_pay',
      'link',
      'bacs_debit',
      'afterpay_clearpay',
      'klarna',
    ],
    EU: [
      'card',
      'apple_pay',
      'google_pay',
      'link',
      'sepa_debit',
      'bancontact',
      'eps',
      'giropay',
      'ideal',
      'p24',
      'sofort',
      'klarna',
    ],
    AU: [
      'card',
      'apple_pay',
      'google_pay',
      'link',
      'au_becs_debit',
      'afterpay_clearpay',
    ],
    JP: [
      'card',
      'apple_pay',
      'google_pay',
      'link',
    ],
    Asia: [
      'card',
      'apple_pay',
      'google_pay',
      'link',
      'alipay',
      'wechat_pay',
      'grabpay',
    ],
    LATAM: [
      'card',
      'apple_pay',
      'google_pay',
      'link',
      'oxxo',
      'boleto',
    ],
  },

  // Subscription tiers with Stripe price IDs
  subscriptionTiers: {
    free: {
      id: 'free',
      name: 'Free',
      priceId: null,
      features: [
        'Basic audio editing',
        '3 projects/month',
        '500MB storage',
        'Community support'
      ]
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      priceId: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
      },
      features: [
        'Unlimited projects',
        '50GB storage',
        'AI processing',
        'HD exports',
        'Email support'
      ]
    },
    studio: {
      id: 'studio',
      name: 'Studio',
      priceId: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_STUDIO_MONTHLY_PRICE_ID,
        yearly: process.env.NEXT_PUBLIC_STRIPE_STUDIO_YEARLY_PRICE_ID,
      },
      features: [
        'Everything in Pro',
        'Unlimited storage',
        'Real-time collaboration',
        'Priority support',
        'API access'
      ]
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      priceId: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
        yearly: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
      },
      features: [
        'Everything in Studio',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee',
        'Advanced security'
      ]
    }
  },

  // Checkout session configuration
  checkoutConfig: {
    mode: 'subscription' as const,
    billing_address_collection: 'required' as const,
    phone_number_collection: {
      enabled: true,
    },
    tax_id_collection: {
      enabled: true,
    },
    customer_creation: 'always' as const,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        source: 'anc-audio-app',
      },
    },
    consent_collection: {
      terms_of_service: 'required' as const,
      privacy_policy: 'required' as const,
    },
    custom_fields: [
      {
        key: 'company',
        label: {
          type: 'custom',
          custom: 'Company Name (Optional)',
        },
        type: 'text',
        optional: true,
      },
      {
        key: 'use_case',
        label: {
          type: 'custom',
          custom: 'Primary Use Case',
        },
        type: 'dropdown',
        dropdown: {
          options: [
            { label: 'Podcast Production', value: 'podcast' },
            { label: 'Music Production', value: 'music' },
            { label: 'Voice-over Work', value: 'voiceover' },
            { label: 'Educational Content', value: 'education' },
            { label: 'Business/Corporate', value: 'business' },
            { label: 'Personal Projects', value: 'personal' },
            { label: 'Other', value: 'other' },
          ],
        },
      },
    ],
  },

  // Elements styling
  elementsOptions: {
    fonts: [
      {
        cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
      },
    ],
  },

  // Appearance for Stripe Elements
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#7c3aed',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
    rules: {
      '.Input': {
        border: '1px solid #d1d5db',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      },
      '.Input:focus': {
        border: '1px solid #7c3aed',
        boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.1)',
      },
      '.Label': {
        fontWeight: '500',
        fontSize: '14px',
        marginBottom: '8px',
      },
    },
  },
};

// Utility functions
export const getCurrencyForCountry = (countryCode: string): string => {
  const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'LU', 'GR', 'FI'];

  if (euCountries.includes(countryCode)) {
    return stripeConfig.currencies.EU;
  }

  return stripeConfig.currencies[countryCode as keyof typeof stripeConfig.currencies] || 'usd';
};

export const getPaymentMethodsForCountry = (countryCode: string): string[] => {
  const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'LU', 'GR', 'FI'];
  const asiaCountries = ['SG', 'HK', 'MY', 'TH', 'PH', 'IN'];
  const latamCountries = ['BR', 'MX', 'AR'];

  if (euCountries.includes(countryCode)) {
    return stripeConfig.paymentMethods.EU;
  }

  if (asiaCountries.includes(countryCode)) {
    return stripeConfig.paymentMethods.Asia;
  }

  if (latamCountries.includes(countryCode)) {
    return stripeConfig.paymentMethods.LATAM;
  }

  return stripeConfig.paymentMethods[countryCode as keyof typeof stripeConfig.paymentMethods] ||
         stripeConfig.paymentMethods.US;
};

export const formatPrice = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

// Product configuration
export const products = {
  pro: {
    name: 'ANC Audio Pro',
    description: 'Professional audio editing with AI-powered features',
    images: ['/icons/icon-512x512.svg'],
    metadata: {
      features: 'unlimited-projects,ai-processing,hd-exports,email-support',
    },
  },
  studio: {
    name: 'ANC Audio Studio',
    description: 'Advanced audio production suite with collaboration tools',
    images: ['/icons/icon-512x512.svg'],
    metadata: {
      features: 'unlimited-storage,real-time-collaboration,priority-support,api-access',
    },
  },
  enterprise: {
    name: 'ANC Audio Enterprise',
    description: 'Complete enterprise solution with custom integrations',
    images: ['/icons/icon-512x512.svg'],
    metadata: {
      features: 'custom-integrations,dedicated-support,sla-guarantee,advanced-security',
    },
  },
};

// Tax rates configuration
export const taxConfig = {
  automatic_tax: {
    enabled: true,
  },
  tax_id_collection: {
    enabled: true,
    required: 'if_supported',
  },
};

export default stripeConfig;