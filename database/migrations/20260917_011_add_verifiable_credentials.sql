-- Migration: 20260917_011_add_verifiable_credentials.sql
-- Description: Implements W3C Verifiable Credentials system for identity attestations
-- Created: 2026-09-17

-- ============================================================================
-- TABLES
-- ============================================================================

-- Credential schemas/types
CREATE TABLE IF NOT EXISTS credential_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schema_id VARCHAR(255) UNIQUE NOT NULL,
    schema_name VARCHAR(255) NOT NULL,
    schema_version VARCHAR(50) NOT NULL,
    schema_type VARCHAR(100) NOT NULL, -- 'IDENTITY', 'CLEARANCE', 'CERTIFICATION', 'LICENSE', etc.
    
    -- Schema definition
    schema_definition JSONB NOT NULL, -- JSON Schema format
    required_claims TEXT[] NOT NULL,
    optional_claims TEXT[],
    
    -- Metadata
    issuer_id UUID REFERENCES profiles(id),
    description TEXT,
    valid_duration_days INTEGER, -- How long credentials of this type are valid
    revocable BOOLEAN DEFAULT TRUE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    deprecated_at TIMESTAMPTZ,
    replaced_by UUID REFERENCES credential_schemas(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verifiable credentials
CREATE TABLE IF NOT EXISTS verifiable_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- W3C VC Standard fields
    credential_id VARCHAR(255) UNIQUE NOT NULL, -- did:example:credential/123
    credential_type VARCHAR(100) NOT NULL,
    schema_id UUID REFERENCES credential_schemas(id),
    
    -- Subject (who the credential is about)
    subject_did VARCHAR(255) NOT NULL, -- DID of the subject
    subject_profile_id UUID REFERENCES profiles(id),
    
    -- Issuer (who issued the credential)
    issuer_did VARCHAR(255) NOT NULL,
    issuer_profile_id UUID REFERENCES profiles(id),
    
    -- Credential data
    credential_subject JSONB NOT NULL, -- Claims about the subject
    issuance_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiration_date TIMESTAMPTZ,
    
    -- Proof/signature
    proof_type VARCHAR(50) NOT NULL, -- 'JwtProof2020', 'EcdsaSecp256k1Signature2019', etc.
    proof_value TEXT NOT NULL, -- Cryptographic signature
    proof_purpose VARCHAR(50) DEFAULT 'assertionMethod',
    verification_method VARCHAR(255), -- DID#key-1
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE',
        'SUSPENDED',
        'REVOKED',
        'EXPIRED'
    )),
    
    -- Revocation
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES profiles(id),
    revocation_reason TEXT,
    
    -- Blockchain anchoring (optional)
    blockchain_tx_hash VARCHAR(66),
    blockchain_network VARCHAR(50),
    blockchain_block_number BIGINT,
    
    -- Complete VC JSON
    credential_json JSONB NOT NULL, -- Full W3C VC JSON-LD document
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credential presentations (when VCs are shared)
CREATE TABLE IF NOT EXISTS credential_presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Presentation details
    presentation_id VARCHAR(255) UNIQUE NOT NULL,
    presentation_type VARCHAR(100) DEFAULT 'VerifiablePresentation',
    
    -- Holder (who is presenting)
    holder_did VARCHAR(255) NOT NULL,
    holder_profile_id UUID REFERENCES profiles(id),
    
    -- Verifier (who requested/received the presentation)
    verifier_did VARCHAR(255),
    verifier_profile_id UUID REFERENCES profiles(id),
    
    -- Credentials included
    credential_ids UUID[] NOT NULL, -- Array of verifiable_credentials.id
    
    -- Proof
    proof_type VARCHAR(50) NOT NULL,
    proof_value TEXT NOT NULL,
    proof_challenge VARCHAR(255), -- Nonce/challenge from verifier
    proof_domain VARCHAR(255), -- Domain/context
    
    -- Context
    presentation_purpose VARCHAR(255), -- Why presentation was made
    presentation_context TEXT,
    
    -- Complete VP JSON
    presentation_json JSONB NOT NULL,
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    verification_result TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credential verification logs
CREATE TABLE IF NOT EXISTS credential_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What was verified
    credential_id UUID REFERENCES verifiable_credentials(id),
    presentation_id UUID REFERENCES credential_presentations(id),
    
    -- Verifier
    verifier_profile_id UUID REFERENCES profiles(id),
    verifier_did VARCHAR(255),
    
    -- Verification details
    verification_method VARCHAR(100) NOT NULL, -- 'CRYPTOGRAPHIC', 'BLOCKCHAIN', 'REGISTRY'
    verification_result VARCHAR(20) NOT NULL CHECK (verification_result IN (
        'VALID',
        'INVALID',
        'EXPIRED',
        'REVOKED',
        'SIGNATURE_MISMATCH',
        'ISSUER_UNKNOWN',
        'ERROR'
    )),
    
    -- Checks performed
    signature_valid BOOLEAN,
    issuer_trusted BOOLEAN,
    not_expired BOOLEAN,
    not_revoked BOOLEAN,
    schema_valid BOOLEAN,
    
    -- Details
    verification_details JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Context
    verification_purpose VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trusted issuers registry
