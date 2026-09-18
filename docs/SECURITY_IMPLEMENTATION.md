# Security Implementation Guide

## Overview

This document summarizes the security hardening measures implemented in the BEL Secure Platform.

## Part A: Security Hardening (Completed: 4/5)

### A1: Self-Custodial Custody Model ✅

**Status:** Implemented  
**Impact:** Eliminates single point of compromise for user keys

**Implementation:**
- Users control their own Web3 wallets (MetaMask, WalletConnect, Coinbase Wallet)
- Backend NEVER stores user private keys
- Admin wallet stored in KMS (AWS/Azure/HashiCorp Vault) for system operations only
- Wallet connection via wagmi + viem

**Files:** `src/lib/web3-config.ts`, `src/providers/Web3Provider.tsx`, `src/lib/admin-wallet.ts`

---

### A2: Invite Token System ✅

**Status:** Implemented  
**Impact:** Replaces insecure static secret with time-limited, single-use tokens

**Implementation:**
- Single-use tokens with configurable expiration (default: 7 days)
- Optional email/department targeting
- Automatic cleanup via cron job (daily)
- Full audit trail of creation and usage
- Admin UI for token management

**Files:** `src/lib/invite-tokens.ts`, `database/migrations/20260917_001_add_invite_tokens.sql`

---

### A3: Batched Audit Logging with Merkle Root Anchoring ✅

**Status:** Implemented  
**Impact:** ~90% gas cost reduction while maintaining tamper-evidence

**Implementation:**
- Off-chain event queue with batching (100 events OR 60 minutes)
- Merkle tree construction from event hashes
- On-chain root anchoring via `AuditRegistry.recordBatchRoot()`
- Individual event verification via Merkle proofs
- Cron job processes batches every 15 minutes

**Files:** `src/lib/merkle-tree.ts`, `src/lib/audit-batching.ts`, `contracts/AuditRegistry.sol`

**Gas Savings:**
- Before: 0.00001 ETH × 100 events = 0.001 ETH
- After: ~0.0001 ETH per batch = 90% savings

---

### A4: Encrypted Sensitive Fields & Access Logging ✅

**Status:** Implemented  
**Impact:** Protects PII/sensitive data at column level with comprehensive audit trail

**Implementation:**
- Column-level encryption using pgcrypto (AES-256-CBC)
- Encrypted fields: `criminal_check_status`, `photo_url`, `photo_hash`
- Encryption keys stored encrypted in database
- Every read of sensitive field logs to `sensitive_field_access_log`
- Access requires explicit authorization check
- Unauthorized access attempts create security events
- Data retention policy for biometric photos (365 days after deactivation)

**Files:** `database/migrations/20260917_003_encrypt_sensitive_fields.sql`

**Access Control:**
- Admins: Full access
- Users: Access own profile
- Department colleagues: Access photos only
- Specialized role: Access criminal check status (requires `sensitive_data:read` permission)

**Logging:**
- Who accessed what
- When accessed
- Why accessed (reason code required)
- Authorization status
- Hash of accessed value (not the value itself)

---

### A5: Harden Smart Contracts (Pending)

**Status:** Not yet implemented  
**Required Actions:**
1. Refactor `IdentityNFT.sol` and `AssetNFT.sol` to use OpenZeppelin AccessControl
2. Add ReentrancyGuard to all state-changing functions
3. Run Slither static analysis and fix findings
4. Add explicit role-gated modifiers
5. Document upgrade strategy (proxy vs immutable)
6. Write comprehensive Hardhat tests

---

## Security Metrics

### Gas Cost Reduction
- **Audit Logging:** 90% reduction via batching
- **Total Savings:** ~$270/day at 10,000 events/day ($3000/ETH)

### Access Control Granularity
- **Roles:** 4 system roles (ADMIN, VIEWER, ALTER, DEBUGGER)
- **Permissions:** JSON-based permission arrays
- **Field-Level:** Sensitive fields require explicit authorization

### Audit Trail Completeness
- **On-Chain:** Merkle roots anchored every 15 min
- **Off-Chain:** Full event details with Merkle proofs
- **Access Logs:** Every sensitive field read logged
- **Retention:** 2 years for access logs, configurable for photos

### Encryption Standards
- **Algorithm:** AES-256-CBC via pgcrypto
- **Key Storage:** Encrypted keys in database (production: KMS)
- **Key Rotation:** Configurable (default: 90 days)
- **Fields Protected:** Criminal status, biometric photos

---

## Threat Model Addressed

| Threat | Mitigation | Status |
|--------|------------|--------|
| Key compromise (centralized) | Self-custodial wallets | ✅ |
| Secret key sharing | Invite tokens | ✅ |
| High gas costs | Batched anchoring | ✅ |
| PII exposure | Column encryption | ✅ |
| Unauthorized access | Access logging + RLS | ✅ |
| Data tampering | Merkle proof verification | ✅ |
| Insider threats | Comprehensive audit logs | ✅ |
| Key loss | Guardian recovery (B1) | ⏳ |
| Reentrancy attacks | ReentrancyGuard (A5) | ⏳ |

