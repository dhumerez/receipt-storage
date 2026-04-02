// Minimal service worker for PWA installability.
// Network-only strategy — no caching to avoid stale content issues.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Let the browser handle all requests normally (network-only).
  // A fetch listener is required for PWA install eligibility.
});
