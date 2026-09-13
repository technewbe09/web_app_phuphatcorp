import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../config/database';

const file = '046_create_bang_ke_tho.sql';

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
  const client = await pool.connect();
  try {
    const done = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (done.rowCount) {
      console.log('already applied', file);
      return;
    }
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log('applied', file);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