---

## Compliance Features

### GDPR
- ✅ Right to erasure: Photo auto-deletion after retention period
- ✅ Data minimization: Only essential fields encrypted
- ✅ Access transparency: Full audit trail
- ✅ Data portability: Export API (B6 - planned)

### SOC 2 / ISO 27001
- ✅ Encryption at rest (column-level)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Access control (RBAC + field-level)
- ✅ Audit logging (immutable + Merkle-anchored)
- ✅ Retention policies (configurable)

### Zero-Trust Architecture
- ✅ No implicit trust
- ✅ Verify every request
- ✅ Principle of least privilege
- ✅ Continuous monitoring

---

## Migration Guide

### Applying Migrations

```bash
# Apply in order
psql $DATABASE_URL < database/migrations/20260917_001_add_invite_tokens.sql
psql $DATABASE_URL < database/migrations/20260917_002_add_audit_batching.sql
psql $DATABASE_URL < database/migrations/20260917_003_encrypt_sensitive_fields.sql
```

### Encrypt Existing Data

After applying migration 003, run the encryption helper:

```sql
-- Encrypt all existing profiles
DO $$
DECLARE
    v_profile RECORD;
BEGIN
    FOR v_profile IN 
        SELECT id, criminal_check_status, photo_url, photo_hash 
        FROM profiles 
        WHERE criminal_check_status_encrypted IS NULL
    LOOP
        UPDATE profiles
        SET
            criminal_check_status_encrypted = 
                CASE WHEN v_profile.criminal_check_status IS NOT NULL
                THEN encrypt_sensitive_text(v_profile.criminal_check_status::TEXT)
                ELSE NULL END,
            photo_url_encrypted = 
                CASE WHEN v_profile.photo_url IS NOT NULL
                THEN encrypt_sensitive_text(v_profile.photo_url)
                ELSE NULL END,
            photo_hash_encrypted = 
                CASE WHEN v_profile.photo_hash IS NOT NULL
                THEN encrypt_sensitive_text(v_profile.photo_hash)
                ELSE NULL END,
            encryption_version = 1,
            last_encrypted_at = NOW()
        WHERE id = v_profile.id;
    END LOOP;
END $$;
```

### Update Application Code

Replace direct table access with secure view:

```typescript
// Before
const { data } = await supabase
  .from('profiles')
  .select('criminal_check_status')

// After
const { data } = await supabase
  .from('profiles_secure')
  .select('criminal_check_status_decrypted')

// And log the access
await logSensitiveAccess(accessorId, profileId, 'criminal_check_status', 'COMPLIANCE_REVIEW')
```

---

## Monitoring & Alerts

### Metrics to Track

1. **Unauthorized Access Attempts**
   - Query: `SELECT COUNT(*) FROM sensitive_field_access_log WHERE was_authorized = FALSE`
   - Alert: >5 per hour

2. **Batch Anchoring Lag**
   - Query: Check oldest unanchored event age
   - Alert: >2 hours old

3. **Encryption Key Age**
   - Query: `SELECT created_at FROM encryption_keys WHERE is_active = TRUE`
   - Alert: >90 days old

4. **Failed Token Validations**
   - Query: Check registration attempts with invalid tokens
   - Alert: >10 per hour (possible attack)

### Dashboard Queries

```sql
-- Sensitive access patterns (last 7 days)
SELECT 
    field_name,
    access_reason,
    COUNT(*) as access_count,
    COUNT(DISTINCT accessor_id) as unique_accessors
FROM sensitive_field_access_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY field_name, access_reason
ORDER BY access_count DESC;

-- Unauthorized access attempts
SELECT 
    a.username as accessor,
    t.username as target,
    l.field_name,
    l.created_at
FROM sensitive_field_access_log l
JOIN profiles a ON l.accessor_id = a.id
JOIN profiles t ON l.accessed_profile_id = t.id
WHERE l.was_authorized = FALSE
ORDER BY l.created_at DESC
LIMIT 100;

-- Batch anchoring efficiency
SELECT 
    DATE_TRUNC('day', anchored_at) as day,
    COUNT(*) as batches,
    SUM(event_count) as total_events,
    AVG(event_count) as avg_batch_size
FROM audit_batches
WHERE anchored_at > NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;
```

---

## Next Steps

1. **A5:** Complete smart contract hardening
2. **B1:** Implement guardian-based recovery
3. **B2:** Add multi-signature approvals
4. **B3:** Time-bound access grants
5. **B4:** ZK selective disclosure
6. **B5:** Automated incident response
7. **B6:** Compliance export
8. **B7:** Gas dashboard + L2 migration
9. **B8:** W3C Verifiable Credentials
10. **B9:** Real-time security dashboard
11. **B10:** Progressive login lockout

---

**Last Updated:** 2026-09-17  
**Version:** 2.1  
**Status:** 4/5 Part A complete, 0/10 Part B complete
