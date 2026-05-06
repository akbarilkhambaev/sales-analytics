const CACHE_VERSION = 'v1';
const STATIC_CACHE = `akfa-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `akfa-dynamic-${CACHE_VERSION}`;

// Pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'])
    )
  );
  self.skipWaiting();
});

// Remove old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from same origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never cache backend API or auth calls — always network
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  ) return;

  // Cache-first for Next.js static assets and icons (fingerprinted, never change)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Network-first for page navigations (fresh content, fallback to cache when offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match('/'));
        })
    );
  }
});
