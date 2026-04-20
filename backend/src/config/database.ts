import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', (client) => {
  client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});
