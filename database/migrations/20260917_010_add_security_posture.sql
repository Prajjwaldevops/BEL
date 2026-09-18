-- Migration: 20260917_010_add_security_posture.sql
-- Description: Implements security posture dashboard with risk scoring and compliance tracking
-- Created: 2026-09-17

-- ============================================================================
-- TABLES
-- ============================================================================

-- Security posture metrics (daily snapshots)
CREATE TABLE IF NOT EXISTS security_posture_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    
    -- Overall security score (0-100)
    security_score INTEGER CHECK (security_score BETWEEN 0 AND 100),
    previous_score INTEGER,
    score_trend VARCHAR(20), -- 'IMPROVING', 'DECLINING', 'STABLE'
    
    -- Risk metrics
    critical_risks INTEGER DEFAULT 0,
    high_risks INTEGER DEFAULT 0,
    medium_risks INTEGER DEFAULT 0,
    low_risks INTEGER DEFAULT 0,
    
    -- Incident metrics
    open_incidents INTEGER DEFAULT 0,
    critical_incidents INTEGER DEFAULT 0,
    incident_response_time_avg_minutes INTEGER,
    
    -- Access control metrics
    total_users INTEGER DEFAULT 0,
    active_users_24h INTEGER DEFAULT 0,
    admin_users INTEGER DEFAULT 0,
    locked_accounts INTEGER DEFAULT 0,
    mfa_enabled_percentage DECIMAL(5, 2),
    
    -- Authentication metrics
    failed_login_attempts_24h INTEGER DEFAULT 0,
    successful_logins_24h INTEGER DEFAULT 0,
    password_reset_requests_24h INTEGER DEFAULT 0,
    
    -- Permission metrics
    privileged_access_grants INTEGER DEFAULT 0,
    expired_access_grants INTEGER DEFAULT 0,
    pending_approvals INTEGER DEFAULT 0,
    
    -- Blockchain metrics
    blockchain_transactions_24h INTEGER DEFAULT 0,
    failed_transactions_24h INTEGER DEFAULT 0,
    high_value_transfers_24h INTEGER DEFAULT 0,
    
    -- Compliance metrics
    compliance_score INTEGER CHECK (compliance_score BETWEEN 0 AND 100),
    policy_violations_24h INTEGER DEFAULT 0,
    audit_trail_completeness DECIMAL(5, 2),
    
    -- Threat indicators
    suspicious_activities_24h INTEGER DEFAULT 0,
    blocked_threats_24h INTEGER DEFAULT 0,
    rate_limit_violations_24h INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security risks (identified vulnerabilities and issues)
CREATE TABLE IF NOT EXISTS security_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Risk identification
    risk_id VARCHAR(100) UNIQUE NOT NULL,
    risk_type VARCHAR(50) NOT NULL, -- 'AUTHENTICATION', 'AUTHORIZATION', 'DATA_EXPOSURE', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Severity
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    
    -- Impact assessment
    likelihood VARCHAR(20) CHECK (likelihood IN ('RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN')),
    impact VARCHAR(20) CHECK (impact IN ('NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC')),
    affected_systems TEXT[],
    affected_users_count INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'IDENTIFIED' CHECK (status IN (
        'IDENTIFIED',
        'ASSESSING',
        'MITIGATING',
        'MITIGATED',
        'ACCEPTED',
        'CLOSED'
    )),
    
    -- Remediation
    mitigation_plan TEXT,
    mitigation_deadline TIMESTAMPTZ,
    mitigation_owner UUID REFERENCES profiles(id),
    
    -- Tracking
    first_detected TIMESTAMPTZ DEFAULT NOW(),
    last_detected TIMESTAMPTZ DEFAULT NOW(),
    detection_count INTEGER DEFAULT 1,
    false_positive BOOLEAN DEFAULT FALSE,
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id),
    resolution_notes TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance requirements tracking
