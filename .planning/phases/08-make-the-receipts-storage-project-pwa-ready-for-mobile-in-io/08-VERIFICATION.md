---
phase: 08-make-the-receipts-storage-project-pwa-ready-for-mobile-in-io
verified: 2026-04-13T01:29:30Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Install prompt on Android Chrome"
    expected: "Banner appears on first visit, tapping 'Instalar' triggers the native OS Add to Home Screen dialog, and the banner disappears after install"
    why_human: "BeforeInstallPromptEvent only fires in a real Android Chrome session — cannot simulate in automated test environment"
  - test: "iOS Safari standalone installation"
    expected: "Banner shows Share-button guidance on iOS Safari (not Android branch), tapping X dismisses for the session, and app opens fullscreen after adding to home screen"
    why_human: "iOS Safari UA sniffing and standalone mode require a real device — vitest jsdom cannot replicate these conditions"
  - test: "Service worker update cycle"
    expected: "After a simulated deployment (new sw.js hash), existing installed users receive the updated SW within one navigation cycle without stale JS serving"
    why_human: "Requires a real deployment + reload cycle; cannot verify SW byte-diff update flow in a static code check"
  - test: "iPhone notch safe-area clearance"
    expected: "BottomTabBar does not overlap the home indicator on iPhone models with a notch (iPhone X and later) in standalone mode"
    why_human: "env(safe-area-inset-bottom) only takes non-zero values on real hardware — CSS environment variables are not emulated in test environments"
---

# Phase 08: PWA Mobile iOS Readiness — Verification Report

