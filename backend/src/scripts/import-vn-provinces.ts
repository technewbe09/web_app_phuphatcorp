/**
 * Import VN provinces + wards from vietnamese-provinces-database JSON.
 * Run after migration 039: npx tsx src/scripts/import-vn-provinces.ts
 * Source: https://github.com/thanglequoc/vietnamese-provinces-database
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../config/database';

interface WardJson {
  Code: string;
  FullName: string;
  ProvinceCode: string;
}

interface ProvinceJson {
  Code: string;
  FullName: string;
  Wards: WardJson[];
}

function shortName(fullName: string, kind: 'province' | 'ward'): string {
  if (kind === 'province') {
    return fullName.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim() || fullName;
  }
  return fullName.replace(/^(Phường|Xã|Thị trấn|Đặc khu)\s+/i, '').trim() || fullName;
}

async function main(): Promise<void> {
  const dataPath = path.join(__dirname, '../data/vn_provinces_wards.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Missing data file: ${dataPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as ProvinceJson[];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let provinceCount = 0;
    let wardCount = 0;

    for (const p of raw) {
      const name = shortName(p.FullName, 'province');
      await client.query(
        `INSERT INTO provinces (code, name, full_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, full_name = EXCLUDED.full_name`,
        [p.Code, name, p.FullName],
      );
      provinceCount += 1;

      for (const w of p.Wards || []) {
        const wName = shortName(w.FullName, 'ward');
        await client.query(
          `INSERT INTO wards (code, name, full_name, province_code)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (code) DO UPDATE SET
             name = EXCLUDED.name,
             full_name = EXCLUDED.full_name,
             province_code = EXCLUDED.province_code`,
          [w.Code, wName, w.FullName, w.ProvinceCode || p.Code],
        );
        wardCount += 1;
      }
    }

    await client.query('COMMIT');
    // eslint-disable-next-line no-console
    console.log(`✅ Imported ${provinceCount} provinces, ${wardCount} wards`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Import failed:', err);
  process.exitCode = 1;
});
