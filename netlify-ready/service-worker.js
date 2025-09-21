const CACHE_NAME = 'h2eaux-gestion-v3.0.0';
const API_CACHE_NAME = 'h2eaux-api-cache-v3.0.0';

// Version management
const CURRENT_VERSION = '3.0.0';

// Files to cache for offline use (essential files only - no sensitive data)
const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './config.js',
  './css/main.css',
  './css/modules.css',
  './css/pac-advanced.css',
  './css/fiches-chantier.css',
  './js/app.js',
  './js/modules/clients.js',
  './js/modules/chantiers.js',
  './js/modules/calculs-pac-advanced.js',
  './js/modules/fiches-chantier.js',
  './js/modules/documents.js',
  './js/modules/calendrier.js',
  './js/modules/meg-integration.js',
  './js/modules/chat.js',
  './js/modules/settings.js',
  './js/modules/pdf-export.js',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './offline.html'
];

// ===== INSTALLATION =====
self.addEventListener('install', event => {
  console.log('SW: Installing H2eaux Gestion service worker v3.0.0');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Caching static files');
      return cache.addAll(STATIC_CACHE_URLS);
    }).then(() => {
      console.log('SW: Installation complete');
      return self.skipWaiting();
    }).catch(error => {
      console.error('SW: Installation failed:', error);
    })
  );
});

// ===== ACTIVATION =====
self.addEventListener('activate', event => {
  console.log('SW: Activating H2eaux Gestion service worker v3.0.0');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: Activation complete');
      return self.clients.claim();
    })
  );
});

// ===== FETCH HANDLING =====
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  const request = event.request;
  
  // Skip non-GET requests for cache
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests (don't cache sensitive data)
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static files
  event.respondWith(handleStaticRequest(request));
});

// ===== API REQUEST HANDLING (Secure) =====
async function handleApiRequest(request) {
  try {
    // Always try network first for API requests (security)
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Only cache non-sensitive API responses
      const url = new URL(request.url);
      if (!url.pathname.includes('/auth/') && !url.pathname.includes('/admin/')) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('SW: Network failed for API request');
    
    // Return offline message for auth requests
    if (request.url.includes('/auth/')) {
      return new Response(JSON.stringify({
        detail: 'Mode hors ligne - Authentification non disponible'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Try cache for non-sensitive data only
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// ===== STATIC REQUEST HANDLING =====
async function handleStaticRequest(request) {
  try {
    // Try cache first for static files
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    // Fallback for navigation requests
    if (request.mode === 'navigate') {
      const cachedIndex = await caches.match('./index.html');
      if (cachedIndex) return cachedIndex;
      
      // Ultimate fallback - offline page
      return caches.match('./offline.html');
    }
    
    throw error;
  }
}

console.log('SW: H2eaux Gestion Service Worker v3.0.0 loaded successfully');