CREATE TABLE IF NOT EXISTS trusted_issuers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Issuer identity
    issuer_did VARCHAR(255) UNIQUE NOT NULL,
    issuer_profile_id UUID REFERENCES profiles(id),
    issuer_name VARCHAR(255) NOT NULL,
    issuer_description TEXT,
    
    -- Trust level
    trust_level VARCHAR(20) DEFAULT 'VERIFIED' CHECK (trust_level IN (
        'VERIFIED',
        'TRUSTED',
        'HIGHLY_TRUSTED',
        'GOVERNMENT',
        'SUSPENDED',
        'REVOKED'
    )),
    
    -- Authorized credential types
    authorized_types TEXT[] NOT NULL,
    authorized_schemas UUID[],
    
    -- Verification
    verification_method VARCHAR(100), -- How issuer was verified
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    
    -- Public key for verification
    public_key TEXT NOT NULL,
    public_key_type VARCHAR(50) DEFAULT 'secp256k1',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credential requests (for issuance)
CREATE TABLE IF NOT EXISTS credential_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Request details
    request_id VARCHAR(255) UNIQUE NOT NULL,
    credential_type VARCHAR(100) NOT NULL,
    schema_id UUID REFERENCES credential_schemas(id),
    
    -- Requester (subject)
    requester_did VARCHAR(255) NOT NULL,
    requester_profile_id UUID REFERENCES profiles(id),
    
    -- Issuer
    issuer_did VARCHAR(255),
    issuer_profile_id UUID REFERENCES profiles(id),
    
    -- Requested claims
    requested_claims JSONB NOT NULL,
    supporting_documents TEXT[], -- URLs to supporting docs
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'ISSUED',
        'CANCELLED'
    )),
    
    -- Review
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    review_notes TEXT,
    rejection_reason TEXT,
    
    -- Issued credential
    issued_credential_id UUID REFERENCES verifiable_credentials(id),
    issued_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_schemas_type ON credential_schemas(schema_type);
