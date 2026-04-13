---
phase: 08-make-the-receipts-storage-project-pwa-ready-for-mobile-in-io
plan: "04"
subsystem: frontend/pwa
tags: [pwa, install-banner, safe-area, ios, android, tailwind]
dependency_graph:
  requires:
    - frontend/src/hooks/usePwaInstall.ts (Plan 01)
  provides:
    - frontend/src/components/PwaInstallBanner.tsx (install prompt component)
  affects:
    - frontend/src/components/layout/AppLayout.tsx (PwaInstallBanner wired)
    - frontend/src/components/layout/BottomTabBar.tsx (safe-area class added)
    - frontend/src/index.css (pwa-safe-bottom CSS rule added)
tech_stack:
  added: []
  patterns:
    - React useState for session-only dismiss state (no localStorage)
    - navigator.userAgent UA sniffing for iOS detection
    - window.matchMedia('(display-mode: standalone)') for standalone detection
    - CSS env(safe-area-inset-bottom) for iPhone home indicator clearance
key_files:
  created:
    - frontend/src/components/PwaInstallBanner.tsx
  modified:
    - frontend/src/components/layout/AppLayout.tsx
    - frontend/src/components/layout/BottomTabBar.tsx
    - frontend/src/index.css
decisions:
  - Used .pwa-safe-bottom CSS class approach (not data attribute) to integrate cleanly with existing Tailwind className pattern on BottomTabBar nav element
  - Dismissed state is session-only via useState (no localStorage) — banner reappears on page refresh, which is acceptable per plan
  - PwaInstallBanner placed as direct sibling of BottomTabBar in AppLayout JSX (outside inner flex column) so fixed positioning works correctly relative to viewport
metrics:
  duration: "~15 minutes"
  completed: "2026-04-13"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 08 Plan 04: PwaInstallBanner Component + Safe-Area CSS Summary

**One-liner:** PwaInstallBanner with Android native install prompt and iOS Share-button guidance, wired into AppLayout above BottomTabBar, with env(safe-area-inset-bottom) padding on BottomTabBar for iPhone home indicator clearance.

## What Was Built

Created `PwaInstallBanner` component consuming the `usePwaInstall` hook from Plan 01. Android Chrome users see a blue floating banner with an "Instalar" button that triggers the native OS install dialog via `BeforeInstallPromptEvent.prompt()`. iOS Safari users (where no programmatic prompt API exists) see guidance text: "Toca Compartir > Agregar a la pantalla de inicio". Both branches return null when: already installed, already in standalone mode, or dismissed for the session. The banner is wired into `AppLayout` directly above `BottomTabBar`. A `.pwa-safe-bottom` CSS utility using `env(safe-area-inset-bottom, 0px)` was added to `index.css` and applied to the `BottomTabBar` nav root so iPhone notch/home indicator does not obscure mobile navigation in standalone mode.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create PwaInstallBanner component | 43bd232 | frontend/src/components/PwaInstallBanner.tsx |
| 2 | Wire PwaInstallBanner into AppLayout + safe-area CSS | 60afc04 | frontend/src/components/layout/AppLayout.tsx, frontend/src/index.css, frontend/src/components/layout/BottomTabBar.tsx |

## Verification Results

- `grep -n "export function PwaInstallBanner" frontend/src/components/PwaInstallBanner.tsx` — match at line 14
- `grep -n "usePwaInstall" frontend/src/components/PwaInstallBanner.tsx` — match at line 2
- `grep -n "canInstall" frontend/src/components/PwaInstallBanner.tsx` — match at line 15, 24
- `grep -n "isIos" frontend/src/components/PwaInstallBanner.tsx` — match at line 4, 55
- `grep -n "display-mode: standalone" frontend/src/components/PwaInstallBanner.tsx` — match at line 9
- `grep -n "promptInstall" frontend/src/components/PwaInstallBanner.tsx` — match at line 15, 44
- `grep -c 'role="banner"' frontend/src/components/PwaInstallBanner.tsx` — 2 matches
- `grep -n "PwaInstallBanner" frontend/src/components/layout/AppLayout.tsx` — 2 matches (import + render)
- `grep -n "safe-area-inset-bottom" frontend/src/index.css` — match at line 7
- `npx vitest run src/hooks/__tests__/usePwaInstall.test.ts` — 5/5 tests pass

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written. The `.pwa-safe-bottom` class approach was selected over the `data-bottomtabbar` attribute approach as the plan explicitly offered it as an "ALTERNATIVE simpler approach" — this is a documented plan option, not a deviation.

## Known Stubs

None. Both banner branches are fully wired: Android reads `canInstall` from `usePwaInstall` and calls `promptInstall()` on button click; iOS renders real guidance text. The `pwa-safe-bottom` padding uses a real browser CSS environment variable.

## Threat Flags

None. All mitigations from the plan's threat model were applied:
- T-8-13: `promptInstall()` sets installEvent to null after 'accepted' outcome — prompt cannot fire again
- T-8-14: Banner uses `fixed bottom-16` (above BottomTabBar); `z-50` below modal z-indexes; dismissed state removes it; not shown in standalone mode

## Self-Check: PASSED

- [x] `frontend/src/components/PwaInstallBanner.tsx` — exists, 81 lines
- [x] `frontend/src/components/layout/AppLayout.tsx` — contains PwaInstallBanner import and render
- [x] `frontend/src/index.css` — contains `.pwa-safe-bottom` with `env(safe-area-inset-bottom, 0px)`
- [x] `frontend/src/components/layout/BottomTabBar.tsx` — contains `pwa-safe-bottom` class on nav root
- [x] Commit 43bd232 — Task 1 (PwaInstallBanner component)
- [x] Commit 60afc04 — Task 2 (AppLayout wire + safe-area CSS)
- [x] 5/5 usePwaInstall tests pass green
