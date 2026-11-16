/**
 * ASIL Logistics - Service Worker (sw.js)
 * High-performance offline caching, asset pre-fetching, and background sync.
 */

const CACHE_NAME = 'asil-cache-v6.0.0';

const PRECACHE_ASSETS = [
  '/offline.html',
  '/css/asil-core.css',
  '/css/asil-design.css',
  '/css/department-dashboard.css',
  '/css/asil-app.css',
  '/fonts/plus-jakarta-sans.woff2',
  '/fonts/inter.woff2',
  '/js/asil-common.js',
  '/js/asil-motion.js',
  '/js/auth.js',
  '/js/pwa.js',
  '/js/offline.js',
  '/js/sea.js',
  '/js/air.js',
  '/js/subscription.js',
  '/img/logo.svg',
  '/img/hero-logistics.webp',
  '/favicon.svg',
  '/favicon.ico',
  '/img/icons/icon-192.png',
  '/img/icons/icon-512.png',
  '/img/icons/icon-maskable-512.png',
  '/img/icons/favicon-32.png'
];

// 1. INSTALL LIFECYCLE: Precache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE LIFECYCLE: Purge stale caches, claim clients, and refresh tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()).then(() => {
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PWA_CACHE_PURGED' });
        });
      });
    })
  );
});

// 3. MESSAGE LISTENER: Support SKIP_WAITING message from UI
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || (event.data && (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting'))) {
    self.skipWaiting();
  }
});

// 4. FETCH PIPELINE: Strategy selection based on route & resource type
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never intercept non-GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Security & Privacy rule: NEVER cache APIs, private/cargo uploads, or admin management console
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/uploads_private/') ||
    url.pathname.startsWith('/admin')
  ) {
    return; // Pass through directly to network
  }

  // Cross-origin check: only cache same-origin and Google Fonts
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isSameOrigin && !isGoogleFont) {
    return;
  }

  // A. Page Navigations (HTML Documents): NETWORK-FIRST -> CACHE -> /offline.html fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // B. Static Assets (CSS, JS, Images, Fonts): STALE-WHILE-REVALIDATE
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      }).catch(() => null);

      return cachedRes || fetchPromise;
    })
  );
});
