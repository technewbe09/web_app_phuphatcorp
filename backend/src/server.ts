import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { pool } from './config/database';

async function main(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('[DB] Connected to PostgreSQL');
    client.release();
  } catch (err) {
    console.error('[DB] Failed to connect:', err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`[Server] Running on http://localhost:${env.port}`);
  });
}

main().catch(console.error);
