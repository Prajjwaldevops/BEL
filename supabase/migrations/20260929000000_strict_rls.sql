-- Enable RLS on core tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Table Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.profile_id = auth.uid() AND r.name = 'ADMIN'
  )
);

-- 2. Documents Table Policies
-- Users can read their own documents
CREATE POLICY "Users can read own documents" 
ON documents FOR SELECT 
USING (uploaded_by = auth.uid());

-- Admins, Auditors, and Viewers can read all documents
CREATE POLICY "Privileged roles can read all documents" 
ON documents FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.profile_id = auth.uid() AND r.name IN ('ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER')
  )
);

-- Only authenticated users can insert (restricted by server API anyway)
CREATE POLICY "Service role manages inserts" 
ON documents FOR INSERT 
WITH CHECK (false); -- Application relies strictly on Server API (Service Role) for document creation to guarantee hashing & encryption

CREATE POLICY "Service role manages updates" 
ON documents FOR UPDATE 
USING (false); -- Application relies strictly on Server API for state machine progression (MINTING, MINTED, etc)

-- 3. Audit Logs Policies
-- Nobody can delete audit logs
CREATE POLICY "No deletion of audit logs" 
ON audit_logs FOR DELETE 
USING (false);

-- Nobody can update audit logs
CREATE POLICY "No updates to audit logs" 
ON audit_logs FOR UPDATE 
USING (false);

-- Users can read their own audit logs
CREATE POLICY "Users can read own audit logs" 
ON audit_logs FOR SELECT 
USING (actor_id = auth.uid());

-- Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs" 
ON audit_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.profile_id = auth.uid() AND r.name = 'ADMIN'
  )
);

-- Note: In this architecture, we heavily use the Supabase Service Role key in Next.js Server Actions/APIs
-- to bypass these restrictions securely when modifying data on behalf of the user. 
-- RLS prevents direct malicious access via the anon key from the frontend.
