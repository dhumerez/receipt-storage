# Technology Stack

**Project:** Receipts Storage — Debt Tracker SaaS
**Researched:** 2026-03-29
**Overall confidence:** HIGH (all critical decisions verified against official docs or GitHub releases)

---

## Constraints (Pre-Decided — Do Not Change)

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL |
| Frontend | React 19 + Vite + TanStack Query + React Router + Tailwind CSS |
| Deployment | Docker Compose + Nginx on Hetzner VPS |

These are locked. Research below covers the supporting libraries within this stack.

---

## Recommended Stack

### File Upload — Server Side

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| multer | 2.1.1 | Multipart form parsing, disk storage | The de facto Express file upload middleware. v2.x (released May 2025) fixed two high-severity CVEs (CVE-2025-47935, CVE-2025-47944) around stream memory leaks. Active maintenance with the expressjs org as owner. Pair with `diskStorage` to write directly to the Docker volume path. |
| sharp | 0.34.5 | Server-side image resize + compress | 30M+ weekly downloads. Processes JPEG/PNG/WebP via native libvips — 4-5x faster than ImageMagick. Pipe the multer `memoryStorage` buffer through sharp before writing to disk, keeping original photo sizes manageable (cap at ~1200px wide). TypeScript types included. Required for field photos from phone cameras which can be 8–15 MB. |

**Why not `formidable` or `busboy` directly?** Multer wraps busboy and adds typed `req.file` / `req.files` — less boilerplate, better TypeScript DX. Busboy is fine for advanced cases but adds no value here.

**Why not `multiparty`?** Unmaintained since 2021.

### File Upload — Client Side

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-dropzone | 15.0.0 | Drag-and-drop file selection + file validation UI | Smallest bundle (11.2 KB gzipped), hook-based API, React 19 compatible, ~4.5k projects depend on it. Does not make HTTP requests — pairs cleanly with TanStack Query's `useMutation` for the upload call. |
| Native HTML `<input type="file" capture="environment" accept="image/*">` | (browser built-in) | Camera capture on mobile | No library needed for camera capture. `capture="environment"` opens the rear camera directly on iOS/Android. Works in all modern mobile browsers over HTTPS. Use this as the camera trigger button; react-dropzone handles the file-from-disk case. |

**Why not Uppy?** Uppy is a full upload pipeline (chunking, resumable tus uploads, cloud storage plugins). Excellent for S3/cloud use cases. Overkill for local disk storage — adds a large bundle and forces you to use its HTTP client. No benefit here.

**Why not react-webcam or react-camera-pro?** Both last published 2+ years ago. react-webcam (v7.2.0, 2 years stale) and react-camera-pro (v1.4.0, 2 years stale) are maintenance risks. More importantly, the native `capture` attribute on `<input type="file">` achieves the same result in a mobile browser without a webcam library — it opens the OS camera UI. The OS camera is a better UX than a custom in-page webcam view for field photo capture.

**Camera capture implementation pattern:**
```tsx
// Two separate triggers — one for gallery/files, one for camera
<input type="file" accept="image/*,application/pdf" onChange={handleFileSelect} />
<input type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} />
```

### Multi-Tenancy — Database Layer

**Decision: Shared schema with `company_id` column (tenant_id pattern)**

This matches the `PROJECT.md` decision already logged. Research confirms it is the correct choice for this scale.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Isolation mechanism | `company_id` FK on every tenant-scoped table | Single migration path, simple Drizzle schema, works with Drizzle's standard query API |
| Security enforcement | Application-layer `WHERE company_id = ?` on every query | Sufficient for an internal SaaS where all API calls are authenticated. Simpler than RLS for this stack. |
| Optional hardening | PostgreSQL RLS with Drizzle's `pgPolicy()` | Drizzle v1.x added first-class RLS via `.withRLS()` and `pgPolicy()`. Can be added as a safety net in a later phase without restructuring the schema. |
| Migration | Single `drizzle-kit push` / `drizzle-kit migrate` | Schema-per-tenant requires per-schema migrations — high operational cost for no benefit at this scale. |

**Why NOT schema-per-tenant?**
- PostgreSQL has practical limits around managing many schemas efficiently.
- Schema changes require running migrations N times (once per tenant schema).
- Drizzle ORM has no built-in tooling for schema-per-tenant migrations — would require a custom migration runner.
- The project's own `PROJECT.md` already ruled this out with sound reasoning.

**Why NOT PostgreSQL RLS as the primary enforcement layer?**
RLS is excellent as an *additional* safety net but adds complexity to every Drizzle query (requires setting `app.current_company_id` in a transaction wrapper before each query). For v1, application-layer filtering is simpler, testable, and sufficient. RLS can be layered on top later.

**Drizzle schema pattern:**
```typescript
// All tenant-scoped tables include this column
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  // ... other fields
});

// Every query in service layer includes company filter
const result = await db
  .select()
  .from(transactions)
  .where(eq(transactions.companyId, req.user.companyId));
```

### PDF Generation

