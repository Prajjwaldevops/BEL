# Backend Scheduler Documentation

## Overview

The BEL Secure Platform uses **node-cron** for backend-based scheduled tasks. This is a **free, self-hosted alternative** to Vercel's cron jobs, which require a paid plan.

All scheduled tasks run directly in the Next.js backend process, making the platform completely free to host on any Node.js-compatible platform.

## Architecture

```
src/lib/scheduler/
├── index.ts                    # Main scheduler service
├── tasks/
│   ├── audit-batch.ts         # Process audit logs in batches
│   ├── cleanup-access.ts      # Revoke expired time-bound access
│   └── security-scores.ts     # Calculate security posture scores
└── init-scheduler.ts          # Auto-initialization on app start
```

## Scheduled Tasks

### 1. Audit Batch Processing
- **Frequency:** Every 5 minutes (`*/5 * * * *`)
- **Function:** `processAuditBatch()`
- **Purpose:** Analyzes recent audit logs for suspicious activity patterns
- **Actions:**
  - Fetches logs from last 5 minutes
  - Detects failed login attempts
  - Identifies rapid repeated actions
  - Creates security alerts for suspicious activity
  - Updates analytics metrics

### 2. Expired Access Cleanup
- **Frequency:** Hourly at :00 (`0 * * * *`)
- **Function:** `cleanupExpiredAccess()`
- **Purpose:** Revokes time-bound access grants that have expired
- **Actions:**
  - Finds expired active grants
  - Updates status to 'expired'
  - Creates audit logs for expired access
  - Returns count of cleaned grants

### 3. Security Score Updates
- **Frequency:** Daily at 2 AM UTC (`0 2 * * *`)
- **Function:** `updateSecurityScores()`
- **Purpose:** Calculates security posture scores for all users
- **Actions:**
  - Calculates individual user scores (0-100)
  - Considers open incidents and active alerts
  - Determines risk level (low/medium/high/critical)
  - Generates personalized recommendations
  - Updates security_scores table

## Initialization

The scheduler is automatically initialized when the Next.js app starts:

```typescript
// src/app/layout.tsx
import '@/lib/init-scheduler'; // Auto-starts on server startup
```

The initialization logic ensures the scheduler only starts once per process and only on the server-side (not during build or in browser).

## API Endpoints

### Get Scheduler Status

```bash
GET /api/scheduler/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "initialized": true,
    "tasks": {
      "audit-batch": true,
      "cleanup-access": true,
      "security-scores": true
    }
  }
}
```

### Manually Trigger Task (Admin Only)

```bash
POST /api/scheduler/trigger
Content-Type: application/json

{
  "task": "audit-batch"
}
```

**Available tasks:**
- `audit-batch` - Process audit logs
- `cleanup-access` - Clean expired access
- `security-scores` - Update security scores

**Response:**
```json
{
  "success": true,
  "message": "Audit batch processing triggered"
}
```

## Cron Schedule Format

node-cron uses standard cron syntax:

```
 ┌────────────── second (optional, 0-59)
 │ ┌──────────── minute (0-59)
 │ │ ┌────────── hour (0-23)
 │ │ │ ┌──────── day of month (1-31)
 │ │ │ │ ┌────── month (1-12)
 │ │ │ │ │ ┌──── day of week (0-7, 0 and 7 = Sunday)
 │ │ │ │ │ │
 * * * * * *
```

**Common patterns:**
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour at :00
- `0 2 * * *` - Daily at 2:00 AM
- `0 0 * * 0` - Weekly on Sunday at midnight

## Adding New Tasks

1. **Create task function** in `src/lib/scheduler/tasks/`:

```typescript
// src/lib/scheduler/tasks/my-task.ts
export async function myNewTask() {
  console.log('[MyTask] Running...');
  // Your task logic here
}
```

2. **Register in scheduler** (`src/lib/scheduler/index.ts`):

