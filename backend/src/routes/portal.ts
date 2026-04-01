import { Router } from 'express';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { debtBalances, payments, debts, documents, users, transactions } from '../db/schema.js';

export const portalRouter = Router();

// ─── GET /api/v1/portal/summary ───────────────────────────────────────────────
// FR-03.4, FR-03.5, FR-03.6: Balance summary scoped to clientId from JWT
// FR-03.7: internalNotes never included in portal responses

portalRouter.get('/summary', async (req, res) => {
  const clientId = req.user!.clientId;
  const companyId = req.user!.companyId;

  // Guard: clientId must exist (client role always has it after portal invite accepted)
  if (!clientId || !companyId) {
    res.status(403).json({ error: 'Client identity not found in token' });
    return;
  }

  // Confirmed balance from debtBalances view (only 'confirmed' payments count — see view def)
  const [balanceRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${debtBalances.remainingBalance}), '0.00')`,
    })
    .from(debtBalances)
    .where(
      and(
        eq(debtBalances.clientId, clientId),
        eq(debtBalances.companyId, companyId),
      ),
    );

  // Pending payments sum (separate from confirmed — FR-03.6)
  const [pendingRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${payments.amount}), '0.00')`,
    })
    .from(payments)
    .innerJoin(debts, eq(payments.debtId, debts.id))
    .where(
      and(
        eq(debts.clientId, clientId),
        eq(debts.companyId, companyId),
        eq(payments.status, 'pending_approval'),
      ),
    );

  // FR-03.5: asOf is current server time — always returned so UI can display "as of [date]"
  res.json({
    confirmedBalance: balanceRow?.total ?? '0.00',
    pendingBalance: pendingRow?.total ?? '0.00',
    asOf: new Date().toISOString(),
    // internalNotes: NEVER included here or in any portal response
  });
});

// ─── GET /api/v1/portal/debts ─────────────────────────────────────────────────
// FR-03.4, FR-03.7: Client sees own debts only; internalNotes excluded by not joining transactions
// D-12: Portal groups by status (Open / Partially Paid / Fully Paid)

portalRouter.get('/debts', async (req, res) => {
  const clientId = req.user!.clientId;
  const companyId = req.user!.companyId;

  if (!clientId || !companyId) {
    res.status(403).json({ error: 'Client identity not found in token' });
    return;
  }

  // Select from debtBalances view (computed remainingBalance) — explicit columns only
  // FR-03.7: Do NOT join transactions table — avoids accidental internalNotes exposure
  const result = await db
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
        eq(debtBalances.clientId, clientId),
        eq(debtBalances.companyId, companyId),
      ),
    )
    .orderBy(debtBalances.status);

  res.json(result);
});

// ─── GET /api/v1/portal/debts/:id ────────────────────────────────────────────
// D-12, D-13, D-14: Portal debt detail — no internalNotes, no transaction docs
// FR-03.7: structural guard — no transactions table join for notes

portalRouter.get('/debts/:id', async (req, res) => {
  const clientId = req.user!.clientId;
  const companyId = req.user!.companyId;
  const { id } = req.params;

  if (!clientId || !companyId) {
    res.status(403).json({ error: 'Client identity not found in token' });
    return;
  }

  // Debt from view — scoped to clientId AND companyId
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
      transactionRef: transactions.referenceNumber,
    })
    .from(debtBalances)
    .innerJoin(debts, eq(debtBalances.id, debts.id))
    .leftJoin(transactions, eq(debts.transactionId, transactions.id))
    .where(
      and(
        eq(debtBalances.id, id),
        eq(debtBalances.clientId, clientId),
        eq(debtBalances.companyId, companyId),
      ),
    )
    .limit(1);

  if (!debtRow) {
    res.status(404).json({ error: 'Debt not found' });
    return;
  }

  // Payments ordered by paidAt DESC
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

  // Payment documents only (no transaction docs for portal — D-14)
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
    transactionId: debtRow.transactionId,
    transactionRef: debtRow.transactionRef,
    totalAmount: debtRow.totalAmount,
    amountPaid: debtRow.amountPaid,
    remainingBalance: debtRow.remainingBalance,
    status: debtRow.status,
    writeOffReason: debtRow.writeOffReason,
    createdAt: debtRow.createdAt,
    payments: paymentsWithDocs,
  });
});
