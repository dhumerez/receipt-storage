---
phase: 01-foundation-infrastructure-database
plan: "01"
subsystem: infra
tags: [docker, docker-compose, postgresql, nginx, node]

# Dependency graph
requires: []
provides:
  - Docker Compose stack with receipts-api, receipts-frontend, receipts-db services
  - Loopback-only port bindings (127.0.0.1:4000, 127.0.0.1:4001) safe for Hetzner VPS
  - PostgreSQL named volume for data persistence (UID-safe)
  - Bind mount at /var/receipts/uploads for Nginx host access
  - Migration-on-startup entrypoint via docker-entrypoint.sh
  - Multi-stage Dockerfiles for both backend and frontend (node:22-alpine)
  - Container healthcheck using Node.js HTTP request (no external deps)
affects: [02, 03, 04, 05, 06, 07, all-phases]

# Tech tracking
tech-stack:
  added: [docker-compose, postgres:16-alpine, node:22-alpine]
  patterns:
    - Multi-stage Dockerfile with builder and production stages
    - ENTRYPOINT script pattern for migration-then-start
    - exec node for proper OS signal handling in containers
    - Loopback port binding for services not meant for direct public access

key-files:
  created:
    - docker-compose.yml
    - .env.example
    - backend/Dockerfile
    - backend/docker-entrypoint.sh
    - backend/healthcheck.js
    - frontend/Dockerfile
  modified: []

key-decisions:
  - "receipts-db has no host port — accessible only via Docker service name receipts-db:5432"
  - "PostgreSQL uses named volume (not bind mount) to avoid UID 999 permission failure on Linux"
  - "Uploads use bind mount to /var/receipts/uploads so Nginx on host can read files at same path"
  - "docker-entrypoint.sh uses exec node so the process receives OS signals correctly"
  - "Migrations run in entrypoint before server start — not inside server.ts — for clean separation"

patterns-established:
  - "Pattern 1: All host port bindings use 127.0.0.1:XXXX:XXXX (loopback only, never 0.0.0.0)"
  - "Pattern 2: ENTRYPOINT script runs side-effects (migrations) then exec's the main process"
  - "Pattern 3: DB service has no ports key — other services reference it via Docker service name"
  - "Pattern 4: Healthcheck uses inline Node.js script with no external dependencies"

requirements-completed: [NFR-03.1, NFR-03.2, NFR-03.3]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 1 Plan 01: Docker Compose Stack Summary

**Docker Compose stack with loopback-bound ports (4000/4001), named PostgreSQL volume, uploads bind-mount, and migration-on-startup entrypoint — safe to deploy alongside the existing Restaurant app on Hetzner VPS**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-30T05:56:44Z
- **Completed:** 2026-03-30T05:58:16Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- docker-compose.yml defines all three services with correct port isolation, volume strategy, and healthcheck-gated dependency
- Multi-stage Dockerfiles for both backend and frontend using node:22-alpine, keeping images lean
- docker-entrypoint.sh runs `npm run db:migrate` before `exec node dist/server.js` ensuring schema is always current on container startup

## Task Commits

Each task was committed atomically:

1. **Task 1: Write docker-compose.yml and .env.example** - `c44f164` (feat)
2. **Task 2: Write Dockerfiles, healthcheck.js, and docker-entrypoint.sh** - `ba39f08` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified
- `docker-compose.yml` - Full three-service stack definition with receipts_internal bridge network
- `.env.example` - Environment variable template with DB_PASSWORD, JWT_SECRET, CORS_ORIGIN
- `backend/Dockerfile` - Multi-stage build; ENTRYPOINT uses docker-entrypoint.sh; HEALTHCHECK via healthcheck.js
- `backend/docker-entrypoint.sh` - Runs db:migrate then exec node dist/server.js
- `backend/healthcheck.js` - HTTP GET /health on PORT (default 4000) using node:http only
- `frontend/Dockerfile` - Multi-stage build; exposes 4001; CMD node dist/server.js (stub for plan 1.5)

## Decisions Made
- receipts-db has no `ports:` key — accessed only via Docker DNS `receipts-db:5432`
- Named volume `receipts_db_data` (no `driver_opts`) so Docker handles UID 999 ownership on Linux automatically
- Uploads bind mount `/var/receipts/uploads:/var/receipts/uploads` so Nginx on host reads files at the identical path
- `exec node` in entrypoint ensures the Node process is PID 1 in the container and receives SIGTERM/SIGINT correctly
- Migrations separated from application startup code — runs in shell script, not in `server.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required at this stage. When deploying to Hetzner, copy `.env.example` to `.env` and populate with real values.

## Next Phase Readiness
- Docker Compose stack is complete and YAML-valid
- All subsequent phases build and deploy against this stack definition
- Phase 1.2 (database schema) will add migrations that run via the entrypoint's `npm run db:migrate`
- Phase 1.5 (frontend project setup) will add the actual Node server entry referenced in frontend/Dockerfile CMD

---
*Phase: 01-foundation-infrastructure-database*
*Completed: 2026-03-30*

## Self-Check: PASSED

- All 6 source files confirmed present on disk
- SUMMARY.md confirmed present on disk
- Commits c44f164 and ba39f08 confirmed in git log
