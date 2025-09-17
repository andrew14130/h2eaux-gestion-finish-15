// =============================================================================
// SERVICE WORKER AVANCÉ - H2EAUX GESTION PWA v3.0.0
// =============================================================================

const CACHE_NAME = 'h2eaux-gestion-v3.0.0';
const CACHE_VERSION = '3.0.0';

// Ressources critiques à mettre en cache
const CRITICAL_RESOURCES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css',
    '/css/modules.css',
    '/js/app.js',
    '/js/modules/clients.js',
    '/js/offline.js',
    '/assets/logo.png',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    '/offline.html'
];

// Ressources statiques (cache longue durée)
const STATIC_RESOURCES = [
    '/css/pac-advanced.css',
    '/css/fiches-chantier.css',
    '/js/update-manager.js',
    '/assets/icon-72.png',
    '/assets/icon-96.png',
    '/assets/icon-128.png',
    '/assets/icon-144.png',
    '/assets/icon-152.png',
    '/assets/icon-384.png'
];

// Routes API à ne pas mettre en cache
const API_ENDPOINTS = [
    '/api/health',
    '/api/auth/login',
    '/api/clients',
    '/api/chantiers',
    '/api/calculs-pac',
    '/api/fiches-sdb'
];

// Stratégies de cache
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    NETWORK_ONLY: 'network-only',
    CACHE_ONLY: 'cache-only',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};


// =============================================================================
// ÉVÉNEMENTS SERVICE WORKER
// =============================================================================

// Installation
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installation en cours...');
    
    event.waitUntil(
        (async () => {
            try {
                // Mise en cache des ressources critiques
                const cache = await caches.open(CACHE_NAME);
                console.log('📦 Cache ouvert:', CACHE_NAME);
                
                // Pré-cache des ressources critiques
                await cache.addAll(CRITICAL_RESOURCES);
                console.log('✅ Ressources critiques mises en cache');
                
                // Pré-cache des ressources statiques (non bloquant)
                try {
                    await cache.addAll(STATIC_RESOURCES);
                    console.log('✅ Ressources statiques mises en cache');
                } catch (error) {
                    console.warn('⚠️ Certaines ressources statiques non disponibles:', error.message);
                }
                
                // Forcer l'activation immédiate
                await self.skipWaiting();
                console.log('🚀 Service Worker installé et activé');
                
            } catch (error) {
                console.error('❌ Erreur installation Service Worker:', error);
                throw error;
            }
        })()
    );
});

// Activation
self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker: Activation en cours...');
    
    event.waitUntil(
        (async () => {
            try {
                // Nettoyage des anciens caches
                const cacheNames = await caches.keys();
                const deletePromises = cacheNames
                    .filter(name => name !== CACHE_NAME && name.startsWith('h2eaux-gestion-'))
                    .map(name => {
                        console.log('🗑️ Suppression ancien cache:', name);
                        return caches.delete(name);
                    });
                
                await Promise.all(deletePromises);
                
                // Prendre le contrôle de tous les clients
                await self.clients.claim();
                console.log('✅ Service Worker activé et contrôle pris');
                
                // Notifier les clients de l'activation
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_VERSION
                    });
                });
                
            } catch (error) {
                console.error('❌ Erreur activation Service Worker:', error);
            }
        })()
    );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Ignorer les requêtes non-HTTP
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Stratégie selon le type de ressource
    if (isAPIRequest(url)) {
        // API: Network First (données fraîches prioritaires)
        event.respondWith(handleAPIRequest(request));
    } else if (isStaticResource(url)) {
        // Statique: Cache First (performance)
        event.respondWith(handleStaticResource(request));
    } else if (isNavigationRequest(request)) {
        // Navigation: Network First avec fallback
        event.respondWith(handleNavigationRequest(request));
    } else {
        // Autres: Stale While Revalidate
        event.respondWith(handleGenericRequest(request));
    }
});

