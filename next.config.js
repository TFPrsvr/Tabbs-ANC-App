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
      // Security headers
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
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
    turbo: {
      // Turbopack optimizations for faster builds
    },
    optimizePackageImports: [
      'lucide-react',
      '@clerk/nextjs',
      'sonner'
    ],
    webVitalsAttribution: ['CLS', 'LCP'],
  },
};

module.exports = nextConfig;