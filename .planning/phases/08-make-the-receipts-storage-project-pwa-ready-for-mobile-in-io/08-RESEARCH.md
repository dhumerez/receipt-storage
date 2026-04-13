# Phase 8: PWA Ready for Mobile (iOS and Android) - Research

**Researched:** 2026-04-13
**Domain:** Progressive Web App (PWA) — vite-plugin-pwa, Workbox, service workers, iOS/Android install
**Confidence:** HIGH (core stack verified against npm registry and official docs)

---

## Summary

The project already has a head-start: `index.html` references a `manifest.webmanifest` and a `sw.js`, both already present in `frontend/public/`. The manifest covers the Android minimum (192x192, 512x512 icons, `display: standalone`, `theme_color`). The service worker is currently a minimal stub — fetch listener exists but does no caching. The `apple-touch-icon-180x180.png` is linked in `<head>`. The foundation is structurally correct; the work is to replace the stub service worker with a Workbox-powered one, harden the manifest for iOS, add Nginx cache-control headers for `sw.js` and `manifest.webmanifest`, and wire up the install prompt UX.

The recommended implementation path is **`vite-plugin-pwa` 1.2.0 with `strategies: 'injectManifest'`** and a custom `src/sw.ts`. This gives full control over caching strategy — essential because this app uses httpOnly cookie auth and must not cache API responses opaquely. Static assets use `CacheFirst`; API routes use `NetworkOnly` (no stale data for financial records). The install prompt is a lightweight hook pattern; no third-party library needed.

**Primary recommendation:** Adopt `vite-plugin-pwa` with `injectManifest` + custom `src/sw.ts` using `NetworkOnly` for `/api/*` and `CacheFirst` for static assets. Keep `sw.js` in `public/` only as a stub during dev; production bundle generates the real service worker. Update Nginx to serve `sw.js` and `manifest.webmanifest` with `Cache-Control: no-store`.

---

## Current State Inventory

> What already exists in the repo before Phase 8 begins.

| Asset | Location | Status | Gap |
|-------|----------|--------|-----|
| `manifest.webmanifest` | `frontend/public/` | Present — Android-ready | Missing `screenshots`, `orientation`, `apple-touch-icon` in manifest |
| `sw.js` (stub) | `frontend/public/` | Present — install eligible | No caching logic; needs Workbox replacement via vite-plugin-pwa |
| `apple-touch-icon-180x180.png` | `frontend/public/` | Present, 180x180 PNG | Already linked in `<head>` |
| `pwa-192x192.png` | `frontend/public/` | Present, 192x192 PNG | Good for Android |
| `pwa-512x512.png` | `frontend/public/` | Present, 512x512 PNG | Good for Android, also listed as `maskable` |
| `<link rel="manifest">` in `index.html` | `frontend/index.html` | Present | Correct |
| `<meta name="theme-color">` in `index.html` | `frontend/index.html` | `#2563eb` | Correct |
| `<link rel="apple-touch-icon">` in `index.html` | `frontend/index.html` | Present | Correct |
| SW registration in `index.html` | `frontend/index.html` | Present (inline script) | Will be replaced by vite-plugin-pwa auto-registration |
| `viewport` meta | `frontend/index.html` | `width=device-width, initial-scale=1.0` | Correct, but missing `viewport-fit=cover` for iPhone notch |
| Nginx conf | `nginx/receipts.conf` | HTTPS-only, no SW cache headers | Needs `Cache-Control: no-store` for `sw.js` and `manifest.webmanifest` |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | 1.2.0 | Generates service worker + injects precache manifest | Zero-config PWA for Vite; peer of workbox-build 7.4.0 |
| workbox-precaching | 7.4.0 | Precaches static build assets in SW | Official Google Workbox module — included via vite-plugin-pwa |
| workbox-routing | 7.4.0 | Route matching in custom SW | Required for `registerRoute` |
| workbox-strategies | 7.4.0 | NetworkFirst, CacheFirst, NetworkOnly strategy objects | Required when writing custom SW logic |
| workbox-core | 7.4.0 | `clientsClaim`, `skipWaiting` | Lifecycle control |

[VERIFIED: npm registry — `npm view vite-plugin-pwa version` returned `1.2.0`; its `workbox-build` dep is `^7.4.0`]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| workbox-window | 7.4.0 | `useRegisterSW` hook (via `virtual:pwa-register/react`) | If using vite-plugin-pwa's React hook for update toasts |

