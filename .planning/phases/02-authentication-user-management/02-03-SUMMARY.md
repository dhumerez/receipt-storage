---
phase: 02-authentication-user-management
plan: 03
subsystem: backend/admin
tags: [super-admin, rbac, company-management, middleware]
dependency_graph:
  requires: [02-01]
  provides: [requireSuperAdmin middleware, admin router, company CRUD endpoints, owner creation endpoint]
  affects: [backend/src/app.ts, backend/src/middleware/rbac.ts]
tech_stack:
  added: []
  patterns: [Zod validation, Express Router, TDD with vitest mocks]
key_files:
  created:
    - backend/src/routes/admin.ts
  modified:
    - backend/src/middleware/rbac.ts
    - backend/src/app.ts
    - backend/src/__tests__/admin.test.ts
decisions:
  - requireSuperAdmin is standalone middleware (not a factory) — simpler API since there are no variations
  - admin routes mounted without requireTenant — super admins have companyId=null
  - duplicate email check uses .toLowerCase() to normalize before db lookup
metrics:
  duration: 12m
  completed: 2026-03-30
  tasks_completed: 2
  files_changed: 4
---

# Phase 02 Plan 03: Super Admin Panel Summary

**One-liner:** Super admin company CRUD and owner account creation via `requireSuperAdmin` middleware and `adminRouter` with Zod validation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add requireSuperAdmin middleware to rbac.ts | f204188 | rbac.ts, admin.test.ts |
| 2 | Implement admin router (company CRUD + owner creation) | ac52d49 | routes/admin.ts, app.ts, admin.test.ts |

## What Was Built

### requireSuperAdmin middleware (`backend/src/middleware/rbac.ts`)

Appended alongside the existing `requireRole` factory. Behavior:
- `req.user` missing → 401 `{ error: 'Unauthenticated' }`
- `req.user.isSuperAdmin === false` → 403 `{ error: 'Super admin access required' }`
- `req.user.isSuperAdmin === true` → `next()` regardless of role value

### Admin Router (`backend/src/routes/admin.ts`)

Four endpoints guarded by `authenticate + requireSuperAdmin` (applied in app.ts):

| Method | Path | Behavior |
|--------|------|----------|
| GET | /admin/companies | Returns all companies ordered by createdAt |
| POST | /admin/companies | Creates company (name, currencyCode via Zod); 400 on invalid; 201 + {id, name, currencyCode} |
| PATCH | /admin/companies/:id | Updates name/currencyCode/isActive; 404 when not found |
| POST | /admin/companies/:id/owner | Creates owner user; 404 if company missing; 409 on dup email; hashes password |

### app.ts update

```typescript
app.use('/admin', authenticate, requireSuperAdmin, adminRouter);
```

No `requireTenant` — super admins have `companyId=null`.

## Test Coverage

12 unit tests in `admin.test.ts`:
- 4 tests for `requireSuperAdmin` middleware (401, 403, next-on-true, role-override)
- 8 route tests (GET returns list, POST 400/201, PATCH 404/200, owner 400/409/201)

Full suite: **44 tests, all passing**.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All endpoints are wired to the real DB (via mocked imports in tests).

## Self-Check: PASSED

Files verified:
- FOUND: backend/src/routes/admin.ts
- FOUND: backend/src/middleware/rbac.ts (requireSuperAdmin export)
- FOUND: backend/src/app.ts (/admin mount)
- FOUND: backend/src/__tests__/admin.test.ts

Commits verified:
- f204188 — feat(02-03): add requireSuperAdmin middleware and unit tests
- ac52d49 — feat(02-03): implement admin router with company CRUD and owner creation
