const CACHE_NAME = 'h2eaux-gestion-complet-v3.0.0';

const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './backend-local.js',
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
  './js/offline.js',
  './js/update-manager.js',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('SW: Installing H2eaux Gestion Complet v3.0.0');
  
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

self.addEventListener('activate', event => {
  console.log('SW: Activating H2eaux Gestion Complet v3.0.0');
  
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

self.addEventListener('fetch', event => {
  const request = event.request;
  
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(request, networkResponse.clone()));
          return networkResponse;
        }
        throw new Error('Network response not ok');
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw new Error('Request failed');
      });
    })
  );
});

console.log('SW: H2eaux Gestion Complet Service Worker v3.0.0 loaded');