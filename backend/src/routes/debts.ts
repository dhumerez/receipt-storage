import { Router } from 'express';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import {
  debts,
  payments,
  debtBalances,
  documents,
  notifications,
  auditLogs,
  clients,
  users,
  transactions,
} from '../db/schema.js';
import { toCents, fromCents } from '../routes/transactions.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { processFile } from '../services/upload.service.js';

export const debtsRouter = Router();

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreatePaymentSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount'),
  paidAt: z.string().min(1),
  paymentMethod: z.string().min(1).max(100),
  reference: z.string().max(100).optional(),
  notes: z.string().optional(),
});

const ReasonSchema = z.object({
  reason: z.string().min(1).max(500),
});

// ─── GET /:id — Debt detail ─────────────────────────────────────────────────
// FR-07.5, D-06: Debt detail with payments, documents, and computed balance

debtsRouter.get('/:id', async (req, res) => {
  const companyId = req.companyId!;
  const { id } = req.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    res.status(400).json({ error: 'Invalid debt ID format' });
    return;
  }

  // Query debtBalances view joined with debts for extra fields
  const [debtRow] = await db
    .select({
      id: debtBalances.id,
      companyId: debtBalances.companyId,
      clientId: debtBalances.clientId,
      totalAmount: debtBalances.totalAmount,
      amountPaid: debtBalances.amountPaid,
      remainingBalance: debtBalances.remainingBalance,
      status: debtBalances.status,
      writeOffReason: debts.writeOffReason,
      transactionId: debts.transactionId,
      createdAt: debts.createdAt,
      clientName: clients.fullName,
      transactionRef: transactions.referenceNumber,
    })
    .from(debtBalances)
    .innerJoin(debts, eq(debtBalances.id, debts.id))
    .leftJoin(clients, eq(debts.clientId, clients.id))
    .leftJoin(transactions, eq(debts.transactionId, transactions.id))
    .where(and(eq(debtBalances.id, id), eq(debtBalances.companyId, companyId)))
    .limit(1);

  if (!debtRow) {
    res.status(404).json({ error: 'Debt not found' });
    return;
  }

  // Fetch payments ordered by paidAt DESC (D-07: newest first)
  const paymentRows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paidAt: payments.paidAt,
      paymentMethod: payments.paymentMethod,
      reference: payments.reference,
      notes: payments.notes,
      status: payments.status,
      rejectionReason: payments.rejectionReason,
      createdAt: payments.createdAt,
      recordedByName: users.fullName,
    })
    .from(payments)
    .leftJoin(users, eq(payments.recordedBy, users.id))
    .where(eq(payments.debtId, id))
    .orderBy(desc(payments.paidAt));

  // Fetch payment documents
  const paymentIds = paymentRows.map((p) => p.id);
  let paymentDocs: Array<{
    id: string;
    filePath: string;
    originalName: string;
    mimeType: string;
    fileSizeBytes: number;
    entityId: string;
  }> = [];

  if (paymentIds.length > 0) {
    paymentDocs = await db
      .select({
        id: documents.id,
        filePath: documents.filePath,
        originalName: documents.originalName,
        mimeType: documents.mimeType,
        fileSizeBytes: documents.fileSizeBytes,
        entityId: documents.entityId,
      })
      .from(documents)
      .where(
        and(
          eq(documents.entityType, 'payment'),
          inArray(documents.entityId, paymentIds),
        ),
      );
  }

  // Fetch transaction documents
  const transactionDocs = await db
    .select({
      id: documents.id,
      filePath: documents.filePath,
      originalName: documents.originalName,
      mimeType: documents.mimeType,
      fileSizeBytes: documents.fileSizeBytes,
    })
    .from(documents)
    .where(
      and(
        eq(documents.entityType, 'transaction'),
        eq(documents.entityId, debtRow.transactionId),
      ),
    );

  // Attach documents to each payment
  const paymentsWithDocs = paymentRows.map((p) => ({
    ...p,
    documents: paymentDocs
      .filter((d) => d.entityId === p.id)
      .map(({ entityId: _, ...doc }) => doc),
  }));

  res.json({
    id: debtRow.id,
    companyId: debtRow.companyId,
    clientId: debtRow.clientId,
    clientName: debtRow.clientName,
    transactionId: debtRow.transactionId,
    transactionRef: debtRow.transactionRef,
    totalAmount: debtRow.totalAmount,
    amountPaid: debtRow.amountPaid,
    remainingBalance: debtRow.remainingBalance,
    status: debtRow.status,
    writeOffReason: debtRow.writeOffReason,
    createdAt: debtRow.createdAt,
    payments: paymentsWithDocs,
    transactionDocuments: transactionDocs,
  });
});