```typescript
import { myNewTask } from './tasks/my-task';

const myTask = cron.schedule('0 * * * *', async () => {
  console.log('[Scheduler] Running my new task...');
  try {
    await myNewTask();
  } catch (error) {
    console.error('[Scheduler] My task failed:', error);
  }
}, {
  scheduled: true,
  timezone: 'UTC'
});

scheduledTasks.set('my-task', myTask);
```

3. **Add trigger case** (for manual execution):

```typescript
case 'my-task':
  await myNewTask();
  return { success: true, message: 'My task triggered' };
```

## Monitoring

All scheduler activities are logged to the console with prefixes:

- `[Scheduler]` - Main scheduler operations
- `[AuditBatch]` - Audit processing logs
- `[CleanupAccess]` - Access cleanup logs
- `[SecurityScores]` - Score calculation logs

**Example logs:**
```
[Scheduler] Initializing backend scheduler...
[Scheduler] All scheduled tasks initialized
[Scheduler] Active tasks: [ 'audit-batch', 'cleanup-access', 'security-scores' ]
[Scheduler] Running audit batch processing...
[AuditBatch] Processing 47 audit logs
[AuditBatch] Created 3 security alerts
[Scheduler] Audit batch processing completed
```

## Deployment

### Free Hosting Options

The backend scheduler works on any Node.js hosting platform:

1. **Render** - Free tier, auto-deploy from GitHub
2. **Railway** - Free tier with $5/month credit
3. **Fly.io** - Free tier, multiple regions
4. **DigitalOcean App Platform** - $5/month
5. **Self-hosted VPS** - Complete control

### Environment Variables

Ensure these are set in your hosting environment:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Node environment
NODE_ENV=production
```

### Process Management

The scheduler runs in the Next.js server process. If you're using a process manager like PM2:

```bash
# Start with PM2
pm2 start npm --name "bel-platform" -- start

# View logs
pm2 logs bel-platform

# Restart (scheduler will reinitialize)
pm2 restart bel-platform
```

## Testing

### Test in Development

```bash
npm run dev
```

The scheduler will start automatically and log its activity.

### Manual Trigger (Testing)

Use the API endpoint to trigger tasks manually:

```bash
# Get status
curl http://localhost:3000/api/scheduler/status

# Trigger task (requires admin auth)
curl -X POST http://localhost:3000/api/scheduler/trigger \
  -H "Content-Type: application/json" \
  -d '{"task": "audit-batch"}' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Scheduler Not Starting

**Problem:** No scheduler logs on startup

**Solution:** 
1. Check `src/lib/init-scheduler.ts` is imported in `layout.tsx`
2. Ensure `NODE_ENV !== 'test'`
3. Verify server-side execution (not during build)

### Task Not Running

**Problem:** Scheduled task never executes

**Solution:**
1. Check cron syntax: https://crontab.guru
2. Verify timezone setting (default: UTC)
3. Check console logs for errors
4. Manually trigger via API to test logic

### High CPU Usage

**Problem:** Scheduler consuming too many resources

**Solution:**
1. Increase task intervals (reduce frequency)
2. Add pagination to database queries
3. Implement batch size limits
4. Use indexes on queried columns

## Migration from Vercel Cron

The old Vercel cron jobs have been **completely removed**:

- ❌ `src/app/api/cron/*` - Deleted
- ❌ `vercel.json` crons - Removed
- ✅ `src/lib/scheduler/*` - New backend scheduler
- ✅ Auto-initialization on app start
- ✅ Free to host anywhere

**Benefits:**
- No paid Vercel plan required
- Works on any hosting platform
- Better logging and monitoring
- Manual trigger capability
- Easier to test locally

## Best Practices

1. **Keep tasks idempotent** - Safe to run multiple times
2. **Use UTC timezone** - Consistent across deployments
3. **Log all activities** - Easy debugging and monitoring
4. **Handle errors gracefully** - Don't crash the scheduler
5. **Test locally first** - Use manual triggers
6. **Monitor task duration** - Avoid overlapping executions
7. **Use database transactions** - Ensure data consistency

## Resources

- [node-cron documentation](https://github.com/node-cron/node-cron)
- [Cron expression generator](https://crontab.guru)
- [Next.js server components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