[VERIFIED: npm registry — `npm view workbox-window version` returned `7.4.0`]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-pwa | Hand-rolled Vite plugin + raw Workbox | More control, much more boilerplate; not worth it |
| injectManifest | generateSW | generateSW is simpler but cannot express "NetworkOnly for /api/*" without runtimeCaching hacks — less safe for authenticated financial data |
| Custom install hook | `pwa-install` web component | Adds dep; hook approach is <30 lines, fully custom |

**Installation:**
```bash
cd frontend
npm install --save-dev vite-plugin-pwa workbox-precaching workbox-routing workbox-strategies workbox-core workbox-window
```

**Version verification (confirmed 2026-04-13):**

```
vite-plugin-pwa  → 1.2.0
workbox-*        → 7.4.0
```

---

## Architecture Patterns

### Recommended Project Structure Changes

```
frontend/
├── public/
│   ├── manifest.webmanifest     # Update: add screenshots, orientation
│   ├── apple-touch-icon-180x180.png  # Keep as-is
│   ├── pwa-192x192.png          # Keep as-is
│   ├── pwa-512x512.png          # Keep as-is
│   └── favicon.svg              # Keep as-is
│   # sw.js stub in public/ is REMOVED — vite-plugin-pwa generates the real one
├── src/
│   ├── sw.ts                    # NEW: custom service worker (TypeScript)
│   ├── hooks/
│   │   └── usePwaInstall.ts     # NEW: BeforeInstallPromptEvent hook
│   └── components/
│       └── PwaInstallBanner.tsx # NEW: optional install prompt UI
├── vite.config.ts               # Updated: add VitePWA() plugin
├── tsconfig.json                # Updated: add "WebWorker" to lib, vite-plugin-pwa/react to types
└── index.html                   # Updated: remove inline SW registration, add viewport-fit=cover, apple meta tags
```

### Pattern 1: injectManifest Strategy (Recommended)

**What:** Plugin compiles `src/sw.ts` and injects the precache manifest at build time. You control 100% of runtime caching logic.
**When to use:** When you need precise control over which URLs are cached and with what strategy — required for apps with authentication, financial data, or when you must guarantee API calls are always fresh.

**`vite.config.ts` addition:**
```typescript
// Source: vite-pwa-org.netlify.app/guide/inject-manifest
import { VitePWA } from 'vite-plugin-pwa'

// Add inside plugins array:
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'autoUpdate',
  injectRegister: 'auto',       // removes the manual inline registration in index.html
  manifest: {
    name: 'Rastreador de Recibos',
    short_name: 'Recibos',
    description: 'Gestiona y rastrea tus recibos y deudas',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#2563eb',
    background_color: '#ffffff',
    orientation: 'portrait',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  devOptions: {
    enabled: false,           // do not run SW in dev (avoid auth/cookie confusion)
    type: 'module',
  },
})
```

**`src/sw.ts` — custom service worker:**
```typescript
// Source: vite-pwa-org.netlify.app/guide/inject-manifest
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly, CacheFirst } from 'workbox-strategies'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

// Take control immediately on update
self.skipWaiting()
clientsClaim()

// Clean up caches from outdated precache versions
cleanupOutdatedCaches()

// Precache all build-time static assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)

// API routes: always network-only — never serve stale financial data from cache.
// credentials are included automatically because the SW is same-origin.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly()
)

// Static assets already handled by precacheAndRoute above.
// External fonts/icons (if any added later) can use CacheFirst here.

// Accept update message from useRegisterSW hook
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
```

### Pattern 2: iOS-Specific Head Meta Tags

**What:** iOS Safari ignores parts of the Web App Manifest. These meta tags are the iOS-specific equivalents.
**When to use:** Always — required for iPhone/iPad home screen installability and proper standalone behavior.

```html
<!-- Add to frontend/index.html <head> -->
<!-- Existing viewport — add viewport-fit=cover for notch safety area -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

<!-- iOS PWA standalone mode (hide Safari UI when launched from home screen) -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Recibos" />

<!-- iOS icons (already linked, confirm correct) -->
<link rel="apple-touch-icon" href="apple-touch-icon-180x180.png" />

<!-- Splash screens: iOS requires per-device images via apple-touch-startup-image.
     This is optional for MVP — iOS shows white screen + icon without it.
     Can be added as a Wave 2 enhancement if launch experience is priority. -->
```

