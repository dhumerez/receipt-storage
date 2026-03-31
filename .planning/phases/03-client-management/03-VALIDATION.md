---
phase: 3
slug: client-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `backend/vitest.config.ts` |
| **Quick run command** | `cd backend && npm test -- --reporter=dot` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --reporter=dot`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + manual portal isolation check
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 3.1 | 1 | FR-03.1 | unit | `cd backend && npm test -- clients` | ❌ W0 | ⬜ pending |
| 3-01-02 | 3.1 | 1 | FR-03.1 (deactivate) | unit | `cd backend && npm test -- clients` | ❌ W0 | ⬜ pending |
| 3-01-03 | 3.1 | 1 | FR-02.7 (invite) | unit | `cd backend && npm test -- clients` | ❌ W0 | ⬜ pending |
| 3-01-04 | 3.1 | 1 | D-08 (accept-invite) | unit | `cd backend && npm test -- auth` | ✅ extend | ⬜ pending |
| 3-02-01 | 3.2 | 2 | FR-03.2 | unit | `cd backend && npm test -- clients` | ❌ W0 | ⬜ pending |
| 3-03-01 | 3.3 | 2 | FR-03.3 | unit | `cd backend && npm test -- clients` | ❌ W0 | ⬜ pending |
| 3-04-01 | 3.4 | 3 | FR-03.4 | unit | `cd backend && npm test -- portal` | ❌ W0 | ⬜ pending |
| 3-04-02 | 3.4 | 3 | FR-03.5 | unit | `cd backend && npm test -- portal` | ❌ W0 | ⬜ pending |
| 3-04-03 | 3.4 | 3 | FR-03.6 | unit | `cd backend && npm test -- portal` | ❌ W0 | ⬜ pending |
| 3-04-04 | 3.4 | 3 | FR-03.7 | unit | `cd backend && npm test -- portal` | ❌ W0 | ⬜ pending |
| 3-04-05 | 3.4 | 3 | FR-03.7 (isolation) | unit | `cd backend && npm test -- portal` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/clients.test.ts` — stubs for FR-03.1, FR-03.2, FR-03.3, FR-02.7 (client invite)
- [ ] `backend/src/__tests__/portal.test.ts` — stubs for FR-03.4, FR-03.5, FR-03.6, FR-03.7, cross-client isolation
- [ ] Extend `backend/src/__tests__/auth.test.ts` — add test for accept-invite with `role='client'` verifying `clients.user_id` is updated

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Portal isolation: Client A cannot access Client B data via browser | FR-03.7 | Requires real browser session with two separate client JWTs | Log in as Client A, copy URL, log in as Client B in another browser, verify Client B gets 403 on Client A's URL |
| `internalNotes` absent from portal UI rendering | FR-03.7 | Requires visual inspection of network response in DevTools | Open portal, open DevTools Network tab, verify no `internalNotes` field in any portal API response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
