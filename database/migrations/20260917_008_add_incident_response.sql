-- Migration: 20260917_008_add_incident_response.sql
-- Description: Implements automated incident response system for security events
-- Created: 2026-09-17

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Incident severity levels
CREATE TYPE incident_severity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

-- Incident status
CREATE TYPE incident_status AS ENUM (
    'OPEN',
    'INVESTIGATING',
    'CONTAINED',
    'RESOLVED',
    'CLOSED',
    'FALSE_POSITIVE'
);

-- Automated response action types
CREATE TYPE response_action_type AS ENUM (
    'SUSPEND_ACCOUNT',
    'REVOKE_PERMISSIONS',
    'LOCK_ASSET',
    'PAUSE_CONTRACT',
    'NOTIFY_ADMINS',
    'CREATE_APPROVAL',
    'ENABLE_MFA',
    'FORCE_PASSWORD_RESET',
    'QUARANTINE_DATA',
    'BLOCK_IP'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Security incidents (aggregates related events)
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_number VARCHAR(50) UNIQUE NOT NULL, -- INC-2026-001
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity incident_severity NOT NULL,
    status incident_status DEFAULT 'OPEN',
    category VARCHAR(50), -- e.g., 'BRUTE_FORCE', 'DATA_BREACH', 'UNAUTHORIZED_ACCESS'
    affected_entity_type VARCHAR(50), -- 'PROFILE', 'ASSET', 'CONTRACT'
    affected_entity_id UUID,
    reporter_id UUID REFERENCES profiles(id),
    assigned_to UUID REFERENCES profiles(id),
    root_cause TEXT,
    resolution TEXT,
    detected_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    contained_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident timeline (events linked to incident)
CREATE TABLE IF NOT EXISTS incident_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    security_event_id UUID REFERENCES security_events(id),
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    actor UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated response actions taken
CREATE TABLE IF NOT EXISTS incident_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    action_type response_action_type NOT NULL,
    action_description TEXT NOT NULL,
    target_entity_type VARCHAR(50), -- What was acted upon
    target_entity_id UUID,
    automated BOOLEAN DEFAULT TRUE,
    executed_by UUID REFERENCES profiles(id),
    execution_status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (execution_status IN ('SUCCESS', 'FAILED', 'PARTIAL', 'PENDING')),
    execution_result JSONB,
    execution_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident investigation notes
CREATE TABLE IF NOT EXISTS incident_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id),
    note_type VARCHAR(50) DEFAULT 'GENERAL', -- 'GENERAL', 'FINDING', 'ACTION', 'HYPOTHESIS'
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes not visible in exports
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident response playbooks (templates for automated actions)
CREATE TABLE IF NOT EXISTS incident_playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    severity_trigger incident_severity NOT NULL,
    category_trigger VARCHAR(50), -- If NULL, applies to all categories
    automated_actions response_action_type[] NOT NULL,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_action_type VARCHAR(50), -- References approval_action_type
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_incidents_status ON security_incidents(status);
CREATE INDEX idx_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_incidents_detected ON security_incidents(detected_at DESC);
CREATE INDEX idx_incidents_number ON security_incidents(incident_number);
CREATE INDEX idx_incidents_assigned ON security_incidents(assigned_to);
CREATE INDEX idx_incidents_category ON security_incidents(category);

CREATE INDEX idx_incident_events_incident ON incident_events(incident_id);
CREATE INDEX idx_incident_events_security ON incident_events(security_event_id);
CREATE INDEX idx_incident_events_created ON incident_events(created_at DESC);

CREATE INDEX idx_incident_responses_incident ON incident_responses(incident_id);
CREATE INDEX idx_incident_responses_type ON incident_responses(action_type);
CREATE INDEX idx_incident_responses_status ON incident_responses(execution_status);

CREATE INDEX idx_incident_notes_incident ON incident_notes(incident_id);
CREATE INDEX idx_incident_notes_author ON incident_notes(author_id);

CREATE INDEX idx_playbooks_active ON incident_playbooks(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_playbooks_severity ON incident_playbooks(severity_trigger);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_playbooks ENABLE ROW LEVEL SECURITY;

-- Admins can view all incidents
CREATE POLICY "Admins can view all incidents"
    ON security_incidents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Admins can manage incidents
CREATE POLICY "Admins can manage incidents"
    ON security_incidents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Similar policies for other tables
CREATE POLICY "Admins can view incident events" ON incident_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID AND profiles.is_admin = TRUE)
);

CREATE POLICY "Admins can manage incident responses" ON incident_responses FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID AND profiles.is_admin = TRUE)
);

CREATE POLICY "Admins can manage incident notes" ON incident_notes FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID AND profiles.is_admin = TRUE)
);

