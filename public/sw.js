const CACHE_NAME = 'mechatronian-v1';

// Install: skip waiting to activate immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
});

// Fetch: network-first strategy — never serve stale JS/CSS
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Never cache-intercept JS, CSS, or asset files
  if (url.pathname.startsWith('/assets/')) return;

  // For navigation requests (HTML pages), use network-first with fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
});
