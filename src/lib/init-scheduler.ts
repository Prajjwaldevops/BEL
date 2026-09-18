/**
 * Scheduler Initialization
 * Initialize the scheduler when the Next.js app starts
 */

import { initializeScheduler } from './scheduler';

let schedulerInitialized = false;

/**
 * Initialize scheduler once per process
 * Safe to call multiple times (will only initialize once)
 */
export function ensureSchedulerInitialized() {
  if (!schedulerInitialized && process.env.NODE_ENV !== 'test') {
    console.log('[Init] Starting backend scheduler...');
    initializeScheduler();
    schedulerInitialized = true;
    console.log('[Init] Backend scheduler started successfully');
  }
}

// Initialize on module load (when server starts)
if (typeof window === 'undefined') {
  // Only run on server-side
  ensureSchedulerInitialized();
}