CREATE INDEX idx_schemas_active ON credential_schemas(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_credentials_subject ON verifiable_credentials(subject_profile_id);
CREATE INDEX idx_credentials_issuer ON verifiable_credentials(issuer_profile_id);
CREATE INDEX idx_credentials_type ON verifiable_credentials(credential_type);
CREATE INDEX idx_credentials_status ON verifiable_credentials(status);
CREATE INDEX idx_credentials_expiration ON verifiable_credentials(expiration_date);
CREATE INDEX idx_credentials_subject_did ON verifiable_credentials(subject_did);

CREATE INDEX idx_presentations_holder ON credential_presentations(holder_profile_id);
CREATE INDEX idx_presentations_verifier ON credential_presentations(verifier_profile_id);
CREATE INDEX idx_presentations_created ON credential_presentations(created_at DESC);

CREATE INDEX idx_verifications_credential ON credential_verifications(credential_id);
CREATE INDEX idx_verifications_result ON credential_verifications(verification_result);
CREATE INDEX idx_verifications_verifier ON credential_verifications(verifier_profile_id);

CREATE INDEX idx_trusted_issuers_did ON trusted_issuers(issuer_did);
CREATE INDEX idx_trusted_issuers_active ON trusted_issuers(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_requests_status ON credential_requests(status);
CREATE INDEX idx_requests_requester ON credential_requests(requester_profile_id);
CREATE INDEX idx_requests_issuer ON credential_requests(issuer_profile_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE credential_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifiable_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_requests ENABLE ROW LEVEL SECURITY;

-- Users can view public schemas
CREATE POLICY "Users can view active schemas"
    ON credential_schemas FOR SELECT
    USING (is_active = TRUE);

-- Users can view their own credentials
CREATE POLICY "Users can view own credentials"
    ON verifiable_credentials FOR SELECT
    USING (
        subject_profile_id = (auth.jwt() ->> 'sub')::UUID
        OR issuer_profile_id = (auth.jwt() ->> 'sub')::UUID
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Users can view their presentations
CREATE POLICY "Users can view own presentations"
    ON credential_presentations FOR SELECT
    USING (
        holder_profile_id = (auth.jwt() ->> 'sub')::UUID
        OR verifier_profile_id = (auth.jwt() ->> 'sub')::UUID
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Anyone can view verification logs for transparency
CREATE POLICY "Public can view verifications"
    ON credential_verifications FOR SELECT
    USING (TRUE);

-- Anyone can view trusted issuers
CREATE POLICY "Public can view trusted issuers"
    ON trusted_issuers FOR SELECT
    USING (is_active = TRUE);

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
    ON credential_requests FOR SELECT
    USING (
        requester_profile_id = (auth.jwt() ->> 'sub')::UUID
        OR issuer_profile_id = (auth.jwt() ->> 'sub')::UUID
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Issue verifiable credential
CREATE OR REPLACE FUNCTION issue_verifiable_credential(
    p_credential_id VARCHAR,
    p_credential_type VARCHAR,
    p_schema_id UUID,
    p_subject_did VARCHAR,
    p_subject_profile_id UUID,
    p_issuer_did VARCHAR,
    p_issuer_profile_id UUID,
    p_credential_subject JSONB,
    p_expiration_date TIMESTAMPTZ,
    p_proof_type VARCHAR,
    p_proof_value TEXT,
    p_credential_json JSONB
)
RETURNS UUID AS $$
DECLARE
    v_credential_uuid UUID;
BEGIN
    -- Check if issuer is trusted
    IF NOT EXISTS (
        SELECT 1 FROM trusted_issuers
        WHERE issuer_did = p_issuer_did
        AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Issuer not in trusted registry';
    END IF;
    
    -- Insert credential
    INSERT INTO verifiable_credentials (
        credential_id,
        credential_type,
        schema_id,
        subject_did,
        subject_profile_id,
        issuer_did,
        issuer_profile_id,
        credential_subject,
        issuance_date,
        expiration_date,
        proof_type,
        proof_value,
        credential_json,
        status
    ) VALUES (
        p_credential_id,
        p_credential_type,
        p_schema_id,
        p_subject_did,
        p_subject_profile_id,
        p_issuer_did,
        p_issuer_profile_id,
        p_credential_subject,
        NOW(),
        p_expiration_date,
        p_proof_type,
        p_proof_value,
        p_credential_json,
        'ACTIVE'
    )
    RETURNING id INTO v_credential_uuid;
    
    -- Log security event
    INSERT INTO security_events (event_type, severity, actor, description, metadata)
    VALUES (
        'CREDENTIAL_ISSUED',
        'MEDIUM',
        p_issuer_profile_id::TEXT,
        format('Verifiable credential issued: %s', p_credential_type),
        jsonb_build_object(
            'credential_id', p_credential_id,
            'credential_type', p_credential_type,
            'subject_did', p_subject_did
        )
    );
    
    RETURN v_credential_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke credential
CREATE OR REPLACE FUNCTION revoke_credential(
    p_credential_id UUID,
    p_revoked_by UUID,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE verifiable_credentials
    SET revoked = TRUE,
        revoked_at = NOW(),
        revoked_by = p_revoked_by,
        revocation_reason = p_reason,
        status = 'REVOKED',
        updated_at = NOW()
    WHERE id = p_credential_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credential not found';
    END IF;
    
    -- Log event
    INSERT INTO security_events (event_type, severity, actor, description, metadata)
    VALUES (
        'CREDENTIAL_REVOKED',
        'HIGH',
        p_revoked_by::TEXT,
        'Verifiable credential revoked',
        jsonb_build_object(
            'credential_id', p_credential_id,
            'reason', p_reason
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify credential
CREATE OR REPLACE FUNCTION verify_credential(
    p_credential_id UUID,
    p_verifier_profile_id UUID
)
RETURNS TABLE(
    is_valid BOOLEAN,
    result VARCHAR,
    signature_valid BOOLEAN,
    issuer_trusted BOOLEAN,
    not_expired BOOLEAN,
    not_revoked BOOLEAN
) AS $$
DECLARE
    v_credential RECORD;
    v_is_valid BOOLEAN := TRUE;
    v_result VARCHAR := 'VALID';
    v_sig_valid BOOLEAN := TRUE;
    v_issuer_trusted BOOLEAN;
    v_not_expired BOOLEAN;
    v_not_revoked BOOLEAN;
BEGIN
    -- Get credential
    SELECT * INTO v_credential
    FROM verifiable_credentials
    WHERE id = p_credential_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'INVALID'::VARCHAR, FALSE, FALSE, FALSE, FALSE;
        RETURN;
    END IF;
    
    -- Check if revoked
    v_not_revoked := NOT v_credential.revoked;
    IF v_credential.revoked THEN
        v_is_valid := FALSE;
        v_result := 'REVOKED';
    END IF;
    
    -- Check if expired
    v_not_expired := (v_credential.expiration_date IS NULL OR v_credential.expiration_date > NOW());
    IF NOT v_not_expired THEN
        v_is_valid := FALSE;
        v_result := 'EXPIRED';
    END IF;
    
    -- Check if issuer is trusted
    SELECT EXISTS (
        SELECT 1 FROM trusted_issuers
        WHERE issuer_did = v_credential.issuer_did
        AND is_active = TRUE
    ) INTO v_issuer_trusted;
    
    IF NOT v_issuer_trusted THEN
        v_is_valid := FALSE;
        v_result := 'ISSUER_UNKNOWN';
    END IF;
    
    -- Log verification
    INSERT INTO credential_verifications (
        credential_id,
        verifier_profile_id,
        verification_method,
        verification_result,
        signature_valid,
        issuer_trusted,
        not_expired,
        not_revoked
    ) VALUES (
        p_credential_id,
        p_verifier_profile_id,
        'REGISTRY',
        v_result,
        v_sig_valid,
        v_issuer_trusted,
        v_not_expired,
        v_not_revoked
    );
    
    RETURN QUERY SELECT v_is_valid, v_result, v_sig_valid, v_issuer_trusted, v_not_expired, v_not_revoked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default credential schemas
INSERT INTO credential_schemas (schema_id, schema_name, schema_version, schema_type, schema_definition, required_claims, optional_claims, valid_duration_days) VALUES
(
    'BEL_IDENTITY_V1',
    'BEL Identity Credential',
    '1.0.0',
    'IDENTITY',
    '{"type":"object","properties":{"fullName":{"type":"string"},"employeeId":{"type":"string"},"department":{"type":"string"},"rank":{"type":"string"},"photoHash":{"type":"string"}},"required":["fullName","employeeId","department"]}'::jsonb,
    ARRAY['fullName', 'employeeId', 'department'],
    ARRAY['rank', 'photoHash', 'dateOfBirth'],
    365
),
(
    'BEL_CLEARANCE_V1',
    'Security Clearance Credential',
    '1.0.0',
    'CLEARANCE',
    '{"type":"object","properties":{"clearanceLevel":{"type":"string","enum":["PUBLIC","CONFIDENTIAL","SECRET","TOP_SECRET"]},"issuedBy":{"type":"string"},"expiresAt":{"type":"string","format":"date-time"}},"required":["clearanceLevel","issuedBy"]}'::jsonb,
    ARRAY['clearanceLevel', 'issuedBy'],
    ARRAY['restrictions', 'specialAccess'],
    180
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value, category, description) VALUES
('vc_enabled', 'true', 'credentials', 'Enable verifiable credentials system'),
('vc_auto_revoke_expired', 'true', 'credentials', 'Automatically revoke expired credentials'),
('vc_require_blockchain_anchor', 'false', 'credentials', 'Require blockchain anchoring for credentials'),
('vc_verification_cache_seconds', '300', 'credentials', 'Cache verification results (seconds)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE credential_schemas IS 'W3C Verifiable Credential schema definitions';
COMMENT ON TABLE verifiable_credentials IS 'Issued W3C Verifiable Credentials';
COMMENT ON TABLE credential_presentations IS 'Verifiable Presentations (credentials shared with verifiers)';
COMMENT ON TABLE credential_verifications IS 'Credential verification audit log';
COMMENT ON TABLE trusted_issuers IS 'Registry of trusted credential issuers';
COMMENT ON TABLE credential_requests IS 'Credential issuance requests';

COMMENT ON FUNCTION issue_verifiable_credential IS 'Issue a new W3C Verifiable Credential';
COMMENT ON FUNCTION revoke_credential IS 'Revoke a verifiable credential';
COMMENT ON FUNCTION verify_credential IS 'Verify credential validity (signature, expiration, revocation)';
