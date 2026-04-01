---
phase: 06-debt-payment-tracking
plan: 01
subsystem: api
tags: [debts, payments, approval-workflow, select-for-update, overpayment-prevention, audit-log, portal]

# Dependency graph
requires:
  - phase: 05-transactions-file-uploads
    provides: transactions CRUD, upload pipeline, notification system
provides:
  - Debt lifecycle API (GET detail, write-off, reopen)
  - Payment CRUD with role-based status (owner=confirmed, collaborator=pending_approval)
  - Payment approval/rejection with SELECT FOR UPDATE concurrent safety
  - Overpayment prevention with cents arithmetic
  - Portal debt detail endpoint
  - Notification query support for payment entity type
affects: [06-02-frontend-debt-detail, 06-03-payment-recording-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [SELECT-FOR-UPDATE for concurrent payment approval, FILTER-WHERE for conditional SQL aggregation, cents arithmetic for money safety]

key-files:
  created:
    - backend/src/routes/debts.ts
    - backend/src/__tests__/debts.test.ts
  modified:
    - backend/src/app.ts
    - backend/src/routes/portal.ts
    - backend/src/routes/notifications.ts

key-decisions:
  - "uploadMiddleware reused as-is from middleware/upload.ts (already configured as .array('files', 5))"
  - "Overpayment check uses FILTER (WHERE status != 'rejected') to include pending payments in limit calculation"
  - "Approval re-validates overpayment using FILTER (WHERE status = 'confirmed') for confirmed-only check"
  - "Portal debt detail joins transactions only for referenceNumber (explicit column select), never for internalNotes"
  - "Notifications query uses COALESCE on clientId and createdBy/recordedBy to handle both transaction and payment entities"

patterns-established:
  - "SELECT FOR UPDATE pattern for concurrent payment approval safety"
  - "Role-based payment status assignment (owner=confirmed, collaborator=pending_approval)"
  - "Debt status auto-transition after confirmed payment (open -> partially_paid -> fully_paid)"

requirements-completed: [FR-07.1, FR-07.2, FR-07.3, FR-07.4, FR-07.5, FR-07.6, FR-08.1, FR-08.2, FR-08.3, FR-08.4, FR-08.5, FR-08.6, FR-08.7, FR-09.3, FR-11.1]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 6 Plan 01: Debt & Payment Backend API Summary

**Complete debt lifecycle API with payment recording, role-based approval workflow, overpayment prevention via cents arithmetic, and SELECT FOR UPDATE concurrent safety**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-01T00:50:43Z
- **Completed:** 2026-04-01T00:56:02Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

### Task 1: Debts router with all endpoints + app mount + portal + notifications
- Created `backend/src/routes/debts.ts` with 6 endpoints:
  - **GET /:id** - Debt detail with payments, documents, computed balance from debtBalances view
  - **POST /:debtId/payments** - Payment recording with role-based status, overpayment prevention, file upload support
  - **POST /:debtId/payments/:paymentId/approve** - Owner approval with SELECT FOR UPDATE and overpayment re-validation
  - **POST /:debtId/payments/:paymentId/reject** - Owner rejection with reason and notification
  - **POST /:id/write-off** - Debt write-off with reason and audit log
  - **POST /:id/reopen** - Reopen written-off debt with status recomputation
- Mounted `debtsRouter` in app.ts with authenticate + requireTenant + requireRole
- Extended portal.ts with GET /debts/:id (no internalNotes, no transaction docs)
- Updated notifications.ts to LEFT JOIN payments + debts for payment entity notifications

### Task 2: Test stubs for debt and payment routes
- Created `backend/src/__tests__/debts.test.ts` with 30 test cases (14 passing, 16 todo)
- Auth guard tests (401/403) for all endpoints
- Body validation tests for reject and write-off
- Money helpers tests including 10x$10=$100 sum test
- Portal debt detail auth tests
- Full backend test suite passes (172 tests, 0 failures)

## Verification

- `tsc --noEmit` exits 0 (no type errors)
- `vitest run src/__tests__/debts.test.ts` passes (14 pass, 16 todo)
- `vitest run` full suite passes (172 tests across 11 files, 0 failures)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] uploadMiddleware is pre-configured as .array('files', 5)**
- **Found during:** Task 1
- **Issue:** Plan specified `uploadMiddleware.array('files', 5)` but the export from middleware/upload.ts is already the result of `multer(...).array('files', 5)` -- calling `.array()` again would fail
- **Fix:** Used `uploadMiddleware` directly as route middleware, matching the pattern in transactions.ts
- **Files modified:** backend/src/routes/debts.ts

**2. [Rule 1 - Bug] Express params typed as string | string[]**
- **Found during:** Task 1 (tsc check)
- **Issue:** `req.params.debtId` typed as `string | string[]` in Express 5, causing Drizzle eq() type errors
- **Fix:** Added explicit `as string` casts for route params (debtId, paymentId)
- **Files modified:** backend/src/routes/debts.ts

## Known Stubs

None -- all endpoints are fully implemented with working business logic.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c06cf78 | feat(06-01): create debts router with payment CRUD, approval, write-off/reopen endpoints |
| 2 | 06e71d2 | test(06-01): add test stubs for debt and payment API routes |

## Self-Check: PASSED
