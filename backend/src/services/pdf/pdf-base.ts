import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import fs from 'node:fs';
import { PDF } from '../../constants/strings/pdf.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  getValue: (row: any) => string;
}

// ─── streamPdf ──────────────────────────────────────────────────────────────
// Creates a buffered PDFDocument, calls the build function, adds page numbers,
// then pipes the result to the HTTP response as an attachment download.

export async function streamPdf(
  res: Response,
  filename: string,
  buildFn: (doc: InstanceType<typeof PDFDocument>) => void | Promise<void>,
): Promise<void> {
  const doc = new PDFDocument({ bufferPages: true, size: 'LETTER', margin: 50 });

  // Build all content (pages buffered in memory)
  await buildFn(doc);

  // Add footers on every page
  addPageNumbers(doc);

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Pipe and finalize
  doc.pipe(res);
  doc.end();
}

// ─── addPageNumbers ─────────────────────────────────────────────────────────
// D-10: "Page X of Y" centered footer + "Generated: YYYY-MM-DD" right-aligned

export function addPageNumbers(doc: InstanceType<typeof PDFDocument>): void {
  const range = doc.bufferedPageRange();
  const today = new Date().toISOString().slice(0, 10);

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    const y = doc.page.height - 40;
    const contentWidth = doc.page.width - 100; // 50pt margin each side

    // "Page X of Y" centered
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text(PDF.pageOf(i + 1, range.count), 50, y, {
        width: contentWidth,
        align: 'center',
      });

    // "Generated: YYYY-MM-DD" right-aligned
    doc.text(PDF.generated(today), 50, y, {
      width: contentWidth,
      align: 'right',
    });
  }
}

// ─── addCompanyHeader ───────────────────────────────────────────────────────
// D-09, UI-SPEC PDF Header: company logo + name + report title + date range + rule

export async function addCompanyHeader(
  doc: InstanceType<typeof PDFDocument>,
  companyName: string,
  logoPath: string | null,
  reportTitle: string,
  dateRange?: string,
): Promise<number> {
  let x = 50;
  let y = 50;

  // Attempt to render company logo (Pitfall 3: ENOENT handled gracefully)
  if (logoPath) {
    try {
      const logoBuffer = await fs.promises.readFile(logoPath);
      doc.image(logoBuffer, 50, 50, { width: 80, height: 50, fit: [80, 50] });
      x = 140; // position text to the right of logo
    } catch {
      // Logo file missing or unreadable — skip logo, show name only
    }
  }

  // Company name
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text(companyName, x, y);
  y += 22;

  // Report title
  doc.font('Helvetica').fontSize(12).fillColor('#6B7280').text(reportTitle, x, y);
  y += 18;

  // Date range (optional)
  if (dateRange) {
    doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text(dateRange, x, y);
    y += 16;
  }

  // Horizontal rule
  y += 5;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .strokeColor('#D1D5DB')
    .stroke();
  y += 10;

  return y;
}

// ─── drawTable ──────────────────────────────────────────────────────────────
// D-11: Multi-page table with repeated column headers on every page

export function drawTable(
  doc: InstanceType<typeof PDFDocument>,
  columns: TableColumn[],
  rows: any[],
  startY: number,
): number {
  const pageBottom = doc.page.height - 60; // room for footer
  const leftMargin = 50;
  let y = startY;

  function drawHeaders(): void {
    // Background fill for header row
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    doc
      .rect(leftMargin, y - 2, totalWidth, 18)
      .fill('#F3F4F6');

    // Header text
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
    let x = leftMargin;
    for (const col of columns) {
      doc.text(col.header, x, y, { width: col.width, align: col.align || 'left' });
      x += col.width;
    }
    y += 16;

    // Bottom border
    doc
      .moveTo(leftMargin, y)
      .lineTo(leftMargin + totalWidth, y)
      .lineWidth(0.5)
      .strokeColor('#D1D5DB')
      .stroke();
    y += 5;
  }

  drawHeaders();

  // Body rows
  doc.font('Helvetica').fontSize(9).fillColor('#111827');
  for (const row of rows) {
    // Page break check
    if (y + 20 > pageBottom) {
      doc.addPage();
      y = 50;
      drawHeaders();
      doc.font('Helvetica').fontSize(9).fillColor('#111827');
    }

    let x = leftMargin;
    for (const col of columns) {
      doc.text(col.getValue(row), x, y, { width: col.width, align: col.align || 'left' });
      x += col.width;
    }
    y += 16;
  }

  return y;
}
