---
phase: 8
slug: make-the-receipts-storage-project-pwa-ready-for-mobile-in-io
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + @playwright/test 1.59.1 |
| **Config file** | `frontend/vite.config.ts` (vitest embedded) |
| **Quick run command** | `cd frontend && npm test` |
| **Full suite command** | `cd frontend && npm test -- --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm test`
- **After every plan wave:** Run `cd frontend && npm test -- --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green + manual PWA checks on real iOS/Android
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | PWA-05 | — | apple meta tags present in HTML | unit | `cd frontend && npm test` | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 1 | PWA-10 | — | display-mode standalone detected | unit | `cd frontend && npm test` | ❌ W0 | ⬜ pending |
| 8-02-01 | 02 | 1 | PWA-01 | — | manifest valid and installable | Manual | Chrome DevTools Application tab | — | ⬜ pending |
| 8-02-02 | 02 | 1 | PWA-02 | — | service worker registers | Manual | chrome://serviceworker-internals | — | ⬜ pending |
| 8-02-03 | 02 | 2 | PWA-03 | — | static assets precached offline | Manual | Network tab offline mode | — | ⬜ pending |
| 8-02-04 | 02 | 2 | PWA-04 | T-8-01 | API routes never cached (NetworkOnly) | Manual | SW intercept log | — | ⬜ pending |
| 8-03-01 | 03 | 1 | PWA-07 | — | sw.js served with no-store | Manual | `curl -I /sw.js` | — | ⬜ pending |
| 8-03-02 | 03 | 1 | PWA-08 | — | manifest served with no-store | Manual | `curl -I /manifest.webmanifest` | — | ⬜ pending |
| 8-04-01 | 04 | 1 | PWA-06 | — | Android install prompt fires | Manual | Android Chrome USB debug | — | ⬜ pending |
| 8-04-02 | 04 | 1 | PWA-09 | T-8-02 | login works in standalone mode (iOS) | Manual | iOS Add to Home Screen | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/hooks/__tests__/usePwaInstall.test.ts` — unit test for PWA-10 (display-mode detection)
- [ ] `frontend/src/components/__tests__/pwa-meta.test.ts` — DOM test for PWA-05 (iOS apple meta tags)

*Existing Vitest and Playwright infrastructure covers all other automated requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App manifest valid and installable | PWA-01 | Lighthouse PWA category deprecated | Chrome DevTools → Application → Manifest tab |
| Service worker registers and controls page | PWA-02 | Requires live SW runtime | chrome://serviceworker-internals |
| Static assets load offline | PWA-03 | Requires SW + Network simulation | DevTools → Network → check Offline → reload |
| API routes not cached (NetworkOnly) | PWA-04 | Requires SW intercept log | SW intercept log — `/api/` must show network-only |
| Android install prompt fires | PWA-06 | Requires real device or USB debug | Android Chrome USB debug + DevTools beforeinstallprompt |
| sw.js headers correct | PWA-07 | Requires deployed Nginx | `curl -I https://receipts.domain.com/sw.js` |
| manifest.webmanifest headers correct | PWA-08 | Requires deployed Nginx | `curl -I https://receipts.domain.com/manifest.webmanifest` |
| Login works in iOS PWA standalone mode | PWA-09 | Requires real iOS device | iOS Safari: Add to Home Screen → open → log in |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
