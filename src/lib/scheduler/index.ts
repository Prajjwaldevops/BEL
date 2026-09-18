/**
 * Backend Scheduler Service
 * Uses node-cron for scheduled tasks - free alternative to Vercel cron
 */

import cron from 'node-cron';
import { processAuditBatch } from './tasks/audit-batch';
import { cleanupExpiredAccess } from './tasks/cleanup-access';
import { updateSecurityScores } from './tasks/security-scores';

// Track scheduled tasks
const scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler() {
  console.log('[Scheduler] Initializing backend scheduler...');

  // Task 1: Process audit logs batch (every 5 minutes)
  const auditTask = cron.schedule('*/5 * * * *', async () => {
    console.log('[Scheduler] Running audit batch processing...');
    try {
      await processAuditBatch();
      console.log('[Scheduler] Audit batch processing completed');
    } catch (error) {
      console.error('[Scheduler] Audit batch processing failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  scheduledTasks.set('audit-batch', auditTask);

  // Task 2: Cleanup expired time-bound access (hourly at :00)
  const cleanupTask = cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Running expired access cleanup...');
    try {
      await cleanupExpiredAccess();
      console.log('[Scheduler] Expired access cleanup completed');
    } catch (error) {
      console.error('[Scheduler] Expired access cleanup failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  scheduledTasks.set('cleanup-access', cleanupTask);

  // Task 3: Update security posture scores (daily at 2 AM UTC)
  const scoresTask = cron.schedule('0 2 * * *', async () => {
    console.log('[Scheduler] Running security score updates...');
    try {
      await updateSecurityScores();
      console.log('[Scheduler] Security score updates completed');
    } catch (error) {
      console.error('[Scheduler] Security score updates failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  scheduledTasks.set('security-scores', scoresTask);

  console.log('[Scheduler] All scheduled tasks initialized');
  console.log('[Scheduler] Active tasks:', Array.from(scheduledTasks.keys()));
}

/**
 * Stop all scheduled tasks
 */
export function stopScheduler() {
  console.log('[Scheduler] Stopping all scheduled tasks...');
  scheduledTasks.forEach((task, name) => {
    task.stop();
    console.log(`[Scheduler] Stopped task: ${name}`);
  });
  scheduledTasks.clear();
  console.log('[Scheduler] All tasks stopped');
}

/**
 * Get status of all scheduled tasks
 */
export function getSchedulerStatus() {
  const status: Record<string, boolean> = {};
  scheduledTasks.forEach((task, name) => {
    status[name] = task.getStatus() === 'scheduled';
  });
  return {
    initialized: scheduledTasks.size > 0,
    tasks: status
  };
}

/**
 * Manually trigger a specific task (for testing)
 */
export async function triggerTask(taskName: string): Promise<{ success: boolean; message: string }> {
  switch (taskName) {
    case 'audit-batch':
      await processAuditBatch();
      return { success: true, message: 'Audit batch processing triggered' };
    
    case 'cleanup-access':
      await cleanupExpiredAccess();
      return { success: true, message: 'Expired access cleanup triggered' };
    
    case 'security-scores':
      await updateSecurityScores();
      return { success: true, message: 'Security score updates triggered' };
    
    default:
      return { success: false, message: `Unknown task: ${taskName}` };
  }
}
