# Project State

**Last updated:** 2026-03-30
**Current milestone:** 1.0 — Core SaaS MVP
**Current phase:** Phase 1 — Plan 2 of 5

## Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | In Progress | Plan 01 complete |
| Phase 2: Auth & Users | Not started | |
| Phase 3: Client Management | Not started | |
| Phase 4: Product Catalog | Not started | |
| Phase 5: Transactions & Files | Not started | |
| Phase 6: Debt & Payments | Not started | |
| Phase 7: Reports & PDF | Not started | |

## Active Decisions

- receipts-db has no host port — accessible only via Docker service name receipts-db:5432
- PostgreSQL uses named volume (not bind mount) to avoid UID 999 permission failure on Linux
- Uploads use bind mount to /var/receipts/uploads so Nginx on host can read files at same path
- docker-entrypoint.sh uses exec node so the process receives OS signals correctly
- Migrations run in entrypoint before server start — not inside server.ts — for clean separation

## Blockers

None.

## Notes

- Hetzner VPS already running Restaurant app; new Docker stack must use ports 4000/4001
- Resend requires domain verification (SPF/DKIM) before email invitations work — do this in Phase 2
- libvips with HEIC support must be installed in Docker image (Phase 5) — `apt-get install libvips-dev libheif-dev`

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-foundation-infrastructure-database | 01 | 2min | 2 | 6 |

## Last Session

- **Stopped at:** Completed 01-01-PLAN.md
- **Timestamp:** 2026-03-30T05:58:00Z
