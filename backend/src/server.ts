import 'dotenv/config';
import { app } from './app.js';

// NOTE: Database migrations are NOT run here.
// In production, docker-entrypoint.sh runs `npm run db:migrate` before this file starts.
// In development, run `npm run db:migrate` manually before `npm run dev`.
// Keeping migrations out of server.ts ensures the test suite can import app.ts
// without requiring a database connection.

const PORT = parseInt(process.env.PORT ?? '4000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`);
});