[CITED: web.dev/learn/pwa/enhancements — confirms apple-mobile-web-app-capable and apple-touch-icon]

### Pattern 3: Nginx Headers for Service Worker and Manifest

**What:** The browser checks `sw.js` byte-by-byte on each page load to detect updates. If Nginx caches it, updates never deploy.
**When to use:** Required — current Nginx config has no explicit headers for these files.

```nginx
# Add to nginx/receipts.conf inside the HTTPS server block
# (can go in the location / block or as separate location blocks)

# Service worker — must NEVER be cached
location = /sw.js {
    proxy_pass         http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Forwarded-Proto $scheme;
    add_header         Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    expires            off;
}

# Web App Manifest — short cache acceptable but no-store is safer
location = /manifest.webmanifest {
    proxy_pass         http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Forwarded-Proto $scheme;
    add_header         Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    expires            off;
}
```

[CITED: github.com/h5bp/server-configs-nginx/issues/158 — SW cache headers best practice]

### Pattern 4: Install Prompt Hook (Android — BeforeInstallPromptEvent)

**What:** Android Chrome fires `beforeinstallprompt` when the app is installable. Capture and defer the event; show a custom banner.
**When to use:** Android only — iOS has no programmatic install prompt; iOS users must use Share > "Add to Home Screen" manually.

```typescript
// src/hooks/usePwaInstall.ts
import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallEvent(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const promptInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') setInstallEvent(null)
  }

  return { canInstall: !!installEvent && !isInstalled, isInstalled, promptInstall }
}
```

[CITED: web.dev/articles/customize-install — BeforeInstallPromptEvent pattern]

### Pattern 5: tsconfig.json Updates for Service Worker Types

```json
// frontend/tsconfig.json — add WebWorker to lib, add vite-plugin-pwa/react to types
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "types": ["vite/client", "vitest/globals", "vite-plugin-pwa/react"]
  }
}
```

[CITED: vite-pwa-org.netlify.app/frameworks/react — required for virtual module types]

### Anti-Patterns to Avoid

- **Caching `/api/*` responses in the service worker:** Financial data (debts, payments, balances) must always be fresh. A stale cache showing a wrong balance is worse than an offline error. Use `NetworkOnly` for all `/api/` routes.
- **Using `generateSW` strategy:** It doesn't offer easy "exclude API routes from cache" — you'd need complex `runtimeCaching` excludes. `injectManifest` gives direct control.
- **Serving `sw.js` from a subdirectory:** The service worker scope is limited to its URL path. `sw.js` at `/sw.js` scopes to `/` (the whole app). Placing it at `/assets/sw.js` would scope to `/assets/` only — the app would not be controllable by the SW.
- **Keeping the manual `navigator.serviceWorker.register()` in `index.html`:** When `vite-plugin-pwa` is used with `injectRegister: 'auto'`, it injects its own registration. Keeping both causes a race condition between the stub SW and the real one.
- **Setting `SameSite=Strict` on the refresh token cookie:** When iOS launches a PWA from the home screen, iOS sometimes creates a fresh navigation context. Strict same-site may cause the cookie to be absent on the first API call. `SameSite=Lax` is safer for cross-context navigations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Precache manifest generation | Custom build script to list files | `vite-plugin-pwa` (injectManifest) | Auto-hashes every asset; updates invalidate old cache entries correctly |
| Workbox strategy implementations | Custom fetch cache logic | `workbox-strategies` (NetworkOnly, CacheFirst) | Edge cases in cache expiry, response cloning, race conditions are handled |
| Service worker update flow | Custom `postMessage` + reload logic | `virtual:pwa-register/react` + `useRegisterSW` hook | Handles update detection, skip-waiting handshake, prompts user to refresh |
| iOS install detection | UA sniffing | `window.navigator.standalone` check | Platform-supplied boolean; UA sniffing is fragile |

---

## Common Pitfalls

### Pitfall 1: SW Registration Race (stub vs. vite-plugin-pwa generated)

