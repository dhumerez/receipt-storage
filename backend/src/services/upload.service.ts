import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/receipts/uploads';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heif',
  'application/pdf',
];

export async function processFile(
  buffer: Buffer,
  originalName: string,
  companyId: string,
  entityType: 'transactions' | 'payments',
  entityId: string,
): Promise<{ filePath: string; mimeType: string; sizeBytes: number; originalName: string }> {
  // Dynamic import — file-type is ESM-only (Pitfall 1)
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !ALLOWED_TYPES.includes(detected.mime)) {
    throw new Error(`Unsupported file type: ${detected?.mime ?? 'unknown'}`);
  }

  // Belt-and-suspenders SVG check (FR-06.12)
  if (detected.mime === 'image/svg+xml') {
    throw new Error('SVG uploads are not allowed');
  }

  let finalBuffer: Buffer;
  let finalMime: string;
  let thumbBuffer: Buffer | null = null;

  if (detected.mime.startsWith('image/')) {
    // Sharp pipeline: EXIF fix (FR-06.5) -> resize (FR-06.6) -> compress JPEG
    finalBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    finalMime = 'image/jpeg';

    // Generate thumbnail at 200px (FR-06.13)
    thumbBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 200, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
  } else {
    // PDF — pass through as-is
    finalBuffer = buffer;
    finalMime = 'application/pdf';
  }

  // UUID filename (FR-06.9)
  const uuid = crypto.randomUUID();
  const ext = finalMime === 'application/pdf' ? 'pdf' : 'jpg';

  // Per-company directory structure (FR-06.9)
  const dir = path.join(UPLOAD_DIR, companyId, entityType, entityId);
  await fs.promises.mkdir(dir, { recursive: true });

  // Write main file
  await fs.promises.writeFile(path.join(dir, `${uuid}.${ext}`), finalBuffer);

  // Write thumbnail (images only)
  if (thumbBuffer) {
    await fs.promises.writeFile(path.join(dir, `${uuid}_thumb.${ext}`), thumbBuffer);
  }

  return {
    filePath: path.join(companyId, entityType, entityId, `${uuid}.${ext}`),
    mimeType: finalMime,
    sizeBytes: finalBuffer.length,
    originalName,
  };
}
