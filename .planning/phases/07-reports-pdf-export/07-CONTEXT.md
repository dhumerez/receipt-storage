# Phase 7: Reports & PDF Export - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Read-only reporting layer on top of existing financial data. Company-wide outstanding balance reports, per-client transaction/payment history reports, and server-side PDF generation (PDFKit 0.18.0). Includes a company logo upload feature for PDF branding. No new data mutations — purely a consumption/export layer.

</domain>

<decisions>
## Implementation Decisions

### Report Data Scope
- **D-01:** Company report shows one row per client with: name, total debts, total paid, outstanding balance. Filtered by date range.
- **D-02:** Per-client report shows full transaction list with their debts, then each debt's payment history within the selected date range.
- **D-03:** Zero-balance clients are hidden by default with a "Show settled clients" toggle to reveal them.
- **D-04:** Default date range is last 30 days (rolling window). Filters available for date range, client name, debt status, and other key fields.

### Report UI Layout
- **D-05:** Company report table supports client-side column sorting (click header to sort by name, outstanding balance, etc.). All data loaded — no server-side sort.
- **D-06:** Reports section accessible via a top-level "Reports" sidebar navigation item.
- **D-07:** Single /reports page with two tabs: "Company Report" and "Client Report". Client report tab includes a client selector dropdown. Shared filter bar at top.
- **D-08:** Add @media print CSS stylesheet to hide nav/filters and format tables for paper (Ctrl+P friendly).

### PDF Document Design
- **D-09:** PDF header includes company logo (uploaded via company settings) and company name text. Requires a new company logo upload feature.
- **D-10:** PDF footer: "Page X of Y" centered, "Generated: [date]" in bottom corner.
- **D-11:** Multi-page table PDFs repeat column headers on each page for readability.
- **D-12:** Helvetica font (PDFKit built-in). No external font files needed.

### Receipt PDF
- **D-13:** Receipt PDF is a single-document snapshot containing: company header (logo + name), client info, transaction details (ref#, date, items/products, total), debt status, and payment history for that debt.
- **D-14:** "Download PDF" button appears on the transaction detail page. Also available on debt detail page for the debt+payment view.
- **D-15:** Receipt PDF targets single-page layout. Overflow to second page only if many line items or payments.

### Claude's Discretion
- Table sorting implementation approach (state management, sort indicators)
- PDF layout spacing, margins, and exact positioning
- Filter component design (inline vs. collapsible filter panel)
- Client selector component in client report tab

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §FR-10 — Report requirements (FR-10.1 through FR-10.4)
- `.planning/REQUIREMENTS.md` §Non-Functional — PDFKit 0.18.0 locked as PDF generation library

### Existing Patterns
- `frontend/src/pages/transactions/TransactionsPage.tsx` — Date range filter pattern (two `type="date"` inputs)
- `frontend/src/components/clients/ClientTable.tsx` — Table component pattern (plain `<table>` with row components)
- `backend/src/routes/debts.ts` — API pattern for financial queries with computed balances (debtBalances view)
- `backend/src/services/upload.service.ts` — File upload/processing pattern (reuse for logo upload)
- `backend/src/middleware/upload.ts` — Multer middleware configuration

### Schema
- `backend/src/db/schema.ts` — debtBalances view (lines 422-448) for report aggregation queries

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TransactionsPage.tsx` date range filter: two native `type="date"` inputs — reuse same pattern for report filters
- `ClientTable`/`ProductTable`: plain `<table>` with typed row components — extend pattern with sortable headers
- `upload.service.ts` + `upload.ts`: multer + sharp pipeline — reuse for company logo upload (resize to fixed dimensions)
- `debtBalances` view: pre-computed amountPaid/remainingBalance — use directly for company report aggregation

### Established Patterns
- API routes: Express Router with Zod validation, drizzle-orm queries, company_id scoping
- Frontend: React Query (useQuery/useMutation), Tailwind CSS, no component library
- File handling: multer memoryStorage → sharp processing → disk storage at `{UPLOAD_DIR}/{companyId}/...`

### Integration Points
- Sidebar navigation: `frontend/src/components/layout/` — add "Reports" nav item
- App.tsx routes: add `/reports` route
- Backend app.ts: mount new report router at `/api/v1/reports`
- Transaction detail page: add "Download PDF" button
- Debt detail page: add "Download PDF" button
- Company settings: add logo upload (new settings page or extend existing)

</code_context>

<specifics>
## Specific Ideas

- Logo upload for PDF branding — user specifically chose this over text-only headers, which means a company settings/logo upload feature is needed within this phase
- Filters should be "ready to be set by date and any other important field" — user wants a filter bar that's flexible, not just date range

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-reports-pdf-export*
*Context gathered: 2026-04-01*
