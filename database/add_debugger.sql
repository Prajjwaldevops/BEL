-- ============================================================
-- BEL SENTINEL — Reset & Rebuild Schema
-- Drops old tables/types and re-creates everything fresh
-- ============================================================

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS access_requests CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS ipfs_objects CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS blockchain_events CASCADE;
DROP TABLE IF EXISTS blockchain_transactions CASCADE;
DROP TABLE IF EXISTS confidential_access_log CASCADE;
DROP TABLE IF EXISTS login_trails CASCADE;
DROP TABLE IF EXISTS activity_gas_fees CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS asset_permissions CASCADE;
DROP TABLE IF EXISTS asset_ownership_history CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS identities CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop types
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS role_name CASCADE;
DROP TYPE IF EXISTS asset_status CASCADE;
DROP TYPE IF EXISTS identity_status CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;
DROP TYPE IF EXISTS audit_result CASCADE;
DROP TYPE IF EXISTS tx_status CASCADE;
DROP TYPE IF EXISTS security_severity CASCADE;
DROP TYPE IF EXISTS security_event_type CASCADE;
DROP TYPE IF EXISTS criminal_status CASCADE;
