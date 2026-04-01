---
phase: 06-debt-payment-tracking
plan: 02
subsystem: ui
tags: [react, tanstack-query, debt-detail, payment-form, write-off, file-upload]

requires:
  - phase: 06-01
    provides: Backend API endpoints for debts, payments, write-off, reopen
  - phase: 05
    provides: FileAttachmentSection component, apiClient FormData pattern, TransactionDetailPage layout pattern
provides:
  - Debts API module (frontend/src/api/debts.ts)
  - DebtDetailPage at /debts/:id with 4 sections (header, payment history, record payment, original transaction)
  - PaymentForm with inline expand, file upload reuse, payment method dropdown
  - PaymentHistoryList with chronological display, approve/reject inline actions
  - PaymentStatusBadge for confirmed/pending_approval/rejected states
  - WriteOffDialog modal with required reason textarea
  - DebtCard navigation via Link wrapper
  - App.tsx route for /debts/:id
affects: [06-03-portal-debt-view, reports]

tech-stack:
  added: []
  patterns:
    - "Inline expandable form pattern (Record Payment button -> PaymentForm)"
    - "Inline reject reason expansion in payment history rows"
    - "Debt-specific cache invalidation across debt/clientDebts/portalDebts/portalSummary/notifications"

key-files:
  created:
    - frontend/src/api/debts.ts
    - frontend/src/components/debts/PaymentStatusBadge.tsx
    - frontend/src/components/debts/PaymentForm.tsx
    - frontend/src/components/debts/PaymentHistoryList.tsx
    - frontend/src/components/debts/WriteOffDialog.tsx
    - frontend/src/pages/debts/DebtDetailPage.tsx
  modified:
    - frontend/src/components/clients/DebtCard.tsx
    - frontend/src/App.tsx

key-decisions:
  - "Used apiClient json property for POST bodies (writeOff, reject) instead of raw JSON.stringify with body — consistent with apiClient's built-in Content-Type handling"
  - "Payment method 'Other' with custom text input uses conditional rendering below select element"
  - "TransactionDocThumbnail helper inlined in DebtDetailPage for transaction document display (same pattern as TransactionDetailPage)"

patterns-established:
  - "Debt detail page 4-section layout: Header, Payment History, Record Payment, Original Transaction with border-t separators"
  - "Inline reject expansion: textarea + Confirm Reject + Cancel within payment row"

requirements-completed: [FR-07.2, FR-07.5, FR-07.6, FR-08.1, FR-08.2, FR-08.3, FR-08.6]

duration: 4min
completed: 2026-03-31
---

# Phase 6 Plan 02: Debt Detail Page & Payment Management UI Summary

**Owner/collaborator debt detail page with inline payment recording, approval/reject actions, write-off/reopen flows, and DebtCard navigation**

## What Was Built

### Debts API Module (`frontend/src/api/debts.ts`)
- Exports: `getDebt`, `createPayment`, `approvePayment`, `rejectPayment`, `writeOffDebt`, `reopenDebt`, `getPaymentFileUrl`
- `createPayment` uses FormData with `headers: {}` override for multipart boundary (mirrors transactions pattern)
- `rejectPayment` and `writeOffDebt` use apiClient `json` property for request body

### Components
- **PaymentStatusBadge**: Pill badges for confirmed (green), pending_approval (yellow), rejected (red)
- **PaymentForm**: Inline expandable form with amount, date, method dropdown (Cash/Transfer/Mobile Payment/Other with custom text), reference, notes, FileAttachmentSection reuse
- **PaymentHistoryList**: Chronological list (newest first), "Does not affect balance" annotation on pending payments, owner-only approve/reject actions, inline reject reason expansion
- **WriteOffDialog**: Modal with required reason textarea, red confirm button, backdrop click close, Escape-only-when-empty behavior

### DebtDetailPage (`/debts/:id`)
- Section 1 Header: Client name link, status badge, 3-column money grid, write-off reason display, owner-only Write Off/Reopen buttons
- Section 2 Payment History: PaymentHistoryList with approve/reject mutations
- Section 3 Record Payment: Inline expand button -> PaymentForm (owner + collaborator only, open/partially_paid only)
- Section 4 Original Transaction: Link to transaction, document thumbnails

### Navigation
- DebtCard wrapped in `<Link to={/debts/:id}>` with hover feedback
- App.tsx route: `/debts/:id` -> DebtDetailPage

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | 59ce658 | feat(06-02): create debts API module and all debt components |
| 2 | 4c39524 | feat(06-02): create DebtDetailPage, add DebtCard navigation, wire route |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used apiClient json property instead of raw JSON.stringify**
- **Found during:** Task 1
- **Issue:** Plan specified `body: JSON.stringify({ reason })` for rejectPayment and writeOffDebt, but apiClient has a dedicated `json` property that handles Content-Type and serialization
- **Fix:** Used `json: { reason }` pattern consistent with apiClient's interface
- **Files modified:** frontend/src/api/debts.ts

## Known Stubs

None -- all components are fully wired to API calls and receive real data via useQuery/useMutation hooks.

## Verification

- `npx tsc --noEmit` passes with 0 errors
- `npx vite build` fails due to pre-existing PostCSS config issue in parent directory (D:\Proyecto\postcss.config.mjs) -- unrelated to this plan's changes

## Self-Check: PASSED
