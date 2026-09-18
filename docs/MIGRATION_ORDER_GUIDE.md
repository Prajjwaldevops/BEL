# Database Migration Order Guide

**Important:** Migrations must be applied in the correct order due to dependencies between tables.

## Migration Order

### Apply in this exact sequence:

1. **20260917_004_add_guardian_recovery.sql**
   - Creates: `recovery_guardians`, `recovery_requests`, `guardian_approvals`, `recovery_executions`
   - Dependencies: Requires `profiles` table (from base schema)

2. **20260917_005_add_multisig_approvals.sql**
   - Creates: `pending_approvals`, `approval_votes`, `approval_executions`, `multisig_config`
   - Dependencies: Requires `profiles` table

3. **20260917_006_add_expiring_access.sql**
   - Creates: `access_grant_history`, `access_delegations`
   - Modifies: Adds `expires_at` columns to existing tables
   - Dependencies: Requires `profiles`, `user_roles`, `asset_permissions` tables

4. **20260917_007_add_rate_limiting.sql**
   - Creates: `login_attempts`, `account_unlocks`, `rate_limit_config`
   - Dependencies: Requires `profiles` table

5. **20260917_008_add_incident_response.sql**
   - Creates: `security_incidents`, `incident_events`, `incident_responses`, `incident_notes`, `incident_playbooks`
   - Dependencies: Requires `profiles`, `security_events` tables

6. **20260917_009_add_gas_tracking.sql**
   - Creates: `gas_price_snapshots`, `transaction_gas_costs`, `gas_estimates`, `gas_optimization_recommendations`, `gas_cost_budgets`
   - Dependencies: Requires `profiles` table

7. **20260917_010_add_security_posture.sql** ⚠️
   - Creates: `security_posture_metrics`, `security_risks`, `compliance_requirements`, `security_controls`, `security_assessments`, `security_alerts`
   - Dependencies: Optionally references `security_incidents` (from migration 008)
   - **Note:** Can be applied before or after 008, but some features work better after 008

8. **20260917_011_add_verifiable_credentials.sql**
   - Creates: `credential_schemas`, `verifiable_credentials`, `credential_presentations`, `credential_verifications`, `trusted_issuers`, `credential_requests`
   - Dependencies: Requires `profiles` table

9. **20260917_012_add_incident_fk_to_alerts.sql** (Optional)
   - Adds foreign key constraint from `security_alerts` to `security_incidents`
   - Dependencies: Requires both migrations 008 AND 010 to be applied first
   - **Only apply if both 008 and 010 are applied**

## Quick Apply (PostgreSQL/Supabase)

```bash
# Option 1: Apply all migrations in order
psql -U postgres -d your_database \
  -f database/migrations/20260917_004_add_guardian_recovery.sql \
  -f database/migrations/20260917_005_add_multisig_approvals.sql \
  -f database/migrations/20260917_006_add_expiring_access.sql \
  -f database/migrations/20260917_007_add_rate_limiting.sql \
  -f database/migrations/20260917_008_add_incident_response.sql \
  -f database/migrations/20260917_009_add_gas_tracking.sql \
  -f database/migrations/20260917_010_add_security_posture.sql \
  -f database/migrations/20260917_011_add_verifiable_credentials.sql \
  -f database/migrations/20260917_012_add_incident_fk_to_alerts.sql
```

```bash
# Option 2: Apply one at a time
psql -U postgres -d your_database -f database/migrations/20260917_004_add_guardian_recovery.sql
psql -U postgres -d your_database -f database/migrations/20260917_005_add_multisig_approvals.sql
# ... and so on
```

## Supabase SQL Editor

If using Supabase dashboard:

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the content of each migration file
3. Execute them **one at a time** in the order listed above
4. Wait for each to complete successfully before proceeding to the next

## Verification

After applying each migration, verify it succeeded:

```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'recovery_%' OR table_name LIKE 'security_%' OR table_name LIKE 'gas_%'
ORDER BY table_name;

-- Check if functions were created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Check for any errors in the last migration
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

## Rollback (If Needed)

Each migration creates tables and functions. To rollback, drop the objects in reverse order:

```sql
-- Example: Rollback migration 010
DROP TABLE IF EXISTS security_alerts CASCADE;
DROP TABLE IF EXISTS security_assessments CASCADE;
DROP TABLE IF EXISTS security_controls CASCADE;
DROP TABLE IF EXISTS compliance_requirements CASCADE;
DROP TABLE IF EXISTS security_risks CASCADE;
DROP TABLE IF EXISTS security_posture_metrics CASCADE;
DROP FUNCTION IF EXISTS calculate_security_score CASCADE;
DROP FUNCTION IF EXISTS update_security_posture_metrics CASCADE;
DROP FUNCTION IF EXISTS create_security_alert CASCADE;
```

## Common Errors & Solutions

### Error: relation "security_incidents" does not exist

**Cause:** Migration 010 applied before migration 008

**Solution:** 
- Migration 010 is now designed to work independently
- For full functionality, apply migration 008 first, then 010, then 012

### Error: relation "profiles" does not exist

**Cause:** Base schema not applied

**Solution:** Apply the base schema first (`database/schema.sql`)

### Error: column "is_admin" does not exist

**Cause:** Using old profiles table structure

**Solution:** This was fixed in all migrations. Re-apply the migrations with the fixed versions.

### Error: duplicate key value violates unique constraint

**Cause:** Migration already applied or data conflicts

**Solution:** Check if migration was already applied:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'your_table_name';
```

## Migration Status Tracking

You can create a simple tracking table:

```sql
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'SUCCESS'
);

-- After applying each migration, record it
INSERT INTO migration_history (migration_name, applied_by) 
VALUES ('20260917_004_add_guardian_recovery', 'admin');
```

## Production Deployment Checklist

- [ ] Backup database before applying migrations
- [ ] Test migrations in staging environment first
- [ ] Apply migrations during maintenance window
- [ ] Monitor for errors after each migration
- [ ] Verify all tables, functions, and indexes created
- [ ] Test API endpoints after migrations
- [ ] Run application smoke tests
- [ ] Monitor application logs for database errors
- [ ] Document any issues encountered

## Support

If you encounter issues:
1. Check the error message in Supabase logs
2. Verify prerequisites are met
3. Review the migration file for the specific error line
4. Check `docs/MIGRATION_FIX_20260917.md` for known issues
5. Review `docs/BUILD_ERRORS_AND_FIXES.md` for application errors

## Related Documentation

- Base Schema: `database/schema.sql`
- Migration Fixes: `docs/MIGRATION_FIX_20260917.md`
- Feature Docs: `docs/B*_*.md`
- Final Summary: `docs/PART_B_FINAL_SUMMARY.md`