**Decision: PDFKit (server-side, Node.js) — version 0.18.0**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| pdfkit | 0.18.0 | Server-side PDF generation for receipts and debt reports | Lightweight, stream-based, no browser process. Outputs directly to HTTP response or file. TypeScript types via `@types/pdfkit`. Produces small PDF files. Ideal for structured documents: receipts, line-item tables, debt summaries. Latest release March 2025. |

**Why NOT Puppeteer or Playwright for PDF?**
Puppeteer/Playwright spawn a full Chromium process (100–300 MB RAM per instance, 1–3 s startup). On a shared Hetzner VPS that also runs the Restaurant app, this is a significant resource risk. The documents in this project (receipts, debt reports) are structured tabular data — they don't need CSS layout fidelity. PDFKit's programmatic API is well-suited to this.

**Why NOT @react-pdf/renderer?**
`@react-pdf/renderer` (v4.3.2) generates PDFs client-side in the browser using React components. For this project, PDFs are generated from server data (debt history, payment records) and must be reproducible as downloadable reports — server-side generation is the correct architecture. Client-side PDF generation means sensitive financial data must be sent to the browser; server-side keeps it on the backend.

**Why NOT pdfmake?**
pdfmake is a solid alternative and works server-side. PDFKit is preferred because it has a simpler TypeScript integration, a smaller API surface for table/text documents, and is more widely used in Node.js receipt/invoice generation contexts. If layout requirements become complex, pdfmake is a viable fallback.

**PDF generation pattern (receipts):**
```typescript
import PDFDocument from 'pdfkit';

export function generateReceiptPDF(
  res: Response,
  data: ReceiptData
): void {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="receipt-${data.id}.pdf"`);
  doc.pipe(res);
  // ... build document
  doc.end();
}
```

### Email — Invitations and Authentication

**Decision: Resend — version 6.9.4**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| resend | 6.9.4 | Transactional email (invitations, password reset) | Modern HTTP-based API, smallest bundle (56.3 KB vs Nodemailer's 156.8 KB), TypeScript-first SDK, free tier covers 3,000 emails/month (sufficient for v1 SaaS with small tenant count). Last published 13 days ago — actively maintained. |

**Why NOT Nodemailer?**
Nodemailer is an SMTP client — it requires you to manage an SMTP server or configure a third-party relay (Gmail, Mailgun, SendGrid). On a VPS without a dedicated mail server, deliverability is unreliable (IP reputation, SPF/DKIM setup complexity). Nodemailer is the right choice when you have an existing mail infrastructure. This project doesn't.

Nodemailer has 11.9M weekly downloads vs Resend's 3.8M, but download count reflects legacy adoption — it is the older standard. Resend's modern API and managed deliverability are the correct choice for a new SaaS.

**Why NOT SendGrid or Mailgun?**
Both are established services but have heavier SDKs, more complex pricing, and require more configuration steps than Resend. Resend's developer experience is significantly better for a simple invitation flow.

**Resend free tier:** 3,000 emails/month, 1 domain. Sufficient for v1. Paid tier starts at $20/month for 50,000 emails.

**Email usage in this project:**
- Owner invitation (when super admin creates a company)
- Team member invitation (Owner invites Collaborators/Viewers)
- Client account creation invitation
- Password reset (if implementing custom auth)

**Resend usage pattern:**
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: inviteeEmail,
  subject: 'You have been invited to join DebtTracker',
  html: invitationEmailTemplate(inviteToken),
});
```

### File Storage — Docker Volume Strategy

**Decision: Named Docker volume with bind-mount for backup access**

| Aspect | Approach |
|--------|----------|
| Volume type | Named Docker volume (not bind mount in production) |
| Container path | `/app/uploads` |
| Multer diskStorage destination | `/app/uploads/{companyId}/{type}/` |
| Static file serving | Express `express.static('/app/uploads')` behind auth middleware (NOT publicly accessible) |
| Nginx | Does NOT serve uploads directly — Express controls access with auth check |
| Backup | Named volume maps to `/var/lib/docker/volumes/receipts_uploads/_data` on host — include in VPS backup script |

**Why named volume over bind mount?**
Named volumes are managed by Docker, work identically on any host, and survive container rebuilds. Bind mounts tie you to a specific host path — acceptable in development, fragile in production deployments.

**Why serve via Express (not Nginx)?**
Uploaded proof documents (receipt photos, payment screenshots) are sensitive financial data. Serving them through Express lets you authenticate the request and verify the requester has permission to access that specific file (owns or belongs to the same company). Nginx static serving bypasses this — any URL-guesser could access any file.

**File path convention:**
```
/app/uploads/
  {companyId}/
    transactions/{transactionId}-{timestamp}.jpg
    payments/{paymentId}-{timestamp}.jpg
```

This structure ensures files are naturally scoped to a company. On delete/data export, all files for a company can be found in one directory.

**docker-compose.yml pattern:**
```yaml
services:
  api:
    volumes:
      - uploads_data:/app/uploads

volumes:
  uploads_data:
    driver: local
```

**File validation (Multer fileFilter):**
```typescript
const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});
```

---

## Supporting Libraries Summary