CREATE TABLE IF NOT EXISTS compliance_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Framework
    framework VARCHAR(50) NOT NULL, -- 'GDPR', 'SOC2', 'ISO27001', 'HIPAA', 'PCI-DSS', etc.
    requirement_id VARCHAR(100) NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    requirement_description TEXT,
    
    -- Category
    category VARCHAR(100), -- 'Access Control', 'Encryption', 'Audit Logging', etc.
    control_family VARCHAR(100),
    
    -- Status
    compliance_status VARCHAR(20) DEFAULT 'NOT_ASSESSED' CHECK (compliance_status IN (
        'COMPLIANT',
        'NON_COMPLIANT',
        'PARTIALLY_COMPLIANT',
        'NOT_APPLICABLE',
        'NOT_ASSESSED'
    )),
    
    -- Evidence
    evidence_description TEXT,
    evidence_url TEXT,
    last_assessed TIMESTAMPTZ,
    assessed_by UUID REFERENCES profiles(id),
    next_assessment_due TIMESTAMPTZ,
    
    -- Remediation
    remediation_required BOOLEAN DEFAULT FALSE,
    remediation_notes TEXT,
    remediation_deadline TIMESTAMPTZ,
    remediation_owner UUID REFERENCES profiles(id),
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(framework, requirement_id)
);

-- Security controls (implemented safeguards)
CREATE TABLE IF NOT EXISTS security_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Control identification
    control_id VARCHAR(100) UNIQUE NOT NULL,
    control_name VARCHAR(255) NOT NULL,
    control_type VARCHAR(50) NOT NULL, -- 'PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'DETERRENT'
    
    -- Details
    description TEXT NOT NULL,
    implementation_details TEXT,
    category VARCHAR(100), -- 'Access Control', 'Encryption', 'Monitoring', etc.
    
    -- Status
    status VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN (
        'PLANNED',
        'IN_PROGRESS',
        'IMPLEMENTED',
        'OPERATIONAL',
        'DISABLED',
        'FAILED'
    )),
    
    -- Effectiveness
    effectiveness_rating VARCHAR(20) CHECK (effectiveness_rating IN ('LOW', 'MEDIUM', 'HIGH', 'EXCELLENT')),
    last_tested TIMESTAMPTZ,
    test_results TEXT,
    
    -- Coverage
    covered_risks TEXT[], -- Array of risk_ids
    mapped_compliance TEXT[], -- Array of framework:requirement_id
    
    -- Ownership
    owner UUID REFERENCES profiles(id),
    responsible_team VARCHAR(100),
    
    -- Lifecycle
    implemented_date TIMESTAMPTZ,
    last_review_date TIMESTAMPTZ,
    next_review_due TIMESTAMPTZ,
    
    -- Automation
    is_automated BOOLEAN DEFAULT FALSE,
    automation_tool VARCHAR(100),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security assessments (periodic evaluations)
CREATE TABLE IF NOT EXISTS security_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Assessment details
    assessment_type VARCHAR(50) NOT NULL, -- 'VULNERABILITY_SCAN', 'PENETRATION_TEST', 'AUDIT', 'REVIEW'
    assessment_name VARCHAR(255) NOT NULL,
    assessment_scope TEXT NOT NULL,
    
    -- Scheduling
    scheduled_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Results
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN (
        'SCHEDULED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'FAILED'
    )),
    
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    findings_critical INTEGER DEFAULT 0,
    findings_high INTEGER DEFAULT 0,
    findings_medium INTEGER DEFAULT 0,
    findings_low INTEGER DEFAULT 0,
    
    -- Details
    findings_summary TEXT,
    report_url TEXT,
    recommendations TEXT,
    
    -- Team
    conducted_by UUID REFERENCES profiles(id),
    assessor_team TEXT[],
    external_assessor VARCHAR(255),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security alerts (real-time threat detection)
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- 'ANOMALY', 'THRESHOLD_BREACH', 'PATTERN_MATCH', 'SIGNATURE'
    alert_source VARCHAR(50) NOT NULL, -- 'RATE_LIMITER', 'AUTH_SYSTEM', 'BLOCKCHAIN', 'AUDIT_LOG'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Severity
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    confidence DECIMAL(5, 2), -- 0-100 confidence level
    
    -- Context
    affected_user UUID REFERENCES profiles(id),
    affected_resource VARCHAR(255),
    source_ip INET,
    
    -- Status
    status VARCHAR(20) DEFAULT 'NEW' CHECK (status IN (
        'NEW',
        'INVESTIGATING',
        'CONFIRMED',
        'FALSE_POSITIVE',
        'RESOLVED',
        'IGNORED'
    )),
    
    -- Response
    assigned_to UUID REFERENCES profiles(id),
    investigated_by UUID REFERENCES profiles(id),
    investigated_at TIMESTAMPTZ,
    resolution TEXT,
    
    -- Escalation
    escalated BOOLEAN DEFAULT FALSE,
    escalated_to UUID REFERENCES profiles(id),
    escalated_at TIMESTAMPTZ,
    
    -- Related incident (optional - only if incident response system is installed)
    incident_id UUID, -- REFERENCES security_incidents(id) - added after migration 008
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_posture_metrics_date ON security_posture_metrics(metric_date DESC);
CREATE INDEX idx_posture_metrics_score ON security_posture_metrics(security_score);

