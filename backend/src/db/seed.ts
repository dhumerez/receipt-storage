import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { companies, users } from './schema.js';

const DEMO_USERS = [
  {
    email: 'admin@demo.com',
    password: 'Admin1234!',
    fullName: 'Super Admin',
    role: 'owner' as const,
    isSuperAdmin: true,
    companyId: null as string | null,
  },
];

const DEMO_COMPANY = {
  name: 'Demo Company',
  currencyCode: 'USD',
};

const DEMO_OWNER = {
  email: 'owner@demo.com',
  password: 'Owner1234!',
  fullName: 'Demo Owner',
  role: 'owner' as const,
  isSuperAdmin: false,
};

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle({ client: pool });

  console.log('Seeding database...');

  // Super admin
  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_USERS[0].email))
    .limit(1);

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(DEMO_USERS[0].password, 12);
    await db.insert(users).values({
      email: DEMO_USERS[0].email,
      passwordHash,
      fullName: DEMO_USERS[0].fullName,
      role: DEMO_USERS[0].role,
      isSuperAdmin: true,
    });
    console.log(`✓ Super admin created: ${DEMO_USERS[0].email} / ${DEMO_USERS[0].password}`);
  } else {
    console.log(`- Super admin already exists: ${DEMO_USERS[0].email}`);
  }

  // Demo company
  let companyId: string;
  const [existingCompany] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.name, DEMO_COMPANY.name))
    .limit(1);

  if (!existingCompany) {
    const [company] = await db
      .insert(companies)
      .values(DEMO_COMPANY)
      .returning({ id: companies.id });
    companyId = company.id;
    console.log(`✓ Demo company created: ${DEMO_COMPANY.name}`);
  } else {
    companyId = existingCompany.id;
    console.log(`- Demo company already exists: ${DEMO_COMPANY.name}`);
  }

  // Demo owner
  const [existingOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_OWNER.email))
    .limit(1);

  if (!existingOwner) {
    const passwordHash = await bcrypt.hash(DEMO_OWNER.password, 12);
    await db.insert(users).values({
      companyId,
      email: DEMO_OWNER.email,
      passwordHash,
      fullName: DEMO_OWNER.fullName,
      role: DEMO_OWNER.role,
      isSuperAdmin: false,
    });
    console.log(`✓ Demo owner created: ${DEMO_OWNER.email} / ${DEMO_OWNER.password}`);
  } else {
    console.log(`- Demo owner already exists: ${DEMO_OWNER.email}`);
  }

  await pool.end();
  console.log('\nSeed complete.');
  console.log('\nDemo credentials:');
  console.log(`  Super Admin:  admin@demo.com  / Admin1234!`);
  console.log(`  Owner:        owner@demo.com  / Owner1234!`);
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
