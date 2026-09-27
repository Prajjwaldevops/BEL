-- Post-Quantum Cryptographic Keys Storage
-- Migration: 20260925_001_pq_keys

-- Create table for storing post-quantum public/private key pairs
CREATE TABLE IF NOT EXISTS pq_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  algorithm VARCHAR(50) NOT NULL, -- 'kyber512', 'kyber768', 'kyber1024', 'dilithium2', 'dilithium3', 'dilithium5'
  purpose VARCHAR(50) NOT NULL, -- 'encryption', 'signing', 'hybrid'
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL, -- Encrypted with user's master key
  key_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, algorithm, purpose)
);

-- Create index for fast lookups
CREATE INDEX idx_pq_keys_user_id ON pq_keys(user_id);
CREATE INDEX idx_pq_keys_algorithm ON pq_keys(algorithm);
CREATE INDEX idx_pq_keys_purpose ON pq_keys(purpose);
CREATE INDEX idx_pq_keys_expires_at ON pq_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_pq_keys_revoked ON pq_keys(revoked) WHERE revoked = TRUE;

-- Enable Row Level Security
ALTER TABLE pq_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own keys
CREATE POLICY pq_keys_user_policy ON pq_keys
  FOR ALL
  USING (auth.uid() = user_id);

-- Create table for key rotation history
CREATE TABLE IF NOT EXISTS pq_key_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_key_id UUID NOT NULL REFERENCES pq_keys(id) ON DELETE CASCADE,
  new_key_id UUID NOT NULL REFERENCES pq_keys(id) ON DELETE CASCADE,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotation_reason VARCHAR(255)
);

CREATE INDEX idx_pq_key_rotations_user_id ON pq_key_rotations(user_id);
CREATE INDEX idx_pq_key_rotations_old_key_id ON pq_key_rotations(old_key_id);

-- Enable RLS
ALTER TABLE pq_key_rotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY pq_key_rotations_user_policy ON pq_key_rotations
  FOR ALL
  USING (auth.uid() = user_id);

-- Function to automatically mark old keys as revoked during rotation
CREATE OR REPLACE FUNCTION revoke_old_pq_key()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pq_keys
  SET revoked = TRUE, revoked_at = NOW()
  WHERE id = NEW.old_key_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_revoke_old_pq_key
  AFTER INSERT ON pq_key_rotations
  FOR EACH ROW
  EXECUTE FUNCTION revoke_old_pq_key();

COMMENT ON TABLE pq_keys IS 'Stores post-quantum cryptographic keys for users';
COMMENT ON TABLE pq_key_rotations IS 'Tracks history of post-quantum key rotations';
