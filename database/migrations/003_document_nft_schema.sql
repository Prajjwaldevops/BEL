-- ============================================================
-- BEL SENTINEL — Document NFT Schema Migration
-- Extends the existing documents table with NFT, encryption,
-- versioning, revocation, and ownership fields.
-- 
-- NON-DESTRUCTIVE: Does not drop or alter existing columns.
-- ============================================================

-- 1. Extend document_status enum with new states
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'UPLOADED';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'STORED';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'PENDING_MINT';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'MINTING';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'MINTED';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'TRANSFERRED';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'REVOKED';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'SUPERSEDED';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'FAILED';

-- 2. Add new columns to existing documents table
-- Document identification
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_id VARCHAR(50) UNIQUE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS classification VARCHAR(50) DEFAULT 'UNCLASSIFIED';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Hashes
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata_hash VARCHAR(66);

-- Storage
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_version VARCHAR(255);

-- Encryption
ALTER TABLE documents ADD COLUMN IF NOT EXISTS encryption_iv TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS encryption_tag TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100);

-- Ownership
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_wallet VARCHAR(42);

-- NFT
ALTER TABLE documents ADD COLUMN IF NOT EXISTS nft_contract_address VARCHAR(42);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS nft_token_id VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS chain_id INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mint_tx_hash VARCHAR(66);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mint_block_number BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mint_gas_used VARCHAR(78);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mint_gas_price VARCHAR(78);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mint_status VARCHAR(20) DEFAULT 'UPLOADED';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS transferable BOOLEAN DEFAULT true;

-- Lifecycle
ALTER TABLE documents ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES profiles(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revocation_reason TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES documents(id);

-- Stats
ALTER TABLE documents ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;

-- 3. Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_documents_document_id ON documents(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_owner_wallet ON documents(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_documents_nft_token_id ON documents(nft_token_id);
CREATE INDEX IF NOT EXISTS idx_documents_mint_status ON documents(mint_status);
CREATE INDEX IF NOT EXISTS idx_documents_mint_tx_hash ON documents(mint_tx_hash);
CREATE INDEX IF NOT EXISTS idx_documents_classification ON documents(classification);
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(version);

-- 4. Document verification log table
CREATE TABLE IF NOT EXISTS document_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    verifier_id UUID REFERENCES profiles(id),
    verifier_wallet VARCHAR(42),
    verification_method VARCHAR(50) NOT NULL CHECK (verification_method IN ('FILE_HASH', 'DOCUMENT_ID', 'NFT_LOOKUP', 'QR_CODE')),
    provided_hash VARCHAR(66),
    result VARCHAR(20) NOT NULL CHECK (result IN ('VERIFIED', 'TAMPERED', 'REVOKED', 'EXPIRED', 'NOT_FOUND', 'MISMATCH')),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_verifications_document ON document_verifications(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_verifications_result ON document_verifications(result);
CREATE INDEX IF NOT EXISTS idx_doc_verifications_created ON document_verifications(created_at DESC);

-- 5. Document ownership transfer history
CREATE TABLE IF NOT EXISTS document_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    from_wallet VARCHAR(42) NOT NULL,
    to_wallet VARCHAR(42) NOT NULL,
    token_id VARCHAR(100),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    chain_id INTEGER,
    initiated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_transfers_document ON document_transfers(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_transfers_from ON document_transfers(from_wallet);
CREATE INDEX IF NOT EXISTS idx_doc_transfers_to ON document_transfers(to_wallet);
CREATE INDEX IF NOT EXISTS idx_doc_transfers_created ON document_transfers(created_at DESC);

-- 6. Function to generate human-readable document IDs
CREATE OR REPLACE FUNCTION generate_document_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    IF NEW.document_id IS NULL THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(document_id FROM 'BEL-DOC-(\d+)') AS INTEGER)), 0) + 1
        INTO next_num
        FROM documents
        WHERE document_id LIKE 'BEL-DOC-%';
        
        NEW.document_id := 'BEL-DOC-' || LPAD(next_num::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'tr_documents_generate_id'
    ) THEN
        CREATE TRIGGER tr_documents_generate_id
            BEFORE INSERT ON documents
            FOR EACH ROW
            EXECUTE FUNCTION generate_document_id();
    END IF;
END;
$$;

-- 7. Enable RLS on new tables
ALTER TABLE document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_transfers ENABLE ROW LEVEL SECURITY;

-- Basic RLS: authenticated users can read verification logs, only system inserts
CREATE POLICY doc_verifications_select ON document_verifications FOR SELECT USING (true);
CREATE POLICY doc_verifications_insert ON document_verifications FOR INSERT WITH CHECK (true);

CREATE POLICY doc_transfers_select ON document_transfers FOR SELECT USING (true);
CREATE POLICY doc_transfers_insert ON document_transfers FOR INSERT WITH CHECK (true);
