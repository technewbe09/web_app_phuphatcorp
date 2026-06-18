import cron, { ScheduledTask } from 'node-cron';
import { reconcileJobService } from './reconcileJobService';

const tasks: Map<string, ScheduledTask> = new Map();

function taskKey(configId: number, hour: number): string {
  return `${configId}:${hour}`;
}

async function executeJob(configId: number): Promise<void> {
  const config = await reconcileJobService.getConfigById(configId);
  if (!config || !config.is_active) return;

  const lookbackDays = config.lookback_days;

  try {
    const logId = await reconcileJobService.createLog(
      configId,
      'scheduled',
      lookbackDays,
    );

    const result = await reconcileJobService.executeReconcile(lookbackDays);

    await reconcileJobService.updateLogSuccess(
      logId,
      result.scanned_count,
      result.matched_count,
      result.matched_invoices,
    );
    await reconcileJobService.updateConfigLastRun(configId);

    console.log(
      `[Scheduler] Job #${configId} completed: ${result.matched_count}/${result.scanned_count} matched`,
    );
  } catch (err) {
    console.error(
      `[Scheduler] Job #${configId} failed:`,
      err instanceof Error ? err.message : err,
    );
  }
}

function scheduleConfig(configId: number, hours: number[]): void {
  unscheduleConfig(configId);

  for (const hour of hours) {
    if (hour < 0 || hour > 23) continue;

    const key = taskKey(configId, hour);
    const cronExpr = `0 ${hour} * * *`;

    try {
      const task = cron.schedule(cronExpr, () => executeJob(configId), {
        timezone: 'Asia/Ho_Chi_Minh',
      });
      tasks.set(key, task);
    } catch (err) {
      console.error(
        `[Scheduler] Failed to schedule config #${configId} at ${hour}h:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

function unscheduleConfig(configId: number): void {
  for (const [key, task] of tasks.entries()) {
    if (key.startsWith(`${configId}:`)) {
      task.stop();
      tasks.delete(key);
    }
  }
}

export const schedulerService = {
  async init(): Promise<void> {
    const configs = await reconcileJobService.listConfigs();
    const activeConfigs = configs.filter((c) => c.is_active);

    for (const config of activeConfigs) {
      scheduleConfig(config.id, config.schedule_hours);
    }

    console.log(
      `[Scheduler] Initialized: ${activeConfigs.length} config(s), ${tasks.size} cron tasks`,
    );
  },

  reschedule(configId: number): void {
    unscheduleConfig(configId);
  },

  async refreshConfig(configId: number): Promise<void> {
    unscheduleConfig(configId);

    const config = await reconcileJobService.getConfigById(configId);
    if (config && config.is_active) {
      scheduleConfig(config.id, config.schedule_hours);
    }
  },

  destroy(): void {
    for (const task of tasks.values()) {
      task.stop();
    }
    tasks.clear();
    console.log('[Scheduler] All tasks destroyed');
  },
};
