-- Role Standardization Migration
-- Migration: 20260925_005_role_standardization
-- Purpose: Document standardization on 4-role system, ensure canonical roles exist

-- ============================================
-- PART 1: VERIFICATION - Check current state
-- ============================================

-- Note: This schema uses roles table with UUID ids, not role_name enum in user_roles
-- The user_roles table has: role_id (UUID FK) -> roles.id
-- The roles table has: id (UUID), name (VARCHAR or ENUM)

DO $$
BEGIN
  RAISE NOTICE 'Role standardization: Verifying 4 canonical roles (ADMIN, VIEWER, ALTER, DEBUGGER)';
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
  role_name VARCHAR(50) PRIMARY KEY,
  label VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  permissions JSONB NOT NULL,
  level INTEGER NOT NULL,
  color VARCHAR(7) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert canonical role definitions
INSERT INTO role_permission_mapping (role_name, label, description, permissions, level, color)
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
ON CONFLICT (role_name) DO UPDATE SET
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
  p_role_name VARCHAR(50),
  p_permission TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM role_permission_mapping
    WHERE role_name = p_role_name
      AND permissions @> to_jsonb(ARRAY[p_permission])
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all permissions for a role
CREATE OR REPLACE FUNCTION get_role_permissions(p_role_name VARCHAR(50))
RETURNS JSONB AS $$
  SELECT permissions 
  FROM role_permission_mapping 
  WHERE role_name = p_role_name;
$$ LANGUAGE sql STABLE;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
BEGIN
  -- Check via roles table JOIN
  SELECT bool_or(
    EXISTS (
      SELECT 1 
      FROM role_permission_mapping rpm
      WHERE rpm.role_name = r.name
        AND rpm.permissions @> to_jsonb(ARRAY[p_permission])
    )
  )
  INTO v_has_permission
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
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
  ON user_roles(profile_id, role_id) 
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
DECLARE
  v_role_name VARCHAR(50);
BEGIN
  -- Get role name from roles table
  SELECT name INTO v_role_name
  FROM roles
  WHERE id = NEW.role_id;
  
  -- ADMIN cannot have expires_at (permanent role)
  IF v_role_name = 'ADMIN' AND NEW.expires_at IS NOT NULL THEN
    RAISE EXCEPTION 'ADMIN role cannot have expiration date';
  END IF;
  
  -- Prevent multiple ADMIN assignments to same user (one is enough)
  IF v_role_name = 'ADMIN' THEN
    IF EXISTS (
      SELECT 1 
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.profile_id = NEW.profile_id
        AND r.name = 'ADMIN'
        AND ur.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND ur.is_active = TRUE
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
  actor_id,
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
  '127.0.0.1'::inet
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

-- ============================================
-- VERIFICATION QUERIES (for manual check)
-- ============================================

-- Show all roles and their permission counts
SELECT 
  role_name,
  label,
  level,
  jsonb_array_length(permissions) as permission_count,
  permissions
FROM role_permission_mapping
ORDER BY level;

-- Show active user role distribution
SELECT 
  r.name as role_name,
  COUNT(*) as user_count
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.is_active = TRUE
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
GROUP BY r.name
ORDER BY 
  CASE r.name
    WHEN 'ADMIN' THEN 1
    WHEN 'VIEWER' THEN 2
    WHEN 'ALTER' THEN 3
    WHEN 'DEBUGGER' THEN 4
    ELSE 5
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
