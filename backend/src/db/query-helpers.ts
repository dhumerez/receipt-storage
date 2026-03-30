import { and, eq, SQL } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { db } from './client.js';
import * as schema from './schema.js';

type TenantTable = PgTable & { companyId: PgColumn };

/**
 * Returns scoped query builders for a given companyId.
 * companyId MUST come from verified JWT (req.user.companyId).
 * NEVER pass companyId from req.body or req.params.
 *
 * Usage:
 *   const q = forCompany(req.user.companyId);
 *   const clients = await q.clients.findAll();
 */
export function forCompany(companyId: string) {
  function scopedSelect<T extends TenantTable>(
    table: T,
    extraWhere?: SQL,
  ) {
    const baseWhere = eq((table as any).companyId, companyId);
    return db
      .select()
      .from(table as any)
      .where(extraWhere ? and(baseWhere, extraWhere) : baseWhere);
  }

  return {
    clients: {
      findAll: () => scopedSelect(schema.clients),
      findById: (id: string) =>
        scopedSelect(schema.clients, eq(schema.clients.id, id)).limit(1),
    },
    products: {
      findAll: () => scopedSelect(schema.products),
      findById: (id: string) =>
        scopedSelect(schema.products, eq(schema.products.id, id)).limit(1),
    },
    transactions: {
      findAll: () => scopedSelect(schema.transactions),
      findById: (id: string) =>
        scopedSelect(schema.transactions, eq(schema.transactions.id, id)).limit(1),
    },
    debts: {
      findAll: () => scopedSelect(schema.debts),
      findById: (id: string) =>
        scopedSelect(schema.debts, eq(schema.debts.id, id)).limit(1),
    },
    payments: {
      findAll: () => scopedSelect(schema.payments),
      findById: (id: string) =>
        scopedSelect(schema.payments, eq(schema.payments.id, id)).limit(1),
    },
    documents: {
      findAll: () => scopedSelect(schema.documents),
      findById: (id: string) =>
        scopedSelect(schema.documents, eq(schema.documents.id, id)).limit(1),
    },
    notifications: {
      findAll: () => scopedSelect(schema.notifications),
      findUnread: () =>
        scopedSelect(
          schema.notifications,
          eq(schema.notifications.isRead, false),
        ),
    },
  };
}
