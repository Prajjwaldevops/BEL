-- Create Test Admin User for BEL Secure Platform
-- Run this in Supabase SQL Editor to create a test admin account

-- Enable pgcrypto if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  role_name,
  is_active
)
SELECT 
  id,
  'ADMIN',
  true
FROM profiles
WHERE username = 'admin';

-- Display test credentials
SELECT 
  '=== TEST ADMIN CREDENTIALS ===' as info,
  'Username: admin' as username,
  'Password: admin123' as password,
  'Wallet: 0x0000000000000000000000000000000000000000' as wallet,
  '⚠️  FOR TESTING ONLY - DELETE IN PRODUCTION' as warning;
