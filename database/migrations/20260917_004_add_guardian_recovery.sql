-- Migration: 20260917_004_add_guardian_recovery.sql
-- Description: Implements guardian-based identity recovery system
-- Created: 2026-09-17

-- ============================================================================
-- TABLES
-- ============================================================================

-- Guardian relationships
CREATE TABLE IF NOT EXISTS recovery_guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id UUID NOT NULL, -- References identity/profile
    guardian_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    added_by UUID REFERENCES profiles(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    removed_at TIMESTAMPTZ,
    removed_by UUID REFERENCES profiles(id),
    removal_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identity_id, guardian_profile_id, is_active)
);

-- Recovery requests
CREATE TABLE IF NOT EXISTS recovery_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(66) UNIQUE NOT NULL, -- Blockchain request ID (bytes32 as hex)
    identity_id UUID NOT NULL, -- Identity being recovered
    old_wallet_address VARCHAR(42) NOT NULL,
    new_wallet_address VARCHAR(42) NOT NULL,
    token_id INTEGER,
    required_approvals INTEGER NOT NULL,
    approval_count INTEGER DEFAULT 0,
    rejection_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'EXPIRED',
        'EXECUTED',
        'CANCELLED',
        'TIMELOCK'
    )),
    requested_by UUID REFERENCES profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    timelock_expires_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    executed_by UUID REFERENCES profiles(id),
    tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guardian approvals/rejections
CREATE TABLE IF NOT EXISTS guardian_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recovery_request_id UUID NOT NULL REFERENCES recovery_requests(id) ON DELETE CASCADE,
    guardian_profile_id UUID NOT NULL REFERENCES profiles(id),
    vote VARCHAR(10) NOT NULL CHECK (vote IN ('APPROVE', 'REJECT')),
    reason TEXT,
    signature VARCHAR(132), -- ECDSA signature
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(recovery_request_id, guardian_profile_id)
);

-- Recovery execution history
CREATE TABLE IF NOT EXISTS recovery_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recovery_request_id UUID NOT NULL REFERENCES recovery_requests(id) ON DELETE CASCADE,
    executed_by UUID NOT NULL REFERENCES profiles(id),
    execution_status VARCHAR(20) NOT NULL CHECK (execution_status IN ('SUCCESS', 'FAILED', 'PENDING')),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    gas_used BIGINT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_recovery_guardians_identity ON recovery_guardians(identity_id) WHERE is_active = TRUE;
CREATE INDEX idx_recovery_guardians_guardian ON recovery_guardians(guardian_profile_id) WHERE is_active = TRUE;
CREATE INDEX idx_recovery_guardians_added_by ON recovery_guardians(added_by);

CREATE INDEX idx_recovery_requests_identity ON recovery_requests(identity_id);
CREATE INDEX idx_recovery_requests_status ON recovery_requests(status);
CREATE INDEX idx_recovery_requests_request_id ON recovery_requests(request_id);
CREATE INDEX idx_recovery_requests_old_wallet ON recovery_requests(old_wallet_address);
CREATE INDEX idx_recovery_requests_new_wallet ON recovery_requests(new_wallet_address);
CREATE INDEX idx_recovery_requests_expires ON recovery_requests(expires_at);

CREATE INDEX idx_guardian_approvals_request ON guardian_approvals(recovery_request_id);
CREATE INDEX idx_guardian_approvals_guardian ON guardian_approvals(guardian_profile_id);
CREATE INDEX idx_guardian_approvals_vote ON guardian_approvals(vote);

