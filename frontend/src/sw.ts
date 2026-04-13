import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

// Take control of all clients immediately on activation
self.skipWaiting()
clientsClaim()

// Remove caches from old precache versions on activate
cleanupOutdatedCaches()

// Precache all build-time static assets.
// self.__WB_MANIFEST is injected by vite-plugin-pwa at build time — it contains
// hashed URLs for every JS/CSS/HTML asset in the Vite output.
precacheAndRoute(self.__WB_MANIFEST)

// API routes: NEVER cache. Financial data (debts, balances, payments) must
// always come from the network. A stale cached response showing wrong balance
// causes real business disputes.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly()
)

// Accept skip-waiting message from useRegisterSW update flow
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
