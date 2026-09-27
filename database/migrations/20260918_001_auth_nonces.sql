-- Migration: Add auth_nonces table for wallet signature authentication
-- Created: 2024-09-18
-- Description: Supports EIP-191 challenge-response auth with single-use nonces

CREATE TABLE IF NOT EXISTS auth_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  nonce TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast nonce lookup
CREATE INDEX idx_auth_nonces_wallet_nonce ON auth_nonces(wallet_address, nonce);
CREATE INDEX idx_auth_nonces_used ON auth_nonces(used) WHERE used = FALSE;

-- Cleanup function: Delete expired nonces older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_nonces 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE auth_nonces IS 'Stores single-use nonces for wallet signature authentication (EIP-191). Nonces expire after 5 minutes and are invalidated after use.';
COMMENT ON COLUMN auth_nonces.nonce IS 'Cryptographically random 16-byte hex string';
COMMENT ON COLUMN auth_nonces.used IS 'Single-use flag: nonce cannot be reused after verification';
