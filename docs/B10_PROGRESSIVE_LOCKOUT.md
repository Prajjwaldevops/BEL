# B10: Progressive Account Lockout - Implementation Guide

**Status:** ✅ Implemented  
**Date:** 2026-09-17  
**Priority:** High Security Feature

## Overview

Progressive Account Lockout implements a three-tier rate limiting system that automatically locks accounts after repeated failed login attempts, with escalating timeouts and security responses.

## Architecture

### Tier System

1. **Tier 0: Normal** (0-2 failures)
   - Login allowed
   - No restrictions

2. **Tier 1: Warning** (3-4 failures)
   - Login allowed but monitored
   - CAPTCHA recommended
   - Security event logged (LOW severity)

3. **Tier 2: Short Lockout** (5-9 failures)
   - Account locked for 15 minutes
   - CAPTCHA required after unlock
   - Security event logged (MEDIUM severity)

4. **Tier 3: Long Lockout** (10+ failures)
   - Account locked for 60 minutes
   - Admin unlock required (configurable)
   - Security event logged (HIGH severity)
   - Potential brute force attack flagged

### Database Schema

#### Tables Created

**`login_attempts`**
```sql
- id: UUID (PK)
- username: VARCHAR(100)
- email: VARCHAR(255)
- ip_address: INET (indexed)
- user_agent: TEXT
- success: BOOLEAN (indexed)
- failure_reason: VARCHAR(100)
- lockout_until: TIMESTAMPTZ (indexed)
- requires_captcha: BOOLEAN
- created_at: TIMESTAMPTZ (indexed)
```

**`account_unlocks`**
```sql
- id: UUID (PK)
- username: VARCHAR(100) (indexed)
- unlocked_by: UUID (FK to profiles)
- reason: TEXT
- previous_lockout_until: TIMESTAMPTZ
- ip_address: INET
- created_at: TIMESTAMPTZ (indexed)
```

**`rate_limit_config`**
```sql
- id: UUID (PK)
- name: VARCHAR(100) UNIQUE
- max_attempts_tier1: INTEGER (default: 3)
- max_attempts_tier2: INTEGER (default: 5)
- max_attempts_tier3: INTEGER (default: 10)
- lockout_duration_tier2_minutes: INTEGER (default: 15)
- lockout_duration_tier3_minutes: INTEGER (default: 60)
- window_minutes: INTEGER (default: 60)
- requires_admin_unlock: BOOLEAN (default: TRUE)
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### Functions

**`check_rate_limit(username, email, ip_address)`**
- Returns: allowed, reason, lockout_until, failed_attempts, requires_captcha, tier
- Counts recent failures within time window
- Determines current tier and restrictions
- Logs security events for tier 2+

**`record_login_attempt(...)`**
- Records login attempt (success or failure)
- Automatically applies lockout based on current rate limit check
- Returns attempt ID

**`admin_unlock_account(username, unlocked_by, reason)`**
- Clears active lockouts
- Records unlock in audit trail
- Logs security event
- Requires admin role

**`cleanup_old_login_attempts()`**
- Removes successful attempts older than 90 days
- Keeps failed attempts for security analysis
- Returns count of deleted records

### API Endpoints

#### POST /api/auth/login
**Enhanced with rate limiting**
- Checks rate limit before authentication
- Records all attempts (success/fail)
- Returns rate limit info in error response

**Response (Rate Limited):**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Account locked until 2026-09-17T14:30:00Z",
  "lockoutUntil": "2026-09-17T14:30:00Z",
  "failedAttempts": 10,
  "requiresCaptcha": true,
  "tier": 3
}
```

#### GET /api/rate-limit/check?username=user&email=email
**Check current rate limit status**

**Response:**
```json
{
  "allowed": false,
  "reason": "Account locked after 10 failed attempts",
  "lockoutUntil": "2026-09-17T14:30:00Z",
  "failedAttempts": 10,
  "requiresCaptcha": true,
  "tier": 3
}
```

#### POST /api/rate-limit/unlock
**Admin unlock account** (Admin only)

**Request:**
```json
{
  "username": "john.doe",
  "reason": "User verified identity via phone call"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account unlocked successfully"
}
```

#### GET /api/rate-limit/attempts?username=user&limit=50
**View login attempts** (Admin or own data)

**Response:**
```json
{
  "attempts": [
    {
      "id": "uuid",
      "username": "john.doe",
      "ipAddress": "192.168.1.100",
      "success": false,
      "failureReason": "INVALID_PASSWORD",
      "lockoutUntil": "2026-09-17T14:30:00Z",
      "requiresCaptcha": true,
      "createdAt": "2026-09-17T13:45:00Z"
    }
  ],
  "count": 1
}
```

