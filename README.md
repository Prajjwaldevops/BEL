# BEL Secure Platform

A blockchain-anchored identity, asset management, and zero-trust access control system for defense and government operations, combining self-custodial wallet authentication with cryptographic tamper-proof audit trails.

**Smart India Hackathon 2024 Problem Statement:** [SIH1663] Blockchain-Based Identity & Asset Management for National Security Applications

---

## 🏆 Badges

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Solidity](https://img.shields.io/badge/solidity-0.8.20-blue)
![Next.js](https://img.shields.io/badge/next.js-16.3.5-black)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Dashboard UI │  │  Auth Flow   │  │ Asset Mgmt   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│             Backend API (Go Gin & Next.js API Routes)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  /api/auth   │  │ /api/assets  │  │ /api/audit   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
     ┌────┴────┐        ┌────┴────┐       ┌────┴────┐
     ▼         ▼        ▼         ▼       ▼         ▼
┌─────────┐ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Supabase │ │ Ethereum RPC │  │Cloudflare R2 │  │ IPFS/Pinata  │
│Postgres │ │   (Sepolia)  │  │  (Photos)    │  │  (Documents) │
└─────────┘ └──────┬───────┘  └──────────────┘  └──────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│IdentityNFT   │      │  AssetNFT    │
│(Soulbound)   │      │(Transferable)│
└──────────────┘      └──────────────┘
        │                     │
        └──────────┬──────────┘
                   ▼
           ┌──────────────┐
           │AuditRegistry │
           │(Merkle Roots)│
           └──────────────┘
```

---

## 🌐 Live Deployment

| Service | Environment | URL | Status |
|---------|-------------|-----|--------|
| Frontend | Production | `https://bel-secure-platform.vercel.app` | 🔴 Staging (Not Live) |
| API Health | Production | `/api/health` | 🔴 Not Implemented |
| Smart Contracts | Sepolia Testnet | [View on Etherscan](https://sepolia.etherscan.io) | 🔴 Not Deployed |
| Documentation | GitHub | [docs/](./docs) | 🟢 Available |

> **Note:** System currently in development. Live deployment status will be updated upon production release.

---

## ✨ Advanced Features

### 🔐 Post-Quantum Cryptography
- **CRYSTALS-Kyber** (KEM) for encryption
- **CRYSTALS-Dilithium** (DSA) for digital signatures
- Hybrid classical + PQ signatures for migration period
- Key rotation and secure storage in Supabase

### 🆔 W3C Decentralized Identifiers (DIDs)
- **4 DID Methods Supported:**
  - `did:key` - Cryptographic key-based identifiers
  - `did:ethr` - Ethereum blockchain anchored
  - `did:web` - Web-based DIDs
  - `did:pq` - Post-quantum secure DIDs
- Universal DID resolver integration
- DID document management and relationships

### 📜 W3C Verifiable Credentials (VCs)
- Issue, verify, and revoke credentials
- Selective disclosure support
- Verifiable presentations (VPs)
- Credential schemas and revocation registry
- Expiration and lifecycle management

### 🔍 Zero-Knowledge Proofs
- **Clearance Level Proofs** - Prove security clearance without revealing exact level
- **Membership Proofs** - Prove group membership anonymously
- **Attribute Proofs** - Selective attribute disclosure
- **Ownership Proofs** - Prove asset ownership without revealing identity
- Commitment-based ZK system (production-ready for zk-SNARKs/STARKs integration)

### 🤖 AWS Bedrock AI Security (Powered by Claude 3 Sonnet)
The platform integrates deeply with **AWS Bedrock** and Anthropic's **Claude 3 Sonnet** (`anthropic.claude-3-sonnet-20240229-v1:0`) to deliver advanced, real-time threat intelligence and automated security monitoring:
- **Login Pattern Analysis:** Evaluates recent authentication attempts to detect impossible travel (rapid geographic changes), brute force attempts, time-of-day anomalies, and changes in device footprints.
- **Transaction & Access Pattern Analysis:** Identifies suspicious activities such as data exfiltration attempts (bulk downloads), privilege escalation, lateral movement indicators, and unusual access scopes across departments.
- **Real-Time Threat Scoring:** Computes dynamic risk scores (0-100) based on action severity, operational hours, and context (new device, new IP, new location).
- **Automated Incident Response:** Generates structured security analysis results detailing threat levels (LOW, MEDIUM, HIGH, CRITICAL), confidence scores, specific threat indicators, and actionable mitigation steps.
- **Automated Security Reports:** Analyzes large subsets of aggregated incident data over 7d/30d/90d intervals to generate comprehensive security posture reports.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (via Supabase)
- MetaMask or compatible Web3 wallet
- AWS Account (with Bedrock Model Access enabled for Anthropic Claude 3 Sonnet)

### 1. Start Local Blockchain

```bash
npx hardhat node
# Keep this terminal running
```

### 2. Deploy Smart Contracts

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network localhost
# Note the deployed contract addresses
```

### 3. Setup Database

Run migrations in Supabase SQL Editor:

```bash
npm run migrate:db
# Copy the SQL output and run in Supabase Dashboard > SQL Editor
```

### 4. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with:
# - Supabase credentials
# - Deployed contract addresses from step 2
# - RPC URL (http://localhost:8545 for local)
# - AWS Bedrock Credentials
```

### 5. Start Backend & Frontend

```bash
# Terminal 1: Start Go Backend
npm run backend

# Terminal 2: Start Next.js App
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect your MetaMask wallet.

---

## 🔐 Security & Cryptographic Guarantees

| Guarantee | Implementation | Verification Method |
|-----------|----------------|---------------------|
| **Tamper-Proof Audit Trail** | keccak256 hash of each event, batched Merkle root anchored on-chain every 5 minutes | `verifyAuditProof(eventId, merkleProof)` returns true/false |
| **Non-Repudiation** | EIP-712 signature required for all state-changing operations | `ecrecover()` validates signer = claimed identity |
| **Identity Binding** | Soulbound NFT (ERC-721 non-transferable) per user DID | `transferFrom()` reverts with "Token is soulbound" |
| **Access Control** | On-chain AccessControl + off-chain JWT role validation | Smart contract `hasRole()` + backend `requireRole()` middleware |
| **Metadata Integrity** | Metadata hash (photo, docs) stored on-chain at mint time | `verifyMetadataHash(tokenId, hash)` checks against on-chain anchor |
| **Rate Limiting** | 20 requests / 15 min / IP on auth endpoints | Configured in `src/lib/rate-limit.ts` |
| **Reentrancy Protection** | OpenZeppelin ReentrancyGuard on all state-modifying functions | `nonReentrant` modifier enforced |

---

## 📚 Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — System design, data flow, storage architecture
- **[docs/API.md](docs/API.md)** — REST endpoint reference (all routes, auth, request/response schemas)
- **[docs/SECURITY.md](docs/SECURITY.md)** — Threat model, defense matrix, implementation status
- **[CHANGELOG.md](CHANGELOG.md)** — Version history and changes

---

## 🧪 Testing

```bash
# Run smart contract tests
npx hardhat test

# Check test coverage
npx hardhat coverage

# Run linter
npm run lint
```

**Current Test Coverage:** 🔴 0% (tests in development, target: 80%+)

---

## 🛠️ Tech Stack

**Frontend:** Next.js 16.3.5, TypeScript, Tailwind CSS, Framer Motion  
**Backend:** Go (Gin Framework), Next.js API Routes, Supabase (Postgres), node-cron scheduler  
**Blockchain:** Hardhat, Solidity 0.8.20, OpenZeppelin Contracts, ethers.js  
**Storage:** Cloudflare R2 (photos), IPFS/Pinata (documents)  
**Auth:** Wallet signatures (EIP-191/EIP-712), JWT sessions  
**AI Security:** AWS Bedrock (Claude 3 Sonnet), AWS SDK

---

## 🏛️ System Roles

| Role | Access Level | Permissions |
|------|-------------|-------------|
| **ADMIN** | Full System | Register users, assign roles, mint identities/assets, access all data |
| **VIEWER** | Read-Only (Dept) | View identities/assets within own department |
| **ALTER** | Read-Write (Dept) | View + minor edits within department, transfer assets |
| **DEBUGGER** | Cross-Dept Read | View all departments, access classified data, audit logs |

---

## 📦 Project Structure

```
bel-secure-platform/
├── backend/                # Go (Gin) backend services
├── contracts/              # Solidity smart contracts
│   ├── IdentityNFT.sol         # Soulbound identity tokens (ERC-721)
│   ├── AssetNFT.sol            # Asset provenance NFTs
│   ├── AuditRegistry.sol       # Merkle root anchoring
│   └── RoleManager.sol         # On-chain RBAC (not yet implemented)
├── database/               # PostgreSQL schema & migrations
│   ├── schema.sql              # Base schema
│   └── migrations/             # Incremental SQL migrations
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # React UI components
│   ├── lib/                    # Utilities, constants, API helpers (incl. AWS Bedrock)
│   └── providers/              # Context providers (wallet, auth)
├── docs/                   # Documentation (ARCHITECTURE, API, SECURITY)
├── scripts/                # Deployment scripts
├── test/                   # Smart contract tests (Hardhat)
└── public/                 # Static assets
```

---

## 🔧 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Blockchain
NEXT_PUBLIC_CHAIN_ID=11155111  # Sepolia testnet
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_API_KEY=your-pinata-secret

# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# JWT
JWT_SECRET=generate-with-openssl-rand-hex-32

# Optional: Admin wallet for contract deployment
DEPLOYER_PRIVATE_KEY=0x...  # NEVER commit this!
```

⚠️ **Never commit `.env.local` or private keys to version control!**

---

## 🚢 Deployment

### Vercel (Frontend + API)

```bash
npm run build
vercel --prod
```

### Smart Contracts (Sepolia Testnet)

```bash
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Database Migrations

```bash
psql $DATABASE_URL < database/migrations/YYYYMMDD_HHMMSS_description.sql
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit per logical unit: `git commit -m 'Add wallet signature auth'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

**Commit Granularity:** One commit per feature/fix (e.g., one for each contract, one per API route group, one per doc). Avoid monolithic "added everything" commits.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🆘 Support & Contact

- **Issues:** [GitHub Issues](https://github.com/your-org/bel-secure-platform/issues)
- **Documentation:** [docs/](./docs)
- **Email:** support@bel-sentinel.gov

---

**Built for Smart India Hackathon 2024** | Problem Statement SIH1663  
**Team:** [Your Team Name] | **Mentor:** [Mentor Name]
