---
phase: 4
slug: product-catalog
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (globals: true, environment: 'node') |
| **Config file** | `backend/vitest.config.ts` |
| **Quick run command** | `cd backend && npx vitest run src/__tests__/products.test.ts` |
| **Full suite command** | `cd backend && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx vitest run src/__tests__/products.test.ts`
- **After every plan wave:** Run `cd backend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | FR-04.1 | unit | `cd backend && npx vitest run src/__tests__/products.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | FR-04.1 | unit | `cd backend && npx vitest run src/__tests__/products.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | FR-04.1 | unit | `cd backend && npx vitest run src/__tests__/products.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 1 | FR-04.2 | unit | `cd backend && npx vitest run src/__tests__/products.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-05 | 01 | 1 | FR-04.3 | manual | Read schema.ts and confirm productId nullable FK | — | ⬜ pending |
| 4-02-01 | 02 | 2 | FR-04.2 | manual | Browser: products list renders with search + filter | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/products.test.ts` — stubs for FR-04.1 and FR-04.2; follow mock pattern in `backend/src/__tests__/clients.test.ts` exactly

*All other infrastructure (Vitest config, test DB setup) already exists from Phase 3.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `transaction_items.productId` is nullable FK | FR-04.3 | Schema-level — no runtime behavior to test | Read `backend/src/db/schema.ts` and confirm `productId: uuid('product_id').references(() => products.id)` without `.notNull()` |
| Inline price edit saves on Enter and blur | D-03 (CONTEXT.md) | No frontend test infrastructure | Manual browser test: click price cell, change value, press Enter; verify save; click price cell, change value, click away; verify save |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
