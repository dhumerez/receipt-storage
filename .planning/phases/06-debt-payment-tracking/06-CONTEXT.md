# Phase 6: Debt & Payment Tracking - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 delivers the full debt lifecycle:
1. **Debt lifecycle API** — auto-creation on transaction approval, status transitions (open → partially_paid → fully_paid / written_off), `debt_balances` view usage, owner-only status changes
2. **Payment recording API** — partial payments against a debt, role-based approval (owner=confirmed, collaborator=pending), SELECT FOR UPDATE race safety, overpayment prevention
3. **Debt & payment UI** — dedicated debt detail page at `/debts/:id`, inline payment form with document upload, payment history with status badges
4. **Client portal debt view** — client sees own debts, confirmed balance, pending payments ("Awaiting confirmation"), payment proof documents

New capabilities NOT in this phase: PDF export, reports, automated reminders, payment editing after confirmation.

</domain>

<decisions>
## Implementation Decisions

### Payment Recording Form

- **D-01:** Payment form is **inline on the debt detail page** — "Record Payment" button expands an inline form below the payment history. Keeps context visible (remaining balance, history).
- **D-02:** Payment method uses a **dropdown with preset options + Other**: Cash, Transfer, Mobile Payment, Other (free text input when selected).
- **D-03:** Payment form **reuses FileAttachmentSection from Phase 5** for proof documents — same Take Photo + Choose from Gallery UX. Files submitted with the payment in a single multipart request.
- **D-04:** Payment form fields: Amount (required), Payment Date (`paid_at`, required), Payment Method (dropdown, required), Reference Number (optional, free text), Notes (optional), Proof Documents (optional, FileAttachmentSection).

### Debt Dashboard Layout

- **D-05:** Clicking a DebtCard on the client detail page navigates to a **dedicated debt detail page at `/debts/:id`**. Client detail page stays clean.
- **D-06:** Debt detail page sections top-to-bottom:
  1. **Header:** Client name (link), original amount, total paid, remaining balance, status badge, write-off reason (if written_off)
  2. **Payment History:** Single chronological list of all payments. Each row: amount, paid_at date, method + reference ("transfer · Ref TRF-88821"), status badge (Confirmed green / Pending Approval yellow). Pending payments annotated with "Does not affect balance".
  3. **Record Payment:** Inline expandable form (D-01 through D-04)
  4. **Original Transaction:** Link to `/transactions/:id` + attached transaction documents
- **D-07:** Payment history is a **single list with status badges** — no separate confirmed/pending sections. Chronological order, newest first.

### Write-off Flow

- **D-08:** "Write Off" button in the debt detail page header, **only visible to owner**. Not on the DebtCard.
- **D-09:** Clicking "Write Off" shows a **confirmation dialog with required reason textarea**. Confirm button reads "Write Off Debt".
- **D-10:** Write-off is **reversible** — owner can reopen a written-off debt. Both actions (write-off and reopen) are captured in `audit_logs` with timestamp, user, and reason.
- **D-11:** Status history visible on debt detail — write-off reason shown inline in the header when debt is written_off.

### Client Portal Debt View

- **D-12:** Client sees **full debt detail with payment history** — remaining balance, all confirmed payments with dates/methods/references, and payment proof documents (thumbnails/download).
- **D-13:** Pending payments shown to client with **"Awaiting confirmation" label** — visible but clearly marked as not affecting balance.
- **D-14:** Client portal debt view follows the same structural layout as the owner debt detail but WITHOUT: Record Payment form, Write Off button, internal notes.

### Claude's Discretion

- Empty state when no payments recorded yet — standard pattern
- Loading skeletons on debt detail page — planner decides
- Toast notification after payment recorded — planner decides
- Debt status transition animations — planner decides
- Payment history pagination vs infinite scroll (likely small lists) — planner decides

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §FR-07 — Debt tracking requirements (FR-07.1 through FR-07.6)
- `.planning/REQUIREMENTS.md` §FR-08 — Payment requirements (FR-08.1 through FR-08.7)
- `.planning/REQUIREMENTS.md` §FR-09 — Approval workflow (mirrors transaction approval pattern)