// ─── POST /:debtId/payments — Record payment ────────────────────────────────
// FR-08.1-FR-08.6, D-01-D-04: Payment creation with role-based status

debtsRouter.post('/:debtId/payments', uploadMiddleware, async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;
  const userRole = req.user!.role;
  const debtId = req.params.debtId as string;

  // Parse FormData or JSON body
  const rawData = typeof req.body.data === 'string'
    ? JSON.parse(req.body.data)
    : req.body;
  const parsed = CreatePaymentSchema.safeParse(rawData);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  const { amount, paidAt, paymentMethod, reference, notes } = parsed.data;

  const result = await db.transaction(async (tx) => {
    // Fetch debt
    const [debt] = await tx
      .select()
      .from(debts)
      .where(and(eq(debts.id, debtId), eq(debts.companyId, companyId)))
      .limit(1);

    if (!debt) {
      return { error: 'Debt not found', status: 404 };
    }

    if (debt.status === 'fully_paid' || debt.status === 'written_off') {
      return { error: `Cannot record payment on a ${debt.status} debt`, status: 400 };
    }

    // Overpayment prevention (FR-08.6)
    const [sumRow] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${payments.amount}) FILTER (WHERE ${payments.status} != 'rejected'), '0')`,
      })
      .from(payments)
      .where(eq(payments.debtId, debtId));

    const existingCents = toCents(sumRow.total);
    const newPaymentCents = toCents(amount);
    const totalDebtCents = toCents(debt.totalAmount);

    if (existingCents + newPaymentCents > totalDebtCents) {
      return {
        error: 'Payment would exceed remaining debt balance',
        maxAmount: fromCents(totalDebtCents - existingCents),
        status: 400,
      };
    }

    // Role-based status (FR-08.4/FR-08.5)
    const paymentStatus = userRole === 'owner' ? 'confirmed' as const : 'pending_approval' as const;

    const [created] = await tx
      .insert(payments)
      .values({
        companyId,
        debtId,
        recordedBy: userId,
        status: paymentStatus,
        amount,
        paidAt: new Date(paidAt),
        paymentMethod,
        reference: reference || null,
        notes: notes || null,
        ...(userRole === 'owner'
          ? { approvedBy: userId, approvedAt: new Date() }
          : {}),
      })
      .returning();

    // Debt status auto-transition (FR-07.2) — only for confirmed payments (owner)
    if (userRole === 'owner') {
      // Get new confirmed total
      const [confirmedRow] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${payments.amount}) FILTER (WHERE ${payments.status} = 'confirmed'), '0')`,
        })
        .from(payments)
        .where(eq(payments.debtId, debtId));

      const newConfirmedCents = toCents(confirmedRow.total);
      const newDebtStatus = newConfirmedCents >= totalDebtCents ? 'fully_paid' : 'partially_paid';

      await tx
        .update(debts)
        .set({ status: newDebtStatus, updatedAt: new Date() })
        .where(eq(debts.id, debtId));
    }

    // Process uploaded files
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    for (const file of uploadedFiles) {
      const fileResult = await processFile(
        file.buffer,
        file.originalname,
        companyId,
        'payments',
        created.id,
      );

      await tx.insert(documents).values({
        companyId,
        uploadedBy: userId,
        entityType: 'payment',
        entityId: created.id,
        filePath: fileResult.filePath,
        originalName: fileResult.originalName,
        mimeType: fileResult.mimeType,
        fileSizeBytes: fileResult.sizeBytes,
      });
    }

    // Audit log
    await tx.insert(auditLogs).values({
      companyId,
      actorId: userId,
      actorRole: userRole,
      action: 'payment_created',
      entityType: 'payment',
      entityId: created.id,
      newValue: JSON.stringify({ amount, debtId, status: paymentStatus }),
    });

    // Notifications (FR-09.3): if collaborator, notify all owners
    if (paymentStatus === 'pending_approval') {
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
            entityType: 'payment' as const,
            entityId: created.id,
            action: 'payment_submitted',
          })),
        );
      }
    }

    return { payment: created, status: 201 };
  });

  if ('error' in result) {
    res.status(result.status).json({ error: result.error, ...(result as any).maxAmount ? { maxAmount: (result as any).maxAmount } : {} });
    return;
  }

  res.status(201).json(result.payment);
});

