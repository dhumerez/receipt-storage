# Phase 6: Debt & Payment Tracking - Research

**Researched:** 2026-03-31
**Domain:** Financial lifecycle management (debt CRUD, payment recording, approval workflow, portal views)
**Confidence:** HIGH

## Summary

Phase 6 builds the financial heart of the application: debt lifecycle management and payment recording with approval workflows. The schema is already in place (debts, payments, debtBalances view, audit_logs), the approval pattern is established in transactions.ts (SELECT FOR UPDATE inside db.transaction), and the frontend has reusable components (DebtCard, FileAttachmentSection, TransactionDetailPage layout pattern). The main work is creating new API routes, a new debt detail page, payment recording with file upload, write-off/reopen flows, and portal extensions.

All money arithmetic must use integer cents in the application layer (toCents/fromCents pattern from transactions.ts), with NUMERIC(12,2) in PostgreSQL. The debtBalances view already computes remaining_balance from confirmed payments only. The critical concurrency requirement is SELECT FOR UPDATE on the debt row during payment approval to prevent double-spend races.

**Primary recommendation:** Follow the established transaction approval pattern exactly. Reuse toCents/fromCents, uploadMiddleware, processFile, FileAttachmentSection, and the notification creation pattern. The debt detail page should follow TransactionDetailPage's stacked section layout.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Payment form is inline on the debt detail page -- "Record Payment" button expands an inline form below the payment history.
- **D-02:** Payment method uses a dropdown with preset options + Other: Cash, Transfer, Mobile Payment, Other (free text input when selected).
- **D-03:** Payment form reuses FileAttachmentSection from Phase 5 for proof documents -- same Take Photo + Choose from Gallery UX. Files submitted with the payment in a single multipart request.
- **D-04:** Payment form fields: Amount (required), Payment Date (paid_at, required), Payment Method (dropdown, required), Reference Number (optional, free text), Notes (optional), Proof Documents (optional, FileAttachmentSection).
- **D-05:** Clicking a DebtCard on the client detail page navigates to a dedicated debt detail page at `/debts/:id`.
- **D-06:** Debt detail page sections top-to-bottom: Header (client name link, amounts, status, write-off reason), Payment History (chronological, newest first, status badges), Record Payment (inline expandable), Original Transaction (link + docs).
- **D-07:** Payment history is a single list with status badges -- no separate confirmed/pending sections.
- **D-08:** "Write Off" button in the debt detail page header, only visible to owner. Not on the DebtCard.
- **D-09:** Clicking "Write Off" shows a confirmation dialog with required reason textarea. Confirm button reads "Write Off Debt".
- **D-10:** Write-off is reversible -- owner can reopen a written-off debt. Both actions logged in audit_logs with timestamp, user, and reason.
- **D-11:** Status history visible on debt detail -- write-off reason shown inline in the header when debt is written_off.
- **D-12:** Client sees full debt detail with payment history -- remaining balance, all confirmed payments with dates/methods/references, and payment proof documents.
- **D-13:** Pending payments shown to client with "Awaiting confirmation" label -- visible but clearly marked as not affecting balance.
- **D-14:** Client portal debt view follows same layout as owner debt detail but WITHOUT: Record Payment form, Write Off button, internal notes.

