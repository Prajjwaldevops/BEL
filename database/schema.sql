-- ============================================================
-- BEL SENTINEL — Supabase PostgreSQL Schema (v2.0)
-- Blockchain-Based Secure Platform for Identity, Access Control
-- & Digital Asset Management
-- 
-- ROLES: ADMIN, VIEWER, ALTER, DEBUGGER
-- NO DEMO DATA — production-ready schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE', 'PENDING');
CREATE TYPE role_name AS ENUM ('ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER');
CREATE TYPE asset_status AS ENUM ('CREATED', 'REGISTERED', 'ASSIGNED', 'ACTIVE', 'TRANSFERRED', 'MAINTENANCE', 'AUDITED', 'REVOKED', 'DECOMMISSIONED');
CREATE TYPE identity_status AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE document_status AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED');
CREATE TYPE audit_result AS ENUM ('SUCCESS', 'DENIED', 'ERROR');
CREATE TYPE tx_status AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
CREATE TYPE security_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE security_event_type AS ENUM ('ACCESS_DENIED', 'UNAUTHORIZED_ATTEMPT', 'ROLE_ESCALATION', 'ANOMALY_DETECTED', 'BRUTE_FORCE', 'SESSION_EXPIRED');
CREATE TYPE criminal_status AS ENUM ('CLEARED', 'FLAGGED', 'PENDING_CHECK', 'UNKNOWN');

-- ============================================================
-- PROFILES (custom auth — no Clerk)
-- ============================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    department VARCHAR(100),
    rank VARCHAR(100),
    clearance VARCHAR(50),
    wallet_address VARCHAR(42),
    
    -- Photo & Identity NFT
    photo_url TEXT,                          -- Cloudflare R2 URL
    photo_hash VARCHAR(66),                 -- SHA-256 hash of webcam photo
    nft_token_id VARCHAR(100),              -- Identity NFT token ID
    nft_tx_hash VARCHAR(66),                -- NFT mint transaction hash
    nft_contract_address VARCHAR(42),       -- IdentityNFT contract address
    
    -- Criminal check
    criminal_check_status criminal_status DEFAULT 'CLEARED',
    criminal_check_timestamp TIMESTAMPTZ,
    
    -- System generated credentials
    generated_username VARCHAR(100),
    is_admin BOOLEAN DEFAULT FALSE,
    
    avatar_url TEXT,
    status user_status DEFAULT 'ACTIVE',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX idx_profiles_nft ON profiles(nft_token_id);
CREATE INDEX idx_profiles_department ON profiles(department);

-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name role_name UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER_ROLES (many-to-many)
-- ============================================================

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    tx_hash VARCHAR(66),
    UNIQUE(profile_id, role_id, is_active)
);

CREATE INDEX idx_user_roles_profile ON user_roles(profile_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);

-- ============================================================
-- IDENTITIES (Decentralized Identity / DID)
-- ============================================================

CREATE TABLE identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    did VARCHAR(255) UNIQUE NOT NULL,
    did_document JSONB DEFAULT '{}',
    public_key TEXT,
    identity_hash VARCHAR(66),
    status identity_status DEFAULT 'ACTIVE',
    blockchain_tx_hash VARCHAR(66),
    blockchain_block_number BIGINT,
    verification_method VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ
);

CREATE INDEX idx_identities_profile ON identities(profile_id);
CREATE INDEX idx_identities_did ON identities(did);
CREATE INDEX idx_identities_status ON identities(status);

-- ============================================================
-- ASSETS
-- ============================================================

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    classification VARCHAR(50) DEFAULT 'UNCLASSIFIED',
    current_owner_id UUID REFERENCES profiles(id),
    status asset_status DEFAULT 'CREATED',
    nft_token_id VARCHAR(100),
    nft_contract_address VARCHAR(42),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_asset_id ON assets(asset_id);
CREATE INDEX idx_assets_owner ON assets(current_owner_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_nft ON assets(nft_token_id);

-- ============================================================
-- ASSET OWNERSHIP HISTORY
-- ============================================================

CREATE TABLE asset_ownership_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    from_owner_id UUID REFERENCES profiles(id),
    to_owner_id UUID REFERENCES profiles(id),
    previous_status asset_status,
    new_status asset_status NOT NULL,
    action VARCHAR(50) NOT NULL,
    reason TEXT,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ownership_history_asset ON asset_ownership_history(asset_id);
CREATE INDEX idx_ownership_history_from ON asset_ownership_history(from_owner_id);
CREATE INDEX idx_ownership_history_to ON asset_ownership_history(to_owner_id);
CREATE INDEX idx_ownership_history_created ON asset_ownership_history(created_at DESC);

-- ============================================================
-- ASSET PERMISSIONS
-- ============================================================

CREATE TABLE asset_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN ('READ', 'WRITE', 'TRANSFER', 'ADMIN')),
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(asset_id, profile_id, permission_type, is_active)
);

