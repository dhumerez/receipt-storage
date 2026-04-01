import type PDFDocument from 'pdfkit';
import { addCompanyHeader, drawTable } from './pdf-base.js';
import type { TableColumn } from './pdf-base.js';
import { PDF } from '../../constants/strings/pdf.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReceiptData {
  company: { name: string; logoPath: string | null };
  client: { fullName: string; email: string | null; phone: string | null };
  transaction: {
    referenceNumber: string | null;
    deliveredAt: Date | null;
    description: string | null;
    items: Array<{
      description: string;
      quantity: string;
      unitPrice: string;
      lineTotal: string | null;
    }>;
    totalAmount: string;
  };
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
}

// ─── buildReceiptPdf ────────────────────────────────────────────────────────
// D-13, D-15: Receipt PDF — company header, client info, transaction details,
// line items, total, debt status, payment history. Targets single page.

export async function buildReceiptPdf(
  doc: InstanceType<typeof PDFDocument>,
  receiptData: ReceiptData,
): Promise<void> {
  const { company, client, transaction, debt } = receiptData;

  let y = await addCompanyHeader(doc, company.name, company.logoPath, 'Recibo');

  // Client info
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

  // Transaction info
  doc.font('Helvetica').fontSize(10).fillColor('#111827');
  if (transaction.referenceNumber) {
    doc.text(PDF.reference(transaction.referenceNumber), 50, y);
    y += 14;
  }
  if (transaction.deliveredAt) {
    const deliveredDate =
      transaction.deliveredAt instanceof Date
        ? transaction.deliveredAt.toISOString().slice(0, 10)
        : new Date(transaction.deliveredAt).toISOString().slice(0, 10);
    doc.text(PDF.date(deliveredDate), 50, y);
    y += 14;
  }
  if (transaction.description) {
    doc.text(PDF.description(transaction.description), 50, y);
    y += 14;
  }
  y += 10;

  // Line items table: Item (200), Qty (60), Unit Price (100), Total (100)
  const itemColumns: TableColumn[] = [
    { header: PDF.thItem, width: 200, align: 'left', getValue: (r) => r.description },
    { header: PDF.thQty, width: 60, align: 'right', getValue: (r) => r.quantity },
    { header: PDF.thUnitPrice, width: 100, align: 'right', getValue: (r) => `$${r.unitPrice}` },
    { header: PDF.thTotal, width: 100, align: 'right', getValue: (r) => r.lineTotal ? `$${r.lineTotal}` : '-' },
  ];

  y = drawTable(doc, itemColumns, transaction.items, y);
  y += 5;

  // Bold total line right-aligned
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827');
  doc.text(PDF.total(transaction.totalAmount), 50, y, {
    width: 460, // 200 + 60 + 100 + 100 = 460
    align: 'right',
  });
  y += 20;

  // Debt status line
  if (debt) {
    const isFullyPaid = debt.status === 'fully_paid' || debt.remainingBalance === '0.00';
    doc.font('Helvetica-Bold').fontSize(11);

    if (isFullyPaid) {
      doc.fillColor('#059669').text(PDF.fullyPaid, 50, y);
    } else {
      doc.fillColor('#DC2626').text(PDF.outstanding(debt.remainingBalance), 50, y);
    }
    y += 20;

    // Payment history table (if payments exist)
    if (debt.payments.length > 0) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151');
      doc.text(PDF.paymentHistory, 50, y);
      y += 16;

      const paymentColumns: TableColumn[] = [
        {
          header: PDF.thDate,
          width: 100,
          align: 'left',
          getValue: (p) => {
            const d = p.paidAt instanceof Date ? p.paidAt : new Date(p.paidAt);
            return d.toISOString().slice(0, 10);
          },
        },
        { header: PDF.thAmount, width: 100, align: 'right', getValue: (p) => `$${p.amount}` },
        { header: PDF.thMethod, width: 120, align: 'left', getValue: (p) => p.paymentMethod || '-' },
        { header: PDF.thRef, width: 120, align: 'left', getValue: (p) => p.reference || '-' },
      ];

      y = drawTable(doc, paymentColumns, debt.payments, y);
    }
  }
}
