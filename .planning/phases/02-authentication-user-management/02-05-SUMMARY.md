---
phase: 02-authentication-user-management
plan: "05"
subsystem: backend/user-management
tags: [express, drizzle, rbac, owner-only, invite, deactivation, nfr-01.5]
dependency_graph:
  requires:
    - 02-01  # auth service (generateRawToken, hashToken), tokens schema
    - 02-03  # requireRole, requireTenant middleware
  provides:
    - usersRouter at /api/v1/users (owner-only)
    - email.service.ts (sendInviteEmail, sendPasswordResetEmail stubs for 02-04)
  affects:
    - 02-04  # email.service.ts stub created here; 02-04 will fill in real Resend impl
    - 03-xx  # future plans can reuse requireRole('owner') pattern
tech_stack:
  added:
    - resend@6.9.4 (email service dependency)
  patterns:
    - NFR-01.5 DB re-validation pattern (validateCallerOwner) — re-fetches caller from DB before sensitive ops
    - FR-02.9 deactivation atomicity — single db.transaction wrapping user + transactions + payments updates
    - Fire-and-forget email with .catch(console.error) to avoid timing leaks
key_files:
  created:
    - backend/src/routes/users.ts
    - backend/src/services/email.service.ts
  modified:
    - backend/src/app.ts
    - backend/src/__tests__/users.test.ts
    - backend/package.json
decisions:
  - validateCallerOwner fetches role + isActive + companyId from DB — all three required to prevent stale JWT privilege escalation (NFR-01.5)
  - PATCH /:id/deactivate checks target company membership before entering transaction to fail fast without holding a transaction open
  - email.service.ts created as full implementation (not minimal stub) since the code was specified in plan 02-04 and resend was needed for package.json anyway
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_changed: 5
---

# Phase 2 Plan 5: User Management Endpoints Summary

Owner-only user management REST API with 4 endpoints: list team, invite members, change roles, and deactivate users with automatic pending-work rejection.

## Tasks Completed

### Task 1: GET /api/v1/users + POST /api/v1/users/invite

**TDD RED:** Wrote 26 failing tests covering all 4 endpoints before any implementation.

**TDD GREEN:** Implemented `backend/src/routes/users.ts` with:
- `GET /` — company-scoped user list, selects only id/email/fullName/role/isActive/createdAt (no passwordHash)
- `POST /invite` — validates role enum (owner/collaborator/viewer; client rejected), inserts token row with 48h expiry, fires invite email
- `validateCallerOwner()` helper for NFR-01.5 DB re-validation
- Mounted in `app.ts` with `authenticate + requireTenant + requireRole('owner')`

### Task 2: PATCH /:id/role + PATCH /:id/deactivate

Appended to `users.ts`:
- `PATCH /:id/role` — validates role enum, prevents self-role-change (400), NFR-01.5 check, cross-company returns 404
- `PATCH /:id/deactivate` — prevents self-deactivation (400), NFR-01.5 check, wraps in `db.transaction` that deactivates user + reverts pending_approval transactions to draft + rejects pending_approval payments with reason 'User removed from company' (FR-02.9)
- Returns counts: `{ message, pendingTransactionsReverted, pendingPaymentsRejected }`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] email.service.ts did not exist (plan 02-04 not yet executed)**
- **Found during:** Task 1 implementation — `import { sendInviteEmail }` in users.ts would fail to compile
- **Fix:** Created `backend/src/services/email.service.ts` with full implementation matching the 02-04 plan spec (sendInviteEmail + sendPasswordResetEmail). Also added `resend@6.9.4` dependency and ran `npm install`.
- **Files modified:** `backend/src/services/email.service.ts`, `backend/package.json`, `backend/package-lock.json`
- **Note:** Plan 02-04 should validate that its email service matches this stub; if it differs, it should overwrite this file.

**2. [Rule 3 - Blocking] Backend node_modules not installed in worktree**
- **Found during:** First test run — vitest not found
- **Fix:** Ran `npm install` in backend directory
- **No file changes** (node_modules not tracked)

**3. Pre-existing TypeScript error in query-helpers.ts (out of scope)**
- `src/db/query-helpers.ts:25` — pre-existing TS2345 error from plan 01-03 commit `ab9c16c`
- Out of scope per deviation rules (not caused by this plan's changes)
- Logged to deferred items

## Known Stubs

None — all endpoints are fully wired to the database. Email sending is fire-and-forget with real implementation (mocked only in tests).

## Verification Results

- `npx vitest run --reporter=verbose` — 85/85 tests pass (6 test files)
- `npx tsc --noEmit` — 0 errors in new/modified files (pre-existing error in query-helpers.ts is out of scope)
- `GET /api/v1/users` scoped to companyId from JWT via requireTenant
- `POST /api/v1/users/invite` rejects client role (400), NFR-01.5 re-validates from DB
- `PATCH /:id/role` and `PATCH /:id/deactivate` — cross-company returns 404, self-modification returns 400
- `PATCH /:id/deactivate` wraps user + transactions + payments in single DB transaction (FR-02.9)

## Self-Check: PASSED

- `backend/src/routes/users.ts` — FOUND
- `backend/src/services/email.service.ts` — FOUND
- `backend/src/app.ts` — FOUND (modified)
- `backend/src/__tests__/users.test.ts` — FOUND (modified)
- Commit `fbe1897` (test RED) — FOUND
- Commit `d4f9557` (feat GREEN) — FOUND
