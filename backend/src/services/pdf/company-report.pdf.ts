import type PDFDocument from 'pdfkit';
import { addCompanyHeader, drawTable } from './pdf-base.js';
import type { TableColumn } from './pdf-base.js';
import { PDF } from '../../constants/strings/pdf.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CompanyReportRow {
  clientId: string;
  clientName: string;
  totalDebts: string;
  totalPaid: string;
  outstandingBalance: string;
}

// ─── buildCompanyReportPdf ──────────────────────────────────────────────────
// Generates a company report PDF with per-client balance table.
// UI-SPEC PDF Columns: Client Name (180), Total Debts (100), Total Paid (100), Outstanding Balance (120)

export async function buildCompanyReportPdf(
  doc: InstanceType<typeof PDFDocument>,
  companyName: string,
  logoPath: string | null,
  data: CompanyReportRow[],
  dateFrom?: string,
  dateTo?: string,
): Promise<void> {
  // Build date range string for header
  const dateRange =
    dateFrom || dateTo
      ? `${dateFrom || 'Start'} - ${dateTo || 'Present'}`
      : undefined;

  const headerEndY = await addCompanyHeader(
    doc,
    companyName,
    logoPath,
    PDF.companyReportTitle,
    dateRange,
  );

  // Define table columns per UI-SPEC
  const columns: TableColumn[] = [
    { header: PDF.thClientName, width: 180, align: 'left', getValue: (r: CompanyReportRow) => r.clientName },
    { header: PDF.thTotalDebts, width: 100, align: 'right', getValue: (r: CompanyReportRow) => `$${r.totalDebts}` },
    { header: PDF.thTotalPaid, width: 100, align: 'right', getValue: (r: CompanyReportRow) => `$${r.totalPaid}` },
    { header: PDF.thOutstandingBalance, width: 120, align: 'right', getValue: (r: CompanyReportRow) => `$${r.outstandingBalance}` },
  ];

  drawTable(doc, columns, data, headerEndY);
}
