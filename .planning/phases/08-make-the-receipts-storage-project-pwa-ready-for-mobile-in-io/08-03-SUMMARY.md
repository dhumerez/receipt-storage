---
phase: 08-make-the-receipts-storage-project-pwa-ready-for-mobile-in-io
plan: "03"
subsystem: infrastructure/nginx
tags: [pwa, nginx, cache-control, service-worker, manifest]
dependency_graph:
  requires: []
  provides: [nginx-sw-no-cache, nginx-manifest-no-cache]
  affects: [pwa-update-flow, manifest-freshness]
tech_stack:
  added: []
  patterns: [nginx-exact-match-location, cache-control-no-store]
key_files:
  created: []
  modified:
    - nginx/receipts.conf
decisions:
  - "Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0 with always flag on sw.js — prevents browser and proxy caching; always flag ensures header is set even on 502/304 responses"
  - "Cache-Control: no-store, no-cache, must-revalidate, max-age=0 with always flag on manifest.webmanifest — no proxy-revalidate needed for manifest but otherwise same strictness"
  - "expires off on both blocks — removes Expires header to prevent any cache inference from it"
  - "Exact-match location = blocks placed after /api/ and before catch-all / — explicit ordering avoids any ambiguity, though Nginx exact-match takes precedence regardless"
metrics:
  duration: "5 minutes"
  completed: "2026-04-13"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
requirements:
  - PWA-07
  - PWA-08
---

# Phase 08 Plan 03: Nginx PWA Cache-Control Headers Summary

**One-liner:** Nginx location blocks for `/sw.js` and `/manifest.webmanifest` with `Cache-Control: no-store` ensure service worker updates reach users on every deployment and the browser always fetches the current manifest.

## What Was Built

Added two exact-match `location =` blocks to `nginx/receipts.conf` inside the HTTPS server block, positioned between the `/api/` proxy block and the catch-all `location /` block:

1. `location = /sw.js` — proxies to port 4001, adds `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0` with the `always` flag, and `expires off`
2. `location = /manifest.webmanifest` — proxies to port 4001, adds `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` with `always` flag, and `expires off`

All existing Nginx directives (SSL config, `client_max_body_size 12m`, `/api/` proxy to port 4000, catch-all `/` proxy to port 4001) are preserved unchanged.

## Verification

All acceptance criteria confirmed passing:

| Check | Result |
|-------|--------|
| `location = /sw.js` present | Line 44 |
| `location = /manifest.webmanifest` present | Line 56 |
| `no-store` in add_header directives | Lines 49, 61 |
| `expires off` | Lines 50, 62 (2 matches) |
| `always` flag on add_header | Lines 49, 61 (2 matches) |
| `proxy_pass.*4001` | Lines 45, 57, 68 (3 matches: sw.js, manifest, catch-all) |
| `location /api/` preserved | Line 30 |
| `client_max_body_size 12m` preserved | Line 27 |
| `ssl_certificate` preserved | Lines 21-22 |
| Block ordering: /api/ → /sw.js → /manifest → / | Correct |

## Decisions Made

1. **`always` flag on `add_header`:** Without `always`, Nginx only adds the header on 2xx/3xx responses. With it, the header is set on all responses including 502 (upstream down), 304 (not modified), etc. For `sw.js`, this ensures the browser never incorrectly caches a 304 response to bypass the byte-diff check.

2. **`expires off`:** Removes any `Expires` header that could be inherited from a parent block or Nginx defaults. Belt-and-suspenders with `no-store` — some proxies honor `Expires` independently of `Cache-Control`.

3. **`proxy-revalidate` on sw.js but not manifest:** The plan includes `proxy-revalidate` for sw.js (tells intermediate proxies to re-validate on every request, not just serve their cached copy) but omits it for the manifest. This is intentional — sw.js has the strictest no-cache requirement; manifest is slightly less critical.

4. **Exact-match `=` operator:** Ensures only the exact path `/sw.js` is matched, not any path containing sw.js. Prevents any accidental interference with other routes.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Add Cache-Control no-store location blocks | `74c20dc` | feat(08-03): add Cache-Control no-store location blocks for sw.js and manifest.webmanifest |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints or trust boundaries introduced. The two new location blocks route to the same upstream (port 4001) already used by the catch-all `location /` block. Security posture is improved: T-8-08 (cached sw.js) and T-8-09 (stale manifest) from the threat register are now mitigated.

## Self-Check

**Files exist:**
- `nginx/receipts.conf` — FOUND (modified with 2 new location blocks)
- `.planning/phases/08-make-the-receipts-storage-project-pwa-ready-for-mobile-in-io/08-03-SUMMARY.md` — FOUND (this file)

**Commits exist:**
- `74c20dc` — FOUND (feat(08-03): add Cache-Control no-store location blocks for sw.js and manifest.webmanifest)

## Self-Check: PASSED
