# Feature Landscape: Debt Tracker SaaS

**Domain:** B2B debt/invoice tracking with proof documents and client portal
**Researched:** 2026-03-29
**Overall confidence:** MEDIUM-HIGH (core patterns HIGH via official docs; edge cases MEDIUM via multiple sources)

---

## 1. Receipt / Invoice Data Model — What Fields Get Missed

### Minimum Viable Fields (obvious)

Most developers include: `id`, `client_id`, `description`, `total_amount`, `amount_paid`, `created_at`.

### Fields That Production Apps Always Have (and v1 builds miss)

| Field | Type | Why It Gets Missed | Why It Matters |
|-------|------|--------------------|----------------|
| `reference_number` | `VARCHAR` | Seems optional | Clients dispute "I paid invoice #123" — without it, you can't reference the specific document in conversation or in court |
| `due_date` | `DATE` | Not enforced in v1 | Without it you cannot calculate days overdue for reports; adds aging analysis later |
| `voided_at` | `TIMESTAMP NULL` | Devs use soft delete instead | Soft delete is wrong for financial records — voided invoices must remain visible with a VOIDED status; numbering sequence must be preserved |
| `voided_by` | `UUID FK` | Goes with `voided_at` | Audit: who voided it and when |
| `void_reason` | `TEXT NULL` | Forgotten | Legal protection — "what was the error?" |
| `internal_notes` | `TEXT NULL` | Only one notes field is built | Internal notes (owner sees) vs. client-visible notes are different fields; mixing them is a privacy bug |
| `client_notes` | `TEXT NULL` | Same as above | What the client sees on their portal view of this transaction |
| `currency_code` | `CHAR(3)` | "We're single currency" | Even single-currency apps need the column — migration to multi-currency later requires it on every money row; defaults to company setting |
| `tax_amount` | `NUMERIC(12,2)` | Out of scope | Tax-inclusive totals without a separate tax field make reconciliation impossible later |
| `discount_amount` | `NUMERIC(12,2)` | Not in MVP | Common for distributor clients who get negotiated discounts; retroactively adding it breaks existing totals |
| `line_items` | `JSONB` | Stored as flat total only | Snapshot the line items at creation time — product prices change; the invoice must reflect the price at time of sale |
| `delivered_at` | `TIMESTAMP NULL` | Not considered | For a battery distributor, proof of delivery date is legally different from invoice date |
| `created_by` | `UUID FK` | Only `owner_id` is stored | Collaborators create transactions — you need to know who created it, not just who owns the company |
| `approved_by` | `UUID FK NULL` | Collaborator flow is pending | Null until an owner approves the record; required for approval trail |
| `approved_at` | `TIMESTAMP NULL` | Same | Timestamp of approval; null means still pending |

### Data Model Sketch

```
transactions
  id                  UUID PK
  tenant_id           UUID FK (companies)
  client_id           UUID FK (clients)
  reference_number    VARCHAR(50) UNIQUE per tenant   -- e.g. TXN-2025-0042
  description         TEXT
  delivered_at        TIMESTAMP NULL
  currency_code       CHAR(3) DEFAULT company.currency
  subtotal_amount     NUMERIC(12,2)
  discount_amount     NUMERIC(12,2) DEFAULT 0
  tax_amount          NUMERIC(12,2) DEFAULT 0
  total_amount        NUMERIC(12,2) GENERATED         -- subtotal - discount + tax
  initial_payment     NUMERIC(12,2) DEFAULT 0
  line_items          JSONB                           -- snapshot at creation
  internal_notes      TEXT NULL                       -- owner/team only
  client_notes        TEXT NULL                       -- visible in client portal
  status              ENUM(draft,pending_approval,active,voided,written_off)
  created_by          UUID FK (users)
  approved_by         UUID FK NULL (users)
  approved_at         TIMESTAMP NULL
  voided_by           UUID FK NULL (users)
  voided_at           TIMESTAMP NULL
  void_reason         TEXT NULL
  created_at          TIMESTAMP
  updated_at          TIMESTAMP

debts
  id                  UUID PK
  transaction_id      UUID FK
  tenant_id           UUID FK
  client_id           UUID FK
  original_amount     NUMERIC(12,2)                  -- amount owed at creation
  status              ENUM(open,partially_paid,fully_paid,written_off)
  due_date            DATE NULL
  created_at          TIMESTAMP
  updated_at          TIMESTAMP

payments
  id                  UUID PK
  debt_id             UUID FK
  tenant_id           UUID FK
  amount              NUMERIC(12,2)
  paid_at             TIMESTAMP                      -- actual payment date (may differ from created_at)
  method              VARCHAR(50) NULL               -- cash, transfer, check
  reference           VARCHAR(100) NULL              -- bank ref number, transfer ID
  notes               TEXT NULL
  created_by          UUID FK (users)
  approved_by         UUID FK NULL (users)
  approved_at         TIMESTAMP NULL
  created_at          TIMESTAMP
```