CREATE INDEX idx_recovery_executions_request ON recovery_executions(recovery_request_id);
CREATE INDEX idx_recovery_executions_status ON recovery_executions(execution_status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE recovery_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_executions ENABLE ROW LEVEL SECURITY;

-- Users can view guardians for their own identity
CREATE POLICY "Users can view own guardians"
    ON recovery_guardians FOR SELECT
    USING (
        identity_id = (auth.jwt() ->> 'sub')::UUID
        OR guardian_profile_id = (auth.jwt() ->> 'sub')::UUID
    );

-- Admins can view all guardians
CREATE POLICY "Admins can view all guardians"
    ON recovery_guardians FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Users can view recovery requests related to them
CREATE POLICY "Users can view related recovery requests"
    ON recovery_requests FOR SELECT
    USING (
        identity_id = (auth.jwt() ->> 'sub')::UUID
        OR requested_by = (auth.jwt() ->> 'sub')::UUID
        OR EXISTS (
            SELECT 1 FROM recovery_guardians
            WHERE recovery_guardians.identity_id = recovery_requests.identity_id
            AND recovery_guardians.guardian_profile_id = (auth.jwt() ->> 'sub')::UUID
            AND recovery_guardians.is_active = TRUE
        )
    );

-- Guardians can vote on requests
CREATE POLICY "Guardians can view and vote on approvals"
    ON guardian_approvals FOR ALL
    USING (
        guardian_profile_id = (auth.jwt() ->> 'sub')::UUID
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Admins can view execution history
CREATE POLICY "Admins can view execution history"
    ON recovery_executions FOR SELECT
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

-- Add guardian
CREATE OR REPLACE FUNCTION add_guardian(
    p_identity_id UUID,
    p_guardian_profile_id UUID,
    p_added_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_guardian_id UUID;
    v_guardian_count INTEGER;
BEGIN
    -- Check if already a guardian
    IF EXISTS (
        SELECT 1 FROM recovery_guardians
        WHERE identity_id = p_identity_id
        AND guardian_profile_id = p_guardian_profile_id
        AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Already a guardian';
    END IF;
    
    -- Check guardian count (max 10)
    SELECT COUNT(*) INTO v_guardian_count
    FROM recovery_guardians
    WHERE identity_id = p_identity_id
    AND is_active = TRUE;
    
    IF v_guardian_count >= 10 THEN
        RAISE EXCEPTION 'Maximum 10 guardians allowed';
    END IF;
    
    -- Cannot be guardian of self
    IF p_identity_id = p_guardian_profile_id THEN
        RAISE EXCEPTION 'Cannot be guardian of self';
    END IF;
    
    -- Add guardian
    INSERT INTO recovery_guardians (
        identity_id,
        guardian_profile_id,
        added_by,
        is_active
    ) VALUES (
        p_identity_id,
        p_guardian_profile_id,
        p_added_by,
        TRUE
    )
    RETURNING id INTO v_guardian_id;
    
    -- Log security event
    INSERT INTO security_events (event_type, severity, actor, description, metadata)
    VALUES (
        'GUARDIAN_ADDED',
        'MEDIUM',
        p_added_by::TEXT,
        format('Guardian added for identity %s', p_identity_id),
        jsonb_build_object(
            'identity_id', p_identity_id,
            'guardian_id', p_guardian_profile_id,
            'guardian_count', v_guardian_count + 1
        )
    );
    
    RETURN v_guardian_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove guardian
CREATE OR REPLACE FUNCTION remove_guardian(
    p_identity_id UUID,
    p_guardian_profile_id UUID,
    p_removed_by UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_guardian_count INTEGER;
BEGIN
    -- Check if guardian exists
    IF NOT EXISTS (
        SELECT 1 FROM recovery_guardians
        WHERE identity_id = p_identity_id
        AND guardian_profile_id = p_guardian_profile_id
        AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Guardian not found or already removed';
    END IF;
    
    -- Check remaining guardian count (min 2)
    SELECT COUNT(*) INTO v_guardian_count
    FROM recovery_guardians
    WHERE identity_id = p_identity_id
    AND is_active = TRUE;
    
    IF v_guardian_count <= 2 THEN
        RAISE EXCEPTION 'Cannot remove guardian - minimum 2 required';
    END IF;
    
    -- Remove guardian
    UPDATE recovery_guardians
    SET is_active = FALSE,
        removed_at = NOW(),
        removed_by = p_removed_by,
        removal_reason = p_reason
    WHERE identity_id = p_identity_id
    AND guardian_profile_id = p_guardian_profile_id
    AND is_active = TRUE;
    
    -- Log security event
    INSERT INTO security_events (event_type, severity, actor, description, metadata)
    VALUES (
        'GUARDIAN_REMOVED',
        'MEDIUM',
        p_removed_by::TEXT,
        format('Guardian removed for identity %s', p_identity_id),
        jsonb_build_object(
            'identity_id', p_identity_id,
            'guardian_id', p_guardian_profile_id,
            'reason', p_reason,
            'remaining_guardians', v_guardian_count - 1
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create recovery request
CREATE OR REPLACE FUNCTION create_recovery_request(
    p_request_id VARCHAR,
    p_identity_id UUID,
    p_old_wallet VARCHAR,
    p_new_wallet VARCHAR,
    p_token_id INTEGER,
    p_required_approvals INTEGER,
    p_requested_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_request_uuid UUID;
    v_guardian_count INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Check guardian count
    SELECT COUNT(*) INTO v_guardian_count
    FROM recovery_guardians
    WHERE identity_id = p_identity_id
    AND is_active = TRUE;
    
    IF v_guardian_count < 2 THEN
        RAISE EXCEPTION 'Insufficient guardians (minimum 2 required)';
    END IF;
    
    IF p_required_approvals > v_guardian_count THEN
        RAISE EXCEPTION 'Required approvals exceed guardian count';
    END IF;
    
    -- Set expiry (7 days)
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Create recovery request
    INSERT INTO recovery_requests (
        request_id,
        identity_id,
        old_wallet_address,
        new_wallet_address,
        token_id,
        required_approvals,
        requested_by,
        expires_at,
        status
    ) VALUES (
        p_request_id,
        p_identity_id,
        p_old_wallet,
        p_new_wallet,
        p_token_id,
        p_required_approvals,
        p_requested_by,
        v_expires_at,
        'PENDING'
    )
    RETURNING id INTO v_request_uuid;
    
    -- Log security event
    INSERT INTO security_events (event_type, severity, actor, description, metadata)
    VALUES (
        'RECOVERY_REQUESTED',
        'HIGH',
        p_requested_by::TEXT,
        format('Recovery requested for identity %s', p_identity_id),
        jsonb_build_object(
            'identity_id', p_identity_id,
            'old_wallet', p_old_wallet,
            'new_wallet', p_new_wallet,
            'required_approvals', p_required_approvals,
            'guardian_count', v_guardian_count
        )
    );
    
    RETURN v_request_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vote on recovery request
CREATE OR REPLACE FUNCTION vote_on_recovery(
    p_recovery_request_id UUID,
    p_guardian_profile_id UUID,
    p_vote VARCHAR,
    p_reason TEXT DEFAULT NULL,
    p_signature VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    new_approval_count INTEGER,
    new_rejection_count INTEGER,
    status VARCHAR,
    timelock_activated BOOLEAN
) AS $$
DECLARE
    v_request RECORD;
    v_is_guardian BOOLEAN;
    v_timelock_activated BOOLEAN := FALSE;
BEGIN
    -- Get request details
    SELECT * INTO v_request
    FROM recovery_requests
    WHERE id = p_recovery_request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recovery request not found';
    END IF;
    
    -- Check if expired
    IF v_request.expires_at < NOW() THEN
        UPDATE recovery_requests SET status = 'EXPIRED' WHERE id = p_recovery_request_id;
        RAISE EXCEPTION 'Recovery request expired';
    END IF;
    
    -- Check if already executed or cancelled
    IF v_request.status NOT IN ('PENDING', 'TIMELOCK') THEN
        RAISE EXCEPTION 'Recovery request is not pending (status: %)', v_request.status;
    END IF;
    
    -- Check if guardian
    SELECT EXISTS (
        SELECT 1 FROM recovery_guardians
        WHERE identity_id = v_request.identity_id
        AND guardian_profile_id = p_guardian_profile_id
        AND is_active = TRUE
    ) INTO v_is_guardian;
    
    IF NOT v_is_guardian THEN
        RAISE EXCEPTION 'Not a guardian for this identity';
    END IF;
    
    -- Record vote
    INSERT INTO guardian_approvals (
        recovery_request_id,
        guardian_profile_id,
        vote,
        reason,
        signature
    ) VALUES (
        p_recovery_request_id,
        p_guardian_profile_id,
        p_vote,
        p_reason,
        p_signature
    );
    
    -- Update counts
    IF p_vote = 'APPROVE' THEN
        UPDATE recovery_requests
        SET approval_count = approval_count + 1,
            updated_at = NOW()
        WHERE id = p_recovery_request_id
        RETURNING approval_count, rejection_count, status INTO v_request;
    ELSE
        UPDATE recovery_requests
        SET rejection_count = rejection_count + 1,
            updated_at = NOW()
        WHERE id = p_recovery_request_id
        RETURNING approval_count, rejection_count, status INTO v_request;
    END IF;
    
    -- Check if threshold reached
    IF v_request.approval_count >= v_request.required_approvals AND v_request.status = 'PENDING' THEN
        -- Activate timelock (2 days)
        UPDATE recovery_requests
        SET status = 'TIMELOCK',
            timelock_expires_at = NOW() + INTERVAL '2 days'
        WHERE id = p_recovery_request_id;
        
        v_timelock_activated := TRUE;
        v_request.status := 'TIMELOCK';
    ELSIF v_request.rejection_count >= v_request.required_approvals THEN
        -- Too many rejections
        UPDATE recovery_requests
        SET status = 'REJECTED'
        WHERE id = p_recovery_request_id;
        
        v_request.status := 'REJECTED';
    END IF;
    
    -- Log event
    INSERT INTO security_events (event_type, severity, actor, description, metadata)
    VALUES (
        CASE WHEN p_vote = 'APPROVE' THEN 'RECOVERY_APPROVED' ELSE 'RECOVERY_REJECTED' END,
        'HIGH',
        p_guardian_profile_id::TEXT,
        format('Guardian %s recovery request', p_vote),
        jsonb_build_object(
            'recovery_request_id', p_recovery_request_id,
            'vote', p_vote,
            'approval_count', v_request.approval_count,
            'rejection_count', v_request.rejection_count,
            'status', v_request.status
        )
    );
    
    RETURN QUERY SELECT 
        TRUE,
        v_request.approval_count,
        v_request.rejection_count,
        v_request.status,
        v_timelock_activated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value, category, description) VALUES
('guardian_recovery_enabled', 'true', 'recovery', 'Enable guardian-based recovery system'),
('guardian_min_count', '2', 'recovery', 'Minimum number of guardians required'),
('guardian_max_count', '10', 'recovery', 'Maximum number of guardians allowed'),
('guardian_approval_threshold', '0.60', 'recovery', 'Default approval threshold (60% = 3 of 5)'),
('recovery_request_expiry_days', '7', 'recovery', 'Days before recovery request expires'),
('recovery_timelock_days', '2', 'recovery', 'Days for timelock after approval threshold reached'),
('recovery_notification_enabled', 'true', 'recovery', 'Send notifications for recovery events')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE recovery_guardians IS 'Guardian relationships for identity recovery';
COMMENT ON TABLE recovery_requests IS 'Recovery requests initiated by guardians';
COMMENT ON TABLE guardian_approvals IS 'Guardian votes (approve/reject) on recovery requests';
COMMENT ON TABLE recovery_executions IS 'Execution history of approved recovery requests';

COMMENT ON FUNCTION add_guardian IS 'Add a guardian for an identity (max 10)';
COMMENT ON FUNCTION remove_guardian IS 'Remove a guardian (min 2 must remain)';
COMMENT ON FUNCTION create_recovery_request IS 'Create a new recovery request';
COMMENT ON FUNCTION vote_on_recovery IS 'Guardian votes on recovery request, checks threshold, activates timelock';
