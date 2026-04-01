import type PDFDocument from 'pdfkit';
import { addCompanyHeader, drawTable } from './pdf-base.js';
import type { TableColumn } from './pdf-base.js';
import { PDF } from '../../constants/strings/pdf.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClientReportData {
  client: { id: string; fullName: string; email: string | null; phone: string | null };
  transactions: Array<{
    id: string;
    referenceNumber: string | null;
    deliveredAt: Date | null;
    description: string | null;
    totalAmount: string;
    items: Array<{
      description: string;
      quantity: string;
      unitPrice: string;
      lineTotal: string | null;
    }>;
    debt?: {
      totalAmount: string;
      amountPaid: string;
      remainingBalance: string;
      status: string;
      payments: Array<{
        amount: string;
        paidAt: Date;
        paymentMethod: string | null;
        reference: string | null;
        status: string;
      }>;
    };
  }>;
}

// ─── buildClientReportPdf ───────────────────────────────────────────────────
// Generates a per-client report PDF with transactions, debts, and payment history.
// UI-SPEC Client Report PDF Sections:
// 1. Client info block
// 2. Transactions table (Ref#, Date, Description, Total Amount)
// 3. Per-debt: summary line + payments sub-table

export async function buildClientReportPdf(
  doc: InstanceType<typeof PDFDocument>,
  companyName: string,
  logoPath: string | null,
  reportData: ClientReportData,
  dateFrom?: string,
  dateTo?: string,
): Promise<void> {
  const dateRange =
    dateFrom || dateTo
      ? `${dateFrom || 'Start'} - ${dateTo || 'Present'}`
      : undefined;

  let y = await addCompanyHeader(doc, companyName, logoPath, PDF.clientReportTitle, dateRange);

  // Client info block
  const { client } = reportData;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
  doc.text(client.fullName, 50, y);
  y += 14;

  doc.font('Helvetica').fontSize(10).fillColor('#6B7280');
  if (client.email) {
    doc.text(client.email, 50, y);
    y += 14;
  }
  if (client.phone) {
    doc.text(client.phone, 50, y);
    y += 14;
  }
  y += 10;

  // Transactions table
  const txColumns: TableColumn[] = [
    { header: PDF.thRef, width: 100, align: 'left', getValue: (r) => r.referenceNumber || '-' },
    { header: PDF.thDate, width: 100, align: 'left', getValue: (r) => formatDate(r.deliveredAt) },
    { header: PDF.thDescription, width: 200, align: 'left', getValue: (r) => r.description || '-' },
    { header: PDF.thTotalAmount, width: 100, align: 'right', getValue: (r) => `$${r.totalAmount}` },
  ];

  y = drawTable(doc, txColumns, reportData.transactions, y);

  // Per-transaction debt and payment details
  for (const tx of reportData.transactions) {
    if (!tx.debt) continue;

    y += 10;
    // Page break safety
    if (y + 60 > doc.page.height - 60) {
      doc.addPage();
      y = 50;
    }

    // Debt summary line
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
    const refLabel = tx.referenceNumber || tx.id.slice(0, 8);
    const statusLabel = tx.debt.status === 'fully_paid' ? PDF.fullyPaid : PDF.outstanding(tx.debt.remainingBalance);
    doc.text(`Deuda de ${refLabel}: ${statusLabel}`, 50, y);
    y += 14;

    doc.font('Helvetica').fontSize(9).fillColor('#6B7280');
    doc.text(
      `Total: $${tx.debt.totalAmount}  |  Pagado: $${tx.debt.amountPaid}  |  Restante: $${tx.debt.remainingBalance}`,
      50,
      y,
    );
    y += 16;

    // Payments sub-table
    if (tx.debt.payments.length > 0) {
      const paymentColumns: TableColumn[] = [
        { header: PDF.thAmount, width: 100, align: 'right', getValue: (p) => `$${p.amount}` },
        { header: PDF.thDate, width: 100, align: 'left', getValue: (p) => formatDate(p.paidAt) },
        { header: PDF.thMethod, width: 120, align: 'left', getValue: (p) => p.paymentMethod || '-' },
        { header: PDF.thRef, width: 120, align: 'left', getValue: (p) => p.reference || '-' },
      ];

      y = drawTable(doc, paymentColumns, tx.debt.payments, y);
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}
