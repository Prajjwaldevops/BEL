# Changelog

All notable changes to the BEL Secure Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Part A: Security Hardening

#### A1: Self-Custodial Custody Model (2026-09-17)

**What Changed:**
- Implemented self-custodial wallet architecture where users control their own private keys
- Users now connect via MetaMask, WalletConnect, or Coinbase Wallet
- Backend NEVER stores or manages user private keys

**Why:**
- Aligns with "decentralized identity" and "self-sovereign" claims in documentation
- Eliminates single point of compromise for user keys
- Industry best practice for Web3 applications
- Provides true user ownership of identity

**Technical Implementation:**
- Added `wagmi` v2.x + `viem` v2.x for Web3 integration
- Created `Web3Provider` wrapper with React Query integration
- Built `WalletConnect` component for user wallet connection UI
- Implemented `web3-config.ts` with support for multiple chains (Hardhat local, Sepolia, Polygon, Optimism)
- Created `admin-wallet.ts` with KMS support (AWS KMS, Azure Key Vault, HashiCorp Vault)
- Backend admin wallet restricted to:
  - Contract deployment only
  - System operations (batch audit anchoring)
  - NOT used for user-facing transactions

**Files Added:**
- `src/lib/web3-config.ts` - Web3 configuration and chain setup
- `src/providers/Web3Provider.tsx` - React context provider
- `src/components/WalletConnect.tsx` - Wallet connection UI component
- `src/lib/admin-wallet.ts` - Secure admin wallet management with KMS
- `docs/CUSTODY_MODEL.md` - Detailed custody model documentation
- `ARCHITECTURE.md` - System architecture overview
- `database/migrations/README.md` - Migration guidelines

**Files Modified:**
- `package.json` - Added wagmi, viem, ethers, @supabase/supabase-js, @tanstack/react-query
- `.env.example` - Added wallet configuration, removed managed custody references
- `README.md` - Updated with self-custodial architecture explanation

**Dependencies Added:**
- `wagmi@^2.14.8` - React hooks for Ethereum
- `viem@^2.21.54` - TypeScript Ethereum library
- `ethers@^6.13.4` - Ethereum wallet utilities
- `@tanstack/react-query@^5.62.14` - State management
- `@supabase/supabase-js@^2.45.0` - Supabase client

**Migration Path:**
- No migration needed (system not yet in production)
- For future: users would claim existing identities by signing with new wallet

**Security Improvements:**
- ✅ No private keys in backend storage
- ✅ KMS support for production admin wallet
- ✅ Clear separation: user wallets vs admin wallet
- ✅ Transaction signing always requires user approval

**Documentation:**
- Comprehensive custody model explanation in `docs/CUSTODY_MODEL.md`
- Architecture decisions documented in `ARCHITECTURE.md`
- User onboarding guidelines (wallet setup, seed phrase backup, gas fees)
- Admin wallet security requirements (KMS, key rotation policy)

**Next Steps:**
- Users need to install wallet before registration
- Onboarding flow will include wallet education
- Guardian recovery system (Feature B1) will mitigate key loss risk
- Gas subsidies or L2 deployment will reduce transaction costs

---

#### A2: Invite Token System (2026-09-17)

**What Changed:**
- Replaced static `registration_secret_key` with secure invite token system
- Admins now generate single-use, time-limited tokens for new user registration
- Tokens can be targeted to specific email addresses and departments
- Automatic cleanup of expired tokens via cron job

