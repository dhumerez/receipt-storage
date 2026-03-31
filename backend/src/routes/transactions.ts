import { Router } from 'express';
import { eq, and, ilike, or, gte, lte, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import {
  transactions,
  transactionItems,
  debts,
  notifications,
  companyCounters,
  auditLogs,
  clients,
  users,
  documents,
} from '../db/schema.js';

export const transactionsRouter = Router();

// ─── Money helpers (exported for unit testing) ───────────────────────────────

export function toCents(str: string): number {
  return Math.round(parseFloat(str) * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ─── Reference number generator ──────────────────────────────────────────────
// Upserts companyCounters row (per company per year), increments lastSequence,
// returns formatted TXN-YYYY-NNNN string.

async function nextReferenceNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  companyId: string,
): Promise<string> {
  const year = new Date().getFullYear();

  // Upsert: insert if not exists, increment if exists
  await tx
    .insert(companyCounters)
    .values({ companyId, year, lastSequence: 1 })
    .onConflictDoUpdate({
      target: [companyCounters.companyId, companyCounters.year],
      set: { lastSequence: sql`${companyCounters.lastSequence} + 1` },
    });

  // Read the new value
  const [row] = await tx
    .select({ lastSequence: companyCounters.lastSequence })
    .from(companyCounters)
    .where(
      and(
        eq(companyCounters.companyId, companyId),
        eq(companyCounters.year, year),
      ),
    );

  const seq = String(row.lastSequence).padStart(4, '0');
  return `TXN-${year}-${seq}`;
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateTransactionSchema = z.object({
  clientId: z.string().uuid(),
  description: z.string().optional(),
  deliveredAt: z.string().optional(), // ISO string
  initialPayment: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount')
    .default('0'),
  clientNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional(),
        description: z.string().min(1).max(255),
        quantity: z.string().regex(/^\d+(\.\d{1,3})?$/, 'Must be a valid quantity'),
        unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid price'),
      }),
    )
    .min(1, 'At least one line item is required'),
});

const RejectSchema = z.object({
  reason: z.string().min(1).max(500),
});

const VoidSchema = z.object({
  reason: z.string().min(1).max(500),
});

// ─── POST / — Create transaction ─────────────────────────────────────────────
// FR-05.1 through FR-05.7: Role-based status, reference number, auto-debt

transactionsRouter.post('/', async (req, res) => {
  const parsed = CreateTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  const companyId = req.companyId!;
  const userId = req.user!.sub;
  const userRole = req.user!.role;
  const { clientId, description, deliveredAt, initialPayment, clientNotes, internalNotes, items } =
    parsed.data;

  // Verify client belongs to this company
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId)))
    .limit(1);

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const referenceNumber = await nextReferenceNumber(tx, companyId);

    // Server-side total: integer cents arithmetic to avoid floating point
    const totalCents = items.reduce((acc, item) => {
      const quantityMils = Math.round(parseFloat(item.quantity) * 1000);
      const priceCents = toCents(item.unitPrice);
      return acc + Math.round((quantityMils * priceCents) / 1000);
    }, 0);

    const initialPaymentCents = toCents(initialPayment);

    // FR-05.6/FR-05.7: owner -> active, collaborator -> pending_approval
    const status = userRole === 'owner' ? 'active' : 'pending_approval';

    const [created] = await tx
      .insert(transactions)
      .values({
        companyId,
        clientId,
        createdBy: userId,
        referenceNumber,
        status,
        description: description || null,
        totalAmount: fromCents(totalCents),
        initialPayment,
        clientNotes: clientNotes || null,
        internalNotes: internalNotes || null,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
      })
      .returning();

    // Insert line items
    const insertedItems = await tx
      .insert(transactionItems)
      .values(
        items.map((item) => ({
          transactionId: created.id,
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      )
      .returning();

    // FR-05.5: auto-create debt if status active and totalAmount > initialPayment
    if (status === 'active' && totalCents > initialPaymentCents) {
      await tx.insert(debts).values({
        companyId,
        transactionId: created.id,
        clientId,
        totalAmount: fromCents(totalCents - initialPaymentCents),
        status: 'open',
      });
    }

    // Notifications: if pending_approval, notify all owners in the company
    if (status === 'pending_approval') {
      const owners = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.companyId, companyId),
            eq(users.role, 'owner'),
            eq(users.isActive, true),
          ),
        );

      if (owners.length > 0) {
        await tx.insert(notifications).values(
          owners.map((owner) => ({
            companyId,
            recipientId: owner.id,
            entityType: 'transaction' as const,
            entityId: created.id,
            action: 'submitted_for_approval',
          })),
        );
      }
    }

    // Audit log
    await tx.insert(auditLogs).values({
      companyId,
      actorId: userId,
      actorRole: userRole,
      action: 'transaction.created',
      entityType: 'transaction',
      entityId: created.id,
    });

    return { transaction: created, items: insertedItems };
  });

  res.status(201).json(result);
});

