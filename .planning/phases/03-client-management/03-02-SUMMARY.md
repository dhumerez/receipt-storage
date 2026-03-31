---
phase: 03-client-management
plan: "02"
subsystem: backend
tags: [portal, clients, api, jwt-scoped, security, drizzle]
dependency_graph:
  requires: [03-01]
  provides: [portal-api, clients-api, router-mounts]
  affects: [auth-flow, app-routing]
tech_stack:
  added: []
  patterns:
    - JWT-scoped portal routes (clientId from token, never from request)
    - debtBalances view for confirmed-only balance calculations
    - innerJoin payments + debts for pending balance calculation
    - Explicit column SELECT (never SELECT * on transactions to prevent internalNotes leak)
key_files:
  created:
    - backend/src/routes/portal.ts
    - backend/src/routes/clients.ts
    - backend/src/__tests__/portal.test.ts
    - backend/src/__tests__/clients.test.ts
    - backend/src/db/migrations/0003_client_invite_token.sql
  modified:
    - backend/src/app.ts
    - backend/src/db/schema.ts
    - backend/src/routes/auth.ts
    - backend/src/__tests__/auth.test.ts
decisions:
  - Portal mount uses no requireTenant — portal is clientId-scoped from JWT (RESEARCH.md Pitfall 4)
  - GET /api/v1/clients allows owner+collaborator+viewer roles (not just owner)
  - Portal 403 guard when JWT.clientId is undefined (malformed token from non-invite path)
  - internalNotes protection via no transactions table join (not via column exclusion)
  - accept-invite for client role embeds clientId in JWT immediately (consistent with login handler)
metrics:
  duration: "5 minutes"
  completed: "2026-03-31"
  tasks_completed: 2
  files_created: 5
  files_modified: 4
---

# Phase 3 Plan 02: Portal API Router + Clients Router Summary

**One-liner:** Client portal (JWT-scoped balance/debts) and full clients CRUD API with portal invite flow, mounted in Express app.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Portal API router (GET /summary + GET /debts) | aaefb11 | portal.ts, portal.test.ts |
| 2 | Client detail debts endpoint + mount all routers in app.ts | 45fea45 | clients.ts, app.ts |

**Prerequisite deviation commits:**
| Task | Name | Commit | Files |
|------|------|--------|-------|
| prereq-a | 03-01 migration + schema + test infrastructure | 5419b06 | 0003_client_invite_token.sql, schema.ts, clients.test.ts, portal.test.ts, auth.test.ts |
| prereq-b | 03-01 clients CRUD router + auth accept-invite extension | b36c7c6 | clients.ts, auth.ts |

## What Was Built

### Portal Router (`backend/src/routes/portal.ts`)

Two endpoints mounted at `/api/v1/portal` (client role only, no requireTenant):

**GET /api/v1/portal/summary**
- `confirmedBalance`: SUM of `debtBalances.remainingBalance` scoped to `clientId` and `companyId` from JWT
- `pendingBalance`: SUM of `payments.amount` WHERE `status='pending_approval'` joined to `debts` by clientId/companyId
- `asOf`: ISO timestamp for UI display
- Returns 403 when JWT has no `clientId` (malformed token guard)

**GET /api/v1/portal/debts**
- Returns debt list from `debtBalances` view with explicit column SELECT
- No transactions table join — internalNotes cannot be included by accident
- Ordered by status

Both handlers use `const clientId = req.user!.clientId` — the companyId from JWT immutably scopes every query.

### Clients Router (`backend/src/routes/clients.ts`)

Full CRUD at `/api/v1/clients` (owner/collaborator/viewer, with requireTenant):

- `GET /`: list with search (ilike on name/email/phone) + status filter + outstanding balance subquery
- `POST /`: create with Zod validation, companyId from JWT only
- `PATCH /:id`: update with pre-update ownership check (404 cross-company)
- `PATCH /:id/deactivate`: soft delete, 204 response
- `POST /:id/invite`: portal invite with clientId in token row (D-08)
- `GET /:id/debts`: owner-side debt detail with client info + outstanding balance

### auth.ts Extension (D-08)

`POST /api/auth/accept-invite` now:
1. When `tokenRow.role === 'client' && tokenRow.clientId`: updates `clients.user_id = newUser.id` inside the existing transaction
2. Issues JWT with `clientId` embedded for client role (same as login handler)

### app.ts Mounts

```typescript
app.use('/api/v1/clients', authenticate, requireTenant, requireRole('owner', 'collaborator', 'viewer'), clientsRouter);
app.use('/api/v1/portal', authenticate, requireRole('client'), portalRouter);
```

Portal mount deliberately excludes `requireTenant` — portal is clientId-scoped, not companyId-scoped.

## Decisions Made

1. **Portal uses no requireTenant** — portal is clientId-scoped from JWT (RESEARCH.md Pitfall 4). The companyId from the JWT is still used in all queries for double-scoping, but the tenant middleware (which reads `req.companyId` from the tenant MW) is not used.

2. **clients route allows owner+collaborator+viewer** — CONTEXT.md specifies all non-client roles can read client data; collaborators may create transactions referencing clients.

3. **Portal 403 when clientId absent** — a JWT with role='client' but no clientId indicates a non-invite login path that hasn't completed the accept-invite flow. 403 rather than 500 for clarity.

4. **internalNotes exclusion via no join** — safer than column exclusion because it makes the guard structural (can't accidentally add the column later). Explicit SELECT on debtBalances view columns only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 03-01 not yet executed**

- **Found during:** Pre-execution file check
- **Issue:** Plan 03-02 depends on 03-01 output (clients.ts, portal.test.ts stubs, migration, schema clientId field). None of 03-01's artifacts existed.
- **Fix:** Executed all 03-01 tasks inline as prerequisite:
  - Created `0003_client_invite_token.sql` migration
  - Updated `schema.ts` tokens table with `clientId` field
  - Created `clients.test.ts` with full test suite (not just stubs)
  - Created `portal.test.ts` with full test suite (not just stubs — implemented during 03-02 Task 1)
  - Extended `auth.test.ts` with accept-invite client role stub
  - Created full `clients.ts` CRUD router including invite + debts endpoints
  - Extended `auth.ts` accept-invite handler for D-08 client linkage
- **Files modified:** All files listed in 03-01 `files_modified`
- **Commits:** 5419b06, b36c7c6

## Known Stubs

None — all plan goals achieved. All endpoints are wired to actual DB queries (with mocked DB in tests). No placeholder values in responses.

## Verification

```
grep -n "requireTenant" backend/src/app.ts
# Portal mount line (43) does NOT contain requireTenant — PASS

grep -n "internalNotes" backend/src/routes/portal.ts
# Only appears in comments — PASS

grep -n "clientId.*req\." backend/src/routes/portal.ts
# Shows req.user!.clientId (not req.params or req.query) — PASS

npm test -- full suite: 128 passed, 0 failed — PASS
```

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| backend/src/routes/portal.ts | FOUND |
| backend/src/routes/clients.ts | FOUND |
| backend/src/__tests__/portal.test.ts | FOUND |
| backend/src/__tests__/clients.test.ts | FOUND |
| backend/src/db/migrations/0003_client_invite_token.sql | FOUND |
| Commit 5419b06 (prereq migration+schema+tests) | FOUND |
| Commit b36c7c6 (prereq clients router+auth) | FOUND |
| Commit aaefb11 (portal router) | FOUND |
| Commit 45fea45 (app.ts mounts) | FOUND |
| npm test 128/128 passing | PASS |
