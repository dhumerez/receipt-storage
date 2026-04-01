import { Router } from 'express';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  notifications,
  transactions,
  payments,
  debts,
  clients,
  users,
} from '../db/schema.js';

export const notificationsRouter = Router();

// ─── GET /unread-count ───────────────────────────────────────────────────────
// Returns { count: number } of unread notifications for current user

notificationsRouter.get('/unread-count', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;

  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, userId),
        eq(notifications.companyId, companyId),
        eq(notifications.isRead, false),
      ),
    );

  res.json({ count: Number(result.count) });
});

// ─── GET / — List notifications ──────────────────────────────────────────────
// Ordered by createdAt DESC, limit 50. Includes transaction + client + submitter info.

notificationsRouter.get('/', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;

  const result = await db
    .select({
      id: notifications.id,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      action: notifications.action,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      referenceNumber: transactions.referenceNumber,
      totalAmount: transactions.totalAmount,
      paymentAmount: payments.amount,
      clientName: clients.fullName,
      submitterName: users.fullName,
    })
    .from(notifications)
    .leftJoin(transactions, and(eq(notifications.entityId, transactions.id), eq(notifications.entityType, 'transaction')))
    .leftJoin(payments, and(eq(notifications.entityId, payments.id), eq(notifications.entityType, 'payment')))
    .leftJoin(debts, eq(payments.debtId, debts.id))
    .leftJoin(clients, sql`${clients.id} = COALESCE(${transactions.clientId}, ${debts.clientId})`)
    .leftJoin(users, sql`${users.id} = COALESCE(${transactions.createdBy}, ${payments.recordedBy})`)
    .where(
      and(
        eq(notifications.recipientId, userId),
        eq(notifications.companyId, companyId),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  res.json(result);
});

// ─── PATCH /:id/read — Mark single notification as read ──────────────────────

notificationsRouter.patch('/:id/read', async (req, res) => {
  const userId = req.user!.sub;
  const { id } = req.params;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientId, userId),
      ),
    );

  res.status(204).send();
});

// ─── POST /mark-all-read — Mark all unread notifications as read ─────────────

notificationsRouter.post('/mark-all-read', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.recipientId, userId),
        eq(notifications.companyId, companyId),
        eq(notifications.isRead, false),
      ),
    );

  res.status(204).send();
});
