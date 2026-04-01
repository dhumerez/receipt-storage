---
phase: 7
slug: reports-pdf-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) / jest + supertest (backend API) |
| **Config file** | `vitest.config.ts` (frontend), `jest.config.js` (backend) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm run test:all` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm run test:all`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | Report API endpoints | integration | `npx jest --testPathPattern=reports` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | Company report query | unit | `npx jest --testPathPattern=reports` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | Per-client report query | unit | `npx jest --testPathPattern=reports` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | Report UI components | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | Date range picker | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | PDF generation | integration | `npx jest --testPathPattern=pdf` | ❌ W0 | ⬜ pending |
| 07-03-02 | 03 | 2 | PDF streaming response | integration | `npx jest --testPathPattern=pdf` | ❌ W0 | ⬜ pending |
| 07-03-03 | 03 | 2 | Company logo in PDF | integration | `npx jest --testPathPattern=pdf` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/src/__tests__/reports.test.ts` — stubs for report API endpoints
- [ ] `server/src/__tests__/pdf.test.ts` — stubs for PDF generation
- [ ] `client/src/__tests__/reports/` — stubs for report UI components
- [ ] PDFKit 0.18.0 installed as dependency

*Existing test infrastructure (vitest, jest, supertest) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF visual layout | PDF renders correctly | Visual rendering quality cannot be automated without snapshot comparison | Open generated PDF, verify headers/footers/tables render correctly |
| Multi-page PDF | Page breaks work | Page break positioning is visual | Generate report with 50+ rows, verify page breaks and repeated headers |
| Print layout CSS | Screen/print layout | Print media queries need browser | Use browser print preview on report page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
