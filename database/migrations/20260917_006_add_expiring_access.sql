-- Migration: 20260917_006_add_expiring_access.sql
-- Description: Implements time-bound access grants with auto-expiration
-- Created: 2026-09-17

-- ============================================================================
-- TABLE MODIFICATIONS
-- ============================================================================

-- Add expiration columns to existing tables (if they don't exist)

-- Check if user_roles table exists, if not create it
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL,
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add expires_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_roles' AND column_name='expires_at') THEN
        ALTER TABLE user_roles ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Check if asset_permissions table exists, if not create it
CREATE TABLE IF NOT EXISTS asset_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL,
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add expires_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='asset_permissions' AND column_name='expires_at') THEN
        ALTER TABLE asset_permissions ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Access grant history (tracks all grants including extensions and early revocations)
CREATE TABLE IF NOT EXISTS access_grant_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_type VARCHAR(50) NOT NULL, -- 'ROLE', 'ASSET_PERMISSION'
    grant_id UUID NOT NULL, -- FK to user_roles or asset_permissions
    profile_id UUID NOT NULL REFERENCES profiles(id),
    action_type VARCHAR(50) NOT NULL, -- 'GRANTED', 'EXTENDED', 'REVOKED_EARLY', 'AUTO_EXPIRED'
    performed_by UUID REFERENCES profiles(id),
    reason TEXT,
    original_expires_at TIMESTAMPTZ,
    new_expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delegation chains (track who delegated access to whom)
