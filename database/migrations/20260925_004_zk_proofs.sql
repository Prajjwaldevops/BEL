-- Zero-Knowledge Proofs Storage
-- Migration: 20260925_004_zk_proofs

-- Create table for storing zero-knowledge proofs
CREATE TABLE IF NOT EXISTS zk_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_type VARCHAR(50) NOT NULL, -- 'clearance', 'membership', 'attribute', 'ownership'
  prover_did VARCHAR(255) NOT NULL, -- DID of the prover
  verifier_did VARCHAR(255), -- DID of the verifier (optional)
  proof_data JSONB NOT NULL, -- The actual proof
  public_inputs JSONB NOT NULL, -- Public inputs for verification
  private_inputs_hash VARCHAR(64), -- Hash of private inputs (for audit)
  circuit_id VARCHAR(100), -- Identifier for the ZK circuit used
  verified BOOLEAN DEFAULT FALSE,
  verification_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE, -- One-time use proofs
  used_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_zkp_proof_type ON zk_proofs(proof_type);
CREATE INDEX idx_zkp_prover_did ON zk_proofs(prover_did);
CREATE INDEX idx_zkp_verifier_did ON zk_proofs(verifier_did) WHERE verifier_did IS NOT NULL;
CREATE INDEX idx_zkp_created_at ON zk_proofs(created_at);
CREATE INDEX idx_zkp_expires_at ON zk_proofs(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_zkp_verified ON zk_proofs(verified);
CREATE INDEX idx_zkp_used ON zk_proofs(used) WHERE used = TRUE;
CREATE INDEX idx_zkp_circuit_id ON zk_proofs(circuit_id);

-- Enable Row Level Security
ALTER TABLE zk_proofs ENABLE ROW LEVEL SECURITY;

-- Policy: Provers can see their own proofs, verifiers can see proofs for them
CREATE POLICY zkp_read_policy ON zk_proofs
  FOR SELECT
  USING (
    prover_did LIKE '%' || auth.uid()::text || '%' OR
    verifier_did LIKE '%' || auth.uid()::text || '%'
  );

-- Policy: Users can create proofs
CREATE POLICY zkp_insert_policy ON zk_proofs
  FOR INSERT
  WITH CHECK (prover_did LIKE '%' || auth.uid()::text || '%');

-- Policy: Verifiers can update verification results
CREATE POLICY zkp_update_policy ON zk_proofs
  FOR UPDATE
  USING (
    verifier_did LIKE '%' || auth.uid()::text || '%' OR
    prover_did LIKE '%' || auth.uid()::text || '%'
  );

-- Create table for ZK proof templates/circuits
CREATE TABLE IF NOT EXISTS zk_circuits (
  id VARCHAR(100) PRIMARY KEY,
  circuit_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  circuit_definition JSONB NOT NULL, -- Circuit structure
  verification_key JSONB, -- Public verification key
  proving_key_ref VARCHAR(500), -- Reference to proving key (secure storage)
  constraints_count INTEGER,
  public_inputs_count INTEGER,
  private_inputs_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_zkc_circuit_type ON zk_circuits(circuit_type);
CREATE INDEX idx_zkc_active ON zk_circuits(active) WHERE active = TRUE;

-- Insert default circuits
INSERT INTO zk_circuits (id, circuit_type, name, description, circuit_definition, constraints_count, public_inputs_count, private_inputs_count) VALUES
  ('clearance-v1', 'clearance', 'Clearance Level Proof', 'Prove clearance level meets threshold without revealing exact level', '{"type": "comparison", "operator": "gte"}'::jsonb, 1, 1, 1),
  ('membership-v1', 'membership', 'Group Membership Proof', 'Prove membership in a group without revealing identity', '{"type": "merkle-tree", "depth": 20}'::jsonb, 20, 1, 2),
  ('attribute-v1', 'attribute', 'Selective Attribute Disclosure', 'Prove specific attributes without revealing others', '{"type": "commitment-based"}'::jsonb, 5, 3, 5),
  ('ownership-v1', 'ownership', 'Asset Ownership Proof', 'Prove asset ownership without revealing owner identity', '{"type": "hash-based"}'::jsonb, 2, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Create table for proof verification logs
CREATE TABLE IF NOT EXISTS zk_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id UUID NOT NULL REFERENCES zk_proofs(id) ON DELETE CASCADE,
  verifier_did VARCHAR(255) NOT NULL,
  verified BOOLEAN NOT NULL,
  verification_time_ms INTEGER, -- Time taken to verify
  error_message TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zkvl_proof_id ON zk_verification_logs(proof_id);
CREATE INDEX idx_zkvl_verifier_did ON zk_verification_logs(verifier_did);
CREATE INDEX idx_zkvl_verified_at ON zk_verification_logs(verified_at);

-- Enable RLS
ALTER TABLE zk_verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY zkvl_read_policy ON zk_verification_logs
  FOR SELECT
  USING (verifier_did LIKE '%' || auth.uid()::text || '%');

-- Create table for proof request challenges
CREATE TABLE IF NOT EXISTS zk_proof_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type VARCHAR(50) NOT NULL,
  verifier_did VARCHAR(255) NOT NULL,
  challenge_data JSONB NOT NULL, -- Nonce, public parameters, etc.
  required_proof_type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  fulfilled BOOLEAN DEFAULT FALSE,
  fulfilled_by_proof_id UUID REFERENCES zk_proofs(id),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zkpc_verifier_did ON zk_proof_challenges(verifier_did);
CREATE INDEX idx_zkpc_expires_at ON zk_proof_challenges(expires_at);
CREATE INDEX idx_zkpc_fulfilled ON zk_proof_challenges(fulfilled) WHERE fulfilled = FALSE;

-- Enable RLS
ALTER TABLE zk_proof_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY zkpc_read_policy ON zk_proof_challenges
  FOR SELECT
  USING (TRUE); -- Challenges are publicly readable

CREATE POLICY zkpc_insert_policy ON zk_proof_challenges
  FOR INSERT
  WITH CHECK (verifier_did LIKE '%' || auth.uid()::text || '%');

-- Function to mark proof as used
CREATE OR REPLACE FUNCTION mark_proof_used()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified = TRUE AND OLD.verified = FALSE THEN
    NEW.used = TRUE;
    NEW.used_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_proof_used
  BEFORE UPDATE ON zk_proofs
  FOR EACH ROW
  EXECUTE FUNCTION mark_proof_used();

-- Function to log verification attempts
CREATE OR REPLACE FUNCTION log_zk_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    INSERT INTO zk_verification_logs (proof_id, verifier_did, verified)
    VALUES (NEW.id, COALESCE(NEW.verifier_did, 'system'), NEW.verified);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_zk_verification
  AFTER UPDATE ON zk_proofs
  FOR EACH ROW
  EXECUTE FUNCTION log_zk_verification();

-- Function to clean expired proofs and challenges
CREATE OR REPLACE FUNCTION clean_expired_zk_data()
RETURNS void AS $$
BEGIN
  -- Delete expired proofs
  DELETE FROM zk_proofs
  WHERE expires_at < NOW() AND used = FALSE;
  
  -- Delete expired challenges
  DELETE FROM zk_proof_challenges
  WHERE expires_at < NOW() AND fulfilled = FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE zk_proofs IS 'Zero-knowledge proofs generated by users';
COMMENT ON TABLE zk_circuits IS 'ZK circuit definitions and verification keys';
COMMENT ON TABLE zk_verification_logs IS 'Audit log of proof verifications';
COMMENT ON TABLE zk_proof_challenges IS 'Verification challenges issued by verifiers';