| Library | Version | Purpose |
|---------|---------|---------|
| multer | 2.1.1 | Multipart/form-data file upload middleware |
| sharp | 0.34.5 | Image resize + compression before disk write |
| react-dropzone | 15.0.0 | Client-side file selection drag-and-drop UI |
| pdfkit | 0.18.0 | Server-side PDF generation (receipts, reports) |
| @types/pdfkit | latest | TypeScript types for pdfkit |
| resend | 6.9.4 | Transactional email (invitations) |

---

## Installation

```bash
# Server — file handling and PDF
npm install multer sharp pdfkit resend
npm install -D @types/multer @types/pdfkit

# Client — file selection UI
npm install react-dropzone
```

---

## Alternatives Considered

| Category | Recommended | Alternatives Rejected | Why Rejected |
|----------|-------------|----------------------|--------------|
| Server upload middleware | multer 2.1.1 | formidable, busboy directly | More boilerplate, no typed req.file, no benefit |
| Image processing | sharp 0.34.5 | jimp, imagemagick | jimp is pure-JS (slow), imagemagick requires system binary |
| Client file UI | react-dropzone 15.0.0 | uppy | Uppy is 10x larger, built for cloud/resumable uploads; overkill for disk storage |
| Mobile camera capture | Native HTML input capture | react-webcam, react-camera-pro | Both stale (2+ years no updates), native capture attribute works in all modern mobile browsers |
| PDF generation | pdfkit 0.18.0 | puppeteer/playwright, @react-pdf/renderer, pdfmake | Puppeteer/Playwright uses 100-300MB RAM per process (VPS resource risk); @react-pdf/renderer is client-side only; pdfmake is viable but more verbose for simple tables |
| Email | resend 6.9.4 | nodemailer, sendgrid, mailgun | Nodemailer needs SMTP server/relay config and has deliverability risks on VPS IPs; SendGrid/Mailgun are heavier; Resend has best DX and free tier |
| Multi-tenancy | tenant_id column per row | schema-per-tenant, database-per-tenant | Schema/DB-per-tenant has no Drizzle migration tooling support, high operational cost for small SaaS |

---

## What NOT to Use — With Reasons

| Library | Reason to Avoid |
|---------|----------------|
| `multer` < 2.0.0 | Vulnerable to memory leak CVE (stream not closed on error) — upgrade to 2.1.1 |
| `react-webcam` | Last updated 2 years ago (v7.2.0). Maintenance risk. Not needed — native HTML `capture` attribute covers the use case. |
| `react-camera-pro` | Last updated 2 years ago (v1.4.0). Same issue. |
| `puppeteer` / `playwright` for PDF | 100–300MB RAM per browser instance. Will destabilize a shared VPS. |
| `@react-pdf/renderer` for server reports | Client-side only — sends sensitive financial data to browser to render PDF. Wrong architecture. |
| `schema-per-tenant` multi-tenancy | Drizzle has no native tooling for multi-schema migrations. Operational overhead far outweighs isolation benefit at small scale. |
| `express.static` for uploads exposed publicly | Bypasses authentication — any URL-guesser can access private financial documents. Always authenticate file access in middleware. |
| Nodemailer on VPS without mail server | Poor deliverability, SPF/DKIM setup complexity, IP reputation issues. |

---

## Sources

**File Upload:**
- [multer GitHub releases](https://github.com/expressjs/multer/releases) — v2.1.1, March 2025 (HIGH confidence)
- [react-dropzone GitHub releases](https://github.com/react-dropzone/react-dropzone/releases) — v15.0.0, February 2026 (HIGH confidence)
- [MDN: HTML capture attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture) — browser built-in (HIGH confidence)

**Multi-Tenancy:**
- [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls) — official, current (HIGH confidence)
- [AWS: Multi-tenant data isolation with PostgreSQL RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) — MEDIUM confidence
- [pgvpd Drizzle RLS discussion](https://github.com/drizzle-team/drizzle-orm/discussions/5411) — MEDIUM confidence

**PDF Generation:**
- [pdfkit GitHub releases](https://github.com/foliojs/pdfkit/releases) — v0.18.0, March 2025 (HIGH confidence)
- [@react-pdf/renderer GitHub releases](https://github.com/diegomura/react-pdf/releases) — v4.3.2, December 2024 (HIGH confidence)
- [PDFBolt: Top Node.js PDF libraries](https://pdfbolt.com/blog/top-nodejs-pdf-generation-libraries) — MEDIUM confidence

**Email:**
- [Resend npm releases](https://github.com/resend/resend-node/releases) — v6.9.4, actively maintained (HIGH confidence)
- [Resend pricing page](https://resend.com/pricing) — 3,000 emails/month free tier (HIGH confidence)

**Image Processing:**
- [sharp GitHub releases](https://github.com/lovell/sharp/releases) — v0.34.5, November 2024 (HIGH confidence)
- [sharp official docs](https://sharp.pixelplumbing.com/) — HIGH confidence

**Docker File Storage:**
- [Express static files docs](https://expressjs.com/en/starter/static-files.html) — official (HIGH confidence)
- [Docker volumes docs](https://docs.docker.com/engine/storage/volumes/) — official (HIGH confidence)
