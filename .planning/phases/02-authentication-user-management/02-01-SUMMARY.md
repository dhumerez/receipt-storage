---
phase: 02-authentication-user-management
plan: 01
subsystem: backend/auth
tags: [auth, tokens, jwt, bcrypt, schema, tdd]
dependency_graph:
  requires: []
  provides:
    - tokens table in DB schema (invite + password_reset)
    - refresh_tokens table in DB schema
    - auth.service.ts cryptographic primitives
    - Extended JWTPayload with clientId and nullable companyId
    - Wave 0 test stubs for plans 02-03 through 02-05
  affects:
    - backend/src/middleware/auth.ts (JWTPayload interface)
    - backend/src/db/schema.ts (new tables/enums)
tech_stack:
  added:
    - cookie-parser 1.4.7 (httpOnly cookie handling)
    - "@types/cookie-parser 1.4.10"
  patterns:
    - TDD red-green for auth service unit tests
    - SHA-256 token hashing via built-in Node crypto module
    - bcrypt with 12 salt rounds for password hashing
    - HS256 JWT for access tokens (15m TTL)
    - 7-day refresh token rotation via DB table
key_files:
  created:
    - backend/src/services/auth.service.ts
    - backend/src/db/migrations/0002_tokens_refresh_tokens.sql
    - backend/src/__tests__/auth.test.ts
    - backend/src/__tests__/admin.test.ts
    - backend/src/__tests__/invite.test.ts
    - backend/src/__tests__/users.test.ts
    - backend/src/__tests__/password-reset.test.ts
  modified:
    - backend/src/db/schema.ts (added tokenTypeEnum, tokens, refreshTokens)
    - backend/src/middleware/auth.ts (JWTPayload extended)
    - backend/package.json (cookie-parser added)
decisions:
  - JWTPayload.companyId changed to string | null (null for super admin)
  - JWTPayload.clientId added as optional string (FR-02.5 client portal)
  - REFRESH_COOKIE_OPTIONS exported constant ensures consistent cookie config across auth routes
  - hashToken uses built-in Node crypto (no 3rd-party SHA-256 library)
  - SALT_ROUNDS=12 chosen for 2026 hardware baseline (~2-3 hashes/sec)
metrics:
  duration_seconds: 217
  completed_date: "2026-03-30"
  tasks_completed: 3
  files_created: 7
  files_modified: 3
---

# Phase 2 Plan 1: Auth Service Foundation Summary

**One-liner:** JWT HS256 access tokens + SHA-256 refresh token rotation + bcrypt-12 passwords using built-in Node crypto and unified tokens/refresh_tokens schema tables.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Install cookie-parser, add tokens + refresh_tokens schema, run migration | 179f76b | Done |
| 2 (RED) | Failing tests for auth service (TDD red) | bedb2f7 | Done |
| 2 (GREEN) | Implement auth.service.ts | 02a3cab | Done |
| 3 | Create Wave 0 test stub files | 2ad7866 | Done |

## What Was Built

### Schema additions (backend/src/db/schema.ts)
- `tokenTypeEnum`: pgEnum('token_type', ['invite', 'password_reset'])
- `tokens` table: unified invite + password-reset tokens with SHA-256 hashed token_hash, expiry, used_at
- `refreshTokens` table: per-user refresh token rows with revocation support

### Auth service (backend/src/services/auth.service.ts)
- `generateRawToken()`: CSPRNG 64-char hex string
- `hashToken()`: SHA-256 via Node built-in crypto, deterministic
- `issueAccessToken()`: HS256 JWT, 15m TTL, embeds sub/companyId/role/isSuperAdmin/clientId
- `createRefreshToken()`: inserts hashed token to DB, returns raw token
- `rotateRefreshToken()`: atomic revoke-old + create-new
- `revokeAllUserRefreshTokens()`: used on logout and password reset
- `hashPassword()`/`verifyPassword()`: bcrypt with 12 rounds
- `REFRESH_COOKIE_OPTIONS`: shared constant for httpOnly/secure/sameSite/path cookie config

### JWTPayload extension (backend/src/middleware/auth.ts)
- `companyId: string | null` (null for super admin)
- `clientId?: string` (FR-02.5: client portal users)

### Test coverage
- 20 unit tests in auth.test.ts, all passing
- 4 Wave 0 stub files (admin, invite, users, password-reset)
- Full suite: 33 tests, 6 files, all green

## Deviations from Plan

### Pre-existing TypeScript error (out of scope)
- **Found during:** Task 1 verification
- **Issue:** `backend/src/db/query-helpers.ts` line 25 has a pre-existing TS type error unrelated to this plan's changes (drizzle-orm type mismatch in `scopedSelect` function)
- **Confirmed pre-existing** by checking out before changes — error existed before this plan
- **Action:** Not fixed (out of scope); documented here for reference
- **Impact:** TypeScript strict compilation reports this error but it does not affect test execution or runtime behavior

## Known Stubs

None — all exported functions are fully implemented and tested.

## Self-Check: PASSED

All created files verified on disk. All task commits confirmed in git log:
- 179f76b: feat(02-01): install cookie-parser and add tokens/refresh_tokens schema
- bedb2f7: test(02-01): add failing tests for auth service and JWTPayload
- 02a3cab: feat(02-01): implement auth service with JWT, bcrypt, token utils
- 2ad7866: test(02-01): add Wave 0 stub test files for remaining Phase 2 suites