CREATE POLICY "Admins can manage playbooks" ON incident_playbooks FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID AND profiles.is_admin = TRUE)
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR(4);
    v_count INTEGER;
    v_number VARCHAR(50);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Count incidents this year
    SELECT COUNT(*) + 1 INTO v_count
    FROM security_incidents
    WHERE incident_number LIKE 'INC-' || v_year || '-%';
    
    v_number := format('INC-%s-%s', v_year, LPAD(v_count::TEXT, 4, '0'));
    
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Create incident from security event
CREATE OR REPLACE FUNCTION create_incident_from_event(
    p_security_event_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_category VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_incident_id UUID;
    v_incident_number VARCHAR(50);
    v_event RECORD;
BEGIN
    -- Get security event details
    SELECT * INTO v_event
    FROM security_events
    WHERE id = p_security_event_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Security event not found';
    END IF;
    
    -- Generate incident number
    v_incident_number := generate_incident_number();
    
    -- Create incident
    INSERT INTO security_incidents (
        incident_number,
        title,
        description,
        severity,
        category,
        detected_at
    ) VALUES (
        v_incident_number,
        p_title,
        p_description,
        v_event.severity::incident_severity,
        COALESCE(p_category, v_event.event_type),
        v_event.created_at
    )
    RETURNING id INTO v_incident_id;
    
    -- Link event to incident
    INSERT INTO incident_events (
        incident_id,
        security_event_id,
        event_type,
        description,
        metadata
    ) VALUES (
        v_incident_id,
        p_security_event_id,
        v_event.event_type,
        v_event.description,
        v_event.metadata
    );
    
    RETURN v_incident_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute automated response actions
CREATE OR REPLACE FUNCTION execute_incident_response(
    p_incident_id UUID,
    p_action_type response_action_type,
    p_target_entity_type VARCHAR DEFAULT NULL,
    p_target_entity_id UUID DEFAULT NULL,
    p_executed_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_response_id UUID;
    v_result JSONB;
    v_error TEXT;
    v_status VARCHAR(20) := 'SUCCESS';
BEGIN
    -- Execute action based on type
    BEGIN
        CASE p_action_type
            WHEN 'SUSPEND_ACCOUNT' THEN
                UPDATE profiles
                SET status = 'SUSPENDED', updated_at = NOW()
                WHERE id = p_target_entity_id;
                
                v_result := jsonb_build_object(
                    'profile_id', p_target_entity_id,
                    'action', 'suspended'
                );
                
            WHEN 'REVOKE_PERMISSIONS' THEN
                UPDATE asset_permissions
                SET is_active = FALSE, updated_at = NOW()
                WHERE profile_id = p_target_entity_id;
                
                v_result := jsonb_build_object(
                    'profile_id', p_target_entity_id,
                    'action', 'permissions_revoked'
                );
                
            WHEN 'LOCK_ASSET' THEN
                UPDATE assets
                SET status = 'LOCKED'
                WHERE id = p_target_entity_id;
                
                v_result := jsonb_build_object(
                    'asset_id', p_target_entity_id,
                    'action', 'locked'
                );
                
            WHEN 'NOTIFY_ADMINS' THEN
                -- Notification handled by application layer
                v_result := jsonb_build_object('action', 'notification_queued');
                
            WHEN 'CREATE_APPROVAL' THEN
                -- Approval creation handled by application layer
                v_result := jsonb_build_object('action', 'approval_creation_queued');
                
            ELSE
                v_result := jsonb_build_object('action', 'unknown', 'type', p_action_type);
        END CASE;
        
    EXCEPTION WHEN OTHERS THEN
        v_status := 'FAILED';
        v_error := SQLERRM;
        v_result := jsonb_build_object('error', v_error);
    END;
    
    -- Record response action
    INSERT INTO incident_responses (
        incident_id,
        action_type,
        action_description,
        target_entity_type,
        target_entity_id,
        automated,
        executed_by,
        execution_status,
        execution_result,
        execution_error
    ) VALUES (
        p_incident_id,
        p_action_type,
        format('Automated response: %s', p_action_type),
        p_target_entity_type,
        p_target_entity_id,
        TRUE,
        p_executed_by,
        v_status,
        v_result,
        v_error
    )
    RETURNING id INTO v_response_id;
    
    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle critical security events (trigger function)
CREATE OR REPLACE FUNCTION handle_critical_security_event()
RETURNS TRIGGER AS $$
DECLARE
    v_incident_id UUID;
    v_playbook RECORD;
    v_action response_action_type;
BEGIN
    -- Only process CRITICAL events
    IF NEW.severity = 'CRITICAL' THEN
        -- Create incident
        v_incident_id := create_incident_from_event(
            NEW.id,
            format('CRITICAL: %s', NEW.event_type),
            NEW.description,
            NEW.event_type
        );
        
        -- Find matching playbooks
        FOR v_playbook IN
            SELECT * FROM incident_playbooks
            WHERE is_active = TRUE
            AND severity_trigger = 'CRITICAL'::incident_severity
            AND (category_trigger IS NULL OR category_trigger = NEW.event_type)
        LOOP
            -- Execute each automated action
            FOREACH v_action IN ARRAY v_playbook.automated_actions
            LOOP
                PERFORM execute_incident_response(
                    v_incident_id,
                    v_action,
                    'PROFILE',
                    (SELECT id FROM profiles WHERE username = NEW.actor LIMIT 1),
                    NULL
                );
            END LOOP;
            
            -- Create approval if required
            IF v_playbook.requires_approval THEN
                -- Application layer will handle approval creation
                PERFORM pg_notify('incident_requires_approval', v_incident_id::TEXT);
            END IF;
        END LOOP;
        
        -- Notify admins
        PERFORM pg_notify('critical_incident_created', v_incident_id::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tr_critical_security_event ON security_events;
CREATE TRIGGER tr_critical_security_event
    AFTER INSERT ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION handle_critical_security_event();

-- Update incident status
CREATE OR REPLACE FUNCTION update_incident_status(
    p_incident_id UUID,
    p_new_status incident_status,
    p_updated_by UUID,
    p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status incident_status;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM security_incidents
    WHERE id = p_incident_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incident not found';
    END IF;
    
    -- Update status
    UPDATE security_incidents
    SET 
        status = p_new_status,
        responded_at = CASE WHEN p_new_status = 'INVESTIGATING' AND responded_at IS NULL THEN NOW() ELSE responded_at END,
        contained_at = CASE WHEN p_new_status = 'CONTAINED' AND contained_at IS NULL THEN NOW() ELSE contained_at END,
        resolved_at = CASE WHEN p_new_status = 'RESOLVED' AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
        closed_at = CASE WHEN p_new_status = 'CLOSED' AND closed_at IS NULL THEN NOW() ELSE closed_at END,
        updated_at = NOW()
    WHERE id = p_incident_id;
    
    -- Add status change to incident events
    INSERT INTO incident_events (
        incident_id,
        event_type,
        description,
        actor,
        metadata
    ) VALUES (
        p_incident_id,
        'STATUS_CHANGE',
        format('Status changed from %s to %s', v_old_status, p_new_status),
        p_updated_by,
        jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status)
    );
    
    -- Add note if provided
    IF p_note IS NOT NULL THEN
        INSERT INTO incident_notes (
            incident_id,
            author_id,
            note_type,
            content
        ) VALUES (
            p_incident_id,
            p_updated_by,
            'ACTION',
            p_note
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DEFAULT PLAYBOOKS
-- ============================================================================

-- Brute force attack playbook
INSERT INTO incident_playbooks (
    name,
    description,
    severity_trigger,
    category_trigger,
    automated_actions,
    requires_approval,
    is_active
) VALUES (
    'BRUTE_FORCE_RESPONSE',
    'Automated response to brute force attacks',
    'CRITICAL',
    'BRUTE_FORCE_DETECTED',
    ARRAY['SUSPEND_ACCOUNT', 'NOTIFY_ADMINS', 'CREATE_APPROVAL']::response_action_type[],
    TRUE,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Data breach playbook
INSERT INTO incident_playbooks (
    name,
    description,
    severity_trigger,
    category_trigger,
    automated_actions,
    requires_approval,
    is_active
) VALUES (
    'DATA_BREACH_RESPONSE',
    'Automated response to suspected data breaches',
    'CRITICAL',
    'DATA_BREACH',
    ARRAY['REVOKE_PERMISSIONS', 'NOTIFY_ADMINS', 'QUARANTINE_DATA']::response_action_type[],
    TRUE,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Unauthorized access playbook
INSERT INTO incident_playbooks (
    name,
    description,
    severity_trigger,
    category_trigger,
    automated_actions,
    requires_approval,
    is_active
) VALUES (
    'UNAUTHORIZED_ACCESS_RESPONSE',
    'Automated response to unauthorized access attempts',
    'HIGH',
    'UNAUTHORIZED_ACCESS',
    ARRAY['SUSPEND_ACCOUNT', 'NOTIFY_ADMINS']::response_action_type[],
    FALSE,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value, category, description) VALUES
('incident_response_enabled', 'true', 'security', 'Enable automated incident response system'),
('incident_auto_assign', 'true', 'security', 'Automatically assign incidents to available admins'),
('incident_notification_enabled', 'true', 'security', 'Send notifications for new incidents'),
('incident_retention_days', '365', 'security', 'Days to retain closed incidents'),
('incident_sla_hours_critical', '4', 'security', 'SLA response time for CRITICAL incidents (hours)'),
('incident_sla_hours_high', '24', 'security', 'SLA response time for HIGH incidents (hours)'),
('incident_sla_hours_medium', '72', 'security', 'SLA response time for MEDIUM incidents (hours)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE security_incidents IS 'Security incidents aggregating related events and responses';
COMMENT ON TABLE incident_events IS 'Timeline of events and actions related to an incident';
COMMENT ON TABLE incident_responses IS 'Automated and manual response actions taken for incidents';
COMMENT ON TABLE incident_notes IS 'Investigation notes and findings for incidents';
COMMENT ON TABLE incident_playbooks IS 'Automated response templates triggered by severity and category';

COMMENT ON FUNCTION handle_critical_security_event IS 'Trigger function that creates incidents and executes playbooks for CRITICAL events';
COMMENT ON FUNCTION create_incident_from_event IS 'Creates a new incident from a security event';
COMMENT ON FUNCTION execute_incident_response IS 'Executes an automated response action for an incident';
COMMENT ON FUNCTION update_incident_status IS 'Updates incident status with timestamp tracking and audit trail';