**What goes wrong:** The current `index.html` has an inline `navigator.serviceWorker.register()` script. When `vite-plugin-pwa` with `injectRegister: 'auto'` is added, it also generates a registration script. The browser processes both; whichever registers last wins, but the stub `sw.js` in `public/` overrides the generated one in production if not removed.
**Why it happens:** The stub file at `public/sw.js` is copied to the build output verbatim; `vite-plugin-pwa` also emits a `sw.js` to the output. Last write wins — which is non-deterministic.
**How to avoid:** Delete `frontend/public/sw.js` before adding `vite-plugin-pwa`. The plugin generates `sw.js` at build time in the output directory. Remove the inline SW registration from `index.html` (plugin handles it via `injectRegister: 'auto'`).
**Warning signs:** Lighthouse PWA audit shows "Service worker does not have a fetch handler" or Workbox console logs are absent.

### Pitfall 2: iOS Cookie Isolation (Session Lost After Install)

**What goes wrong:** On iOS, a PWA installed to the home screen runs in a **separate storage partition** from Safari. An existing Safari session (logged-in) does not carry into the installed PWA. The user must log in again inside the PWA context.
**Why it happens:** iOS allocates a separate WebKit Web Process for standalone PWAs. Cookies, localStorage, and sessionStorage are partitioned. As of iOS 17.2, iOS performs a one-time cookie copy at install time — so if the user was logged into Safari when they added the app to home screen, the cookie is copied once. After logout/expire, re-auth is in the PWA partition only.
**How to avoid:** This is a platform limitation — cannot be fully overcome. Document it in onboarding. Ensure the login flow works correctly when opening the PWA fresh (the `apiClient` 401 interceptor + refresh flow already handles this correctly). Do NOT require users to log in via browser first.
**Warning signs:** Users report "I have to log in again after installing." Expected behavior on iOS.

### Pitfall 3: SameSite Cookie Setting on iOS PWA

**What goes wrong:** If the refresh token cookie is set with `SameSite=Strict`, iOS standalone navigation context may treat PWA-initiated requests as cross-site, causing the cookie to be absent.
**Why it happens:** iOS PWA standalone mode creates its own browsing context. Some iOS versions treat the origin as a different "site" for SameSite purposes.
**How to avoid:** Use `SameSite=Lax` on the refresh token cookie. Check `REFRESH_COOKIE_OPTIONS` in the auth service — it should be `sameSite: 'lax'` (lowercase for the `cookie` npm package). `SameSite=Lax` allows the cookie on top-level navigations and same-site requests.
**Warning signs:** Login works on desktop but 401 on first API call from iOS PWA, even though `httpOnly` cookie was set.

### Pitfall 4: Service Worker Scope and start_url Mismatch

**What goes wrong:** Lighthouse installability check fails with "Service worker does not control start_url".
**Why it happens:** The manifest's `start_url` must be within the service worker's scope. If `start_url: '.'` (relative) resolves differently than the SW scope (absolute `/`), they mismatch.
**How to avoid:** Set `start_url: '/'` and `scope: '/'` explicitly in the manifest (already done via plugin config above). The SW registered at `/sw.js` controls `/` scope by default.
**Warning signs:** Chrome DevTools Application panel shows SW scope does not include start_url.

### Pitfall 5: Missing `devOptions.enabled: false` in Dev Mode

**What goes wrong:** Service worker runs in dev mode (`vite dev`), intercepts requests with NetworkOnly, and you can't debug API issues because every request appears fine but cached state from a previous build confuses things.
**Why it happens:** vite-plugin-pwa can register the SW in dev mode if `devOptions.enabled: true`.
**How to avoid:** Keep `devOptions: { enabled: false }` (the default). SW only activates in production builds. Verify in `chrome://serviceworker-internals` that no SW is registered during `vite dev`.

### Pitfall 6: EU DMA Restriction on iOS (No Standalone)

**What goes wrong:** Users in EU countries on iOS 17.4+ experience PWA opening in a Safari tab instead of standalone mode.
**Why it happens:** Apple's response to Digital Markets Act briefly removed standalone PWA support in the EU; this was reinstated after feedback, but the situation may change again.
**How to avoid:** Test the app works perfectly in both browser tab mode and standalone mode. Standalone-specific UX enhancements (hiding back button, etc.) must gracefully degrade. Check `window.matchMedia('(display-mode: standalone)').matches` before enabling standalone-only UI.

---

## iOS vs Android PWA Feature Matrix

