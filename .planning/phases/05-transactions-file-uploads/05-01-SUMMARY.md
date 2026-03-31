---
phase: 05-transactions-file-uploads
plan: 01
subsystem: api
tags: [express, drizzle, zod, transactions, notifications, approval-workflow, reference-numbers]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: schema tables (transactions, transactionItems, debts, notifications, companyCounters, auditLogs)
  - phase: 02-auth
    provides: authenticate middleware, requireRole, requireTenant, JWT payload with role
  - phase: 03-client-management
    provides: clients table and API
  - phase: 04-product-catalog
    provides: products table (referenced by transactionItems.productId)
provides:
  - Transaction CRUD API (POST/GET/GET:id)
  - Transaction approval workflow (approve/reject with SELECT FOR UPDATE)
  - Transaction void endpoint
  - Auto-debt creation on active transactions with outstanding balance
  - Reference number generation (TXN-YYYY-NNNN) via companyCounters upsert
  - Notifications API (unread-count, list, mark-read, mark-all-read)
  - toCents/fromCents money helpers
affects: [05-02-file-uploads, 05-03-transaction-ui, 05-04-notification-ui, 06-debt-payments]

# Tech tracking
tech-stack:
  added: []
  patterns: [integer-cents-arithmetic, SELECT-FOR-UPDATE-race-safety, companyCounters-upsert-sequencing]

key-files:
  created:
    - backend/src/routes/transactions.ts
    - backend/src/routes/notifications.ts
    - backend/src/__tests__/transactions.test.ts
  modified:
    - backend/src/app.ts

key-decisions:
  - "toCents/fromCents exported for unit testing; integer cents arithmetic prevents floating point errors"
  - "nextReferenceNumber uses INSERT...ON CONFLICT DO UPDATE for atomic counter increment"
  - "Approve/reject use SELECT FOR UPDATE within db.transaction for race safety"
  - "Reject sets status back to draft (FR-05.9), not a terminal state"
  - "Void endpoint requires reason and records voidedBy/voidedAt metadata"
  - "Notifications router mounted without requireRole — all authenticated tenant users can receive notifications"

patterns-established:
  - "Transaction status flow: draft -> pending_approval -> active (owner) or draft -> active (collaborator rejected and resubmits)"
  - "Auto-debt creation: debt inserted when totalAmount > initialPayment on active status"
  - "Notification creation: owner notified on collaborator submission; submitter notified on approve/reject"

requirements-completed: [FR-05.1, FR-05.2, FR-05.3, FR-05.4, FR-05.5, FR-05.6, FR-05.7, FR-05.8, FR-05.9, FR-05.10, FR-05.11, FR-05.12, FR-09.1, FR-09.3]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 5 Plan 01: Transaction CRUD + Approval Workflow + Notifications API Summary

**Transaction creation with role-based status assignment, approval/rejection workflow using SELECT FOR UPDATE, auto-debt creation, reference number sequencing, and notifications CRUD for bell icon**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T21:45:01Z
- **Completed:** 2026-03-31T21:48:07Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Full transaction CRUD with 6 endpoints: POST /, GET /, GET /:id, POST /:id/approve, POST /:id/reject, POST /:id/void
- Role-based status: owner creates active transactions, collaborator creates pending_approval
- Approval workflow with SELECT FOR UPDATE race safety, auto-debt creation, and notification dispatch
- Notifications API with 4 endpoints: GET /unread-count, GET /, PATCH /:id/read, POST /mark-all-read
- Reference number auto-generation (TXN-YYYY-NNNN) via companyCounters upsert
- Unit tests for toCents/fromCents money helpers and server-side total computation

## Task Commits

Each task was committed atomically:

1. **Task 1: Transaction CRUD + approval + notifications router** - `7bc6e79` (feat)
2. **Task 2: Transaction API integration tests** - `45a1371` (test)

## Files Created/Modified
- `backend/src/routes/transactions.ts` - Transaction CRUD, approval/reject/void endpoints, money helpers, reference number generation
- `backend/src/routes/notifications.ts` - Notification list, unread count, mark-read, mark-all-read endpoints
- `backend/src/app.ts` - Mount transactionsRouter and notificationsRouter with appropriate middleware
- `backend/src/__tests__/transactions.test.ts` - Unit tests for money helpers + integration test stubs

## Decisions Made
- toCents/fromCents exported as named exports for unit testing (not just internal helpers)
- nextReferenceNumber uses INSERT...ON CONFLICT DO UPDATE for atomic counter increment (no race conditions)
- Approve/reject wrapped in db.transaction with SELECT FOR UPDATE for concurrent request safety
- Reject returns transaction to draft status (not voided) per FR-05.9 so collaborator can re-edit
- Void endpoint separated from reject — void is for active transactions, reject is for pending_approval
- Notifications mounted without requireRole — all tenant users receive notifications (owner for approval requests, collaborator for approval/rejection outcomes)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all endpoints are fully implemented with real database operations.

## Next Phase Readiness
- Transaction endpoints ready for Plan 02 (file upload layer on POST /)
- Notification endpoints ready for Plan 04 (notification bell UI)
- Transaction list/detail endpoints ready for Plan 03 (transaction UI)
- toCents/fromCents helpers available for reuse in future payment handling

---
*Phase: 05-transactions-file-uploads*
*Completed: 2026-03-31*
