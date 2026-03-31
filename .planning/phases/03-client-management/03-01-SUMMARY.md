---
phase: 03-client-management
plan: "01"
subsystem: api
tags: [express, drizzle-orm, postgres, zod, jwt, vitest, supertest]

# Dependency graph
requires:
  - phase: 02-auth-users
    provides: JWT auth middleware, requireTenant, tokens table, users table, sendInviteEmail, auth service helpers
  - phase: 01-foundation
    provides: clients table in schema.ts, debtBalances view, PostgreSQL migrations setup
provides:
  - Full clients CRUD router at /api/v1/clients (GET, POST, PATCH, PATCH /deactivate, POST /invite)
  - DB migration 0003 adding client_id column to tokens table
  - Token row stores clientId for portal invite linkage (D-08)
  - accept-invite handler updated to link clients.user_id atomically when role=client
  - Wave 0 test infrastructure for Phase 3 (clients.test.ts + portal.test.ts stubs)
affects:
  - 03-02 (portal router — portal.test.ts stubs ready for implementation)
  - 03-03+ (any plan needing client CRUD endpoints to be operational)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Company-scoped CRUD via req.companyId from JWT (never from req.body)
    - ilike multi-field search (fullName, email, phone) with status filter
    - COALESCE subquery pattern for per-client outstanding balance from debtBalances view
    - clientId stored in token row for portal invite linkage (D-08 pattern)
    - Fire-and-forget sendInviteEmail with .catch(console.error)
    - Token → user linkage transaction: mark token used + insert user + update clients.userId atomically

key-files:
  created:
    - backend/src/routes/clients.ts
    - backend/src/db/migrations/0003_client_invite_token.sql
    - backend/src/__tests__/clients.test.ts
    - backend/src/__tests__/portal.test.ts
  modified:
    - backend/src/db/schema.ts (clientId added to tokens table)
    - backend/src/routes/auth.ts (accept-invite extended for client role)
    - backend/src/app.ts (clientsRouter registered at /api/v1/clients)
    - backend/src/__tests__/auth.test.ts (client role accept-invite test + mockDbTransaction added)

key-decisions:
  - "03-01 (Clients): companyId for all client operations comes exclusively from req.companyId (JWT) — never from req.body — enforcing NFR-01.1 at router level"
  - "03-01 (Clients): client_id column added to tokens table via migration 0003 to enable atomic portal invite accept-invite linkage (D-08)"
  - "03-01 (Clients): PATCH /deactivate returns 204 (no body) — client records are never hard-deleted; preserves all debt/payment history"
  - "03-01 (Clients): portal invite (POST /invite) requires client.email to be set — D-07 enforced at endpoint level with 400 response"

patterns-established:
  - "Clients router: ownership check via SELECT before UPDATE/DEACTIVATE (same pattern as users.ts validateCallerOwner)"
  - "Token-to-client linkage: clientId stored in token at invite time, resolved atomically at accept-invite time"
  - "Wave 0 TDD: test stubs written before implementation; portal.test.ts it.todo stubs provide spec for Plan 03-02"

requirements-completed:
  - FR-03.1
  - FR-03.2
  - FR-03.3
  - FR-02.7
  - NFR-01.1
  - NFR-01.2
  - NFR-01.5
  - FR-11.3

# Metrics
duration: 9min
completed: 2026-03-31
---

# Phase 03 Plan 01: Client Management Backend Summary

