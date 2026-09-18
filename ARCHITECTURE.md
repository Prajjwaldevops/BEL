# BEL Secure Platform — Architecture Documentation

## System Overview

BEL Secure Platform is a hybrid Web2/Web3 identity, access control, and asset management system designed for secure government/enterprise operations.

**Stack:**
- Frontend/API: Next.js 16 (App Router) + TypeScript
- Database/Auth: Supabase (PostgreSQL)
- Blockchain: Ethereum-compatible (Hardhat local, deployable to L1/L2)
- Storage: Cloudflare R2 (biometric photos), IPFS/Pinata (documents)
- Smart Contracts: Solidity 0.8.28, OpenZeppelin libraries

## Custody Model

**Decision: SELF-CUSTODIAL (User-Controlled Wallets)**

Users connect their own wallets (MetaMask, WalletConnect, etc.) to interact with the platform. The backend NEVER holds or manages private keys.

### What This Means

**User Actions:**
- Identity NFT minting: User signs transaction with their wallet
- Asset NFT transfers: User signs transaction with their wallet
- Access requests: User signs proof-of-identity message

**Backend Actions:**
- Smart contract deployment (admin wallet only)
- System-level operations (e.g., batch audit anchoring)
- Database management and API orchestration

### Implementation Details

1. **Wallet Connection:**
   - Use wagmi + viem for Web3 integration
   - Support MetaMask, WalletConnect, Coinbase Wallet
   - Store wallet address in `profiles.wallet_address`

2. **Role-Based Access Control (Hybrid):**
   - Off-chain: Supabase RLS policies check `user_roles` table
   - On-chain: Smart contracts verify wallet has required role via `RoleManager.sol`
   - Backend syncs role grants between DB and blockchain

3. **Minting Flow:**
   ```
   User registers → Backend validates → Backend prepares metadata
   → Frontend prompts wallet signature → User approves → TX sent to chain
   → Backend watches for confirmation → Updates DB with tx_hash/token_id
   ```

4. **Security:**
   - Backend holds ONE admin wallet for contract deployment only
   - Admin wallet stored in KMS (not .env) - see Security section
   - User actions always require user's wallet signature

### Why Self-Custodial?

✅ True self-sovereignty: users control their identity  
✅ No single point of compromise  
✅ Aligns with Web3 ethos and user expectations  
✅ Interoperable with other Web3 systems  
✅ Regulatory clarity: platform is a facilitator, not a custodian  

### Tradeoffs

⚠️ User Experience: Requires wallet installation/education  
⚠️ Key Loss Risk: Users must backup seed phrases  
⚠️ Gas Costs: Users pay for their own transactions  

**Mitigation:** Guardian-based recovery (see B1), educational onboarding, gas subsidy options for critical operations

---

## Role-Based Access Control (RBAC)

**4 System Roles:**

| Role | Permissions | Use Case |
|------|-------------|----------|
| ADMIN | Full system access, user registration, role assignment | System administrators |
| VIEWER | Read-only within assigned department | Auditors, analysts |
| ALTER | View + minor edits within department | Operational staff |
| DEBUGGER | Cross-department read + classified access | Security inspectors, QA |

**Implementation:**
- `roles` table defines permissions (JSONB)
- `user_roles` table maps profiles to roles (many-to-many)
- On-chain: `RoleManager.sol` maintains role registry for smart contract enforcement
- Time-bound grants: `user_roles.expires_at` + cron job revocation (see B3)

---

## Audit & Compliance

### On-Chain Audit Anchoring (Batched)

**Problem:** Writing every event on-chain is prohibitively expensive.

**Solution:** Off-chain queue + periodic Merkle root anchoring

1. Events written to `audit_log_queue` table
2. Every N minutes OR M events, compute Merkle root
3. Anchor ONLY the root via `AuditRegistry.recordBatchRoot()`
4. Store full batch + Merkle proofs off-chain
5. Any event verifiable against on-chain root

**Gas Savings:** ~100x reduction for high-frequency environments

### Sensitive Data Protection

