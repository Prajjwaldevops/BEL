-- Migration: 20260917_005_add_multisig_approvals.sql
-- Description: Implements multi-signature approval workflows for high-impact actions
-- Created: 2026-09-17

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Action types requiring multi-sig approval
CREATE TYPE approval_action_type AS ENUM (
    'ROLE_ESCALATION',
    'HIGH_VALUE_TRANSFER',
    'NFT_BURN',
    'CONTRACT_PAUSE',
    'GUARDIAN_OVERRIDE',
    'BULK_OPERATION',
    'SYSTEM_CONFIG_CHANGE',
    'ACCOUNT_UNLOCK',
    'DATA_EXPORT',
    'EMERGENCY_ACTION'
);

-- Vote types
CREATE TYPE approval_vote_type AS ENUM (
    'APPROVE',
    'REJECT',
    'ABSTAIN'
);

-- Approval status
CREATE TYPE approval_status_type AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'EXECUTED',
    'CANCELED',
    'FAILED'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Pending multi-sig approvals
CREATE TABLE IF NOT EXISTS pending_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type approval_action_type NOT NULL,
    action_description TEXT NOT NULL,
    payload JSONB NOT NULL,  -- Full action parameters
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    required_approvals INTEGER NOT NULL,
    approval_count INTEGER DEFAULT 0,
    rejection_count INTEGER DEFAULT 0,
    abstain_count INTEGER DEFAULT 0,
    status approval_status_type DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    executed_by UUID REFERENCES profiles(id),
    execution_result JSONB,
    execution_error TEXT,
    canceled_at TIMESTAMPTZ,
    canceled_by UUID REFERENCES profiles(id),
    cancel_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual approval votes
CREATE TABLE IF NOT EXISTS approval_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pending_approval_id UUID NOT NULL REFERENCES pending_approvals(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote approval_vote_type NOT NULL,
    reason TEXT,
    signature VARCHAR(132),  -- ECDSA signature
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pending_approval_id, approver_id)
);

