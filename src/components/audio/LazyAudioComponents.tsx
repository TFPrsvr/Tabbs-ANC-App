"use client";

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Lazy load heavy audio components with loading states
export const LazyANCPlusAudioPlayer = dynamic(
  () => import('./anc-plus-audio-player').then(mod => ({ default: mod.ANCPlusAudioPlayer })),
  {
    loading: () => (
      <div className="w-full h-96 flex items-center justify-center bg-muted/50 rounded-lg border">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading Audio Player...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

export const LazyStreamManager = dynamic(
  () => import('./StreamManager').then(mod => ({ default: mod.StreamManager })),
  {
    loading: () => (
      <div className="w-full h-64 flex items-center justify-center bg-muted/50 rounded-lg border">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-xs text-muted-foreground">Loading Stream Controls...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

export const LazyANCPanel = dynamic(
  () => import('./ANCPanel').then(mod => ({ default: mod.ANCPanel })),
  {
    loading: () => (
      <div className="w-full h-80 flex items-center justify-center bg-muted/50 rounded-lg border">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-xs text-muted-foreground">Loading ANC Controls...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

// Note: Media components will be created when needed
// These lazy loaders are prepared for future implementation

// Performance monitoring HOC
export function withPerformanceMonitoring<T extends object>(
  Component: ComponentType<T>,
  componentName: string
) {
  return function PerformanceWrappedComponent(props: T) {
    if (typeof window !== 'undefined' && window.performance) {
      const startTime = performance.now();

      const handleLoad = () => {
        const endTime = performance.now();
        console.log(`${componentName} loaded in ${endTime - startTime}ms`);
      };

      // Monitor load time
      setTimeout(handleLoad, 0);
    }

    return <Component {...props} />;
  };
}

// Preload utility for critical components
export const preloadAudioComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload critical audio components
    import('./anc-plus-audio-player');
    import('./StreamManager');
    import('./ANCPanel');
    import('./AudioControls');
    import('./AudioProgress');
  }
};

// Bundle splitting utility (for future media components)
export const loadAudioWorkspace = async () => {
  // Will be implemented when media components are created
  console.log('Audio workspace loading prepared for future implementation');
  return {};
};