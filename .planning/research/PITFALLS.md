# Domain Pitfalls

**Domain:** Multi-tenant debt-tracking SaaS with file uploads and approval workflow
**Researched:** 2026-03-29
**Stack:** Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL + React 19

---

## Critical Pitfalls

Mistakes that cause data loss, security breaches, or rewrites.

---

### Pitfall 1: IDOR in File Downloads — Cross-Tenant File Access

**What goes wrong:**
The app stores uploaded files on disk under a path like `/uploads/<uuid>.jpg`. When a file download endpoint receives a `fileId`, it fetches the file record from the database and streams the file. If the query does not filter by `company_id` (tenant), any authenticated user — even from a different company — can download another tenant's receipts and proof documents by guessing or enumerating UUIDs.

**Why it happens:**
Developers write `SELECT * FROM files WHERE id = $1` and forget to add `AND company_id = $2`. UUIDs are non-sequential but not secret; leaked IDs (e.g., via URL sharing) expose the file.

**Consequences:**
A competitor or malicious actor downloads proof documents, client data, and payment records belonging to other tenants. GDPR/data breach liability.

**Prevention:**
Always scope file queries to the authenticated tenant:

```typescript
// WRONG
const file = await db.select().from(files).where(eq(files.id, fileId));

// CORRECT — always include tenantId from the JWT, never from the request body
const file = await db
  .select()
  .from(files)
  .where(and(eq(files.id, fileId), eq(files.companyId, req.user.companyId)));

if (!file.length) return res.status(404).json({ error: 'Not found' });
```

Apply this pattern universally: every table query that takes a user-supplied ID must include `company_id` from the verified JWT, never from the request body.

**Detection:** Write integration tests that log in as Company A and attempt to fetch a file ID that belongs to Company B. Expect HTTP 404, not 200.

---

### Pitfall 2: JWT Role Claim Trust — Collaborator Privilege Escalation

**What goes wrong:**
The app reads `req.user.role` from the JWT payload to gate actions (e.g., only owners can approve). An attacker decodes their JWT, modifies `"role": "collaborator"` to `"role": "owner"`, and re-signs with the `none` algorithm — or brute-forces a weak HS256 secret. The server trusts the claim and grants owner-level access.

**Why it happens:**
Using weak secrets (`process.env.JWT_SECRET = 'secret'`) or failing to explicitly reject `alg: none`. Trusting the role from the token payload without re-validating against the database.

**Consequences:**
Collaborator approves their own submissions, accesses admin panel, promotes themselves, or reads all client data. Complete authorization collapse.

**Prevention:**

```typescript
// 1. Use a cryptographically strong secret (generate once):
//    openssl rand -hex 64
// Store in .env: JWT_SECRET=<128-char hex>

// 2. Verify with explicit algorithm whitelist (jsonwebtoken):
const payload = jwt.verify(token, process.env.JWT_SECRET!, {
  algorithms: ['HS256'], // never allow 'none'
});

// 3. Re-validate role from DB on sensitive operations (don't trust token alone):
const user = await db.select().from(users)
  .where(and(eq(users.id, payload.sub), eq(users.companyId, payload.companyId)));
if (user[0].role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
```

Rotate secrets if they were ever weak. Store `JWT_SECRET` only in environment variables, never in source code.

---

### Pitfall 3: Tenant Data Leakage via Missing `company_id` Filters

**What goes wrong:**
A developer adds a new report endpoint and writes `SELECT * FROM debts WHERE client_id = $1`. The `client_id` is a UUID supplied from the URL. If client UUIDs are not globally unique per tenant (or even if they are), the absence of `AND company_id = $2` means a user from Company B can retrieve Company A's debt records by trying client IDs.

**Why it happens:**
Tenant scoping is a cross-cutting concern — easy to forget in every new query. PostgreSQL does not enforce it unless Row-Level Security (RLS) is explicitly configured.

**Consequences:**
Full cross-tenant data read access. Financial and legal exposure.

**Prevention — two-layer approach:**

**Layer 1: Application middleware** — attach `companyId` from the verified JWT to `req.user` and pass it into every service function. Never accept `companyId` from request parameters.

**Layer 2: PostgreSQL Row-Level Security (RLS)** as a backstop:

