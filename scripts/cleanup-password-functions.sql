-- Cleanup Script: Remove duplicate password functions
-- Run this FIRST if you get "function name is not unique" error

-- Drop all versions of hash_password
DROP FUNCTION IF EXISTS hash_password(TEXT);
DROP FUNCTION IF EXISTS hash_password(VARCHAR);

-- Drop all versions of verify_password
DROP FUNCTION IF EXISTS verify_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS verify_password(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS verify_password(UUID, TEXT);
DROP FUNCTION IF EXISTS verify_password(UUID, VARCHAR);

-- Confirm cleanup
SELECT 'All password functions dropped. Now run the migration.' as status;
