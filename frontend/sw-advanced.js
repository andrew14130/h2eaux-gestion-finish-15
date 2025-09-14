const CACHE_NAME = 'h2eaux-gestion-v3.0.0';
const API_CACHE_NAME = 'h2eaux-api-cache-v3.0.0';
const OFFLINE_CACHE_NAME = 'h2eaux-offline-v3.0.0';

// Version management
const CURRENT_VERSION = '3.0.0';
const VERSION_ENDPOINT = '/version.json';

// Files to cache for offline use (essential files)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/css/modules.css',
  '/js/app.js',
  '/js/modules/clients.js',
  '/js/modules/chantiers.js',
  '/js/modules/calculs-pac.js',
  '/js/modules/settings.js',
  '/js/modules/pdf-export.js',
  '/js/offline.js',
  '/assets/logo.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/offline.html'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/clients',
  '/api/chantiers',
  '/api/calculs-pac',
  '/api/fiches-sdb',
  '/api/documents'
];

// Offline fallback data
const OFFLINE_FALLBACK = {
  clients: [],
  chantiers: [],
  calculsPac: [],
  fiches: [],
  documents: []
};

// ===== INSTALLATION =====
self.addEventListener('install', event => {
  console.log('SW: Installing advanced service worker v3.0.0');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(CACHE_NAME).then(cache => {
        console.log('SW: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS);
      }),
      
      // Initialize offline storage
      caches.open(OFFLINE_CACHE_NAME).then(cache => {
        console.log('SW: Initializing offline storage');
        return cache.put('/offline-data', new Response(JSON.stringify(OFFLINE_FALLBACK)));
      })
    ]).then(() => {
      console.log('SW: Installation complete');
      return self.skipWaiting();
    }).catch(error => {
      console.error('SW: Installation failed:', error);
    })
  );
});

// ===== ACTIVATION =====
self.addEventListener('activate', event => {
  console.log('SW: Activating advanced service worker v3.0.0');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== OFFLINE_CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Initialize background sync
      self.registration.sync?.register('background-sync')
    ]).then(() => {
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
    // For POST/PUT/DELETE, handle offline queuing
    if (requestUrl.pathname.startsWith('/api/')) {
      event.respondWith(handleOfflineWrite(request));
    }
    return;
  }
  
  // Handle API requests
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static files
  event.respondWith(handleStaticRequest(request));
});

