import { describe, it, expect } from 'vitest';

describe('Upload Middleware', () => {
  it.todo('rejects files larger than 10MB');
  it.todo('rejects more than 5 files per request');
  it.todo('rejects SVG files at MIME filter level');
  it.todo('accepts JPEG, PNG, WebP, HEIC, PDF files');
});

describe('processFile', () => {
  it.todo('rejects file with unsupported magic bytes');
  it.todo('rejects SVG at magic byte level (belt-and-suspenders)');
  it.todo('converts HEIC to JPEG');
  it.todo('fixes EXIF orientation via .rotate()');
  it.todo('resizes images to max 1920px width');
  it.todo('generates 200px thumbnail for images');
  it.todo('stores files with UUID filenames');
  it.todo('creates per-company directory structure');
  it.todo('passes PDF through without image processing');
});

describe('File Serving', () => {
  it.todo('returns 403 for wrong company');
  it.todo('returns 404 for non-existent document');
  it.todo('sets X-Content-Type-Options: nosniff header');
  it.todo('sets Content-Disposition header');
});

describe('Transaction + Upload Integration', () => {
  it.todo('POST /api/v1/transactions with FormData files creates document rows');
  it.todo('document rows are linked to the created transaction');
  it.todo('response includes documents array with filePath and mimeType');
  it.todo('if transaction insert fails, no document rows are committed');
});