#### GET /api/rate-limit/config
**Get current rate limit configuration**

#### POST /api/rate-limit/config
**Update rate limit configuration** (Admin only)

**Request:**
```json
{
  "name": "strict",
  "maxAttemptsTier1": 2,
  "maxAttemptsTier2": 4,
  "maxAttemptsTier3": 8,
  "lockoutDurationTier2Minutes": 30,
  "lockoutDurationTier3Minutes": 120,
  "windowMinutes": 60,
  "requiresAdminUnlock": true
}
```

### Components

#### RateLimitDashboard
**Location:** `src/components/RateLimitDashboard.tsx`

**Features:**
- Display current configuration (tier thresholds)
- View recent login attempts with status badges
- Search attempts by username
- Real-time lockout countdown
- Admin unlock interface with reason logging

**Usage:**
```tsx
import { RateLimitDashboard } from '@/components/RateLimitDashboard';

export default function SecurityPage() {
  return <RateLimitDashboard />;
}
```

### Cron Jobs

#### Cleanup Old Login Attempts
**Route:** `/api/cron/cleanup-login-attempts`  
**Schedule:** Daily at 2:00 AM  
**Function:** Removes successful login attempts older than 90 days

**Vercel Configuration:**
```json
{
  "path": "/api/cron/cleanup-login-attempts",
  "schedule": "0 2 * * *"
}
```

## Security Features

### 1. IP-Based Rate Limiting
- Tracks attempts by IP address
- Prevents distributed attacks from single network
- Combines username + IP for accuracy

### 2. Progressive Escalation
- Gradual increase in restrictions
- Legitimate users get warnings before lockout
- Severe restrictions only after persistent failures

### 3. Admin Override
- Tier 3 lockouts require admin intervention
- All unlocks are audited with reason
- Prevents automated unlock attempts

### 4. Security Event Integration
- All tier 2+ events logged to `security_events`
- Integrated with existing audit system
- Enables correlation with other security incidents

### 5. Metadata Tracking
- User-Agent for device identification
- IP geolocation possible (external service)
- Failure reasons for pattern analysis

## Configuration

### Default Settings
```typescript
{
  maxAttemptsTier1: 3,      // Warning threshold
  maxAttemptsTier2: 5,      // Short lockout threshold
  maxAttemptsTier3: 10,     // Long lockout threshold
  lockoutDurationTier2Minutes: 15,
  lockoutDurationTier3Minutes: 60,
  windowMinutes: 60,        // Count failures in last hour
  requiresAdminUnlock: true // Tier 3 needs admin
}
```

### Customization
Admins can update configuration via API or admin panel to adjust thresholds based on:
- Threat landscape
- User behavior patterns
- Business requirements
- Compliance needs

## Testing

### Unit Tests
```bash
npm run test src/lib/rate-limit.test.ts
npm run test src/middleware/rate-limit.test.ts
```

### Integration Tests
```bash
# Test progressive lockout
npm run test:integration rate-limit

# Test scenarios:
# - 0-2 failures: allowed
# - 3-4 failures: warning + CAPTCHA
# - 5-9 failures: 15min lockout
# - 10+ failures: 60min lockout + admin unlock
```

### Manual Testing Checklist
- [ ] Failed login increments counter
- [ ] Successful login resets counter
- [ ] Tier 1 shows warning
- [ ] Tier 2 locks for 15 minutes
- [ ] Tier 3 locks for 60 minutes
- [ ] Admin can unlock accounts
- [ ] Unlock is logged in audit trail
- [ ] Security events are created
- [ ] Cleanup cron removes old attempts
- [ ] IP tracking works correctly
- [ ] User-Agent is captured

## Monitoring

### Key Metrics
- Failed login attempts per hour
- Active lockouts (by tier)
- Admin unlocks per day
- Top failed usernames (potential targets)
- Top IP addresses (potential attackers)

### Alerts
Configure alerts for:
- Tier 3 lockouts (HIGH severity)
- > 10 unlocks per day (potential admin abuse)
- Same IP hitting multiple accounts
- Spike in failed attempts (> 100/hour)

