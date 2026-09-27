-- Migration: Fix Password Hash and Verify Functions
-- Created: 2026-09-25
-- Purpose: Ensure hash_password and verify_password RPC functions exist

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to hash a password using bcrypt
-- This is called during user registration
CREATE OR REPLACE FUNCTION hash_password(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use bcrypt (blowfish) algorithm with default work factor (10)
  RETURN crypt(p_password, gen_salt('bf'));
END;
$$;

-- Function to verify a password against its hash
-- This is called during login authentication
CREATE OR REPLACE FUNCTION verify_password(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  -- Get the stored password hash for the username
  SELECT password_hash INTO v_password_hash
  FROM profiles
  WHERE username = p_username
  LIMIT 1;
  
  -- If no user found, return false
  IF v_password_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify the password using crypt()
  -- crypt(password, hash) = hash if password matches
  RETURN crypt(p_password, v_password_hash) = v_password_hash;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION hash_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION hash_password(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION hash_password IS 'Hash a plain text password using bcrypt (bf algorithm with gen_salt)';
COMMENT ON FUNCTION verify_password IS 'Verify a password against stored hash for authentication';
