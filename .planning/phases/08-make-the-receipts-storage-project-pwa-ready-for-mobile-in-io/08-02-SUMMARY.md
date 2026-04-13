---
phase: 08-make-the-receipts-storage-project-pwa-ready-for-mobile-in-io
plan: "02"
subsystem: frontend/pwa
tags: [pwa, ios, meta-tags, manifest, viewport, vitest, tdd]
dependency_graph:
  requires:
    - frontend/src/hooks/usePwaInstall.ts (Plan 01 — hook exists before this plan)
    - frontend/vite.config.ts (Plan 01 — VitePWA plugin with injectRegister:'auto')
  provides:
    - frontend/index.html (iOS meta tags, viewport-fit=cover, no manual SW registration)
    - frontend/public/manifest.webmanifest (absolute start_url, scope, orientation field)
    - frontend/src/components/__tests__/pwa-meta.test.ts (5 passing DOM-content tests)
  affects:
    - iOS home screen installation (apple-mobile-web-app-capable enables standalone mode)
    - Android Chrome installability (correct start_url/scope fixes SW scope mismatch)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN for static file content verification using readFileSync
    - iOS PWA meta tag set (capable + status-bar-style + title)
    - viewport-fit=cover for iPhone notch safe-area-inset support
key_files:
  created:
    - frontend/src/components/__tests__/pwa-meta.test.ts
  modified:
    - frontend/index.html
    - frontend/public/manifest.webmanifest
decisions:
  - Used ../../../index.html (3 levels up) not ../../../../ — test file is at frontend/src/components/__tests__/, so 3 levels reaches frontend/
  - Tests use readFileSync (not jsdom DOM loading) — index.html is a static file; vitest jsdom cannot load it at a file path during test runs
  - apple-mobile-web-app-status-bar-style set to "default" (not "black-translucent") — default matches theme-color without overlapping content
metrics:
  duration: "~10 minutes"
  completed: "2026-04-13"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 08 Plan 02: iOS PWA Meta Tags + Hardened Manifest Summary

**One-liner:** iOS meta tags (apple-mobile-web-app-capable/status-bar-style/title) + viewport-fit=cover + absolute manifest start_url/scope/orientation, verified by 5 passing Vitest tests reading raw index.html.

## What Was Built

Added the iOS-specific PWA meta tag set to `frontend/index.html` that Safari requires to enable standalone home screen mode. Updated the viewport meta to include `viewport-fit=cover` so iPhone notch safe-area CSS variables work correctly. Removed the manual `navigator.serviceWorker.register()` inline script (now handled by `vite-plugin-pwa` injectRegister:'auto' from Plan 01, eliminating the Workbox/stub race condition). Fixed `manifest.webmanifest` to use absolute `start_url: "/"` and `scope: "/"` (resolves Chrome DevTools "SW does not control start_url" installability error), and added `orientation: "portrait"`. Created 5 Vitest tests that read the raw `index.html` content to verify all iOS meta tags are present (PWA-05 requirement).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 (RED) | pwa-meta DOM test — TDD RED phase | 9421705 | frontend/src/components/__tests__/pwa-meta.test.ts |
| 2 (GREEN) | iOS meta tags + viewport-fit + manifest hardening | 6501f73 | frontend/index.html, frontend/public/manifest.webmanifest, frontend/src/components/__tests__/pwa-meta.test.ts (path fix) |

## Verification Results

- `grep "apple-mobile-web-app-capable" frontend/index.html` — match: `content="yes"`
- `grep "apple-mobile-web-app-status-bar-style" frontend/index.html` — match: `content="default"`
- `grep "apple-mobile-web-app-title" frontend/index.html` — match: `content="Recibos"`
- `grep "viewport-fit=cover" frontend/index.html` — match found
- `grep "navigator.serviceWorker" frontend/index.html` — no match (CORRECT — removed)
- `grep '"start_url": "/"' frontend/public/manifest.webmanifest` — match found
- `grep '"scope": "/"' frontend/public/manifest.webmanifest` — match found
- `grep '"orientation": "portrait"' frontend/public/manifest.webmanifest` — match found
- `npx vitest run src/components/__tests__/pwa-meta.test.ts` — 5/5 tests pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incorrect path depth in pwa-meta.test.ts (../../../../ vs ../../../)**
- **Found during:** Task 1 verification (TDD RED phase — test errored on ENOENT, not assertion failure)
- **Issue:** Plan template specified `resolve(__dirname, '../../../../index.html')` which resolves to the repo root (`D:\Proyecto\Receipts-storage\index.html`) not the frontend root (`D:\Proyecto\Receipts-storage\frontend\index.html`). The test file is 3 levels deep from `frontend/` (src/components/__tests__/), not 4.
- **Fix:** Changed path to `../../../index.html` — confirmed correct by node path resolution check
- **Files modified:** frontend/src/components/__tests__/pwa-meta.test.ts
- **Commit:** 6501f73

## Known Stubs

None. All iOS meta tags are wired with real values. The manifest uses absolute URLs. Tests verify actual file content.

## Threat Flags

None. All threat mitigations from the plan's threat model were applied:
- T-8-05: `start_url: "/"` and `scope: "/"` — SW at /sw.js controls scope "/" which matches; Chrome DevTools installability error resolved
- T-8-07: Inline `navigator.serviceWorker.register()` removed — eliminates race condition with Workbox-generated SW

## Self-Check: PASSED

- [x] `frontend/src/components/__tests__/pwa-meta.test.ts` — exists, 5 tests
- [x] `frontend/index.html` — contains all 3 apple-mobile-web-app-* meta tags
- [x] `frontend/index.html` — contains viewport-fit=cover
- [x] `frontend/index.html` — does NOT contain navigator.serviceWorker.register
- [x] `frontend/public/manifest.webmanifest` — start_url: "/"
- [x] `frontend/public/manifest.webmanifest` — scope: "/"
- [x] `frontend/public/manifest.webmanifest` — orientation: "portrait"
- [x] Commit 9421705 — Task 1 RED (test file created)
- [x] Commit 6501f73 — Task 2 GREEN (index.html + manifest + path fix)
- [x] 5/5 pwa-meta tests pass green