**Key insight:** `paid_at` and `created_at` on payments are different fields. A collaborator may record a payment two days after the client actually paid. The date the payment actually occurred matters for accounting; `created_at` is when the system record was made.

---

## 2. Debt / Payment State Machine

### Stripe's Verified Invoice States (HIGH confidence — official docs)

```
DRAFT ──────────────────────────────► (DELETED)
  │
  ▼ finalize
OPEN ──── payment success ──────────► PAID
  │
  ├── mark uncollectible ────────────► UNCOLLECTIBLE ──── payment ──► PAID
  │                                           │
  │                                           └── void ──────────────► VOID
  │
  └── void ───────────────────────────────────────────────────────────► VOID
```

### Extended State Machine for This App (Collaborator Approval Layer)

The PROJECT.md adds a layer Stripe does not have: collaborator submissions that require owner approval before they take effect. This creates a `pending_approval` state that sits before `active`.

```
[TRANSACTION]
  DRAFT (collaborator composing)
    │
    ├── collaborator submits ──────► PENDING_APPROVAL
    │                                     │
    │                                     ├── owner approves ──► ACTIVE
    │                                     │                         │
    │                                     └── owner rejects ──► DRAFT (returned with rejection note)
    │
    └── owner creates directly ─────────────────────────────► ACTIVE

  ACTIVE
    ├── void (error) ──────────────────────────────────────► VOIDED
    └── write off (uncollectible) ────────────────────────► WRITTEN_OFF

[DEBT] (auto-created when initial_payment < total_amount)
  OPEN
    ├── partial payment recorded ──────────────────────────► PARTIALLY_PAID
    │     (and new payment logged to payments table)
    ├── all remaining balance paid ────────────────────────► FULLY_PAID
    └── owner writes off ──────────────────────────────────► WRITTEN_OFF

  PARTIALLY_PAID
    ├── more payments ─────────────────────────────────────► PARTIALLY_PAID (stays)
    ├── remaining balance paid ────────────────────────────► FULLY_PAID
    └── owner writes off ──────────────────────────────────► WRITTEN_OFF

[PAYMENT] (individual payment records against a debt)
  PENDING_APPROVAL (if created by collaborator)
    ├── owner approves ─────────────────────────────────────► CONFIRMED
    │     (then: debt balance recalculated)
    └── owner rejects ──────────────────────────────────────► REJECTED
          (debt balance unchanged; collaborator notified)

  CONFIRMED
    └── (immutable — cannot be deleted, only void via new transaction)
```

### Critical: Payment Approval Affects Debt Balance

A payment submitted by a collaborator must NOT reduce the debt balance until it is approved. If a collaborator records "client paid $500" and the owner sees a PARTIALLY_PAID status before approving, the debt balance appears reduced when it has not been confirmed. This is the most common approval-workflow bug.

**Strict (correct) pattern:** Debt balance = SUM of `confirmed` payments only. Pending payments show as "awaiting confirmation" in UI but do not affect the computed balance.

**Optimistic (incorrect for finance):** Balance reduced immediately on submission, rolled back on rejection. Confusing to all parties and legally problematic.

### States to Track on Each Table

| Record | States |
|--------|--------|
| Transaction | `draft`, `pending_approval`, `active`, `voided`, `written_off` |
| Debt | `open`, `partially_paid`, `fully_paid`, `written_off` |
| Payment | `pending_approval`, `confirmed`, `rejected` |

