# Phase 7: Reports & PDF Export - Research

**Researched:** 2026-04-01
**Domain:** Report aggregation, PDF generation, file upload (logo), tabular UI
**Confidence:** HIGH

## Summary

Phase 7 is a read-only reporting layer over the existing debt-tracking data, plus server-side PDF generation with PDFKit 0.18.0 and a company logo upload feature for PDF branding. The codebase already has all prerequisite data structures: the `debtBalances` view computes remaining balances from confirmed payments, and the existing `clients`, `transactions`, `debts`, and `payments` tables provide all data needed for both company-wide and per-client reports.

The main technical challenges are: (1) building a custom table renderer in PDFKit since it has no built-in table API, (2) implementing "Page X of Y" footers using PDFKit's `bufferPages` mode which prevents streaming (requires buffering the entire PDF in memory before writing page footers), and (3) adding a `logoPath` column to the `companies` table with a new migration plus a logo upload endpoint that reuses the existing multer+sharp pipeline.

**Primary recommendation:** Build a reusable `PDFTableBuilder` helper class that handles column positioning, row iteration, page breaks with repeated headers, and page numbering. This avoids duplicating table logic across 3 PDF types (company report, client report, receipt).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Company report shows one row per client with: name, total debts, total paid, outstanding balance. Filtered by date range.
- **D-02:** Per-client report shows full transaction list with their debts, then each debt's payment history within the selected date range.
- **D-03:** Zero-balance clients are hidden by default with a "Show settled clients" toggle to reveal them.
- **D-04:** Default date range is last 30 days (rolling window). Filters available for date range, client name, debt status, and other key fields.
- **D-05:** Company report table supports client-side column sorting (click header to sort by name, outstanding balance, etc.). All data loaded -- no server-side sort.
- **D-06:** Reports section accessible via a top-level "Reports" sidebar navigation item.
- **D-07:** Single /reports page with two tabs: "Company Report" and "Client Report". Client report tab includes a client selector dropdown. Shared filter bar at top.
- **D-08:** Add @media print CSS stylesheet to hide nav/filters and format tables for paper (Ctrl+P friendly).
- **D-09:** PDF header includes company logo (uploaded via company settings) and company name text. Requires a new company logo upload feature.
- **D-10:** PDF footer: "Page X of Y" centered, "Generated: [date]" in bottom corner.
- **D-11:** Multi-page table PDFs repeat column headers on each page for readability.
- **D-12:** Helvetica font (PDFKit built-in). No external font files needed.
- **D-13:** Receipt PDF is a single-document snapshot containing: company header (logo + name), client info, transaction details (ref#, date, items/products, total), debt status, and payment history for that debt.
- **D-14:** "Download PDF" button appears on the transaction detail page. Also available on debt detail page for the debt+payment view.
- **D-15:** Receipt PDF targets single-page layout. Overflow to second page only if many line items or payments.

### Claude's Discretion
- Table sorting implementation approach (state management, sort indicators)
- PDF layout spacing, margins, and exact positioning
- Filter component design (inline vs. collapsible filter panel)
- Client selector component in client report tab

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-10.1 | Company report: all clients with outstanding balance, filterable by date range | `debtBalances` view + clients join; date filter on `debts.createdAt` or transactions date range; D-01 through D-05 |
| FR-10.2 | Per-client report: full transaction and payment history over a date range | transactions + debts + payments joined by clientId with date range filter; D-02 |
| FR-10.3 | PDF export of company report and per-client report (PDFKit 0.18.0 server-side) | PDFKit 0.18.0 with bufferPages for Page X of Y; custom table renderer; D-09 through D-15 |
| FR-10.4 | Client portal: personal summary showing total owed, total paid, and recent payment history | Already partially addressed by portal pages (Phase 3/6); may need summary endpoint enhancement |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfkit | 0.18.0 | Server-side PDF generation | Locked in REQUIREMENTS.md; lightweight, no headless browser needed |
| @types/pdfkit | 0.17.5 | TypeScript definitions for PDFKit | Latest available on npm; provides PDFDocument type info |
| drizzle-orm | 0.45.2 | Database queries for report aggregation | Already installed and pinned (STATE.md decision) |
| express | 5.2.1 | HTTP endpoint for PDF streaming | Already installed |
| multer | 2.1.1 | Logo file upload handling | Already installed; reuse existing upload middleware pattern |
| sharp | 0.34.5 | Logo image processing (resize, compress) | Already installed; reuse existing upload.service.ts pipeline |
| zod | 4.3.6 | Query parameter validation for report endpoints | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-type | 22.x | Magic byte validation for logo upload | Already installed; reuse for logo upload validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfkit (manual tables) | pdfkit-table (0.1.99) | pdfkit-table adds convenience but is a thin wrapper with limited TS support; custom table builder gives full control over D-11 (repeated headers) and D-10 (page numbering) |
| Custom PDF table renderer | Puppeteer/playwright | Too heavy for shared VPS (locked out by NFR-10.3) |

**Installation:**
```bash
cd backend && npm install pdfkit@0.18.0 @types/pdfkit@0.17.5
```

**Version verification:** pdfkit 0.18.0 confirmed on npm registry (2026-04-01). @types/pdfkit 0.17.5 confirmed on npm registry.

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
├── routes/
│   └── reports.ts           # Report API endpoints (GET company, GET client, GET receipt PDFs)
├── services/
│   ├── report.service.ts    # Data aggregation queries for reports
│   ├── pdf/
│   │   ├── pdf-base.ts      # Shared PDF utilities (header, footer, table builder)
│   │   ├── company-report.pdf.ts   # Company report PDF layout
│   │   ├── client-report.pdf.ts    # Per-client report PDF layout
│   │   └── receipt.pdf.ts          # Transaction receipt PDF layout
│   └── upload.service.ts    # Existing — extend entityType for 'logos'
frontend/src/
├── pages/
│   └── reports/
│       └── ReportsPage.tsx  # Single page with two tabs (D-07)
├── components/
│   └── reports/
│       ├── CompanyReportTab.tsx    # Company report table with sorting
│       ├── ClientReportTab.tsx     # Client report with selector
│       ├── ReportFilterBar.tsx     # Shared filter bar (date range, status, etc.)
│       └── SortableHeader.tsx      # Reusable sortable column header
├── api/
│   └── reports.ts           # API client functions for report endpoints
```

### Pattern 1: Report Data API (JSON only, no PDF)
**What:** Separate data endpoints from PDF endpoints. Report UI fetches JSON; PDF buttons trigger PDF download.
**When to use:** Always -- keeps concerns separate and allows the UI to render data without generating PDFs.
**Example:**
```typescript
// backend/src/routes/reports.ts
// GET /api/v1/reports/company?dateFrom=&dateTo=&showSettled=false
// Returns JSON array of { clientId, clientName, totalDebts, totalPaid, outstandingBalance }

// GET /api/v1/reports/client/:clientId?dateFrom=&dateTo=
// Returns JSON with transactions and their debts/payments for that client

// GET /api/v1/reports/company/pdf?dateFrom=&dateTo=
// Streams PDF directly to response

// GET /api/v1/reports/client/:clientId/pdf?dateFrom=&dateTo=
// Streams client report PDF

// GET /api/v1/reports/receipt/:transactionId/pdf
// Streams receipt PDF for a single transaction
```

### Pattern 2: PDFKit Stream to HTTP Response
**What:** Create PDFDocument, set headers, pipe to res, call doc.end()
**When to use:** All PDF endpoints
**Example:**
```typescript
// Source: PDFKit official docs (pdfkit.org/docs/getting_started.html)
import PDFDocument from 'pdfkit';

export function streamPdf(res: Response, filename: string, buildFn: (doc: PDFKit.PDFDocument) => void) {
  const doc = new PDFDocument({ bufferPages: true, size: 'LETTER', margin: 50 });
  
  // Build all content first (pages are buffered)
  buildFn(doc);
  
  // Add page numbers after all pages exist
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Footer: "Page X of Y" centered
    doc.fontSize(8).text(
      `Page ${i + 1} of ${range.count}`,
      50, doc.page.height - 40,
      { align: 'center', width: doc.page.width - 100 }
    );
    // Footer: "Generated: [date]" right-aligned
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      50, doc.page.height - 40,
      { align: 'right', width: doc.page.width - 100 }
    );
  }
  
  // Set response headers and pipe
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  doc.end();
}
```

### Pattern 3: Client-Side Column Sorting (D-05)
**What:** React state tracks sort column and direction; array sorted in-memory before rendering.
**When to use:** Company report table (all data loaded, no server-side sort).
**Example:**
```typescript
type SortKey = 'clientName' | 'totalDebts' | 'totalPaid' | 'outstandingBalance';
type SortDir = 'asc' | 'desc';