CREATE INDEX idx_risks_status ON security_risks(status);
CREATE INDEX idx_risks_severity ON security_risks(severity);
CREATE INDEX idx_risks_type ON security_risks(risk_type);
CREATE INDEX idx_risks_owner ON security_risks(mitigation_owner);

CREATE INDEX idx_compliance_framework ON compliance_requirements(framework);
CREATE INDEX idx_compliance_status ON compliance_requirements(compliance_status);
CREATE INDEX idx_compliance_priority ON compliance_requirements(priority);

CREATE INDEX idx_controls_status ON security_controls(status);
CREATE INDEX idx_controls_category ON security_controls(category);
CREATE INDEX idx_controls_owner ON security_controls(owner);

CREATE INDEX idx_assessments_status ON security_assessments(status);
CREATE INDEX idx_assessments_type ON security_assessments(assessment_type);
CREATE INDEX idx_assessments_date ON security_assessments(completed_at DESC);

CREATE INDEX idx_alerts_status ON security_alerts(status);
CREATE INDEX idx_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_alerts_created ON security_alerts(created_at DESC);
CREATE INDEX idx_alerts_user ON security_alerts(affected_user);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE security_posture_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all security posture data
CREATE POLICY "Admins can view posture metrics"
    ON security_posture_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

CREATE POLICY "Admins can manage risks"
    ON security_risks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

CREATE POLICY "Admins can manage compliance"
    ON compliance_requirements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

CREATE POLICY "Admins can manage controls"
    ON security_controls FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

CREATE POLICY "Admins can manage assessments"
    ON security_assessments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

