---
phase: 02-authentication-user-management
plan: 02
subsystem: backend/auth
tags: [auth, jwt, refresh-tokens, login, cookies, security]
dependency_graph:
  requires:
    - 02-01  # auth service (issueAccessToken, createRefreshToken, rotateRefreshToken, verifyPassword, REFRESH_COOKIE_OPTIONS)
  provides:
    - login-endpoint
    - refresh-endpoint
    - logout-endpoint
  affects:
    - all-protected-routes  # every subsequent API call requires a valid access token from /api/auth/login
tech_stack:
  added:
    - supertest (devDependency) — HTTP endpoint testing in Vitest without spinning up a real server
  patterns:
    - Timing-safe login: always run bcrypt.compare even when user not found (DUMMY_HASH path)
    - Single-use refresh tokens: rotate on every /api/auth/refresh call
    - Cookie path scoping: path=/api/auth/refresh limits browser cookie send surface
key_files:
  created:
    - backend/src/routes/auth.ts
  modified:
    - backend/src/app.ts
    - backend/src/__tests__/auth.test.ts
    - backend/package.json
decisions:
  - "Timing-safe login path uses DUMMY_HASH — bcrypt.compare always runs to prevent user-enumeration via timing"
  - "REFRESH_COOKIE_OPTIONS spread with maxAge:0 for clearCookie — path must match exactly or browser ignores the clear"
  - "supertest added as devDependency — required for Express 5 app-level HTTP testing without a real port"
  - "vi.hoisted() used for mock function definitions — ensures mock state is available to vi.mock() factory which is hoisted before import"
metrics:
  duration_minutes: 8
  tasks_completed: 2
  files_created: 1
  files_modified: 3
  tests_added: 21
  total_tests: 49
  completed_date: 2026-03-30
---

# Phase 02 Plan 02: Auth Endpoints (Login / Refresh / Logout) Summary

**One-liner:** Login/refresh/logout endpoints with timing-safe bcrypt, single-use token rotation, and httpOnly cookie management.

## What Was Built

Three auth endpoints wired to the service layer from plan 02-01:

- `POST /api/auth/login` — Zod validation, constant-time bcrypt path (DUMMY_HASH for missing user), clientId embed for `role=client`, `companyId=null` for super admin, httpOnly refresh_token cookie on `/api/auth/refresh` path.
- `POST /api/auth/refresh` — Looks up token by SHA-256 hash, checks `revokedAt IS NULL` and `expiresAt`, calls `rotateRefreshToken` (single-use token), issues new access token.
- `POST /api/auth/logout` — Requires Bearer token via `authenticate` middleware, revokes ALL user refresh tokens, clears cookie with identical options.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Timing-safe DUMMY_HASH path | Prevents timing oracle: attacker can't distinguish "user not found" from "wrong password" by measuring response time |
| Cookie path `/api/auth/refresh` | Browser only sends cookie to this exact path, reducing CSRF surface |
| `clearCookie` with spread + `maxAge: 0` | Path must match exactly; spreading REFRESH_COOKIE_OPTIONS guarantees consistency |
| `supertest` devDependency | Express 5 app-level testing without real port binding; tests run in-process |
| `vi.hoisted()` for mock functions | Vitest hoists `vi.mock()` calls before imports; top-level `const` declarations aren't accessible in mock factories |

## Test Coverage

36 tests in `auth.test.ts` (21 new, plus refactored existing 15):

- Service unit tests: generateRawToken, hashToken, issueAccessToken, hashPassword, REFRESH_COOKIE_OPTIONS
- Login endpoint: 400 validation, 401 unknown email, 401 wrong password, 401 inactive user, 200 success, httpOnly cookie, clientId embed, super admin null companyId
- Refresh endpoint: 401 no cookie, 401 token not in DB, 401 revoked token, 200 rotation success
- Logout endpoint: 401 no auth, 204 revocation, cookie clearing

Total suite: 49 tests, 6 test files, all green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Missing dependency] supertest not installed**
- **Found during:** Task 1 (writing endpoint tests)
- **Issue:** `supertest` was not in `package.json` devDependencies but is required for HTTP endpoint testing
- **Fix:** `npm install --save-dev supertest @types/supertest`
- **Files modified:** `backend/package.json`, `backend/package-lock.json`
- **Commit:** 0eec488

**2. [Rule 3 - Vitest mock hoisting] vi.mock() factory cannot access top-level const**
- **Found during:** Task 1 (RED phase test run)
- **Issue:** `vi.mock()` factories are hoisted before module-scope `const` declarations, causing `ReferenceError: Cannot access 'mockDbSelect' before initialization`
- **Fix:** Replaced top-level const declarations with `vi.hoisted()` to ensure mock functions are initialized before vi.mock() factories execute
- **Files modified:** `backend/src/__tests__/auth.test.ts`
- **Commit:** 0eec488

### Out-of-Scope Issues Deferred

- `backend/src/db/query-helpers.ts` line 25: pre-existing TypeScript error `TS2345` with drizzle-orm generic type. Not introduced by this plan. Logged for Phase 3 cleanup.

## Known Stubs

None — all three endpoints are fully implemented and wired to real service functions.

## Self-Check: PASSED

Files created:
- backend/src/routes/auth.ts: FOUND
- .planning/phases/02-authentication-user-management/02-02-SUMMARY.md: FOUND

Commits:
- 0eec488 (feat(02-02): implement login/refresh/logout auth endpoints): FOUND
