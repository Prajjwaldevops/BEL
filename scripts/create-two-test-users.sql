-- Create Two Test Users: admin and sih
-- Run this in Supabase SQL Editor

-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure roles exist
INSERT INTO roles (name, description, is_system_role, permissions)
VALUES 
  ('ADMIN', 'Full system administrator', true, '["system:admin"]'::jsonb),
  ('VIEWER', 'Read-only access', true, '["asset:view_department"]'::jsonb),
  ('ALTER', 'Edit access', true, '["asset:edit_minor"]'::jsonb),
  ('DEBUGGER', 'Debug access', true, '["security:view"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Delete existing test users
DELETE FROM user_roles WHERE profile_id IN (
  SELECT id FROM profiles WHERE username IN ('admin', 'sih')
);
DELETE FROM profiles WHERE username IN ('admin', 'sih');

-- Create USER 1: admin / admin123
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
  clearance
) VALUES (
  'admin',
  crypt('admin123', gen_salt('bf')),
  'admin@bel.gov',
  'System Administrator',
  'Admin',
  'Administration',
  '0x0000000000000000000000000000000000000000',
  true,
  'ACTIVE',
  '000000',
  'TOP SECRET'
);

-- Create USER 2: sih / sih123
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
  clearance
) VALUES (
  'sih',
  crypt('sih123', gen_salt('bf')),
  'sih@bel.gov',
  'SIH Operator',
  'SIH',
  'Operations',
  '0x1111111111111111111111111111111111111111',
  false,
  'ACTIVE',
  '111111',
  'CONFIDENTIAL'
);

-- Assign ADMIN role to admin
INSERT INTO user_roles (profile_id, role_id, is_active)
SELECT p.id, r.id, true
FROM profiles p
CROSS JOIN roles r
WHERE p.username = 'admin' AND r.name = 'ADMIN';

-- Assign VIEWER role to sih  
INSERT INTO user_roles (profile_id, role_id, is_active)
SELECT p.id, r.id, true
FROM profiles p
CROSS JOIN roles r
WHERE p.username = 'sih' AND r.name = 'VIEWER';

-- Verify creation
SELECT 
  '=== TEST USERS CREATED ===' as status,
  '' as blank1,
  '👤 USER 1 (ADMIN):' as user1_header,
  '   Username: admin' as user1_username,
  '   Password: admin123' as user1_password,
  '   Wallet: 0x0000000000000000000000000000000000000000' as user1_wallet,
  '' as blank2,
  '👤 USER 2 (VIEWER):' as user2_header,
  '   Username: sih' as user2_username,
  '   Password: sih123' as user2_password,
  '   Wallet: 0x1111111111111111111111111111111111111111' as user2_wallet,
  '' as blank3,
  '⚠️  FOR TESTING ONLY' as warning;

-- Show users with roles
SELECT 
  p.username,
  p.email,
  p.wallet_address,
  r.name as role,
  p.is_admin,
  CASE WHEN LENGTH(p.password_hash) > 20 THEN '✅ Hashed' ELSE '❌ Missing' END as password_status
FROM profiles p
LEFT JOIN user_roles ur ON ur.profile_id = p.id AND ur.is_active = true
LEFT JOIN roles r ON r.id = ur.role_id
WHERE p.username IN ('admin', 'sih')
ORDER BY p.username;
