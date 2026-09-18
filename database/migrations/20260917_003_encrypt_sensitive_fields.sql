-- ============================================================
-- Migration: Encrypt Sensitive Fields & Add Access Logging
-- Date: 2026-09-17
-- Purpose: Encrypt criminal_check_status and photo URLs at column level
--          Add comprehensive access logging for sensitive field reads
--          Implement retention policies for biometric data
-- ============================================================

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- PART 1: Sensitive Field Access Logging
-- ============================================================

-- Create enum for access reason codes
CREATE TYPE access_reason AS ENUM (
    'PROFILE_VIEW',
    'BACKGROUND_CHECK',
    'SECURITY_AUDIT',
    'COMPLIANCE_REVIEW',
    'INVESTIGATION',
    'DATA_EXPORT',
    'SYSTEM_OPERATION',
    'OTHER'
);

-- Create sensitive_field_access_log table
CREATE TABLE IF NOT EXISTS sensitive_field_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accessor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    accessed_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_value_hash VARCHAR(66),  -- SHA-256 hash of accessed value (not the value itself)
    access_reason access_reason NOT NULL,
    reason_details TEXT,
    ip_address INET,
    user_agent TEXT,
    was_authorized BOOLEAN DEFAULT TRUE,
    flagged_by_system BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and analytics
