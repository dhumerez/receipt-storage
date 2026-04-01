# Phase 7: Reports & PDF Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 07-reports-pdf-export
**Areas discussed:** Report data scope, Report UI layout, PDF document design, Receipt PDF

---

## Report Data Scope

### Company report row structure

| Option | Description | Selected |
|--------|-------------|----------|
| One row per client | Each client as a row with: name, total debts, total paid, outstanding balance | ✓ |
| One row per debt | Each individual debt as a row with client name, transaction ref, amount, paid, remaining | |
| Both views | Summary by client with expandable rows showing individual debts | |

**User's choice:** One row per client
**Notes:** None

### Per-client report detail level

| Option | Description | Selected |
|--------|-------------|----------|
| Transactions + payments | List of transactions with their debts, then each debt's payment history | ✓ |
| Debts + payments only | Skip transaction details, just show debts and their payments | |
| Full ledger | Chronological mix of all transactions, debts, and payments as timeline | |

**User's choice:** Transactions + payments
**Notes:** None

### Zero-balance clients

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden by default, toggle to show | A checkbox/toggle 'Show settled clients' | ✓ |
| Always visible but dimmed | Gray text or reduced opacity for fully-paid clients | |
| Always hidden | Company report only shows clients who owe money | |

**User's choice:** Hidden by default, toggle to show
**Notes:** None

### Default date range

| Option | Description | Selected |
|--------|-------------|----------|
| Current month | From 1st of current month to today | |
| Last 30 days | Rolling 30-day window regardless of month boundaries | ✓ |
| No default — require selection | User must pick both dates before seeing any data | |

**User's choice:** Last 30 days, with filters ready to be set by date and any other important field
**Notes:** User wanted filters for multiple fields, not just date range

---

## Report UI Layout

### Column sorting

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side sorting | Click column headers to sort. All data already loaded | ✓ |
| No sorting | Fixed order (e.g., highest balance first) | |
| Server-side sorting | Sort param sent to API | |

**User's choice:** Client-side sorting
**Notes:** None

### Navigation placement

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar item 'Reports' | New top-level nav item in the sidebar | ✓ |
| Inside each client's detail page | Per-client report from client detail page | |
| Dashboard widget + dedicated page | Summary widget on dashboard linking to full page | |

**User's choice:** Sidebar item 'Reports'
**Notes:** None

### Page structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single page with tabs | Two tabs: 'Company Report' and 'Client Report'. Shared filter bar | ✓ |
| Two separate pages | /reports/company and /reports/client/:id as distinct routes | |
| Single scrollable page | Company summary at top, per-client breakdowns below in accordion | |

**User's choice:** Single page with tabs
**Notes:** None

### Print support

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with print stylesheet | @media print CSS to hide nav/filters and format for paper | ✓ |
| PDF only | No print styling — users download PDF | |
| Both print + PDF | Same as option 1, explicitly tested for both | |

**User's choice:** Yes, with print stylesheet
**Notes:** None

---

## PDF Document Design

### Branding

| Option | Description | Selected |
|--------|-------------|----------|
| Company name text only | Bold company name + address/contact as text header | |
| Logo upload + name | Let companies upload a logo in settings, embed in PDF header | ✓ |
| No header branding | Just report title and date range | |

**User's choice:** Logo upload + name
**Notes:** This adds a new company logo upload feature to the phase scope

### Footer

| Option | Description | Selected |
|--------|-------------|----------|
| Page number + generation date | 'Page 1 of 3' centered, 'Generated: date' in corner | ✓ |
| Page number only | Just 'Page X of Y' centered | |
| Full footer | Page number + date + company name + 'Confidential' | |

**User's choice:** Page number + generation date
**Notes:** None

### Page breaks

| Option | Description | Selected |
|--------|-------------|----------|
| Repeat header row on each page | Table column headers at top of every page | ✓ |
| No repeat | Header only on first page | |

**User's choice:** Repeat header row on each page
**Notes:** None

### Font

| Option | Description | Selected |
|--------|-------------|----------|
| Helvetica | PDFKit built-in, clean, professional | ✓ |
| Custom font matching app | Embed same font as web app, requires bundling .ttf | |
| Times New Roman | Traditional/formal look, built-in | |

**User's choice:** Helvetica
**Notes:** None

---

## Receipt PDF

### Receipt content

| Option | Description | Selected |
|--------|-------------|----------|
| Transaction + debt + payments | Company header, client info, transaction details, debt status, payment history | ✓ |
| Transaction only | Just transaction details: ref#, date, items, total | |
| Payment confirmation | Single payment: amount, date, method, debt reference, remaining balance | |

**User's choice:** Transaction + debt + payments
**Notes:** None

### Download button placement

| Option | Description | Selected |
|--------|-------------|----------|
| Transaction detail page | 'Download PDF' button on transaction detail page. Also on debt detail page | ✓ |
| Action menu in table rows | Three-dot menu on each transaction row in list | |
| Both locations | Button on detail page AND action menu in list rows | |

**User's choice:** Transaction detail page
**Notes:** Also on debt detail page for debt+payment view

### Page limit

| Option | Description | Selected |
|--------|-------------|----------|
| Single page preferred | Compact layout fitting one page. Overflow only if many items | ✓ |
| No page limit | Let content flow naturally across pages | |

**User's choice:** Single page preferred
**Notes:** None

---

## Claude's Discretion

- Table sorting implementation approach
- PDF layout spacing, margins, positioning
- Filter component design
- Client selector component

## Deferred Ideas

None — discussion stayed within phase scope
