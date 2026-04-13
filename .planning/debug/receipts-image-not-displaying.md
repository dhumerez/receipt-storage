---
status: investigating
trigger: "Images can be uploaded/submitted with a transaction in the receipts-storage app, but when viewing the transaction detail the image is not shown/available."
created: 2026-04-12T00:00:00Z
updated: 2026-04-12T00:01:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED — The files router in app.ts is mounted with `authenticate` but WITHOUT `requireTenant`, so `req.companyId` is never set. The tenant check in files.ts compares `req.params.companyId !== req.companyId` (undefined), which is always true → every file request returns 403 Forbidden.
test: Traced path construction end-to-end: URL construction matches, routing matches, but tenant guard fires because req.companyId is undefined
expecting: Fix is to add requireTenant middleware to the files route registration in app.ts
next_action: return_diagnosis

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: After uploading an image with a transaction, viewing that transaction at /receipts/transactions/{id} should display the receipt image
actual: The image is not shown when viewing the transaction detail. Upload appears to succeed (no visible error), but image is missing on detail view.
errors: Unknown — investigate
reproduction: Submit a transaction with an image attachment, then navigate to that transaction's detail page (e.g. https://humerez.dev/receipts/transactions/a369d9a5-a3a4-420c-8be1-d33d276e9bcc)
started: Unknown — user noticed it and reported

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: Static files not proxied through frontend nginx
  evidence: Frontend nginx.conf does proxy /api/ prefix to backend — this covers /api/v1/files/ correctly
  timestamp: 2026-04-12

- hypothesis: File not saved to disk / wrong upload path
  evidence: processFile writes to path.join(UPLOAD_DIR, companyId, entityType, entityId, uuid.jpg); filePath stored in DB is relative path companyId/transactions/entityId/uuid.jpg; files router reconstructs same absolute path — these match
  timestamp: 2026-04-12

- hypothesis: URL constructed incorrectly by frontend
  evidence: getFileUrl() returns `${BASE_URL}/api/v1/files/${filePath}`. BASE_URL=/receipts in prod. Traefik strips /receipts prefix. Frontend nginx proxies /api/ to backend. Route pattern /:companyId/:type/:entityId/:filename splits the filePath correctly.
  timestamp: 2026-04-12

- hypothesis: VITE_API_URL or base path misconfiguration
  evidence: VITE_API_URL=/receipts in docker-compose build args; Traefik strips /receipts prefix before forwarding to frontend container; frontend nginx proxies /api/ to backend. URL flow is correct.
  timestamp: 2026-04-12

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-04-12
  checked: docker-compose.yml and docker-compose.prod.yml
  found: Backend env UPLOAD_DIR=/var/receipts/uploads, mounted at /var/receipts/uploads:/var/receipts/uploads. Frontend build arg VITE_API_URL=/receipts. Traefik routes humerez.dev/receipts/* with stripprefix=/receipts to frontend on port 4001.
  implication: Files are persisted on host. URL base prefix is /receipts in production.

- timestamp: 2026-04-12
  checked: frontend/nginx.conf
  found: location /api/ { proxy_pass http://receipts-api:4000/api/; } — proxies all /api/* requests to backend. No dedicated /uploads/ or /files/ static location. No route would block /api/v1/files/ from reaching backend.
  implication: File requests do reach the backend via the /api/ proxy.

- timestamp: 2026-04-12
  checked: backend/src/services/upload.service.ts (processFile)
  found: Saves files to path.join(UPLOAD_DIR, companyId, entityType, entityId, uuid.ext). Stores filePath in DB as relative path: path.join(companyId, entityType, entityId, uuid.ext) — e.g. "{companyId}/transactions/{entityId}/{uuid}.jpg".
  implication: filePath stored in DB is the relative path segment appended after /api/v1/files/ in the URL.

- timestamp: 2026-04-12
  checked: frontend/src/api/transactions.ts (getFileUrl)
  found: getFileUrl(filePath) returns `${BASE_URL}/api/v1/files/${filePath}` where BASE_URL = VITE_API_URL = "/receipts" in production. Full URL = /receipts/api/v1/files/{companyId}/transactions/{entityId}/{uuid}.jpg
  implication: After Traefik strips /receipts, browser request is /api/v1/files/{companyId}/transactions/{entityId}/{uuid}.jpg — which matches backend route.

- timestamp: 2026-04-12
  checked: backend/src/app.ts (route registration)
  found: Line 61: app.use('/api/v1/files', authenticate, filesRouter); — requireTenant is NOT applied to this route. All other resource routes (transactions, debts, etc.) include requireTenant, which sets req.companyId from the verified JWT.
  implication: req.companyId is undefined for all requests to the files router.

- timestamp: 2026-04-12
  checked: backend/src/routes/files.ts (tenant check, line 20)
  found: if (companyId !== req.companyId) { res.status(403).json({ error: ERRORS.forbidden }); return; }
  where companyId = req.params.companyId (a non-empty string) and req.companyId = undefined.
  implication: This condition is ALWAYS true (string !== undefined). Every file request returns 403 Forbidden. The image src in the browser fails silently (broken/missing image), which matches the reported symptom.

- timestamp: 2026-04-12
  checked: backend/src/middleware/tenant.ts
  found: requireTenant reads req.user.companyId (from JWT) and assigns it to req.companyId. Without this middleware, req.companyId is never populated.
  implication: Fix is straightforward: add requireTenant to the files route registration in app.ts.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The filesRouter in app.ts (line 61) is registered with `authenticate` but without `requireTenant`. The `requireTenant` middleware is the only place that populates `req.companyId` from the JWT payload. The files route handler checks `if (companyId !== req.companyId)` as a tenant isolation guard — but since `req.companyId` is always `undefined`, this comparison always evaluates to `true`, causing every file retrieval request to return 403 Forbidden. The image `<img src>` or `<a href>` silently fails, so the user sees no error but no image appears.
fix: In backend/src/app.ts line 61, change:
  app.use('/api/v1/files', authenticate, filesRouter);
to:
  app.use('/api/v1/files', authenticate, requireTenant, filesRouter);
verification:
files_changed: [backend/src/app.ts]
