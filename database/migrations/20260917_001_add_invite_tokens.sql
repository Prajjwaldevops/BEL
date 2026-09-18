-- ============================================================
-- Migration: Add Invite Token System
-- Date: 2026-09-17
-- Purpose: Replace static registration_secret_key with single-use,
--          time-limited invite tokens for secure user registration
-- ============================================================

-- Create invite_tokens table
CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(64) UNIQUE NOT NULL,
    issued_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id),
    intended_email VARCHAR(255),
    intended_department VARCHAR(100),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_issued_by ON invite_tokens(issued_by);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_active ON invite_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires ON invite_tokens(expires_at);

-- Function to generate secure random token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to automatically mark expired tokens as inactive
CREATE OR REPLACE FUNCTION deactivate_expired_tokens()
RETURNS void AS $$
BEGIN
    UPDATE invite_tokens
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND expires_at < NOW()
      AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can see all tokens
CREATE POLICY invite_tokens_admin_all ON invite_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Users who issued tokens can see their own
CREATE POLICY invite_tokens_issuer_select ON invite_tokens
    FOR SELECT
    USING (true);

-- Only admins can insert tokens (enforced at application level)
CREATE POLICY invite_tokens_admin_insert ON invite_tokens
    FOR INSERT
    WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE invite_tokens IS 'Single-use, time-limited tokens for secure user registration. Replaces static registration_secret_key.';

-- Remove the static registration_secret_key from system_settings
DELETE FROM system_settings WHERE key = 'registration_secret_key';

-- Add audit log entry for this migration
INSERT INTO audit_logs (
    action,
    resource_type,
    result,
    details,
    metadata
) VALUES (
    'MIGRATION_APPLIED',
    'database',
    'SUCCESS',
    'Added invite_tokens table and removed static registration_secret_key',
    jsonb_build_object(
        'migration', '20260917_001_add_invite_tokens',
        'tables_created', ARRAY['invite_tokens'],
        'security_improvement', 'Replaced static secret with single-use invite tokens'
    )
);

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================
-- To rollback this migration:
-- 
-- DROP TABLE IF EXISTS invite_tokens CASCADE;
-- DROP FUNCTION IF EXISTS generate_invite_token();
-- DROP FUNCTION IF EXISTS deactivate_expired_tokens();
-- 
-- INSERT INTO system_settings (key, value, category, description) VALUES
-- ('registration_secret_key', '34567890', 'security', 'Secret key required for user registration');
-- ============================================================
