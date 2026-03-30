import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle({ client: pool });
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  await pool.end();
  console.log('Migrations complete.');
}

runMigrations().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
