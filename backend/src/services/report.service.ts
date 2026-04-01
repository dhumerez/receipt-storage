import { eq, and, sql, desc, gte, lt, SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  clients,
  transactions,
  transactionItems,
  debts,
  debtBalances,
  payments,
  companies,
  products,
} from '../db/schema.js';

// ─── Company Report ──────────────────────────────────────────────────────────
// D-01, D-03, D-04: Company-wide balance summary per client

export async function getCompanyReport(
  companyId: string,
  dateFrom?: string,
  dateTo?: string,
  showSettled?: boolean,
): Promise<
  Array<{
    clientId: string;
    clientName: string;
    totalDebts: string;
    totalPaid: string;
    outstandingBalance: string;
  }>
> {
  // Build date conditions for the debts subquery
  const dateConditions: SQL[] = [];
  if (dateFrom) {
    dateConditions.push(gte(debts.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    // Exclusive upper bound: < dateTo + 1 day (Pitfall 4)
    const nextDay = new Date(dateTo);
    nextDay.setDate(nextDay.getDate() + 1);
    dateConditions.push(lt(debts.createdAt, nextDay));
  }

  // Use raw SQL for aggregation to keep money math at SQL level (Pitfall 2)
  const dateFilter =
    dateConditions.length > 0
      ? sql` AND ${and(...dateConditions)}`
      : sql``;

  const rows = await db
    .select({
      clientId: clients.id,
      clientName: clients.fullName,
      totalDebts: sql<string>`COALESCE(SUM(db.total_amount), '0.00')`.as('total_debts'),
      totalPaid: sql<string>`COALESCE(SUM(db.amount_paid), '0.00')`.as('total_paid'),
      outstandingBalance: sql<string>`COALESCE(SUM(db.remaining_balance), '0.00')`.as(
        'outstanding_balance',
      ),
    })
    .from(clients)
    .leftJoin(
      sql`(
        SELECT dv.client_id, dv.total_amount, dv.amount_paid, dv.remaining_balance
        FROM debt_balances dv
        INNER JOIN debts d ON d.id = dv.id
        WHERE dv.company_id = ${companyId}${dateFilter}
      ) AS db`,
      sql`db.client_id = ${clients.id}`,
    )
    .where(and(eq(clients.companyId, companyId), eq(clients.isActive, true)))
    .groupBy(clients.id, clients.fullName)
    .orderBy(clients.fullName);

  // Filter out settled clients if showSettled is false (default)
  if (!showSettled) {
    return rows.filter((r) => r.outstandingBalance !== '0.00' && r.outstandingBalance !== '0');
  }

  return rows;
}

// ─── Client Report ───────────────────────────────────────────────────────────
// D-02: Per-client detailed report with transaction history, debts, payments

export async function getClientReport(
  companyId: string,
  clientId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<{
  client: { id: string; fullName: string; email: string | null; phone: string | null };
  transactions: Array<{
    id: string;
    referenceNumber: string | null;
    deliveredAt: Date | null;
    description: string | null;
    totalAmount: string;
    items: Array<{
      description: string;
      quantity: string;
      unitPrice: string;
      lineTotal: string | null;
    }>;
    debt?: {
      totalAmount: string;
      amountPaid: string;
      remainingBalance: string;
      status: string;
      payments: Array<{
        amount: string;
        paidAt: Date;
        paymentMethod: string | null;
        reference: string | null;
        status: string;
      }>;
    };
  }>;
}> {
  // Get client info
  const [client] = await db
    .select({
      id: clients.id,
      fullName: clients.fullName,
      email: clients.email,
      phone: clients.phone,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId)))
    .limit(1);

  if (!client) {
    throw new Error('Client not found');
  }

  // Build date filter conditions on transactions.deliveredAt
  const txConditions: SQL[] = [
    eq(transactions.companyId, companyId),
    eq(transactions.clientId, clientId),
  ];
  if (dateFrom) {
    txConditions.push(gte(transactions.deliveredAt, new Date(dateFrom)));
  }
  if (dateTo) {
    const nextDay = new Date(dateTo);
    nextDay.setDate(nextDay.getDate() + 1);
    txConditions.push(lt(transactions.deliveredAt, nextDay));
  }

  // Get transactions
  const txRows = await db
    .select({
      id: transactions.id,
      referenceNumber: transactions.referenceNumber,
      deliveredAt: transactions.deliveredAt,
      description: transactions.description,
      totalAmount: transactions.totalAmount,
    })
    .from(transactions)
    .where(and(...txConditions))
    .orderBy(desc(transactions.deliveredAt));

  // Build full transaction details
  const result = [];
  for (const tx of txRows) {
    // Get line items
    const items = await db
      .select({
        description: transactionItems.description,
        quantity: transactionItems.quantity,
        unitPrice: transactionItems.unitPrice,
        lineTotal: transactionItems.lineTotal,
      })
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, tx.id));

    // Get debt from debtBalances view
    const [debtRow] = await db
      .select({
        totalAmount: debtBalances.totalAmount,
        amountPaid: debtBalances.amountPaid,
        remainingBalance: debtBalances.remainingBalance,
        status: debtBalances.status,
        debtId: debtBalances.id,
      })
      .from(debtBalances)
      .innerJoin(debts, eq(debtBalances.id, debts.id))
      .where(
        and(
          eq(debts.transactionId, tx.id),
          eq(debtBalances.companyId, companyId),
        ),
      )
      .limit(1);

    let debt: any = undefined;
    if (debtRow) {
      // Get payments for this debt
      const paymentRows = await db
        .select({
          amount: payments.amount,
          paidAt: payments.paidAt,
          paymentMethod: payments.paymentMethod,
          reference: payments.reference,
          status: payments.status,
        })
        .from(payments)
        .where(eq(payments.debtId, debtRow.debtId))
        .orderBy(desc(payments.paidAt));

      debt = {
        totalAmount: debtRow.totalAmount,
        amountPaid: debtRow.amountPaid,
        remainingBalance: debtRow.remainingBalance,
        status: debtRow.status,
        payments: paymentRows,
      };
    }

    result.push({
      id: tx.id,
      referenceNumber: tx.referenceNumber,
      deliveredAt: tx.deliveredAt,
      description: tx.description,
      totalAmount: tx.totalAmount,
      items,
      ...(debt ? { debt } : {}),
    });
  }

  return { client, transactions: result };
}