---

## 3. Client Portal — What Clients Expect

### Table Stakes (Missing = Clients Stop Trusting the Portal)

| Feature | Why Clients Expect It | Trust Impact |
|---------|-----------------------|--------------|
| Current balance prominently displayed | They want to know the number without hunting | HIGH — first thing they look for |
| Full payment history with dates and amounts | They need to reconcile with their own records | HIGH — they will dispute without this |
| Transaction-level breakdown | "What is this $1,200 for?" | HIGH — generic totals are unacceptable |
| Download/print view of each invoice | They may need it for their own accounting | MEDIUM |
| Proof documents viewable | They want to see the photo of their delivery receipt | HIGH for this use case (battery distributor) |
| Their own notes are visible | `client_notes` field must appear on their view | MEDIUM |

### Trust Signals That Are Easy to Miss

1. **Reference numbers on every record.** Clients need to say "invoice TXN-2025-0042" not "that invoice from October." Without reference numbers, disputes are unresolvable.

2. **"As of [date]" timestamp on balance.** Showing a balance without a date looks like it might be stale. Always show "Balance as of March 29, 2026" — even if it's live data.

3. **Pending payments shown separately.** If the client made a payment and the collaborator has not yet confirmed it, the client sees no change in their balance and thinks something is wrong. Show pending payments as "Awaiting confirmation" with the amount and date so they know their payment was received.

4. **Payment method shown on history.** "Paid $500 (bank transfer · Ref: TRF-88821)" is far more trustworthy than "Paid $500." Even a free-text method field matters.

5. **Proof documents attached to payments.** When a client's transfer screenshot is attached to the payment record, they can see their own evidence is on file. This closes the most common dispute loop.

6. **Last login shown to client.** Not critical but shows the system is tracking their access, which discourages "I never saw this" claims.

### What to NOT Show Clients

- `internal_notes` — obvious but easy to accidentally expose in an API response
- Other clients' data — multi-tenant isolation must be enforced at the query level, not just the UI layer
- Rejected collaborator submissions — clients should never see the internal approval workflow
- User IDs / internal system identifiers

---

## 4. Approval Workflow Patterns

### Pattern Recommendation: Strict with Visible Pending State

For financial records, the "optimistic" pattern (record takes effect immediately, rolled back on rejection) is wrong. Use the strict pattern:

```
Collaborator creates → status=pending_approval → owner reviews → approve/reject
                                                               ↓
                                              status=active / status=draft+notification
```

**During pending state:**
- Record IS visible to the owner (they need to see it to approve)
- Record is NOT visible to clients (unconfirmed data)
- Record IS visible to collaborators with a "pending" badge
- Record does NOT affect any computed balances or totals
- Record does NOT appear in reports

### Fields Required for the Approval Trail

Every approvable record needs:

```sql
submitted_by    UUID FK NOT NULL  -- who created it
submitted_at    TIMESTAMP NOT NULL
approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
reviewed_by     UUID FK NULL      -- who approved or rejected
reviewed_at     TIMESTAMP NULL
rejection_note  TEXT NULL         -- required when rejecting
```

### Rejection UX Pattern

When an owner rejects, they should be required to provide a `rejection_note`. The collaborator sees:
- "Your submission for TXN-2025-0042 was rejected"
- Rejection reason text
- The record is returned to `draft` status, editable by the collaborator
- No new record is created — the original draft is reused

This avoids duplicate record proliferation (a common bug when each rejection creates a new "corrected" submission).

### Notification Requirements

The in-app notification center (specified in PROJECT.md) needs these events:

| Event | Who Notified |
|-------|-------------|
| Collaborator submits transaction | Owner |
| Collaborator submits payment | Owner |
| Owner approves transaction | Collaborator (submitter) |
| Owner rejects transaction | Collaborator (submitter) with reason |
| Owner approves payment | Collaborator (submitter) |
| Owner rejects payment | Collaborator (submitter) with reason |

Viewer and Client roles never receive approval notifications.

---

## 5. Proof Document Handling

### File Format Realities (MEDIUM confidence — multiple sources)

