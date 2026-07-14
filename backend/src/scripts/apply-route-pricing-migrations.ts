import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../config/database';

async function main() {
  const files = [
    '033_create_vn_provinces_wards.sql',
    '034_create_route_pricing.sql',
    '035_seed_route_pricing_permissions.sql',
    '036_route_price_versions_race_guards.sql',
    '037_route_pricing_location_note_trips.sql',
    '038_route_pricing_modes_range.sql',
  ];
  const executed = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  const set = new Set(executed.rows.map((r) => r.filename));
  console.log('Already:', [...set].filter((f) => f.startsWith('03')).join(', ') || '(none 03x)');

  for (const file of files) {
    if (set.has(file)) {
      console.log('Skip', file);
      continue;
    }
    const sql = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log('OK', file);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('FAIL', file, e);
      throw e;
    } finally {
      client.release();
    }
  }
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
