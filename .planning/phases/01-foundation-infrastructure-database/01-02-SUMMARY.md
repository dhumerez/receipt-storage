---
phase: 01-foundation-infrastructure-database
plan: 02
subsystem: infra
tags: [nginx, ssl, letsencrypt, reverse-proxy, docker]

requires: []
provides:
  - "Nginx receipts.conf: standalone server config for receipts subdomain"
  - "HTTP→HTTPS 301 redirect block"
  - "HTTPS block with SSL, client_max_body_size 12m, /api/ and / proxy locations"
  - "Deployment README with certbot steps"
affects:
  - 01-foundation-infrastructure-database
  - deployment

tech-stack:
  added: []
  patterns:
    - "Nginx reverse proxy: /api/ → Express:4000, / → React SPA:4001"
    - "No static /uploads/ location — all file access through authenticated Express endpoint"
    - "X-Forwarded-Proto forwarded so Express req.secure and cookie Secure flag work behind proxy"

key-files:
  created:
    - nginx/receipts.conf
    - nginx/README.md
  modified: []

key-decisions:
  - "No /uploads/ static location block — all file access via authenticated Express endpoint (FR-06.11, prevents SVG XSS)"
  - "client_max_body_size 12m on HTTPS vhost (not inside location) so it applies globally to receipts subdomain"
  - "Placeholder domain receipts.yourdomain.com — must be replaced with actual subdomain before deployment"

patterns-established:
  - "Nginx conf.d isolation: one file per app, never modify existing restaurant.conf"
  - "HTTP block redirects to HTTPS; HTTPS block holds all proxy and upload config"

requirements-completed:
  - NFR-03.4
  - NFR-03.5
  - NFR-03.6
  - FR-06.10

duration: 1min
completed: 2026-03-30
---

# Phase 1 Plan 2: Nginx receipts.conf Summary

**Standalone Nginx vhost config for receipts subdomain: HTTPS with SSL, 12m upload limit, /api/ → Express:4000, / → SPA:4001, no public /uploads/ block**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-30T05:57:05Z
- **Completed:** 2026-03-30T05:57:42Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created `nginx/receipts.conf` as a standalone, drop-in Nginx config for `/etc/nginx/conf.d/` that never touches restaurant.conf
- HTTP server block performs 301 redirect to HTTPS; HTTPS block holds all routing and security config
- All acceptance criteria verified: client_max_body_size 12m, /api/ proxy to 4000, / proxy to 4001, X-Forwarded-Proto, return 301, no /uploads/ static block

## Task Commits

Each task was committed atomically:

1. **Task 1: Write nginx/receipts.conf** - `96e7658` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `nginx/receipts.conf` - Nginx server blocks for receipts subdomain (HTTP redirect + HTTPS with SSL, upload limit, API and SPA proxy)
- `nginx/README.md` - Step-by-step deployment instructions including certbot SSL acquisition

## Decisions Made
- No `/uploads/` static location block — file access goes through authenticated Express endpoint (FR-06.11 / Pitfall 16 SVG XSS prevention)
- `client_max_body_size 12m` placed on the vhost level (not inside location blocks) so it applies to all uploads on this subdomain
- Placeholder domain `receipts.yourdomain.com` used; must be replaced before deployment

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - config created and all acceptance criteria verified successfully.

## User Setup Required

None - no external service configuration required at this stage. Domain replacement and certbot steps are documented in `nginx/README.md` and must be performed during server deployment.

## Next Phase Readiness

- Nginx config is ready to drop into `/etc/nginx/conf.d/` on the Hetzner host once the actual subdomain is known
- Prerequisites for deployment: DNS record pointing subdomain to Hetzner VPS, then certbot run to obtain SSL certificate
- Other Phase 1 plans (Docker Compose, environment config) can proceed in parallel

---
*Phase: 01-foundation-infrastructure-database*
*Completed: 2026-03-30*
