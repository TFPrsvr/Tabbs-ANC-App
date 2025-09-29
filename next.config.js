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
              "connect-src 'self' https://clerk.anc-audio-app.com https://*.clerk.accounts.dev https://*.clerk.dev https://api.stripe.com https://js.stripe.com https://*.neon.tech https://clerk.anc-audio-app.com/v1 wss://clerk.anc-audio-app.com https://clerk-telemetry.com https://img.clerk.com",
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

  // Enhanced Turbopack configuration for maximum development performance
  turbopack: {
    rules: {
      // Audio and video file handling for Turbopack
      '*.{mp3,wav,ogg,m4a,aac,flac,opus}': {
        loaders: ['file-loader'],
        as: '*.file',
      },
      '*.{mp4,webm,mov,avi,mkv,wmv,flv}': {
        loaders: ['file-loader'],
        as: '*.file',
      },
      // Web Workers optimization
      '*.worker.{js,ts}': {
        loaders: ['worker-loader'],
        as: '*.worker',
      },
      // WASM files for audio processing
      '*.wasm': {
        loaders: ['file-loader'],
        as: '*.wasm',
      },
    },
    resolveAlias: {
      '@': './src',
      '@/components': './src/components',
      '@/lib': './src/lib',
      '@/types': './src/types',
      '@/utils': './src/utils',
    },
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json', '.wasm'],
    // Enhanced module resolution for faster builds
  },

  // Webpack configuration (fallback for production builds)
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Skip webpack modifications when using Turbopack
    if (process.env.NODE_ENV === 'development' && process.argv.includes('--turbopack')) {
      return config;
    }

    // Modern JavaScript target optimizations
    config.target = isServer ? 'node' : ['web', 'es2017'];

    // Production optimizations
    if (!dev) {
      // Advanced tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      config.optimization.providedExports = true;
      config.optimization.innerGraph = true;

      // Modern bundle splitting for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            name: 'vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            reuseExistingChunk: true,
          },
          // Framework chunk for React/Next.js
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Clerk authentication chunk
          clerk: {
            name: 'clerk',
            test: /[\\/]node_modules[\\/]@clerk[\\/]/,
            priority: 30,
            chunks: 'all',
          },
          // UI library chunks
          ui: {
            name: 'ui',
            test: /[\\/](src[\\/]components[\\/]ui|node_modules[\\/]@radix-ui)[\\/]/,
            priority: 25,
            chunks: 'all',
          },
          // Audio processing chunks
          audio: {
            name: 'audio-processing',
            test: /[\\/](src[\\/]lib[\\/]audio|src[\\/]lib[\\/]performance)[\\/]/,
            priority: 20,
            chunks: 'all',
          },
          // Default group
          default: {
            minChunks: 2,
            priority: 0,
            reuseExistingChunk: true,
          },
        },
      };

      // Minimize JavaScript for production
      config.optimization.minimize = true;
    }

    // Modern ES modules support
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    // Audio and video file handling
    config.module.rules.push({
      test: /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/audio/[name].[contenthash][ext]',
      },
    });

    config.module.rules.push({
      test: /\.(mp4|webm|mov|avi|mkv|wmv|flv)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/video/[name].[contenthash][ext]',
      },
    });

    // Web Worker support
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: {
        loader: 'worker-loader',
        options: {
          filename: 'static/workers/[name].[contenthash].js',
        },
      },
    });

    // WebAssembly support for audio processing
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    // Development optimizations
    if (dev) {
      // Faster rebuilds in development
      config.cache = {
        type: 'filesystem',
        cacheDirectory: require('path').resolve(__dirname, '.next/cache/webpack'),
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    // Plugin optimizations
    config.plugins.push(
      // Define feature flags for better tree shaking
      new webpack.DefinePlugin({
        __DEV__: dev,
        __PROD__: !dev,
        __BROWSER__: !isServer,
        __SERVER__: isServer,
        'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production'),
      })
    );

    // Modern browser optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }

    return config;
  },

  // Environment variables for production
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  // Output optimization
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : 'standalone',
  trailingSlash: process.env.CAPACITOR_BUILD === 'true',
  ...(process.env.CAPACITOR_BUILD === 'true' && {
    images: {
      unoptimized: true
    }
  }),

  // Fix workspace root warning
  outputFileTracingRoot: __dirname,
  
  // Server external packages configuration
  serverExternalPackages: [
    'sharp', // Image processing
    'canvas', // Canvas operations for audio visualization
  ],

  // Enable experimental features optimized for Turbopack
  experimental: {
    // Package import optimizations
    optimizePackageImports: [
      'lucide-react',
      '@clerk/nextjs',
      'sonner',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-switch',
      '@radix-ui/react-slider',
      '@radix-ui/react-select',
      '@radix-ui/react-avatar',
      '@radix-ui/react-separator',
      '@radix-ui/react-label',
      '@radix-ui/react-tabs'
    ],

    // Performance monitoring
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'FCP', 'TTFB'],

    // Server actions (new configuration format)
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001', 'localhost:3002'],
    },

    // Development optimizations
    optimizeServerReact: true,
  }
};

module.exports = nextConfig;