| Feature | iOS Safari (16.4+) | Android Chrome | Notes |
|---------|-------------------|----------------|-------|
| Add to Home Screen | Manual: Share > Add | Auto prompt via `beforeinstallprompt` | iOS cannot be programmatically prompted |
| Standalone display mode | Yes | Yes | Both honor `display: standalone` |
| Push notifications | Yes (iOS 16.4+, outside EU) | Yes | Must request `Notification` permission |
| Service workers | Yes | Yes | Both support fetch interception |
| httpOnly cookies in SW fetch | Yes — cookies sent automatically on same-origin requests | Yes | SW cannot read cookies but they are forwarded |
| Session shared with browser | Partially (one-time copy at install) | Yes (same cookie store) | iOS isolation is a key UX difference |
| Cache API | 50 MB limit, auto-cleared after 7 days idle | Larger quota, less aggressive eviction | Conservative caching for iOS |
| Background sync | No | Yes | Not relevant for this app |
| `beforeinstallprompt` event | Never fires | Fires when installable | iOS users need manual Add to Home Screen instruction |

[CITED: magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide]
[CITED: brainhub.eu/library/pwa-on-ios]

---

## Offline Support Scope Decision

This is a financial SaaS with real-time data requirements. The correct offline posture is:

| Scenario | Behavior | Implementation |
|----------|----------|----------------|
| App shell loads offline | Yes — precached HTML/CSS/JS renders the UI | `precacheAndRoute(self.__WB_MANIFEST)` |
| API data loads offline | No — show "no connection" state | `NetworkOnly` for `/api/*` |
| File downloads offline | No — authenticated streams require network | `NetworkOnly` |
| Login offline | No | N/A — auth requires server |
| Already-loaded page navigated offline | Partial — page shell loads; data fetches fail gracefully | TanStack Query's `networkMode: 'always'` shows cached query data until new fetch fails |

**Rationale:** Serving stale debt balances or payment statuses is worse than showing "offline." A user who thinks balance is X when it's Y creates business disputes. Full offline read mode (IndexedDB sync) is explicitly out of scope and not worth the complexity.

---

## Icon Requirements Summary

| Platform | Size | File | Status |
|----------|------|------|--------|
| Android (manifest) | 192x192 | `pwa-192x192.png` | Present |
| Android (manifest, maskable) | 512x512 | `pwa-512x512.png` | Present |
| iOS Home Screen | 180x180 | `apple-touch-icon-180x180.png` | Present |
| iOS (older devices) | 152x152, 120x120 | Not present | Not critical — iOS falls back to 180x180 |
| Favicon | SVG | `favicon.svg` | Present |

**Assessment:** Icon set is sufficient for MVP. iOS uses the 180x180 for all sizes when smaller variants are absent — acceptable fallback.

---

## Nginx Configuration — Full Required Changes

Current `nginx/receipts.conf` proxies everything through to port 4001. It needs two new location blocks for cache headers on SW and manifest. These are placed BEFORE the catch-all `location /` block:

