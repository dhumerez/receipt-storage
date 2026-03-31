# Receipts Storage — Debt Tracker SaaS

## What This Is

A multi-tenant SaaS web application for business owners to track transactions, debts, and payments with their clients. Owners create receipts for product deliveries, record any outstanding balances, and log partial payments over time — with proof documents attached at every step. Clients, team members, and family can access the platform with role-appropriate views.

## Core Value

The owner always knows exactly who owes what, with full documentary proof — and so does every stakeholder they grant access to.

## Requirements

### Validated

**Multi-tenant platform** *(Validated in Phase 2: Authentication & User Management)*
- [x] Multiple companies can register on the platform, each with isolated data
- [x] Super admin panel to create companies and manage platform users
- [x] Email invitations for onboarding owners and team members

**Authentication & roles** *(Validated in Phase 2: Authentication & User Management)*
- [x] Owner role: full control — manage clients, transactions, debts, payments, team members
- [x] Collaborator role: can create transactions and payments (requires owner approval before taking effect)
- [x] Viewer role: read-only access to company records
- [x] Client role: can log in and view their own debt and payment history only

### Active

**Client management**
- [ ] Full client profile: name, phone number, address, references, email
- [ ] Per-client debt history — open, partially paid, and fully paid debts
- [ ] Client portal: clients log in to see their own balance and payment history

**Transactions & receipts**
- [ ] Create a transaction for a client with: description, line items (catalog or free-form), initial amount paid, and outstanding debt
- [ ] A transaction always generates a receipt regardless of payment status
- [ ] Attach proof documents to a transaction: file upload (image/PDF) or live camera capture
- [ ] If initial payment < total → a debt record is automatically created

**Product catalog**
- [ ] Owner maintains a product/inventory catalog with prices per unit
- [ ] Transactions can reference catalog products OR free-form line items (or both)

**Debt & payment tracking**
- [ ] Each debt shows total owed, total paid, and remaining balance
- [ ] Multiple partial payments can be logged against a debt
- [ ] Each payment can include proof documents (receipt photo, transfer screenshot, etc.)
- [ ] Debt status: Open → Partially Paid → Fully Paid

**Reports**
- [ ] Company report: all clients with outstanding balances for a selected date range
- [ ] Per-client report: breakdown of debts and payments over time
- [ ] Clients see a personal summary when they log in (how much paid, how much remaining)

**Infrastructure**
- [ ] Deployed on existing Hetzner server alongside Restaurant app (Docker + Nginx)
- [ ] Separate Docker service, separate PostgreSQL database, separate subdomain/path

### Out of Scope

- Multi-currency support — single currency per company set at setup; not worth the complexity for v1
- Payment processor integration — app tracks debts manually; no Stripe/PayPal
- Automated SMS/email reminders to clients — may be added in v2
- Mobile native app — responsive web app covers mobile use cases

## Context

- Owner has an existing Hetzner VPS running the Restaurant app (Node.js/Express + PostgreSQL + React/Vite + Docker + Nginx)
- This project will be deployed as a second Docker Compose stack on the same server, sharing the Nginx reverse proxy
- Primary use case is a battery distributor whose clients receive goods and pay over time — but the system is generic enough for any product/service business
- Proof document capture via device camera is critical for mobile field use (owner or collaborator on-site with a client)

## Constraints

- **Tech Stack**: Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL + React 19 + Vite + TanStack Query + Tailwind CSS — mirrors the Restaurant app to reuse deployment knowledge
- **Deployment**: Docker Compose + Nginx on Hetzner VPS — must coexist without conflicting with existing services
- **Responsive**: Must work well on both desktop and mobile browsers; camera capture requires mobile browser support
- **Single currency**: One currency code per company (configured at creation); no multi-currency logic

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Mirror Restaurant app stack | Owner already has this deployed on Hetzner — same stack = same ops knowledge, no new infrastructure | — Pending |
| Collaborator approval workflow (in-app only) | Email adds complexity; in-app is sufficient for small team use case | — Pending |
| Client login via email/password | Clients need a simple way in; no OAuth needed for this use case | — Pending |
| File storage on disk (not S3) | Hetzner VPS has local storage; S3 adds cost and complexity for v1 | — Pending |
| Single DB per company (schema isolation via tenant_id) | Simpler than per-company databases; sufficient for the expected scale | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after initialization*
