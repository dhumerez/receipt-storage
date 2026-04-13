---
phase: 5
slug: transactions-file-uploads
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + supertest/jest (backend) |
| **Config file** | `vitest.config.ts` / `jest.config.js` |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test:all` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test:all`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | Transaction model | unit | `npm run test -- --run` | ✅ / ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | Owner creates → active | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | Collaborator creates → pending_approval | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-01-04 | 01 | 1 | SELECT FOR UPDATE approval | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | HEIC→JPEG conversion | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | SVG blocked + magic bytes | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-02-03 | 02 | 1 | Authenticated streaming | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | Transaction form renders | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-03-02 | 03 | 2 | Line item builder | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-04-01 | 04 | 2 | Notification center renders | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-04-02 | 04 | 2 | Approve/reject flow | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-05-01 | 05 | 3 | Transaction list renders | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 5-05-02 | 05 | 3 | Filter by client/status/date | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/transactions.test.ts` — stubs for transaction API
- [ ] `backend/src/__tests__/uploads.test.ts` — stubs for file upload middleware
- [ ] `frontend/src/__tests__/TransactionForm.test.tsx` — stubs for transaction UI
- [ ] `frontend/src/__tests__/ApprovalWorkflow.test.tsx` — stubs for approval UI
- [ ] `frontend/src/__tests__/TransactionList.test.tsx` — stubs for transaction list
- [ ] Test infrastructure for file buffer handling in uploads

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HEIC upload on real iOS device | File upload | Requires physical device with HEIC camera | Upload HEIC photo, verify JPEG conversion |
| Two-button camera/gallery UX on Android 14 | Camera UX (D-09) | Android 14 Chrome behavior varies by device | Open on Pixel, verify camera vs gallery separate |
| Race condition: two concurrent approvals → one debt | Approval integrity | Requires concurrent HTTP load test | Run k6 or ab with 2 simultaneous approve requests |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
