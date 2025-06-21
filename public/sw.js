/**
 * SAKAI - Service Worker
 * Gestisce cache, offline functionality e PWA features
 */

const CACHE_NAME = 'sakai-v1.0.0';
const RUNTIME_CACHE = 'sakai-runtime-v1.0.0';
const DATA_CACHE = 'sakai-data-v1.0.0';

// Risorse statiche da cachare durante l'installazione
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.js',
  '/src/styles/main.css',
  '/src/utils/helpers.js',
  '/src/services/StorageService.js',
  '/src/components/AppLauncher.js',
  '/src/components/AppImporter.js',
  '/src/components/AppCard.js',
  '/src/components/SettingsPanel.js',
  '/src/components/SyncManager.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// Risorse da aggiornare in background
const RUNTIME_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/dexie/3.2.4/dexie.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/fuse.js/7.0.0/fuse.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/date-fns/2.30.0/index.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.5/purify.min.js'
];

// API endpoints per cache dinamica
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.github\.com\//,
  /^https:\/\/www\.googleapis\.com\//,
  /^https:\/\/accounts\.google\.com\//
];

/**
 * SERVICE WORKER EVENTS
 */

// Installazione SW - Pre-cache risorse statiche
self.addEventListener('install', (event) => {
  console.log('🔧 SAKAI Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache risorse statiche
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Pre-caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      }),
      
      // Cache risorse runtime
      caches.open(RUNTIME_CACHE).then(cache => {
        console.log('🌐 Pre-caching runtime resources');
        return cache.addAll(RUNTIME_RESOURCES.filter(url => url.startsWith('http')));
      })
    ]).then(() => {
      console.log('✅ SAKAI Service Worker: Installation complete');
      // Forza attivazione immediata
      return self.skipWaiting();
    }).catch(error => {
      console.error('❌ SAKAI Service Worker: Installation failed', error);
    })
  );
});

// Attivazione SW - Pulizia cache obsolete
self.addEventListener('activate', (event) => {
  console.log('⚡ SAKAI Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Pulizia cache obsolete
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('sakai-') && 
                ![CACHE_NAME, RUNTIME_CACHE, DATA_CACHE].includes(cacheName)) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Prendi controllo di tutte le pagine
      self.clients.claim()
    ]).then(() => {
      console.log('✅ SAKAI Service Worker: Activation complete');
    })
  );
});

// Gestione richieste fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(handleFetch(event.request));
});

/**
 * GESTIONE FETCH STRATEGY
 */
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Strategia per file statici locali
    if (url.origin === location.origin) {
      return await handleStaticResources(request);
    }
    
    // Strategia per CDN e librerie esterne
    if (isCDNResource(url)) {
      return await handleCDNResources(request);
    }
    
    // Strategia per API (GitHub, Google, etc.)
    if (isAPIRequest(url)) {
      return await handleAPIRequests(request);
    }
    
    // Strategia per blob URLs (app ZIP)
    if (url.protocol === 'blob:') {
      return await fetch(request);
    }
    
    // Default: network first
    return await networkFirst(request);
    
  } catch (error) {
    console.error('SW Fetch Error:', error);
    return await handleOfflineFallback(request);
  }
}

/**
 * STRATEGIE DI CACHE
 */

// Cache First per risorse statiche
async function handleStaticResources(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Aggiorna cache in background per HTML
    if (request.destination === 'document') {
      event.waitUntil(updateCache(request));
    }
    return cachedResponse;
  }
  
  // Se non in cache, fetch e cache
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  
  return response;
}

// Stale While Revalidate per CDN
async function handleCDNResources(request) {
  const cachedResponse = await caches.match(request);
  
  // Restituisci subito dalla cache se disponibile
  if (cachedResponse) {
    // Aggiorna in background
    event.waitUntil(updateRuntimeCache(request));
    return cachedResponse;
  }
  
  // Se non in cache, fetch e cache
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  
  return response;
}

// Network First per API
async function handleAPIRequests(request) {
  try {
    const response = await fetch(request);
    
    // Cache solo le risposte GET di successo
    if (request.method === 'GET' && response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fallback alla cache per richieste GET
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    throw error;
  }
}

// Network First generico
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * UTILITY FUNCTIONS
 */

// Controlla se è una risorsa CDN
function isCDNResource(url) {
  return url.hostname.includes('cdnjs.cloudflare.com') ||
         url.hostname.includes('cdn.jsdelivr.net') ||
         url.hostname.includes('unpkg.com') ||
         url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('fonts.gstatic.com');
}

// Controlla se è una richiesta API
function isAPIRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

// Aggiorna cache in background
async function updateCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Aggiorna runtime cache in background
async function updateRuntimeCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.log('Runtime cache update failed:', error);
  }
}