### Claude's Discretion
- Empty state when no payments recorded yet
- Loading skeletons on debt detail page
- Toast notification after payment recorded
- Debt status transition animations
- Payment history pagination vs infinite scroll (likely small lists)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-07.1 | Debt auto-created when approved transaction has initial_payment < total_amount | Already implemented in transactions.ts (lines 176-184, 437-447). Phase 6 only needs to handle GET/status transitions on existing debts. |
| FR-07.2 | Debt states: open -> partially_paid -> fully_paid / written_off | Schema has debtStatusEnum. API must transition status on payment confirmation and write-off. |
| FR-07.3 | Remaining balance always computed from total_amount - SUM(approved payments) via DB view | debtBalances view exists (schema lines 422-448). Never store remaining_balance as column. |
| FR-07.4 | NUMERIC(12,2) + integer cents arithmetic | toCents/fromCents helpers in transactions.ts. Reuse directly. |
| FR-07.5 | Debt view shows original amount, total paid, remaining, all payments, all documents | Debt detail page (D-06) layout + API must return payments with docs. |
| FR-07.6 | Owner can mark debt as written_off with reason | D-08 through D-11 define UX. API endpoint + audit log. |
| FR-08.1 | Record partial payments against a debt; multiple payments per debt | Payments table ready. POST /api/v1/debts/:debtId/payments endpoint. |
| FR-08.2 | Payment fields: amount, paid_at, payment method, reference, notes | D-04 defines form fields. Schema has all columns. |
| FR-08.3 | Payment method and reference shown on payment history | D-06/D-07 define display format: "transfer - Ref TRF-88821". |
| FR-08.4 | Owner-recorded payments immediately confirmed | Role check on req.user.role, set status='confirmed'. |
| FR-08.5 | Collaborator-recorded payments pending_approval | Role check, set status='pending_approval', notify owners. |
| FR-08.6 | Payment validation: pending + confirmed cannot exceed debt total | Server-side validation before insert. Query SUM of existing payments + new amount <= totalAmount. |
| FR-08.7 | SELECT FOR UPDATE on debt row during payment approval | Same pattern as transaction approval (transactions.ts lines 412-476). |
| FR-09.3 | Notification on payment submission/approval/rejection | Reuse notification creation pattern from transactions.ts. |
| FR-11.1 | Audit log for debt status changes, payment CRUD/approve/reject | Insert into auditLogs on every mutation. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 | Database queries, transactions, views | Project standard; pinned version |
| express | 5.2.1 | API routing, middleware | Project standard |
| zod | 4.3.6 | Request validation schemas | Project standard |
| multer | 2.1.1 | File upload middleware (payment proof) | Reuse existing uploadMiddleware |
| sharp | 0.34.5 | Image processing for proof docs | Reuse existing processFile pipeline |
| @tanstack/react-query | (installed) | Data fetching, mutations, cache invalidation | Project standard |
| react-router | v7 | Client-side routing (unified package) | Project standard, import from 'react-router' |
| react-dropzone | 15.0.0 | File selection UI | Reuse FileAttachmentSection |
| tailwindcss | v4 | Styling | Project standard, no config file |

### No New Dependencies
This phase requires zero new packages. Everything is already installed.

## Architecture Patterns

### Recommended Project Structure (new files)
```
backend/src/
  routes/
    debts.ts           # Debt lifecycle API (GET /:id, POST /:id/write-off, POST /:id/reopen, /:id/payments/*, /:id/payments/:paymentId/approve|reject)
  __tests__/
    debts.test.ts      # Unit tests for debt + payment routes
frontend/src/
  api/
    debts.ts           # API client for debts and payments
  pages/
    debts/
      DebtDetailPage.tsx   # /debts/:id — owner/collaborator/viewer
  pages/
    portal/
      PortalDebtDetailPage.tsx  # /portal/debts/:id — client view
  components/
    debts/
      PaymentStatusBadge.tsx    # confirmed/pending_approval/rejected badges
      PaymentForm.tsx           # Inline expandable payment recording form
      PaymentHistoryList.tsx    # Chronological payment list with badges
      WriteOffDialog.tsx        # Confirmation dialog with reason textarea
```

### Pattern 1: Payment Approval (mirrors Transaction Approval)
**What:** SELECT FOR UPDATE inside db.transaction() to prevent concurrent payment double-spend.
**When to use:** Payment approval endpoint (POST /debts/:debtId/payments/:paymentId/approve).
**Example:**
```typescript
// Source: backend/src/routes/transactions.ts lines 412-476 (existing pattern)
const result = await db.transaction(async (tx) => {
  // Lock the debt row to prevent concurrent modifications
  const [debt] = await tx
    .select()
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.companyId, companyId)))
    .for('update');

  // Lock the payment row
  const [payment] = await tx
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.debtId, debtId)))
    .for('update');

  if (!payment || payment.status !== 'pending_approval') {
    return { error: 'Payment is not pending approval' };
  }

  // Validate no overpayment after approval
  const [sumRow] = await tx
    .select({ total: sql<string>`COALESCE(SUM(amount), '0')` })
    .from(payments)
    .where(and(
      eq(payments.debtId, debtId),
      eq(payments.status, 'confirmed'),
    ));

  const confirmedCents = toCents(sumRow.total);
  const newPaymentCents = toCents(payment.amount);
  const totalDebtCents = toCents(debt.totalAmount);

  if (confirmedCents + newPaymentCents > totalDebtCents) {
    return { error: 'Approving this payment would exceed the debt total' };
  }

  // Update payment status
  await tx.update(payments).set({
    status: 'confirmed',
    approvedBy: userId,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(payments.id, paymentId));

  // Update debt status based on new total
  const newTotal = confirmedCents + newPaymentCents;
  const newDebtStatus = newTotal >= totalDebtCents ? 'fully_paid' : 'partially_paid';
  await tx.update(debts).set({
    status: newDebtStatus,
    updatedAt: new Date(),
  }).where(eq(debts.id, debtId));

  // Notification + audit log...
});
```

