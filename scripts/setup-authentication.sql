-- Complete Authentication Setup Script
-- Run this ONE script in Supabase SQL Editor to set up everything

-- ============================================
-- PART 1: CLEANUP (Remove duplicates)
-- ============================================

-- Drop all existing versions to avoid conflicts
DROP FUNCTION IF EXISTS hash_password(TEXT);
DROP FUNCTION IF EXISTS hash_password(VARCHAR);
DROP FUNCTION IF EXISTS verify_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS verify_password(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS verify_password(UUID, TEXT);
DROP FUNCTION IF EXISTS verify_password(UUID, VARCHAR);

-- ============================================
-- PART 2: ENABLE EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 3: CREATE PASSWORD FUNCTIONS
-- ============================================

-- Function to hash passwords
CREATE FUNCTION hash_password(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf'));
END;
$$;

-- Function to verify passwords
CREATE FUNCTION verify_password(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  SELECT password_hash INTO v_password_hash
  FROM profiles
  WHERE username = p_username
  LIMIT 1;
  
  IF v_password_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN crypt(p_password, v_password_hash) = v_password_hash;
END;
$$;

-- ============================================
-- PART 4: GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION hash_password(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO authenticated, service_role, anon;

-- ============================================
-- PART 5: POPULATE ROLES TABLE
-- ============================================

-- Ensure roles table exists and has canonical roles
INSERT INTO roles (name, description, is_system_role, permissions)
VALUES 
  ('ADMIN', 'Full system administrator access', true, 
   '["system:admin", "identity:manage", "role:assign", "asset:crud", "audit:read"]'::jsonb),
  ('VIEWER', 'Read-only access within department', true, 
   '["asset:view_department", "profile:view_own", "document:view_department"]'::jsonb),
  ('ALTER', 'View and minor edits within department', true, 
   '["asset:view_department", "asset:edit_minor", "document:upload", "profile:manage"]'::jsonb),
  ('DEBUGGER', 'Cross-department access and security investigations', true, 
   '["asset:view_all", "classified:view", "security:view", "audit:view_all"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- ============================================
-- PART 6: CREATE TEST ADMIN USER
-- ============================================

-- Delete existing test admin if exists
DELETE FROM user_roles WHERE profile_id IN (SELECT id FROM profiles WHERE username = 'admin');
DELETE FROM profiles WHERE username = 'admin';

-- Create test admin profile
INSERT INTO profiles (
  username,
  password_hash,
  email,
  full_name,
  display_name,
  department,
  wallet_address,
  is_admin,
  status,
  access_code,
  clearance,
  nft_token_id,
  nft_tx_hash,
  photo_hash,
  criminal_check_status,
  criminal_check_timestamp
) VALUES (
  'admin',                                   -- username
  crypt('admin123', gen_salt('bf')),        -- password: admin123
  'admin@bel.gov',                          -- email
  'System Administrator',                   -- full_name
  'Admin',                                  -- display_name
  'Administration',                         -- department
  '0x0000000000000000000000000000000000000000', -- wallet_address
  true,                                     -- is_admin
  'ACTIVE',                                 -- status
  '000000',                                 -- access_code
  'TOP SECRET',                             -- clearance
  '#0001',                                  -- nft_token_id
  '0x0000000000000000000000000000000000000000000000000000000000000001', -- nft_tx_hash
  '0x0000000000000000000000000000000000000000000000000000000000000001', -- photo_hash
  'CLEARED',                                -- criminal_check_status
  NOW()                                     -- criminal_check_timestamp
);

-- Assign ADMIN role
INSERT INTO user_roles (
  profile_id,
  role_id,
  is_active
)
SELECT 
  p.id,
  r.id,
  true
FROM profiles p
CROSS JOIN roles r
WHERE p.username = 'admin'
  AND r.name = 'ADMIN';

-- ============================================
-- PART 7: VERIFICATION
-- ============================================

-- Test password verification
DO $$
DECLARE
  v_password_valid BOOLEAN;
BEGIN
  SELECT verify_password('admin', 'admin123') INTO v_password_valid;
  
  IF v_password_valid THEN
    RAISE NOTICE '✅ Password verification: SUCCESS';
  ELSE
    RAISE EXCEPTION '❌ Password verification: FAILED';
  END IF;
END $$;

-- Display results
SELECT 
  '=== ✅ SETUP COMPLETE ===' as status,
  '' as blank1,
  '📋 TEST CREDENTIALS:' as credentials_header,
  '   Operator ID: admin' as username,
  '   Password: admin123' as password,
  '   Wallet: 0x0000000000000000000000000000000000000000' as wallet,
  '' as blank2,
  '⚠️  FOR TESTING ONLY' as warning,
  '🗑️  Delete before production!' as warning2;

-- Show created functions
SELECT 
  '📦 Functions created:' as functions_header,
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('hash_password', 'verify_password')
ORDER BY proname;

-- Show roles
SELECT 
  '👥 Roles populated:' as roles_header,
  name,
  description,
  jsonb_array_length(permissions) as permission_count
FROM roles
ORDER BY name;

-- Show admin user
SELECT 
  '👤 Admin user:' as user_header,
  username,
  email,
  is_admin,
  status,
  CASE 
    WHEN LENGTH(password_hash) > 20 THEN '✅ Hashed'
    ELSE '❌ Not hashed'
  END as password_status
FROM profiles
WHERE username = 'admin';

-- Show role assignment
SELECT 
  '🔐 Role assignment:' as role_header,
  p.username,
  r.name as role,
  ur.is_active
FROM profiles p
JOIN user_roles ur ON ur.profile_id = p.id
JOIN roles r ON r.id = ur.role_id
WHERE p.username = 'admin';