```nginx
# Add to the HTTPS server block in nginx/receipts.conf
# BEFORE the existing "location /" block

# Service worker — never cache; byte-diff check must always get fresh file
location = /sw.js {
    proxy_pass         http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Forwarded-Proto $scheme;
    add_header         Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
    expires            off;
}

# Web App Manifest — no-store ensures fresh manifest on every page load
location = /manifest.webmanifest {
    proxy_pass         http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Forwarded-Proto $scheme;
    add_header         Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
    expires            off;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `create-react-app` built-in SW | vite-plugin-pwa | 2022 (CRA deprecated) | Better Workbox integration with Vite |
| `workbox-webpack-plugin` | `workbox-build` via vite-plugin-pwa | 2021+ | webpack no longer the default |
| Manual SW registration | `injectRegister: 'auto'` | vite-plugin-pwa 0.14+ | Plugin handles registration |
| iOS splash screens via `apple-touch-startup-image` | Still required (no manifest support) | Not changed — Apple limitation | Must be per-device-size image; deferred to future phase |
| Lighthouse PWA category | Deprecated in Lighthouse 12 | 2024 | Chrome DevTools > Application > Manifest is the primary check now |
| `display: browser` or `display: minimal-ui` | `display: standalone` | N/A | Standalone hides browser chrome — correct for app-like feel |

---

## Validation Architecture

> `nyquist_validation: true` in config.json

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + @playwright/test 1.59.1 |
| Config file | `vite.config.ts` (vitest embedded) |
| Quick run command | `cd frontend && npm test` |
| Full suite command | `cd frontend && npm test -- --reporter=verbose` |
| E2E | `npx playwright test` (for PWA installability flow) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| PWA-01 | App manifest is valid and installable | Manual/DevTools | Chrome DevTools Application tab | Lighthouse PWA category deprecated; use DevTools |
| PWA-02 | Service worker registers and controls the page | Manual | chrome://serviceworker-internals | Check scope includes `/` |
| PWA-03 | Static assets precached (JS/CSS load offline) | Manual | Chrome DevTools Network tab (offline mode) | Toggle "Offline" checkbox, reload |
| PWA-04 | API routes are NetworkOnly (never cached) | Manual | Network tab + SW intercept log | `/api/` requests should show "from ServiceWorker" but be network-only |
| PWA-05 | iOS meta tags present in HTML | Automated | `npm test` (DOM test on index.html parsing) | Check for `apple-mobile-web-app-capable` in rendered HTML |
| PWA-06 | Install prompt fires on Android | Manual | Android Chrome DevTools (USB debug) | Trigger via `:beforeinstallprompt` in DevTools |
| PWA-07 | `sw.js` served with `Cache-Control: no-store` | Manual | curl or DevTools Headers tab | `curl -I https://receipts.domain.com/sw.js` |
| PWA-08 | Manifest served with `Cache-Control: no-store` | Manual | curl | `curl -I https://receipts.domain.com/manifest.webmanifest` |
| PWA-09 | Login works correctly in PWA standalone mode | Manual | iOS: Add to Home Screen, open, log in | Verify httpOnly cookie flow functions |
| PWA-10 | `display-mode: standalone` detected in app | Unit | Vitest + jsdom (mock `window.matchMedia`) | Test `usePwaInstall` hook |

### Wave 0 Gaps

- [ ] `frontend/src/hooks/__tests__/usePwaInstall.test.ts` — covers PWA-10
- [ ] No new test framework install needed — Vitest and Playwright already present

### Sampling Rate

- **Per task commit:** `npm test` (unit tests)
- **Per wave merge:** `npm test` + manual Lighthouse-equivalent check in Chrome DevTools
- **Phase gate:** Manual verification on real iOS device (Safari) + Android device (Chrome) before `/gsd-verify-work`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | httpOnly cookie carried through SW — no change needed |
| V3 Session Management | Yes | NetworkOnly for `/api/*` ensures no stale session responses cached |
| V4 Access Control | No | No change — server enforces it |
| V5 Input Validation | No | No new user inputs |
| V6 Cryptography | No | No cryptographic changes |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SW caches 401/403 error responses | Information Disclosure | `NetworkOnly` for `/api/*` — never cache any response from authenticated endpoints |
| Stale precached JS serves old vulnerable code | Tampering | `cleanupOutdatedCaches()` in SW; `precacheAndRoute` uses content hashes; old cache purged on SW activate |
| Manifest served stale (old app name/scope) | Spoofing | `Cache-Control: no-store` on `manifest.webmanifest` |
| SW file cached by Nginx (old SW version active) | Tampering | `Cache-Control: no-store` on `sw.js` |
| iOS session confusion after install | Auth Bypass (unintentional) | Document that iOS re-login is expected; ensure login page is fully functional in standalone mode |

---

## Open Questions

1. **iOS Splash Screens**
   - What we know: iOS requires per-device `apple-touch-startup-image` meta tags; no image = white flash on launch
   - What's unclear: Whether the project owner wants per-device splash screen images (requires generating ~15 different PNG sizes)
   - Recommendation: Skip for Phase 8 MVP; document as optional future enhancement. White screen is brief and acceptable.

2. **Push Notifications**
   - What we know: iOS 16.4+ supports push outside EU; requires explicit permission request; service worker must handle `push` events
   - What's unclear: Whether push is in scope for Phase 8 (REQUIREMENTS.md lists in-app notification bell, not push)
   - Recommendation: Out of scope for Phase 8. The in-app notification center (Phase 5) is the current notification system.