```sql
-- Enable RLS on all tenant tables
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Policy: app sets current_setting before queries
CREATE POLICY tenant_isolation ON debts
  USING (company_id = current_setting('app.current_company_id')::uuid);
```

Set the session variable in a middleware before every query:
```typescript
await db.execute(sql`SET LOCAL app.current_company_id = ${req.user.companyId}`);
```

Note: RLS with connection poolers (PgBouncer in session mode) works; transaction mode requires careful handling. Verify the PostgreSQL version (CVE-2024-10976 affects certain subquery patterns — use PG 16.4+ or 17.0+).

---

### Pitfall 4: Approval Race Condition — Double-Approval / Double-Rejection

**What goes wrong:**
Two owners (or an owner on two browser tabs) submit an approval for the same pending item at the same time. Both read `status = 'pending'`, both update to `status = 'approved'`, and the transaction/debt is created twice. Alternatively, an approval and a rejection race, and the outcome depends on which write commits last.

**Why it happens:**
The standard read-then-write pattern without locking:
```
READ status = 'pending'  ← both transactions see this
APPROVE → status = 'approved'  ← both commit; debt created twice
```

**Consequences:**
Duplicate debt records, incorrect balances, data integrity loss that is hard to detect and harder to undo.

**Prevention — use `SELECT FOR UPDATE` within a transaction:**

```typescript
await db.transaction(async (tx) => {
  // Lock the row — second concurrent request will block here
  const [item] = await tx
    .select()
    .from(pendingItems)
    .where(eq(pendingItems.id, itemId))
    .for('update'); // Drizzle ORM: .for('update')

  if (!item || item.status !== 'pending') {
    throw new Error('Item is no longer pending');
  }

  await tx.update(pendingItems)
    .set({ status: 'approved', approvedBy: userId, approvedAt: new Date() })
    .where(eq(pendingItems.id, itemId));

  // Create debt/transaction here, inside the same transaction
  await tx.insert(debts).values({ ... });
});
```

