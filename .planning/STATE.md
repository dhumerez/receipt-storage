# Project State

**Last updated:** 2026-03-29
**Current milestone:** 1.0 — Core SaaS MVP
**Current phase:** None started — run `/gsd:plan-phase 1` to begin

## Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | Not started | |
| Phase 2: Auth & Users | Not started | |
| Phase 3: Client Management | Not started | |
| Phase 4: Product Catalog | Not started | |
| Phase 5: Transactions & Files | Not started | |
| Phase 6: Debt & Payments | Not started | |
| Phase 7: Reports & PDF | Not started | |

## Active Decisions

None yet — decisions will be logged here as phases execute.

## Blockers

None.

## Notes

- Hetzner VPS already running Restaurant app; new Docker stack must use ports 4000/4001
- Resend requires domain verification (SPF/DKIM) before email invitations work — do this in Phase 2
- libvips with HEIC support must be installed in Docker image (Phase 5) — `apt-get install libvips-dev libheif-dev`
