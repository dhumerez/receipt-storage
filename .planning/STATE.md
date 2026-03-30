# Project State

**Last updated:** 2026-03-30
**Current milestone:** 1.0 — Core SaaS MVP
**Current phase:** 01-foundation-infrastructure-database (in progress)
**Last session stopped at:** Completed 01-foundation-infrastructure-database/01-05-PLAN.md

## Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | In progress | Plan 05/05 complete |
| Phase 2: Auth & Users | Not started | |
| Phase 3: Client Management | Not started | |
| Phase 4: Product Catalog | Not started | |
| Phase 5: Transactions & Files | Not started | |
| Phase 6: Debt & Payments | Not started | |
| Phase 7: Reports & PDF | Not started | |

## Active Decisions

- **01-02 (Nginx):** No /uploads/ static location block — all file access via authenticated Express endpoint (FR-06.11, SVG XSS prevention)
- **01-02 (Nginx):** client_max_body_size 12m on HTTPS vhost level (not inside location blocks) so it applies globally to receipts subdomain
- **01-02 (Nginx):** Placeholder domain receipts.yourdomain.com used; must be replaced with actual subdomain before deployment
- **01-03 (Schema):** drizzle-orm pinned to 0.45.2 — 0.46.x and 1.x beta have breaking changes
- **01-03 (Schema):** All money columns use NUMERIC(12,2) — no FLOAT, no INTEGER cents — immutable after initial migration
- **01-03 (Schema):** debt_balances view computes balance from confirmed payments only — pending payments don't reduce displayed balance
- **01-03 (Schema):** audit_logs immutability enforced at DB level with REVOKE UPDATE, DELETE (FR-11.2) — application layer alone is insufficient
- **01-05 (Frontend):** React Router v7 imports from 'react-router' (not 'react-router-dom') — v7 unified the package; standardized across all files
- **01-05 (Frontend):** Tailwind v4: no tailwind.config.js, no postcss — CSS entry is @import 'tailwindcss' via @tailwindcss/vite plugin
- **01-05 (Frontend):** Provider order: QueryClientProvider > BrowserRouter > App — query cache is outermost for availability across all route-aware components
- **01-05 (Frontend):** apiClient uses credentials:include for httpOnly cookie auth to be established in Phase 2

## Blockers

None.

## Notes

- Hetzner VPS already running Restaurant app; new Docker stack must use ports 4000/4001
- Resend requires domain verification (SPF/DKIM) before email invitations work — do this in Phase 2
- libvips with HEIC support must be installed in Docker image (Phase 5) — `apt-get install libvips-dev libheif-dev`