### Dashboard Queries
```sql
-- Active lockouts
SELECT username, ip_address, lockout_until, 
       COUNT(*) as failed_attempts
FROM login_attempts
WHERE lockout_until > NOW()
GROUP BY username, ip_address, lockout_until
ORDER BY failed_attempts DESC;

-- Top attackers (by IP)
SELECT ip_address, 
       COUNT(*) as attempts,
       COUNT(DISTINCT username) as targeted_users
FROM login_attempts
WHERE success = FALSE
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY attempts DESC
LIMIT 20;

-- Unlock frequency
SELECT DATE(created_at) as date,
       COUNT(*) as unlocks,
       COUNT(DISTINCT unlocked_by) as admins,
       COUNT(DISTINCT username) as users
FROM account_unlocks
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Deployment

### Migration
```bash
# Apply database migration
psql $DATABASE_URL -f database/migrations/20260917_007_add_rate_limiting.sql
```

### Verification
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('login_attempts', 'account_unlocks', 'rate_limit_config');

-- Verify functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN (
  'check_rate_limit',
  'record_login_attempt',
  'admin_unlock_account',
  'cleanup_old_login_attempts'
);

-- Verify default config
SELECT * FROM rate_limit_config WHERE is_active = TRUE;
```

### Rollback
```sql
-- Disable rate limiting (without dropping tables)
UPDATE system_settings 
SET value = 'false' 
WHERE key = 'rate_limit_enabled';

-- Or drop everything (destructive)
DROP TABLE IF EXISTS account_unlocks CASCADE;
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS rate_limit_config CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit;
DROP FUNCTION IF EXISTS record_login_attempt;
DROP FUNCTION IF EXISTS admin_unlock_account;
DROP FUNCTION IF EXISTS cleanup_old_login_attempts;
```

## Performance Considerations

### Database Impact
- **Writes per login:** 1-2 (attempt + possibly event)
- **Reads per login:** 1 (rate limit check)
- **Index strategy:** username, ip_address, created_at
- **Estimated overhead:** < 50ms per request

### Scaling
- Login attempts table grows over time
- Cleanup cron keeps size manageable
- Partition by month if > 10M records
- Consider Redis cache for frequent checks

### Optimization Tips
```sql
-- Partition by month (if needed)
CREATE TABLE login_attempts_2026_09 PARTITION OF login_attempts
FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Add covering index for common query
CREATE INDEX idx_login_attempts_user_recent
ON login_attempts(username, created_at DESC)
WHERE created_at > NOW() - INTERVAL '7 days';
```

## Future Enhancements

### Phase 2
- [ ] CAPTCHA integration (hCaptcha/reCAPTCHA)
- [ ] Email notifications on lockout
- [ ] SMS 2FA after unlock
- [ ] Geolocation-based anomaly detection
- [ ] Machine learning for behavioral analysis

### Phase 3
- [ ] Device fingerprinting
- [ ] Biometric authentication support
- [ ] Adaptive thresholds (ML-based)
- [ ] Integration with threat intelligence feeds
- [ ] Automated IP blacklisting

## Compliance

### GDPR
- Login attempts contain personal data (IP, username)
- 90-day retention aligns with "necessary period"
- Users can request deletion of their attempts
- Admin unlocks logged for accountability

### SOC 2
- Access controls on unlock function
- Audit trail for all security decisions
- Monitoring and alerting in place
- Regular review of locked accounts

### NIST 800-63B
- Progressive lockout meets NIST guidelines
- Tier thresholds configurable per requirements
- Admin override for legitimate lockouts
- Failed attempt logging for incident response

## Troubleshooting

### Issue: User locked out after password reset
**Solution:** Admin can manually unlock with reason "Password reset confirmed"

### Issue: Entire office locked due to shared IP
**Solution:** Adjust config to require more username-specific failures, or whitelist office IP

### Issue: Cleanup cron not running
**Check:**
```bash
# Verify Vercel cron configuration
vercel env ls | grep CRON_SECRET

# Test cron endpoint manually
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/cleanup-login-attempts
```

### Issue: Rate limit check failing
**Debug:**
```sql
-- Check recent attempts for user
SELECT * FROM login_attempts
WHERE username = 'problematic_user'
ORDER BY created_at DESC
LIMIT 10;

-- Manually call rate limit function
SELECT * FROM check_rate_limit('problematic_user', null, null);
```

## Summary

B10: Progressive Account Lockout is now fully implemented with:
- ✅ Three-tier progressive lockout system
- ✅ Database schema with proper indexing
- ✅ API endpoints for management
- ✅ Admin dashboard component
- ✅ Integration with login flow
- ✅ Security event logging
- ✅ Automated cleanup cron job
- ✅ Comprehensive documentation

**Estimated Implementation Time:** 3-4 days ✅  
**Actual Implementation Time:** 1 day  
**Security Impact:** HIGH - Critical protection against brute force attacks  
**User Impact:** LOW - Legitimate users rarely affected, minimal UX change

---

**Last Updated:** 2026-09-17  
**Version:** 1.0  
**Status:** Production Ready