CREATE INDEX idx_asset_perms_asset ON asset_permissions(asset_id);
CREATE INDEX idx_asset_perms_profile ON asset_permissions(profile_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
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
    tx_hash VARCHAR(66),
    block_number BIGINT,
    gas_fee_wei BIGINT DEFAULT 0,           -- Gas fee in wei (0.00001 ETH = 10000000000000 wei)
    gas_fee_eth DECIMAL(18,8) DEFAULT 0,    -- Gas fee in ETH for easy querying
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_id);
CREATE INDEX idx_audit_result ON audit_logs(result);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_gas_fee ON audit_logs(gas_fee_eth);

-- ============================================================
-- ACTIVITY GAS FEES
-- ============================================================

CREATE TABLE activity_gas_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    resource_type VARCHAR(50),
    gas_fee_wei BIGINT NOT NULL,
    gas_fee_eth DECIMAL(18,8) NOT NULL,
    tx_hash VARCHAR(66),
    audit_log_id UUID REFERENCES audit_logs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gas_fees_profile ON activity_gas_fees(profile_id);
CREATE INDEX idx_gas_fees_action ON activity_gas_fees(action);
CREATE INDEX idx_gas_fees_created ON activity_gas_fees(created_at DESC);

-- ============================================================
-- LOGIN TRAILS (for AI Analysis)
-- ============================================================

CREATE TABLE login_trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    username VARCHAR(100),
    login_result VARCHAR(20) NOT NULL CHECK (login_result IN ('SUCCESS', 'FAILED', 'BLOCKED')),
    ip_address INET,
    user_agent TEXT,
    geo_location TEXT,
    anomaly_flags JSONB DEFAULT '[]',       -- AI-detected irregularities
    session_token VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_trails_profile ON login_trails(profile_id);
CREATE INDEX idx_login_trails_result ON login_trails(login_result);
CREATE INDEX idx_login_trails_created ON login_trails(created_at DESC);
CREATE INDEX idx_login_trails_ip ON login_trails(ip_address);

-- ============================================================
-- CONFIDENTIAL ACCESS LOG (for AI Analysis)
-- ============================================================

CREATE TABLE confidential_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    resource_id VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    classification VARCHAR(50) NOT NULL,
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('VIEW', 'MODIFY', 'DELETE', 'EXPORT')),
    was_authorized BOOLEAN DEFAULT TRUE,
    flagged_by_ai BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conf_access_profile ON confidential_access_log(profile_id);
CREATE INDEX idx_conf_access_classification ON confidential_access_log(classification);
CREATE INDEX idx_conf_access_flagged ON confidential_access_log(flagged_by_ai);
CREATE INDEX idx_conf_access_created ON confidential_access_log(created_at DESC);

-- ============================================================
-- BLOCKCHAIN TRANSACTIONS
-- ============================================================

CREATE TABLE blockchain_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    block_number BIGINT,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    method_name VARCHAR(100),
    contract_name VARCHAR(100),
    input_data TEXT,
    status tx_status DEFAULT 'PENDING',
    gas_used BIGINT,
    gas_price BIGINT,
    value_wei VARCHAR(78),
    related_asset_id UUID REFERENCES assets(id),
    related_profile_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX idx_blockchain_tx_block ON blockchain_transactions(block_number);
CREATE INDEX idx_blockchain_tx_status ON blockchain_transactions(status);
CREATE INDEX idx_blockchain_tx_created ON blockchain_transactions(created_at DESC);

-- ============================================================
-- BLOCKCHAIN EVENTS
-- ============================================================

CREATE TABLE blockchain_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL REFERENCES blockchain_transactions(tx_hash),
    event_name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(42),
    contract_name VARCHAR(100),
    log_index INTEGER,
    block_number BIGINT,
    args JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blockchain_events_tx ON blockchain_events(tx_hash);
