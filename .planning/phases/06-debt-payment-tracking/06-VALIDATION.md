---
phase: 6
slug: debt-payment-tracking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `backend/vitest.config.ts` |
| **Quick run command** | `cd backend && npx vitest run src/__tests__/debts.test.ts` |
| **Full suite command** | `cd backend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx vitest run src/__tests__/debts.test.ts`
- **After every plan wave:** Run `cd backend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | FR-07.2 | unit | `npx vitest run src/__tests__/debts.test.ts -t "status transition"` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | FR-07.3 | unit | `npx vitest run src/__tests__/debts.test.ts -t "remaining balance"` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | FR-07.4 | unit | `npx vitest run src/__tests__/debts.test.ts -t "cents arithmetic"` | ❌ W0 | ⬜ pending |
| 06-01-04 | 01 | 1 | FR-07.6 | unit | `npx vitest run src/__tests__/debts.test.ts -t "write-off"` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | FR-08.1 | unit | `npx vitest run src/__tests__/debts.test.ts -t "create payment"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | FR-08.4 | unit | `npx vitest run src/__tests__/debts.test.ts -t "owner payment"` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 1 | FR-08.5 | unit | `npx vitest run src/__tests__/debts.test.ts -t "collaborator payment"` | ❌ W0 | ⬜ pending |
| 06-02-04 | 02 | 1 | FR-08.6 | unit | `npx vitest run src/__tests__/debts.test.ts -t "overpayment"` | ❌ W0 | ⬜ pending |
| 06-02-05 | 02 | 1 | FR-08.7 | unit | `npx vitest run src/__tests__/debts.test.ts -t "concurrent"` | ❌ W0 | ⬜ pending |
| 06-01-05 | 01 | 1 | D-10 | unit | `npx vitest run src/__tests__/debts.test.ts -t "reopen"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/debts.test.ts` — test stubs for FR-07.x, FR-08.x, D-10
- [ ] Test patterns follow existing `transactions.test.ts` (vi.hoisted mocks, supertest, makeToken helper)

*Existing infrastructure covers framework — vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Client portal debt view layout | D-12, D-14 | Visual layout verification | Navigate to /portal/debts/:id, verify no Record Payment form or Write Off button visible |
| Payment proof document display | FR-08.3 | Visual/download verification | Record payment with proof, verify thumbnail renders and download works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
