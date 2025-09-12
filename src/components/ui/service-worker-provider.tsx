"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Listen for online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('🌐 Back online! All features restored.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('📡 You\'re offline. Limited features available.');
    };

    // Set initial status
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('🎵 Service Worker registered successfully:', registration);
      setSwRegistration(registration);

      // Check for service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              setUpdateAvailable(true);
              toast.info('🔄 App update available!', {
                action: {
                  label: 'Update',
                  onClick: () => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  },
                },
                duration: 10000,
              });
            }
          });
        }
      });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          toast.success('📦 App resources updated for offline use');
        }
      });

      // Register for background sync if supported
      if ('sync' in registration) {
        console.log('📡 Background sync supported');
      }

      // Register for push notifications if supported
      if ('pushManager' in registration) {
        console.log('🔔 Push notifications supported');
      }

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      toast.error('Failed to enable offline features');
    }
  };

  // Install prompt for PWA
  useEffect(() => {
    let deferredPrompt: any = null;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install prompt after a delay
      setTimeout(() => {
        toast.info('📱 Install ANC Audio Pro for the best experience!', {
          action: {
            label: 'Install',
            onClick: async () => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                  toast.success('✅ App installed successfully!');
                } else {
                  toast.info('📱 You can install the app anytime from your browser menu');
                }
                
                deferredPrompt = null;
              }
            },
          },
          duration: 8000,
        });
      }, 5000); // Show after 5 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      toast.success('🎉 ANC Audio Pro installed successfully!');
      console.log('📱 PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Provide context to children if needed
  return (
    <div data-sw-registered={!!swRegistration} data-online={isOnline}>
      {children}
    </div>
  );
}