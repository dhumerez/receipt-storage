import { Router } from 'express';
import { eq, and, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { products } from '../db/schema.js';

export const productsRouter = Router();

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid price (e.g. "12.50")'),
  unit: z.string().max(50).optional(),
});

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  unit: z.string().max(50).optional().nullable(),
});

// ─── GET /api/v1/products ─────────────────────────────────────────────────────
// FR-04.2: Tenant-scoped product list; optional ?search (name ilike) and ?status filter

productsRouter.get('/', async (req, res) => {
  // companyId ALWAYS from req.companyId! — never from req.body (NFR-01.1)
  const companyId = req.companyId!;
  const { search, status } = req.query as { search?: string; status?: string };

  const conditions: any[] = [eq(products.companyId, companyId)];

  if (search && search.trim()) {
    conditions.push(ilike(products.name, `%${search.trim()}%`));
  }

  if (status === 'active') conditions.push(eq(products.isActive, true));
  if (status === 'inactive') conditions.push(eq(products.isActive, false));

  const result = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(products.name);

  res.json(result);
});

// ─── POST /api/v1/products ────────────────────────────────────────────────────
// FR-04.1: Create product; companyId from JWT only (NFR-01.1)

productsRouter.post('/', async (req, res) => {
  const parsed = CreateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  // companyId ALWAYS from req.companyId! — never from req.body (NFR-01.1)
  const companyId = req.companyId!;
  const { name, description, unitPrice, unit } = parsed.data;

  const [created] = await db
    .insert(products)
    .values({
      companyId,
      name,
      description: description || null,
      unitPrice,
      unit: unit || null,
    })
    .returning();

  res.status(201).json(created);
});

// ─── PATCH /api/v1/products/:id ───────────────────────────────────────────────
// FR-04.3: Update product; ownership verify before update (NFR-01.6)

productsRouter.patch('/:id', async (req, res) => {
  const parsed = UpdateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }

  // companyId ALWAYS from req.companyId! — never from req.body (NFR-01.1)
  const companyId = req.companyId!;
  const { id } = req.params;

  // Verify product belongs to this company (NFR-01.6 — cross-tenant guard)
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, id), eq(products.companyId, companyId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const [updated] = await db
    .update(products)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.companyId, companyId)))
    .returning();

  res.json(updated);
});

// ─── PATCH /api/v1/products/:id/deactivate ───────────────────────────────────
// FR-04.3: No hard delete; deactivate only. Returns 204.

productsRouter.patch('/:id/deactivate', async (req, res) => {
  // companyId ALWAYS from req.companyId! — never from req.body (NFR-01.1)
  const companyId = req.companyId!;
  const { id } = req.params;

  // Verify product belongs to this company (NFR-01.6 — cross-tenant guard)
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, id), eq(products.companyId, companyId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.companyId, companyId)));

  res.status(204).send();
});

// ─── PATCH /api/v1/products/:id/reactivate ───────────────────────────────────
// FR-04.3: Reactivate a previously deactivated product. Returns 204.

productsRouter.patch('/:id/reactivate', async (req, res) => {
  // companyId ALWAYS from req.companyId! — never from req.body (NFR-01.1)
  const companyId = req.companyId!;
  const { id } = req.params;

  // Verify product belongs to this company (NFR-01.6 — cross-tenant guard)
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, id), eq(products.companyId, companyId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  await db
    .update(products)
    .set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.companyId, companyId)));

  res.status(204).send();
});
