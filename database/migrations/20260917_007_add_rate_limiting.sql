-- Migration: 20260917_007_add_rate_limiting.sql
-- Description: Implements progressive account lockout and rate limiting
-- Created: 2026-09-17

-- ============================================================================
-- TABLES
-- ============================================================================

-- Track all login attempts (success and failure)
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100),
    email VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    lockout_until TIMESTAMPTZ,
    requires_captcha BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track manual admin unlocks
CREATE TABLE IF NOT EXISTS account_unlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    unlocked_by UUID REFERENCES profiles(id),
    reason TEXT NOT NULL,
    previous_lockout_until TIMESTAMPTZ,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting configuration (overrides system defaults)
CREATE TABLE IF NOT EXISTS rate_limit_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    max_attempts_tier1 INTEGER DEFAULT 3,  -- Attempts before first warning
    max_attempts_tier2 INTEGER DEFAULT 5,  -- Attempts before short lockout
    max_attempts_tier3 INTEGER DEFAULT 10, -- Attempts before long lockout
    lockout_duration_tier2_minutes INTEGER DEFAULT 15,
    lockout_duration_tier3_minutes INTEGER DEFAULT 60,
    window_minutes INTEGER DEFAULT 60,     -- Time window for counting attempts
    requires_admin_unlock BOOLEAN DEFAULT TRUE, -- Tier 3+ requires admin
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_login_attempts_username ON login_attempts(username) WHERE username IS NOT NULL;
CREATE INDEX idx_login_attempts_email ON login_attempts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at DESC);
CREATE INDEX idx_login_attempts_success ON login_attempts(success);
CREATE INDEX idx_login_attempts_lockout ON login_attempts(lockout_until) WHERE lockout_until IS NOT NULL;