const [sortKey, setSortKey] = useState<SortKey>('outstandingBalance');
const [sortDir, setSortDir] = useState<SortDir>('desc');

const sorted = [...data].sort((a, b) => {
  const aVal = a[sortKey];
  const bVal = b[sortKey];
  const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : Number(aVal) - Number(bVal);
  return sortDir === 'asc' ? cmp : -cmp;
});

function toggleSort(key: SortKey) {
  if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
  else { setSortKey(key); setSortDir('desc'); }
}
```

### Pattern 4: Company Logo Upload (D-09)
**What:** Reuse existing multer+sharp pipeline; store logo at `{UPLOAD_DIR}/{companyId}/logo.jpg`; add `logoPath` column to companies table via migration.
**When to use:** Logo upload endpoint
**Example:**
```typescript
// POST /api/v1/companies/logo (owner only)
// Uses single-file multer middleware (not the 5-file array middleware)
// sharp resizes to max 300px width, JPEG, quality 90
// Overwrites previous logo (single logo per company)
// Returns { logoPath: string }
```

### Pattern 5: PDF Table Builder with Repeated Headers (D-11)
**What:** A helper class that draws tabular data across multiple pages, repeating column headers on each new page.
**When to use:** All report PDFs with tables.
**Example:**
```typescript
interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  getValue: (row: any) => string;
}

