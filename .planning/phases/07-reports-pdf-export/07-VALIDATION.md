---
phase: 7
slug: reports-pdf-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
updated: 2026-04-01
---

# Phase 7 --- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (backend + frontend) |
| **Config file** | `backend/vitest.config.ts`, `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd backend && npx vitest run && cd ../frontend && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** `cd backend && npx vitest run --reporter=verbose` (backend tasks) or `cd frontend && npx vitest run --reporter=verbose` (frontend tasks)
- **After every plan wave:** `cd backend && npx vitest run && cd ../frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-T1 | 01 | 1 | FR-10.1, FR-10.2: Schema + report service + logo upload | unit | `cd backend && npx vitest run src/__tests__/reports.test.ts -t "company report" --reporter=verbose` | No - W0 | pending |
| 07-01-T2 | 01 | 1 | FR-10.1, FR-10.2: Report API routes + logo endpoints | integration | `cd backend && npx vitest run src/__tests__/reports.test.ts -t "report endpoints" --reporter=verbose` | No - W0 | pending |
| 07-02-T1 | 02 | 2 | FR-10.3: PDFKit install + shared PDF utilities | unit | `cd backend && npx vitest run src/__tests__/pdf.test.ts -t "pdf-base" --reporter=verbose` | No - W0 | pending |
| 07-02-T2 | 02 | 2 | FR-10.3, D-09 to D-15: PDF builders + streaming endpoints | integration | `cd backend && npx vitest run src/__tests__/pdf.test.ts -t "pdf endpoints" --reporter=verbose` | No - W0 | pending |
| 07-03-T1 | 03 | 2 | D-05, D-07: API module + utility components | unit | `cd frontend && npx vitest run src/__tests__/reports.test.tsx --reporter=verbose` | No - W0 | pending |
| 07-03-T2 | 03 | 2 | FR-10.1, FR-10.2, D-05: Report tab components + ReportsPage | unit | `cd frontend && npx vitest run src/__tests__/reports.test.tsx --reporter=verbose` | No - W0 | pending |
| 07-03-T3 | 03 | 2 | D-08, D-09: Settings + logo + nav + routes + print CSS | unit | `cd frontend && npx vitest run src/__tests__/settings.test.tsx --reporter=verbose` | No - W0 | pending |
| 07-04-T1 | 04 | 3 | D-14: PDF download buttons on detail pages | unit | `cd frontend && npx vitest run src/__tests__/reports.test.tsx -t "download" --reporter=verbose` | No - W0 | pending |
| 07-04-T2 | 04 | 3 | FR-10.4: Verify portal summary coverage | verification | `cd backend && grep -c "confirmedBalance\|amountPaid\|payments" src/routes/portal.ts` | Existing | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/reports.test.ts` --- stubs for report service + report API endpoints (FR-10.1, FR-10.2)
- [ ] `backend/src/__tests__/pdf.test.ts` --- stubs for PDF generation + streaming (FR-10.3, D-09 to D-15)
- [ ] `frontend/src/__tests__/reports.test.tsx` --- stubs for report UI components (D-05, D-07, D-14)
- [ ] `frontend/src/__tests__/settings.test.tsx` --- stubs for settings/logo upload (D-09)
- [ ] PDFKit mocking strategy: mock `PDFDocument` constructor in tests to verify method calls without generating actual PDFs

*Existing test infrastructure (vitest) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF visual layout | D-09 to D-15 | Visual rendering quality cannot be automated without snapshot comparison | Open generated PDF, verify headers/footers/tables render correctly |
| Multi-page PDF | D-11 | Page break positioning is visual | Generate report with 50+ rows, verify page breaks and repeated headers |
| Print layout CSS | D-08 | Print media queries need browser | Use browser print preview on report page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
