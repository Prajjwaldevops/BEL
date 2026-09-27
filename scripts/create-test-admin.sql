-- Create Test Admin User for BEL Secure Platform
-- Run this in Supabase SQL Editor to create a test admin account

-- Enable pgcrypto if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure roles table has the canonical 4 roles
INSERT INTO roles (name, description, is_system_role, permissions)
VALUES 
  ('ADMIN', 'Full system administrator access', true, '["system:admin", "identity:manage", "role:assign"]'::jsonb),
  ('VIEWER', 'Read-only access within department', true, '["asset:view_department", "profile:view_own"]'::jsonb),
  ('ALTER', 'View and minor edits within department', true, '["asset:view_department", "asset:edit_minor", "document:upload"]'::jsonb),
  ('DEBUGGER', 'Cross-department access and security investigations', true, '["asset:view_all", "classified:view", "security:view"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Delete existing test admin if exists
DELETE FROM profiles WHERE username = 'admin';

-- Insert test admin user
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
  'admin',                                    -- username (Operator ID)
  crypt('admin123', gen_salt('bf')),         -- password: admin123
  'admin@bel.gov',                           -- email
  'System Administrator',                    -- full_name
  'Admin',                                   -- display_name
  'Administration',                          -- department
  '0x0000000000000000000000000000000000000000', -- wallet_address (dummy for testing)
  true,                                      -- is_admin
  'ACTIVE',                                  -- status
  '000000',                                  -- access_code
  'TOP SECRET',                              -- clearance
  '#0001',                                   -- nft_token_id
  '0x0000000000000000000000000000000000000000000000000000000000000001', -- nft_tx_hash
  '0x0000000000000000000000000000000000000000000000000000000000000001', -- photo_hash
  'CLEARED',                                 -- criminal_check_status
  NOW()                                      -- criminal_check_timestamp
) RETURNING id, username, email;

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
  AND r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Display test credentials
SELECT 
  '=== TEST ADMIN CREDENTIALS ===' as info,
  'Username: admin' as username,
  'Password: admin123' as password,
  'Wallet: 0x0000000000000000000000000000000000000000' as wallet,
  '⚠️  FOR TESTING ONLY - DELETE IN PRODUCTION' as warning;