function drawTable(doc: PDFKit.PDFDocument, columns: TableColumn[], rows: any[], startY: number) {
  const pageBottom = doc.page.height - 60; // leave room for footer
  let y = startY;
  
  function drawHeaders() {
    doc.fontSize(9).font('Helvetica-Bold');
    let x = 50;
    for (const col of columns) {
      doc.text(col.header, x, y, { width: col.width, align: col.align || 'left' });
      x += col.width;
    }
    y += 18;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke();
    y += 5;
  }
  
  drawHeaders();
  
  doc.font('Helvetica').fontSize(9);
  for (const row of rows) {
    if (y + 20 > pageBottom) {
      doc.addPage();
      y = 50;
      drawHeaders();
      doc.font('Helvetica').fontSize(9);
    }
    let x = 50;
    for (const col of columns) {
      doc.text(col.getValue(row), x, y, { width: col.width, align: col.align || 'left' });
      x += col.width;
    }
    y += 16;
  }
  return y;
}
```

### Anti-Patterns to Avoid
- **Server-side sorting for reports:** D-05 explicitly says "All data loaded -- no server-side sort." Do NOT add ORDER BY to report queries for the purpose of UI sorting.
- **Storing PDF files on disk:** PDFs are generated on-the-fly and streamed. Never save report PDFs to the filesystem.
- **Using `doc.pipe(res)` with `bufferPages: true` before calling `doc.end()`:** The pipe must happen AFTER all content is built and page numbers are added, but BEFORE `doc.end()`.
- **Using float arithmetic for money in report aggregation:** All money comes from DB as NUMERIC strings. Use `toCents`/`fromCents` for any application-layer arithmetic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | HTML-to-PDF conversion | PDFKit 0.18.0 (locked decision) | Puppeteer is too heavy for VPS; PDFKit is lightweight and stream-based |
| Image processing for logo | Manual buffer manipulation | sharp (already installed) | EXIF rotation, resize, compression in one pipeline |
| File upload handling | Manual multipart parsing | multer (already installed) | Handles multipart boundaries, size limits, memory storage |
| Date range validation | Manual string parsing | Zod string + Date constructor | Consistent with project's validation pattern |

**Key insight:** Nearly all infrastructure for this phase already exists in the codebase. The upload pipeline, multer middleware, sharp processing, Zod validation, and drizzle query patterns are all established. The only new library is PDFKit itself.

## Common Pitfalls

### Pitfall 1: bufferPages and Memory Usage
**What goes wrong:** Using `bufferPages: true` means the entire PDF is held in memory until `doc.end()`. Large reports with thousands of rows could consume significant RAM.
**Why it happens:** PDFKit normally flushes pages to the stream immediately, but D-10 requires "Page X of Y" which needs the total page count upfront.
**How to avoid:** For v1, this is acceptable -- reports are per-company and unlikely to exceed a few hundred rows. If needed later, page numbering can be changed to "Page X" (without total) to enable streaming without buffering.
**Warning signs:** High memory usage on the VPS during PDF generation; OOM kills.

### Pitfall 2: Drizzle NUMERIC Returns Strings
**What goes wrong:** Drizzle returns NUMERIC(12,2) columns as strings (e.g., "1234.56"), not numbers. Sorting or comparing them as strings gives lexicographic order ("9.99" > "10.00").
**Why it happens:** PostgreSQL NUMERIC exceeds JavaScript's number precision, so drizzle-orm returns strings.
**How to avoid:** Always convert to cents (integer) using `toCents()` before arithmetic. In the report query, consider using SQL-level SUM/aggregation to let PostgreSQL handle the math, returning pre-computed totals as strings.
**Warning signs:** Report totals don't match; sorting by amount produces wrong order.

### Pitfall 3: Company Logo Path in PDF Generation
**What goes wrong:** PDFKit's `doc.image()` requires a file path or buffer. The logo is stored on disk at `{UPLOAD_DIR}/{companyId}/logo.jpg`. If `UPLOAD_DIR` isn't correctly resolved, the PDF fails silently (no logo) or crashes.
**Why it happens:** Environment variable `UPLOAD_DIR` may differ between dev and production; Docker bind-mount path vs. local path.
**How to avoid:** Read logo as a Buffer before passing to PDFKit. Handle missing logo gracefully (skip logo, show company name only). Always check file existence before calling `doc.image()`.
**Warning signs:** PDFs render without logos; "ENOENT" errors in logs.

### Pitfall 4: Date Range Filter Boundary Conditions
**What goes wrong:** Date range filter uses `>=` and `<=` on timestamp columns, but timestamps include time component. A filter for "2026-03-01 to 2026-03-31" misses transactions created at 2026-03-31T14:00:00Z if using date-only comparison.
**Why it happens:** The `dateFrom`/`dateTo` query params are date strings without time. Transaction `createdAt` is a full timestamp.
**How to avoid:** Use `dateTo + 1 day` for the upper bound (exclusive), or compare using `::date` cast in SQL. Alternatively, use `< dateTo + '1 day'::interval` in the query.
**Warning signs:** Transactions on the last day of the range are missing from reports.

### Pitfall 5: PDF Table Column Width Overflow
**What goes wrong:** Long client names or amounts overflow their column, overlapping adjacent columns.
**Why it happens:** PDFKit does not auto-wrap text in table cells by default. Fixed column widths assume reasonable data lengths.
**How to avoid:** Use the `width` option in `doc.text()` to constrain text to column bounds. PDFKit will truncate or wrap within the width. Set `ellipsis: true` for single-line truncation.
**Warning signs:** Overlapping text in PDF tables.

### Pitfall 6: Missing Migration for Logo Column
**What goes wrong:** Forgetting to add a drizzle migration for the new `logoPath` column on the `companies` table causes runtime errors when querying or updating the logo path.
**Why it happens:** Logo upload is a "small feature" that might be overlooked in migration planning.
**How to avoid:** Include the migration step explicitly in the plan. The migration adds `logoPath varchar(500)` nullable to companies.
**Warning signs:** Database errors on logo upload/query.

### Pitfall 7: Report Route Mounted Without company_id Scoping
**What goes wrong:** Report queries return data across all companies if `company_id` filter is forgotten.
**Why it happens:** Copy-paste from other routes without the `WHERE company_id = $1` clause.
**How to avoid:** Mount report routes with `requireTenant` middleware (consistent with other tenant-scoped routes). Always use `req.companyId!` in queries.
**Warning signs:** Cross-tenant data leakage in reports.

## Code Examples

### Company Report Query (Drizzle)
```typescript
// Source: Existing debtBalances view (backend/src/db/schema.ts:422-448)
// Aggregates per client: total debts, total paid, outstanding balance
const companyReport = await db
  .select({
    clientId: clients.id,
    clientName: clients.fullName,
    totalDebts: sql<string>`COALESCE(SUM(${debtBalances.totalAmount}), 0)`,
    totalPaid: sql<string>`COALESCE(SUM(${debtBalances.amountPaid}), 0)`,
    outstandingBalance: sql<string>`COALESCE(SUM(${debtBalances.remainingBalance}), 0)`,
  })
  .from(clients)
  .leftJoin(debtBalances, and(
    eq(debtBalances.clientId, clients.id),
    eq(debtBalances.companyId, clients.companyId),
  ))
  .where(and(
    eq(clients.companyId, companyId),
    eq(clients.isActive, true),
    // Date range filter on debts if needed
  ))
  .groupBy(clients.id, clients.fullName);
