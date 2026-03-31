import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { documents } from '../db/schema.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/receipts/uploads';

const FILENAME_RE = /^[a-f0-9-]+(_thumb)?\.(jpg|pdf)$/;

export const filesRouter = Router();

// GET /:companyId/:type/:entityId/:filename — authenticated file serving (FR-06.11)
filesRouter.get('/:companyId/:type/:entityId/:filename', async (req, res) => {
  const { companyId, type, entityId, filename } = req.params;

  // Tenant check — user can only access their company's files
  if (companyId !== req.companyId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  // Sanitize filename to prevent path traversal
  if (!FILENAME_RE.test(filename)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  // Verify document exists in DB with matching company
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.entityId, entityId),
      ),
    )
    .limit(1);

  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  // Construct absolute path
  const fullPath = path.join(UPLOAD_DIR, companyId, type, entityId, filename);

  // Check file exists on disk
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Security headers
  const contentType = filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', contentType);

  // Stream the file
  res.sendFile(fullPath);
});