Drizzle ORM supports `.for('update')` on select queries inside transactions (confirmed in drizzle-orm discussions #1337). The second concurrent request will see `status !== 'pending'` after acquiring the lock and return a clean error.

---

### Pitfall 5: Orphaned Pending Items When a Collaborator Is Removed

**What goes wrong:**
A collaborator submits 5 transactions that are pending approval. The owner removes the collaborator from the company. The pending items still reference the removed user, but there is no policy for what happens to them. They may sit in `pending` forever, blocking client debt records from being created — or they are silently abandoned with no audit trail.

**Why it happens:**
The collaborator removal flow only handles the user record (delete or deactivate), not the downstream effect on their pending work.

**Consequences:**
Perpetually pending items that cannot be approved (if the UI filters by active collaborators), or ghost items with no owner, or silent data loss if cascade delete is used.

**Prevention — define explicit policy at schema and application level:**

1. **Schema**: Do NOT use `ON DELETE CASCADE` from `users` to `pending_items`. Use `ON DELETE SET NULL` or `ON DELETE RESTRICT` with a soft-delete pattern.

2. **Application**: When removing a collaborator, choose one of:
   - Auto-reject all their pending items and notify the owner
   - Leave pending items in place (still approvable by owner)
   - Flag them as `status = 'orphaned'` for manual review

3. **Recommended approach for this app**: Auto-reject with reason logged.

```typescript
// In the "remove collaborator" transaction:
await db.transaction(async (tx) => {
  // Reject all pending items from this user
  await tx.update(pendingItems)
    .set({
      status: 'rejected',
      rejectionReason: 'Collaborator removed from company',
      resolvedAt: new Date(),
    })
    .where(
      and(
        eq(pendingItems.submittedBy, collaboratorId),
        eq(pendingItems.status, 'pending'),
      )
    );

  // Deactivate the user (soft delete)
  await tx.update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, collaboratorId));
});
```

---

## Critical Pitfalls (File Upload)

---

### Pitfall 6: No File Type Validation Beyond MIME Header — Malicious Upload

**What goes wrong:**
The upload endpoint checks `req.file.mimetype === 'image/jpeg'`. The `mimetype` field comes from the `Content-Type` header in the multipart request — it is user-controlled. An attacker sets `Content-Type: image/jpeg` on a file containing a PHP webshell or JavaScript payload and uploads it. If the file is ever served with execute permissions or the wrong content-type, it runs.

**Why it happens:**
Multer sets `file.mimetype` from the client-supplied header. It does not inspect file contents.

**Consequences:**
Remote code execution if the server serves files directly, stored XSS if an SVG is served inline, or server-side script execution if uploads are placed in a web-accessible directory.

**Prevention — validate magic bytes, not just headers:**

```typescript
import { fileTypeFromBuffer } from 'file-type'; // npm install file-type

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

// In Multer file filter:
fileFilter: async (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return cb(new Error('Invalid extension'));
  cb(null, true);
},

// After upload, verify magic bytes (read first 4100 bytes):
const buffer = await fs.readFile(file.path, { length: 4100 });
const detected = await fileTypeFromBuffer(buffer);
if (!detected || !ALLOWED_TYPES.has(detected.mime)) {
  await fs.unlink(file.path); // delete the file
  return res.status(400).json({ error: 'File content does not match declared type' });
}
```

Store files **outside the web root** (not under a publicly accessible Express `static()` directory). Serve them through an authenticated endpoint that streams the file with an explicit `Content-Type` and `Content-Disposition: attachment` header.

---

### Pitfall 7: Path Traversal via User-Supplied Filename

**What goes wrong:**
The upload handler uses `file.originalname` from the user's request to construct the storage path: `path.join('/uploads', req.user.companyId, file.originalname)`. An attacker uploads a file with the name `../../etc/cron.d/backdoor` and overwrites a system file.

**Why it happens:**
`file.originalname` is user-controlled. Multer does not sanitize it.

**Consequences:**
Arbitrary file write on the server, potentially escalating to code execution or service disruption.

**Prevention — always generate server-side filenames:**

```typescript
import { randomUUID } from 'crypto';
import path from 'path';

// NEVER use file.originalname for storage path
const storageFilename = `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
// e.g., "a3f8b2d1-4e5c-6f7a-8b9c-0d1e2f3a4b5c.jpg"

const storagePath = path.join(
  process.env.UPLOAD_BASE_DIR!, // absolute path outside web root
  req.user.companyId,           // tenant scoping
  storageFilename,
);
```

Store `originalname` in the database only for display purposes, never for filesystem access. The `storageFilename` (UUID-based) is the only key used for reads and deletes.

---

### Pitfall 8: Missing File Size Limits — Disk Exhaustion

**What goes wrong:**
Multer is configured without a `limits.fileSize` option, or the limit is set very high (e.g., 100MB). A user uploads a 4K video "as a receipt" (either accidentally or as a denial-of-service), filling the Hetzner VPS disk. The same disk hosts the PostgreSQL data directory and the Restaurant app. Both go down.

**Why it happens:**
Multer's default has no file size limit. The Hetzner VPS shares disk with another production app.

**Consequences:**
Full disk = PostgreSQL write failure = both apps crash.

**Prevention:**

```typescript
const upload = multer({
  storage: multer.diskStorage({ /* ... */ }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 5,                    // max 5 files per request
  },
  fileFilter: /* ... */,
});
```

Set Nginx `client_max_body_size` to match or be slightly above (prevents Nginx from accepting what Express would reject):

```nginx
# In the receipts-app location block
client_max_body_size 12m;
```

Additionally, implement per-company storage quota tracking at the application level: record cumulative bytes in a `company_storage_bytes` column and reject uploads that would exceed the quota before writing to disk.

---

### Pitfall 9: HEIC Files from iOS Camera — Silent Upload Failures

**What goes wrong:**
iPhone users with HEIC format enabled in camera settings upload receipt photos. The file arrives as `image/heic` or `image/heif`. The server's file type whitelist only includes `image/jpeg`, `image/png`, and `image/webp`, so the upload is rejected — but the error message is unclear ("Invalid file type"). The user assumes the upload succeeded and the proof document is missing.

**Why it happens:**
iOS default camera format is HEIC since iOS 11. Safari on iOS sometimes re-encodes to JPEG before upload (especially when `accept="image/*"` is set), but this is not guaranteed in all scenarios.

**Consequences:**
Missing proof documents. Owner thinks transactions are documented; they are not. Dispute about payments with no evidence.

**Prevention — two-pronged approach:**

**On the `<input>` element** — trigger iOS's built-in re-encoding:

```html
<!-- This hints to iOS Safari to re-encode HEIC to JPEG before upload -->
<input
  type="file"
  accept="image/jpeg,image/png,image/webp,application/pdf"
  capture="environment"
/>
```

Note: `accept="image/*"` is simpler but less reliable at triggering JPEG re-encoding. Explicitly listing JPEG/PNG/WebP is more effective.

**On the server** — also accept HEIC and convert with `sharp` (which uses libvips):

```typescript
import sharp from 'sharp'; // npm install sharp

// After upload validation, convert HEIC to JPEG:
if (detected.mime === 'image/heic' || detected.mime === 'image/heif') {
  const jpegPath = storagePath.replace(/\.heic$/i, '.jpeg');
  await sharp(storagePath).jpeg({ quality: 85 }).toFile(jpegPath);
  await fs.unlink(storagePath); // remove original HEIC
  // update file record to point at jpegPath
}
```

`sharp` on Linux (Hetzner VPS) requires libvips with HEIC support. Verify during Docker build:
```dockerfile
RUN apt-get install -y libvips-dev libheif-dev
```

---

### Pitfall 10: Android Chrome Camera Capture — `capture` Attribute Removes Gallery Access

**What goes wrong:**
The developer adds `capture="environment"` to the file input to open the camera directly. On Android 14/15 with Chrome, this attribute forces the system camera app to launch and prevents the user from selecting an existing photo from their gallery. A field worker who already took the receipt photo cannot select it.

**Why it happens:**
`capture` attribute forces camera-only mode on Android Chrome. This behavior changed in Android 14.

**Consequences:**
Users who already have photos on their device are forced to retake them. Poor UX, possible duplicate photos.

**Prevention — use a UI-level solution instead:**

```html
<!-- Do NOT use capture attribute for general document upload -->
<input
  type="file"
  accept="image/jpeg,image/png,image/webp,application/pdf"
/>
<!-- Let the OS present the standard sheet: Camera / Gallery / Files -->
```

If direct camera access is truly needed, offer two separate buttons in the UI:
- "Take Photo" → `<input type="file" accept="image/*" capture="environment">`
- "Choose from Gallery" → `<input type="file" accept="image/*,application/pdf">`

This gives users choice without restricting them.

---

## Critical Pitfalls (Money Arithmetic)

---

### Pitfall 11: Floating Point for Monetary Values — Silent Rounding Errors

**What goes wrong:**
Debt balances and payment amounts are stored as JavaScript `number` (IEEE 754 double) in the database column type `FLOAT` or `DOUBLE PRECISION`. Calculations like `0.1 + 0.2 === 0.30000000000000004` produce incorrect remainders. Over time, a debt of $100.00 partially paid with ten payments of $10.00 shows a remaining balance of $0.000000000000001 instead of $0.00.

**Why it happens:**
JavaScript's native `number` type and PostgreSQL's `FLOAT` type both use binary floating-point representation, which cannot exactly represent most decimal fractions.

**Consequences:**
Debt records that never reach "Fully Paid" status automatically. Report totals that are off by fractions. Disputes with clients over balances that should be zero.

**Prevention — integer storage, integer arithmetic:**

**Database schema** — store all monetary values as `INTEGER` (cents or smallest currency unit):

```typescript
// Drizzle ORM schema
export const debts = pgTable('debts', {
  totalAmountCents: integer('total_amount_cents').notNull(), // e.g., 10000 = $100.00
  paidAmountCents: integer('paid_amount_cents').notNull().default(0),
  // remainingAmountCents is always computed: totalAmountCents - paidAmountCents
});
```

**Application layer** — convert at the boundary (display only):

```typescript
// Input: multiply by 100 and round
const amountCents = Math.round(parseFloat(userInput) * 100);

// Output: divide by 100 for display
const displayAmount = (amountCents / 100).toFixed(2);
```

**Never store `remainingBalance` as a derived column** — compute it from `totalAmountCents - paidAmountCents` to prevent divergence.

**PostgreSQL column type**: use `INTEGER` or `BIGINT`, not `NUMERIC`, for this app's scale. `NUMERIC(12,2)` is also acceptable if decimal display without conversion is preferred, but adds CPU cost and requires vigilance in JavaScript to avoid float conversion during calculation.

---

### Pitfall 12: Concurrent Payment Submissions — Double-Spend on a Debt

**What goes wrong:**
An owner and a collaborator (after approval) both submit a payment for the same debt within milliseconds of each other. Both read `remaining_balance = 500`. Both payments of 500 are applied. The debt now shows `paid = 1000` against a `total = 500`, producing a negative remaining balance.

**Why it happens:**
The read-modify-write cycle for payment application is not atomic. Without locking, two concurrent transactions both read the same balance before either write commits.

**Consequences:**
Debt balance goes negative. Client's record shows they overpaid. Financial records are incorrect and hard to reconcile.

**Prevention — lock the debt row during payment application:**

```typescript
await db.transaction(async (tx) => {
  // Lock the debt row for the duration of this transaction
  const [debt] = await tx
    .select()
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.companyId, req.user.companyId)))
    .for('update');

  if (!debt) throw new Error('Debt not found');
  if (debt.status === 'paid') throw new Error('Debt already fully paid');

  const newPaidCents = debt.paidAmountCents + paymentAmountCents;
  if (newPaidCents > debt.totalAmountCents) {
    throw new Error('Payment exceeds remaining balance');
  }

  const newStatus = newPaidCents >= debt.totalAmountCents ? 'paid' : 'partially_paid';

  await tx.update(debts)
    .set({ paidAmountCents: newPaidCents, status: newStatus })
    .where(eq(debts.id, debtId));

  await tx.insert(payments).values({ debtId, amountCents: paymentAmountCents, ... });
});
```

---

## Moderate Pitfalls

---

### Pitfall 13: Docker Volume Permissions — PostgreSQL Startup Failure

**What goes wrong:**
The new Docker Compose stack uses a bind mount (host directory) for PostgreSQL data: `./postgres-data:/var/lib/postgresql/data`. On Linux (Hetzner), the `postgres-data/` directory is created by root (UID 0) or the current shell user (UID 1000). The PostgreSQL container runs as `postgres` (UID 999). On first start, PostgreSQL cannot write to the directory and exits with `Permission denied`.

**Why it happens:**
Docker creates bind-mount directories as root. PostgreSQL image's entrypoint does not chown bind mounts (it does chown named volumes).

**Consequences:**
Database fails to start. App is broken on first deploy.

**Prevention — use named volumes, not bind mounts, for PostgreSQL:**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data  # named volume, NOT ./postgres-data

volumes:
  postgres_data:  # Docker manages ownership automatically
```