// ─── POST /:debtId/payments/:paymentId/approve — Owner approves payment ─────
// FR-08.7: SELECT FOR UPDATE for concurrent safety

debtsRouter.post('/:debtId/payments/:paymentId/approve', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;
  const debtId = req.params.debtId as string;
  const paymentId = req.params.paymentId as string;

  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only owners can approve payments' });
    return;
  }

  const result = await db.transaction(async (tx) => {
    // SELECT FOR UPDATE on debt row
    const [debt] = await tx
      .select()
      .from(debts)
      .where(and(eq(debts.id, debtId), eq(debts.companyId, companyId)))
      .for('update');

    if (!debt) {
      return { error: 'Debt not found', status: 404 };
    }

    // SELECT FOR UPDATE on payment row
    const [payment] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.debtId, debtId)))
      .for('update');

    if (!payment) {
      return { error: 'Payment not found', status: 404 };
    }

    if (payment.status !== 'pending_approval') {
      return { error: 'Payment is not pending approval', status: 400 };
    }

    // Re-validate overpayment (concurrent safety)
    const [confirmedRow] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${payments.amount}) FILTER (WHERE ${payments.status} = 'confirmed'), '0')`,
      })
      .from(payments)
      .where(eq(payments.debtId, debtId));

    const confirmedCents = toCents(confirmedRow.total);
    const thisPaymentCents = toCents(payment.amount);
    const totalDebtCents = toCents(debt.totalAmount);

    if (confirmedCents + thisPaymentCents > totalDebtCents) {
      return { error: 'Approving this payment would exceed the debt total', status: 400 };
    }

    // Update payment status
    const [updated] = await tx
      .update(payments)
      .set({
        status: 'confirmed',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    // Update debt status
    const newTotal = confirmedCents + thisPaymentCents;
    const newDebtStatus = newTotal >= totalDebtCents ? 'fully_paid' : 'partially_paid';
    await tx
      .update(debts)
      .set({ status: newDebtStatus, updatedAt: new Date() })
      .where(eq(debts.id, debtId));

    // Audit log
    await tx.insert(auditLogs).values({
      companyId,
      actorId: userId,
      actorRole: 'owner',
      action: 'payment_approved',
      entityType: 'payment',
      entityId: paymentId,
    });

    // Notification to payment submitter
    await tx.insert(notifications).values({
      companyId,
      recipientId: payment.recordedBy,
      entityType: 'payment',
      entityId: paymentId,
      action: 'approved',
    });

    return { payment: updated, status: 200 };
  });

  if ('error' in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result.payment);
});

// ─── POST /:debtId/payments/:paymentId/reject — Owner rejects payment ───────

debtsRouter.post('/:debtId/payments/:paymentId/reject', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;
  const debtId = req.params.debtId as string;
  const paymentId = req.params.paymentId as string;

  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only owners can reject payments' });
    return;
  }

  const parsed = ReasonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  const { reason } = parsed.data;

  const result = await db.transaction(async (tx) => {
    // SELECT FOR UPDATE on payment
    const [payment] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.debtId, debtId)))
      .for('update');

    if (!payment) {
      return { error: 'Payment not found', status: 404 };
    }

    if (payment.status !== 'pending_approval') {
      return { error: 'Payment is not pending approval', status: 400 };
    }

    // Update payment
    const [updated] = await tx
      .update(payments)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    // Audit log
    await tx.insert(auditLogs).values({
      companyId,
      actorId: userId,
      actorRole: 'owner',
      action: 'payment_rejected',
      entityType: 'payment',
      entityId: paymentId,
      metadata: JSON.stringify({ reason }),
    });

    // Notification to payment submitter
    await tx.insert(notifications).values({
      companyId,
      recipientId: payment.recordedBy,
      entityType: 'payment',
      entityId: paymentId,
      action: 'rejected',
    });

    return { payment: updated, status: 200 };
  });

  if ('error' in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result.payment);
});

// ─── POST /:id/write-off — Owner writes off debt ────────────────────────────
// FR-07.6, D-08-D-11

debtsRouter.post('/:id/write-off', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;
  const { id } = req.params;

  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only owners can write off debts' });
    return;
  }

  const parsed = ReasonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  const { reason } = parsed.data;

  const result = await db.transaction(async (tx) => {
    const [debt] = await tx
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.companyId, companyId)))
      .limit(1);

    if (!debt) {
      return { error: 'Debt not found', status: 404 };
    }

    if (debt.status === 'fully_paid' || debt.status === 'written_off') {
      return { error: `Cannot write off a ${debt.status} debt`, status: 400 };
    }

    const [updated] = await tx
      .update(debts)
      .set({
        status: 'written_off',
        writeOffReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(debts.id, id))
      .returning();

    // Audit log
    await tx.insert(auditLogs).values({
      companyId,
      actorId: userId,
      actorRole: 'owner',
      action: 'debt_written_off',
      entityType: 'debt',
      entityId: id,
      oldValue: debt.status,
      newValue: 'written_off',
      metadata: JSON.stringify({ reason }),
    });

    return { debt: updated, status: 200 };
  });

  if ('error' in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result.debt);
});

// ─── POST /:id/reopen — Owner reopens written-off debt ──────────────────────
// D-10

debtsRouter.post('/:id/reopen', async (req, res) => {
  const companyId = req.companyId!;
  const userId = req.user!.sub;
  const { id } = req.params;

  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only owners can reopen debts' });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [debt] = await tx
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.companyId, companyId)))
      .limit(1);

    if (!debt) {
      return { error: 'Debt not found', status: 404 };
    }

    if (debt.status !== 'written_off') {
      return { error: 'Only written-off debts can be reopened', status: 400 };
    }

    // Compute correct status based on confirmed payments
    const [confirmedRow] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${payments.amount}) FILTER (WHERE ${payments.status} = 'confirmed'), '0')`,
      })
      .from(payments)
      .where(eq(payments.debtId, id));

    const confirmedCents = toCents(confirmedRow.total);
    const newStatus = confirmedCents > 0 ? 'partially_paid' as const : 'open' as const;

    const [updated] = await tx
      .update(debts)
      .set({
        status: newStatus,
        writeOffReason: null,
        updatedAt: new Date(),
      })
      .where(eq(debts.id, id))
      .returning();

    // Audit log
    await tx.insert(auditLogs).values({
      companyId,
      actorId: userId,
      actorRole: 'owner',
      action: 'debt_reopened',
      entityType: 'debt',
      entityId: id,
      oldValue: 'written_off',
      newValue: newStatus,
    });

    return { debt: updated, status: 200 };
  });

  if ('error' in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result.debt);
});
