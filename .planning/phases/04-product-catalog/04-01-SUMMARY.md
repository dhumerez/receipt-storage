---
phase: 04-product-catalog
plan: "01"
subsystem: backend
tags: [products, crud, api, tdd, auth, multi-tenant]
dependency_graph:
  requires:
    - 01-03 (products table schema already migrated)
    - 02-01 (authenticate + requireTenant + requireRole middleware)
  provides:
    - GET /api/v1/products (tenant-scoped list with search/status filters)
    - POST /api/v1/products (create product, owner-only)
    - PATCH /api/v1/products/:id (update product, cross-tenant guard)
    - PATCH /api/v1/products/:id/deactivate (soft-delete, 204)
    - PATCH /api/v1/products/:id/reactivate (reactivate, 204)
  affects:
    - Phase 5 transaction line items (products API now available for catalog picker)
tech_stack:
  added: []
  patterns:
    - TDD Wave 0 (stubs first, implementation second)
    - companyId exclusively from req.companyId! (NFR-01.1)
    - Cross-tenant ownership guard (NFR-01.6) on all mutation endpoints
    - unitPrice as string regex Zod validation (not z.number())
    - Drizzle ORM ilike filter for name search
key_files:
  created:
    - backend/src/__tests__/products.test.ts
    - backend/src/routes/products.ts
  modified:
    - backend/src/app.ts
decisions:
  - "Products API is owner-only at mount (requireRole('owner')); collaborator/viewer GET access deferred to Phase 5 when transaction line-item picker needs it"
  - "unitPrice validated as string regex matching /^\\d+(\\.[0-9]{1,2})?$/ — consistent with numeric PostgreSQL column that returns string from Drizzle"
  - "node_modules symlinked from main backend to worktree for vitest to resolve — worktree lacks own node_modules install"
metrics:
  duration: "3m 32s"
  completed: "2026-03-31"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 1
  tests_added: 14
  tests_total: 142
requirements_satisfied:
  - FR-04.1
  - FR-04.2
  - FR-04.3
  - NFR-01.1
  - NFR-01.6
---

# Phase 4 Plan 01: Products Backend CRUD API Summary

**One-liner:** Products CRUD API with owner-only JWT-scoped tenant isolation, soft-deactivate/reactivate, and string-regex unitPrice validation via TDD.

## What Was Built

Three files deliver the complete products backend:

1. `backend/src/__tests__/products.test.ts` — 14 test cases covering all endpoints using the vi.hoisted mock pattern from clients.test.ts
2. `backend/src/routes/products.ts` — Full CRUD router: GET (search+status filter), POST (create), PATCH (update), PATCH/deactivate, PATCH/reactivate
3. `backend/src/app.ts` — Products router mounted at `/api/v1/products` with `authenticate + requireTenant + requireRole('owner')`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave 0 — Create products.test.ts stubs (RED) | 6d4ecf7 | backend/src/__tests__/products.test.ts |
| 2 | Create products.ts CRUD router | 80ff919 | backend/src/routes/products.ts |
| 3 | Mount productsRouter in app.ts + run full test suite GREEN | 570e0c1 | backend/src/app.ts |

## Test Results

- 14 new products tests: all GREEN
- Full suite: 142 tests passed (9 test files), 0 failures

## Key Design Decisions

- **Owner-only at mount:** `requireRole('owner')` applied at the router mount in app.ts. Phase 5 note documented in app.ts: when the transaction line-item picker needs collaborator/viewer GET access, expand the role list or add a separate read endpoint.
- **unitPrice as string regex:** `z.string().regex(/^\d+(\.\d{1,2})?$/)` used throughout — matches how PostgreSQL NUMERIC columns return values via Drizzle (as strings, not floats). Avoids floating-point precision bugs.
- **Cross-tenant guard on all mutations:** Every PATCH handler first verifies `eq(products.id, id) AND eq(products.companyId, companyId)` before modifying — returns 404 on cross-tenant access (NFR-01.6).
- **companyId always from req.companyId!:** Never from req.body. Comment on every handler reinforces this constraint (NFR-01.1).
- **reactivate included:** PATCH /:id/reactivate implemented (avoids Pitfall 4 from RESEARCH.md).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Infrastructure Deviation (Rule 3 - Blocking)

**Node modules symlink for worktree:** The parallel worktree at `.claude/worktrees/agent-a82451d8/backend/` lacked `node_modules`. Created a symlink pointing to the main backend's `node_modules` directory to allow vitest to run in the worktree context. This is a worktree-local infrastructure setup, not committed to the repo.

## Known Stubs

None — all endpoints are fully implemented and tested.

## Self-Check: PASSED

- `backend/src/__tests__/products.test.ts` exists: FOUND
- `backend/src/routes/products.ts` exists: FOUND
- `backend/src/app.ts` modified: FOUND
- Commits 6d4ecf7, 80ff919, 570e0c1: FOUND
- Full test suite: 142/142 passed
