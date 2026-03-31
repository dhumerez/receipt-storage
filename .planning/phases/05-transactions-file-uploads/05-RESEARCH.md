# Phase 5: Transactions & File Uploads — Research

**Researched:** 2026-03-31
**Domain:** Multer 2.x file upload pipeline, sharp HEIC conversion, react-dropzone 15, Drizzle SELECT FOR UPDATE, approval workflow
**Confidence:** HIGH (stack verified, versions confirmed, patterns cross-checked with existing codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Transaction Creation Form**
- D-01: Full page at `/transactions/new` — NOT a modal
- D-02: Form sections top-to-bottom: client selector, delivery date, description, line items builder, initial payment amount, client notes, internal notes, attachments
- D-03: Single "Save Transaction" submit — files uploaded atomically with the transaction, no two-step save-then-attach
- D-04: Cancel button reads "Discard Changes"

**Line Item Builder**
- D-05: Two explicit buttons: `[+ Catalog]` and `[+ Free-form]`
- D-06: `[+ Catalog]` opens mini picker modal — searchable by name, each row shows name + unit price + unit; clicking adds pre-filled row (snapshot of catalog price, editable after selection)
- D-07: `[+ Free-form]` adds blank row with empty name, qty, unit price fields
- D-08: Row columns: Name (read-only for catalog, editable for free-form), Qty, Unit Price, Line Total (computed read-only), [×] remove

**File Upload UX**
- D-09: Inline attachments at bottom of `/transactions/new`; react-dropzone 15.0.0 drop zone + two separate buttons: "Take Photo" (camera) and "Choose from Gallery" (no capture attribute)
- D-10: Files staged locally, submitted in single multipart request with form
- D-11: Thumbnails (images) or file icon + name (PDFs) with [×] remove per file

**Approval Notification Center**
- D-12: Bell icon in AppLayout header with unread count badge; visible every page
- D-13: Right-side slide-out panel (not separate page); shows reference number, client name, total, submitter
- D-14: `[Approve]` and `[Reject]` inline in each panel item — no navigation required
- D-15: Reject requires reason — inline text input on Reject click with "Confirm Reject" button
- D-16: Collaborator bell shows their own submissions and current status

**Transaction List Page**
- D-17: `/transactions` — same table + filter pattern as clients and products; all roles see all transactions
- D-18: Columns: Reference #, Client, Total, Initial Payment, Status (badge), Delivered At, Submitted By
- D-19: Filters: client (dropdown/search), status (All / Pending / Active / Voided), date range (delivered_at)
- D-20: Row click navigates to `/transactions/:id`

**Transaction Detail Page**
- D-21: Single-scroll page at `/transactions/:id` with stacked sections: header, line items table, payment summary, attachments thumbnail grid, notes

**Non-negotiable behaviors**
- Two-button file UX per FR-06.3: "Take Photo" uses `capture="environment"`, "Choose from Gallery" uses standard file input; both always shown
- Line item unit price snapshotted at creation — catalog price changes do NOT affect existing transactions (FR-05.3)
- Collaborator submissions → `pending_approval`; owner-created → `active`; enforced server-side from `req.user.role`, never trusted from client
- Reject reason required — enforced at API level

### Claude's Discretion
- Transaction list empty state — standard EmptyState component pattern
- Loading skeletons on list and detail pages
- Toast/success notification after transaction saved
- Bell icon position in header (left vs right of user menu)
- Slide-out panel animation style

### Deferred Ideas (OUT OF SCOPE)
None raised during discussion.
</user_constraints>

---

## Summary

Phase 5 is the core value loop: transactions with line items, file attachments, and an approval workflow. The backend has five main concerns: (1) reference number generation via the existing `company_counters` table, (2) atomic transaction creation with line items and documents in a single DB transaction, (3) multer 2.1.1 + sharp 0.34.5 file processing pipeline with HEIC support requiring a Dockerfile base image change, (4) SELECT FOR UPDATE for race-safe approval, and (5) a notifications API consumed by the bell icon.

The frontend has three main concerns: (1) the `/transactions/new` full-page form with line item builder and inline file attachment, (2) the bell + slide-out notification center in AppLayout, and (3) the filterable transaction list and detail pages.

**The single highest-risk item is HEIC support in Docker.** Sharp's prebuilt binaries do NOT include HEIC/libheif support. The current Dockerfile uses `node:22-alpine`; HEIC support requires either switching to `node:22-bookworm-slim` and installing system libvips from source with `libheif-dev`, or accepting that HEIC uploads will fail silently in production. The plan must allocate a dedicated task for this Dockerfile change.

**Primary recommendation:** Implement in five plans (API → upload middleware → create form UI → approval UI → list+detail), with Dockerfile HEIC setup as the first task in the upload middleware plan.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| multer | 2.1.1 | Multipart/form-data parsing, file buffering | Express-maintained; memoryStorage gives buffer for sharp pipeline |
| @types/multer | 2.1.0 | TypeScript types for multer | Current; verified npm view |
| sharp | 0.34.5 | HEIC→JPEG conversion, EXIF orientation fix, resize/compress | Fastest Node image processing; libvips-backed |
| file-type | 22.0.0 | Magic byte validation (beyond MIME header) | Pure magic-byte detection; ESM-only package |
| react-dropzone | 15.0.0 | Drag-and-drop zone + file picker in one hook | Locked in requirements (FR-06.2, ROADMAP) |
| uuid | (Node built-in crypto) | UUID filename generation | Use `crypto.randomUUID()` — no extra dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | 0.45.2 | SELECT FOR UPDATE via `.for('update')` | Already installed; pinned — do not upgrade |
| zod | 4.3.6 | Transaction/approval request validation | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| multer memoryStorage | diskStorage | diskStorage writes to temp files; memoryStorage is cleaner for sharp pipeline at ≤10MB files |
| sharp | heic-convert (npm) | heic-convert is JS-only, much slower; sharp via custom libvips is the production path |
| file-type | mime npm package | mime checks extension/header only; file-type does magic bytes — required by FR-06.7 |

**Installation:**
```bash
# Backend
npm install multer@2.1.1 sharp@0.34.5
npm install --save-dev @types/multer@2.1.0
npm install file-type@22.0.0

# Frontend
npm install react-dropzone@15.0.0
```

**Version verification:** All versions confirmed against npm registry on 2026-03-31.
- multer: 2.1.1 (current) — published 2025
- sharp: 0.34.5 (current) — published 2025
- file-type: 22.0.0 (current)
- react-dropzone: 15.0.0 (current)

---

## Architecture Patterns

### Recommended Project Structure (additions to existing)
```
backend/src/
├── routes/
│   ├── transactions.ts     # Transaction CRUD + approval endpoints
│   └── files.ts            # Authenticated file serving GET endpoint
├── middleware/
│   └── upload.ts           # multer config + sharp pipeline + file-type validation
├── services/
│   └── upload.service.ts   # processFile(buffer, originalname, mimetype) → writes to disk
├── __tests__/
│   ├── transactions.test.ts
│   └── upload.test.ts

frontend/src/
├── api/
│   └── transactions.ts     # API client functions
├── pages/transactions/
│   ├── TransactionsPage.tsx         # List page
│   ├── NewTransactionPage.tsx       # Full-page create form
│   └── TransactionDetailPage.tsx   # Detail page
├── components/transactions/
│   ├── LineItemBuilder.tsx          # Row-based line items + two add buttons
│   ├── CatalogPickerModal.tsx       # Mini picker modal for catalog items
│   ├── FileAttachmentSection.tsx    # Drop zone + Take Photo + Gallery buttons
│   └── TransactionTable.tsx        # Table for list page
└── components/layout/
    └── NotificationBell.tsx         # Bell icon + slide-out panel
```

### Pattern 1: Reference Number Generation (company_counters)
**What:** Per-company, per-year sequential reference numbers in the format `TXN-YYYY-NNNN`. The `company_counters` table already exists with a `(companyId, year)` unique key.
**When to use:** Every new transaction creation.
**Implementation:** Run inside the same `db.transaction()` as the transaction INSERT, using SELECT FOR UPDATE on the counter row to prevent concurrent sequence gaps.

```typescript
// Source: existing schema.ts company_counters table + PostgreSQL INSERT...ON CONFLICT
async function nextReferenceNumber(tx: typeof db, companyId: string): Promise<string> {
  const year = new Date().getFullYear();

  // Upsert counter with lock to prevent concurrent duplicates
  await tx
    .insert(companyCounters)
    .values({ companyId, year, lastSequence: 1 })
    .onConflictDoUpdate({
      target: [companyCounters.companyId, companyCounters.year],
      set: { lastSequence: sql`${companyCounters.lastSequence} + 1` },
    });

  const [row] = await tx
    .select({ lastSequence: companyCounters.lastSequence })
    .from(companyCounters)
    .where(and(eq(companyCounters.companyId, companyId), eq(companyCounters.year, year)));

  const seq = String(row.lastSequence).padStart(4, '0');
  return `TXN-${year}-${seq}`;
}
```

### Pattern 2: Atomic Transaction Creation
**What:** Create transaction + line items + debt (if applicable) + notifications + audit log in a single `db.transaction()`.
**When to use:** POST `/api/v1/transactions`
**Key invariant:** `totalAmount = SUM(lineItems.lineTotal)` computed server-side — never trusted from client.

```typescript
// Source: drizzle-orm docs transactions
const result = await db.transaction(async (tx) => {
  const refNum = await nextReferenceNumber(tx, companyId);
  const status = req.user!.role === 'owner' ? 'active' : 'pending_approval';
  const totalAmount = computeTotal(parsedItems); // integer cents math

  const [txn] = await tx.insert(transactions).values({
    companyId, clientId, createdBy: req.user!.sub,
    referenceNumber: refNum, status,
    totalAmount: (totalAmount / 100).toFixed(2),
    initialPayment: (parsedData.initialPayment / 100).toFixed(2),
    description: parsedData.description,
    deliveredAt: parsedData.deliveredAt,
    clientNotes: parsedData.clientNotes,
    internalNotes: parsedData.internalNotes,
  }).returning();

  await tx.insert(transactionItems).values(
    parsedItems.map(item => ({
      transactionId: txn.id,
      productId: item.productId ?? null,
      description: item.description,
      quantity: item.quantity.toFixed(3),
      unitPrice: (item.unitPrice / 100).toFixed(2),
    }))
  );

  // Auto-create debt if owner and balance > 0 (FR-05.5, FR-05.6)
  if (status === 'active' && totalAmount > parsedData.initialPayment) {
    await tx.insert(debts).values({ ... });
  }

  // Notify owner if collaborator submission (FR-09.3)
  if (status === 'pending_approval') {
    await tx.insert(notifications).values({ ... });
  }

  return txn;
});
```

### Pattern 3: multer + sharp Upload Pipeline
**What:** multer buffers the file in memory; sharp processes EXIF/resize/HEIC conversion; file-type validates magic bytes; UUID filename written to disk.
**When to use:** Multer middleware applied to transaction create route (POST `/api/v1/transactions`) and file serving route.

```typescript
// Source: multer README + sharp API docs
import multer from 'multer';
import sharp from 'sharp';

// memoryStorage = file.buffer available for sharp pipeline
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (FR-06.10)
    files: 5,                    // max 5 files (FR-06.10)
  },
  fileFilter(_req, file, cb) {
    // Block SVG (FR-06.12) — MIME header check only (magic byte check done after)
    if (file.mimetype === 'image/svg+xml') {
      cb(null, false);
      return;
    }
    cb(null, true);
  },
}).array('files', 5);

async function processFile(
  buffer: Buffer,
  originalName: string,
  companyId: string,
  entityType: 'transactions' | 'payments',
  entityId: string,
): Promise<{ filePath: string; mimeType: string; sizeBytes: number }> {
  // 1. Magic byte validation (FR-06.7)
  const { fileTypeFromBuffer } = await import('file-type'); // dynamic import: ESM-only
  const detected = await fileTypeFromBuffer(buffer);
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heif', 'application/pdf'];
  if (!detected || !ALLOWED_TYPES.includes(detected.mime)) {
    throw new Error(`Unsupported file type: ${detected?.mime ?? 'unknown'}`);
  }
  // Block SVG — file-type won't detect it (text-based), but belt-and-suspenders check
  if (detected.mime === 'image/svg+xml') {
    throw new Error('SVG uploads are not allowed');
  }

  // 2. Process images through sharp (HEIC→JPEG, EXIF orient, resize)
  let finalBuffer = buffer;
  let finalMime = detected.mime;
  if (detected.mime.startsWith('image/')) {
    finalBuffer = await sharp(buffer)
      .rotate()               // EXIF orientation fix (FR-06.5)
      .resize({ width: 1920, withoutEnlargement: true })  // FR-06.6
      .jpeg({ quality: 85 }) // converts HEIC→JPEG, compresses (FR-06.4)
      .toBuffer();
    finalMime = 'image/jpeg';
  }

  // 3. UUID filename, per-company path (FR-06.8, FR-06.9)
  const ext = finalMime === 'application/pdf' ? 'pdf' : 'jpg';
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dir = path.join(UPLOAD_DIR, companyId, entityType, entityId);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, filename), finalBuffer);

  return {
    filePath: path.join(companyId, entityType, entityId, filename),
    mimeType: finalMime,
    sizeBytes: finalBuffer.length,
  };
}
```

### Pattern 4: Authenticated File Serving
**What:** `GET /api/v1/files/:companyId/:type/:entityId/:filename` verifies JWT, verifies the document belongs to the authenticated user's company, then streams the file.
**When to use:** Every attachment thumbnail/download.

```typescript
// Source: FR-06.11 + existing auth middleware pattern
filesRouter.get('/:companyId/:type/:entityId/:filename', async (req, res) => {
  const { companyId, type, entityId, filename } = req.params;

  // Tenant check: requested companyId must match JWT companyId (NFR-01.3)
  if (companyId !== req.companyId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  // Verify document record exists in DB (prevents IDOR)
  const filePath = path.join(UPLOAD_DIR, companyId, type, entityId, filename);
  // ... DB lookup to confirm document record exists ...

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
});
```

### Pattern 5: SELECT FOR UPDATE for Approval Race Prevention
**What:** Wrap approval in a DB transaction with `.for('update')` on the transaction row to prevent two concurrent approvals creating two debt records.
**When to use:** POST `/api/v1/transactions/:id/approve`

```typescript
// Source: https://github.com/drizzle-team/drizzle-orm/discussions/1337
await db.transaction(async (tx) => {
  // Lock the transaction row — concurrent approval waits
  const [txn] = await tx
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId)))
    .for('update');

  if (!txn || txn.status !== 'pending_approval') {
    throw new Error('Not approvable');
  }

  await tx.update(transactions)
    .set({ status: 'active', approvedBy: req.user!.sub, approvedAt: new Date() })
    .where(eq(transactions.id, id));

  // Create debt only if balance exists (FR-05.5)
  const balance = parseFloat(txn.totalAmount) - parseFloat(txn.initialPayment);
  if (balance > 0) {
    await tx.insert(debts).values({ ... });
  }
});
```

### Pattern 6: Bell Icon Notification Center (React)
**What:** Bell icon component in AppLayout header that polls `/api/v1/notifications/unread-count` (or invalidates on mutation). Slide-out panel with `fixed inset-y-0 right-0` positioning.
**When to use:** AppLayout header — always visible.

```typescript
// Pattern: TanStack Query with short staleTime for near-real-time badge
const { data } = useQuery({
  queryKey: ['notifications', 'unread-count'],
  queryFn: getUnreadCount,
  staleTime: 30_000,   // refresh every 30s on focus
  refetchInterval: 60_000, // background poll every 60s
});
```

### Pattern 7: File Staging in React (react-dropzone + two buttons)
**What:** useDropzone manages the drop zone and file list state. Two separate hidden `<input type="file">` elements — one with `capture="environment"` (camera), one without (gallery). All staged files go into a single `files: File[]` state array submitted in FormData.

```typescript
// Source: react-dropzone 15 README
import { useDropzone } from 'react-dropzone';

const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'application/pdf': ['.pdf'],
};

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: ACCEPTED,
  maxFiles: 5,
  maxSize: 10 * 1024 * 1024,
  onDrop: (accepted) => setFiles(prev => [...prev, ...accepted].slice(0, 5)),
  noClick: true,   // disable click-to-open on the zone (use explicit buttons instead)
});

// Two separate inputs for two-button UX (FR-06.3)
<input
  ref={cameraInputRef}
  type="file"
  accept="image/*"
  capture="environment"
  style={{ display: 'none' }}
  onChange={handleCameraChange}
/>
<input
  ref={galleryInputRef}
  type="file"
  accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
  multiple
  style={{ display: 'none' }}
  onChange={handleGalleryChange}
/>
```

### Pattern 8: Submitting Files with FormData
**What:** Files and JSON data cannot be mixed in a standard `application/json` request. Atomic upload requires `multipart/form-data` with both JSON fields and file buffers.

```typescript
// Submit transaction with files atomically (D-03)
const formData = new FormData();
formData.append('data', JSON.stringify(transactionPayload));
files.forEach(file => formData.append('files', file));

await apiClient('/api/v1/transactions', {
  method: 'POST',
  body: formData,
  // Do NOT set Content-Type — browser sets multipart boundary automatically
  headers: {}, // override apiClient's default application/json
});
```

### Anti-Patterns to Avoid
- **Trusting `Content-Type` from client for file type:** MIME header is user-controlled. Always validate magic bytes server-side after buffering (FR-06.7).
- **Using `req.body` for companyId in upload routes:** Even in multipart requests, companyId must come from `req.companyId!` (JWT). Never from form fields.
- **SVG blocking by MIME only:** file-type does not detect SVG (text-based). Block SVG in multer's `fileFilter` AND reject if `originalname.endsWith('.svg')` as belt-and-suspenders.
- **Storing user-supplied filenames on disk:** Always generate UUID filename. Original name stored in `documents.original_name` column for display only.
- **Creating debt before approval check:** Debt creation must be atomic with the status change inside the same DB transaction.
- **Route order in React Router:** `/transactions/new` MUST be registered BEFORE `/transactions/:id` in App.tsx to prevent "new" being treated as an ID parameter.
- **apiClient default headers with FormData:** The existing `apiClient` sets `Content-Type: application/json` by default. FormData upload must override headers to `{}` so the browser sets the correct multipart boundary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File type validation | Custom MIME/extension checks | `file-type` 22.0.0 magic bytes | MIME headers are user-controlled; extensions are trivially spoofed |
| Image orientation fix | EXIF parsing code | `sharp().rotate()` | EXIF orientation has 8 variants plus sub-orientations; sharp handles all |
| HEIC decoding | JS HEIC decoder | `sharp` + system libvips+libheif | HEIC is patent-encumbered; only libvips with libheif handles it reliably |
| UUID filenames | Custom random string | `crypto.randomUUID()` (Node built-in) | Built-in since Node 15; cryptographically random; no extra dep |
| Sequence generation | PostgreSQL SEQUENCE per company | `company_counters` table + upsert | Table-based sequence survives company deletion; avoids per-company sequence sprawl |
| Drag-and-drop zone | Native HTML5 drag events | `react-dropzone` 15 | File drop has 15+ edge cases (browser quirks, multi-file, directory drop); library handles them |
| Row locking | Application-layer locks | PostgreSQL SELECT FOR UPDATE | Application locks don't span requests; DB locks are atomic with the transaction |

**Key insight:** The file processing stack (multer → sharp → file-type → disk write) is well-solved. Every custom path introduces security holes (path traversal, stored XSS) or correctness issues (rotated images, oversized files).

---

## HEIC Docker Setup (Critical)

**Current Dockerfile:** `node:22-alpine` — does NOT support HEIC with sharp's prebuilt binaries.

**Root cause (HIGH confidence):** Sharp prebuilt binaries exclude HEIC/libheif due to patent licensing. HEIC support requires system-level libvips compiled with `libheif-dev`. Alpine's package ecosystem has insufficient libheif packages and musl-glibc mismatch issues with libvips HEIC codecs.

**Required change:** Switch `node:22-alpine` → `node:22-bookworm-slim` (Debian) and install system libvips with HEIC support. The multi-stage build compiles libvips from source.

**Confirmed working Dockerfile structure (MEDIUM confidence — from community examples, not official sharp docs):**

```dockerfile
# Stage 1: Build libvips with HEIC support
FROM debian:bookworm-slim AS libvips-builder
RUN apt-get update && apt-get install -y \
    build-essential pkg-config meson ninja-build git \
    libglib2.0-dev libexpat1-dev libheif-dev \
    libjpeg-dev libpng-dev libwebp-dev libexif-dev \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --branch=v8.16.0 --depth=1 https://github.com/libvips/libvips.git \
    && cd libvips \
    && meson setup build --prefix /usr/local \
    && cd build && ninja && ninja install \
    && ldconfig

# Stage 2: App image
FROM node:22-bookworm-slim AS production
# Copy compiled libvips
COPY --from=libvips-builder /usr/local/lib /usr/local/lib
COPY --from=libvips-builder /usr/local/include /usr/local/include
RUN apt-get update && apt-get install -y \
    libheif-dev libglib2.0-0 libexpat1 \
    && ldconfig && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# npm install must build sharp from source (not use prebuilt binary)
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=false
# ... rest of existing Dockerfile pattern
```

**Simpler alternative (LOW confidence — needs testing):** Use `node:22-bookworm-slim` and install `libvips-dev libheif-dev` via apt without compiling from source. Debian bookworm's apt repository includes libvips 8.14 which has libheif support. This avoids the multi-stage source build.

```dockerfile
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y \
    libvips-dev libheif-dev \
    && rm -rf /var/lib/apt/lists/*
# sharp will use global libvips instead of prebuilt binary
```

**Plan task recommendation:** Allocate the first task in plan 5.2 to test HEIC conversion with `node:22-bookworm-slim` + apt `libvips-dev libheif-dev`. If this works (likely — bookworm ships libvips 8.14.5 with heif support), no source compilation needed.

---

## Common Pitfalls

### Pitfall 1: file-type is ESM-only — CJS dynamic import required
**What goes wrong:** `import { fileTypeFromBuffer } from 'file-type'` as a static import causes `ERR_REQUIRE_ESM` at runtime in the backend (which is CommonJS without `"type": "module"`).
**Why it happens:** file-type v16+ removed CJS exports. The backend `package.json` has no `"type": "module"` — it's CommonJS. TypeScript `module: NodeNext` compiles to CJS.
**How to avoid:** Use dynamic import in an async function:
```typescript
const { fileTypeFromBuffer } = await import('file-type');
```
**Warning signs:** `SyntaxError: Cannot use import statement` or `ERR_REQUIRE_ESM` at server startup.

### Pitfall 2: apiClient sends `Content-Type: application/json` for FormData
**What goes wrong:** When FormData is passed to the existing `apiClient`, if `apiClient` forces `Content-Type: application/json`, the server receives a corrupted body and multer sees no files.
**Why it happens:** The existing `apiClient` sets default headers for JSON. FormData requires the browser to set `Content-Type: multipart/form-data; boundary=...` automatically.
**How to avoid:** For the transaction create call, either pass `undefined` as Content-Type header, or create a dedicated `apiClientFormData` variant that omits Content-Type.

### Pitfall 3: `/transactions/new` route order
**What goes wrong:** React Router resolves `/transactions/new` as `/transactions/:id` with `id = "new"`, causing a 404 API call.
**Why it happens:** Dynamic segments match any string. React Router v7 uses declaration order for matching.
**How to avoid:** In `App.tsx`, register `<Route path="/transactions/new">` before `<Route path="/transactions/:id">`.

### Pitfall 4: Sharp `.rotate()` must be called BEFORE any resize operations
**What goes wrong:** Resizing before applying EXIF orientation results in incorrectly-sized portraits; the rotation happens after resize on already-wrong dimensions.
**Why it happens:** Sharp applies operations in pipeline order.
**How to avoid:** Always call `.rotate()` first in the sharp chain, then `.resize()`, then `.jpeg()`.

### Pitfall 5: `totalAmount` must be computed server-side
**What goes wrong:** Client-computed totals can be manipulated; an attacker sends a high `totalAmount` with zero-priced line items to bypass debt creation.
**Why it happens:** If the API trusts the client's `totalAmount` field, the server cannot verify correctness.
**How to avoid:** Compute `totalAmount` server-side from `SUM(quantity * unitPrice)` for all submitted line items. Use integer cents arithmetic (multiply string values × 100, sum, divide by 100 to string).

### Pitfall 6: Concurrent approvals create two debts
**What goes wrong:** Two owners approve the same pending transaction simultaneously; both see `status = 'pending_approval'`, both proceed to create a debt, resulting in duplicate debt records.
**Why it happens:** Without row-level locking, both DB reads complete before either write.
**How to avoid:** Use `SELECT FOR UPDATE` inside `db.transaction()` when approving. The second concurrent approval will wait for the lock and then see `status = 'active'`, aborting.

### Pitfall 7: HEIC uploads silently failing on Alpine Docker
**What goes wrong:** sharp throws `Input file is missing or of an unsupported image format` for HEIC files in the Alpine-based production container, even though it works in local dev.
**Why it happens:** Local dev may use macOS or a Debian-based system where libvips has HEIC support. Alpine's prebuilt sharp binary does not.
**How to avoid:** Switch to `node:22-bookworm-slim` base image and install `libvips-dev libheif-dev`. Test explicitly with a .heic file in the Docker container.

### Pitfall 8: Notification badge stale state after approval action
**What goes wrong:** Owner approves from the notification panel; badge count doesn't decrease without page refresh.
**Why it happens:** TanStack Query cache for `['notifications', 'unread-count']` is not invalidated after approve/reject mutation.
**How to avoid:** In `onSuccess` of approve/reject mutations, call `queryClient.invalidateQueries({ queryKey: ['notifications'] })`.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Reference Number Upsert (Drizzle onConflictDoUpdate)
```typescript
// Pattern from existing schema.ts company_counters usage + drizzle-orm docs
import { sql } from 'drizzle-orm';

await tx
  .insert(companyCounters)
  .values({ companyId, year, lastSequence: 1 })
  .onConflictDoUpdate({
    target: [companyCounters.companyId, companyCounters.year],
    set: {
      lastSequence: sql`${companyCounters.lastSequence} + 1`,
    },
  });
```

### Money Arithmetic (integer cents — no floats)
```typescript
// Pattern from existing codebase: NUMERIC(12,2) returned as string by pg driver
function toCents(str: string): number {
  return Math.round(parseFloat(str) * 100);
}
function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
// Sum line items server-side
const totalCents = items.reduce((acc, item) => {
  const qty = Math.round(parseFloat(item.quantity) * 1000); // 3 decimal places
  const price = toCents(item.unitPrice);
  return acc + Math.round((qty * price) / 1000);
}, 0);
```

### Drizzle SELECT FOR UPDATE
```typescript
// Source: https://github.com/drizzle-team/drizzle-orm/discussions/1337
const [txn] = await tx
  .select()
  .from(transactions)
  .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId)))
  .for('update'); // PostgreSQL: SELECT ... FOR UPDATE
```

### react-dropzone 15 with noClick + two-button UX
```typescript
// Source: react-dropzone 15 README
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png':  ['.png'],
    'image/webp': ['.webp'],
    'image/heic': ['.heic'],
    'application/pdf': ['.pdf'],
  },
  maxFiles: 5,
  maxSize: 10 * 1024 * 1024,
  noClick: true,
  onDrop: (accepted, rejected) => { /* update staged files state */ },
});
```

### sharp EXIF + Resize + HEIC→JPEG
```typescript
// Source: sharp API docs (metadata shows .rotate() for EXIF)
const processed = await sharp(buffer)
  .rotate()                               // Apply EXIF orientation (FR-06.5)
  .resize({ width: 1920, withoutEnlargement: true }) // FR-06.6
  .jpeg({ quality: 85, mozjpeg: true })  // HEIC→JPEG conversion (FR-06.4)
  .toBuffer();
```

### File-type Dynamic Import (ESM-only in CJS backend)
```typescript
// Workaround for ESM-only file-type in CJS backend
async function detectFileType(buffer: Buffer) {
  const { fileTypeFromBuffer } = await import('file-type');
  return fileTypeFromBuffer(buffer);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Alpine + prebuilt sharp | node:22-bookworm-slim + apt libvips-dev libheif-dev | Ongoing limitation | Must change Dockerfile for HEIC support |
| multer 1.x diskStorage | multer 2.x memoryStorage + manual sharp pipeline | multer 2.1.1 (2025) | memoryStorage gives buffer for clean pipeline |
| `capture` attribute on single input | Two separate inputs (camera + gallery) | Android 14 (2023) | `capture` alone blocks gallery on Android 14+ Chrome |
| file-type CJS (v15 and earlier) | file-type ESM-only (v16+) | 2022 | Requires dynamic import in CJS backends |

**Deprecated/outdated:**
- `capture` attribute alone for camera: Blocks gallery on Android 14+. Use two separate inputs.
- file-type static `require()`: Removed in v16. Use `await import('file-type')`.
- multer `fileFilter` for type validation: MIME headers are user-controlled. `fileFilter` is first-pass only; magic byte check is required second pass.

---

## Open Questions

1. **libvips apt vs source build in bookworm-slim**
   - What we know: Debian bookworm ships libvips 8.14.5 via apt; libheif-dev is available
   - What's unclear: Whether apt-installed libvips 8.14.5 includes HEIC decode support out of the box, or if `libheif1` runtime library handles it automatically
   - Recommendation: Plan 5.2 task 1 should test `apt-get install libvips-dev libheif-dev` in a `node:22-bookworm-slim` container and run a sharp HEIC decode. If it succeeds, no source compile needed (simpler path). Flag as first task with a validation step.

2. **notifications.action field schema**
   - What we know: `notifications.action` is `varchar(30)`. For phase 5, needed values: `'transaction_submitted'` (21 chars), `'transaction_approved'` (21 chars), `'transaction_rejected'` (21 chars)
   - What's unclear: All three fit within 30 chars. Just confirming no migration needed.
   - Recommendation: No migration needed. Values fit. Document allowed action strings as constants.

3. **Viewer role access to `/api/v1/transactions`**
   - What we know: D-17 states "all roles (owner, collaborator, viewer) see all company transactions"; app.ts currently mounts products as owner-only
   - What's unclear: Whether transactions GET should be `requireRole('owner', 'collaborator', 'viewer')` or just `owner + collaborator` for write operations
   - Recommendation: Mount transactions router with `requireRole('owner', 'collaborator', 'viewer')` at the app level (read access), then add individual route guards for write operations (create = owner + collaborator; approve/reject = owner only).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | Yes | 24.14.0 | — |
| Docker | Container build (HEIC Dockerfile change) | Yes | 29.3.0 | — |
| Docker Compose | Service orchestration | Yes | v5.1.0 | — |
| multer 2.1.1 | File parsing (not yet installed) | No | — | None — must install |
| sharp 0.34.5 | Image processing (not yet installed) | No | — | None — must install |
| file-type 22.0.0 | Magic byte validation (not yet installed) | No | — | None — must install |
| react-dropzone 15.0.0 | Frontend drop zone (not yet installed) | No | — | None — must install |
| @types/multer 2.1.0 | TypeScript types (not yet installed) | No | — | None — must install |
| libvips + libheif | HEIC conversion in Docker | No (Alpine image) | — | Change base image to bookworm-slim |

**Missing dependencies with no fallback:**
- multer, sharp, file-type, react-dropzone: install steps required in plan 5.2 (backend) and plan 5.3 (frontend)
- libvips/libheif in Docker: Dockerfile base image must be changed from `node:22-alpine` to `node:22-bookworm-slim` with apt packages

**Missing dependencies with fallback:**
- HEIC support: can defer to "returns error for HEIC files" until Dockerfile is fixed; JPEG/PNG/WebP will work immediately

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `backend/vitest.config.ts` (exists) |
| Quick run command | `npm test -- --reporter=verbose --testPathPattern=transactions` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-05.1 | POST /transactions creates with all fields | unit | `npm test -- transactions.test.ts` | No — Wave 0 |
| FR-05.2 | reference_number generated as TXN-YYYY-NNNN | unit | `npm test -- transactions.test.ts` | No — Wave 0 |
| FR-05.3 | Line item price snapshotted (not live catalog) | unit | `npm test -- transactions.test.ts` | No — Wave 0 |
| FR-05.6 | Owner → `active` immediately | unit | `npm test -- transactions.test.ts` | No — Wave 0 |
| FR-05.7 | Collaborator → `pending_approval`, no debt | unit | `npm test -- transactions.test.ts` | No — Wave 0 |
| FR-05.8 | Approve creates debt; reject requires reason | unit | `npm test -- transactions.test.ts` | No — Wave 0 |
| FR-05.9 | Rejected → `draft`; no duplicate on resubmit | unit | `npm test -- transactions.test.ts` | No — Wave 0 |
| FR-05.12 | `internal_notes` not returned on client-scoped API | unit | `npm test -- transactions.test.ts` | No — Wave 0 |
| FR-06.7 | SVG upload rejected (magic byte) | unit | `npm test -- upload.test.ts` | No — Wave 0 |
| FR-06.8 | UUID filename stored on disk | unit | `npm test -- upload.test.ts` | No — Wave 0 |
| FR-06.11 | File serving verifies companyId from JWT | unit | `npm test -- upload.test.ts` | No — Wave 0 |
| FR-05.7 (race) | Two concurrent approvals produce ONE debt | integration | manual or supertest | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern=transactions`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/__tests__/transactions.test.ts` — covers FR-05.x (CRUD, approval, roles)
- [ ] `backend/src/__tests__/upload.test.ts` — covers FR-06.x (magic bytes, SVG block, UUID, auth serve)
- [ ] Test pattern follows `products.test.ts`: `vi.hoisted()` + `vi.mock('../db/client.js', ...)` + supertest

---

## Sources

### Primary (HIGH confidence)
- Existing codebase (`backend/src/db/schema.ts`, `backend/src/routes/products.ts`, `frontend/src/pages/products/ProductsPage.tsx`) — integration patterns
- multer 2.1.1 README (via GitHub) — memoryStorage, limits, fileFilter, error handling
- sharp API docs (sharp.pixelplumbing.com/api-input) — HEIC/HEIF metadata support, `.rotate()` for EXIF
- Drizzle ORM discussion #1337 (GitHub) — `.for('update')` SELECT FOR UPDATE syntax
- react-dropzone 15 README (GitHub) — useDropzone API, accept format, noClick option
- npm registry — all package versions confirmed 2026-03-31

### Secondary (MEDIUM confidence)
- DEV Community: HEIC conversion with sharp Dockerfile (dev.to/yassentials) — Debian bookworm libvips build pattern
- sharp install docs — confirmed prebuilt binaries do NOT include HEIC; custom libvips required
- WebSearch: Android 14 camera input behavior — `capture` attribute alone blocks gallery on Pixel 7a Android 14 Chrome; two-input workaround confirmed

### Tertiary (LOW confidence)
- Debian bookworm apt `libvips-dev libheif-dev` sufficient without source compile — unconfirmed; must test in Docker

---

## Metadata

**Confidence breakdown:**
- Standard stack (packages + versions): HIGH — verified against npm registry
- Architecture patterns (API routes, DB transactions): HIGH — follows existing codebase patterns
- HEIC Docker setup: MEDIUM — community examples confirm pattern; exact apt package sufficiency unconfirmed
- file-type ESM/CJS interop: HIGH — confirmed from official package metadata + Node.js docs
- Android camera UX: HIGH — confirmed from multiple sources including browser bug trackers
- SELECT FOR UPDATE syntax: HIGH — from official Drizzle community discussion with code

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable libraries; HEIC Docker setup may evolve faster)
