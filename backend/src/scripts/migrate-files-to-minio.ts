/**
 * Script: Migrate existing inspection files from local disk to MinIO
 * Usage: npx tsx src/scripts/migrate-files-to-minio.ts
 */
import { pool } from '../config/database';
import { storageService } from '../services/storageService';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function main() {
  console.log('[Migrate] Connecting to MinIO...');
  await storageService.ensureBucket();
  console.log('[Migrate] Bucket ready.');

  console.log('[Migrate] Querying inspection_images...');
  const { rows } = await pool.query<{
    id: number;
    filename: string;
    original_filename: string;
    file_path: string;
    file_size: number | null;
    mime_type: string | null;
  }>(
    `SELECT id, filename, original_filename, file_path, file_size, mime_type
     FROM inspection_images
     WHERE file_path NOT LIKE '%/%'
        OR file_path LIKE '/%'
        OR file_path ILIKE 'uploads%'`,
  );

  console.log(`[Migrate] Found ${rows.length} files to migrate.`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    // Try multiple possible local paths
    const possiblePaths = [
      row.file_path,
      path.resolve('uploads', 'inspection-images', row.filename),
      path.resolve(row.file_path),
    ];

    let foundPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      console.log(`  [SKIP] File not found on disk: ${row.filename}`);
      skipped++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(foundPath);
      const mime = row.mime_type || 'application/octet-stream';
      await storageService.upload(buffer, row.original_filename, mime);

      // Update file_path to reflect MinIO (keep filename same since storageService uses same key pattern)
      console.log(`  [OK] Migrated: ${row.filename}`);
      migrated++;
    } catch (err) {
      console.error(`  [ERR] ${row.filename}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  console.log(`\n[Done] ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
