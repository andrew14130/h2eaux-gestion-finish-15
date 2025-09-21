const CACHE_NAME = 'h2eaux-gestion-v3.0.0';

// Files to cache for offline use
const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './config.js',
  './backend-mock.js',
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

// Installation
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

// Activation
self.addEventListener('activate', event => {
  console.log('SW: Activating H2eaux Gestion service worker v3.0.0');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
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

// Fetch handling
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  try {
    // Try cache first
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
      
      // Ultimate fallback
      return caches.match('./offline.html');
    }
    
    throw error;
  }
}

console.log('SW: H2eaux Gestion Service Worker v3.0.0 loaded successfully');