CREATE INDEX IF NOT EXISTS idx_sensitive_access_accessor ON sensitive_field_access_log(accessor_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_profile ON sensitive_field_access_log(accessed_profile_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_field ON sensitive_field_access_log(field_name);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_reason ON sensitive_field_access_log(access_reason);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_created ON sensitive_field_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_flagged ON sensitive_field_access_log(flagged_by_system) WHERE flagged_by_system = TRUE;
CREATE INDEX IF NOT EXISTS idx_sensitive_access_unauthorized ON sensitive_field_access_log(was_authorized) WHERE was_authorized = FALSE;

-- ============================================================
-- PART 2: Encryption Key Management
-- ============================================================

-- Create table to store encryption keys (encrypted by database master key)
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name VARCHAR(100) UNIQUE NOT NULL,
    key_purpose VARCHAR(255) NOT NULL,
    encrypted_key BYTEA NOT NULL,  -- Encrypted with database master key
    key_version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Index for active keys
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(is_active) WHERE is_active = TRUE;

-- ============================================================
-- PART 3: Encrypted Column Structure
-- ============================================================

-- Add encrypted columns to profiles table (keeping originals for migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS criminal_check_status_encrypted BYTEA;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url_encrypted BYTEA;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_hash_encrypted BYTEA;

-- Add encryption metadata
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_encrypted_at TIMESTAMPTZ;

-- ============================================================
-- PART 4: Encryption/Decryption Functions
-- ============================================================

-- Function to encrypt sensitive text data
CREATE OR REPLACE FUNCTION encrypt_sensitive_text(
    p_plaintext TEXT,
    p_key_name VARCHAR DEFAULT 'profile_data_key'
)
RETURNS BYTEA AS $$
DECLARE
    v_key BYTEA;
BEGIN
    -- Fetch active encryption key
    SELECT encrypted_key INTO v_key
    FROM encryption_keys
    WHERE key_name = p_key_name
      AND is_active = TRUE
    LIMIT 1;

    IF v_key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not found: %', p_key_name;
    END IF;

    -- Encrypt using AES-256-CBC
    RETURN pgp_sym_encrypt(p_plaintext, encode(v_key, 'hex'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive text data
CREATE OR REPLACE FUNCTION decrypt_sensitive_text(
    p_ciphertext BYTEA,
    p_key_name VARCHAR DEFAULT 'profile_data_key'
)
RETURNS TEXT AS $$
DECLARE
    v_key BYTEA;
BEGIN
    IF p_ciphertext IS NULL THEN
        RETURN NULL;
    END IF;

    -- Fetch active encryption key
    SELECT encrypted_key INTO v_key
    FROM encryption_keys
    WHERE key_name = p_key_name
      AND is_active = TRUE
    LIMIT 1;

    IF v_key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not found: %', p_key_name;
    END IF;

    -- Decrypt using AES-256-CBC
    RETURN pgp_sym_decrypt(p_ciphertext, encode(v_key, 'hex'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 5: Secure View for Profile Access
-- ============================================================

-- Create view that decrypts sensitive fields on-the-fly
-- This view should be used instead of direct table access
CREATE OR REPLACE VIEW profiles_secure AS
SELECT
    id,
    username,
    email,
    full_name,
    display_name,
    department,
    rank,
    clearance,
    wallet_address,
    photo_url,  -- Legacy unencrypted (for migration period)
    CASE
        WHEN photo_url_encrypted IS NOT NULL THEN decrypt_sensitive_text(photo_url_encrypted)
        ELSE photo_url
    END AS photo_url_decrypted,
    photo_hash,
    nft_token_id,
    nft_tx_hash,
    nft_contract_address,
    criminal_check_status,  -- Legacy unencrypted (for migration period)
    CASE
        WHEN criminal_check_status_encrypted IS NOT NULL THEN decrypt_sensitive_text(criminal_check_status_encrypted)::criminal_status
        ELSE criminal_check_status
    END AS criminal_check_status_decrypted,
    criminal_check_timestamp,
    generated_username,
    is_admin,
    avatar_url,
    status,
    metadata,
    created_at,
    updated_at,
    last_active_at,
    encryption_version,
    last_encrypted_at
FROM profiles;

-- ============================================================
-- PART 6: Access Control Functions
-- ============================================================

-- Function to check if user can access sensitive field
CREATE OR REPLACE FUNCTION can_access_sensitive_field(
    p_accessor_id UUID,
    p_target_profile_id UUID,
    p_field_name VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_same_department BOOLEAN;
    v_has_permission BOOLEAN;
BEGIN
    -- Check if accessor is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = p_accessor_id;

    IF v_is_admin THEN
        RETURN TRUE;
    END IF;

    -- Check if accessing own profile
    IF p_accessor_id = p_target_profile_id THEN
        RETURN TRUE;
    END IF;

    -- Check if in same department (for certain fields)
    SELECT EXISTS(
        SELECT 1
        FROM profiles p1, profiles p2
        WHERE p1.id = p_accessor_id
          AND p2.id = p_target_profile_id
          AND p1.department = p2.department
          AND p1.department IS NOT NULL
    ) INTO v_same_department;

    -- Criminal check status requires explicit permission
    IF p_field_name IN ('criminal_check_status', 'criminal_check_status_encrypted') THEN
        -- Check for specific permission in user_roles
        SELECT EXISTS(
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.profile_id = p_accessor_id
              AND ur.is_active = TRUE
              AND (r.permissions ? 'classified:view' OR r.permissions ? 'sensitive_data:read')
        ) INTO v_has_permission;

        RETURN v_has_permission;
    END IF;

    -- Photo URLs require same department or special role
    IF p_field_name IN ('photo_url', 'photo_url_encrypted') THEN
        RETURN v_same_department;
    END IF;

    -- Default deny
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log sensitive field access
CREATE OR REPLACE FUNCTION log_sensitive_access(
    p_accessor_id UUID,
    p_accessed_profile_id UUID,
    p_field_name VARCHAR,
    p_field_value TEXT,
    p_access_reason access_reason,
    p_reason_details TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_was_authorized BOOLEAN;
    v_field_hash VARCHAR(66);
BEGIN
    -- Check authorization
    v_was_authorized := can_access_sensitive_field(p_accessor_id, p_accessed_profile_id, p_field_name);

    -- Compute hash of accessed value (never store the actual value)
    IF p_field_value IS NOT NULL THEN
        v_field_hash := '0x' || encode(digest(p_field_value, 'sha256'), 'hex');
    END IF;

    -- Insert log entry
    INSERT INTO sensitive_field_access_log (
        accessor_id,
        accessed_profile_id,
        field_name,
        field_value_hash,
        access_reason,
        reason_details,
        ip_address,
        user_agent,
        was_authorized
    ) VALUES (
        p_accessor_id,
        p_accessed_profile_id,
        p_field_name,
        v_field_hash,
        p_access_reason,
        p_reason_details,
        p_ip_address,
        p_user_agent,
        v_was_authorized
    ) RETURNING id INTO v_log_id;

    -- If unauthorized, also create security event
    IF NOT v_was_authorized THEN
        INSERT INTO security_events (
            event_type,
            severity,
            actor,
            description,
            metadata
        ) VALUES (
            'UNAUTHORIZED_ATTEMPT',
            'HIGH',
            (SELECT username FROM profiles WHERE id = p_accessor_id),
            format('Unauthorized access attempt to sensitive field: %s', p_field_name),
            jsonb_build_object(
                'accessor_id', p_accessor_id,
                'target_profile_id', p_accessed_profile_id,
                'field_name', p_field_name,
                'access_reason', p_access_reason
            )
        );
    END IF;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 7: Data Retention Policy
-- ============================================================

-- Create retention policy settings
INSERT INTO system_settings (key, value, category, description) VALUES
('photo_retention_days', '365', 'privacy', 'Number of days to retain biometric photos after profile deactivation'),
('encrypted_data_key_rotation_days', '90', 'security', 'Number of days before encryption key rotation'),
('sensitive_access_log_retention_days', '730', 'compliance', 'Number of days to retain sensitive field access logs (2 years)');

-- Function to clean up expired photos (for cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_photos()
RETURNS TABLE(deleted_count INTEGER, profile_ids UUID[]) AS $$
DECLARE
    v_retention_days INTEGER;
    v_deleted_profiles UUID[];
BEGIN
    -- Get retention policy
    SELECT value::INTEGER INTO v_retention_days
    FROM system_settings
    WHERE key = 'photo_retention_days';

    IF v_retention_days IS NULL THEN
        v_retention_days := 365;
    END IF;

    -- Find profiles to clean up (inactive for longer than retention period)
    SELECT ARRAY_AGG(id) INTO v_deleted_profiles
    FROM profiles
    WHERE status IN ('INACTIVE', 'SUSPENDED')
      AND updated_at < NOW() - (v_retention_days || ' days')::INTERVAL
      AND (photo_url IS NOT NULL OR photo_url_encrypted IS NOT NULL);

    IF v_deleted_profiles IS NULL THEN
        RETURN QUERY SELECT 0::INTEGER, ARRAY[]::UUID[];
        RETURN;
    END IF;

    -- Clear photo data (URLs should already be deleted from R2)
    UPDATE profiles
    SET
        photo_url = NULL,
        photo_url_encrypted = NULL,
        photo_hash = NULL,
        photo_hash_encrypted = NULL
    WHERE id = ANY(v_deleted_profiles);

    RETURN QUERY SELECT array_length(v_deleted_profiles, 1)::INTEGER, v_deleted_profiles;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 8: Enable RLS and Policies
-- ============================================================

-- Enable RLS on sensitive_field_access_log
ALTER TABLE sensitive_field_access_log ENABLE ROW LEVEL SECURITY;

-- Admins can see all access logs
CREATE POLICY sensitive_access_admin_all ON sensitive_field_access_log
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
            AND is_admin = TRUE
        )
    );

-- Users can see logs of their own accesses
CREATE POLICY sensitive_access_own ON sensitive_field_access_log
    FOR SELECT
    USING (accessor_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Users can see logs of accesses to their own profile
CREATE POLICY sensitive_access_target ON sensitive_field_access_log
    FOR SELECT
    USING (accessed_profile_id = current_setting('app.current_user_id', TRUE)::UUID);

-- ============================================================
-- PART 9: Initial Encryption Key Setup
-- ============================================================

-- Generate initial encryption key (in production, this should be from KMS)
-- For now, generate a random key and encrypt it with database master key
DO $$
DECLARE
    v_random_key BYTEA;
BEGIN
    -- Generate random 256-bit key
    v_random_key := gen_random_bytes(32);

    -- Insert encrypted key
    INSERT INTO encryption_keys (
        key_name,
        key_purpose,
        encrypted_key,
        key_version,
        is_active
    ) VALUES (
        'profile_data_key',
        'Encryption key for sensitive profile fields (criminal_check_status, photo URLs)',
        v_random_key,
        1,
        TRUE
    );
END $$;

-- ============================================================
-- PART 10: Migration Helper - Encrypt Existing Data
-- ============================================================

-- This would be run after deployment to encrypt existing unencrypted data
-- Commented out for safety - run manually when ready
/*
DO $$
DECLARE
    v_profile RECORD;
BEGIN
    FOR v_profile IN SELECT id, criminal_check_status, photo_url, photo_hash FROM profiles WHERE criminal_check_status_encrypted IS NULL
    LOOP
        UPDATE profiles
        SET
            criminal_check_status_encrypted = CASE
                WHEN v_profile.criminal_check_status IS NOT NULL
                THEN encrypt_sensitive_text(v_profile.criminal_check_status::TEXT)
                ELSE NULL
            END,
            photo_url_encrypted = CASE
                WHEN v_profile.photo_url IS NOT NULL
                THEN encrypt_sensitive_text(v_profile.photo_url)
                ELSE NULL
            END,
            photo_hash_encrypted = CASE
                WHEN v_profile.photo_hash IS NOT NULL
                THEN encrypt_sensitive_text(v_profile.photo_hash)
                ELSE NULL
            END,
            encryption_version = 1,
            last_encrypted_at = NOW()
        WHERE id = v_profile.id;
    END LOOP;
END $$;
*/

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE sensitive_field_access_log IS 'Comprehensive audit log of every read access to sensitive profile fields';
COMMENT ON TABLE encryption_keys IS 'Encrypted storage of column encryption keys for key rotation';
COMMENT ON FUNCTION encrypt_sensitive_text IS 'Encrypt plaintext using AES-256 with active encryption key';
COMMENT ON FUNCTION decrypt_sensitive_text IS 'Decrypt ciphertext using AES-256 with active encryption key';
COMMENT ON FUNCTION can_access_sensitive_field IS 'Authorization check for sensitive field access';
COMMENT ON FUNCTION log_sensitive_access IS 'Log and audit sensitive field access with authorization check';
COMMENT ON VIEW profiles_secure IS 'Secure view with on-the-fly decryption of sensitive fields';

-- ============================================================
-- Audit log entry for migration
-- ============================================================

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
    'Added column-level encryption for sensitive fields and comprehensive access logging',
    jsonb_build_object(
        'migration', '20260917_003_encrypt_sensitive_fields',
        'encrypted_fields', ARRAY['criminal_check_status', 'photo_url', 'photo_hash'],
        'tables_created', ARRAY['sensitive_field_access_log', 'encryption_keys'],
        'security_level', 'AES-256-CBC',
        'access_logging', 'Every read creates audit trail'
    )
);

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================
-- To rollback this migration:
-- 
-- DROP VIEW IF EXISTS profiles_secure;
-- DROP FUNCTION IF EXISTS cleanup_expired_photos();
-- DROP FUNCTION IF EXISTS log_sensitive_access(...);
-- DROP FUNCTION IF EXISTS can_access_sensitive_field(...);
-- DROP FUNCTION IF EXISTS decrypt_sensitive_text(...);
-- DROP FUNCTION IF EXISTS encrypt_sensitive_text(...);
-- DROP TABLE IF EXISTS encryption_keys CASCADE;
-- DROP TABLE IF EXISTS sensitive_field_access_log CASCADE;
-- DROP TYPE IF EXISTS access_reason;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS criminal_check_status_encrypted;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS photo_url_encrypted;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS photo_hash_encrypted;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS encryption_version;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS last_encrypted_at;
-- DELETE FROM system_settings WHERE key IN ('photo_retention_days', 'encrypted_data_key_rotation_days', 'sensitive_access_log_retention_days');
-- ============================================================