CREATE INDEX idx_account_unlocks_username ON account_unlocks(username);
CREATE INDEX idx_account_unlocks_created ON account_unlocks(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view their own login attempts
CREATE POLICY "Users can view own login attempts"
    ON login_attempts FOR SELECT
    USING (
        auth.jwt() ->> 'email' = email
        OR auth.jwt() ->> 'username' = username
    );

-- Admins can view all attempts
CREATE POLICY "Admins can view all login attempts"
    ON login_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- System can insert login attempts (service role)
CREATE POLICY "Service role can insert login attempts"
    ON login_attempts FOR INSERT
    WITH CHECK (true);

-- Only admins can unlock accounts
CREATE POLICY "Admins can unlock accounts"
    ON account_unlocks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Only admins can manage rate limit config
CREATE POLICY "Admins can manage rate limit config"
    ON rate_limit_config FOR ALL
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

-- Check if username/IP is currently rate limited
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_username VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS TABLE(
    allowed BOOLEAN,
    reason TEXT,
    lockout_until TIMESTAMPTZ,
    failed_attempts INTEGER,
    requires_captcha BOOLEAN,
    tier INTEGER
) AS $$
DECLARE
    v_config RECORD;
    v_failed_count INTEGER;
    v_lockout_until TIMESTAMPTZ;
    v_requires_captcha BOOLEAN := FALSE;
    v_tier INTEGER := 0;
    v_window_start TIMESTAMPTZ;
BEGIN
    -- Get active rate limit configuration
    SELECT * INTO v_config
    FROM rate_limit_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Use defaults if no config exists
    IF v_config IS NULL THEN
        v_config := ROW(
            NULL, 'default', 3, 5, 10, 15, 60, 60, TRUE, TRUE, NOW(), NOW()
        )::rate_limit_config;
    END IF;
    
    v_window_start := NOW() - (v_config.window_minutes || ' minutes')::INTERVAL;
    
    -- Check for active lockout
    SELECT MAX(lockout_until) INTO v_lockout_until
    FROM login_attempts
    WHERE (
        (p_username IS NOT NULL AND username = p_username)
        OR (p_email IS NOT NULL AND email = p_email)
        OR (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    )
    AND lockout_until > NOW();
    
    -- If currently locked out
    IF v_lockout_until IS NOT NULL THEN
        -- Count failures to determine tier
        SELECT COUNT(*) INTO v_failed_count
        FROM login_attempts
        WHERE (
            (p_username IS NOT NULL AND username = p_username)
            OR (p_email IS NOT NULL AND email = p_email)
            OR (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
        )
        AND success = FALSE
        AND created_at > v_window_start;
        
        IF v_failed_count >= v_config.max_attempts_tier3 THEN
            v_tier := 3;
        ELSIF v_failed_count >= v_config.max_attempts_tier2 THEN
            v_tier := 2;
        ELSE
            v_tier := 1;
        END IF;
        
        RETURN QUERY SELECT 
            FALSE, 
            format('Account locked until %s due to multiple failed login attempts', v_lockout_until),
            v_lockout_until,
            v_failed_count,
            TRUE,  -- Always require CAPTCHA after lockout
            v_tier;
        RETURN;
    END IF;
    
    -- Count recent failed attempts in the time window
    SELECT COUNT(*) INTO v_failed_count
    FROM login_attempts
    WHERE (
        (p_username IS NOT NULL AND username = p_username)
        OR (p_email IS NOT NULL AND email = p_email)
        OR (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    )
    AND success = FALSE
    AND created_at > v_window_start;
    
    -- Determine tier and action based on failure count
    IF v_failed_count >= v_config.max_attempts_tier3 THEN
        -- Tier 3: Long lockout + admin unlock required
        v_tier := 3;
        v_lockout_until := NOW() + (v_config.lockout_duration_tier3_minutes || ' minutes')::INTERVAL;
        v_requires_captcha := TRUE;
        
        -- Log security event
        INSERT INTO security_events (event_type, severity, actor, description, metadata)
        VALUES (
            'BRUTE_FORCE_DETECTED',
            'HIGH',
            COALESCE(p_username, p_email, p_ip_address::TEXT),
            format('Account locked after %s failed attempts in %s minutes', v_failed_count, v_config.window_minutes),
            jsonb_build_object(
                'failed_attempts', v_failed_count,
                'tier', v_tier,
                'lockout_minutes', v_config.lockout_duration_tier3_minutes,
                'requires_admin_unlock', v_config.requires_admin_unlock
            )
        );
        
        RETURN QUERY SELECT 
            FALSE,
            format('Too many failed attempts (%s). Account locked for %s minutes. Admin unlock required.', 
                v_failed_count, v_config.lockout_duration_tier3_minutes),
            v_lockout_until,
            v_failed_count,
            v_requires_captcha,
            v_tier;
            
    ELSIF v_failed_count >= v_config.max_attempts_tier2 THEN
        -- Tier 2: Short lockout + CAPTCHA required
        v_tier := 2;
        v_lockout_until := NOW() + (v_config.lockout_duration_tier2_minutes || ' minutes')::INTERVAL;
        v_requires_captcha := TRUE;
        
        -- Log security event
        INSERT INTO security_events (event_type, severity, actor, description, metadata)
        VALUES (
            'MULTIPLE_FAILED_LOGINS',
            'MEDIUM',
            COALESCE(p_username, p_email, p_ip_address::TEXT),
            format('Account locked after %s failed attempts', v_failed_count),
            jsonb_build_object(
                'failed_attempts', v_failed_count,
                'tier', v_tier,
                'lockout_minutes', v_config.lockout_duration_tier2_minutes
            )
        );
        
        RETURN QUERY SELECT 
            FALSE,
            format('Multiple failed attempts (%s). Account locked for %s minutes. CAPTCHA required.', 
                v_failed_count, v_config.lockout_duration_tier2_minutes),
            v_lockout_until,
            v_failed_count,
            v_requires_captcha,
            v_tier;
            
    ELSIF v_failed_count >= v_config.max_attempts_tier1 THEN
        -- Tier 1: Warning + CAPTCHA recommended
        v_tier := 1;
        v_requires_captcha := TRUE;
        
        RETURN QUERY SELECT 
            TRUE,
            format('Warning: %s failed attempts. CAPTCHA recommended.', v_failed_count),
            NULL::TIMESTAMPTZ,
            v_failed_count,
            v_requires_captcha,
            v_tier;
    ELSE
        -- Normal: Login allowed
        RETURN QUERY SELECT 
            TRUE,
            'Login allowed'::TEXT,
            NULL::TIMESTAMPTZ,
            v_failed_count,
            FALSE,
            0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record a login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_username VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT FALSE,
    p_failure_reason VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_attempt_id UUID;
    v_rate_check RECORD;
BEGIN
    -- Check current rate limit status
    SELECT * INTO v_rate_check
    FROM check_rate_limit(p_username, p_email, p_ip_address);
    
    -- Insert login attempt
    INSERT INTO login_attempts (
        username,
        email,
        ip_address,
        user_agent,
        success,
        failure_reason,
        lockout_until,
        requires_captcha
    ) VALUES (
        p_username,
        p_email,
        p_ip_address,
        p_user_agent,
        p_success,
        p_failure_reason,
        v_rate_check.lockout_until,
        v_rate_check.requires_captcha
    )
    RETURNING id INTO v_attempt_id;
    
    RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin function to unlock an account
CREATE OR REPLACE FUNCTION admin_unlock_account(
    p_username VARCHAR,
    p_unlocked_by UUID,
    p_reason TEXT,
    p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_previous_lockout TIMESTAMPTZ;
BEGIN
    -- Check if admin has permission
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_unlocked_by
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can unlock accounts';
    END IF;
    
    -- Get current lockout time
    SELECT MAX(lockout_until) INTO v_previous_lockout
    FROM login_attempts
    WHERE username = p_username
    AND lockout_until > NOW();
    
    -- Clear lockout
    UPDATE login_attempts
    SET lockout_until = NULL,
        requires_captcha = FALSE
    WHERE username = p_username
    AND lockout_until > NOW();
    
    -- Record the unlock
    INSERT INTO account_unlocks (
        username,
        unlocked_by,
        reason,
        previous_lockout_until,
        ip_address
    ) VALUES (
        p_username,
        p_unlocked_by,
        p_reason,
        v_previous_lockout,
        p_ip_address
    );
    
    -- Log security event
    INSERT INTO security_events (event_type, severity, actor, description, metadata)
    VALUES (
        'ACCOUNT_UNLOCKED',
        'MEDIUM',
        p_username,
        format('Account manually unlocked by admin. Reason: %s', p_reason),
        jsonb_build_object(
            'unlocked_by', p_unlocked_by,
            'previous_lockout_until', v_previous_lockout
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old login attempts (retention: 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM login_attempts
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND success = TRUE;  -- Only clean up successful attempts
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DEFAULT CONFIGURATION
-- ============================================================================

-- Insert default rate limit configuration
INSERT INTO rate_limit_config (
    name,
    max_attempts_tier1,
    max_attempts_tier2,
    max_attempts_tier3,
    lockout_duration_tier2_minutes,
    lockout_duration_tier3_minutes,
    window_minutes,
    requires_admin_unlock,
    is_active
) VALUES (
    'default',
    3,   -- Warning after 3 failures
    5,   -- 15-min lockout after 5 failures
    10,  -- 60-min lockout after 10 failures
    15,  -- Tier 2 lockout duration
    60,  -- Tier 3 lockout duration
    60,  -- 1-hour window for counting failures
    TRUE, -- Tier 3 requires admin unlock
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value, category, description) VALUES
('rate_limit_enabled', 'true', 'security', 'Enable progressive rate limiting on login'),
('rate_limit_tier1_attempts', '3', 'security', 'Failed attempts before warning'),
('rate_limit_tier2_attempts', '5', 'security', 'Failed attempts before short lockout'),
('rate_limit_tier3_attempts', '10', 'security', 'Failed attempts before long lockout'),
('rate_limit_tier2_minutes', '15', 'security', 'Lockout duration for tier 2 (minutes)'),
('rate_limit_tier3_minutes', '60', 'security', 'Lockout duration for tier 3 (minutes)'),
('rate_limit_window_minutes', '60', 'security', 'Time window for counting failed attempts'),
('rate_limit_captcha_enabled', 'true', 'security', 'Enable CAPTCHA requirement after failures'),
('rate_limit_admin_unlock_required', 'true', 'security', 'Require admin unlock for tier 3 lockouts'),
('login_attempts_retention_days', '90', 'security', 'Days to retain successful login attempts')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE login_attempts IS 'Tracks all login attempts (success and failure) for rate limiting and security auditing';
COMMENT ON TABLE account_unlocks IS 'Records manual admin unlocks of locked accounts';
COMMENT ON TABLE rate_limit_config IS 'Configuration for progressive rate limiting thresholds';

COMMENT ON FUNCTION check_rate_limit IS 'Checks if username/IP is currently rate limited and returns tier information';
COMMENT ON FUNCTION record_login_attempt IS 'Records a login attempt with automatic lockout application based on rate limits';
COMMENT ON FUNCTION admin_unlock_account IS 'Allows admins to manually unlock accounts that are in tier 3 lockout';
COMMENT ON FUNCTION cleanup_old_login_attempts IS 'Removes successful login attempts older than retention period';