CREATE TABLE IF NOT EXISTS access_delegations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delegator_id UUID NOT NULL REFERENCES profiles(id),
    delegate_id UUID NOT NULL REFERENCES profiles(id),
    grant_type VARCHAR(50) NOT NULL,
    grant_id UUID NOT NULL,
    delegation_level INTEGER DEFAULT 1, -- How many hops from original grantor
    can_delegate_further BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (delegator_id != delegate_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON user_roles(expires_at) 
    WHERE expires_at IS NOT NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_roles_profile ON user_roles(profile_id) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_asset_permissions_expires ON asset_permissions(expires_at) 
    WHERE expires_at IS NOT NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_asset_permissions_profile ON asset_permissions(profile_id) 
    WHERE is_active = TRUE;

CREATE INDEX idx_access_grant_history_grant ON access_grant_history(grant_type, grant_id);
CREATE INDEX idx_access_grant_history_profile ON access_grant_history(profile_id);
CREATE INDEX idx_access_grant_history_created ON access_grant_history(created_at DESC);

CREATE INDEX idx_access_delegations_delegator ON access_delegations(delegator_id);
CREATE INDEX idx_access_delegations_delegate ON access_delegations(delegate_id);
CREATE INDEX idx_access_delegations_expires ON access_delegations(expires_at) 
    WHERE is_active = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE access_grant_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_delegations ENABLE ROW LEVEL SECURITY;

-- Admins can view all grant history
CREATE POLICY "Admins can view all grant history"
    ON access_grant_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Users can view their own grant history
CREATE POLICY "Users can view own grant history"
    ON access_grant_history FOR SELECT
    USING (profile_id = (auth.jwt() ->> 'sub')::UUID);

-- Admins can manage delegations
CREATE POLICY "Admins can manage delegations"
    ON access_delegations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Revoke expired access grants
CREATE OR REPLACE FUNCTION revoke_expired_access()
RETURNS TABLE(
    expired_roles INTEGER,
    expired_permissions INTEGER,
    expired_delegations INTEGER
) AS $$
DECLARE
    v_expired_roles INTEGER := 0;
    v_expired_permissions INTEGER := 0;
    v_expired_delegations INTEGER := 0;
    v_role RECORD;
    v_permission RECORD;
BEGIN
    -- Revoke expired roles
    FOR v_role IN
        SELECT ur.id, ur.profile_id, ur.role_id, ur.expires_at, p.username
        FROM user_roles ur
        JOIN profiles p ON ur.profile_id = p.id
        WHERE ur.is_active = TRUE
        AND ur.expires_at IS NOT NULL
        AND ur.expires_at < NOW()
    LOOP
        UPDATE user_roles
        SET is_active = FALSE,
            revoked_at = NOW()
        WHERE id = v_role.id;
        
        -- Log revocation
        INSERT INTO access_grant_history (
            grant_type,
            grant_id,
            profile_id,
            action_type,
            reason,
            original_expires_at
        ) VALUES (
            'ROLE',
            v_role.id,
            v_role.profile_id,
            'AUTO_EXPIRED',
            format('Role automatically expired at %s', v_role.expires_at),
            v_role.expires_at
        );
        
        -- Log security event
        INSERT INTO security_events (
            event_type,
            severity,
            actor,
            description,
            metadata
        ) VALUES (
            'ACCESS_EXPIRED',
            'LOW',
            v_role.username,
            format('Time-bound role access expired for %s', v_role.username),
            jsonb_build_object(
                'profile_id', v_role.profile_id,
                'role_id', v_role.role_id,
                'expired_at', v_role.expires_at
            )
        );
        
        v_expired_roles := v_expired_roles + 1;
    END LOOP;
    
    -- Revoke expired asset permissions
    FOR v_permission IN
        SELECT ap.id, ap.profile_id, ap.asset_id, ap.permission_type, ap.expires_at, p.username
        FROM asset_permissions ap
        JOIN profiles p ON ap.profile_id = p.id
        WHERE ap.is_active = TRUE
        AND ap.expires_at IS NOT NULL
        AND ap.expires_at < NOW()
    LOOP
        UPDATE asset_permissions
        SET is_active = FALSE,
            revoked_at = NOW()
        WHERE id = v_permission.id;
        
        -- Log revocation
        INSERT INTO access_grant_history (
            grant_type,
            grant_id,
            profile_id,
            action_type,
            reason,
            original_expires_at
        ) VALUES (
            'ASSET_PERMISSION',
            v_permission.id,
            v_permission.profile_id,
            'AUTO_EXPIRED',
            format('Permission automatically expired at %s', v_permission.expires_at),
            v_permission.expires_at
        );
        
        -- Log security event
        INSERT INTO security_events (
            event_type,
            severity,
            actor,
            description,
            metadata
        ) VALUES (
            'PERMISSION_EXPIRED',
            'LOW',
            v_permission.username,
            format('Time-bound permission expired for %s', v_permission.username),
            jsonb_build_object(
                'profile_id', v_permission.profile_id,
                'asset_id', v_permission.asset_id,
                'permission_type', v_permission.permission_type,
                'expired_at', v_permission.expires_at
            )
        );
        
        v_expired_permissions := v_expired_permissions + 1;
    END LOOP;
    
    -- Revoke expired delegations
    UPDATE access_delegations
    SET is_active = FALSE,
        revoked_at = NOW()
    WHERE is_active = TRUE
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_expired_delegations = ROW_COUNT;
    
    RETURN QUERY SELECT v_expired_roles, v_expired_permissions, v_expired_delegations;
END;
$$ LANGUAGE plpgsql;

-- Grant temporary role access
CREATE OR REPLACE FUNCTION grant_temporary_role(
    p_profile_id UUID,
    p_role_name VARCHAR,
    p_expires_in_hours INTEGER,
    p_granted_by UUID,
    p_reason TEXT
)
RETURNS UUID AS $$
DECLARE
    v_grant_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Calculate expiration time
    v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
    
    -- Check if grantor has permission
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_granted_by
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Only admins can grant roles';
    END IF;
    
    -- Insert role grant
    INSERT INTO user_roles (
        profile_id,
        role_id,
        granted_by,
        expires_at,
        is_active
    ) VALUES (
        p_profile_id,
        (SELECT id FROM roles WHERE name = p_role_name LIMIT 1),
        p_granted_by,
        v_expires_at,
        TRUE
    )
    RETURNING id INTO v_grant_id;
    
    -- Log grant
    INSERT INTO access_grant_history (
        grant_type,
        grant_id,
        profile_id,
        action_type,
        performed_by,
        reason,
        new_expires_at
    ) VALUES (
        'ROLE',
        v_grant_id,
        p_profile_id,
        'GRANTED',
        p_granted_by,
        p_reason,
        v_expires_at
    );
    
    RETURN v_grant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extend access grant expiration
CREATE OR REPLACE FUNCTION extend_access_grant(
    p_grant_type VARCHAR,
    p_grant_id UUID,
    p_additional_hours INTEGER,
    p_extended_by UUID,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_expires_at TIMESTAMPTZ;
    v_new_expires_at TIMESTAMPTZ;
    v_profile_id UUID;
BEGIN
    -- Check if extender has permission
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_extended_by
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Only admins can extend access';
    END IF;
    
    IF p_grant_type = 'ROLE' THEN
        SELECT expires_at, profile_id INTO v_old_expires_at, v_profile_id
        FROM user_roles
        WHERE id = p_grant_id
        AND is_active = TRUE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Grant not found or already revoked';
        END IF;
        
        v_new_expires_at := COALESCE(v_old_expires_at, NOW()) + (p_additional_hours || ' hours')::INTERVAL;
        
        UPDATE user_roles
        SET expires_at = v_new_expires_at
        WHERE id = p_grant_id;
        
    ELSIF p_grant_type = 'ASSET_PERMISSION' THEN
        SELECT expires_at, profile_id INTO v_old_expires_at, v_profile_id
        FROM asset_permissions
        WHERE id = p_grant_id
        AND is_active = TRUE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Grant not found or already revoked';
        END IF;
        
        v_new_expires_at := COALESCE(v_old_expires_at, NOW()) + (p_additional_hours || ' hours')::INTERVAL;
        
        UPDATE asset_permissions
        SET expires_at = v_new_expires_at
        WHERE id = p_grant_id;
    ELSE
        RAISE EXCEPTION 'Invalid grant type';
    END IF;
    
    -- Log extension
    INSERT INTO access_grant_history (
        grant_type,
        grant_id,
        profile_id,
        action_type,
        performed_by,
        reason,
        original_expires_at,
        new_expires_at
    ) VALUES (
        p_grant_type,
        p_grant_id,
        v_profile_id,
        'EXTENDED',
        p_extended_by,
        p_reason,
        v_old_expires_at,
        v_new_expires_at
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke access grant early
CREATE OR REPLACE FUNCTION revoke_access_grant_early(
    p_grant_type VARCHAR,
    p_grant_id UUID,
    p_revoked_by UUID,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_profile_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Check if revoker has permission
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_revoked_by
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Only admins can revoke access';
    END IF;
    
    IF p_grant_type = 'ROLE' THEN
        SELECT profile_id, expires_at INTO v_profile_id, v_expires_at
        FROM user_roles
        WHERE id = p_grant_id
        AND is_active = TRUE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Grant not found or already revoked';
        END IF;
        
        UPDATE user_roles
        SET is_active = FALSE,
            revoked_at = NOW()
        WHERE id = p_grant_id;
        
    ELSIF p_grant_type = 'ASSET_PERMISSION' THEN
        SELECT profile_id, expires_at INTO v_profile_id, v_expires_at
        FROM asset_permissions
        WHERE id = p_grant_id
        AND is_active = TRUE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Grant not found or already revoked';
        END IF;
        
        UPDATE asset_permissions
        SET is_active = FALSE,
            revoked_at = NOW()
        WHERE id = p_grant_id;
    ELSE
        RAISE EXCEPTION 'Invalid grant type';
    END IF;
    
    -- Log early revocation
    INSERT INTO access_grant_history (
        grant_type,
        grant_id,
        profile_id,
        action_type,
        performed_by,
        reason,
        original_expires_at
    ) VALUES (
        p_grant_type,
        p_grant_id,
        v_profile_id,
        'REVOKED_EARLY',
        p_revoked_by,
        p_reason,
        v_expires_at
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value, category, description) VALUES
('access_expiration_enabled', 'true', 'access', 'Enable automatic expiration of time-bound access'),
('access_max_duration_hours', '720', 'access', 'Maximum duration for temporary access grants (30 days)'),
('access_default_duration_hours', '24', 'access', 'Default duration for temporary access grants'),
('access_extension_max_times', '3', 'access', 'Maximum number of times an access grant can be extended'),
('access_delegation_enabled', 'true', 'access', 'Enable access delegation chains'),
('access_delegation_max_depth', '3', 'access', 'Maximum delegation chain depth')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE access_grant_history IS 'Audit trail of all access grant actions (grant, extend, revoke, expire)';
COMMENT ON TABLE access_delegations IS 'Tracks delegation chains where users delegate their access to others';

COMMENT ON FUNCTION revoke_expired_access IS 'Automatically revokes expired access grants and logs events';
COMMENT ON FUNCTION grant_temporary_role IS 'Grants a temporary role with expiration time';
COMMENT ON FUNCTION extend_access_grant IS 'Extends the expiration time of an existing access grant';
COMMENT ON FUNCTION revoke_access_grant_early IS 'Manually revokes an access grant before its expiration';
