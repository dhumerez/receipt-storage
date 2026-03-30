---
phase: 1
slug: foundation-infrastructure-database
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (backend) + vitest (frontend) |
| **Config file** | `backend/vitest.config.ts` / `frontend/vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `cd backend && npm test` |
| **Full suite command** | `cd backend && npm test && cd ../frontend && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test` in the relevant service directory
- **After every plan wave:** Run both backend and frontend test suites
- **Before `/gsd:verify-work`:** Full suite must be green + `docker compose up` health check passes
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 1.1 | 1 | NFR-03.1 | integration | `docker compose config --quiet` | ❌ W0 | ⬜ pending |
| 1-01-02 | 1.1 | 1 | NFR-03.2 | manual | `docker compose up -d && curl localhost:4000/health` | ❌ W0 | ⬜ pending |
| 1-02-01 | 1.2 | 1 | NFR-03.4 | manual | `nginx -t` | ❌ W0 | ⬜ pending |
| 1-03-01 | 1.3 | 1 | FR-01.1 | unit | `npm run db:push && npm test` | ❌ W0 | ⬜ pending |
| 1-03-02 | 1.3 | 1 | NFR-01.2 | unit | `npm test -- --grep "forCompany"` | ❌ W0 | ⬜ pending |
| 1-04-01 | 1.4 | 2 | FR-02.1 | unit | `npm test -- --grep "auth middleware"` | ❌ W0 | ⬜ pending |
| 1-04-02 | 1.4 | 2 | NFR-01.3 | unit | `npm test -- --grep "RBAC"` | ❌ W0 | ⬜ pending |
| 1-05-01 | 1.5 | 2 | NFR-04.1 | manual | `npm run dev` + open browser | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/setup.ts` — vitest config and test database setup
- [ ] `backend/vitest.config.ts` — vitest configuration
- [ ] `frontend/src/__tests__/setup.ts` — frontend test setup
- [ ] `frontend/vitest.config.ts` — frontend vitest configuration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker stack starts without port conflicts | NFR-03.1 | Requires running VPS with Restaurant app | `docker compose up -d`, verify both apps respond |
| Nginx serves both apps without conflicts | NFR-03.4 | Requires host Nginx access | `nginx -t && curl https://receipts.domain.com/health` |
| Let's Encrypt cert issued | NFR-03.5 | Requires DNS propagation | `certbot --nginx -d receipts.domain.com` |
| DB migration runs clean | FR-01.1 | Requires running PostgreSQL | `npm run db:migrate`, check all 11 tables created |
| `company_id` filter enforced by forCompany() | NFR-01.2 | Requires DB connection | Unit test with mock DB + integration test |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