If bind mounts are required for backup access, pre-create the directory with the correct ownership:

```bash
mkdir -p ./postgres-data
sudo chown -R 999:999 ./postgres-data
```

---

### Pitfall 14: PostgreSQL Port Conflict with Existing Restaurant App Database

**What goes wrong:**
The Restaurant app already has a PostgreSQL container exposing port `5432` on the host. The new Receipts app's `docker-compose.yml` also exposes port `5432`. On `docker compose up`, the second container fails to start: `Bind for 0.0.0.0:5432 failed: port is already allocated`.

**Why it happens:**
Both Compose stacks try to bind the same host port.

**Consequences:**
Database fails to start on first deploy.

**Prevention — use a different host port, or expose no host port at all:**

```yaml
# Option A: different host port (only needed if direct psql access from host is required)
ports:
  - "5433:5432"  # host:container

# Option B (recommended): no host port — only the app container reaches the DB
# Omit the 'ports' key entirely; use Docker network service name for connection
services:
  db:
    image: postgres:16
    # no 'ports' — not reachable from host, only from app container
  app:
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/receipts
```

Removing the host port binding also reduces attack surface (database is not reachable from the internet).

---

### Pitfall 15: Nginx Configuration Collision with Restaurant App

**What goes wrong:**
The Hetzner server has a host-level Nginx reverse proxy serving the Restaurant app under `restaurant.example.com`. The Receipts app needs to be added as `receipts.example.com`. If both apps share the same Nginx config file or the new `server_name` directive conflicts (e.g., duplicate `server_name _` catch-all), Nginx reloads fail or routes requests to the wrong app.

