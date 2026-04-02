// Self-destructing service worker — clears all caches and unregisters itself.
// Does NOT call client.navigate() to avoid reloading pages mid-render.
// The index.html cleanup script handles the reload when needed.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
  );
});

// Pass through all fetch requests to the network — never serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