**Company-scoped clients CRUD API with portal invite flow: clientId token linkage, atomic accept-invite clients.userId update, and Wave 0 test infrastructure for Phase 3**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-03-31T03:56:01Z
- **Completed:** 2026-03-31T04:05:00Z
- **Tasks:** 3
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- Full clients CRUD router: GET /clients (with search + status filter + outstanding balance), POST /clients, PATCH /clients/:id, PATCH /clients/:id/deactivate, POST /clients/:id/invite — all company-scoped via JWT
- DB migration 0003 adds `client_id UUID REFERENCES clients(id)` to tokens table; schema.ts updated with `clientId` field
- accept-invite handler extended: when `tokenRow.role === 'client' && tokenRow.clientId`, atomically updates `clients.user_id` and embeds `clientId` in issued JWT (D-08)
- Wave 0 test infrastructure: clients.test.ts (8 passing tests), portal.test.ts (4 it.todo stubs for Plan 03-02), auth.test.ts extended (client role accept-invite test passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 test stubs + DB migration + schema update** - `ae4c573` (test)
2. **Task 2: Clients CRUD router** - `8b96235` (feat)
3. **Task 3: Client invite endpoint + accept-invite extension** - `74cd262` (feat)

## Files Created/Modified

- `backend/src/db/migrations/0003_client_invite_token.sql` - ALTER TABLE tokens ADD COLUMN client_id UUID REFERENCES clients(id)
- `backend/src/db/schema.ts` - Added `clientId: uuid('client_id').references(() => clients.id)` to tokens table
- `backend/src/routes/clients.ts` - Full clients CRUD router with all 5 endpoints
- `backend/src/app.ts` - clientsRouter registered at /api/v1/clients with authenticate + requireTenant + requireRole('owner')
- `backend/src/routes/auth.ts` - accept-invite extended with D-08 client.userId linkage + clientId JWT embedding
- `backend/src/__tests__/clients.test.ts` - 8 tests covering all CRUD + invite endpoints (all passing)
- `backend/src/__tests__/portal.test.ts` - 4 it.todo stubs for portal summary/debts endpoints (Plan 03-02)
- `backend/src/__tests__/auth.test.ts` - Added mockDbTransaction + client role accept-invite test (passing)

## Decisions Made

- **Company ID source:** companyId for all client operations comes from `req.companyId` (JWT-set by requireTenant middleware) — never from `req.body`. This enforces NFR-01.1 at router level.
- **Migration 0003:** Added `client_id` column to tokens via `ALTER TABLE` — allows token row to reference the client being invited, enabling the atomic linkage at accept-invite time.
- **PATCH /deactivate returns 204:** No body returned on deactivate — consistent with HTTP semantics; client record is preserved with `isActive=false`.
- **portal.test.ts uses it.todo:** Portal endpoints will be implemented in Plan 03-02; stubs exist to provide spec and prevent accidental route creation without tests.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Worktree node_modules missing:** The git worktree at `.claude/worktrees/agent-ac300bfd/backend/` did not have `node_modules/` installed. Running `npm install` resolved this. All subsequent test runs executed from the worktree directory correctly.

## Known Stubs

- `backend/src/__tests__/portal.test.ts` — 4 `it.todo` stubs for portal endpoints. These are intentional Wave 0 stubs; implementation is deferred to Plan 03-02. The stubs define the spec contract Plan 03-02 must satisfy.

## Next Phase Readiness

- Plan 03-02 (Portal Router) can proceed immediately: portal.test.ts stubs are in place, tokens.clientId is available, clients.userId linkage is operational
- All subsequent Phase 3 plans can use the clients router as a working dependency
- No blockers

## Self-Check: PASSED

- FOUND: backend/src/routes/clients.ts
- FOUND: backend/src/db/migrations/0003_client_invite_token.sql
- FOUND: backend/src/__tests__/clients.test.ts
- FOUND: backend/src/__tests__/portal.test.ts
- FOUND: .planning/phases/03-client-management/03-01-SUMMARY.md
- FOUND commit ae4c573: test(03-01) Wave 0 test stubs + DB migration + schema update
- FOUND commit 8b96235: feat(03-01) clients CRUD router
- FOUND commit 74cd262: feat(03-01) extend accept-invite to link clients.user_id
- All 110 tests passing, 4 todos (portal stubs — expected)

---
*Phase: 03-client-management*
*Completed: 2026-03-31*
