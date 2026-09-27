-- Verifiable Credentials Storage (W3C Standard)
-- Migration: 20260925_002_verifiable_credentials

-- Create table for storing verifiable credentials
CREATE TABLE IF NOT EXISTS verifiable_credentials (
  id VARCHAR(255) PRIMARY KEY, -- Credential ID (URI)
  holder_did VARCHAR(255) NOT NULL, -- DID of the credential holder
  issuer_did VARCHAR(255) NOT NULL, -- DID of the credential issuer
  types TEXT[] NOT NULL, -- Array of credential types
  credential_data JSONB NOT NULL, -- Full W3C VC JSON
  issuance_date TIMESTAMPTZ NOT NULL,
  expiration_date TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  revocation_proof JSONB,
  credential_schema VARCHAR(500), -- Schema URL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vc_holder_did ON verifiable_credentials(holder_did);
CREATE INDEX idx_vc_issuer_did ON verifiable_credentials(issuer_did);
CREATE INDEX idx_vc_types ON verifiable_credentials USING GIN(types);
CREATE INDEX idx_vc_issuance_date ON verifiable_credentials(issuance_date);
CREATE INDEX idx_vc_expiration_date ON verifiable_credentials(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_vc_revoked ON verifiable_credentials(revoked) WHERE revoked = TRUE;
CREATE INDEX idx_vc_credential_data ON verifiable_credentials USING GIN(credential_data);

-- Enable Row Level Security
ALTER TABLE verifiable_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view credentials they hold or issue
CREATE POLICY vc_access_policy ON verifiable_credentials
  FOR SELECT
  USING (
    holder_did LIKE '%' || auth.uid()::text || '%' OR
    issuer_did LIKE '%' || auth.uid()::text || '%'
  );

-- Policy: Only issuers can insert credentials
CREATE POLICY vc_insert_policy ON verifiable_credentials
  FOR INSERT
  WITH CHECK (issuer_did LIKE '%' || auth.uid()::text || '%');

-- Policy: Only issuers can revoke credentials
CREATE POLICY vc_update_policy ON verifiable_credentials
  FOR UPDATE
  USING (issuer_did LIKE '%' || auth.uid()::text || '%');

-- Create table for credential presentations
CREATE TABLE IF NOT EXISTS credential_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_did VARCHAR(255) NOT NULL,
  verifier_did VARCHAR(255) NOT NULL,
  credential_ids TEXT[] NOT NULL, -- Array of credential IDs included
  presentation_data JSONB NOT NULL, -- Full VP JSON
  challenge VARCHAR(255), -- Nonce from verifier
  domain VARCHAR(255), -- Expected domain
  verified BOOLEAN DEFAULT FALSE,
  verification_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_vp_holder_did ON credential_presentations(holder_did);
CREATE INDEX idx_vp_verifier_did ON credential_presentations(verifier_did);
CREATE INDEX idx_vp_credential_ids ON credential_presentations USING GIN(credential_ids);
CREATE INDEX idx_vp_created_at ON credential_presentations(created_at);

-- Enable RLS
ALTER TABLE credential_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY vp_access_policy ON credential_presentations
  FOR SELECT
  USING (
    holder_did LIKE '%' || auth.uid()::text || '%' OR
    verifier_did LIKE '%' || auth.uid()::text || '%'
  );

-- Create table for credential revocation registry
CREATE TABLE IF NOT EXISTS credential_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id VARCHAR(255) NOT NULL REFERENCES verifiable_credentials(id) ON DELETE CASCADE,
  issuer_did VARCHAR(255) NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  revocation_list_url VARCHAR(500), -- URL to revocation list (if using list-based)
  revocation_index INTEGER, -- Index in revocation list
  UNIQUE(credential_id)
);

CREATE INDEX idx_cr_credential_id ON credential_revocations(credential_id);
CREATE INDEX idx_cr_issuer_did ON credential_revocations(issuer_did);

-- Enable RLS
ALTER TABLE credential_revocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY cr_access_policy ON credential_revocations
  FOR ALL
  USING (issuer_did LIKE '%' || auth.uid()::text || '%');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vc_updated_at
  BEFORE UPDATE ON verifiable_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_vc_updated_at();

-- Function to sync revocation to main table
CREATE OR REPLACE FUNCTION sync_credential_revocation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE verifiable_credentials
  SET 
    revoked = TRUE,
    revoked_at = NEW.revoked_at,
    revocation_reason = NEW.reason
  WHERE id = NEW.credential_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_credential_revocation
  AFTER INSERT ON credential_revocations
  FOR EACH ROW
  EXECUTE FUNCTION sync_credential_revocation();

COMMENT ON TABLE verifiable_credentials IS 'W3C Verifiable Credentials storage';
COMMENT ON TABLE credential_presentations IS 'W3C Verifiable Presentations for credential sharing';
COMMENT ON TABLE credential_revocations IS 'Credential revocation registry';
