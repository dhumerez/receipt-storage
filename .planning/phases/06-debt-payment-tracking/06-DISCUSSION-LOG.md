# Phase 6: Debt & Payment Tracking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 06-debt-payment-tracking
**Areas discussed:** Payment recording form, Debt dashboard layout, Write-off flow, Portal debt view

---

## Payment Recording Form

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on debt detail | "Record Payment" button expands inline form below payment history | ✓ |
| Dedicated page at /payments/new | Separate full page for recording a payment | |
| Modal overlay | Payment form in a modal over the debt detail | |

**User's choice:** Inline on debt detail (Recommended)
**Notes:** Keeps context visible — remaining balance and payment history stay on screen.

### Payment Method

| Option | Description | Selected |
|--------|-------------|----------|
| Free text input | Simple text field — user types anything | |
| Dropdown with common options + Other | Preset choices plus "Other" free text | ✓ |

**User's choice:** Dropdown with common options + Other
**Notes:** User specified: Cash, Transfer, Mobile Payment, Other

### Proof Documents

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, reuse FileAttachmentSection | Same Take Photo + Choose from Gallery UX from Phase 5 | ✓ |
| No attachments on payments | Keep payment form simple | |

**User's choice:** Yes, reuse FileAttachmentSection (Recommended)

---

## Debt Dashboard Layout

### Debt Detail Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated debt page at /debts/:id | Clicking DebtCard navigates to full page | ✓ |
| Expand DebtCard inline on client detail | Accordion-style expansion on client page | |
| Both — expand preview + link | Quick preview + full page link | |

**User's choice:** Dedicated debt page at /debts/:id (Recommended)

### Page Sections

| Option | Description | Selected |
|--------|-------------|----------|
| Header, Payments, Record Payment, Documents | Four stacked sections with all detail | ✓ |
| Header, Timeline, Record Payment | Unified chronological timeline | |

**User's choice:** Header, Payments, Record Payment, Documents (Recommended)

### Payment History Display

| Option | Description | Selected |
|--------|-------------|----------|
| Single list, badge per status | All payments chronological with confirmed/pending badges | ✓ |
| Two separate sections | Split confirmed and pending into separate areas | |

**User's choice:** Single list, badge per status (Recommended)

---

## Write-off Flow

### Action Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Button on debt detail page only | "Write Off" in header, owner-only, confirmation + reason | ✓ |
| On both DebtCard and debt detail | Small action on card + full button on detail | |
| Dropdown menu action | Inside ⋮ menu, less prominent | |

**User's choice:** Button on debt detail page only (Recommended)

### Reversibility

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, owner can reopen | Status change back to open, logged in audit trail | ✓ |
| No, permanent | Final once written off | |

**User's choice:** Yes, owner can reopen — with audit trail logging
**Notes:** User specifically requested that write-off and reopen actions register for audit purposes. Existing `audit_logs` table handles this automatically.

---

## Portal Debt View

### Detail Level

| Option | Description | Selected |
|--------|-------------|----------|
| Full debt detail with payment history | Debts, balance, all confirmed payments, proof documents | ✓ |
| Summary only — balance + total paid | No individual payment breakdown | |
| Full detail + downloadable statement | Everything plus PDF (Phase 7 scope) | |

**User's choice:** Full debt detail with payment history (Recommended)

### Payment Proof Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show payment proof to client | Thumbnails/download for proof attached to each payment | ✓ |
| No, proof is internal only | Only owner/collaborator sees proof | |

**User's choice:** Yes, show payment proof to client (Recommended)

### Pending Payment Display

| Option | Description | Selected |
|--------|-------------|----------|
| Show with "Awaiting confirmation" label | Visible but clearly marked as not affecting balance | ✓ |
| Hide pending payments entirely | Client only sees confirmed payments | |

**User's choice:** Show with "Awaiting confirmation" label (Recommended)

---

## Claude's Discretion

- Empty state when no payments recorded
- Loading skeletons on debt detail page
- Toast notification after payment recorded
- Debt status transition animations
- Payment history pagination vs scroll

## Deferred Ideas

None raised during discussion.