// ===== API REQUEST HANDLING =====
async function handleApiRequest(request) {
  const requestUrl = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      
      // Update offline data if it's a list endpoint
      if (isListEndpoint(requestUrl.pathname)) {
        const responseData = await networkResponse.clone().json();
        await updateOfflineData(requestUrl.pathname, responseData);
      }
      
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('SW: Network failed, trying cache for:', requestUrl.pathname);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline header
      const response = cachedResponse.clone();
      response.headers.set('X-Offline', 'true');
      return response;
    }
    
    // Return offline fallback data
    if (isListEndpoint(requestUrl.pathname)) {
      const offlineData = await getOfflineData(requestUrl.pathname);
      return new Response(JSON.stringify(offlineData), {
        headers: {
          'Content-Type': 'application/json',
          'X-Offline': 'true'
        }
      });
    }
    
    // For auth endpoints, return error
    if (requestUrl.pathname.includes('/auth/')) {
      return new Response(JSON.stringify({
        detail: 'Mode hors ligne - Authentification non disponible'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
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
      const cachedIndex = await caches.match('/index.html');
      if (cachedIndex) return cachedIndex;
      
      // Ultimate fallback - offline page
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// ===== OFFLINE WRITE HANDLING =====
async function handleOfflineWrite(request) {
  try {
    // Try network first
    const response = await fetch(request);
    if (response.ok) {
      return response;
    }
    throw new Error('Network request failed');
  } catch (error) {
    // Queue for later sync
    await queueOfflineAction(request);
    
    // Return success-like response
    return new Response(JSON.stringify({
      success: true,
      offline: true,
      message: 'Action mise en file d\'attente pour synchronisation'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ===== OFFLINE DATA MANAGEMENT =====
function isListEndpoint(pathname) {
  return ['/api/clients', '/api/chantiers', '/api/calculs-pac', '/api/fiches-sdb', '/api/documents']
    .includes(pathname);
}

async function updateOfflineData(endpoint, data) {
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const offlineResponse = await cache.match('/offline-data');
  
  let offlineData = OFFLINE_FALLBACK;
  if (offlineResponse) {
    offlineData = await offlineResponse.json();
  }
  
  // Update the specific endpoint data
  switch (endpoint) {
    case '/api/clients':
      offlineData.clients = data;
      break;
    case '/api/chantiers':
      offlineData.chantiers = data;
      break;
    case '/api/calculs-pac':
      offlineData.calculsPac = data;
      break;
    case '/api/fiches-sdb':
      offlineData.fiches = data;
      break;
    case '/api/documents':
      offlineData.documents = data;
      break;
  }
  
  await cache.put('/offline-data', new Response(JSON.stringify(offlineData)));
}

async function getOfflineData(endpoint) {
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const offlineResponse = await cache.match('/offline-data');
  
  let offlineData = OFFLINE_FALLBACK;
  if (offlineResponse) {
    offlineData = await offlineResponse.json();
  }
  
  switch (endpoint) {
    case '/api/clients':
      return offlineData.clients;
    case '/api/chantiers':
      return offlineData.chantiers;
    case '/api/calculs-pac':
      return offlineData.calculsPac;
    case '/api/fiches-sdb':
      return offlineData.fiches;
    case '/api/documents':
      return offlineData.documents;
    default:
      return [];
  }
}

// ===== OFFLINE ACTION QUEUE =====
async function queueOfflineAction(request) {
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const queueResponse = await cache.match('/offline-queue');
  
  let queue = [];
  if (queueResponse) {
    queue = await queueResponse.json();
  }
  
  // Add action to queue
  const actionData = {
    id: Date.now(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: new Date().toISOString()
  };
  
  queue.push(actionData);
  
  await cache.put('/offline-queue', new Response(JSON.stringify(queue)));
  
  // Register background sync
  if (self.registration.sync) {
    await self.registration.sync.register('process-offline-queue');
  }
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', event => {
  console.log('SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'process-offline-queue') {
    event.waitUntil(processOfflineQueue());
  } else if (event.tag === 'background-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

async function processOfflineQueue() {
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const queueResponse = await cache.match('/offline-queue');
    
    if (!queueResponse) return;
    
    const queue = await queueResponse.json();
    const processedIds = [];
    
    for (const action of queue) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        if (response.ok) {
          processedIds.push(action.id);
          console.log('SW: Successfully synced offline action:', action.id);
        }
      } catch (error) {
        console.error('SW: Failed to sync action:', action.id, error);
      }
    }
    
    // Remove processed actions
    const remainingQueue = queue.filter(action => !processedIds.includes(action.id));
    await cache.put('/offline-queue', new Response(JSON.stringify(remainingQueue)));
    
    // Notify app of sync completion
    if (processedIds.length > 0) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            processedCount: processedIds.length
          });
        });
      });
    }
    
  } catch (error) {
    console.error('SW: Background sync failed:', error);
  }
}

async function performBackgroundSync() {
  try {
    // Refresh cached data
    for (const endpoint of API_ENDPOINTS) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const cache = await caches.open(API_CACHE_NAME);
          await cache.put(endpoint, response.clone());
          
          if (isListEndpoint(endpoint)) {
            const data = await response.json();
            await updateOfflineData(endpoint, data);
          }
        }
      } catch (error) {
        console.error('SW: Failed to sync endpoint:', endpoint, error);
      }
    }
    
    console.log('SW: Background sync completed');
  } catch (error) {
    console.error('SW: Background sync failed:', error);
  }
}

// ===== AUTO-UPDATE SYSTEM =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.waitUntil(checkForUpdates());
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function checkForUpdates() {
  try {
    const response = await fetch(VERSION_ENDPOINT);
    const versionInfo = await response.json();
    
    if (versionInfo.version !== CURRENT_VERSION) {
      // Notify app of available update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version: versionInfo.version,
            current: CURRENT_VERSION
          });
        });
      });
    }
  } catch (error) {
    console.error('SW: Update check failed:', error);
  }
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification H2EAUX GESTION',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: Math.random()
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir l\'application',
        icon: '/assets/icon-192.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/assets/icon-192.png'
      }
    ],
    requireInteraction: true,
    tag: 'h2eaux-notification'
  };

  event.waitUntil(
    self.registration.showNotification('H2EAUX GESTION', options)
  );
});

// ===== NOTIFICATION HANDLING =====
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/').then(windowClient => {
        return windowClient ? windowClient.focus() : null;
      })
    );
  }
});

// ===== PERIODIC BACKGROUND SYNC =====
self.addEventListener('periodicsync', event => {
  if (event.tag === 'content-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

console.log('SW: Advanced Service Worker v3.0.0 loaded successfully');