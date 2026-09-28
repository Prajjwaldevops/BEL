-- Migration: 20260925_007_fix_rate_limit_ambiguity.sql
-- Description: Fix ambiguous column references in rate limiting functions
-- Issue: "column reference lockout_until is ambiguous" error in check_rate_limit()
-- Created: 2026-09-25

-- Drop existing functions
DROP FUNCTION IF EXISTS check_rate_limit(VARCHAR, VARCHAR, INET);
DROP FUNCTION IF EXISTS record_login_attempt(VARCHAR, VARCHAR, INET, TEXT, BOOLEAN, VARCHAR);

-- ============================================================================
-- Recreate check_rate_limit with fully qualified column names
-- ============================================================================

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
    FROM rate_limit_config rlc
    WHERE rlc.is_active = TRUE
    ORDER BY rlc.created_at DESC
    LIMIT 1;
    
    -- Use defaults if no config exists
    IF v_config IS NULL THEN
        v_config := ROW(
            NULL, 'default', 3, 5, 10, 15, 60, 60, TRUE, TRUE, NOW(), NOW()
        )::rate_limit_config;
    END IF;
    
    v_window_start := NOW() - (v_config.window_minutes || ' minutes')::INTERVAL;
    
    -- Check for active lockout (qualify all column references with table alias)
    SELECT MAX(la.lockout_until) INTO v_lockout_until
    FROM login_attempts la
    WHERE (
        (p_username IS NOT NULL AND la.username = p_username)
        OR (p_email IS NOT NULL AND la.email = p_email)
        OR (p_ip_address IS NOT NULL AND la.ip_address = p_ip_address)
    )
    AND la.lockout_until > NOW();
    
    -- If currently locked out
    IF v_lockout_until IS NOT NULL THEN
        -- Count failures to determine tier
        SELECT COUNT(*) INTO v_failed_count
        FROM login_attempts la2
        WHERE (
            (p_username IS NOT NULL AND la2.username = p_username)
            OR (p_email IS NOT NULL AND la2.email = p_email)
            OR (p_ip_address IS NOT NULL AND la2.ip_address = p_ip_address)
        )
        AND la2.success = FALSE
        AND la2.created_at > v_window_start;
        
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
    FROM login_attempts la3
    WHERE (
        (p_username IS NOT NULL AND la3.username = p_username)
        OR (p_email IS NOT NULL AND la3.email = p_email)
        OR (p_ip_address IS NOT NULL AND la3.ip_address = p_ip_address)
    )
    AND la3.success = FALSE
    AND la3.created_at > v_window_start;
    
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

-- ============================================================================
-- Recreate record_login_attempt with fully qualified column names
-- ============================================================================

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
    
    -- Insert login attempt (qualify all columns)
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

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION check_rate_limit IS 'Checks if username/IP is currently rate limited (fixed ambiguous column references)';
COMMENT ON FUNCTION record_login_attempt IS 'Records a login attempt with automatic lockout application (fixed ambiguous column references)';
