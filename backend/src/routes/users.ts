import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users, tokens, companies, transactions, payments } from '../db/schema.js';
import { generateRawToken, hashToken } from '../services/auth.service.js';
import { sendInviteEmail } from '../services/email.service.js';

export const usersRouter = Router();

// ─── Re-validate caller from DB (NFR-01.5) ────────────────────────────────────
// For sensitive operations, confirm caller is still active + has the expected role.
// The JWT alone is insufficient if role was changed since last login.
async function validateCallerOwner(userId: string, companyId: string): Promise<boolean> {
  const [caller] = await db
    .select({ role: users.role, isActive: users.isActive, companyId: users.companyId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return (
    !!caller &&
    caller.isActive === true &&
    caller.role === 'owner' &&
    caller.companyId === companyId
  );
}

// ─── GET /api/v1/users ────────────────────────────────────────────────────────

usersRouter.get('/', async (req, res) => {
  const companyId = req.companyId!;
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.companyId, companyId))
    .orderBy(users.createdAt);
  res.json(result);
});

// ─── POST /api/v1/users/invite ────────────────────────────────────────────────

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'collaborator', 'viewer']), // 'client' NOT allowed here
  fullName: z.string().min(1).max(255),
});

usersRouter.post('/invite', async (req, res) => {
  const parsed = InviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  const companyId = req.companyId!;
  const callerId = req.user!.sub;

  // NFR-01.5: re-validate from DB
  const callerValid = await validateCallerOwner(callerId, companyId);
  if (!callerValid) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  // Fetch company name for email
  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  // Fetch caller name for email
  const [caller] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, callerId))
    .limit(1);

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await db.insert(tokens).values({
    tokenHash,
    type: 'invite',
    email: parsed.data.email.toLowerCase(),
    companyId,
    invitedBy: callerId,
    role: parsed.data.role,
    expiresAt,
  });

  // Fire-and-forget email (avoids timing leak on email latency)
  sendInviteEmail({
    to: parsed.data.email,
    rawToken,
    invitedByName: caller?.fullName ?? 'Your manager',
    companyName: company?.name ?? 'your company',
    role: parsed.data.role,
  }).catch(console.error);

  res.status(201).json({ message: 'Invitation sent' });
});

// ─── PATCH /api/v1/users/:id/role ─────────────────────────────────────────────

const ChangeRoleSchema = z.object({
  role: z.enum(['owner', 'collaborator', 'viewer', 'client']),
});

usersRouter.patch('/:id/role', async (req, res) => {
  const parsed = ChangeRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  const companyId = req.companyId!;
  const callerId = req.user!.sub;
  const targetId = req.params.id;

  if (targetId === callerId) {
    res.status(400).json({ error: 'Cannot change your own role' });
    return;
  }

  // NFR-01.5: re-validate from DB
  const callerValid = await validateCallerOwner(callerId, companyId);
  if (!callerValid) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  const [updated] = await db
    .update(users)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(and(eq(users.id, targetId), eq(users.companyId, companyId)))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(updated);
});

// ─── PATCH /api/v1/users/:id/deactivate ──────────────────────────────────────

usersRouter.patch('/:id/deactivate', async (req, res) => {
  const companyId = req.companyId!;
  const callerId = req.user!.sub;
  const targetId = req.params.id;

  if (targetId === callerId) {
    res.status(400).json({ error: 'Cannot deactivate yourself' });
    return;
  }

  // NFR-01.5: re-validate from DB
  const callerValid = await validateCallerOwner(callerId, companyId);
  if (!callerValid) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  // Verify target belongs to this company first (before transaction)
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, targetId), eq(users.companyId, companyId)))
    .limit(1);

  if (!targetUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const now = new Date();
  let pendingTransactionsReverted = 0;
  let pendingPaymentsRejected = 0;

  // FR-02.9: Single transaction — deactivate user + reject all their pending work atomically
  await db.transaction(async (tx) => {
    // 1. Deactivate user
    await tx
      .update(users)
      .set({ isActive: false, updatedAt: now })
      .where(eq(users.id, targetId));

    // 2. Auto-reject pending transactions (revert to draft so they remain editable)
    const revertedTxs = await tx
      .update(transactions)
      .set({ status: 'draft', updatedAt: now })
      .where(
        and(
          eq(transactions.createdBy, targetId),
          eq(transactions.companyId, companyId),
          eq(transactions.status, 'pending_approval'),
        ),
      )
      .returning({ id: transactions.id });
    pendingTransactionsReverted = revertedTxs.length;

    // 3. Auto-reject pending payments
    const rejectedPayments = await tx
      .update(payments)
      .set({
        status: 'rejected',
        rejectionReason: 'User removed from company',
        updatedAt: now,
      })
      .where(
        and(
          eq(payments.recordedBy, targetId),
          eq(payments.companyId, companyId),
          eq(payments.status, 'pending_approval'),
        ),
      )
      .returning({ id: payments.id });
    pendingPaymentsRejected = rejectedPayments.length;
  });

  res.json({
    message: 'User deactivated',
    pendingTransactionsReverted,
    pendingPaymentsRejected,
  });
});
