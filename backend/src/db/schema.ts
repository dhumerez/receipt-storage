import { sql, SQL } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  pgView,
  uuid,
  varchar,
  text,
  boolean,
  numeric,
  integer,
  date,
  timestamp,
  char,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'owner',
  'collaborator',
  'viewer',
  'client',
]);

export const txStatusEnum = pgEnum('tx_status', [
  'draft',
  'pending_approval',
  'active',
  'voided',
  'written_off',
]);

export const debtStatusEnum = pgEnum('debt_status', [
  'open',
  'partially_paid',
  'fully_paid',
  'written_off',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'confirmed',
  'pending_approval',
  'rejected',
]);

export const entityTypeEnum = pgEnum('entity_type', [
  'transaction',
  'payment',
]);

// ─── COMPANIES ────────────────────────────────────────────────────────────────
// FR-01.4: companies must have currency_code (ISO 4217, 3-char) for company settings

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull().default('USD'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── COMPANY COUNTERS (reference_number sequencing per company) ───────────────
// NFR-04.3: every financial record gets a reference number; sequencing is per-company per-year

export const companyCounters = pgTable(
  'company_counters',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    lastSequence: integer('last_sequence').notNull().default(0),
  },
  (table) => [
    unique('uq_company_counters_company_year').on(table.companyId, table.year),
  ],
);

// ─── USERS ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull(),
    isSuperAdmin: boolean('is_super_admin').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    invitedBy: uuid('invited_by').references((): any => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_company_id').on(table.companyId),
    index('idx_users_email').on(table.email),
  ],
);

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    address: text('address'),
    referencesText: text('references_text'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_clients_company_id').on(table.companyId),
  ],
);

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 50 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_products_company_id').on(table.companyId),
  ],
);

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    // referenceNumber: e.g. TXN-2026-0042 — generated via company_counters
    referenceNumber: varchar('reference_number', { length: 50 }),
    status: txStatusEnum('status').notNull().default('draft'),
    description: text('description'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    initialPayment: numeric('initial_payment', {
      precision: 12,
      scale: 2,
    }).notNull().default('0'),
    currencyCode: char('currency_code', { length: 3 }).notNull().default('USD'),
    internalNotes: text('internal_notes'),
    clientNotes: text('client_notes'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    // Void fields — financial records are never hard-deleted
    voidedBy: uuid('voided_by').references(() => users.id),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    transactionDate: date('transaction_date').defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_transactions_company_id').on(table.companyId),
    index('idx_transactions_client_id').on(table.clientId),
    index('idx_transactions_status').on(table.status),
    index('idx_transactions_company_client_status').on(
      table.companyId,
      table.clientId,
      table.status,
    ),
  ],
);

// ─── TRANSACTION ITEMS ────────────────────────────────────────────────────────

export const transactionItems = pgTable(
  'transaction_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id),
    description: varchar('description', { length: 255 }).notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).generatedAlwaysAs(
      (): SQL =>
        sql`${transactionItems.quantity} * ${transactionItems.unitPrice}`,
    ),
  },
  (table) => [
    index('idx_transaction_items_transaction_id').on(table.transactionId),
  ],
);

// ─── DEBTS ────────────────────────────────────────────────────────────────────

export const debts = pgTable(
  'debts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: debtStatusEnum('status').notNull().default('open'),
    writeOffReason: text('write_off_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_debts_company_id').on(table.companyId),
    index('idx_debts_client_id').on(table.clientId),
    index('idx_debts_status').on(table.status),
    index('idx_debts_company_client_status').on(
      table.companyId,
      table.clientId,
      table.status,
    ),
  ],
);

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id),
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    status: paymentStatusEnum('status').notNull().default('confirmed'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    // paidAt = when payment actually occurred (user-supplied, may differ from createdAt)
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
    paymentMethod: varchar('payment_method', { length: 100 }),
    reference: varchar('reference', { length: 100 }),
    notes: text('notes'),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_payments_company_id').on(table.companyId),
    index('idx_payments_debt_id').on(table.debtId),
  ],
);

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    entityType: entityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    filePath: varchar('file_path', { length: 500 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_documents_company_id').on(table.companyId),
    index('idx_documents_entity').on(table.entityType, table.entityId),
  ],
);

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id),
    entityType: entityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 30 }).notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_recipient').on(table.recipientId, table.isRead),
  ],
);

// ─── AUDIT LOGS (append-only) ─────────────────────────────────────────────────
// FR-11.1: audit log is append-only in application layer
// FR-11.2: DB-level enforcement via REVOKE UPDATE, DELETE (see 0001_audit_log_immutability.sql)

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').references(() => companies.id),
    actorId: uuid('actor_id').references(() => users.id),
    actorRole: varchar('actor_role', { length: 50 }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id'),
    field: varchar('field', { length: 100 }),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    metadata: text('metadata'),
    // createdAt is immutable — NEVER updated
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_company_id').on(table.companyId),
    index('idx_audit_logs_entity').on(table.entityType, table.entityId),
    index('idx_audit_logs_actor').on(table.actorId),
  ],
);

// ─── DEBT_BALANCES VIEW ───────────────────────────────────────────────────────
// remaining_balance is NEVER stored as a column — always computed here.
// Only 'confirmed' payments count toward the balance.

export const debtBalances = pgView('debt_balances', {
  id: uuid('id').notNull(),
  companyId: uuid('company_id').notNull(),
  clientId: uuid('client_id').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull(),
  remainingBalance: numeric('remaining_balance', {
    precision: 12,
    scale: 2,
  }).notNull(),
  status: debtStatusEnum('status').notNull(),
}).as(sql`
  SELECT
    d.id,
    d.company_id,
    d.client_id,
    d.total_amount,
    COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'confirmed'), 0) AS amount_paid,
    d.total_amount - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'confirmed'), 0) AS remaining_balance,
    d.status
  FROM debts d
  LEFT JOIN payments p ON p.debt_id = d.id
  GROUP BY d.id, d.company_id, d.client_id, d.total_amount, d.status
`);