// Messages des clients
self.addEventListener('message', (event) => {
    const { data } = event;
    
    switch (data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                type: 'VERSION',
                version: CACHE_VERSION
            });
            break;
            
        case 'FORCE_UPDATE':
            forceUpdate();
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches();
            break;
            
        default:
            console.log('📨 Message Service Worker:', data);
    }
});


// =============================================================================
// GESTIONNAIRES DE REQUÊTES
// =============================================================================

// Requêtes API
async function handleAPIRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Toujours essayer le réseau en premier pour les données fraîches
        const response = await fetch(request);
        
        // Mettre en cache les réponses GET réussies
        if (request.method === 'GET' && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        console.warn('🌐 API hors ligne:', url.pathname);
        
        // Fallback cache pour GET seulement
        if (request.method === 'GET') {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                console.log('📦 Réponse depuis cache:', url.pathname);
                return cachedResponse;
            }
        }
        
        // Réponse d'erreur offline
        return new Response(
            JSON.stringify({ 
                error: 'Service hors ligne', 
                offline: true,
                timestamp: new Date().toISOString()
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Ressources statiques
async function handleStaticResource(request) {
    try {
        // Cache first pour les performances
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Si pas en cache, récupérer du réseau
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        console.warn('📦 Ressource statique non disponible:', request.url);
        
        // Fallback générique pour les images
        if (request.destination === 'image') {
            return new Response(
                '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" fill="#999">Image indisponible</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }
        
        throw error;
    }
}

// Requêtes de navigation
async function handleNavigationRequest(request) {
    try {
        // Essayer le réseau en premier
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        console.warn('🌐 Navigation hors ligne');
        
        // Fallback vers index.html en cache
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) {
            return cachedIndex;
        }
        
        // Fallback vers page offline
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) {
            return offlinePage;
        }
        
        // Réponse offline basique
        return new Response(
            `<!DOCTYPE html>
            <html>
            <head><title>H2EAUX GESTION - Hors ligne</title></head>
            <body>
                <h1>🌐 Application hors ligne</h1>
                <p>Veuillez vérifier votre connexion internet.</p>
                <button onclick="window.location.reload()">Réessayer</button>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }
}

// Requêtes génériques
async function handleGenericRequest(request) {
    try {
        // Stale while revalidate
        const cachedResponse = await caches.match(request);
        const fetchPromise = fetch(request).then(response => {
            if (response.ok) {
                const cache = caches.open(CACHE_NAME);
                cache.then(c => c.put(request, response.clone()));
            }
            return response;
        });
        
        return cachedResponse || await fetchPromise;
        
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}


// =============================================================================
// UTILITAIRES
// =============================================================================

function isAPIRequest(url) {
    return url.pathname.startsWith('/api/');
}

function isStaticResource(url) {
    const extension = url.pathname.split('.').pop();
    return ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'woff', 'woff2', 'ttf', 'eot'].includes(extension);
}

function isNavigationRequest(request) {
    return request.mode === 'navigate' || 
           (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

async function forceUpdate() {
    console.log('🔄 Mise à jour forcée du Service Worker');
    await self.skipWaiting();
    await self.clients.claim();
}

async function clearAllCaches() {
    console.log('🗑️ Nettoyage de tous les caches');
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
}


// =============================================================================
// GESTION DES ERREURS GLOBALES
// =============================================================================

self.addEventListener('error', (event) => {
    console.error('❌ Erreur Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesse rejetée Service Worker:', event.reason);
});


// =============================================================================
// NOTIFICATIONS PUSH (FUTUR)
// =============================================================================

self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        console.log('📱 Notification push reçue:', data);
        
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/assets/icon-192.png',
                badge: '/assets/icon-72.png',
                tag: 'h2eaux-notification',
                requireInteraction: true
            })
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        self.clients.openWindow('/')
    );
});


console.log('🚀 Service Worker H2EAUX GESTION v3.0.0 chargé');
console.log('📦 Cache:', CACHE_NAME);
console.log('🔧 Ressources critiques:', CRITICAL_RESOURCES.length);
console.log('📁 Ressources statiques:', STATIC_RESOURCES.length);