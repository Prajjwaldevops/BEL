-- DID Documents Storage (W3C Decentralized Identifiers)
-- Migration: 20260925_003_did_documents

-- Create table for storing DID documents
CREATE TABLE IF NOT EXISTS did_documents (
  did VARCHAR(255) PRIMARY KEY, -- The DID identifier
  method VARCHAR(50) NOT NULL, -- 'key', 'ethr', 'web', 'pq', etc.
  document JSONB NOT NULL, -- Full DID Document JSON
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  controller VARCHAR(255), -- DID of the controller (may be self)
  verification_methods JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of verification methods
  authentication JSONB DEFAULT '[]'::jsonb, -- Authentication verification methods
  assertion_method JSONB DEFAULT '[]'::jsonb, -- Assertion methods
  key_agreement JSONB DEFAULT '[]'::jsonb, -- Key agreement methods
  capability_invocation JSONB DEFAULT '[]'::jsonb,
  capability_delegation JSONB DEFAULT '[]'::jsonb,
  service_endpoints JSONB DEFAULT '[]'::jsonb, -- Array of service endpoints
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated BOOLEAN DEFAULT FALSE,
  deactivated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_did_method ON did_documents(method);
CREATE INDEX idx_did_user_id ON did_documents(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_did_controller ON did_documents(controller);
CREATE INDEX idx_did_created_at ON did_documents(created_at);
CREATE INDEX idx_did_deactivated ON did_documents(deactivated) WHERE deactivated = TRUE;
CREATE INDEX idx_did_document ON did_documents USING GIN(document);

-- Enable Row Level Security
ALTER TABLE did_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Public read for DID resolution
CREATE POLICY did_read_policy ON did_documents
  FOR SELECT
  USING (TRUE); -- DIDs are public by design

-- Policy: Users can only insert/update their own DIDs
CREATE POLICY did_insert_policy ON did_documents
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY did_update_policy ON did_documents
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create table for DID resolution cache
CREATE TABLE IF NOT EXISTS did_resolution_cache (
  did VARCHAR(255) PRIMARY KEY,
  document JSONB NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cache_ttl INTEGER DEFAULT 3600, -- TTL in seconds
  source VARCHAR(100), -- 'local', 'universal-resolver', 'blockchain', etc.
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_drc_resolved_at ON did_resolution_cache(resolved_at);
CREATE INDEX idx_drc_source ON did_resolution_cache(source);

-- No RLS on cache table (internal only)

-- Create table for DID method configuration
CREATE TABLE IF NOT EXISTS did_method_config (
  method VARCHAR(50) PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  resolver_url VARCHAR(500), -- External resolver endpoint
  blockchain_network VARCHAR(100), -- For blockchain-based methods
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default methods
INSERT INTO did_method_config (method, enabled, resolver_url) VALUES
  ('key', TRUE, NULL),
  ('ethr', TRUE, 'https://dev.uniresolver.io/1.0/identifiers'),
  ('web', TRUE, NULL),
  ('pq', TRUE, NULL)
ON CONFLICT (method) DO NOTHING;

-- Create table for DID relationships
CREATE TABLE IF NOT EXISTS did_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_did VARCHAR(255) NOT NULL REFERENCES did_documents(did) ON DELETE CASCADE,
  object_did VARCHAR(255) NOT NULL,
  relationship_type VARCHAR(50) NOT NULL, -- 'controller', 'delegate', 'service-provider', etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT FALSE,
  UNIQUE(subject_did, object_did, relationship_type)
);

CREATE INDEX idx_didr_subject_did ON did_relationships(subject_did);
CREATE INDEX idx_didr_object_did ON did_relationships(object_did);
CREATE INDEX idx_didr_relationship_type ON did_relationships(relationship_type);
CREATE INDEX idx_didr_expires_at ON did_relationships(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE did_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY didr_read_policy ON did_relationships
  FOR SELECT
  USING (TRUE); -- Public read

CREATE POLICY didr_write_policy ON did_relationships
  FOR ALL
  USING (
    subject_did IN (SELECT did FROM did_documents WHERE user_id = auth.uid())
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_did_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_did_updated_at
  BEFORE UPDATE ON did_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_did_updated_at();

CREATE TRIGGER trigger_update_did_method_config_updated_at
  BEFORE UPDATE ON did_method_config
  FOR EACH ROW
  EXECUTE FUNCTION update_did_updated_at();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_did_resolution_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM did_resolution_cache
  WHERE resolved_at + (cache_ttl || ' seconds')::interval < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE did_documents IS 'W3C DID Documents storage';
COMMENT ON TABLE did_resolution_cache IS 'Cache for resolved DID documents';
COMMENT ON TABLE did_method_config IS 'Configuration for supported DID methods';
COMMENT ON TABLE did_relationships IS 'Relationships between DIDs';