**Why it happens:**
Adding a second app to an existing Nginx config without understanding the existing structure.

**Prevention:**

1. Use one `conf.d/*.conf` file per application:

```
/etc/nginx/conf.d/
  restaurant.conf    # existing, untouched
  receipts.conf      # new file for this app
```

2. Each file has a single `server` block with an explicit `server_name`:

```nginx
# receipts.conf
server {
    listen 80;
    server_name receipts.example.com;

    location / {
        proxy_pass http://localhost:3100;  # receipts app port (different from restaurant)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    client_max_body_size 12m;  # for file uploads
}
```

3. Test before reloading: `nginx -t && nginx -s reload`

4. Ensure internal Docker service ports don't collide: use port `3100` for the receipts API, assuming `3000` is taken by the Restaurant app.

---

### Pitfall 16: Uploaded Files Served as Static Assets — XSS via SVG

**What goes wrong:**
Express serves the uploads directory with `app.use('/uploads', express.static('/data/uploads'))`. A user uploads an SVG file (which is technically an image). SVG can contain `<script>` tags. When another user's browser fetches the SVG from the static endpoint, the script executes in the app's origin, enabling stored XSS that can steal session tokens or perform actions on behalf of the victim.

**Why it happens:**
Static file serving does not set `Content-Disposition: attachment` or sanitize SVG content.