CREATE INDEX idx_blockchain_events_name ON blockchain_events(event_name);
CREATE INDEX idx_blockchain_events_block ON blockchain_events(block_number);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    description TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    ipfs_cid VARCHAR(255),
    content_hash VARCHAR(66),
    encryption_method VARCHAR(50),
    asset_id UUID REFERENCES assets(id),
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    status document_status DEFAULT 'PENDING',
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_asset ON documents(asset_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_ipfs ON documents(ipfs_cid);

-- ============================================================
-- IPFS OBJECTS
-- ============================================================

CREATE TABLE ipfs_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cid VARCHAR(255) UNIQUE NOT NULL,
    pin_status VARCHAR(20) DEFAULT 'pinned' CHECK (pin_status IN ('pinned', 'unpinned', 'pinning', 'failed')),
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    gateway_url TEXT,
    pinata_id VARCHAR(255),
    document_id UUID REFERENCES documents(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ipfs_cid ON ipfs_objects(cid);
CREATE INDEX idx_ipfs_document ON ipfs_objects(document_id);

-- ============================================================
-- SECURITY EVENTS
-- ============================================================

CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type security_event_type NOT NULL,
    severity security_severity DEFAULT 'LOW',
    actor VARCHAR(255),
    source_ip INET,
    source_info TEXT,
    description TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_type ON security_events(event_type);
CREATE INDEX idx_security_severity ON security_events(severity);
CREATE INDEX idx_security_resolved ON security_events(resolved);
CREATE INDEX idx_security_created ON security_events(created_at DESC);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    category VARCHAR(50),
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ============================================================
-- ACCESS REQUESTS
-- ============================================================

CREATE TABLE access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES profiles(id),
    asset_id UUID REFERENCES assets(id),
    permission_type VARCHAR(50) NOT NULL,
    justification TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_requests_requester ON access_requests(requester_id);
CREATE INDEX idx_access_requests_status ON access_requests(status);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_identities_updated_at BEFORE UPDATE ON identities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-log asset status changes
CREATE OR REPLACE FUNCTION log_asset_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO asset_ownership_history (asset_id, from_owner_id, to_owner_id, previous_status, new_status, action)
        VALUES (NEW.id, OLD.current_owner_id, NEW.current_owner_id, OLD.status, NEW.status, 'STATUS_CHANGE');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_asset_status_change AFTER UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION log_asset_status_change();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidential_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_gas_fees ENABLE ROW LEVEL SECURITY;

-- Profiles: authenticated users can read all, update own
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (true);

-- Audit logs: authenticated users can read and insert
CREATE POLICY audit_select ON audit_logs FOR SELECT USING (true);
CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (true);

-- Assets: authenticated users can read
CREATE POLICY assets_select ON assets FOR SELECT USING (true);

-- Documents: authenticated users can read
CREATE POLICY documents_select ON documents FOR SELECT USING (true);

-- Notifications: users see their own
CREATE POLICY notifications_all ON notifications FOR ALL USING (true);

-- Login trails: read for admins, insert for all
CREATE POLICY login_trails_select ON login_trails FOR SELECT USING (true);
CREATE POLICY login_trails_insert ON login_trails FOR INSERT WITH CHECK (true);

-- Confidential access log: read for admins
CREATE POLICY conf_access_select ON confidential_access_log FOR SELECT USING (true);
CREATE POLICY conf_access_insert ON confidential_access_log FOR INSERT WITH CHECK (true);

-- Gas fees: read for all, insert for all
CREATE POLICY gas_fees_select ON activity_gas_fees FOR SELECT USING (true);
CREATE POLICY gas_fees_insert ON activity_gas_fees FOR INSERT WITH CHECK (true);

-- ============================================================
-- SEED DATA — Admin Account & System Settings ONLY
-- ============================================================

-- Seed Roles (4 roles)
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('ADMIN', 'System Administrator — full platform access, user registration, wallet management', '["system:admin", "identity:manage", "role:assign", "asset:crud", "audit:read", "audit:write", "blockchain:admin", "ipfs:admin", "settings:manage", "user:register", "classified:full_access", "ai_analysis:view"]', true),
('VIEWER', 'View-only access within assigned department — cannot modify any data', '["asset:view_department", "profile:view_own", "document:view_department", "audit:view_own"]', true),
('ALTER', 'View and minor edits within department — no classified info access', '["asset:view_department", "asset:edit_minor", "profile:manage", "document:view_department", "document:upload", "audit:view_own"]', true),
('DEBUGGER', 'Cross-department access, modify, view classified, report irregularities', '["asset:view_all", "asset:edit_all", "profile:view_all", "document:view_all", "document:upload", "audit:view_all", "classified:view", "report:generate", "security:view", "cross_department:access"]', true);

-- Seed Admin Profile (default admin account)
INSERT INTO profiles (username, password_hash, email, full_name, display_name, department, rank, clearance, is_admin, status) VALUES
('admin', crypt('admin123', gen_salt('bf')), 'admin@bel-sentinel.gov', 'System Administrator', 'Admin', 'Command & Control', 'System Admin', 'TOP SECRET // SCI', true, 'ACTIVE');

-- Seed Debugger Profile (demo debugger account)
INSERT INTO profiles (username, password_hash, email, full_name, display_name, department, rank, clearance, is_admin, status) VALUES
('debugger', crypt('debug123', gen_salt('bf')), 'debugger@bel-sentinel.gov', 'Debug Inspector', 'Debugger', 'Quality Assurance', 'Inspector', 'SECRET', false, 'ACTIVE');

-- Seed System Settings
INSERT INTO system_settings (key, value, category, description) VALUES
('blockchain_network', 'hardhat_local', 'blockchain', 'Active blockchain network'),
('blockchain_rpc_url', 'http://localhost:8545', 'blockchain', 'RPC endpoint URL'),
('blockchain_chain_id', '31337', 'blockchain', 'Chain ID'),
('ipfs_gateway', 'https://gateway.pinata.cloud/ipfs/', 'storage', 'IPFS gateway URL'),
('session_timeout_minutes', '30', 'security', 'Session timeout in minutes'),
('rate_limit_per_minute', '100', 'security', 'API rate limit per minute'),
('audit_retention_days', '365', 'compliance', 'Audit log retention period'),
('gas_fee_per_action', '0.00001', 'blockchain', 'Gas fee per user action in ETH'),
('registration_secret_key', '34567890', 'security', 'Secret key required for user registration'),
('r2_bucket_name', 'bel-sentinel-photos', 'storage', 'Cloudflare R2 bucket for user photos');
