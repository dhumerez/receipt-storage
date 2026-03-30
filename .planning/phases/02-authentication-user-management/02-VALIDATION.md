---
phase: 2
slug: authentication-user-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `backend/vitest.config.ts` |
| **Quick run command** | `cd backend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd backend && npx vitest run --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd backend && npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 02-01 | 1 | FR-01 | unit | `cd backend && npx vitest run src/__tests__/admin.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02-02 | 2 | FR-02 | unit | `cd backend && npx vitest run src/__tests__/invite.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-01 | 02-03 | 1 | FR-01 | unit | `cd backend && npx vitest run src/__tests__/auth.test.ts` | ❌ W0 | ⬜ pending |
| 2-04-01 | 02-04 | 2 | FR-02 | unit | `cd backend && npx vitest run src/__tests__/users.test.ts` | ❌ W0 | ⬜ pending |
| 2-05-01 | 02-05 | 2 | FR-02 | unit | `cd backend && npx vitest run src/__tests__/password-reset.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/admin.test.ts` — stubs for super admin routes
- [ ] `backend/src/__tests__/auth.test.ts` — stubs for login/session/refresh
- [ ] `backend/src/__tests__/invite.test.ts` — stubs for invitation flow
- [ ] `backend/src/__tests__/users.test.ts` — stubs for user management
- [ ] `backend/src/__tests__/password-reset.test.ts` — stubs for password reset

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Resend email delivery | FR-02.2 | Requires live DNS/SMTP | Send invite, verify email received |
| SPF/DKIM validation | NFR-01 | DNS propagation required | Check MX Toolbox after DNS record addition |
| httpOnly cookie set in browser | FR-02.3 | Browser devtools required | Login, inspect Application > Cookies |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
