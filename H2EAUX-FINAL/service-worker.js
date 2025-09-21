const CACHE_NAME = 'h2eaux-gestion-autonome-v3.0.0';

const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './app-local.js',
  './css/main.css',
  './css/modules.css',
  './css/pac-advanced.css',
  './css/fiches-chantier.css',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('SW: Installing H2eaux Gestion Autonome v3.0.0');
  
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
  console.log('SW: Activating H2eaux Gestion Autonome v3.0.0');
  
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

console.log('SW: H2eaux Gestion Autonome Service Worker v3.0.0 loaded');