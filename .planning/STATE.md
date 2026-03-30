# Project State

**Last updated:** 2026-03-30
**Current milestone:** 1.0 — Core SaaS MVP
**Current phase:** 01-foundation-infrastructure-database (in progress)
**Current Plan:** 4/5
**Last session stopped at:** Completed 01-foundation-infrastructure-database/01-04-PLAN.md

## Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | In progress | Plan 04/05 complete |
| Phase 2: Auth & Users | Not started | |
| Phase 3: Client Management | Not started | |
| Phase 4: Product Catalog | Not started | |
| Phase 5: Transactions & Files | Not started | |
| Phase 6: Debt & Payments | Not started | |
| Phase 7: Reports & PDF | Not started | |

## Active Decisions

- **01-04 (Middleware):** No asyncHandler anywhere — Express 5 async errors propagate natively to 4-param global error handler
- **01-04 (Middleware):** algorithms: ['HS256'] whitelist in jwt.verify prevents alg:none substitution attack
- **01-04 (Middleware):** server.ts does NOT call migrations — delegated to docker-entrypoint.sh (established Plan 01-01)
- **01-04 (Middleware):** companyId on req set from verified JWT only, never from req.body or req.params (NFR-01.1)


- **01-02 (Nginx):** No /uploads/ static location block — all file access via authenticated Express endpoint (FR-06.11, SVG XSS prevention)
- **01-02 (Nginx):** client_max_body_size 12m on HTTPS vhost level (not inside location blocks) so it applies globally to receipts subdomain
- **01-02 (Nginx):** Placeholder domain receipts.yourdomain.com used; must be replaced with actual subdomain before deployment
- **01-03 (Schema):** drizzle-orm pinned to 0.45.2 — 0.46.x and 1.x beta have breaking changes
- **01-03 (Schema):** All money columns use NUMERIC(12,2) — no FLOAT, no INTEGER cents — immutable after initial migration
- **01-03 (Schema):** debt_balances view computes balance from confirmed payments only — pending payments don't reduce displayed balance
- **01-03 (Schema):** audit_logs immutability enforced at DB level with REVOKE UPDATE, DELETE (FR-11.2) — application layer alone is insufficient

## Blockers

None.

## Notes

- Hetzner VPS already running Restaurant app; new Docker stack must use ports 4000/4001
- Resend requires domain verification (SPF/DKIM) before email invitations work — do this in Phase 2
- libvips with HEIC support must be installed in Docker image (Phase 5) — `apt-get install libvips-dev libheif-dev`
