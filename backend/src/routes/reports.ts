import { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs';
import { db } from '../db/client.js';
import { companies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  getCompanyReport,
  getClientReport,
  getReceiptData,
} from '../services/report.service.js';
import { processLogo, deleteLogo } from '../services/upload.service.js';
import multer from 'multer';
import { streamPdf } from '../services/pdf/pdf-base.js';
import { buildCompanyReportPdf } from '../services/pdf/company-report.pdf.js';
import { buildClientReportPdf } from '../services/pdf/client-report.pdf.js';
import { buildReceiptPdf } from '../services/pdf/receipt.pdf.js';
import { REPORTS } from '../constants/strings/reports.js';

export const reportsRouter = Router();

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const DateRangeSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const CompanyReportQuerySchema = DateRangeSchema.extend({
  showSettled: z.string().optional(),
});

const UuidSchema = z.string().uuid();

// ─── Logo upload multer config ───────────────────────────────────────────────

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('logo');

// ─── GET /company — Company-wide balance summary ─────────────────────────────
// D-01, D-03, D-04: All clients with outstanding balances for a date range

reportsRouter.get('/company', async (req, res) => {
  const parsed = CompanyReportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: REPORTS.validationError, details: parsed.error.flatten() });
    return;
  }

  const { dateFrom, dateTo, showSettled } = parsed.data;
  const result = await getCompanyReport(
    req.companyId!,
    dateFrom,
    dateTo,
    showSettled === 'true',
  );

  res.json(result);
});

// ─── GET /client/:clientId — Per-client detailed report ──────────────────────
// D-02: Breakdown of debts and payments over time

reportsRouter.get('/client/:clientId', async (req, res) => {
  const clientIdParsed = UuidSchema.safeParse(req.params.clientId);
  if (!clientIdParsed.success) {
    res.status(400).json({ error: REPORTS.invalidClientIdFormat });
    return;
  }

  const parsed = DateRangeSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: REPORTS.validationError, details: parsed.error.flatten() });
    return;
  }

  const { dateFrom, dateTo } = parsed.data;
  const result = await getClientReport(
    req.companyId!,
    clientIdParsed.data,
    dateFrom,
    dateTo,
  );

  res.json(result);
});

// ─── GET /receipt/:transactionId — Receipt data for PDF generation ───────────

reportsRouter.get('/receipt/:transactionId', async (req, res) => {
  const txIdParsed = UuidSchema.safeParse(req.params.transactionId);
  if (!txIdParsed.success) {
    res.status(400).json({ error: REPORTS.invalidTransactionIdFormat });
    return;
  }

  const result = await getReceiptData(req.companyId!, txIdParsed.data);
  res.json(result);
});

// ─── GET /company/pdf — Company report PDF download ─────────────────────────
// D-09 through D-12: Branded PDF with per-client balance table

reportsRouter.get('/company/pdf', async (req, res) => {
  const parsed = CompanyReportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: REPORTS.validationError, details: parsed.error.flatten() });
    return;
  }

  const { dateFrom, dateTo, showSettled } = parsed.data;
  const data = await getCompanyReport(req.companyId!, dateFrom, dateTo, showSettled === 'true');

  const [company] = await db
    .select({ name: companies.name, logoPath: companies.logoPath })
    .from(companies)
    .where(eq(companies.id, req.companyId!))
    .limit(1);

  const today = new Date().toISOString().slice(0, 10);
  await streamPdf(res, `company-report-${today}.pdf`, async (doc) => {
    await buildCompanyReportPdf(doc, company.name, company.logoPath, data, dateFrom, dateTo);
  });
});

// ─── GET /client/:clientId/pdf — Client report PDF download ─────────────────

reportsRouter.get('/client/:clientId/pdf', async (req, res) => {
  const clientIdParsed = UuidSchema.safeParse(req.params.clientId);
  if (!clientIdParsed.success) {
    res.status(400).json({ error: REPORTS.invalidClientIdFormat });
    return;
  }

  const parsed = DateRangeSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: REPORTS.validationError, details: parsed.error.flatten() });
    return;
  }

  const { dateFrom, dateTo } = parsed.data;
  const reportData = await getClientReport(req.companyId!, clientIdParsed.data, dateFrom, dateTo);

  const [company] = await db
    .select({ name: companies.name, logoPath: companies.logoPath })
    .from(companies)
    .where(eq(companies.id, req.companyId!))
    .limit(1);

  const clientName = reportData.client.fullName.replace(/[^a-zA-Z0-9]/g, '-');
  const today = new Date().toISOString().slice(0, 10);
  await streamPdf(res, `client-report-${clientName}-${today}.pdf`, async (doc) => {
    await buildClientReportPdf(doc, company.name, company.logoPath, reportData, dateFrom, dateTo);
  });
});

// ─── GET /receipt/:transactionId/pdf — Receipt PDF download ─────────────────
// D-13, D-15: Single transaction receipt with company branding

reportsRouter.get('/receipt/:transactionId/pdf', async (req, res) => {
  const txIdParsed = UuidSchema.safeParse(req.params.transactionId);
  if (!txIdParsed.success) {
    res.status(400).json({ error: REPORTS.invalidTransactionIdFormat });
    return;
  }

  const receiptData = await getReceiptData(req.companyId!, txIdParsed.data);
  const refNum = receiptData.transaction.referenceNumber || txIdParsed.data.slice(0, 8);
  await streamPdf(res, `receipt-${refNum}.pdf`, async (doc) => {
    await buildReceiptPdf(doc, receiptData);
  });
});

// ─── POST /logo — Upload company logo ────────────────────────────────────────
// D-09: Owner uploads logo for PDF headers

reportsRouter.post('/logo', (req, res, next) => {
  logoUpload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: REPORTS.logoFileTooLarge });
        return;
      }
      next(err);
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: REPORTS.noLogoFileProvided });
      return;
    }

    try {
      const { filePath } = await processLogo(req.file.buffer, req.companyId!);

      await db
        .update(companies)
        .set({ logoPath: filePath, updatedAt: new Date() })
        .where(eq(companies.id, req.companyId!));

      res.json({ logoPath: filePath });
    } catch (error: any) {
      if (error.message?.startsWith('Unsupported logo type')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  });
});

// ─── DELETE /logo — Remove company logo ──────────────────────────────────────
// D-09: Owner removes previously uploaded logo

reportsRouter.delete('/logo', async (req, res) => {
  await deleteLogo(req.companyId!);

  await db
    .update(companies)
    .set({ logoPath: null, updatedAt: new Date() })
    .where(eq(companies.id, req.companyId!));

  res.status(204).send();
});

// ─── GET /logo — Serve current company logo ─────────────────────────────────

reportsRouter.get('/logo', async (req, res) => {
  const [company] = await db
    .select({ logoPath: companies.logoPath })
    .from(companies)
    .where(eq(companies.id, req.companyId!))
    .limit(1);

  if (!company?.logoPath) {
    res.status(404).json({ error: REPORTS.noLogoUploaded });
    return;
  }

  try {
    const buffer = await fs.promises.readFile(company.logoPath);
    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: REPORTS.logoFileNotFound });
      return;
    }
    throw error;
  }
});