// ─── Receipt Data ────────────────────────────────────────────────────────────
// Single transaction data for PDF receipt generation

export async function getReceiptData(
  companyId: string,
  transactionId: string,
): Promise<{
  company: { name: string; logoPath: string | null };
  client: { fullName: string; email: string | null; phone: string | null };
  transaction: {
    referenceNumber: string | null;
    deliveredAt: Date | null;
    description: string | null;
    items: Array<{
      description: string;
      quantity: string;
      unitPrice: string;
      lineTotal: string | null;
    }>;
    totalAmount: string;
  };
  debt?: {
    totalAmount: string;
    amountPaid: string;
    remainingBalance: string;
    status: string;
    payments: Array<{
      amount: string;
      paidAt: Date;
      paymentMethod: string | null;
      reference: string | null;
      status: string;
    }>;
  };
}> {
  // Get company info
  const [company] = await db
    .select({
      name: companies.name,
      logoPath: companies.logoPath,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    throw new Error('Company not found');
  }

  // Get transaction with client info
  const [tx] = await db
    .select({
      id: transactions.id,
      referenceNumber: transactions.referenceNumber,
      deliveredAt: transactions.deliveredAt,
      description: transactions.description,
      totalAmount: transactions.totalAmount,
      clientId: transactions.clientId,
      clientName: clients.fullName,
      clientEmail: clients.email,
      clientPhone: clients.phone,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.companyId, companyId)),
    )
    .limit(1);

  if (!tx) {
    throw new Error('Transaction not found');
  }

  // Get line items
  const items = await db
    .select({
      description: transactionItems.description,
      quantity: transactionItems.quantity,
      unitPrice: transactionItems.unitPrice,
      lineTotal: transactionItems.lineTotal,
    })
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, transactionId));

  // Get debt from debtBalances view
  const [debtRow] = await db
    .select({
      totalAmount: debtBalances.totalAmount,
      amountPaid: debtBalances.amountPaid,
      remainingBalance: debtBalances.remainingBalance,
      status: debtBalances.status,
      debtId: debtBalances.id,
    })
    .from(debtBalances)
    .innerJoin(debts, eq(debtBalances.id, debts.id))
    .where(
      and(
        eq(debts.transactionId, transactionId),
        eq(debtBalances.companyId, companyId),
      ),
    )
    .limit(1);

  let debt: any = undefined;
  if (debtRow) {
    const paymentRows = await db
      .select({
        amount: payments.amount,
        paidAt: payments.paidAt,
        paymentMethod: payments.paymentMethod,
        reference: payments.reference,
        status: payments.status,
      })
      .from(payments)
      .where(eq(payments.debtId, debtRow.debtId))
      .orderBy(desc(payments.paidAt));

    debt = {
      totalAmount: debtRow.totalAmount,
      amountPaid: debtRow.amountPaid,
      remainingBalance: debtRow.remainingBalance,
      status: debtRow.status,
      payments: paymentRows,
    };
  }

  return {
    company,
    client: {
      fullName: tx.clientName!,
      email: tx.clientEmail,
      phone: tx.clientPhone,
    },
    transaction: {
      referenceNumber: tx.referenceNumber,
      deliveredAt: tx.deliveredAt,
      description: tx.description,
      items,
      totalAmount: tx.totalAmount,
    },
    ...(debt ? { debt } : {}),
  };
}
