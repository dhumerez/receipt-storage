import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { companies, users } from '../db/schema.js';
import { hashPassword } from '../services/auth.service.js';
import { ERRORS } from '../constants/strings/errors.js';

export const adminRouter = Router();
// Note: authenticate + requireSuperAdmin applied in app.ts, not here

const CreateCompanySchema = z.object({
  name: z.string().min(1).max(255),
  currencyCode: z.string().length(3).toUpperCase(),
});

const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  currencyCode: z.string().length(3).toUpperCase().optional(),
  isActive: z.boolean().optional(),
});

const CreateOwnerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(255),
});

// GET /admin/companies
adminRouter.get('/companies', async (_req, res) => {
  const result = await db.select().from(companies).orderBy(companies.createdAt);
  res.json(result);
});

// GET /admin/companies/:id
adminRouter.get('/companies/:id', async (req, res) => {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, req.params.id))
    .limit(1);
  if (!company) {
    res.status(404).json({ error: ERRORS.companyNotFound });
    return;
  }
  const [owner] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName, role: users.role })
    .from(users)
    .where(and(eq(users.companyId, company.id), eq(users.role, 'owner')))
    .limit(1);
  res.json({ ...company, owner: owner ?? null });
});

// POST /admin/companies
adminRouter.post('/companies', async (req, res) => {
  const parsed = CreateCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: ERRORS.validationError, details: parsed.error.flatten() });
    return;
  }
  const [company] = await db
    .insert(companies)
    .values({ name: parsed.data.name, currencyCode: parsed.data.currencyCode })
    .returning({ id: companies.id, name: companies.name, currencyCode: companies.currencyCode });
  res.status(201).json(company);
});

// PATCH /admin/companies/:id
adminRouter.patch('/companies/:id', async (req, res) => {
  const parsed = UpdateCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: ERRORS.validationError, details: parsed.error.flatten() });
    return;
  }
  const [updated] = await db
    .update(companies)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(companies.id, req.params.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: ERRORS.companyNotFound });
    return;
  }
  res.json(updated);
});

// POST /admin/companies/:id/owner
adminRouter.post('/companies/:id/owner', async (req, res) => {
  const parsed = CreateOwnerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: ERRORS.validationError, details: parsed.error.flatten() });
    return;
  }

  // Verify company exists
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, req.params.id))
    .limit(1);
  if (!company) {
    res.status(404).json({ error: ERRORS.companyNotFound });
    return;
  }

  // Check for duplicate email
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: ERRORS.emailAlreadyInUse });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [newUser] = await db
    .insert(users)
    .values({
      companyId: req.params.id,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      fullName: parsed.data.fullName,
      role: 'owner',
      isSuperAdmin: false,
    })
    .returning({ id: users.id, email: users.email, role: users.role });
  res.status(201).json(newUser);
});