CREATE POLICY "Admins and affected users can view alerts"
    ON security_alerts FOR SELECT
    USING (
        affected_user = (auth.jwt() ->> 'sub')::UUID
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate security score
CREATE OR REPLACE FUNCTION calculate_security_score()
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 100;
    v_critical_incidents INTEGER;
    v_open_high_risks INTEGER;
    v_failed_logins INTEGER;
    v_compliance_percentage DECIMAL;
BEGIN
    -- Deduct points for open critical incidents (if incident table exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_incidents') THEN
        SELECT COUNT(*) INTO v_critical_incidents
        FROM security_incidents
        WHERE severity = 'CRITICAL' AND status IN ('OPEN', 'INVESTIGATING');
        v_score := v_score - (v_critical_incidents * 10);
    END IF;
    
    -- Deduct points for high/critical risks
    SELECT COUNT(*) INTO v_open_high_risks
    FROM security_risks
    WHERE severity IN ('HIGH', 'CRITICAL') AND status NOT IN ('MITIGATED', 'CLOSED');
    v_score := v_score - (v_open_high_risks * 5);
    
    -- Deduct points for failed login attempts
    SELECT COUNT(*) INTO v_failed_logins
    FROM login_attempts
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND success = FALSE;
    v_score := v_score - LEAST(v_failed_logins / 10, 15);
    
    -- Deduct points for non-compliance
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100
            ELSE (COUNT(*) FILTER (WHERE compliance_status = 'COMPLIANT')::DECIMAL / COUNT(*)) * 100
        END
    INTO v_compliance_percentage
    FROM compliance_requirements
    WHERE compliance_status != 'NOT_APPLICABLE';
    
    v_score := v_score - (100 - v_compliance_percentage::INTEGER) / 5;
    
    -- Ensure score is within bounds
    RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update daily security posture metrics
CREATE OR REPLACE FUNCTION update_security_posture_metrics()
RETURNS UUID AS $$
DECLARE
    v_metric_id UUID;
    v_today DATE := CURRENT_DATE;
    v_previous_score INTEGER;
    v_current_score INTEGER;
    v_score_trend VARCHAR(20);
BEGIN
    -- Get previous score
    SELECT security_score INTO v_previous_score
    FROM security_posture_metrics
    WHERE metric_date < v_today
    ORDER BY metric_date DESC
    LIMIT 1;
    
    -- Calculate current score
    v_current_score := calculate_security_score();
    
    -- Determine trend
    IF v_previous_score IS NULL THEN
        v_score_trend := 'STABLE';
    ELSIF v_current_score > v_previous_score + 5 THEN
        v_score_trend := 'IMPROVING';
    ELSIF v_current_score < v_previous_score - 5 THEN
        v_score_trend := 'DECLINING';
    ELSE
        v_score_trend := 'STABLE';
    END IF;
    
    -- Insert or update today's metrics
    INSERT INTO security_posture_metrics (
        metric_date,
        security_score,
        previous_score,
        score_trend,
        
        -- Risk metrics
        critical_risks,
        high_risks,
        medium_risks,
        low_risks,
        
        -- Incident metrics
        open_incidents,
        critical_incidents,
        
        -- Access control metrics
        total_users,
        active_users_24h,
        admin_users,
        locked_accounts,
        
        -- Authentication metrics
        failed_login_attempts_24h,
        successful_logins_24h,
        
        -- Permission metrics
        pending_approvals,
        
        -- Compliance metrics
        compliance_score,
        policy_violations_24h,
        
        -- Threat indicators
        suspicious_activities_24h,
        rate_limit_violations_24h
    )
    VALUES (
        v_today,
        v_current_score,
        v_previous_score,
        v_score_trend,
        
        -- Risk counts
        (SELECT COUNT(*) FROM security_risks WHERE severity = 'CRITICAL' AND status NOT IN ('MITIGATED', 'CLOSED')),
        (SELECT COUNT(*) FROM security_risks WHERE severity = 'HIGH' AND status NOT IN ('MITIGATED', 'CLOSED')),
        (SELECT COUNT(*) FROM security_risks WHERE severity = 'MEDIUM' AND status NOT IN ('MITIGATED', 'CLOSED')),
        (SELECT COUNT(*) FROM security_risks WHERE severity = 'LOW' AND status NOT IN ('MITIGATED', 'CLOSED')),
        
        -- Incident counts (if table exists)
        COALESCE((SELECT COUNT(*) FROM security_incidents WHERE status NOT IN ('RESOLVED', 'CLOSED') AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_incidents')), 0),
        COALESCE((SELECT COUNT(*) FROM security_incidents WHERE severity = 'CRITICAL' AND status NOT IN ('RESOLVED', 'CLOSED') AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_incidents')), 0),
        
        -- User counts
        (SELECT COUNT(*) FROM profiles WHERE status = 'ACTIVE'),
        (SELECT COUNT(DISTINCT actor::UUID) FROM security_events WHERE created_at >= NOW() - INTERVAL '24 hours'),
        (SELECT COUNT(*) FROM profiles WHERE is_admin = TRUE AND status = 'ACTIVE'),
        (SELECT COUNT(*) FROM login_attempts WHERE locked_until > NOW()),
        
        -- Auth metrics
        (SELECT COUNT(*) FROM login_attempts WHERE created_at >= NOW() - INTERVAL '24 hours' AND success = FALSE),
        (SELECT COUNT(*) FROM login_attempts WHERE created_at >= NOW() - INTERVAL '24 hours' AND success = TRUE),
        
        -- Approval metrics
        (SELECT COUNT(*) FROM pending_approvals WHERE status = 'PENDING'),
        
        -- Compliance
        v_current_score, -- Use same calculation for now
        (SELECT COUNT(*) FROM security_events WHERE created_at >= NOW() - INTERVAL '24 hours' AND event_type LIKE '%VIOLATION%'),
        
        -- Threats
        (SELECT COUNT(*) FROM security_alerts WHERE created_at >= NOW() - INTERVAL '24 hours' AND status != 'FALSE_POSITIVE'),
        (SELECT COUNT(*) FROM login_attempts WHERE created_at >= NOW() - INTERVAL '24 hours' AND locked_until IS NOT NULL)
    )
    ON CONFLICT (metric_date)
    DO UPDATE SET
        security_score = EXCLUDED.security_score,
        previous_score = EXCLUDED.previous_score,
        score_trend = EXCLUDED.score_trend,
        updated_at = NOW();
    
    RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security alert
CREATE OR REPLACE FUNCTION create_security_alert(
    p_alert_type VARCHAR,
    p_alert_source VARCHAR,
    p_title VARCHAR,
    p_description TEXT,
    p_severity VARCHAR,
    p_affected_user UUID DEFAULT NULL,
    p_confidence DECIMAL DEFAULT 95.0
)
RETURNS UUID AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    INSERT INTO security_alerts (
        alert_type,
        alert_source,
        title,
        description,
        severity,
        affected_user,
        confidence,
        status
    ) VALUES (
        p_alert_type,
        p_alert_source,
        p_title,
        p_description,
        p_severity,
        p_affected_user,
        p_confidence,
        'NEW'
    )
    RETURNING id INTO v_alert_id;
    
    -- Auto-escalate critical alerts (if incident table exists)
    IF p_severity = 'CRITICAL' AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_incidents') THEN
        -- Create incident if critical
        INSERT INTO security_incidents (
            incident_type,
            title,
            description,
            severity,
            status,
            affected_user,
            metadata
        ) VALUES (
            'SECURITY_ALERT',
            p_title,
            p_description,
            'CRITICAL',
            'OPEN',
            p_affected_user,
            jsonb_build_object('alert_id', v_alert_id, 'alert_source', p_alert_source)
        );
    END IF;
    
    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default compliance requirements (SOC2 examples)
INSERT INTO compliance_requirements (framework, requirement_id, requirement_name, requirement_description, category, priority) VALUES
('SOC2', 'CC6.1', 'Logical and Physical Access Controls', 'The entity implements logical access security software, infrastructure, and architectures over protected information assets', 'Access Control', 'HIGH'),
('SOC2', 'CC6.2', 'Prior to Issuing System Credentials', 'Before issuing system credentials and granting system access, the entity registers and authorizes new internal and external users', 'Access Control', 'HIGH'),
('SOC2', 'CC6.3', 'Provisioning Access', 'The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets', 'Access Control', 'HIGH'),
('SOC2', 'CC7.2', 'Monitoring Activities', 'The entity monitors system components and the operation of those components for anomalies', 'Monitoring', 'CRITICAL'),
('SOC2', 'CC7.3', 'Response to Security Incidents', 'The entity evaluates security events to determine whether they could or have resulted in a failure of system security', 'Incident Response', 'CRITICAL'),
('SOC2', 'CC8.1', 'Change Management', 'The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes', 'Change Management', 'MEDIUM')
ON CONFLICT DO NOTHING;

-- Insert default security controls
INSERT INTO security_controls (control_id, control_name, control_type, description, category, status) VALUES
('AC-001', 'Multi-Factor Authentication', 'PREVENTIVE', 'Enforce MFA for all user accounts, especially privileged accounts', 'Access Control', 'OPERATIONAL'),
('AC-002', 'Role-Based Access Control', 'PREVENTIVE', 'Implement RBAC with principle of least privilege', 'Access Control', 'OPERATIONAL'),
('AC-003', 'Session Timeout', 'PREVENTIVE', 'Automatic session termination after inactivity period', 'Access Control', 'OPERATIONAL'),
('MN-001', 'Security Event Logging', 'DETECTIVE', 'Comprehensive logging of security-relevant events', 'Monitoring', 'OPERATIONAL'),
('MN-002', 'Real-time Alerting', 'DETECTIVE', 'Automated alerts for suspicious activities and threshold breaches', 'Monitoring', 'OPERATIONAL'),
('MN-003', 'Audit Trail Review', 'DETECTIVE', 'Regular review of audit logs for anomalies', 'Monitoring', 'OPERATIONAL'),
('IR-001', 'Incident Response Plan', 'CORRECTIVE', 'Documented procedures for security incident handling', 'Incident Response', 'OPERATIONAL'),
('IR-002', 'Automated Incident Response', 'CORRECTIVE', 'Automated playbooks for common incident types', 'Incident Response', 'OPERATIONAL')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value, category, description) VALUES
('security_posture_enabled', 'true', 'security', 'Enable security posture monitoring'),
('security_score_threshold', '70', 'security', 'Minimum acceptable security score'),
('alert_retention_days', '90', 'security', 'Days to retain security alerts'),
('risk_assessment_frequency_days', '30', 'security', 'Days between security risk assessments'),
('compliance_audit_frequency_days', '90', 'security', 'Days between compliance audits')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE security_posture_metrics IS 'Daily security posture metrics and scores';
COMMENT ON TABLE security_risks IS 'Identified security risks and vulnerabilities';
COMMENT ON TABLE compliance_requirements IS 'Compliance framework requirements tracking';
COMMENT ON TABLE security_controls IS 'Implemented security controls and safeguards';
COMMENT ON TABLE security_assessments IS 'Periodic security assessments and audits';
COMMENT ON TABLE security_alerts IS 'Real-time security alerts and threat detections';

COMMENT ON FUNCTION calculate_security_score IS 'Calculate overall security score (0-100) based on multiple factors';
COMMENT ON FUNCTION update_security_posture_metrics IS 'Update daily security posture metrics snapshot';
COMMENT ON FUNCTION create_security_alert IS 'Create security alert and auto-escalate if critical';
