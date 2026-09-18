-- ============================================================
-- BEL SENTINEL — Migration: Access Code + Document Access Logs
-- + Admin Account Seed
-- ============================================================

-- Add access_code column to profiles (6-digit unique code per user)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_code VARCHAR(6) UNIQUE;

-- Create index for fast access code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_access_code ON profiles(access_code);

-- Document access log table for blockchain audit trail
CREATE TABLE IF NOT EXISTS document_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id UUID,
    document_name VARCHAR(500),
    access_code_used VARCHAR(6) NOT NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'VIEW',
    tx_hash VARCHAR(66),
    ip_address VARCHAR(45),
    user_agent TEXT,
    role VARCHAR(20),
    department VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_access_profile ON document_access_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_code ON document_access_logs(access_code_used);
CREATE INDEX IF NOT EXISTS idx_doc_access_created ON document_access_logs(created_at);

-- ============================================================
-- SEED: Admin Account (pre-seeded)
-- Password: admin123 (hashed with pgcrypto)
-- ============================================================

-- Insert admin profile if not exists
INSERT INTO profiles (
    username,
    password_hash,
    email,
    full_name,
    display_name,
    department,
    clearance,
    is_admin,
    status,
    access_code,
    criminal_check_status,
    criminal_check_timestamp
) VALUES (
    'admin',
    crypt('admin123', gen_salt('bf')),
    'admin@bel-sentinel.gov',
    'System Administrator',
    'Admin',
    'Command & Control',
    'TOP SECRET // SCI',
    TRUE,
    'ACTIVE',
    '000000',
    'CLEARED',
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- Ensure admin has the ADMIN role
INSERT INTO user_roles (profile_id, role_id, is_active)
SELECT p.id, r.id, TRUE
FROM profiles p, roles r
WHERE p.username = 'admin' AND r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Create verify_password function if it doesn't exist
CREATE OR REPLACE FUNCTION verify_password(p_username VARCHAR, p_password VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    stored_hash TEXT;
BEGIN
    SELECT password_hash INTO stored_hash
    FROM profiles
    WHERE username = p_username AND status = 'ACTIVE';
    
    IF stored_hash IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN stored_hash = crypt(p_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