// ─── GET / — List transactions ───────────────────────────────────────────────
// Supports: search, clientId, status, dateFrom, dateTo filters

transactionsRouter.get('/', async (req, res) => {
  const companyId = req.companyId!;
  const { search, clientId, status, dateFrom, dateTo } = req.query as {
    search?: string;
    clientId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };

  const conditions: any[] = [eq(transactions.companyId, companyId)];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(transactions.referenceNumber, term),
        ilike(transactions.description, term),
      ),
    );
  }

  if (clientId) {
    conditions.push(eq(transactions.clientId, clientId));
  }

  if (status) {
    conditions.push(eq(transactions.status, status as any));
  }

  if (dateFrom) {
    conditions.push(gte(transactions.deliveredAt, new Date(dateFrom)));
  }

  if (dateTo) {
    conditions.push(lte(transactions.deliveredAt, new Date(dateTo)));
  }

  const result = await db
    .select({
      id: transactions.id,
      referenceNumber: transactions.referenceNumber,
      status: transactions.status,
      description: transactions.description,
      totalAmount: transactions.totalAmount,
      initialPayment: transactions.initialPayment,
      currencyCode: transactions.currencyCode,
      deliveredAt: transactions.deliveredAt,
      transactionDate: transactions.transactionDate,
      createdAt: transactions.createdAt,
      clientId: transactions.clientId,
      clientName: clients.fullName,
      createdBy: transactions.createdBy,
      submitterName: users.fullName,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(users, eq(transactions.createdBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.createdAt));

  res.json(result);
});

// ─── GET /:id — Single transaction detail ────────────────────────────────────
// Includes line items, documents, client/submitter names
// FR-05.12: excludes internalNotes for client role

transactionsRouter.get('/:id', async (req, res) => {
  const companyId = req.companyId!;
  const { id } = req.params;

  const [txn] = await db
    .select({
      id: transactions.id,
      companyId: transactions.companyId,
      clientId: transactions.clientId,
      createdBy: transactions.createdBy,
      approvedBy: transactions.approvedBy,
      approvedAt: transactions.approvedAt,
      referenceNumber: transactions.referenceNumber,
      status: transactions.status,
      description: transactions.description,
      totalAmount: transactions.totalAmount,
      initialPayment: transactions.initialPayment,
      currencyCode: transactions.currencyCode,
      internalNotes: transactions.internalNotes,
      clientNotes: transactions.clientNotes,
      deliveredAt: transactions.deliveredAt,
      voidedBy: transactions.voidedBy,
      voidedAt: transactions.voidedAt,
      voidReason: transactions.voidReason,
      transactionDate: transactions.transactionDate,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      clientName: clients.fullName,
      submitterName: users.fullName,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(users, eq(transactions.createdBy, users.id))
    .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId)))
    .limit(1);

  if (!txn) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  // Fetch line items
  const items = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, id));

  // Fetch associated documents
  const docs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.entityType, 'transaction'),
        eq(documents.entityId, id),
        eq(documents.companyId, companyId),
      ),
    );

  // FR-05.12: exclude internalNotes for client role
  const responseTransaction =
    req.user!.role === 'client'
      ? { ...txn, internalNotes: null }
      : txn;

  res.json({
    ...responseTransaction,
    items,
    documents: docs,
  });
});