The tricky case is **iOS HEIC format**. iPhones default to HEIC since iOS 11, but no browser besides Safari natively renders HEIC. The browser `<input type="file" accept="image/*">` will deliver a `.heic` file when the user selects from their photo library rather than using the live camera.

**Recommended strategy:**

```
Accept: JPEG, PNG, WEBP, PDF, HEIC
Server-side: convert HEIC → JPEG on ingest using sharp (Node.js)
Client-side: never attempt HEIC conversion in browser (heic2any is 2.7MB)
```

### Size and Compression

| Scenario | Recommended Limit | Rationale |
|----------|-------------------|-----------|
| Photo (camera capture) | 10 MB raw, compress to 2 MB | Field photos from high-res phones are large; compress before storage |
| PDF (scanned document) | 20 MB | Multi-page scans can be large |
| Total per transaction | 50 MB | Prevents storage abuse |

**Client-side compression before upload (HIGH confidence — MDN + Cloudinary docs):**

```
getUserMedia/input → FileReader → Canvas.drawImage → Canvas.toBlob(JPEG, 0.8) → upload
```

EXIF orientation must be read and corrected before canvas draw. Use `exif-js` or the `image-orientation: from-image` CSS property. Without this, portrait photos appear rotated 90 degrees.

**OffscreenCanvas + Web Worker** reduces main-thread blocking for high-res images. Available in all modern browsers. Use for files over 3MB.

### Storage Path Convention (file-on-disk model)

```
/storage/{tenant_id}/{year}/{month}/{record_type}/{record_id}/{filename}
```

Never store the raw filename from the user — generate a UUID filename to prevent path traversal. Store the original filename in the database only:

```sql
proof_documents
  id              UUID PK
  tenant_id       UUID FK
  record_type     VARCHAR(50)   -- 'transaction' | 'payment'
  record_id       UUID FK
  original_name   VARCHAR(255)  -- user's filename, display only
  stored_name     VARCHAR(255)  -- UUID.ext, actual file on disk
  mime_type       VARCHAR(100)
  file_size       INTEGER       -- bytes
  width_px        INTEGER NULL  -- for images
  height_px       INTEGER NULL
  uploaded_by     UUID FK (users)
  uploaded_at     TIMESTAMP
```

### In-App Display

- **Images:** serve via a signed/auth-gated URL — never public paths to `/storage/...`
- **PDFs:** use `<iframe>` or `<embed>` for in-browser preview; also provide download link
- **Thumbnails:** generate a 200px thumbnail at upload time (sharp); avoids loading 3MB images in a list view
- **Mobile camera:** `<input type="file" accept="image/*" capture="environment">` opens the rear camera directly on mobile. Do NOT use `getUserMedia` as the primary path — iOS Safari support is partial and inconsistent.

---

## 6. Audit Trail

### What to Log (HIGH confidence — bill.com + HubiFi + financial compliance standards)

Every financial mutation needs a log entry with this shape:

```sql
audit_logs
  id          UUID PK
  tenant_id   UUID FK
  actor_id    UUID FK (users)         -- who did it
  actor_role  VARCHAR(50)             -- owner | collaborator | system
  action      VARCHAR(100)            -- see table below
  entity_type VARCHAR(50)             -- transaction | debt | payment | client | user | document
  entity_id   UUID                    -- which record
  field       VARCHAR(100) NULL       -- which field changed (for UPDATE events)
  old_value   TEXT NULL               -- previous value (serialize to string)
  new_value   TEXT NULL               -- new value
  ip_address  INET NULL
  user_agent  TEXT NULL
  metadata    JSONB NULL              -- any extra context
  created_at  TIMESTAMP NOT NULL      -- NEVER updated, NEVER deleted
```

**This table is append-only. No UPDATE. No DELETE. Only INSERT.**

### Required Events to Log