-- Approval execution history
CREATE TABLE IF NOT EXISTS approval_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pending_approval_id UUID NOT NULL REFERENCES pending_approvals(id) ON DELETE CASCADE,
    executed_by UUID NOT NULL REFERENCES profiles(id),
    execution_status VARCHAR(20) NOT NULL CHECK (execution_status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
    execution_result JSONB,
    execution_error TEXT,
    execution_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-sig configuration
CREATE TABLE IF NOT EXISTS multisig_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type approval_action_type UNIQUE NOT NULL,
    required_approvals INTEGER NOT NULL DEFAULT 2,
    approval_threshold_percentage DECIMAL(5,2),  -- Alternative to fixed count (e.g., 0.67 = 67%)
    use_threshold BOOLEAN DEFAULT FALSE,
    expiry_hours INTEGER DEFAULT 48,
    auto_execute BOOLEAN DEFAULT FALSE,
    requires_unanimous BOOLEAN DEFAULT FALSE,
    allowed_approver_roles TEXT[] DEFAULT ARRAY['admin', 'super_admin'],
    payload_validation_rules JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_pending_approvals_status ON pending_approvals(status);
CREATE INDEX idx_pending_approvals_type ON pending_approvals(action_type);
CREATE INDEX idx_pending_approvals_requested_by ON pending_approvals(requested_by);
CREATE INDEX idx_pending_approvals_expires ON pending_approvals(expires_at) WHERE status = 'PENDING';
CREATE INDEX idx_pending_approvals_created ON pending_approvals(created_at DESC);

CREATE INDEX idx_approval_votes_pending ON approval_votes(pending_approval_id);
CREATE INDEX idx_approval_votes_approver ON approval_votes(approver_id);
CREATE INDEX idx_approval_votes_vote ON approval_votes(vote);

CREATE INDEX idx_approval_executions_pending ON approval_executions(pending_approval_id);
CREATE INDEX idx_approval_executions_status ON approval_executions(execution_status);

CREATE INDEX idx_multisig_config_action ON multisig_config(action_type);
CREATE INDEX idx_multisig_config_active ON multisig_config(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE multisig_config ENABLE ROW LEVEL SECURITY;

-- Admins can view all approvals
CREATE POLICY "Admins can view all pending approvals"
    ON pending_approvals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Users can view approvals they requested
CREATE POLICY "Users can view own approval requests"
    ON pending_approvals FOR SELECT
    USING (requested_by = (auth.jwt() ->> 'sub')::UUID);

-- Admins can create approval requests
CREATE POLICY "Admins can create approval requests"
    ON pending_approvals FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Admins can view all votes
CREATE POLICY "Admins can view all votes"
    ON approval_votes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Admins can vote
CREATE POLICY "Admins can vote on approvals"
    ON approval_votes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Only admins can manage config
CREATE POLICY "Admins can manage multisig config"
    ON multisig_config FOR ALL
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

-- Check if action requires multi-sig approval
CREATE OR REPLACE FUNCTION requires_multisig_approval(
    p_action_type approval_action_type,
    p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_config RECORD;
BEGIN
    -- Get configuration for this action type
    SELECT * INTO v_config
    FROM multisig_config
    WHERE action_type = p_action_type
    AND is_active = TRUE;
    
    -- If no config, check default rules
    IF v_config IS NULL THEN
        -- Always require approval for these critical actions
        IF p_action_type IN ('ROLE_ESCALATION', 'NFT_BURN', 'CONTRACT_PAUSE', 'GUARDIAN_OVERRIDE', 'EMERGENCY_ACTION') THEN
            RETURN TRUE;
        END IF;
        
        -- High value transfers (check amount)
        IF p_action_type = 'HIGH_VALUE_TRANSFER' THEN
            RETURN COALESCE((p_payload->>'value')::DECIMAL, 0) > 1000.0;
        END IF;
        
        -- Bulk operations (check count)
        IF p_action_type = 'BULK_OPERATION' THEN
            RETURN COALESCE((p_payload->>'count')::INTEGER, 0) > 10;
        END IF;
        
        RETURN FALSE;
    END IF;
    
    -- Config exists, so approval is required
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get required approval count for action type
CREATE OR REPLACE FUNCTION get_required_approvals(
    p_action_type approval_action_type
)
RETURNS INTEGER AS $$
DECLARE
    v_config RECORD;
    v_admin_count INTEGER;
    v_required INTEGER;
BEGIN
    -- Get configuration
    SELECT * INTO v_config
    FROM multisig_config
    WHERE action_type = p_action_type
    AND is_active = TRUE;
    
    -- Count eligible admins
    SELECT COUNT(*) INTO v_admin_count
    FROM profiles
    WHERE role IN ('admin', 'super_admin')
    AND is_active = TRUE;
    
    -- If config doesn't exist, use defaults
    IF v_config IS NULL THEN
        -- Default: 67% of admins, minimum 2
        v_required := GREATEST(2, CEIL(v_admin_count * 0.67));
        RETURN v_required;
    END IF;
    
    -- If unanimous required
    IF v_config.requires_unanimous THEN
        RETURN v_admin_count;
    END IF;
    
    -- If using threshold percentage
    IF v_config.use_threshold THEN
        v_required := CEIL(v_admin_count * v_config.approval_threshold_percentage);
        RETURN GREATEST(v_config.required_approvals, v_required);
    END IF;
    
    -- Use fixed count
    RETURN v_config.required_approvals;
END;
$$ LANGUAGE plpgsql;

-- Create new approval request
CREATE OR REPLACE FUNCTION create_approval_request(
    p_action_type approval_action_type,
    p_action_description TEXT,
    p_payload JSONB,
    p_requested_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_approval_id UUID;
    v_required_approvals INTEGER;
    v_config RECORD;
    v_expiry TIMESTAMPTZ;
BEGIN
    -- Check if requester is authorized
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_requested_by
        AND role IN ('admin', 'super_admin')
        AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can create approval requests';
    END IF;
    
    -- Get required approvals
    v_required_approvals := get_required_approvals(p_action_type);
    
    -- Get config for expiry
    SELECT * INTO v_config
    FROM multisig_config
    WHERE action_type = p_action_type
    AND is_active = TRUE;
    
    v_expiry := NOW() + INTERVAL '1 hour' * COALESCE(v_config.expiry_hours, 48);
    
    -- Create approval request
    INSERT INTO pending_approvals (
        action_type,
        action_description,
        payload,
        requested_by,
        required_approvals,
        expires_at
    ) VALUES (
        p_action_type,
        p_action_description,
        p_payload,
        p_requested_by,
        v_required_approvals,
        v_expiry
    )
    RETURNING id INTO v_approval_id;
    
    -- Log security event
    INSERT INTO security_events (event_type, severity, actor, description, metadata)
    VALUES (
        'APPROVAL_REQUESTED',
        'MEDIUM',
        p_requested_by::TEXT,
        format('Multi-sig approval requested: %s - %s', p_action_type, p_action_description),
        jsonb_build_object(
            'approval_id', v_approval_id,
            'action_type', p_action_type,
            'required_approvals', v_required_approvals
        )
    );
    
    RETURN v_approval_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cast vote on approval
CREATE OR REPLACE FUNCTION cast_approval_vote(
    p_approval_id UUID,
    p_approver_id UUID,
    p_vote approval_vote_type,
    p_reason TEXT DEFAULT NULL,
    p_signature VARCHAR DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    new_approval_count INTEGER,
    new_rejection_count INTEGER,
    status approval_status_type,
    auto_executed BOOLEAN
) AS $$
DECLARE
    v_approval RECORD;
    v_config RECORD;
    v_auto_executed BOOLEAN := FALSE;
BEGIN
    -- Check if approver is authorized
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_approver_id
        AND role IN ('admin', 'super_admin')
        AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can vote on approvals';
    END IF;
    
    -- Get approval details
    SELECT * INTO v_approval
    FROM pending_approvals
    WHERE id = p_approval_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request not found';
    END IF;
    
    -- Check if still pending
    IF v_approval.status != 'PENDING' THEN
        RAISE EXCEPTION 'Approval request is no longer pending (status: %)', v_approval.status;
    END IF;
    
    -- Check if expired
    IF v_approval.expires_at < NOW() THEN
        UPDATE pending_approvals
        SET status = 'EXPIRED', updated_at = NOW()
        WHERE id = p_approval_id;
        
        RAISE EXCEPTION 'Approval request has expired';
    END IF;
    
    -- Check if requester trying to approve own request
    IF v_approval.requested_by = p_approver_id THEN
        RAISE EXCEPTION 'Cannot vote on your own approval request';
    END IF;
    
    -- Insert vote (will fail if already voted due to UNIQUE constraint)
    INSERT INTO approval_votes (
        pending_approval_id,
        approver_id,
        vote,
        reason,
        signature,
        ip_address
    ) VALUES (
        p_approval_id,
        p_approver_id,
        p_vote,
        p_reason,
        p_signature,
        p_ip_address
    );
    
    -- Update counts
    UPDATE pending_approvals
    SET 
        approval_count = approval_count + CASE WHEN p_vote = 'APPROVE' THEN 1 ELSE 0 END,
        rejection_count = rejection_count + CASE WHEN p_vote = 'REJECT' THEN 1 ELSE 0 END,
        abstain_count = abstain_count + CASE WHEN p_vote = 'ABSTAIN' THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE id = p_approval_id
    RETURNING approval_count, rejection_count, status INTO v_approval;
    
    -- Check if threshold reached
    IF v_approval.approval_count >= (SELECT required_approvals FROM pending_approvals WHERE id = p_approval_id) THEN
        UPDATE pending_approvals
        SET status = 'APPROVED', updated_at = NOW()
        WHERE id = p_approval_id;
        
        -- Check if auto-execute is enabled
        SELECT * INTO v_config
        FROM multisig_config
        WHERE action_type = v_approval.action_type
        AND is_active = TRUE;
        
        IF v_config.auto_execute THEN
            -- Auto-execute would happen here (implementation depends on action type)
            v_auto_executed := TRUE;
        END IF;
        
        v_approval.status := 'APPROVED';
    ELSIF v_approval.rejection_count >= (SELECT required_approvals FROM pending_approvals WHERE id = p_approval_id) THEN
        UPDATE pending_approvals
        SET status = 'REJECTED', updated_at = NOW()
        WHERE id = p_approval_id;
        
        v_approval.status := 'REJECTED';
    END IF;
    
    -- Log security event
    INSERT INTO security_events (event_type, severity, actor, description, metadata)
    VALUES (
        'APPROVAL_VOTED',
        'MEDIUM',
        p_approver_id::TEXT,
        format('Vote cast on approval %s: %s', p_approval_id, p_vote),
        jsonb_build_object(
            'approval_id', p_approval_id,
            'vote', p_vote,
            'new_status', v_approval.status
        )
    );
    
    RETURN QUERY SELECT 
        TRUE,
        v_approval.approval_count,
        v_approval.rejection_count,
        v_approval.status,
        v_auto_executed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expire old pending approvals
CREATE OR REPLACE FUNCTION expire_old_approvals()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE pending_approvals
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE status = 'PENDING'
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    
    -- Log if any expired
    IF v_expired_count > 0 THEN
        INSERT INTO security_events (event_type, severity, actor, description, metadata)
        VALUES (
            'APPROVALS_EXPIRED',
            'LOW',
            'system',
            format('%s approval requests expired', v_expired_count),
            jsonb_build_object('count', v_expired_count)
        );
    END IF;
    
    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DEFAULT CONFIGURATION
-- ============================================================================

-- Insert default multi-sig configurations
INSERT INTO multisig_config (
    action_type,
    required_approvals,
    approval_threshold_percentage,
    use_threshold,
    expiry_hours,
    auto_execute,
    requires_unanimous,
    allowed_approver_roles
) VALUES
    ('ROLE_ESCALATION', 2, 0.67, TRUE, 48, FALSE, FALSE, ARRAY['admin', 'super_admin']),
    ('HIGH_VALUE_TRANSFER', 2, 0.67, TRUE, 24, FALSE, FALSE, ARRAY['admin', 'super_admin']),
    ('NFT_BURN', 2, 0.67, TRUE, 48, FALSE, FALSE, ARRAY['admin', 'super_admin']),
    ('CONTRACT_PAUSE', 3, 0.75, TRUE, 12, FALSE, TRUE, ARRAY['super_admin']),
    ('GUARDIAN_OVERRIDE', 2, 0.67, TRUE, 72, FALSE, FALSE, ARRAY['admin', 'super_admin']),
    ('BULK_OPERATION', 2, 0.50, TRUE, 48, FALSE, FALSE, ARRAY['admin', 'super_admin']),
    ('SYSTEM_CONFIG_CHANGE', 2, 0.67, TRUE, 48, FALSE, FALSE, ARRAY['super_admin']),
    ('ACCOUNT_UNLOCK', 1, 0.50, TRUE, 24, TRUE, FALSE, ARRAY['admin', 'super_admin']),
    ('DATA_EXPORT', 2, 0.67, TRUE, 48, FALSE, FALSE, ARRAY['admin', 'super_admin']),
    ('EMERGENCY_ACTION', 2, 0.67, TRUE, 6, FALSE, FALSE, ARRAY['super_admin'])
ON CONFLICT (action_type) DO NOTHING;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value, category, description) VALUES
('multisig_enabled', 'true', 'approvals', 'Enable multi-signature approval workflows'),
('multisig_default_threshold', '0.67', 'approvals', 'Default approval threshold (67% = 2 of 3 admins)'),
('multisig_default_expiry_hours', '48', 'approvals', 'Default hours before approval request expires'),
('multisig_min_admins', '2', 'approvals', 'Minimum number of admins required for multi-sig'),
('multisig_notification_enabled', 'true', 'approvals', 'Send notifications for approval requests'),
('multisig_auto_expire_enabled', 'true', 'approvals', 'Automatically expire old pending approvals')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE pending_approvals IS 'Multi-signature approval requests for high-impact actions';
COMMENT ON TABLE approval_votes IS 'Individual votes (approve/reject/abstain) on approval requests';
COMMENT ON TABLE approval_executions IS 'Execution history of approved actions';
COMMENT ON TABLE multisig_config IS 'Configuration for multi-sig requirements by action type';

COMMENT ON FUNCTION requires_multisig_approval IS 'Check if an action requires multi-sig approval based on type and payload';
COMMENT ON FUNCTION get_required_approvals IS 'Calculate required number of approvals based on config and admin count';
COMMENT ON FUNCTION create_approval_request IS 'Create a new multi-sig approval request';
COMMENT ON FUNCTION cast_approval_vote IS 'Cast a vote on an approval request and check if threshold reached';
COMMENT ON FUNCTION expire_old_approvals IS 'Expire pending approvals that have passed their expiry time';
