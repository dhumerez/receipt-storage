import { Router } from 'express';
import { eq, and, or, ilike, notInArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { clients, debtBalances, tokens, companies, users } from '../db/schema.js';
import { generateRawToken, hashToken } from '../services/auth.service.js';
import { sendInviteEmail } from '../services/email.service.js';

export const clientsRouter = Router();

// ─── GET /api/v1/clients ──────────────────────────────────────────────────────
// FR-03.2: Search by name/email/phone; filter by active status
// Outstanding balance via debtBalances view (confirmed-only, per view definition)

clientsRouter.get('/', async (req, res) => {
  const companyId = req.companyId!;
  const { search, status } = req.query as { search?: string; status?: string };

  const conditions: any[] = [eq(clients.companyId, companyId)];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(clients.fullName, term),
        ilike(clients.email, term),
        ilike(clients.phone, term),
      )!,
    );
  }

  if (status === 'active') conditions.push(eq(clients.isActive, true));
  if (status === 'inactive') conditions.push(eq(clients.isActive, false));

  // Subquery for per-client outstanding balance from debtBalances view
  const result = await db
    .select({
      id: clients.id,
      fullName: clients.fullName,
      email: clients.email,
      phone: clients.phone,
      isActive: clients.isActive,
      createdAt: clients.createdAt,
      outstandingBalance: sql<string>`COALESCE((
        SELECT SUM(db.remaining_balance)
        FROM debt_balances db
        WHERE db.client_id = ${clients.id}
          AND db.company_id = ${companyId}
          AND db.status NOT IN ('fully_paid', 'written_off')
      ), '0.00')`,
    })
    .from(clients)
    .where(and(...conditions))
    .orderBy(clients.fullName);

  res.json(result);
});

// ─── POST /api/v1/clients ─────────────────────────────────────────────────────
// FR-03.1: Create client profile; companyId from JWT only

const CreateClientSchema = z.object({
  fullName: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  referencesText: z.string().optional(),
});

clientsRouter.post('/', async (req, res) => {
  const parsed = CreateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }
  const companyId = req.companyId!;
  const { fullName, email, phone, address, referencesText } = parsed.data;

  const [created] = await db
    .insert(clients)
    .values({
      companyId,
      fullName,
      email: email || null,
      phone: phone || null,
      address: address || null,
      referencesText: referencesText || null,
    })
    .returning();

  res.status(201).json(created);
});

// ─── PATCH /api/v1/clients/:id ────────────────────────────────────────────────
// FR-03.1: Edit client profile; verify tenant ownership before update

const UpdateClientSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  referencesText: z.string().optional().nullable(),
});

clientsRouter.patch('/:id', async (req, res) => {
  // Guard: do not match /:id for /deactivate or /invite — those have explicit routes
  // Express will route /:id/deactivate to the dedicated handler, so this is fine.

  const parsed = UpdateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }
  const companyId = req.companyId!;
  const { id } = req.params;

  // Verify client belongs to this company (NFR-01.6)
  const [existing] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  const [updated] = await db
    .update(clients)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
    .returning();

  res.json(updated);
});

// ─── PATCH /api/v1/clients/:id/deactivate ────────────────────────────────────
// FR-03.1: No hard delete; deactivate only. Preserves all records.

clientsRouter.patch('/:id/deactivate', async (req, res) => {
  const companyId = req.companyId!;
  const { id } = req.params;

  const [existing] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  await db
    .update(clients)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.companyId, companyId)));

  res.status(204).send();
});

// ─── POST /api/v1/clients/:id/invite ─────────────────────────────────────────
// D-07: Optional portal invite — only if client has email set
// D-08: Reuses accept-invite token flow; stores clientId in token row for linkage

clientsRouter.post('/:id/invite', async (req, res) => {
  const companyId = req.companyId!;
  const { id } = req.params;

  // Fetch client + verify company ownership
  const [client] = await db
    .select({
      id: clients.id,
      email: clients.email,
      fullName: clients.fullName,
      userId: clients.userId,
    })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
    .limit(1);

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  // D-07: email required for portal invite
  if (!client.email) {
    res.status(400).json({ error: 'Client has no email address. Add an email before sending a portal invite.' });
    return;
  }

  // Check if portal already active (user_id set AND user is active)
  if (client.userId) {
    const [existingUser] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, client.userId))
      .limit(1);
    if (existingUser?.isActive) {
      res.status(400).json({ error: 'Portal access is already active for this client.' });
      return;
    }
  }

  // Fetch company name for invite email
  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  // Fetch inviter name
  const [inviter] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, req.user!.sub))
    .limit(1);

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await db.insert(tokens).values({
    tokenHash,
    type: 'invite',
    email: client.email,
    companyId,
    invitedBy: req.user!.sub,
    role: 'client',
    clientId: client.id,      // D-08: links token to client record
    expiresAt,
  });

  // Fire-and-forget — do not await
  sendInviteEmail({
    to: client.email,
    rawToken,
    invitedByName: inviter?.fullName ?? 'Your business',
    companyName: company?.name ?? 'Your business',
    role: 'client',
  }).catch(console.error);

  res.status(201).json({ message: 'Invite sent' });
});

// ─── GET /api/v1/clients/:id/debts ───────────────────────────────────────────
// FR-03.3: Owner detail view — all debts for a client with balance per debt
// Uses debtBalances view (confirmed-only balance) for accurate outstanding amounts

clientsRouter.get('/:id/debts', async (req, res) => {
  const companyId = req.companyId!;
  const { id } = req.params;

  // Verify client belongs to this company
  const [client] = await db
    .select({
      id: clients.id,
      fullName: clients.fullName,
    })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
    .limit(1);

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  // Fetch all debts via debtBalances view — explicit columns only
  const debtRows = await db
    .select({
      id: debtBalances.id,
      status: debtBalances.status,
      totalAmount: debtBalances.totalAmount,
      amountPaid: debtBalances.amountPaid,
      remainingBalance: debtBalances.remainingBalance,
    })
    .from(debtBalances)
    .where(
      and(
        eq(debtBalances.clientId, id),
        eq(debtBalances.companyId, companyId),
      ),
    )
    .orderBy(debtBalances.status);

  // Compute total outstanding for this client
  const outstandingBalance = debtRows
    .filter((d) => d.status !== 'fully_paid' && d.status !== 'written_off')
    .reduce((sum, d) => sum + parseFloat(d.remainingBalance), 0)
    .toFixed(2);

  res.json({
    client: {
      id: client.id,
      fullName: client.fullName,
      outstandingBalance,
    },
    debts: debtRows,
    asOf: new Date().toISOString(),
  });
});