3. **EU DMA Impact**
   - What we know: Apple briefly removed PWA standalone in EU under iOS 17.4, then reversed it
   - What's unclear: Whether this project's user base is in the EU and whether future regulatory changes matter
   - Recommendation: Build standalone-mode enhancements to degrade gracefully to browser-tab mode. No EU-specific branch needed.

4. **`display-mode: standalone` UI Adaptations**
   - What we know: Current app has a `BottomTabBar` and `Sidebar` for navigation
   - What's unclear: Whether extra safe-area padding (for iOS notch/home indicator) is needed
   - Recommendation: Add `env(safe-area-inset-bottom)` padding to `BottomTabBar` as part of this phase — small CSS addition with real UX impact.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vite-plugin-pwa install | Yes | 24.14.0 | — |
| npm | Package install | Yes | Included | — |
| HTTPS (Let's Encrypt) | Service worker activation | Config present | receipts.yourdomain.com placeholder | Must be replaced with real domain before testing |
| Real iOS device (Safari) | Manual PWA testing | Unknown | — | BrowserStack device testing |
| Real Android device (Chrome) | Manual PWA testing | Unknown | — | Chrome DevTools device emulation (partial) |
| Nginx on Hetzner | SW cache headers | Config present | Host Nginx | — |

**Missing dependencies with no fallback:**
- Real iOS device for Add to Home Screen testing — Chrome DevTools cannot simulate this; BrowserStack or physical device required for phase gate validation.

**Missing dependencies with fallback:**
- Real Android device — Chrome DevTools "Mobile Device" emulation covers `beforeinstallprompt` testing; real device preferred for final validation.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | vite-plugin-pwa 1.2.0 is compatible with Vite 8.0.3 | Standard Stack | Plugin may require Vite ≤7; check peer deps on install. `npm view vite-plugin-pwa peerDependencies` to verify before install. |
| A2 | iOS 17.2+ performs one-time cookie copy at install | Common Pitfalls | If false, users must always re-authenticate in iOS PWA standalone mode — affects UX design decisions |
| A3 | `SameSite=Lax` on refresh cookie works in iOS PWA context | Common Pitfalls (Pitfall 3) | If wrong, iOS PWA cannot authenticate; would require `SameSite=None; Secure` which requires explicit CORS config |
| A4 | The existing public/sw.js must be deleted (plugin outputs to dist root) | Architecture | If vite-plugin-pwa emits to a different path, the stub might coexist harmlessly — but safer to delete |

---

## Sources

### Primary (HIGH confidence)
- `npm view vite-plugin-pwa` — version 1.2.0, workbox-build@^7.4.0 peer [VERIFIED: npm registry]
- `npm view workbox-window version` — 7.4.0 [VERIFIED: npm registry]
- `vite-pwa-org.netlify.app/guide/inject-manifest` — injectManifest strategy configuration and sw.ts example [CITED]
- `vite-pwa-org.netlify.app/frameworks/react` — useRegisterSW hook, tsconfig types [CITED]
- `web.dev/articles/customize-install` — BeforeInstallPromptEvent pattern [CITED]
- `web.dev/learn/pwa/enhancements` — apple-mobile-web-app meta tags [CITED]

### Secondary (MEDIUM confidence)
- `magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide` — iOS PWA storage limits, EU DMA reversal, push on 16.4+ [CITED]
- `brainhub.eu/library/pwa-on-ios` — iOS PWA current status 2025 [CITED]
- `github.com/h5bp/server-configs-nginx/issues/158` — Nginx no-store for sw.js pattern [CITED]
- `developer.chrome.com/docs/lighthouse/pwa/installable-manifest` — installability criteria [CITED]

### Tertiary (LOW confidence — needs validation)
- WebSearch results on iOS 17.2 one-time cookie copy at install time — referenced in multiple sources but not directly from Apple documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry
- Architecture: HIGH — patterns from official vite-plugin-pwa docs
- iOS limitations: MEDIUM — documented from third-party sources; Apple does not publish formal PWA support matrix
- Pitfalls: MEDIUM/HIGH — most from direct official source references; cookie isolation is MEDIUM (A2, A3 in Assumptions Log)

**Research date:** 2026-04-13
**Valid until:** 2026-07-13 (90 days — PWA spec is stable; iOS Safari behavior changes more frequently; re-verify iOS cookie behavior if >3 months pass)