**Consequences:**
Stored XSS in a multi-tenant app. An attacker from one company could potentially exploit this to access another company's session if cookie isolation is insufficient.

**Prevention:**
Never serve uploads via `express.static()`. Serve all files through an authenticated streaming endpoint:

```typescript
app.get('/files/:fileId', authenticate, async (req, res) => {
  const file = await getFileScopedToTenant(req.params.fileId, req.user.companyId);
  if (!file) return res.status(404).end();

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.displayName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Content-Disposition: attachment prevents inline execution
  fs.createReadStream(file.storagePath).pipe(res);
});
```

Do not allow SVG uploads at all (not needed for receipts/payment proofs). Explicitly block SVG in the allowed type list.

---

### Pitfall 17: Collaborator Can Submit Data for Other Tenants' Clients

**What goes wrong:**
A collaborator submits a transaction by sending `{ clientId: '<uuid of a client from another company>' }`. If the transaction creation endpoint only checks that the submitting user is a collaborator (role check passes) but does not verify that the `clientId` belongs to the same company, the transaction is written to a cross-tenant client record.

**Why it happens:**
Role checks (is this user a collaborator?) are often implemented separately from ownership checks (does this resource belong to this tenant?). Forgetting the second check.

**Prevention:**
All resource creation and update operations must validate that referenced IDs belong to `req.user.companyId`:

```typescript
// Before creating a transaction, verify the client belongs to this company
const [client] = await db
  .select({ id: clients.id })
  .from(clients)
  .where(and(eq(clients.id, body.clientId), eq(clients.companyId, req.user.companyId)));

if (!client) return res.status(404).json({ error: 'Client not found' });
// Then create the transaction
```

Apply this check for every foreign key reference in a creation or update request: `clientId`, `debtId`, `transactionId`, `productId`.

---

## Minor Pitfalls

---

### Pitfall 18: Large JPEG Files from Mobile Camera — Slow Uploads on Mobile Data

**What goes wrong:**
Modern smartphones take photos at 10-20 MB. On a 4G connection with poor signal (common in field use), uploading a 15 MB receipt photo times out or takes 30+ seconds. The user assumes the app is broken.

**Prevention:**
Compress images server-side with `sharp` after upload, or compress client-side before upload using the Canvas API:

```typescript
// Server-side: resize and compress any image > 2MB after upload
const MAX_DISPLAY_BYTES = 2 * 1024 * 1024;
if (fileStats.size > MAX_DISPLAY_BYTES && isImage(detected.mime)) {
  await sharp(storagePath)
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(compressedPath);
  await fs.rename(compressedPath, storagePath);
}
```

Store the original file size in the database for audit purposes even after compression.

---

### Pitfall 19: Pending Approval Notification Seen Only by Active Session Owner

**What goes wrong:**
The owner approves items through an in-app notification center. If the owner is not logged in, new collaborator submissions silently queue. In a small business context, the owner might check the app infrequently, leaving collaborators' work blocked for hours or days.

**Why it happens:**
The scope decision (in-app notifications only, no email) is correct for v1 complexity — but the operational assumption is that owners check the app frequently.