### Pattern 2: Overpayment Prevention on Payment Creation
**What:** Validate pending + confirmed payments sum + new amount <= debt total before inserting.
**When to use:** POST /debts/:debtId/payments.
**Example:**
```typescript
// Sum all non-rejected payments for this debt
const [sumRow] = await tx
  .select({
    total: sql<string>`COALESCE(SUM(amount) FILTER (WHERE status != 'rejected'), '0')`,
  })
  .from(payments)
  .where(eq(payments.debtId, debtId));

const existingCents = toCents(sumRow.total);
const newPaymentCents = toCents(parsed.data.amount);
const totalDebtCents = toCents(debt.totalAmount);

if (existingCents + newPaymentCents > totalDebtCents) {
  return res.status(400).json({
    error: 'Payment would exceed remaining debt balance',
    maxAmount: fromCents(totalDebtCents - existingCents),
  });
}
```

### Pattern 3: Debt Status Auto-Transition
**What:** Automatically transition debt status when confirmed payment totals change.
**When to use:** After payment approval or payment rejection reversal.
**Rules:**
- 0 confirmed payments: `open`
- SUM(confirmed) > 0 but < totalAmount: `partially_paid`
- SUM(confirmed) >= totalAmount: `fully_paid`
- Manual write-off/reopen: separate endpoints

### Pattern 4: Inline Expandable Form (Frontend)
**What:** "Record Payment" button toggles form visibility with state.
**When to use:** Debt detail page payment form (D-01).
**Example:**
```typescript
const [showPaymentForm, setShowPaymentForm] = useState(false);

// In JSX:
{!showPaymentForm ? (
  <button onClick={() => setShowPaymentForm(true)}>Record Payment</button>
) : (
  <PaymentForm
    debtId={debt.id}
    maxAmount={debt.remainingBalance}
    onSuccess={() => {
      setShowPaymentForm(false);
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] });
    }}
    onCancel={() => setShowPaymentForm(false)}
  />
)}
```

### Pattern 5: FormData with File Upload (mirrors Transaction Creation)
**What:** Submit payment data + proof files as multipart FormData.
**When to use:** Payment recording endpoint.
**Example:**
```typescript
// Frontend: same pattern as createTransaction in api/transactions.ts
export function createPayment(
  debtId: string,
  input: CreatePaymentInput,
  files: File[],
): Promise<PaymentDetail> {
  const formData = new FormData();
  formData.append('data', JSON.stringify(input));
  files.forEach((f) => formData.append('files', f));

  return apiClient<PaymentDetail>(`/api/v1/debts/${debtId}/payments`, {
    method: 'POST',
    body: formData,
    headers: {},  // Let browser set multipart boundary
  });
}
```

### Anti-Patterns to Avoid
- **Storing remaining_balance as a column:** Use debtBalances view. Never cache computed balance.
- **Float arithmetic for money:** Always use toCents/fromCents (integer cents). `0.1 + 0.2 !== 0.3` in JavaScript.
- **Checking debt ownership without companyId:** Every query MUST include `eq(debts.companyId, companyId)` from JWT.
- **Joining transactions table in portal debt routes:** This risks leaking internalNotes. Use structural guard (select explicit columns from debtBalances view only).
- **Approving payment outside db.transaction + FOR UPDATE:** Race condition allows double-spend.
- **Using `pending_approval` payments in balance display:** Only `confirmed` payments reduce displayed balance (debtBalances view already enforces this, but frontend must also annotate pending payments clearly).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload processing | Custom file handling | `uploadMiddleware` + `processFile` from Phase 5 | HEIC conversion, EXIF rotation, magic byte validation, UUID naming all handled |
| File attachment UI | New dropzone component | `FileAttachmentSection` from Phase 5 | Camera + gallery two-button UX, drag-drop, preview, max file limits |
| Money arithmetic | parseFloat math | `toCents(str)` / `fromCents(cents)` | Integer cents prevents float drift; verified pattern |
| Concurrent write safety | Optimistic locking / manual lock | Drizzle `.for('update')` in `db.transaction()` | PostgreSQL row-level locking; pattern proven in transaction approval |
| Notification creation | Custom notification logic | Copy notification insert pattern from transactions.ts | Same structure: notify owners on submission, notify submitter on approval/rejection |
| Status badges | New badge component | Copy TransactionStatusBadge pattern | Same pill-style badge with color mapping per status |

