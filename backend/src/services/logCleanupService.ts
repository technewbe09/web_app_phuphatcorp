import cron, { ScheduledTask } from 'node-cron';
import { pool } from '../config/database';

let cleanupTask: ScheduledTask | null = null;

async function cleanup(): Promise<void> {
  try {
    const accessResult = await pool.query<{ deleted: string }>(
      `WITH deleted AS (
        DELETE FROM access_logs
        WHERE created_at < NOW() - INTERVAL '90 days'
        RETURNING id
      )
      SELECT COUNT(*) AS deleted FROM deleted`,
    );

    const auditResult = await pool.query<{ deleted: string }>(
      `WITH deleted AS (
        DELETE FROM audit_logs
        WHERE created_at < NOW() - INTERVAL '180 days'
        RETURNING id
      )
      SELECT COUNT(*) AS deleted FROM deleted`,
    );

    const accessDeleted = parseInt(accessResult.rows[0]?.deleted ?? '0', 10);
    const auditDeleted = parseInt(auditResult.rows[0]?.deleted ?? '0', 10);

    if (accessDeleted > 0 || auditDeleted > 0) {
      console.log(
        `[logCleanup] Deleted ${accessDeleted} access logs (>90d) and ${auditDeleted} audit logs (>180d)`,
      );
    }
  } catch (err) {
    console.error('[logCleanup] Failed to clean up old logs:', (err as Error).message);
  }
}

export function initLogCleanup(): void {
  // Run daily at 3:00 AM (Asia/Ho_Chi_Minh timezone)
  cleanupTask = cron.schedule(
    '0 3 * * *',
    () => {
      cleanup();
    },
    {
      timezone: 'Asia/Ho_Chi_Minh',
    },
  );

  console.log('[logCleanup] Scheduled daily cleanup at 3:00 AM (UTC+7)');
}

export function destroyLogCleanup(): void {
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
    console.log('[logCleanup] Cleanup task destroyed');
  }
}
