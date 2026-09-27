# System Architecture

## Overview

BEL Secure Platform is a hybrid Web2/Web3 identity and asset management system that combines:
- **Off-chain** user data and metadata (PostgreSQL via Supabase)
- **On-chain** cryptographic anchors and access control (Ethereum-compatible smart contracts)
- **Decentralized storage** for photos (Cloudflare R2) and documents (IPFS/Pinata)

This architecture achieves tamper-proof audit trails while maintaining query performance and cost efficiency.

---

## System Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                         USER LAYER                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐             │
│  │  Dashboard   │   │ Asset Mgmt   │   │  Audit UI    │             │
│  │   (Next.js)  │   │  (React)     │   │  (Charts)    │             │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘             │
│         │                  │                  │                       │
│         └──────────────────┴──────────────────┘                       │
│                            │                                          │
└────────────────────────────┼──────────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js API Routes)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │/api/auth   │  │/api/assets │  │/api/audit  │  │/api/access │     │
│  │ - nonce    │  │ - mint     │  │ - log      │  │ - grant    │     │
│  │ - verify   │  │ - transfer │  │ - proof    │  │ - verify   │     │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │
│        │               │               │               │              │
└────────┼───────────────┼───────────────┼───────────────┼──────────────┘
         │               │               │               │
    ┌────┴────┐     ┌────┴────┐     ┌───┴────┐     ┌───┴────┐
    │         │     │         │     │        │     │        │
    ▼         ▼     ▼         ▼     ▼        ▼     ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Supabase│ │Ethereum│ │Cloudfl.│ │  IPFS  │ │Backend │ │Rate    │
│Postgres│ │   RPC  │ │   R2   │ │ Pinata │ │Schedul.│ │Limiter │
└────────┘ └───┬────┘ └────────┘ └────────┘ └────────┘ └────────┘
               │
        ┌──────┴──────┬──────────────┐
        ▼             ▼              ▼
┌──────────────┐ ┌────────────┐ ┌──────────────┐
│IdentityNFT   │ │  AssetNFT  │ │AuditRegistry │
│(Soulbound)   │ │(Transferab)│ │(Merkle Roots)│
└──────────────┘ └────────────┘ └──────────────┘
```

---

## Data Flow: Four Stages

### Stage 1: Onboard User

**Goal:** Register new user, mint identity NFT, link wallet

```
1. ADMIN initiates registration via /dashboard/identity
2. User provides: full name, email, department, role, wallet address
3. User captures webcam photo (frontend)
4. Frontend calls POST /api/auth/register
5. Backend:
   a. Validates data (unique email, valid role, etc.)
   b. Uploads photo to Cloudflare R2 → returns photoHash & photoUrl
   c. Stores user record in Supabase `users` table
   d. Calls IdentityNFT.mintIdentity(wallet, tokenURI, photoHash, ...)
   e. Returns username, password, accessCode (6-digit), nftTokenId
6. User stores credentials offline (non-recoverable)
7. Audit log entry: USER_REGISTERED
```

**Database Updates:**
- `users` table: INSERT new row with encrypted sensitive fields
- `audit_logs` table: INSERT event with action=USER_REGISTERED

**Blockchain Transactions:**
- IdentityNFT.mintIdentity(): ERC-721 mint (soulbound, non-transferable)
- Gas cost: ~0.02 ETH (testnet), paid by backend admin wallet

---

### Stage 2: Assign Role & Permissions

**Goal:** Grant user access to specific resources/departments

```
1. ADMIN navigates to /dashboard/users
2. Selects user, clicks "Edit Role"
3. Chooses new role: VIEWER → ALTER
4. Frontend calls POST /api/users/update-role
5. Backend:
   a. Verifies caller has ADMIN role
   b. Updates `users.role` in Supabase
   c. Optionally calls RoleManager.assignRole(userWallet, "ALTER") on-chain
   d. Logs to audit trail