| Action | Entity Type | Required Fields |
|--------|-------------|----------------|
| `transaction.created` | transaction | new_value = full snapshot |
| `transaction.submitted_for_approval` | transaction | actor = collaborator |
| `transaction.approved` | transaction | actor = owner |
| `transaction.rejected` | transaction | actor = owner; new_value = rejection_note |
| `transaction.voided` | transaction | old_value = active; new_value = voided; field = void_reason |
| `transaction.written_off` | transaction | — |
| `debt.created` | debt | new_value = original_amount |
| `debt.status_changed` | debt | field = status; old_value; new_value |
| `payment.created` | payment | new_value = amount + paid_at |
| `payment.submitted_for_approval` | payment | — |
| `payment.approved` | payment | actor = owner |
| `payment.rejected` | payment | actor = owner; new_value = reason |
| `document.uploaded` | document | new_value = filename + size |
| `document.deleted` | document | old_value = filename |
| `client.created` | client | new_value = name + contact |
| `client.updated` | client | field = which field; old/new |
| `user.invited` | user | — |
| `user.role_changed` | user | field = role; old/new |
| `user.login` | user | ip_address; user_agent |
| `user.login_failed` | user | ip_address |

### What NOT to Log

- Reads / views (performance cost, low value for disputes — do log if compliance required)
- Health checks, API polls, background jobs that make no state changes
- Sensitive PII in `old_value`/`new_value` — mask phone numbers, emails to first 3 chars

### Immutability in PostgreSQL

Enforce at the database level, not just the application layer:

```sql
-- Revoke UPDATE and DELETE from the application role
REVOKE UPDATE, DELETE ON audit_logs FROM app_user;

-- Only INSERT is allowed
GRANT INSERT, SELECT ON audit_logs TO app_user;
```

The application should never be able to modify audit records even through a bug.

### Retention

Minimum: keep all audit logs for the lifetime of the tenant account plus 3 years after account closure. This covers typical contract dispute windows in most jurisdictions.

---

## Table Stakes (Missing = Product Feels Incomplete)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Reference numbers on all records | Clients and owners need to reference specific items in communication | Low | Sequential per tenant: TXN-2025-NNNN |
| Voided state distinct from delete | Financial records must not be deleted | Low | Use `status=voided`; preserve record |
| Confirmed vs pending payment balance | Cannot show wrong balance to client | Medium | Sum only confirmed payments in balance calc |
| `paid_at` separate from `created_at` on payments | Payment date differs from recording date | Low | Two columns required |
| `internal_notes` vs `client_notes` | Privacy — mixing them is a data leak | Low | Two separate text columns |
| HEIC image support | iOS default photo format | Medium | Server-side conversion via sharp |
| EXIF orientation correction | Portrait photos display sideways without it | Low | exif-js or CSS `image-orientation` |
| Thumbnail generation at upload | List views loading full-res images are unusable on mobile | Medium | sharp at upload time |
| Append-only audit log | Legal protection, dispute resolution | Medium | Separate table, no UPDATE/DELETE permission |
| "Pending" badge on unconfirmed submissions | Collaborators and owners need to know what's unreviewed | Low | UI + query filter on `approval_status` |

## Differentiators (Not Expected, But Valuable)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "As of [date]" on balance displays | Makes the number feel authoritative, not stale | Low | Always render timestamp next to any total |
| Pending payments shown separately in client portal | Closes "I paid but balance didn't change" dispute loop | Low | Separate query for pending vs confirmed |
| Payment method + reference on each payment | "transfer · Ref TRF-88821" vs just "$500" | Low | Two optional text fields |
| Photo proof visible to client on their own payments | Client can see their own evidence is on file | Low | Gate by `record_type = 'payment' AND client_id` |
| Delivery date separate from invoice date | Critical for goods businesses like battery distributors | Low | `delivered_at` column on transactions |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Deleting financial records | Destroys audit trail; illegal in some jurisdictions | Use `voided` or `written_off` status |
| Optimistic approval (balance updates on submit) | Shows clients incorrect balance; legally problematic | Strict approval: balance updates only on confirm |
| Storing raw user filename as disk path | Path traversal vulnerability | Generate UUID filename; store original name in DB |
| Single `notes` field | Creates privacy bug when client portal is added | Separate `internal_notes` and `client_notes` from day one |
| Hard-coding currency symbol in display | Migration to multi-currency is impossible without it | Store `currency_code CHAR(3)` on every money row |
| Public URLs for proof documents | Any URL can be shared/scraped | Serve through auth-gated endpoint |
| Client-side HEIC conversion | heic2any is 2.7 MB; slow on old phones | Convert server-side with sharp |