```

### PDF Streaming in Express Route
```typescript
// Source: PDFKit docs (pdfkit.org/docs/getting_started.html)
reportsRouter.get('/company/pdf', async (req, res) => {
  const companyId = req.companyId!;
  const { dateFrom, dateTo } = req.query;
  
  const data = await getCompanyReportData(companyId, dateFrom, dateTo);
  const company = await getCompany(companyId);
  
  const doc = new PDFDocument({ bufferPages: true, size: 'LETTER', margin: 50 });
  
  // Build PDF content
  await addCompanyHeader(doc, company);
  drawCompanyReportTable(doc, data);
  
  // Add page numbers (D-10)
  addPageNumbers(doc);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="company-report-${new Date().toISOString().slice(0,10)}.pdf"`);
  doc.pipe(res);
  doc.end();
});
```

### Logo Upload Endpoint
```typescript
// Reuses existing upload.service.ts pattern
// POST /api/v1/companies/logo
// Single file, multer memoryStorage, sharp resize to 300px, JPEG
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('logo');

// sharp pipeline: rotate + resize 300px + jpeg quality 90
// Store at: {UPLOAD_DIR}/{companyId}/logo.jpg (overwrites previous)
// Update companies.logoPath in DB
```

### Frontend PDF Download Trigger
```typescript
// Frontend pattern for PDF download via authenticated fetch
async function downloadPdf(url: string, filename: string) {
  const response = await apiClient(url); // uses credentials: include
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(downloadUrl);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer for PDF | PDFKit for lightweight PDF | N/A (locked decision) | No headless browser dependency on VPS |
| pdfkit-table wrapper | Custom table builder | N/A | Full control over D-11 repeated headers and page break behavior |
| Content-Disposition: inline | Content-Disposition: attachment | N/A | Forces download instead of in-browser render; more reliable cross-browser |

**Deprecated/outdated:**
- PDFKit's `doc.text()` without width parameter: Always specify width to prevent text overflow in tables.
- `pdfkit-table` npm package: Thin wrapper with no TypeScript types; not worth the dependency for our custom needs.

## Open Questions

1. **Date range filter target column**
   - What we know: D-04 says filter by date range. Reports aggregate debts.
   - What's unclear: Should the date range filter on `debts.createdAt`, `transactions.deliveredAt`, or `transactions.createdAt`?
   - Recommendation: Use `debts.createdAt` for company report (when was the debt created) and `transactions.deliveredAt` for per-client report (delivery timeline). This aligns with the business purpose of each report.

2. **FR-10.4: Client portal personal summary**
   - What we know: FR-10.4 requires a personal summary for the client portal.
   - What's unclear: The portal already shows debts and payment history (Phase 3/6). Is additional work needed?
   - Recommendation: Verify existing portal endpoints cover the summary requirement. If they already return total owed/paid/recent payments, no new work needed. If not, add a lightweight summary endpoint.

3. **Company settings page for logo upload**
   - What we know: D-09 requires logo upload via company settings.
   - What's unclear: No company settings page currently exists.
   - Recommendation: Create a minimal settings page at `/settings` with logo upload only. Keep it simple -- just an upload area showing current logo with replace/remove.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `backend/vitest.config.ts`, `frontend/vitest.config.ts` |
| Quick run command | `cd backend && npx vitest run --reporter=verbose` |
| Full suite command | `cd backend && npx vitest run && cd ../frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-10.1 | Company report returns per-client balances with date filter | unit | `cd backend && npx vitest run src/__tests__/reports.test.ts -t "company report" -x` | No - Wave 0 |
| FR-10.2 | Client report returns transactions+payments with date filter | unit | `cd backend && npx vitest run src/__tests__/reports.test.ts -t "client report" -x` | No - Wave 0 |
| FR-10.3 | PDF endpoints return valid PDF content-type and binary data | unit | `cd backend && npx vitest run src/__tests__/reports.test.ts -t "pdf" -x` | No - Wave 0 |
| FR-10.3 | Company_id scoping on all report queries | unit | `cd backend && npx vitest run src/__tests__/reports.test.ts -t "scoping" -x` | No - Wave 0 |
| D-09 | Logo upload stores file and updates company record | unit | `cd backend && npx vitest run src/__tests__/reports.test.ts -t "logo" -x` | No - Wave 0 |
| D-05 | Company report table sorts by column in UI | unit | `cd frontend && npx vitest run src/__tests__/reports.test.tsx -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd backend && npx vitest run && cd ../frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/__tests__/reports.test.ts` -- covers FR-10.1, FR-10.2, FR-10.3, D-09
- [ ] `frontend/src/__tests__/reports.test.tsx` -- covers D-05 sorting behavior
- [ ] PDFKit mocking strategy: mock `PDFDocument` constructor in tests to verify method calls without generating actual PDFs

## Sources

### Primary (HIGH confidence)
- PDFKit official docs (pdfkit.org/docs/getting_started.html) - bufferPages, switchToPage, pipe-to-stream, image embedding
- Existing codebase: `backend/src/db/schema.ts` debtBalances view (lines 422-448)
- Existing codebase: `backend/src/services/upload.service.ts` - multer+sharp pipeline
- Existing codebase: `backend/src/routes/debts.ts` - financial query patterns with company_id scoping
- npm registry: pdfkit@0.18.0, @types/pdfkit@0.17.5 (verified 2026-04-01)

### Secondary (MEDIUM confidence)
- GitHub issue #953 (foliojs/pdfkit) - page numbering patterns
- PDFKit guide PDF v0.17.1 (pdfkit.org/docs/guide.pdf) - comprehensive API reference

### Tertiary (LOW confidence)
- pdfkit-table npm package (0.1.99) - evaluated and rejected; limited TS support

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PDFKit 0.18.0 locked; all other libraries already installed
- Architecture: HIGH - Read-only layer over existing data; well-understood patterns
- Pitfalls: HIGH - Based on direct examination of codebase patterns and PDFKit API
- PDF table rendering: MEDIUM - Custom table builder is standard practice but implementation details need tuning during execution

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain; PDFKit API changes infrequently)
