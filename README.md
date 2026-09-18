# BEL Secure Platform

A hybrid Web2/Web3 identity, access control, and asset management system with **self-custodial wallet architecture**.

## 🔐 Architecture Highlights

- **Self-Custodial:** Users control their own wallets (MetaMask, WalletConnect)
- **Hybrid Model:** Off-chain (Supabase) + On-chain (Ethereum-compatible) 
- **Zero-Trust:** Role-based access control (RBAC) with 4 system roles
- **Audit Trail:** Batched Merkle root anchoring for tamper-proof compliance
- **Privacy-First:** Encrypted sensitive fields, ZK selective disclosure

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- PostgreSQL (via Supabase)
- Hardhat (for local blockchain)
- Web3 wallet (MetaMask recommended)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Set up your Supabase project and fill in:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY

# Start local Hardhat node (in separate terminal)
npx hardhat node

# Compile and deploy contracts
npm run compile:contracts
npx hardhat run scripts/deploy.ts --network localhost

# Update .env.local with deployed contract addresses

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect your wallet.

## 📁 Project Structure

```
bel-secure-platform/
├── contracts/           # Solidity smart contracts
│   ├── IdentityNFT.sol     # Soulbound identity tokens
│   ├── AssetNFT.sol        # Asset provenance NFTs  
│   ├── AuditRegistry.sol   # Immutable audit log
│   └── RoleManager.sol     # On-chain RBAC
├── database/            # PostgreSQL schema & migrations
│   ├── schema.sql          # Base schema v2.0
│   └── migrations/         # Incremental changes
├── src/
│   ├── app/                # Next.js App Router
│   ├── components/         # React components
│   ├── lib/                # Utilities & config
│   └── providers/          # Context providers
├── docs/                # Documentation
│   ├── CUSTODY_MODEL.md    # Wallet architecture
│   └── user-guides/        # End-user docs
├── ARCHITECTURE.md      # System architecture
└── CHANGELOG.md         # Change history
```

## 🔑 Custody Model

**Self-Custodial (User-Controlled Wallets)**

Users connect their own Web3 wallets to interact with blockchain features. The backend **NEVER** stores or manages user private keys.

**What Users Sign:**
- Identity NFT minting transactions
- Asset transfer transactions  
- Access request messages (off-chain, EIP-712)

**Backend Responsibilities:**
- Contract deployment (admin wallet via KMS)
- Database management
- API orchestration
- Batch audit anchoring

📖 Read more: [docs/CUSTODY_MODEL.md](docs/CUSTODY_MODEL.md)

## 🛡️ Security Features

- **Encrypted Sensitive Fields:** `criminal_check_status`, biometric photos
- **Access Logging:** Every sensitive field read creates audit trail
- **Row-Level Security:** Supabase RLS policies per role
- **Time-Bound Access:** Auto-expiring permissions with backend scheduler
- **Multi-Sig Approvals:** Critical actions require 2+ admin signatures
- **Rate Limiting:** IP-based and user-based request throttling
- **Security Incidents:** Automated detection and incident management
- **Guardian Recovery:** Multi-guardian account recovery system
- **Gas Cost Dashboard:** Real-time blockchain transaction monitoring
- **Security Posture:** Compliance tracking (SOC2, GDPR, HIPAA)
- **Verifiable Credentials:** W3C-compliant digital credentials

## 🕒 Backend Scheduler

The platform uses **node-cron** for automated tasks - a free, self-hosted alternative to Vercel cron jobs.

**Scheduled Tasks:**
- Every 5 minutes: Process audit logs and detect suspicious activity
- Every hour: Revoke expired time-bound access grants
- Daily at 2 AM UTC: Calculate security posture scores

**Management:**
```bash
# Get scheduler status
GET /api/scheduler/status

# Manually trigger task (admin only)
POST /api/scheduler/trigger
```

📖 Read more: [docs/BACKEND_SCHEDULER.md](docs/BACKEND_SCHEDULER.md)
- **Progressive Lockout:** Rate limiting + escalating login protection

## 🧪 Testing

```bash
# Run contract tests
npx hardhat test

# Run frontend tests (when implemented)
npm test

# E2E tests with Playwright
npm run test:e2e
```

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture & design decisions
- **[docs/CUSTODY_MODEL.md](docs/CUSTODY_MODEL.md)** - Wallet management detailed guide
- **[CHANGELOG.md](CHANGELOG.md)** - Version history & changes
- **[database/migrations/README.md](database/migrations/README.md)** - Database migration guide

## 🔧 Environment Variables

Key variables (see `.env.example` for full list):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Blockchain
NEXT_PUBLIC_CHAIN_ID=31337  # Hardhat local
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Wallet Connection
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# Admin Wallet (Backend Only)
# Development:
ADMIN_WALLET_PRIVATE_KEY=0x...

# Production (use KMS):
AWS_KMS_KEY_ID=arn:aws:kms:...
# OR
AZURE_KEY_VAULT_URL=https://...
```

⚠️ **Never commit private keys to git!**

## 🌐 Supported Networks

- **Local:** Hardhat (ChainID 31337)
- **Testnet:** Sepolia, Polygon Amoy, Optimism Sepolia
- **Mainnet:** Ethereum, Polygon, Optimism

Configure via `NEXT_PUBLIC_CHAIN_ID` in `.env.local`

## 🎯 Roles & Permissions

| Role | Permissions | Use Case |
|------|-------------|----------|
| **ADMIN** | Full system access, user registration, role assignment | System administrators |
| **VIEWER** | Read-only within department | Auditors, analysts |
| **ALTER** | View + minor edits within department | Operational staff |
| **DEBUGGER** | Cross-department read + classified access | Security inspectors |

## 🚢 Deployment

### Frontend (Vercel)

```bash
# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod
```

### Smart Contracts

```bash
# Deploy to testnet (e.g., Sepolia)
npx hardhat run scripts/deploy.ts --network sepolia

# Verify contracts
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Database Migrations

```bash
# Via Supabase CLI
supabase db push

# Or manually
psql $DATABASE_URL < database/migrations/YYYYMMDD_HHMMSS_description.sql
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

[Your License Here]

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/your-org/bel-secure-platform/issues)
- **Docs:** [docs/](docs/)
- **Email:** support@bel-sentinel.gov

---

**Built with:** Next.js • Supabase • Hardhat • wagmi • TypeScript
