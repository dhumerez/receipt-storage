import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { debtBalances, payments, debts } from '../db/schema.js';

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
