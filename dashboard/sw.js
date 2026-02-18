// Service Worker for Cockpit PWA
const CACHE_NAME = 'cockpit-v1';
const STATIC_ASSETS = [
  '/',
  '/style.css',
  '/js/main.js',
  '/js/state.js',
  '/js/utils.js',
  '/js/dashboard.js',
  '/js/terminal.js',
  '/js/diff.js',
  '/js/modals.js',
  '/js/highlight.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always use network for API calls, SSE, and WebSocket upgrades
  if (url.pathname.startsWith('/api/') || event.request.headers.get('accept')?.includes('text/event-stream')) {
    return;
  }

  // Network-first for HTML (always fresh)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok && url.origin === self.location.origin) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        });
      })
      .catch(() => new Response('Offline', { status: 503 }))
  );
});
