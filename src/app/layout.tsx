import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { ServiceWorkerProvider } from '@/components/ui/service-worker-provider';
import { Toaster } from '@/components/ui/sonner';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1f2937',
};

export const metadata: Metadata = {
  title: "ANC Audio Pro - AI Audio Processing",
  description: "Professional audio processing and production suite with AI-powered analysis, real-time effects, and comprehensive testing capabilities.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ANC Audio Pro',
    startupImage: [
      {
        url: '/icons/splash-640x1136.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/icons/splash-750x1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/icons/splash-828x1792.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/icons/splash-1242x2208.png',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/icons/splash-1242x2688.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/icons/splash-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'msapplication-TileColor': '#7c3aed',
    'msapplication-config': '/browserconfig.xml',
  } as Record<string, string>,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#7c3aed',
          colorTextOnPrimaryBackground: '#ffffff',
        },
        elements: {
          formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700',
          card: 'bg-white dark:bg-gray-900',
          headerTitle: 'text-2xl font-bold',
          headerSubtitle: 'text-gray-600 dark:text-gray-400',
          socialButtonsBlockButton: 'border-gray-300 dark:border-gray-700',
          formFieldLabel: 'text-gray-700 dark:text-gray-300',
          footerActionLink: 'text-purple-600 hover:text-purple-700',
        },
        layout: {
          socialButtonsPlacement: 'bottom',
          socialButtonsVariant: 'iconButton',
          logoPlacement: 'inside',
        },
      }}
      localization={{
        signIn: {
          start: {
            title: 'Sign in to ANC Audio Pro',
            subtitle: 'Professional audio processing and production suite',
          },
        },
        signUp: {
          start: {
            title: 'Create your ANC Audio Pro account',
            subtitle: 'Start processing audio with AI-powered tools',
          },
        },
      }}
    >
      <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
        <body className={`${inter.className} antialiased`}>
          <ErrorBoundary component="RootLayout">
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ServiceWorkerProvider>
                <div className="min-h-screen bg-background">
                  {children}
                </div>
                <Toaster />
                <SpeedInsights />
                <Analytics />
              </ServiceWorkerProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
