---
phase: 05-transactions-file-uploads
plan: 02
subsystem: file-upload-pipeline
tags: [multer, sharp, file-type, heic, upload, file-serving, multipart]
dependency_graph:
  requires: ["05-01"]
  provides: ["uploadMiddleware", "processFile", "filesRouter"]
  affects: ["backend/Dockerfile", "backend/src/app.ts", "backend/src/routes/transactions.ts"]
tech_stack:
  added: ["multer@2.1.1", "sharp@0.34.5", "file-type@22.0.0", "@types/multer@2.1.0"]
  patterns: ["dynamic ESM import for file-type in CJS module", "multer memoryStorage with sharp pipeline", "authenticated file serving with company ownership check"]
key_files:
  created:
    - backend/src/middleware/upload.ts
    - backend/src/services/upload.service.ts
    - backend/src/routes/files.ts
    - backend/src/__tests__/uploads.test.ts
  modified:
    - backend/Dockerfile
    - backend/package.json
    - backend/package-lock.json
    - backend/src/app.ts
    - backend/src/routes/transactions.ts
decisions:
  - "Dockerfile base changed from node:22-alpine to node:22-bookworm-slim for libvips/libheif native support"
  - "file-type imported via dynamic import() since it is ESM-only and project uses CJS (module: NodeNext)"
  - "filesRouter mounted with authenticate only (no requireTenant) — companyId verified from URL path in handler"
  - "Orphaned files on DB transaction rollback accepted — cleanup deferred to background job in later phase"
metrics:
  duration: "3m 1s"
  completed: "2026-03-31"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 05 Plan 02: File Upload Pipeline Summary

Multer memoryStorage upload pipeline with sharp image processing (HEIC-to-JPEG, EXIF fix, 1920px resize, 200px thumbnails), magic byte validation via file-type, UUID-named disk storage in per-company directories, authenticated file serving with company ownership check, and atomic document row insertion wired into the transaction POST handler.

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Dockerfile HEIC support + npm deps | `64ee575` | backend/Dockerfile, backend/package.json |
| 2 | Upload middleware + file processing + file serving | `64becb0` | backend/src/middleware/upload.ts, backend/src/services/upload.service.ts, backend/src/routes/files.ts, backend/src/app.ts |
| 3 | Wire upload to transaction POST + test stubs | `a1cd4bc` | backend/src/routes/transactions.ts, backend/src/__tests__/uploads.test.ts |

## What Was Built

### Upload Middleware (`backend/src/middleware/upload.ts`)
- Multer with `memoryStorage` — files buffered in RAM for sharp processing
- 10MB per-file limit, 5 files per request (FR-06.10)
- SVG blocked at MIME filter level (FR-06.12)

### File Processing Service (`backend/src/services/upload.service.ts`)
- Magic byte validation via `file-type` (ESM dynamic import)
- Allowed types: JPEG, PNG, WebP, HEIF, PDF
- Belt-and-suspenders SVG rejection at magic byte level
- Sharp pipeline: `.rotate()` (EXIF fix) -> `.resize(1920)` -> `.jpeg(85)` for all images
- HEIC automatically converted to JPEG by sharp
- 200px thumbnails generated at upload time (FR-06.13)
- UUID filenames in `{UPLOAD_DIR}/{companyId}/{entityType}/{entityId}/` structure
- PDFs passed through without image processing

### Authenticated File Serving (`backend/src/routes/files.ts`)
- `GET /api/v1/files/:companyId/:type/:entityId/:filename`
- Company ownership verification against `req.companyId`
- Filename regex sanitization (prevents path traversal)
- DB existence check before serving
- Security headers: `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment`

### Transaction POST Multipart Support
- `uploadMiddleware` applied to `POST /api/v1/transactions`
- Dual body parsing: `req.body.data` (multipart) or `req.body` (plain JSON)
- Files processed and document rows inserted inside `db.transaction` block (atomic with transaction, D-03)
- Response includes `documents` array alongside transaction and items

### Test Stubs (`backend/src/__tests__/uploads.test.ts`)
- 21 `it.todo()` stubs covering middleware, processFile, file serving, and integration
- Wave 0 compliance for validation plan

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `backend/src/__tests__/uploads.test.ts` — 21 todo test stubs (intentional per Wave 0 validation plan; to be implemented in validation phase)

## Self-Check: PASSED

- All 4 created files verified on disk
- All 3 task commits verified in git log (64ee575, 64becb0, a1cd4bc)
- TypeScript compilation: clean (no errors)
- Upload test stubs: 21 todo tests passing