6. User's next login reflects new permissions
```

**Access Control Matrix:**

| Role | Create User | Mint Asset | Transfer Asset | View All Depts | Revoke Identity |
|------|-------------|------------|----------------|----------------|-----------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ (multi-sig) |
| DEBUGGER | ❌ | ❌ | ❌ | ✅ (read-only) | ❌ |
| ALTER | ❌ | ❌ | ✅ (own dept) | ❌ | ❌ |
| VIEWER | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### Stage 3: Use Platform (Asset Management Example)

**Goal:** Mint asset NFT, transfer ownership, track provenance

```
1. ADMIN/ALTER creates new asset via /dashboard/assets
2. Provides: physical ID (e.g., "RADAR-001"), name, description, department
3. Uploads document (PDF) to IPFS via Pinata → returns CID
4. Frontend calls POST /api/assets/mint
5. Backend:
   a. Validates role (must be ADMIN or ALTER in asset's department)
   b. Pins document to IPFS, stores CID in Supabase `assets.ipfs_document_hash`
   c. Calls AssetNFT.mintAsset(recipient, physicalId, tokenURI)
   d. Returns nftTokenId, txHash
6. Asset now visible in dashboard with provenance trail
7. Audit log: ASSET_MINTED

Transfer flow:
1. Current owner initiates transfer to new user
2. Frontend calls POST /api/assets/transfer
3. Backend:
   a. Verifies caller is owner OR has MANAGER_ROLE
   b. Calls AssetNFT.transferFrom(from, to, tokenId)
   c. Updates `assets.current_owner` in Supabase
   d. Logs to audit trail: ASSET_TRANSFERRED
4. Blockchain emits Transfer event + AssetTransferApproved event
```

---

### Stage 4: Audit & Compliance

**Goal:** Immutable, verifiable audit trail for all actions

```
Every sensitive action triggers:
1. Backend calls POST /api/audit/log-action internally
2. Creates entry in Supabase `audit_logs` table:
   {
     user_id, action, resource_type, resource_id,
     metadata, ip_address, user_agent, timestamp
   }
3. Entry added to in-memory batch queue
4. Every 5 minutes (node-cron task):
   a. Collect all queued audit events
   b. Compute event hashes: keccak256(userId, action, resourceId, timestamp)
   c. Build Merkle tree from event hashes
   d. Anchor Merkle root on-chain: AuditRegistry.anchorBatch(merkleRoot, batchId)
5. Update audit_logs entries with merkle_root, batch_id, block_number

Verification (for auditors):
1. GET /api/audit/proof?auditId=aud_123
2. Backend returns:
   {
     eventHash, merkleRoot, merkleProof[], blockNumber, txHash
   }
3. Auditor can independently verify:
   - Recompute eventHash from raw data
   - Validate Merkle proof against on-chain root
   - Confirm root exists in AuditRegistry at claimed block
```

**Audit Log Lifecycle:**
```
[Action Occurs] 
   → [Log to DB] 
   → [Add to Queue] 
   → [5-min batch] 
   → [Compute Merkle root] 
   → [Anchor on-chain] 
   → [Update DB with proof]
```

---

## Storage Architecture

| Data Type | Storage Layer | Rationale | Example |
|-----------|---------------|-----------|---------|
| **User credentials** | Supabase Postgres | Fast queries, relational integrity | username, hashed password, role |
| **Sensitive fields** | Supabase (encrypted) | AES-256-GCM at rest | criminal_check_status, clearance_level |
| **Biometric photos** | Cloudflare R2 | Cost-effective object storage, global CDN | user webcam capture (JPG) |
| **Documents** | IPFS (Pinata) | Content-addressed, tamper-proof, decentralized | asset PDFs, compliance reports |
| **Identity anchors** | IdentityNFT (on-chain) | Soulbound, non-transferable, wallet-bound | photoHash, metadataHash, role |
| **Asset ownership** | AssetNFT (on-chain) | Transferable, provenance trail | physicalId, status, owner |
| **Audit proofs** | AuditRegistry (on-chain) | Immutable Merkle roots for verification | batchId → merkleRoot mapping |

---

## Database Schema (Key Tables)

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER')),
  department TEXT NOT NULL,
  wallet_address TEXT UNIQUE,
  photo_hash TEXT, -- SHA-256 of photo
  photo_url TEXT,  -- Cloudflare R2 URL
  criminal_check_status TEXT, -- ENCRYPTED
  clearance_level TEXT,       -- ENCRYPTED
  nft_token_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### assets
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  physical_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  current_owner UUID REFERENCES users(id),
  nft_token_id INTEGER,
  nft_contract_address TEXT,
  ipfs_document_hash TEXT, -- IPFS CID
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  merkle_root TEXT,     -- Added after batching
  batch_id TEXT,
  block_number INTEGER,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### auth_nonces
```sql
CREATE TABLE auth_nonces (
  id UUID PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  nonce TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ
);
```

---

## Smart Contracts

### IdentityNFT.sol

**Purpose:** Soulbound identity tokens (non-transferable)

**Key Functions:**
- `mintIdentity(wallet, tokenURI, photoHash, role, department, criminalStatus)` 
  - Only MINTER_ROLE
  - Computes metadataHash = keccak256(photoHash, role, dept, criminalStatus)
  - Stores on-chain for tamper detection
- `verifyMetadataHash(tokenId, photoHash, role, dept, criminalStatus) → bool`
  - Recomputes hash, compares to on-chain anchor
- `pause()` / `unpause()` - Emergency freeze (PAUSER_ROLE)

**Security:**
- OpenZeppelin AccessControl (role-based permissions)
- ReentrancyGuard on all state-changing functions
- Pausable for incident response
- Soulbound: blocks all transfers after minting

---

### AssetNFT.sol

**Purpose:** Transferable asset NFTs with status tracking

**Key Functions:**
- `mintAsset(to, physicalId, tokenURI)` - Only MINTER_ROLE
- `transferFrom(from, to, tokenId)` - Authorization: MANAGER_ROLE OR owner
- `updateAssetStatus(tokenId, status)` - Only MANAGER_ROLE
- `pause()` / `unpause()` - Emergency freeze

**Status Enum:**
```solidity
enum AssetStatus {
  CREATED, REGISTERED, ASSIGNED, ACTIVE, TRANSFERRED,
  MAINTENANCE, AUDITED, REVOKED, DECOMMISSIONED
}
```

**Security:**
- Same hardening as IdentityNFT (AccessControl, ReentrancyGuard, Pausable)
- Explicit authorization checks before transfers
- Status tracking prevents unauthorized state transitions

---

### AuditRegistry.sol

**Purpose:** Anchor Merkle roots of audit log batches

**Key Functions:**
- `anchorBatch(batchId, merkleRoot)` - Only ADMIN_ROLE
- `getBatchRoot(batchId) → bytes32`
- `verifyEventProof(batchId, eventHash, proof[]) → bool`

**Gas Optimization:**
- Batch 100-500 events → 1 on-chain transaction every 5 minutes
- Cost: ~0.001 ETH per batch vs. ~0.02 ETH per individual event
- Savings: 95%+ gas reduction

---

## Backend Scheduler (node-cron)

**Why not Vercel Cron?**
- Vercel cron jobs require paid Hobby/Pro plan
- node-cron is self-hosted, free, runs in the Next.js process

**Tasks:**

1. **Audit Batch Anchoring** (every 5 minutes)
   ```javascript
   cron.schedule('*/5 * * * *', async () => {
     const events = await getUnbatchedAuditLogs();
     const merkleRoot = buildMerkleTree(events);
     await anchorOnChain(merkleRoot);
     await updateLogsWithProof(events, merkleRoot);
   });
   ```

2. **Revoke Expired Access** (every hour)
   ```javascript
   cron.schedule('0 * * * *', async () => {
     const expired = await getExpiredAccess();
     await revokeAccess(expired);
   });
   ```

3. **Security Posture Calculation** (daily at 2 AM UTC)
   ```javascript
   cron.schedule('0 2 * * *', async () => {
     const score = await calculateSecurityScore();
     await updatePostureMetrics(score);
   });
   ```

---

## Security Layers

| Layer | Technology | Purpose |
|-------|----------|---------|
| **Transport** | HTTPS/TLS 1.3 | Encrypt data in transit |
| **Authentication** | EIP-191 wallet signatures | Prove wallet ownership without passwords |
| **Authorization** | JWT + RBAC | Role-based access control |
| **Rate Limiting** | In-memory counter | Prevent brute force, DoS |
| **Data Encryption** | AES-256-GCM | Protect sensitive fields at rest |
| **Contract Hardening** | AccessControl, ReentrancyGuard, Pausable | Prevent common Solidity vulnerabilities |
| **Audit Trail** | Merkle-anchored logs | Tamper-proof compliance |
| **Incident Response** | Automated detection + playbooks | Rapid response to anomalies |

---

## Deployment Architecture

### Development
- **Frontend:** `npm run dev` (localhost:3000)
- **Blockchain:** Hardhat local node (localhost:8545)
- **Database:** Supabase free tier
- **Storage:** Mock R2, local IPFS node

### Production (Proposed)
- **Frontend:** Vercel (Next.js SSR + API Routes)
- **Blockchain:** Sepolia testnet → Ethereum mainnet or Polygon
- **Database:** Supabase Pro OR AWS RDS Postgres (Multi-AZ, encrypted at rest)
- **Storage:** 
  - Cloudflare R2 (photos, 10GB free, $0.015/GB/month after)
  - Pinata (IPFS pinning, 1GB free, $20/month for 100GB)
- **Admin Wallet:** AWS KMS or Azure Key Vault (never store private keys in code)

---

## Scalability Considerations

| Bottleneck | Current Solution | Future Improvement |
|------------|------------------|---------------------|
| **Gas costs** | Batch audit logs (5-min intervals) | Migrate to L2 (Polygon, Optimism) for 100x cost reduction |
| **Database queries** | Supabase connection pooling | Read replicas for analytics queries |
| **IPFS pinning** | Pinata free tier (1GB) | Self-hosted IPFS cluster or Filecoin for long-term storage |
| **Concurrent users** | Next.js serverless functions (auto-scale) | Add Redis for session caching if >10k users |
| **Blockchain RPC** | Infura free tier (100k requests/day) | Dedicated RPC node or Alchemy Growth plan |

---

## Monitoring & Observability

**Metrics to Track:**
- API response times (p50, p95, p99)
- Database connection pool usage
- Blockchain transaction success rate
- Gas fees per transaction type
- Audit log batch processing time
- IPFS pin success rate

**Tools:**
- Supabase Dashboard (database metrics)
- Vercel Analytics (frontend performance)
- Hardhat console.log() → structured logging in production
- Custom `/api/health` endpoint

---

## Future Enhancements

1. **ZK-STARK Selective Disclosure**
   - Prove "clearance level ≥ SECRET" without revealing actual level
   - Library: SnarkJS, Circom, or Noir

2. **Guardian-Based Key Recovery**
   - 2-of-3 guardians can co-sign recovery tx
   - Solidity: store guardian addresses, require multi-sig

3. **Contract Upgrades**
   - Transparent proxy pattern (OpenZeppelin)
   - 48-hour timelock for community review

4. **L2 Migration**
   - Deploy contracts to Polygon zkEVM or Optimism
   - 95%+ gas cost reduction

5. **Real-Time Anomaly Detection**
   - ML model (scikit-learn isolation forest)
   - Flag suspicious login patterns (geo-velocity, time-of-day)

---

## References

- **OpenZeppelin Contracts:** https://docs.openzeppelin.com/contracts/
- **EIP-191 (Signed Data Standard):** https://eips.ethereum.org/EIPS/eip-191
- **Merkle Trees:** https://en.wikipedia.org/wiki/Merkle_tree
- **IPFS:** https://docs.ipfs.tech/
- **Supabase:** https://supabase.com/docs

---

Last Updated: 2024-09-18  
Reviewed By: [System Architect Name]
