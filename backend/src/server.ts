import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { pool } from './config/database';
import { schedulerService } from './services/schedulerService';

async function main(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('[DB] Connected to PostgreSQL');
    client.release();
  } catch (err) {
    console.error('[DB] Failed to connect:', err);
    process.exit(1);
  }

  await schedulerService.init();

  app.listen(env.port, () => {
    console.log(`[Server] Running on http://localhost:${env.port}`);
  });
}

process.on('SIGTERM', () => {
  schedulerService.destroy();
  process.exit(0);
});

main().catch(console.error);
