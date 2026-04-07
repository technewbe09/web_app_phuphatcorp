import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({
  host: process.env.DB_HOST || '72.61.124.36',
  port: parseInt(process.env.DB_PORT || '5443'),
  database: process.env.DB_NAME || 'test_PhuPhatCorp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'br4px2sxeeqm9ned',
  ssl: false,
});

async function createAdmin() {
  const password = 'Admin@123456';
  const hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, username, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = EXCLUDED.role
     RETURNING id, email, username, full_name, role`,
    ['admin@phuphatcorp.com', 'admin', hash, 'Quản trị viên', 'ADMIN']
  );

  console.log('Admin user created/updated:');
  console.log(result.rows[0]);
  console.log(`\nEmail: admin@phuphatcorp.com`);
  console.log(`Username: admin`);
  console.log(`Password: ${password}`);

  await pool.end();
}

createAdmin().catch(console.error);