// Fallback offline
async function handleOfflineFallback(request) {
  // Per le pagine HTML, restituisci l'app principale
  if (request.destination === 'document') {
    const cachedApp = await caches.match('/');
    if (cachedApp) {
      return cachedApp;
    }
  }
  
  // Per le immagini, restituisci un placeholder
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">' +
      '<rect width="200" height="150" fill="#f3f4f6"/>' +
      '<text x="100" y="75" text-anchor="middle" fill="#6b7280" font-family="sans-serif" font-size="14">Offline</text>' +
      '</svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  
  // Default offline response
  return new Response('Offline - Connessione non disponibile', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

/**
 * BACKGROUND SYNC & PUSH
 */

// Background Sync per sincronizzazione dati
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sakai-sync-apps') {
    event.waitUntil(syncAppsData());
  }
  
  if (event.tag === 'sakai-sync-settings') {
    event.waitUntil(syncSettingsData());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Notifica da SAKAI',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'SAKAI', options)
  );
});

// Click su notifica
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  let urlToOpen = data.url || '/';
  
  // Gestisci azioni specifiche
  if (event.action) {
    switch (event.action) {
      case 'open-app':
        urlToOpen = `/?launch=${data.appId}`;
        break;
      case 'view-sync':
        urlToOpen = '/?page=sync';
        break;
      default:
        urlToOpen = data.url || '/';
    }
  }
  
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});

/**
 * GESTIONE SHARE TARGET
 */

// Gestione condivisione file
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle share target
  if (url.pathname === '/import' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const url = formData.get('url');
    const title = formData.get('title');
    const text = formData.get('text');
    
    // Reindirizza alla pagina principale con parametri
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (text) params.set('text', text);
    if (url) params.set('url', url);
    
    return Response.redirect(`/?action=import&${params.toString()}`, 302);
    
  } catch (error) {
    console.error('Share target error:', error);
    return Response.redirect('/?action=import', 302);
  }
}

/**
 * BACKGROUND SYNC FUNCTIONS
 */

async function syncAppsData() {
  try {
    console.log('🔄 Syncing apps data...');
    
    // Ottieni client attivo
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      // Invia messaggio per triggerare sync
      clients[0].postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'sync-apps'
      });
    }
    
  } catch (error) {
    console.error('Apps sync failed:', error);
  }
}

async function syncSettingsData() {
  try {
    console.log('🔄 Syncing settings data...');
    
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'sync-settings'
      });
    }
    
  } catch (error) {
    console.error('Settings sync failed:', error);
  }
}

/**
 * MESSAGE HANDLING
 */

// Ascolta messaggi dalla app principale
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_UPDATE':
      event.waitUntil(updateSpecificCache(data.url));
      break;
      
    case 'CACHE_CLEAR':
      event.waitUntil(clearCache(data.cacheNames));
      break;
      
    case 'SYNC_REQUEST':
      event.waitUntil(requestBackgroundSync(data.tag));
      break;
      
    case 'SW_UPDATE_CHECK':
      event.waitUntil(checkForUpdates());
      break;
      
    default:
      console.log('Unknown SW message type:', type);
  }
});

// Aggiorna cache specifica
async function updateSpecificCache(url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, response);
      console.log('Cache updated for:', url);
    }
  } catch (error) {
    console.error('Cache update failed for:', url, error);
  }
}

// Pulisci cache specifiche
async function clearCache(cacheNames) {
  try {
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log('Cache cleared:', cacheName);
    }
  } catch (error) {
    console.error('Cache clear failed:', error);
  }
}

// Richiedi background sync
async function requestBackgroundSync(tag) {
  try {
    await self.registration.sync.register(tag);
    console.log('Background sync registered:', tag);
  } catch (error) {
    console.error('Background sync registration failed:', error);
  }
}

// Controlla aggiornamenti SW
async function checkForUpdates() {
  try {
    const registration = await self.registration.update();
    console.log('SW update check completed');
  } catch (error) {
    console.error('SW update check failed:', error);
  }
}

/**
 * PWA INSTALL EVENTS
 */

// Gestione install prompt
self.addEventListener('beforeinstallprompt', (event) => {
  // Impedisci il prompt automatico
  event.preventDefault();
  
  // Invia evento al client per gestire l'install
  self.clients.matchAll().then(clients => {
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'PWA_INSTALL_PROMPT',
        event: event
      });
    }
  });
});

// PWA installata
self.addEventListener('appinstalled', (event) => {
  console.log('🎉 SAKAI PWA installed successfully');
  
  // Notifica il client
  self.clients.matchAll().then(clients => {
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'PWA_INSTALLED'
      });
    }
  });
});

console.log('📱 SAKAI Service Worker loaded');