**Key insight:** Phase 6 is primarily assembly of proven Phase 5 patterns applied to debts and payments. The schema, file pipeline, approval flow, and notification system are all established. The risk is in the concurrency/overpayment edge cases, not in the basic CRUD.

## Common Pitfalls

### Pitfall 1: Float Drift in Multi-Payment Scenarios
**What goes wrong:** 10 payments of $10.00 on a $100.00 debt don't sum to exactly $100.00 if using floats.
**Why it happens:** `parseFloat('10.00') * 10` may produce `99.99999999999999` or `100.00000000000001`.
**How to avoid:** Always use `toCents()` for arithmetic, `fromCents()` for display. The debtBalances view uses NUMERIC(12,2) which is exact in PostgreSQL.
**Warning signs:** Debts stuck at "partially_paid" when they should be "fully_paid"; remaining balance showing `-0.01` or `0.01`.

### Pitfall 2: Race Condition on Concurrent Payment Approval
**What goes wrong:** Two owners approve different pending payments simultaneously. Both read the same confirmed total, both approve, total exceeds debt amount.
**Why it happens:** Without row-level locking, both transactions see the pre-approval state.
**How to avoid:** `SELECT ... FROM debts WHERE id = $1 FOR UPDATE` inside `db.transaction()`. This serializes concurrent approvals on the same debt.
**Warning signs:** Debt total_paid exceeding total_amount; negative remaining balance.

### Pitfall 3: Overpayment via Pending Payments
**What goes wrong:** Collaborator submits $60 payment, then another $60 payment on a $100 debt. Both are pending. Owner approves both. Total = $120 > $100.
**Why it happens:** FR-08.6 says "pending + confirmed cannot exceed debt total" at creation time, but the second approval doesn't re-check the sum.
**How to avoid:** Re-validate on approval: inside the FOR UPDATE transaction, compute current confirmed sum + this payment's amount, reject if > totalAmount. Also validate at creation: sum of non-rejected payments + new amount <= totalAmount.
**Warning signs:** Approval succeeding when it shouldn't; negative remaining balance.

### Pitfall 4: Portal Data Leakage (internalNotes)
**What goes wrong:** Portal debt detail endpoint accidentally joins transactions table and returns internalNotes.
**Why it happens:** Developer adds a transaction join for convenience (e.g., to get reference number) and selects all columns.
**How to avoid:** Portal routes must never join the transactions table. If transaction reference_number is needed in portal, add it as a column on the debt response via explicit select (not `SELECT *`). Established pattern from portal.ts.
**Warning signs:** Client API response containing `internalNotes` field.

### Pitfall 5: Missing Audit Logs on Write-Off/Reopen
**What goes wrong:** Write-off and reopen actions are not audited, breaking FR-11.1 compliance.
**Why it happens:** Developer forgets audit log insert on status change endpoints.
**How to avoid:** Every mutation endpoint must include `await tx.insert(auditLogs).values({...})`. Both write-off AND reopen must log with reason and previous status in metadata.
**Warning signs:** Missing entries in audit_logs for debt status changes.

### Pitfall 6: Debt Status Not Updated After Payment Approval
**What goes wrong:** Payment is approved (confirmed) but debt remains `open` instead of transitioning to `partially_paid` or `fully_paid`.
**Why it happens:** Payment approval endpoint updates payment status but forgets to update debt status.
**How to avoid:** Inside the approval transaction, always compute new confirmed total and update debt status accordingly. Same logic needed in payment rejection (debt might revert from partially_paid to open if all confirmed payments are gone).
**Warning signs:** debtBalances view showing amountPaid > 0 but status still 'open'.

## Code Examples