**Encrypted Fields:**
- `profiles.criminal_check_status` — encrypted at column level (pgcrypto)
- `profiles.photo_url` — encrypted URL storage
- Access logged in `sensitive_field_access_log`

**Access Control:**
- New permission: `sensitive_data:read` (stricter than ADMIN)
- Explicit reason code required for access
- Every read creates audit trail entry

---

## Key Management & Security

### Admin Wallet (Backend)

**Purpose:** Smart contract deployment, system operations only

**Storage:**
- ❌ NEVER store in `.env` files
- ✅ Use proper KMS:
  - AWS KMS (production)
  - Azure Key Vault (production)
  - HashiCorp Vault (self-hosted)
  - For local dev: encrypted file with passphrase prompt

**Access:**
- Environment variable points to KMS secret ID
- Application fetches key at runtime with IAM role auth
- Key rotation policy: 90 days

### User Wallets

**Storage:** None - users manage their own keys

**Recovery:** Guardian-based recovery system (see B1)

---

## Data Storage

### Cloudflare R2 (Biometric Photos)

- Webcam photos for identity verification
- SHA-256 hash stored in DB + on-chain
- Signed URLs with expiration
- Auto-deletion policy: 365 days after profile deactivation

### IPFS/Pinata (Documents)

- Immutable document storage
- CID stored in `ipfs_objects` table
- Pinning status tracked
- Backup: Weekly archive to R2

---

## Smart Contracts

### IdentityNFT.sol
- Soulbound (non-transferable) identity tokens
- 1 NFT per wallet address
- Stores: photo hash, role, department, criminal status
- Minting: User-signed transaction (self-custodial)

### AssetNFT.sol
- Physical/digital asset provenance
- Transferable with role checks
- Status tracking: CREATED → ASSIGNED → ACTIVE → TRANSFERRED → DECOMMISSIONED
- Transfer requires ADMIN/MANAGER role OR owner signature

### AuditRegistry.sol
- Immutable audit log (batch Merkle roots)
- Gas fee tracking
- System events recorded by admin wallet

### RoleManager.sol
- On-chain role registry
- Synced with `user_roles` table
- Used by other contracts for access control

---

## Gas Cost Management

**Current Fee Structure:**
- Identity minting: ~0.002 ETH
- Asset minting: ~0.003 ETH
- Role assignment: ~0.0005 ETH
- Audit anchoring (batch): ~0.0001 ETH per batch

**L2 Migration Path:**
- Contracts compatible with Polygon, Optimism, Arbitrum
- Deploy script configured for multi-network
- Cost reduction: ~100-1000x on L2

**Gas Dashboard:** See B7 for admin analytics

---

## Network Architecture

### Local Development
- Hardhat node (chain ID 31337)
- Localhost RPC: http://localhost:8545

### Testnet Options
- Sepolia (Ethereum testnet)
- Polygon Amoy (L2 testnet)
- Optimism Sepolia (L2 testnet)

### Production Considerations
- Mainnet deployment: High security audit required
- L2 deployment: Lower cost, slight trust tradeoff
- Private chain: Full control, no decentralization

**Recommendation:** Start with Polygon mainnet for production (low cost, proven security)

---

## Compliance Features

### GDPR Compliance
- Right to erasure: Photos auto-delete, on-chain data anonymized
- Data portability: Export API (see B6)
- Access logs: `sensitive_field_access_log`

### Audit Trail
- Complete chain-of-custody for every asset
- Cryptographic proof via Merkle trees
- Immutable timestamp via blockchain

### Privacy Controls
- ZK proofs for selective disclosure (see B4)
- Minimum necessary data principle
- Retention policies enforced via cron jobs

---

## Future Enhancements

- [ ] Multi-chain support (cross-chain asset transfers)
- [ ] Biometric authentication integration
- [ ] AI-powered anomaly detection (real ML, not rules)
- [ ] Mobile app with wallet integration
- [ ] Hardware wallet support (Ledger, Trezor)

---

**Version:** 2.0  
**Last Updated:** 2026-09-17  
**Maintained By:** BEL Secure Platform Team
