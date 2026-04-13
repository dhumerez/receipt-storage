---
phase: 08-make-the-receipts-storage-project-pwa-ready-for-mobile-in-io
plan: "01"
subsystem: frontend/pwa
tags: [pwa, service-worker, workbox, vite-plugin-pwa, hooks, vitest]
dependency_graph:
  requires: []
  provides:
    - frontend/src/sw.ts (Workbox service worker with NetworkOnly /api/* and precacheAndRoute)
    - frontend/src/hooks/usePwaInstall.ts (hook for install prompt detection)
    - frontend/src/hooks/__tests__/usePwaInstall.test.ts (5 unit tests)
  affects:
    - frontend/vite.config.ts (VitePWA plugin added)
    - frontend/tsconfig.json (WebWorker lib + vite-plugin-pwa/react types)
    - frontend/package.json (vite-plugin-pwa + workbox-* devDependencies)
tech_stack:
  added:
    - vite-plugin-pwa@1.2.0 (injectManifest strategy)
    - workbox-precaching@7.4.0
    - workbox-routing@7.4.0
    - workbox-strategies@7.4.0
    - workbox-core@7.4.0
    - workbox-window@7.4.0
    - "@testing-library/dom (transitive dep, explicit install)"
  patterns:
    - Workbox injectManifest strategy for full caching control
    - NetworkOnly for /api/* (financial data must never be cached)
    - precacheAndRoute(self.__WB_MANIFEST) for static app shell
    - BeforeInstallPromptEvent capture hook pattern
key_files:
  created:
    - frontend/src/sw.ts
    - frontend/src/hooks/usePwaInstall.ts
    - frontend/src/hooks/__tests__/usePwaInstall.test.ts
  modified:
    - frontend/vite.config.ts
    - frontend/tsconfig.json
    - frontend/package.json
    - frontend/package-lock.json
decisions:
  - Used --legacy-peer-deps for vite-plugin-pwa install (Vite 8 not in peer dep range ^7.0.0; plugin works correctly)
  - Used vi.fn() instead of jest.fn() in tests (project uses Vitest, not Jest)
  - Added @testing-library/dom explicitly (broken transitive dep after --legacy-peer-deps install)
  - devOptions.enabled:false to prevent SW from intercepting API calls in dev mode
metrics:
  duration: "~15 minutes"
  completed: "2026-04-13"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 4
---

# Phase 08 Plan 01: Workbox Service Worker + usePwaInstall Hook Summary

**One-liner:** Workbox injectManifest SW with NetworkOnly for /api/* + precacheAndRoute for app shell, plus usePwaInstall hook with 5 passing Vitest unit tests.

## What Was Built

Replaced the no-op stub `public/sw.js` with a production Workbox service worker using vite-plugin-pwa's `injectManifest` strategy. The SW uses `NetworkOnly` for all `/api/*` routes (financial data must never be stale) and `precacheAndRoute(self.__WB_MANIFEST)` for the app shell (JS/CSS/HTML). Created the `usePwaInstall` hook that detects `display-mode: standalone`, captures `BeforeInstallPromptEvent`, and exposes `canInstall`/`isInstalled`/`promptInstall` — ready for Plan 04's install banner component.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | usePwaInstall hook + unit tests (TDD) | 7fcfd9a | frontend/src/hooks/usePwaInstall.ts, frontend/src/hooks/__tests__/usePwaInstall.test.ts |
| 2 | Install vite-plugin-pwa + sw.ts + vite.config.ts + tsconfig.json | a207604 | frontend/src/sw.ts, frontend/vite.config.ts, frontend/tsconfig.json, frontend/package.json |

## Verification Results

- `cd frontend && npx vitest run src/hooks/__tests__/usePwaInstall.test.ts` — 5/5 tests pass
- `grep -n "VitePWA" frontend/vite.config.ts` — match found
- `ls frontend/public/sw.js` — file NOT found (stub deleted)
- `grep -n "NetworkOnly" frontend/src/sw.ts` — match found
- `grep -n "__WB_MANIFEST" frontend/src/sw.ts` — match found
- `grep -n "WebWorker" frontend/tsconfig.json` — match found
- `grep -n "vite-plugin-pwa/react" frontend/tsconfig.json` — match found

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used vi.fn() instead of jest.fn() in test file**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Plan template used `jest.fn()` but project uses Vitest — `jest` global is not defined in the test environment
- **Fix:** Replaced all `jest.fn()` calls with `vi.fn()` — Vitest's equivalent mock function factory
- **Files modified:** frontend/src/hooks/__tests__/usePwaInstall.test.ts

**2. [Rule 3 - Blocking] vite-plugin-pwa 1.2.0 peer dep constraint excludes Vite 8**
- **Found during:** Task 2 (npm install)
- **Issue:** vite-plugin-pwa@1.2.0 declares `peerDependencies: { vite: "^3.1.0 || ... || ^7.0.0" }` — Vite 8.0.3 is not included. npm refuses to install without flag.
- **Fix:** Used `npm install --legacy-peer-deps` — the plugin works correctly with Vite 8 (semver constraint is conservative, not a functional incompatibility). This was noted as Assumption A1 in RESEARCH.md.
- **Files modified:** frontend/package.json, frontend/package-lock.json

**3. [Rule 3 - Blocking] Missing @testing-library/dom after --legacy-peer-deps install**
- **Found during:** Task 2 verification (npm test after install)
- **Issue:** After `--legacy-peer-deps` install, `@testing-library/dom` was no longer resolved as a transitive dependency, causing `Cannot find module '@testing-library/dom'` error
- **Fix:** Added `@testing-library/dom` as an explicit devDependency
- **Files modified:** frontend/package.json, frontend/package-lock.json

## Known Stubs

None. The `usePwaInstall` hook is fully wired (reads `window.matchMedia`, captures `BeforeInstallPromptEvent`, manages state). The SW is a real Workbox implementation, not a stub. The install banner component (Plan 04) will consume `usePwaInstall`.

## Threat Flags

None. All threat mitigations from the plan's threat model were applied:
- T-8-01: `NetworkOnly` for `/api/*` — financial data never cached
- T-8-02: `cleanupOutdatedCaches()` on SW activate
- T-8-03: `devOptions: { enabled: false }` — SW never runs in development

## Self-Check: PASSED

- [x] `frontend/src/hooks/usePwaInstall.ts` — exists
- [x] `frontend/src/hooks/__tests__/usePwaInstall.test.ts` — exists
- [x] `frontend/src/sw.ts` — exists
- [x] `frontend/vite.config.ts` — contains VitePWA
- [x] `frontend/tsconfig.json` — contains WebWorker and vite-plugin-pwa/react
- [x] Commit 7fcfd9a — Task 1 (hook + tests)
- [x] Commit a207604 — Task 2 (vite-plugin-pwa + SW + config)
- [x] 5/5 usePwaInstall tests pass green