**Prevention:**
Document this operational expectation explicitly in onboarding. Add an unread-count badge visible on every page (not just the notification page) so the owner sees pending items the moment they log in. Plan email notifications as a v2 feature.

---

### Pitfall 20: `DELETE` on Files Without Revoking DB Record — Ghost File References

**What goes wrong:**
A payment is deleted (or rejected), but the file deletion logic only removes the database record (`files` table), not the file on disk. Over time the disk fills with orphaned files. Alternatively, the file on disk is deleted but the DB record remains, causing 404 errors when old reports try to display proof documents.

**Prevention:**
Implement file deletion as a two-step process: first mark the DB record as `deleted_at = NOW()`, then delete the file from disk. Use a cleanup job or transactional approach:

```typescript
await db.transaction(async (tx) => {
  await tx.update(files)
    .set({ deletedAt: new Date() })
    .where(eq(files.id, fileId));
  // Only unlink after DB commit succeeds — handled post-transaction
});
// After commit:
await fs.unlink(file.storagePath);
```

For hard deletes, keep a soft-delete period (e.g., 30 days) so that files referenced in reports remain accessible briefly after their record is "deleted."

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth / JWT setup | Weak secret, role escalation | Use `openssl rand -hex 64`; whitelist `HS256` only |
| Multi-tenant DB schema | Missing `company_id` filters | Add RLS as backstop; write cross-tenant integration tests |
| File upload endpoint | MIME spoofing, path traversal, size | Magic byte check + UUID filename + `limits.fileSize` |
| Approval workflow | Race condition, orphaned items | `SELECT FOR UPDATE`; explicit policy on collaborator removal |
| Payment recording | Floating point, concurrent write | Integer cents in DB; lock debt row in transaction |
| Mobile camera capture | HEIC rejection, `capture` attribute | Accept HEIC + server convert; avoid `capture` for gallery access |
| Docker deployment | Port conflicts, volume permissions | Named volumes; no host port on DB; per-app Nginx conf file |
| File serving | IDOR, inline XSS via SVG | Authenticated streaming endpoint; block SVG uploads |

---

## Sources

- [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
- [Multi-Tenant Leakage: When Row-Level Security Fails in SaaS](https://instatunnel.my/blog/multi-tenant-leakage-when-row-level-security-fails-in-saas)
- [PostgreSQL RLS Implementation Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [Drizzle ORM SELECT FOR UPDATE discussion](https://github.com/drizzle-team/drizzle-orm/discussions/1337)
- [Drizzle ORM Row-Level Security](https://orm.drizzle.team/docs/rls)
- [Preventing PostgreSQL Race Conditions with SELECT FOR UPDATE](https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/)
- [Secure File Uploads in Node.js](https://prateeksha.com/blog/file-uploads-nodejs-safe-validation-limits-s3)
- [File Upload Content Type Bypass Vulnerabilities](https://www.sourcery.ai/vulnerabilities/file-upload-content-type-bypass)
- [JWT Security in 2025: Critical Vulnerabilities](https://securityboulevard.com/2025/06/jwt-security-in-2025-critical-vulnerabilities-every-b2b-saas-company-must-know/)
- [Advanced JWT Exploitation Techniques](https://portswigger.net/web-security/jwt)
- [Rendering HEIC on the Web](https://dev.to/upsidelab/rendering-heic-on-the-web-how-to-make-your-web-app-handle-iphone-photos-pj1)
- [Android 14/15 Camera File Input Issue](https://blog.addpipe.com/html-file-input-accept-video-camera-option-is-missing-android-14-15/)
- [Working with Money in Postgres](https://www.crunchydata.com/blog/working-with-money-in-postgres)
- [JavaScript Rounding Errors in Financial Applications](https://www.robinwieruch.de/javascript-rounding-errors/)
- [Docker Compose Troubleshooting Guide](https://eastondev.com/blog/en/posts/dev/20251217-docker-compose-troubleshooting/)
- [PostgreSQL Volume Permission Issues](https://www.w3tutorials.net/blog/permission-issue-with-postgresql-in-docker-container/)
- [Race Conditions in Node.js](https://nodejsdesignpatterns.com/blog/node-js-race-conditions/)
- [Database Race Conditions and AppSec](https://blog.doyensec.com/2024/07/11/database-race-conditions.html)
