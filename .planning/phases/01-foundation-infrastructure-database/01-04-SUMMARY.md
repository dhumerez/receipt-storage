---
phase: 01-foundation-infrastructure-database
plan: 04
subsystem: api
tags: [express, jwt, middleware, rbac, vitest, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure-database/01-03
    provides: Drizzle schema with userRoleEnum values (owner, collaborator, viewer, client)

provides:
  - Express 5 app with helmet, CORS, body parsers, trust proxy, 4-param error handler
  - JWT authenticate middleware with HS256-only algorithm whitelist (prevents alg:none attack)
  - requireTenant middleware: companyId sourced from JWT only (NFR-01.1)
  - requireRole factory with isSuperAdmin bypass
  - GET /health endpoint returning 200 { status: ok, timestamp }
  - Express Request type augmentation (req.user, req.companyId)
  - 9 passing vitest unit tests for all three middleware

affects:
  - All subsequent phases that add routes to app.ts
  - Phase 2 (auth routes will use authenticate middleware)
  - Phase 3+ (all protected routes use requireTenant and requireRole)

# Tech tracking
tech-stack:
  added: [vitest@3, jsonwebtoken@9, helmet@8, cors@2, express@5]
  patterns:
    - Express 5 async error propagation (no asyncHandler wrapper)
    - res.status(N).json(body) ordering (not res.json(body, status))
    - 4-parameter error handler for Express 5 global error catching
    - JWT algorithm whitelist (algorithms: ['HS256']) to prevent alg:none attack
    - companyId sourced exclusively from verified JWT (NFR-01.1)
    - requireRole factory pattern for route-level RBAC

key-files:
  created:
    - backend/src/app.ts
    - backend/src/server.ts
    - backend/src/routes/health.ts
    - backend/src/middleware/auth.ts
    - backend/src/middleware/tenant.ts
    - backend/src/middleware/rbac.ts
    - backend/src/types/express.d.ts
    - backend/src/__tests__/middleware.test.ts
    - backend/vitest.config.ts
  modified: []

key-decisions:
  - "No asyncHandler — Express 5 propagates async errors to global error handler natively"
  - "algorithms: ['HS256'] whitelist in jwt.verify prevents alg:none attack (PITFALLS.md)"
  - "server.ts does NOT call migrate — migrations run via docker-entrypoint.sh (Plan 01-01)"
  - "companyId set on req only from verified JWT, never from req.body or req.params (NFR-01.1)"

patterns-established:
  - "Pattern: Express 5 error handling — throw inside async route handler, caught by 4-param error handler"
  - "Pattern: Middleware chain — authenticate -> requireTenant -> requireRole('...') -> handler"
  - "Pattern: JWT algorithms whitelist — always specify ['HS256'] in jwt.verify options"
  - "Pattern: isSuperAdmin bypass — checked before role check in requireRole"

requirements-completed: [FR-01.3, FR-02.1, FR-02.2, FR-02.3, FR-02.4, FR-02.5, FR-02.6, NFR-01.1, NFR-01.2]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 01 Plan 04: Express 5 App Skeleton Summary

**Express 5 app with JWT HS256 middleware, RBAC with isSuperAdmin bypass, and /health route — all middleware unit-tested with vitest (9/9 passing)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T14:49:08Z
- **Completed:** 2026-03-30T14:53:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- JWT authenticate middleware with HS256-only algorithm whitelist preventing alg:none attacks
- requireTenant middleware enforcing companyId from verified JWT only (NFR-01.1 compliance)
- requireRole factory with isSuperAdmin superuser bypass for all role checks
- Express 5 app.ts with helmet security headers, CORS, trust proxy, and 4-param error handler
- GET /health endpoint ready for Docker healthcheck and Nginx upstreams
- 9 vitest unit tests passing; test infrastructure set up from scratch (npm install needed)

## Task Commits

1. **Task 1: Auth, tenant, RBAC middleware with tests** - `70c6a6e` (feat)
2. **Task 2: app.ts, server.ts, and health route** - `3b3da76` (feat)

**Plan metadata:** (final docs commit — see below)

_Note: Task 1 used TDD (RED → GREEN), with npm install as auto-fix before RED phase_

## Files Created/Modified

- `backend/src/middleware/auth.ts` - JWT authenticate middleware, JWTPayload interface
- `backend/src/middleware/tenant.ts` - requireTenant sets req.companyId from JWT only
- `backend/src/middleware/rbac.ts` - requireRole factory, isSuperAdmin bypass
- `backend/src/types/express.d.ts` - Express Request augmentation (req.user, req.companyId)
- `backend/src/__tests__/middleware.test.ts` - 9 unit tests for all three middleware
- `backend/vitest.config.ts` - vitest config (globals: true, environment: node)
- `backend/src/app.ts` - Express 5 app with full middleware stack and error handler
- `backend/src/server.ts` - Server entry point, no migration calls
- `backend/src/routes/health.ts` - GET /health returning 200 { status: ok, timestamp }

## Decisions Made

- No asyncHandler anywhere — Express 5 async error propagation used throughout
- algorithms: ['HS256'] whitelist in jwt.verify prevents alg:none algorithm substitution attack
- server.ts delegates migrations to docker-entrypoint.sh (established in Plan 01-01)
- companyId sourced exclusively from verified JWT (NFR-01.1) — never from req.body or req.params

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing node_modules before RED test phase**
- **Found during:** Task 1 (TDD RED phase setup)
- **Issue:** backend/node_modules was absent — `npm test` failed with "vitest not found"
- **Fix:** Ran `npm install` in backend directory
- **Files modified:** backend/node_modules (not committed — gitignored)
- **Verification:** npm test ran successfully after install
- **Committed in:** N/A (npm install output not committed)

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** npm install required for test infrastructure — expected in a fresh worktree. No scope creep.

## Issues Encountered

- `asyncHandler` and `migrate` appear in comment strings in app.ts and server.ts respectively. These are documentation comments explicitly explaining that these patterns are NOT used. The acceptance criteria checks (`grep "asyncHandler" backend/src/app.ts`) return these comment lines — but the spirit of the criteria (no actual usage) is satisfied.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Express 5 app skeleton is ready for route additions in Phase 2 (Auth & Users)
- Middleware chain pattern established: authenticate -> requireTenant -> requireRole('...') -> handler
- All subsequent route handlers can be added to app.ts using app.use('/api/v1', ...)
- No blockers for Phase 2