### Schema (integration points)
- `backend/src/db/schema.ts` — `debts` table, `payments` table, `debtBalances` view, `debtStatusEnum`, `paymentStatusEnum`, `audit_logs` table
- `backend/src/db/schema.ts` lines 229-260 — debt table with status, clientId, transactionId, totalAmount
- `backend/src/db/schema.ts` lines 262-295 — payments table with debtId, amount, paidAt, paymentMethod, status
- `backend/src/db/schema.ts` lines 422-445 — `debt_balances` view computing remaining_balance from confirmed payments only

### Backend patterns to follow
- `backend/src/routes/transactions.ts` — approval workflow pattern (approve/reject with SELECT FOR UPDATE, role-based status)
- `backend/src/routes/notifications.ts` — notification creation pattern for approval events
- `backend/src/middleware/upload.ts` — multer middleware for payment proof documents
- `backend/src/services/upload.service.ts` — file processing pipeline (reuse for payment docs)

### Frontend patterns to follow
- `frontend/src/components/clients/DebtCard.tsx` — existing debt card component (navigate to /debts/:id)
- `frontend/src/components/clients/DebtGroupList.tsx` — existing debt grouping by status
- `frontend/src/components/clients/BalanceSummary.tsx` — existing balance display
- `frontend/src/components/transactions/FileAttachmentSection.tsx` — reuse for payment proof upload
- `frontend/src/pages/transactions/TransactionDetailPage.tsx` — stacked section layout pattern
- `frontend/src/api/transactions.ts` — API module pattern with FormData support

### Portal patterns
- `frontend/src/api/portal.ts` — portal API module (JWT-scoped, no clientId sent)
- `frontend/src/pages/portal/PortalPage.tsx` — portal page pattern

### Project constraints
- `.planning/PROJECT.md` — NUMERIC(12,2) money, integer cents arithmetic, no float, no component library

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DebtCard` + `DebtGroupList` + `BalanceSummary` — existing Phase 3 components; DebtCard becomes the link to `/debts/:id`
- `FileAttachmentSection` — drop-in reuse for payment proof upload (react-dropzone + camera/gallery)
- `TransactionStatusBadge` — pattern for creating PaymentStatusBadge (confirmed/pending)
- `apiClient` with FormData support — reuse for payment recording with file attachments
- `upload.ts` middleware + `upload.service.ts` — reuse for payment document processing
- `SearchBar`, `EmptyState` — common components

### Established Patterns
- Backend: approval workflow with `SELECT FOR UPDATE` inside `db.transaction()` (transactions.ts)
- Backend: `toCents`/`fromCents` for integer arithmetic (transactions.ts)
- Frontend: `useQuery` + `useMutation` with TanStack Query, optimistic updates
- Money: NUMERIC(12,2) in DB, string in API, formatted for display
- Notifications: auto-create notification on approval-required action (notifications.ts)

### Integration Points
- `App.tsx` — add `/debts/:id` route (owner/collaborator/viewer)
- `DebtCard.tsx` — add `onClick` navigation to `/debts/:id`
- `backend/src/app.ts` — mount `debtsRouter` and `paymentsRouter`
- Portal routes — add `/portal/debts/:id` for client debt detail
- Notification system — create notifications when payment needs approval

</code_context>

<specifics>
## Specific Ideas

- Payment method dropdown: Cash, Transfer, Mobile Payment, Other (free text). Not free-text-only.
- Write-off reversibility with audit trail — both write-off and reopen logged in `audit_logs` with reason
- Portal shows pending payments as "Awaiting confirmation" — transparency is important for client trust
- Payment proof documents visible to both owner and client — trust signal per FR-08.3
- Single payment history list with status badges, not split into confirmed/pending sections

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-debt-payment-tracking*
*Context gathered: 2026-03-31*
