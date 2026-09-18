-- ============================================================
-- Migration: Add Audit Log Batching with Merkle Root Anchoring
-- Date: 2026-09-17
-- Purpose: Replace per-event on-chain logging with batched Merkle
--          root anchoring to reduce gas costs by ~100x while
--          maintaining tamper-evidence
-- ============================================================

-- Create audit_log_queue table for pending events
CREATE TABLE IF NOT EXISTS audit_log_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id),
    actor_role role_name,
    action VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    resource_type VARCHAR(50),
    result audit_result DEFAULT 'SUCCESS',
    details TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    event_hash VARCHAR(66),  -- SHA-256 hash of event data
    batch_id UUID,           -- References audit_batches when anchored
    anchored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_batches table for Merkle root anchoring
CREATE TABLE IF NOT EXISTS audit_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merkle_root VARCHAR(66) NOT NULL,  -- Root hash of Merkle tree
    event_count INTEGER NOT NULL,
    start_event_id UUID NOT NULL,      -- First event in batch
    end_event_id UUID NOT NULL,        -- Last event in batch
    tx_hash VARCHAR(66),                -- Blockchain transaction hash
    block_number BIGINT,
    gas_used BIGINT,
    anchored_by UUID REFERENCES profiles(id),
    anchored_at TIMESTAMPTZ DEFAULT NOW(),
    batch_data JSONB DEFAULT '{}',     -- Merkle tree structure for verification
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create merkle_proofs table for individual event verification
CREATE TABLE IF NOT EXISTS merkle_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES audit_log_queue(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES audit_batches(id) ON DELETE CASCADE,
    leaf_index INTEGER NOT NULL,        -- Position in Merkle tree
    proof JSONB NOT NULL,               -- Array of sibling hashes for verification path
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, batch_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_queue_batch ON audit_log_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_queue_anchored ON audit_log_queue(anchored) WHERE anchored = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_queue_created ON audit_log_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_queue_actor ON audit_log_queue(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_queue_action ON audit_log_queue(action);

CREATE INDEX IF NOT EXISTS idx_audit_batches_tx ON audit_batches(tx_hash);
CREATE INDEX IF NOT EXISTS idx_audit_batches_block ON audit_batches(block_number);
CREATE INDEX IF NOT EXISTS idx_audit_batches_created ON audit_batches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_merkle_proofs_event ON merkle_proofs(event_id);
CREATE INDEX IF NOT EXISTS idx_merkle_proofs_batch ON merkle_proofs(batch_id);

-- Function to compute SHA-256 hash of event data
CREATE OR REPLACE FUNCTION compute_event_hash(
    p_actor_id UUID,
    p_action VARCHAR,
    p_resource_id VARCHAR,
    p_resource_type VARCHAR,
    p_result audit_result,
    p_details TEXT,
    p_created_at TIMESTAMPTZ
)
RETURNS VARCHAR(66) AS $$
BEGIN
    RETURN '0x' || encode(
        digest(
            COALESCE(p_actor_id::TEXT, '') || '|' ||
            COALESCE(p_action, '') || '|' ||
            COALESCE(p_resource_id, '') || '|' ||
            COALESCE(p_resource_type, '') || '|' ||
            COALESCE(p_result::TEXT, '') || '|' ||
            COALESCE(p_details, '') || '|' ||
            COALESCE(p_created_at::TEXT, ''),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to automatically compute event hash on insert
CREATE OR REPLACE FUNCTION set_event_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.event_hash := compute_event_hash(
        NEW.actor_id,
        NEW.action,
        NEW.resource_id,
        NEW.resource_type,
        NEW.result,
        NEW.details,
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_audit_queue_set_hash
    BEFORE INSERT ON audit_log_queue
    FOR EACH ROW
    EXECUTE FUNCTION set_event_hash();

-- Function to get pending events count
CREATE OR REPLACE FUNCTION get_pending_audit_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM audit_log_queue WHERE anchored = FALSE)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE audit_log_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE merkle_proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (similar to audit_logs)
CREATE POLICY audit_queue_select ON audit_log_queue FOR SELECT USING (true);
CREATE POLICY audit_queue_insert ON audit_log_queue FOR INSERT WITH CHECK (true);

CREATE POLICY audit_batches_select ON audit_batches FOR SELECT USING (true);
CREATE POLICY audit_batches_insert ON audit_batches FOR INSERT WITH CHECK (true);

CREATE POLICY merkle_proofs_select ON merkle_proofs FOR SELECT USING (true);

-- Comments
COMMENT ON TABLE audit_log_queue IS 'Off-chain queue for audit events pending batch anchoring';
COMMENT ON TABLE audit_batches IS 'On-chain anchored Merkle roots for batches of audit events';
COMMENT ON TABLE merkle_proofs IS 'Merkle proof paths for individual event verification against anchored roots';

COMMENT ON COLUMN audit_log_queue.event_hash IS 'SHA-256 hash of event data - used as Merkle tree leaf';
COMMENT ON COLUMN audit_batches.merkle_root IS 'Root hash of Merkle tree - anchored on blockchain';
COMMENT ON COLUMN merkle_proofs.proof IS 'Array of sibling hashes forming verification path to root';

-- Add system setting for batch configuration
INSERT INTO system_settings (key, value, category, description) VALUES
('audit_batch_size', '100', 'audit', 'Number of events to batch before anchoring'),
('audit_batch_interval_minutes', '60', 'audit', 'Maximum time between batch anchoring (minutes)'),
('audit_batch_enabled', 'true', 'audit', 'Enable batched audit logging (false = direct on-chain)');

-- Audit log entry for migration
INSERT INTO audit_logs (
    action,
    resource_type,
    result,
    details,
    metadata
) VALUES (
    'MIGRATION_APPLIED',
    'database',
    'SUCCESS',
    'Added audit batching with Merkle root anchoring',
    jsonb_build_object(
        'migration', '20260917_002_add_audit_batching',
        'tables_created', ARRAY['audit_log_queue', 'audit_batches', 'merkle_proofs'],
        'gas_savings', 'Expected ~100x reduction in gas costs',
        'tamper_evidence', 'Maintained via Merkle proof verification'
    )
);

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================
-- To rollback this migration:
-- 
-- DROP TABLE IF EXISTS merkle_proofs CASCADE;
-- DROP TABLE IF EXISTS audit_batches CASCADE;
-- DROP TABLE IF EXISTS audit_log_queue CASCADE;
-- DROP FUNCTION IF EXISTS compute_event_hash(UUID, VARCHAR, VARCHAR, VARCHAR, audit_result, TEXT, TIMESTAMPTZ);
-- DROP FUNCTION IF EXISTS set_event_hash();
-- DROP FUNCTION IF EXISTS get_pending_audit_count();
-- DELETE FROM system_settings WHERE key IN ('audit_batch_size', 'audit_batch_interval_minutes', 'audit_batch_enabled');
-- ============================================================