// ─── POST /:id/approve — Owner approves pending transaction ──────────────────
// FR-05.7: SELECT FOR UPDATE race safety

transactionsRouter.post('/:id/approve', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;
  const { id } = req.params;

  // Owner-only guard
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only owners can approve transactions' });
    return;
  }

  const result = await db.transaction(async (tx) => {
    // SELECT FOR UPDATE — prevents concurrent approval race
    const [txn] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId)))
      .for('update');

    if (!txn || txn.status !== 'pending_approval') {
      return { error: 'Transaction is not pending approval' };
    }

    // Update to active
    const [updated] = await tx
      .update(transactions)
      .set({
        status: 'active',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();

    // Auto-create debt if totalAmount > initialPayment
    const totalCents = toCents(txn.totalAmount);
    const initialPaymentCents = toCents(txn.initialPayment);
    if (totalCents > initialPaymentCents) {
      await tx.insert(debts).values({
        companyId,
        transactionId: id,
        clientId: txn.clientId,
        totalAmount: fromCents(totalCents - initialPaymentCents),
        status: 'open',
      });
    }

    // Notify the original submitter
    await tx.insert(notifications).values({
      companyId,
      recipientId: txn.createdBy,
      entityType: 'transaction',
      entityId: id,
      action: 'approved',
    });

    // Audit log
    await tx.insert(auditLogs).values({
      companyId,
      actorId: userId,
      actorRole: 'owner',
      action: 'transaction.approved',
      entityType: 'transaction',
      entityId: id,
    });

    return { transaction: updated };
  });

  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result);
});

// ─── POST /:id/reject — Owner rejects pending transaction ───────────────────
// FR-05.9: rejected -> draft with required reason

transactionsRouter.post('/:id/reject', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;
  const { id } = req.params;

  // Owner-only guard
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only owners can reject transactions' });
    return;
  }

  const parsed = RejectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  const { reason } = parsed.data;

  const result = await db.transaction(async (tx) => {
    // SELECT FOR UPDATE
    const [txn] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId)))
      .for('update');

    if (!txn || txn.status !== 'pending_approval') {
      return { error: 'Transaction is not pending approval' };
    }

    // Set back to draft
    const [updated] = await tx
      .update(transactions)
      .set({
        status: 'draft',
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();

    // Notify the original submitter with rejection reason
    await tx.insert(notifications).values({
      companyId,
      recipientId: txn.createdBy,
      entityType: 'transaction',
      entityId: id,
      action: 'rejected',
    });

    // Audit log with reason
    await tx.insert(auditLogs).values({
      companyId,
      actorId: userId,
      actorRole: 'owner',
      action: 'transaction.rejected',
      entityType: 'transaction',
      entityId: id,
      metadata: JSON.stringify({ reason }),
    });

    return { transaction: updated };
  });

  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result);
});

// ─── POST /:id/void — Owner voids a transaction ─────────────────────────────

transactionsRouter.post('/:id/void', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;
  const { id } = req.params;

  // Owner-only guard
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only owners can void transactions' });
    return;
  }

  const parsed = VoidSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  const { reason } = parsed.data;

  const [existing] = await db
    .select({ id: transactions.id, status: transactions.status })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  const [updated] = await db
    .update(transactions)
    .set({
      status: 'voided',
      voidedBy: userId,
      voidedAt: new Date(),
      voidReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, id))
    .returning();

  // Audit log
  await db.insert(auditLogs).values({
    companyId,
    actorId: userId,
    actorRole: 'owner',
    action: 'transaction.voided',
    entityType: 'transaction',
    entityId: id,
    metadata: JSON.stringify({ reason }),
  });

  res.json({ transaction: updated });
});