### Debt Detail API Response Shape
```typescript
// GET /api/v1/debts/:id
// Source: derived from schema + CONTEXT.md D-06
interface DebtDetailResponse {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  transactionId: string;
  transactionRef: string;
  totalAmount: string;        // NUMERIC(12,2) as string
  amountPaid: string;         // from debtBalances view
  remainingBalance: string;   // from debtBalances view
  status: 'open' | 'partially_paid' | 'fully_paid' | 'written_off';
  writeOffReason: string | null;
  createdAt: string;
  payments: PaymentItem[];
  transactionDocuments: DocumentInfo[];
}

interface PaymentItem {
  id: string;
  amount: string;
  paidAt: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  status: 'confirmed' | 'pending_approval' | 'rejected';
  recordedByName: string;
  createdAt: string;
  documents: DocumentInfo[];
}
```

### Payment Recording Endpoint Shape
```typescript
// POST /api/v1/debts/:debtId/payments
// Source: FR-08.1 through FR-08.7, D-03, D-04
const CreatePaymentSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount'),
  paidAt: z.string(),  // ISO date string
  paymentMethod: z.string().min(1).max(100),
  reference: z.string().max(100).optional(),
  notes: z.string().optional(),
});
```

### Write-Off / Reopen Endpoints
```typescript
// POST /api/v1/debts/:id/write-off  (owner only)
const WriteOffSchema = z.object({
  reason: z.string().min(1).max(500),
});

// POST /api/v1/debts/:id/reopen  (owner only, D-10)
// No body required (optional reason)
```

### Payment Approval/Rejection
```typescript
// POST /api/v1/debts/:debtId/payments/:paymentId/approve  (owner only)
// POST /api/v1/debts/:debtId/payments/:paymentId/reject   (owner only, requires reason)
const RejectPaymentSchema = z.object({
  reason: z.string().min(1).max(500),
});
```

### Route Mounting Pattern
```typescript
// backend/src/app.ts — add these two lines
app.use('/api/v1/debts', authenticate, requireTenant, requireRole('owner', 'collaborator', 'viewer'), debtsRouter);
// Portal debt detail: extend existing portalRouter
// Add GET /api/v1/portal/debts/:id to portalRouter
```

### Frontend Route Registration
```typescript
// App.tsx — add inside ProtectedRoute > AppLayout
<Route path="/debts/:id" element={<DebtDetailPage />} />

// App.tsx — add inside ClientRoute > PortalLayout
<Route path="/portal/debts/:id" element={<PortalDebtDetailPage />} />
```

### DebtCard Navigation (existing component update)
```typescript
// Update DebtCard to add onClick/Link navigation to /debts/:id
import { Link } from 'react-router';

// Wrap the card in a Link:
<Link to={`/debts/${debt.id}`} className="block">
  {/* existing DebtCard content */}
</Link>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store remaining_balance column | Compute via debtBalances view | Phase 1 schema design | Never out of sync with actual payments |
| Float money arithmetic | NUMERIC(12,2) + integer cents | Phase 1 decision | Zero float drift on multi-payment debts |
| Optimistic UI balance | Server-computed from confirmed only | Phase 1 decision | Pending payments never affect displayed balance |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.x |
| Config file | `backend/vitest.config.ts` |
| Quick run command | `cd backend && npx vitest run src/__tests__/debts.test.ts` |
| Full suite command | `cd backend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-07.2 | Debt status transitions (open->partially_paid->fully_paid) | unit | `npx vitest run src/__tests__/debts.test.ts -t "status transition"` | No - Wave 0 |
| FR-07.3 | Remaining balance from view, not stored column | unit | `npx vitest run src/__tests__/debts.test.ts -t "remaining balance"` | No - Wave 0 |
| FR-07.4 | Integer cents arithmetic (no float drift) | unit | `npx vitest run src/__tests__/debts.test.ts -t "cents arithmetic"` | No - Wave 0 |
| FR-07.6 | Write-off with reason (owner only) | unit | `npx vitest run src/__tests__/debts.test.ts -t "write-off"` | No - Wave 0 |
| FR-08.1 | Create partial payment | unit | `npx vitest run src/__tests__/debts.test.ts -t "create payment"` | No - Wave 0 |
| FR-08.4 | Owner payment auto-confirmed | unit | `npx vitest run src/__tests__/debts.test.ts -t "owner payment"` | No - Wave 0 |
| FR-08.5 | Collaborator payment pending | unit | `npx vitest run src/__tests__/debts.test.ts -t "collaborator payment"` | No - Wave 0 |
| FR-08.6 | Overpayment prevention | unit | `npx vitest run src/__tests__/debts.test.ts -t "overpayment"` | No - Wave 0 |
| FR-08.7 | SELECT FOR UPDATE on approval | unit | `npx vitest run src/__tests__/debts.test.ts -t "concurrent"` | No - Wave 0 |
| D-10 | Write-off reversible (reopen) | unit | `npx vitest run src/__tests__/debts.test.ts -t "reopen"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && npx vitest run src/__tests__/debts.test.ts`
- **Per wave merge:** `cd backend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/__tests__/debts.test.ts` -- covers FR-07.x, FR-08.x, D-10
- [ ] Test patterns follow existing `transactions.test.ts` (vi.hoisted mocks, supertest, makeToken helper)

