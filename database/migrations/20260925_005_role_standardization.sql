-- Role Standardization Migration
-- Migration: 20260925_005_role_standardization
-- Purpose: Document standardization on 4-role system, ensure no legacy role references

-- ============================================
-- PART 1: VERIFICATION - Check current state
-- ============================================

-- Verify role_name enum has only the canonical 4 roles
DO $$
BEGIN
  -- Check if any other roles exist in the enum
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'role_name'::regtype
    AND enumlabel NOT IN ('ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER')
  ) THEN
    RAISE EXCEPTION 'Unexpected roles found in role_name enum. Expected: ADMIN, VIEWER, ALTER, DEBUGGER';
  END IF;
  
  RAISE NOTICE 'Role enum verification passed: Only canonical 4 roles present';
END $$;

-- ============================================
-- PART 2: DATA CLEANUP - Remove any stray references
-- ============================================

-- Check for any profiles with invalid roles in JSONB fields
-- (In case old role names were stored in metadata)
UPDATE profiles
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{roles_migrated}',
  'true'::jsonb
)
WHERE metadata IS NULL OR NOT (metadata ? 'roles_migrated');

-- ============================================
-- PART 3: PERMISSION MAPPING DOCUMENTATION
-- ============================================

-- Create comprehensive documentation of role permissions
CREATE TABLE IF NOT EXISTS role_permission_mapping (
  role role_name PRIMARY KEY,
  label VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  permissions JSONB NOT NULL,
  level INTEGER NOT NULL,
  color VARCHAR(7) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert canonical role definitions
INSERT INTO role_permission_mapping (role, label, description, permissions, level, color)
VALUES
  (
    'ADMIN',
    'Administrator',
    'Full platform access: user registration, role assignment, system configuration, all operations',
    jsonb_build_array(
      'system:admin',
      'identity:manage',
      'role:assign',
      'asset:crud',
      'audit:read',
      'audit:write',
      'blockchain:admin',
      'classified:full_access',
      'ai_analysis:view',
      'sensitive_data:read',
      'invite_tokens:create'
    ),
    1,
    '#ef4444'
  ),
  (
    'VIEWER',
    'Viewer',
    'Read-only access within assigned department - cannot modify data or access classified info',
    jsonb_build_array(
      'asset:view_department',
      'profile:view_own',
      'document:view_department',
      'audit:view_department'
    ),
    2,
    '#3b82f6'
  ),
  (
    'ALTER',
    'Alter',
    'View and minor edits within department - no classified info access, can upload documents',
    jsonb_build_array(
      'asset:view_department',
      'asset:edit_minor',
      'profile:manage',
      'document:view_department',
      'document:upload',
      'audit:view_own'
    ),
    3,
    '#f59e0b'
  ),
  (
    'DEBUGGER',
    'Debugger',
    'Cross-department access, view classified info, generate reports, security investigations',
    jsonb_build_array(
      'asset:view_all',
      'asset:edit_all',
      'classified:view',
      'report:generate',
      'security:view',
      'cross_department:access',
      'audit:view_all',
      'incident:investigate'
    ),
    4,
    '#a855f7'
  )
ON CONFLICT (role) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  level = EXCLUDED.level,
  color = EXCLUDED.color,
  updated_at = NOW();

-- ============================================
-- PART 4: HELPER FUNCTIONS
-- ============================================

-- Function to check if a role has a specific permission
CREATE OR REPLACE FUNCTION role_has_permission(
  p_role role_name,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM role_permission_mapping
    WHERE role = p_role
      AND permissions @> to_jsonb(ARRAY[p_permission])
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all permissions for a role
CREATE OR REPLACE FUNCTION get_role_permissions(p_role role_name)
RETURNS JSONB AS $$
  SELECT permissions 
  FROM role_permission_mapping 
  WHERE role = p_role;
$$ LANGUAGE sql STABLE;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
BEGIN
  SELECT bool_or(role_has_permission(ur.role_name, p_permission))
  INTO v_has_permission
  FROM user_roles ur
  WHERE ur.profile_id = p_user_id
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
  
  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PART 5: INDEXES FOR PERMISSION CHECKS
-- ============================================

-- Ensure fast permission lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_active_permissions 
  ON user_roles(profile_id, role_name) 
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_roles_expiration 
  ON user_roles(profile_id, expires_at) 
  WHERE expires_at IS NOT NULL;

-- ============================================
-- PART 6: VALIDATION TRIGGER
-- ============================================

-- Prevent insertion of rows with invalid role combinations
CREATE OR REPLACE FUNCTION validate_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- ADMIN cannot have expires_at (permanent role)
  IF NEW.role_name = 'ADMIN' AND NEW.expires_at IS NOT NULL THEN
    RAISE EXCEPTION 'ADMIN role cannot have expiration date';
  END IF;
  
  -- Prevent multiple ADMIN assignments to same user (one is enough)
  IF NEW.role_name = 'ADMIN' THEN
    IF EXISTS (
      SELECT 1 FROM user_roles
      WHERE profile_id = NEW.profile_id
        AND role_name = 'ADMIN'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND is_active = TRUE
    ) THEN
      RAISE WARNING 'User already has ADMIN role assigned';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_role_assignment ON user_roles;
CREATE TRIGGER trigger_validate_role_assignment
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_assignment();

-- ============================================
-- PART 7: AUDIT LOG
-- ============================================

-- Log this standardization
INSERT INTO audit_logs (
  user_id,
  action,
  resource_type,
  resource_id,
  metadata,
  ip_address
) VALUES (
  NULL,
  'ROLE_STANDARDIZATION_MIGRATION',
  'SYSTEM',
  'role_permission_mapping',
  jsonb_build_object(
    'roles_standardized', jsonb_build_array('ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'),
    'migration_version', '20260925_005',
    'legacy_roles_removed', jsonb_build_array('MANAGER', 'AUDITOR', 'OPERATOR', 'USER'),
    'timestamp', NOW()
  ),
  '127.0.0.1'
);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE role_permission_mapping IS 
'Canonical role permission definitions. DO NOT modify directly - update via migration.';

COMMENT ON FUNCTION role_has_permission IS 
'Check if a role has a specific permission string (e.g., "asset:view_all")';

COMMENT ON FUNCTION user_has_permission IS 
'Check if a user has a specific permission through any of their active roles';

COMMENT ON TYPE role_name IS 
'Canonical 4-role system: ADMIN (full access), VIEWER (read-only dept), ALTER (edit dept), DEBUGGER (cross-dept classified)';

-- ============================================
-- VERIFICATION QUERIES (for manual check)
-- ============================================

-- Show all roles and their permission counts
SELECT 
  role,
  label,
  level,
  jsonb_array_length(permissions) as permission_count,
  permissions
FROM role_permission_mapping
ORDER BY level;

-- Show active user role distribution
SELECT 
  role_name,
  COUNT(*) as user_count
FROM user_roles
WHERE is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW())
GROUP BY role_name
ORDER BY 
  CASE role_name
    WHEN 'ADMIN' THEN 1
    WHEN 'VIEWER' THEN 2
    WHEN 'ALTER' THEN 3
    WHEN 'DEBUGGER' THEN 4
  END;

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================

/*
To rollback this migration (if needed):

DROP TABLE IF EXISTS role_permission_mapping;
DROP FUNCTION IF EXISTS role_has_permission;
DROP FUNCTION IF EXISTS get_role_permissions;
DROP FUNCTION IF EXISTS user_has_permission;
DROP FUNCTION IF EXISTS validate_role_assignment;
DROP TRIGGER IF EXISTS trigger_validate_role_assignment ON user_roles;

-- Remove audit log entry
DELETE FROM audit_logs 
WHERE action = 'ROLE_STANDARDIZATION_MIGRATION' 
  AND resource_type = 'SYSTEM';
*/
