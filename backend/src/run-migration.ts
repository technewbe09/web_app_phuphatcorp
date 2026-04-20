import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

async function runMigrations() {
  // Create pool with explicit config
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFile = '010_create_delivery_schedules.sql';
  const filePath = path.join(migrationsDir, migrationFile);

  try {
    console.log(`Running migration: ${migrationFile}`);
    console.log(`Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    const sql = fs.readFileSync(filePath, 'utf8');

    await pool.query(sql);

    console.log(`✅ Migration completed: ${migrationFile}`);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