## Common Integration Points

### Backend Integration
1. **app.ts** -- mount debtsRouter at `/api/v1/debts` with authenticate + requireTenant + requireRole('owner', 'collaborator', 'viewer')
2. **portal.ts** -- add `GET /debts/:id` endpoint returning debt detail with payments and documents (no internalNotes join)
3. **notifications.ts** -- notification list query needs to handle entityType='payment' (currently only joins transactions). Either update the existing query or keep payment notifications simple (no transaction join for payment entities).

### Frontend Integration
1. **App.tsx** -- add `/debts/:id` route inside ProtectedRoute and `/portal/debts/:id` inside ClientRoute
2. **DebtCard.tsx** -- add Link navigation to `/debts/:id`
3. **PortalPage.tsx** -- DebtCards need Link navigation to `/portal/debts/:id`
4. **Cache invalidation** -- after payment mutation, invalidate `['debt', debtId]`, `['clientDebts', clientId]`, `['portalDebts']`, `['portalSummary']`, `['notifications']`

### Notification System Extension
The existing notifications.ts query joins only the transactions table. For payment notifications (entityType='payment'), the JOIN will fail to find a matching transaction row. Options:
1. **LEFT JOIN payments table** when entityType='payment' (adds complexity to existing query)
2. **Store debt/transaction reference in notification metadata** (simpler, no query changes)
3. **Use entity_type 'payment' with entityId pointing to the payment, and include debtId + transactionRef in a metadata JSON column** (most flexible)

Recommendation: Option 2 or 3. The notification list endpoint is already established; modifying its JOIN logic is riskier than adding context via metadata.

## Open Questions

1. **Notification display for payment entities**
   - What we know: Current notification query joins transactions table via entityId. Payment notifications have entityType='payment' and entityId=paymentId.
   - What's unclear: How to display payment notifications in the existing notification list without breaking the transaction JOIN.
   - Recommendation: Store payment context (debtId, amount, clientName) in the existing `metadata` column (notifications table doesn't have this, but we can add to the display text via action naming like 'payment_submitted'). Alternatively, the notification list query can conditionally JOIN based on entityType. Planner should decide which approach.

2. **Debt status reversion on payment rejection**
   - What we know: When a confirmed payment is rejected (if that's even allowed), the debt status should revert.
   - What's unclear: Can confirmed payments be rejected? The CONTEXT.md discusses approval of pending payments but not reversal of confirmed ones.
   - Recommendation: Only pending_approval payments can be rejected. Confirmed payments are permanent (no undo). This matches the transaction pattern where approved transactions cannot be "unapproved."

## Sources

### Primary (HIGH confidence)
- `backend/src/routes/transactions.ts` -- approval workflow pattern, toCents/fromCents, notification creation, file upload handling
- `backend/src/db/schema.ts` lines 229-295 -- debts and payments table definitions
- `backend/src/db/schema.ts` lines 422-448 -- debtBalances view definition
- `backend/src/routes/portal.ts` -- portal query pattern, structural guard against internalNotes
- `frontend/src/components/transactions/FileAttachmentSection.tsx` -- reusable file upload component
- `frontend/src/pages/transactions/TransactionDetailPage.tsx` -- stacked section layout pattern
- `frontend/src/api/transactions.ts` -- FormData upload pattern with headers: {} override
- `.planning/phases/06-debt-payment-tracking/06-CONTEXT.md` -- all 14 locked decisions

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` FR-07, FR-08, FR-09 -- requirement specifications
- `backend/src/__tests__/transactions.test.ts` -- test pattern (vi.hoisted mocks, supertest)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in prior phases
- Architecture: HIGH -- all patterns directly mirror established transaction approval flow
- Pitfalls: HIGH -- derived from concrete code analysis and known float/concurrency issues

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- no external dependencies or version concerns)
