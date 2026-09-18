# Migration Fix: RLS Policy Column Reference Error

**Date:** September 17, 2026  
**Issue:** Migrations referenced non-existent `profiles.role` column  
**Resolution:** Updated all RLS policies to use `profiles.is_admin` instead

## Problem

All Part B migrations (004-008) contained Row Level Security (RLS) policies that checked:
```sql
profiles.role IN ('admin', 'super_admin')
```

However, the `profiles` table does not have a `role` column. Instead, it has:
- `is_admin BOOLEAN` - Direct admin flag
- `user_roles` join table - For granular role management

This caused SQL errors when applying the migrations in Supabase.

## Solution

Replaced all occurrences of:
```sql
profiles.role IN ('admin', 'super_admin')
```

With:
```sql
profiles.is_admin = TRUE
```

## Files Modified

1. **database/migrations/20260917_004_add_guardian_recovery.sql**
   - Fixed 3 RLS policies for guardian recovery tables

2. **database/migrations/20260917_005_add_multisig_approvals.sql**
   - Fixed 5 RLS policies for approval workflow tables

3. **database/migrations/20260917_006_add_expiring_access.sql**
   - Fixed 2 RLS policies for time-bound access tables

4. **database/migrations/20260917_007_add_rate_limiting.sql**
   - Fixed 3 RLS policies for rate limiting tables

5. **database/migrations/20260917_008_add_incident_response.sql**
   - Fixed 6 RLS policies for incident response tables

## Database Schema Reference

The actual `profiles` table structure (from `database/schema.sql`):

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    -- ... other fields ...
    is_admin BOOLEAN DEFAULT FALSE,  -- ← Use this for admin checks
    status user_status DEFAULT 'ACTIVE',
    -- ... more fields ...
);
```

Role management is handled via separate tables:
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name role_name UNIQUE NOT NULL,
    -- ...
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id),
    role_id UUID REFERENCES roles(id),
    -- ...
);
```

## Testing

After applying these fixes, all migrations should run successfully in Supabase. To apply them:

```bash
# Apply migrations in order
psql -U postgres -d bel_secure_platform -f database/migrations/20260917_004_add_guardian_recovery.sql
psql -U postgres -d bel_secure_platform -f database/migrations/20260917_005_add_multisig_approvals.sql
psql -U postgres -d bel_secure_platform -f database/migrations/20260917_006_add_expiring_access.sql
psql -U postgres -d bel_secure_platform -f database/migrations/20260917_007_add_rate_limiting.sql
psql -U postgres -d bel_secure_platform -f database/migrations/20260917_008_add_incident_response.sql
```

## Future Considerations

For more granular role-based access control beyond simple admin checks, RLS policies can query the `user_roles` table:

```sql
-- Example: Check if user has specific role
EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.profile_id = (auth.jwt() ->> 'sub')::UUID
    AND ur.is_active = TRUE
    AND r.name = 'ADMIN'
)
```

This approach allows for more flexible permission systems in the future.

## Related Documentation

- Main implementation summary: `docs/PART_B_IMPLEMENTATION_SUMMARY.md`
- Database schema: `database/schema.sql`
- Individual feature docs: `docs/B*_*.md`