**Why:**
- Static secret key is insecure (shared, never rotates, can't be revoked)
- Invite tokens provide:
  - Single-use: Can't be reused after registration
  - Time-limited: Auto-expire after configurable period (default 7 days)
  - Trackable: Audit trail of who created/used each token
  - Revocable: Admins can manually deactivate tokens
  - Targeted: Can specify intended email/department for validation

**Technical Implementation:**
- New table: `invite_tokens` with RLS policies
- Secure token generation using cryptographically random bytes (32 bytes = 64 hex chars)
- API endpoints:
  - `POST /api/invite-tokens/create` - Generate new token (admin only)
  - `POST /api/invite-tokens/validate` - Check if token is valid
  - `GET /api/invite-tokens/list` - View all tokens (admin only)
  - `POST /api/invite-tokens/revoke` - Deactivate token (admin only)
- Cron job: `GET /api/cron/cleanup-expired-tokens` - Runs daily to clean up
- React component: `InviteTokenManager` for admin dashboard

**Database Changes:**
```sql
CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  issued_by UUID REFERENCES profiles(id),
  intended_email VARCHAR(255),
  intended_department VARCHAR(100),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE
);
DELETE FROM system_settings WHERE key = 'registration_secret_key';
```

**Files Added:**
- `database/migrations/20260917_001_add_invite_tokens.sql` - Migration script
- `src/lib/invite-tokens.ts` - Token management logic
- `src/app/api/invite-tokens/create/route.ts` - Create token endpoint
- `src/app/api/invite-tokens/validate/route.ts` - Validate token endpoint
- `src/app/api/invite-tokens/list/route.ts` - List tokens endpoint
- `src/app/api/invite-tokens/revoke/route.ts` - Revoke token endpoint
- `src/app/api/cron/cleanup-expired-tokens/route.ts` - Cron cleanup job
- `src/components/InviteTokenManager.tsx` - Admin UI component
- `vercel.json` - Cron configuration

**Files Modified:**
- `src/lib/constants.ts` - Removed REGISTRATION_SECRET_KEY, added deprecation notice
- `.env.example` - Added CRON_SECRET

**Migration Path:**
1. Apply migration: `psql $DATABASE_URL < database/migrations/20260917_001_add_invite_tokens.sql`
2. Old secret key automatically removed from system_settings
3. Admins create new invite tokens via dashboard
4. Registration flow updated to validate tokens instead of static secret

**Security Improvements:**
- ✅ No shared secrets - each registration has unique token
- ✅ Time-bounded access - tokens auto-expire
- ✅ Audit trail - track who issued/used each token
- ✅ Revocable - admins can deactivate compromised tokens
- ✅ Email verification - optional intended recipient validation

**Usage Flow:**
1. Admin generates invite token for new hire (specifies email, department, expiration)
2. Admin shares token with new hire (via email, Slack, etc.)
3. New hire uses token during registration
4. System validates token (not expired, not used, email matches if specified)
5. Registration completes, token marked as used
6. Token cannot be reused

**Cron Schedule:**
- Runs daily at midnight (UTC)
- Deactivates expired tokens that haven't been used
- Logs cleanup activity in audit_logs

---

#### A3: Batched Audit Logging with Merkle Root Anchoring (2026-09-17)

**What Changed:**
- Implemented off-chain audit event queue with batched Merkle root anchoring
- Replaced per-event on-chain logging with periodic batch anchoring
- Added Merkle proof generation and verification for individual events
- Created automated batch processing via cron job (every 15 minutes)

**Why:**
- Writing every audit event directly to blockchain is prohibitively expensive
- At 0.00001 ETH per event x 10,000 events/day = 0.1 ETH/day (~$300/day at $3000/ETH)
- Batching 100 events into 1 Merkle root = ~100x gas savings
- Still maintains tamper-evidence: any event can be verified against anchored root
- Cryptographic proof via Merkle trees ensures integrity

**Technical Implementation:**
- New tables:
  - `audit_log_queue` - Off-chain event storage with auto-computed SHA-256 hashes
  - `audit_batches` - Anchored Merkle roots with metadata
  - `merkle_proofs` - Verification paths for each event
- Merkle tree library: `src/lib/merkle-tree.ts`
  - Build trees from event hashes
  - Generate proofs for individual events
  - Verify proofs against roots
  - Deterministic (sorted hashing for consistency)
- Audit batching service: `src/lib/audit-batching.ts`
  - Queue events off-chain
  - Batch events when threshold reached (100 events OR 60 minutes)
  - Compute Merkle root
  - Generate proofs for all events
  - Anchor to database and blockchain
- Updated `AuditRegistry.sol`:
  - New function: `recordBatchRoot(bytes32 merkleRoot, uint256 eventCount)`
  - New function: `verifyEventInBatch(bytes32 root, bytes32 leaf, bytes32[] proof, uint256 index)`
  - Kept legacy methods for backwards compatibility
  - BatchAnchored event emitted with root hash

**Database Changes:**
```sql
CREATE TABLE audit_log_queue (
  event_hash VARCHAR(66),  -- SHA-256 of event data (Merkle leaf)
  batch_id UUID,
  anchored BOOLEAN
);
CREATE TABLE audit_batches (
  merkle_root VARCHAR(66), -- Root anchored on-chain
  event_count INTEGER,
  tx_hash VARCHAR(66),
  batch_data JSONB        -- Merkle tree structure
);
CREATE TABLE merkle_proofs (
  event_id UUID,
  batch_id UUID,
  leaf_index INTEGER,
  proof JSONB             -- Array of sibling hashes
);
```

**Files Added:**
- `database/migrations/20260917_002_add_audit_batching.sql` - Migration
- `src/lib/merkle-tree.ts` - Merkle tree utilities
- `src/lib/audit-batching.ts` - Batch management service
- `src/app/api/audit/queue/route.ts` - Queue event endpoint
- `src/app/api/audit/proof/route.ts` - Get Merkle proof endpoint
- `src/app/api/cron/process-audit-batch/route.ts` - Batch processing cron

**Files Modified:**
- `contracts/AuditRegistry.sol` - Added batch anchoring functions
- `vercel.json` - Added cron job (every 15 minutes)

**Migration Path:**
1. Apply migration: `psql $DATABASE_URL < database/migrations/20260917_002_add_audit_batching.sql`
2. Deploy updated AuditRegistry contract
3. Update event logging code to use `queueAuditEvent()` instead of direct contract calls
4. Cron job automatically processes batches every 15 minutes

**Gas Cost Analysis:**
- **Before:** 0.00001 ETH per event = 1 ETH per 100,000 events
- **After:** ~0.0001 ETH per batch of 100 events = 0.1 ETH per 100,000 events
- **Savings:** ~90% reduction (10x-100x depending on batch size)

**Verification Flow:**
1. User requests audit proof for event ID
2. System returns: event hash, Merkle root, proof path, leaf index
3. Anyone can verify: hash event data → traverse proof path → compare to anchored root
4. On-chain verification available via `AuditRegistry.verifyEventInBatch()`

**Batch Triggers:**
- Size threshold: 100 events queued (configurable via system_settings)
- Time threshold: 60 minutes since oldest event (configurable)
- Manual trigger: Admin can force batch via API

**System Settings:**
- `audit_batch_size`: 100 (number of events per batch)
- `audit_batch_interval_minutes`: 60 (max time between batches)
- `audit_batch_enabled`: true (toggle batching on/off)

**Backward Compatibility:**
- Legacy `recordLog()` and `recordSystemLog()` still work
- New code should use `queueAuditEvent()` for batching
- Mixed usage supported during migration period

**Security Properties Maintained:**
- ✅ Tamper-evidence: Any modification to event breaks Merkle proof
- ✅ Verifiability: Each event individually verifiable against on-chain root
- ✅ Immutability: Once anchored, root cannot be changed
- ✅ Transparency: Full batch data and proofs stored for audit
- ✅ Independence: Verification doesn't require trusting database

**API Endpoints:**
- `POST /api/audit/queue` - Queue new audit event
- `GET /api/audit/proof?eventId=xxx` - Get Merkle proof for event
- `GET /api/cron/process-audit-batch` - Process pending batch (cron)

---

#### A4: Encrypted Sensitive Fields & Access Logging (2026-09-17)

**What Changed:**
- Implemented column-level encryption for sensitive profile fields
- Added comprehensive access logging for every read of sensitive data
- Created authorization framework for sensitive field access
- Implemented data retention policies for biometric photos

**Why:**
- PII and sensitive data (criminal checks, biometric photos) must be protected at rest
- Compliance requirements (GDPR, SOC 2) mandate encryption and access logging
- Need to track WHO accessed WHAT sensitive data, WHEN, and WHY
- Insider threat mitigation requires comprehensive audit trail of data access
- Data minimization principle requires automatic cleanup of old biometric data

**Technical Implementation:**
- **Encryption:**
  - Uses PostgreSQL pgcrypto extension (AES-256-CBC)
  - Encrypted columns: `criminal_check_status_encrypted`, `photo_url_encrypted`, `photo_hash_encrypted`
  - Encryption keys stored encrypted in `encryption_keys` table
  - Production: keys should be managed via KMS
  - Key rotation supported (configurable, default: 90 days)

- **Access Logging:**
  - New table: `sensitive_field_access_log`
  - Logs every read of encrypted fields
  - Required fields: accessor, target profile, field name, reason code, authorization status
  - Stores SHA-256 hash of accessed value (not the value itself)
  - Unauthorized attempts trigger security events

- **Authorization:**
  - Function: `can_access_sensitive_field()` checks permissions
  - Criminal check status: requires `sensitive_data:read` permission
  - Photos: requires same department OR admin
  - Self-access always allowed
  - RLS policies enforce access control

- **Secure View:**
  - `profiles_secure` view decrypts fields on-the-fly
  - Applications should use this view instead of direct table access
  - Transparent migration: checks encrypted column first, falls back to legacy

- **Retention Policy:**
  - Biometric photos auto-deleted after 365 days of profile inactivity
  - Configurable via `photo_retention_days` system setting
  - Cleanup function: `cleanup_expired_photos()` (for cron)
  - Access logs retained for 2 years (configurable)

**Database Changes:**
```sql
-- Encrypted columns added to profiles
ALTER TABLE profiles ADD COLUMN criminal_check_status_encrypted BYTEA;
ALTER TABLE profiles ADD COLUMN photo_url_encrypted BYTEA;
ALTER TABLE profiles ADD COLUMN photo_hash_encrypted BYTEA;

-- Access logging
CREATE TABLE sensitive_field_access_log (
  accessor_id UUID,
  accessed_profile_id UUID,
  field_name VARCHAR(100),
  access_reason access_reason,  -- ENUM
  was_authorized BOOLEAN,
  flagged_by_system BOOLEAN
);

-- Encryption keys
CREATE TABLE encryption_keys (
  key_name VARCHAR(100),
  encrypted_key BYTEA,
  key_version INTEGER,
  is_active BOOLEAN
);

-- Secure view
CREATE VIEW profiles_secure AS
  SELECT *, decrypt_sensitive_text(criminal_check_status_encrypted) ...
```

**Files Added:**
- `database/migrations/20260917_003_encrypt_sensitive_fields.sql` - Complete migration
- `docs/SECURITY_IMPLEMENTATION.md` - Security hardening documentation

**Files Modified:**
- `CHANGELOG.md` - This file

**Functions Added:**
- `encrypt_sensitive_text(plaintext, key_name)` - Encrypt with AES-256
- `decrypt_sensitive_text(ciphertext, key_name)` - Decrypt with AES-256
- `can_access_sensitive_field(accessor, target, field)` - Authorization check
- `log_sensitive_access(accessor, target, field, reason, ...)` - Log access with audit
- `cleanup_expired_photos()` - Retention policy enforcement

**Access Reason Codes:**
- `PROFILE_VIEW` - General profile viewing
- `BACKGROUND_CHECK` - Criminal check verification
- `SECURITY_AUDIT` - Security investigation
- `COMPLIANCE_REVIEW` - Compliance audit
- `INVESTIGATION` - Incident investigation
- `DATA_EXPORT` - Data portability request
- `SYSTEM_OPERATION` - Automated system process
- `OTHER` - Other justified reason (requires details)

**Migration Path:**
1. Apply migration (creates encrypted columns, keeps originals)
2. Run encryption helper to encrypt existing data
3. Update application code to use `profiles_secure` view
4. Add `log_sensitive_access()` calls before reading sensitive fields
5. After migration period, can drop unencrypted columns

**Security Improvements:**
- ✅ Column-level encryption (AES-256)
- ✅ Every sensitive read creates audit trail
- ✅ Unauthorized attempts logged and alerted
- ✅ Field-level access control
- ✅ Data retention policies
- ✅ Key rotation support
- ✅ RLS policies on access logs
- ✅ Hash-based verification (no plaintext in logs)

**Compliance Benefits:**
- **GDPR Article 32:** Encryption of personal data at rest ✅
- **GDPR Article 15:** Access transparency (who accessed what) ✅
- **GDPR Article 17:** Right to erasure (auto-deletion) ✅
- **SOC 2 CC6.7:** Encryption requirements ✅
- **ISO 27001 A.10.1:** Cryptographic controls ✅

**Usage Example:**
```typescript
import { logSensitiveAccess } from '@/lib/sensitive-access'

// Before accessing criminal check status
await logSensitiveAccess({
  accessorId: currentUser.id,
  targetProfileId: targetProfile.id,
  fieldName: 'criminal_check_status',
  reason: 'BACKGROUND_CHECK',
  reasonDetails: 'Annual compliance review',
  ipAddress: request.ip,
  userAgent: request.headers['user-agent']
})

// Then query using secure view
const { data } = await supabase
  .from('profiles_secure')
  .select('criminal_check_status_decrypted')
  .eq('id', targetProfile.id)
  .single()
```

**Monitoring Queries:**
```sql
-- Unauthorized access attempts (alert threshold: >5/hour)
SELECT COUNT(*) FROM sensitive_field_access_log
WHERE was_authorized = FALSE
  AND created_at > NOW() - INTERVAL '1 hour';

-- Sensitive access patterns
SELECT field_name, access_reason, COUNT(*)
FROM sensitive_field_access_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY field_name, access_reason;
```

---

## [2.0.0] - 2026-09-17 (Base Schema)

### Initial Release

- PostgreSQL schema with 20+ tables
- Smart contracts: IdentityNFT, AssetNFT, AuditRegistry, RoleManager
- Next.js 16 frontend with App Router
- Supabase integration for auth and database
- Cloudflare R2 for photo storage
- IPFS/Pinata for document storage
- 4 role system: ADMIN, VIEWER, ALTER, DEBUGGER

---

## Template Sections for Future Changes

### Format

```markdown
#### [Feature Name] (YYYY-MM-DD)

**What Changed:**
- Brief bullet points

**Why:**
- Rationale for the change

**Technical Implementation:**
- Key technical details
- Files added/modified
- Database changes (if any)

**Migration Notes:**
- Steps to apply changes
- Breaking changes (if any)
```

---

**Legend:**
- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Vulnerability fixes


---

#### A5: Harden Smart Contracts with OpenZeppelin (2026-09-17)

**What Changed:**
- Refactored all smart contracts to use OpenZeppelin security patterns
- Replaced single `Ownable` with granular `AccessControl` 
- Added `ReentrancyGuard` to all state-changing functions
- Added `Pausable` pattern for emergency stops
- Improved input validation across all contracts
- Updated ETH handling to use safe `.call()` pattern

**Why:**
- Single owner pattern is fragile (key loss = contract loss)
- Reentrancy attacks are common exploit vector
- Emergency pause capability needed for incident response
- AccessControl provides granular, auditable permissions
- OpenZeppelin contracts are battle-tested and audited

**Security Patterns Applied:**
1. **AccessControl:** Granular permissions (minter ≠ pauser ≠ admin)
2. **ReentrancyGuard:** Protects against reentrancy attacks
3. **Pausable:** Emergency stop capability
4. **Safe ETH:** `.call()` instead of `.transfer()`
5. **Input Validation:** All addresses/strings validated

**Files Modified:**
- `contracts/IdentityNFT.sol` - Full AccessControl refactor
- `contracts/AssetNFT.sol` - Full AccessControl refactor
- `contracts/AuditRegistry.sol` - Full AccessControl refactor
- `package.json` - Added Slither analysis scripts
- `slither.config.json` - Slither configuration (new)
- `docs/CONTRACT_SECURITY.md` - Comprehensive security documentation (new)

**Slither Analysis:**
```bash
npm run analyze:slither  # Run full analysis
npm run analyze:slither:high  # High/critical only
```

**Security Improvements:**
- ✅ Granular access control (7 distinct roles)
- ✅ Reentrancy protection on all value transfers
- ✅ Emergency pause capability
- ✅ Safe ETH handling
- ✅ Comprehensive input validation
- ✅ OpenZeppelin audited patterns

**Note:** RoleManager.sol and IdentityRegistry.sol still need hardening (future iteration)

---
