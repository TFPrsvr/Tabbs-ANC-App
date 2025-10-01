// ANC Audio Pro Service Worker
// Handles offline functionality, caching, and background processing

const CACHE_NAME = 'anc-audio-pro-v1';
const OFFLINE_URL = '/offline';

// Essential files to cache for offline functionality
const ESSENTIAL_FILES = [
  '/favicon.ico',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching essential files');
        // Try to cache files individually to avoid failing on missing files
        return Promise.allSettled(
          ESSENTIAL_FILES.map(file =>
            cache.add(file).catch(err => {
              console.warn(`⚠️ Could not cache ${file}:`, err.message);
            })
          )
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    // Handle navigation requests
    if (request.mode === 'navigate') {
      event.respondWith(handleNavigationRequest(request));
      return;
    }

    // Handle static assets
    if (url.pathname.startsWith('/_next/static/')) {
      event.respondWith(handleStaticAssets(request));
      return;
    }

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleAPIRequests(request));
      return;
    }

    // Handle audio/video files
    if (isMediaFile(url.pathname)) {
      event.respondWith(handleMediaFiles(request));
      return;
    }
  }

  // Handle POST requests (file uploads)
  if (request.method === 'POST') {
    event.respondWith(handlePostRequests(request));
    return;
  }

  // Default: try network first, fallback to cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Handle navigation requests (pages)
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed - try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // No cache - return offline page
    return caches.match(OFFLINE_URL);
  }
}

// Handle static assets (CSS, JS, images)
async function handleStaticAssets(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache - fetch and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('📡 Service Worker: Failed to fetch static asset', request.url);
    throw error;
  }
}

// Handle API requests
async function handleAPIRequests(request) {
  try {
    // Always try network first for API calls
    return await fetch(request);
  } catch (error) {
    // Check if it's a GET request we can cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline response for failed API calls
    return new Response(
      JSON.stringify({
        error: 'Offline - Unable to reach server',
        offline: true,
        timestamp: Date.now()
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle media files (audio/video)
async function handleMediaFiles(request) {
  try {
    // For media files, always try network first
    const networkResponse = await fetch(request);
    
    // Only cache smaller media files (< 50MB)
    if (networkResponse.ok && networkResponse.headers.get('content-length')) {
      const size = parseInt(networkResponse.headers.get('content-length'));
      if (size < 50 * 1024 * 1024) { // 50MB limit
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Try cache for media files
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle POST requests (file uploads, processing)
async function handlePostRequests(request) {
  try {
    // Always try network for POST requests
    return await fetch(request);
  } catch (error) {
    // Store failed requests for retry when online
    await storeFailedRequest(request);
    
    return new Response(
      JSON.stringify({
        error: 'Request queued for when online',
        queued: true,
        timestamp: Date.now()
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Check if URL is a media file
function isMediaFile(pathname) {
  const mediaExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.mp4', '.webm', '.avi', '.mov'];
  return mediaExtensions.some(ext => pathname.toLowerCase().includes(ext));
}

// Store failed requests for retry
async function storeFailedRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.clone().text() : null,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB for retry later
    const db = await openDB();
    const transaction = db.transaction(['failed_requests'], 'readwrite');
    const store = transaction.objectStore('failed_requests');
    await store.add(requestData);
  } catch (error) {
    console.error('Failed to store request for retry:', error);
  }
}

// Open IndexedDB for storing failed requests
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ANC_Audio_Pro', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('failed_requests')) {
        const store = db.createObjectStore('failed_requests', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Background sync for retrying failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

// Retry failed requests when back online
async function retryFailedRequests() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['failed_requests'], 'readwrite');
    const store = transaction.objectStore('failed_requests');
    const requests = await store.getAll();
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          await store.delete(requestData.id);
          console.log('✅ Retried successful request:', requestData.url);
        }
      } catch (error) {
        console.warn('❌ Failed to retry request:', requestData.url, error);
      }
    }
  } catch (error) {
    console.error('Failed to retry requests:', error);
  }
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'ANC Audio Pro', {
        body: data.body || 'Your audio processing is complete!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: data.url || '/dashboard',
        actions: [
          {
            action: 'open',
            title: 'Open App',
            icon: '/icons/open-action.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/dismiss-action.png'
          }
        ]
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/dashboard')
    );
  }
});

// Handle app shortcuts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🎵 ANC Audio Pro Service Worker loaded successfully');