**Phase Goal:** Make the Receipts Storage app installable and usable as a PWA on iOS and Android devices, with a production-grade Workbox service worker, iOS meta tags, correct manifest, no-cache Nginx headers for sw.js and manifest, and an install banner component.
**Verified:** 2026-04-13T01:29:30Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Workbox SW (NetworkOnly for /api/*, precacheAndRoute for app shell) replaces stub sw.js | VERIFIED | `frontend/src/sw.ts` — 34 lines, imports workbox-precaching/routing/strategies, `NetworkOnly` for `/api/`, `precacheAndRoute(self.__WB_MANIFEST)` for shell |
| 2 | usePwaInstall hook detects install prompt and standalone mode | VERIFIED | `frontend/src/hooks/usePwaInstall.ts` — 52 lines, listens to `beforeinstallprompt`/`appinstalled`, exposes `canInstall`/`isInstalled`/`promptInstall` |
| 3 | iOS meta tags and viewport-fit=cover are present in index.html, manual SW registration removed | VERIFIED | 3 apple-mobile-web-app-* tags confirmed at lines 12/14/16, viewport-fit=cover at line 6, no `navigator.serviceWorker` found |
| 4 | manifest.webmanifest uses absolute start_url, scope, and declares orientation | VERIFIED | `start_url: "/"` (line 6), `scope: "/"` (line 7), `orientation: "portrait"` (line 11) |
| 5 | Nginx serves sw.js and manifest.webmanifest with Cache-Control: no-store | VERIFIED | `nginx/receipts.conf` lines 44-63: exact-match location blocks with `no-store, no-cache, must-revalidate` and `always` flag |
| 6 | PwaInstallBanner renders Android native prompt or iOS guidance, wired into AppLayout, with safe-area CSS on BottomTabBar | VERIFIED | `PwaInstallBanner.tsx` 81 lines, two branches (canInstall/isIos); AppLayout imports and renders at line 38; `.pwa-safe-bottom` in BottomTabBar nav root and `index.css` |

**Score:** 5/5 must-haves verified (truth 6 combines Plans 01+04 into one observable outcome; all component evidence verified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/sw.ts` | Workbox service worker with NetworkOnly + precacheAndRoute | VERIFIED | 34 lines, real Workbox imports, no stub |
| `frontend/src/hooks/usePwaInstall.ts` | Hook for install prompt detection | VERIFIED | 52 lines, event listeners, promptInstall function |
| `frontend/src/hooks/__tests__/usePwaInstall.test.ts` | 5 unit tests | VERIFIED | 5/5 passing (confirmed by test run) |
| `frontend/src/components/PwaInstallBanner.tsx` | Install banner (Android + iOS) | VERIFIED | 81 lines, both branches, dismiss state |
| `frontend/src/components/__tests__/pwa-meta.test.ts` | 5 iOS meta tag DOM tests | VERIFIED | 5/5 passing (confirmed by test run) |
| `frontend/index.html` | iOS meta tags + viewport-fit=cover, no manual SW registration | VERIFIED | All 4 checks confirmed |
| `frontend/public/manifest.webmanifest` | Absolute start_url/scope + orientation | VERIFIED | Lines 6, 7, 11 confirmed |
| `frontend/vite.config.ts` | VitePWA plugin with injectManifest strategy | VERIFIED | Line 11-14 confirmed |
| `frontend/tsconfig.json` | WebWorker lib + vite-plugin-pwa/react types | VERIFIED | Line 4 and 17 confirmed |
| `frontend/src/index.css` | .pwa-safe-bottom with env(safe-area-inset-bottom) | VERIFIED | Lines 6-7 confirmed |
| `frontend/src/components/layout/AppLayout.tsx` | PwaInstallBanner import and render | VERIFIED | Lines 5, 38 confirmed |
| `frontend/src/components/layout/BottomTabBar.tsx` | pwa-safe-bottom class on nav root | VERIFIED | Line 54 confirmed |
| `nginx/receipts.conf` | No-cache location blocks for sw.js and manifest.webmanifest | VERIFIED | Lines 44-63 confirmed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `PwaInstallBanner.tsx` | `usePwaInstall.ts` | import at line 2 | WIRED | Consumes `canInstall`, `isInstalled`, `promptInstall` |
| `AppLayout.tsx` | `PwaInstallBanner.tsx` | import line 5, render line 38 | WIRED | Banner rendered as sibling of BottomTabBar |
| `BottomTabBar.tsx` nav root | `.pwa-safe-bottom` CSS class | className at line 54 | WIRED | Class defined in index.css lines 6-7 |
| `sw.ts` | `__WB_MANIFEST` | `precacheAndRoute(self.__WB_MANIFEST)` | WIRED | Injected by vite-plugin-pwa at build time |
| `vite.config.ts` | `sw.ts` | VitePWA `filename: 'sw.ts'` | WIRED | injectManifest strategy references sw.ts |
| Nginx `receipts.conf` | `/sw.js` | `location = /sw.js` exact-match block | WIRED | Cache-Control no-store applied |
| Nginx `receipts.conf` | `/manifest.webmanifest` | `location = /manifest.webmanifest` exact-match block | WIRED | Cache-Control no-store applied |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| usePwaInstall unit tests (5 tests) | `npx vitest run src/hooks/__tests__/usePwaInstall.test.ts` | 5/5 passed in 39ms | PASS |
| iOS meta tag tests (5 tests) | `npx vitest run src/components/__tests__/pwa-meta.test.ts` | 5/5 passed in 39ms | PASS |
| Total test suite | Both test files | 10/10 passed | PASS |
| Stub sw.js removed | `ls frontend/public/sw.js` | NOT FOUND (correct — stub deleted) | PASS |
| No inline SW registration | `grep navigator.serviceWorker index.html` | NOT FOUND (correct — removed) | PASS |

### Anti-Patterns Found

None. All PWA files are substantive implementations:
- No TODO/FIXME markers in any PWA source file
- No `return null` stubs — PwaInstallBanner returns null only for valid runtime conditions (already installed, standalone mode, dismissed)
- No empty handlers — `promptInstall()` makes a real async call to `BeforeInstallPromptEvent.prompt()`
- No hardcoded empty data — service worker uses live Workbox strategies
- The old no-op `public/sw.js` stub was deleted and replaced by `src/sw.ts`

### Human Verification Required

#### 1. Android Chrome Install Prompt

**Test:** Open the app in Android Chrome on a real device. Wait for the `beforeinstallprompt` event (usually fires after first visit). Verify the blue PwaInstallBanner appears at the bottom. Tap "Instalar" and confirm the OS Add to Home Screen dialog appears.
**Expected:** Native install dialog shows, app is added to home screen, banner disappears after install, app launches fullscreen on next open.
**Why human:** `BeforeInstallPromptEvent` only fires in a real Android Chrome browser session — Vitest jsdom cannot simulate OS-level install events.

#### 2. iOS Safari Home Screen Installation

**Test:** Open the app in Safari on an iPhone. Verify the blue banner shows the Share-button guidance ("Toca Compartir > Agregar a la pantalla de inicio"), not the Android install button. Tap X and confirm the banner disappears for the session. Add to home screen via Share menu and verify the app opens fullscreen without Safari chrome.
**Expected:** iOS branch (UA sniff for iPhone/iPad/iPod) activates correctly; standalone mode suppresses the banner on subsequent visits.
**Why human:** iOS Safari UA and `navigator.standalone` are not emulated in any automated test environment.

#### 3. Service Worker Update Cycle

**Test:** Install the PWA, deploy a code change (new build), revisit the app. Verify the new service worker activates and the updated code is served.
**Expected:** Workbox `skipWaiting()` + `clientsClaim()` causes the new SW to take control immediately; Nginx `no-store` on `sw.js` ensures the browser fetches the new worker file on every page load.
**Why human:** Requires a real deployment with a changed build hash; cannot simulate SW byte-diff update detection with static file checks.

#### 4. iPhone Notch Safe-Area Clearance

**Test:** Open the app in standalone mode on an iPhone X or later (models with a home indicator). Verify the BottomTabBar does not overlap the home indicator swipe area at the bottom of the screen.
**Expected:** `env(safe-area-inset-bottom, 0px)` adds sufficient bottom padding to the BottomTabBar nav element so navigation icons are fully visible above the home indicator.
**Why human:** CSS environment variables like `safe-area-inset-bottom` only have non-zero values on real Apple hardware — they return 0 in all simulated environments.

### Gaps Summary

No gaps. All 4 plans completed with Self-Check: PASSED, all 13 required artifacts exist on disk, all are substantive implementations (not stubs), all key links are wired. The 10 automated tests (5 usePwaInstall + 5 pwa-meta) pass. The 4 human verification items above are behavioral checks that require real iOS/Android devices — they cannot be resolved programmatically.

---

_Verified: 2026-04-13T01:29:30Z_
_Verifier: Claude (gsd-verifier)_