## Feature Dependencies

```
Reference numbers → Dispute resolution
Approval workflow states → Correct balance calculation → Client portal trust
Proof document upload → HEIC handling → EXIF correction → Thumbnail generation
Audit log → Immutability enforcement (DB-level, not app-level)
Client portal → internal_notes / client_notes separation (day-1 schema requirement)
Payment.paid_at → Accurate payment history in reports
Void status → Invoice numbering sequence preservation
```

## MVP Recommendation

**Must have in Phase 1 (schema decisions that cannot be changed later without migrations):**

1. `reference_number` on transactions — add the column and sequence generator before any data is created
2. `internal_notes` AND `client_notes` as separate columns — retrofitting this requires touching every API response and UI component
3. `currency_code` on all money rows — defaults to company setting, but the column must exist
4. `paid_at` separate from `created_at` on payments — schema-level decision
5. `approval_status`, `submitted_by`, `approved_by`, `approved_at` on transactions AND payments — approval workflow must be baked into the data model from the start
6. `voided_at` / `void_reason` / `voided_by` on transactions — no DELETE on financial records, ever
7. Audit log table with DB-level INSERT-only enforcement

**Can defer to Phase 2:**
- Thumbnail generation (serve full images until it's a performance problem)
- HEIC conversion (acceptable to reject HEIC files in v1 with a clear error message)
- "As of date" UX refinements
- Pending payments in client portal (show confirmed only in v1)

---

## Legal / Compliance Flags

| Risk | Area | Mitigation |
|------|------|------------|
| CRITICAL | Allowing DELETE on financial records | Never allow hard delete on transactions, debts, payments. Use void/write-off. |
| HIGH | Showing unconfirmed payment balance to client | Strict approval pattern; compute balance from confirmed only |
| HIGH | Proof document accessible via public URL | All document endpoints must check `tenant_id` and session |
| MEDIUM | No audit trail on balance changes | Audit log required from day 1; log every debt status transition |
| MEDIUM | `internal_notes` leaking to client portal | Enforce in API layer AND in DB-level views; never return this field on client-scoped endpoints |
| LOW | Missing `paid_at` means disputes about when payment occurred | Two-column date pattern; `paid_at` is user-provided, `created_at` is system |

---

## Sources

- [Stripe Invoice Status Transitions (official docs)](https://docs.stripe.com/invoicing/integration/workflow-transitions) — HIGH confidence
- [Zoho Billing: Void vs Write-Off (official docs)](https://www.zoho.com/us/billing/kb/invoices/what-is-void-writeoff.html) — HIGH confidence
- [Schema.org Invoice Schema (official)](https://schema.org/Invoice) — HIGH confidence
- [bill.com: Audit Trails for Financial Apps](https://www.bill.com/learning/audit-trails) — MEDIUM confidence
- [HubiFi: Audit Trail SaaS Platform Guide](https://www.hubifi.com/blog/audit-trail-saas-platform) — MEDIUM confidence
- [Cloudinary: Image Compression Best Practices](https://cloudinary.com/guides/image-effects/best-ways-to-compress-images-before-upload-in-javascript) — HIGH confidence
- [MDN: Taking Photos with getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Taking_still_photos) — HIGH confidence
- [HEIC Web Rendering (DEV Community)](https://dev.to/upsidelab/rendering-heic-on-the-web-how-to-make-your-web-app-handle-iphone-photos-pj1) — MEDIUM confidence
- [Cflow: Approval Workflow Design Patterns](https://www.cflowapps.com/approval-workflow-design-patterns/) — MEDIUM confidence
- [Assembly: Client Portal Best Practices](https://assembly.com/blog/client-portal-best-practices) — MEDIUM confidence
- [HubiFi: Immutable Audit Trails](https://www.hubifi.com/blog/immutable-audit-log-basics) — MEDIUM confidence
- [AppMaster: Tamper-Evident Audit Trails in PostgreSQL](https://appmaster.io/blog/tamper-evident-audit-trails-postgresql) — MEDIUM confidence
- [Invoicera: Partial Payment Handling](https://www.invoicera.com/blog/business-operations/how-to-handle-partial-payments-on-invoices/) — MEDIUM confidence
