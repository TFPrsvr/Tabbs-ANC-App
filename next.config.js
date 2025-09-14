/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // PWA and mobile optimizations
  
  // Asset optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Headers for PWA and security
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400', // 24 hours
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/javascript',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000', // 30 days
          },
        ],
      },
      // Military-grade security headers
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Restrict feature permissions
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()',
          },
          // Force HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Content Security Policy (Military-grade)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.anc-audio-app.com https://*.clerk.accounts.dev https://*.clerk.dev https://js.stripe.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.clerk.accounts.dev https://*.clerk.dev https://img.clerk.com",
              "media-src 'self' blob: data:",
              "connect-src 'self' https://clerk.anc-audio-app.com https://*.clerk.accounts.dev https://*.clerk.dev https://api.stripe.com https://js.stripe.com https://*.neon.tech https://clerk.anc-audio-app.com/v1 wss://clerk.anc-audio-app.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.clerk.accounts.dev https://*.clerk.dev",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // Prevent information disclosure
          {
            key: 'X-Powered-By',
            value: 'ANC-Audio-Pro',
          },
          // Cache control for sensitive pages
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
          // Additional security
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },

  // Rewrites for PWA file handling
  async rewrites() {
    return [
      {
        source: '/browserconfig.xml',
        destination: '/browserconfig.xml',
      },
    ];
  },

  // Bundle analyzer for production optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Bundle splitting for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Mobile-specific chunks
          mobile: {
            name: 'mobile',
            test: /[\\/]src[\\/]components[\\/]mobile[\\/]/,
            chunks: 'all',
            priority: 10,
          },
          // Audio processing chunks
          audio: {
            name: 'audio',
            test: /[\\/]src[\\/]lib[\\/]audio[\\/]/,
            chunks: 'all',
            priority: 9,
          },
          // UI components chunk
          ui: {
            name: 'ui',
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            chunks: 'all',
            priority: 8,
          },
        },
      };
    }

    // Audio file handling
    config.module.rules.push({
      test: /\.(mp3|wav|ogg|m4a|aac|flac)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[hash][ext]',
      },
    });

    // Video file handling
    config.module.rules.push({
      test: /\.(mp4|webm|mov|avi|mkv)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[hash][ext]',
      },
    });

    // WASM support for FFmpeg
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },

  // Environment variables for production
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  // Output optimization
  output: 'standalone',
  
  // Enable experimental features for PWA
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@clerk/nextjs',
      'sonner'
    ],
    webVitalsAttribution: ['CLS', 'LCP'],
  },

  // Note: Advanced Turbopack configuration is limited in current Next.js version
  // Basic optimization flags are handled by the --turbopack flag in build scripts
};

module.exports = nextConfig;