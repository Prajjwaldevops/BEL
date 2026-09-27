# Security Threat Model & Defense Matrix

## Threat Model

| Threat Vector | Attack Description | BEL Defense | Implementation Status | Verification Method |
|---------------|-------------------|-------------|----------------------|---------------------|
| **Signature Replay** | Intercepted signed wallet message replayed to authenticate as victim | EIP-191/EIP-712 nonce (single-use, 5-min expiry) stored in database; nonce invalidated after verification | 🔴 **Not Implemented** | Manual test: reuse same signature twice, expect second to fail with "nonce already used" |
| **Unauthorized Identity Revocation** | Non-owner attempts to revoke another user's DID | Dual-gate: (1) on-chain `onlyRole(ADMIN_ROLE)` modifier, (2) backend `requireRole('ADMIN')` middleware | 🟡 **Partial** - Backend check exists, contract lacks AccessControl | Call `revokeIdentity()` from non-admin wallet, expect revert |
| **Tampered Asset/Identity Metadata** | Off-chain record (photo, criminal check) modified after minting | `keccak256` hash of metadata anchored on-chain at mint time; `verifyMetadataHash(tokenId, hash)` checks on read | 🟡 **Partial** - Photo hash stored, verification function not implemented | Modify off-chain photo, call `verifyMetadataHash()`, expect false |
| **Reentrancy Attack** | Recursive call during `mint()` or `transfer()` to drain gas or manipulate state | OpenZeppelin `ReentrancyGuard` + Checks-Effects-Interactions pattern | 🔴 **Not Implemented** - Contracts lack ReentrancyGuard | Deploy malicious contract with fallback calling `mint()`, expect revert |
| **Privilege Escalation** | Low-role user (VIEWER) attempts admin action (register user, revoke identity) | Backend: `requireRole()` middleware per route; Frontend: conditional rendering; On-chain: `AccessControl` | 🟡 **Partial** - Backend middleware exists, on-chain AccessControl missing | Attempt admin API call with VIEWER token, expect 403 |
| **Contract Compromise** | Vulnerability found post-deploy (e.g., unprotected `selfdestruct`, integer overflow) | (1) OpenZeppelin `Pausable` for emergency freeze, (2) documented incident response plan, (3) multi-sig upgrade governance | 🔴 **Not Implemented** - No pause mechanism, no upgrade path documented | Call `pause()` as admin, attempt `mint()`, expect "Pausable: paused" |
| **API DoS / Brute Force** | Nonce flooding (request 1000 nonces), password guessing, access code brute force | Rate limiting: 20 req/15min/IP on `/api/auth/*`, progressive lockout after 3 failed access code attempts | 🟢 **Implemented** - `src/lib/rate-limit.ts` enforces limits | Send 25 requests in 10 seconds, expect 429 on request 21 |
| **Sensitive Data Exposure** | `criminal_check_status`, biometric photos read without authorization | (1) Field-level AES-256-GCM encryption at rest, (2) row-level security (RLS) in Supabase, (3) every read logged to audit trail | 🟡 **Partial** - Schema has encrypted fields, RLS policies incomplete | Query `criminal_check_status` as VIEWER, expect null or 403 |
| **Session Hijacking** | Stolen JWT reused from different IP/device | (1) JWT signed with HMAC-SHA256 (256-bit secret), (2) 24h expiry, (3) optional IP binding check on sensitive routes | 🟡 **Partial** - JWT issued, IP binding not enforced | Use valid JWT from different IP on critical route, currently succeeds (should log warning or block) |
| **MITM / Transport Security** | Credentials or tokens intercepted over HTTP | HTTPS enforced (TLS 1.3) via Vercel/Cloudflare, HSTS header set | 🟢 **Implemented** (production only) | Check response headers for `Strict-Transport-Security` |
| **Insider Threat** | Malicious ADMIN leaks database | (1) Every privileged action logged to immutable audit trail, (2) multi-sig approval for critical actions (identity revocation, role elevation), (3) quarterly audit log review | 🟡 **Partial** - Audit logging exists, multi-sig approvals incomplete | Revoke identity as single admin, currently succeeds (should require 2-of-3 approval) |
| **Smart Contract Upgrade Backdoor** | Malicious upgrade replaces legitimate contract logic | Transparent proxy pattern with timelock (48h delay) + multi-sig upgrade governance (3-of-5 admin threshold) | 🔴 **Not Implemented** - Contracts are not upgradeable | N/A - document in Phase 2.5 |
| **Front-Running** | Attacker sees pending `mintAsset()` tx in mempool, submits higher-gas tx to mint same asset first | Commit-reveal scheme for sensitive minting, or use private mempool (Flashbots) | 🔴 **Not Implemented** | N/A - low priority for testnet, document for mainnet |
| **Oracle Manipulation** | If using external oracle for KYC/criminal check data, oracle feed manipulated | Use Chainlink decentralized oracle network with median aggregation (3+ data sources) | 🔴 **Not Implemented** - No oracle integration yet | N/A - future work |
| **Key Loss** | User loses wallet private key, loses identity permanently | Guardian-based social recovery: 2-of-3 pre-designated guardians can co-sign recovery tx to update `publicKeyHash` | 🔴 **Not Implemented** | N/A - Phase 2.5 |

---

## Implementation Status Summary

### 🟢 Fully Implemented (3)
- Rate limiting on auth endpoints
- HTTPS/TLS transport security (production)
- Audit logging for privileged actions

### 🟡 Partially Implemented (6)
- Metadata hash anchoring (stored but not verified)
- Role-based access control (backend only, not on-chain)
- Sensitive data protection (schema ready, RLS incomplete)
- JWT session management (no IP binding)
- Multi-sig approvals (framework exists, not enforced for critical actions)
- Insider threat protection (logging only, no approval quorum)

### 🔴 Not Implemented (8)
- Wallet signature authentication (EIP-191/EIP-712)
- ReentrancyGuard on smart contracts
- Pausable emergency freeze
- On-chain AccessControl
- Metadata hash verification function
- Guardian-based key recovery
- Contract upgrade governance
- Front-running protection

---

## Critical Security Gaps (Fix First)

1. **No Wallet Signature Auth** — Current login uses username/password, vulnerable to credential theft. Replace with EIP-191 challenge-response (Phase 1).

2. **Reentrancy Risk** — Contracts lack `ReentrancyGuard`, vulnerable to recursive call attacks during minting/transfer (Phase 2.1).

3. **No On-Chain Access Control** — Permission checks only in backend/frontend, attacker can bypass by calling contracts directly (Phase 2.2).

4. **No Emergency Pause** — If vulnerability discovered post-deploy, no way to freeze state transitions instantly (Phase 2.2).

5. **Single Admin Key Risk** — Identity revocation, role elevation require single admin signature; should require multi-sig quorum (Phase 2.4).

---

## Defense-in-Depth Layers

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Transport (HTTPS/TLS 1.3)             │ ✅ Implemented
├─────────────────────────────────────────────────┤
│  Layer 2: Authentication (Wallet Signature)     │ ❌ Not Implemented
├─────────────────────────────────────────────────┤
│  Layer 3: Authorization (RBAC + AccessControl)  │ ⚠️  Partial (backend only)
├─────────────────────────────────────────────────┤
│  Layer 4: Rate Limiting (IP-based)              │ ✅ Implemented
├─────────────────────────────────────────────────┤
│  Layer 5: Data Encryption (AES-256-GCM)         │ ⚠️  Partial (schema ready)
├─────────────────────────────────────────────────┤
│  Layer 6: Smart Contract Hardening              │ ❌ Not Implemented
│    - ReentrancyGuard                            │
│    - Pausable                                   │
│    - AccessControl                              │
├─────────────────────────────────────────────────┤
│  Layer 7: Audit Trail (Immutable Logging)       │ ✅ Implemented
├─────────────────────────────────────────────────┤
│  Layer 8: Incident Response (Automated)         │ ⚠️  Partial (detection only)
└─────────────────────────────────────────────────┘
```

---

## Security Testing Checklist

### Manual Testing
- [ ] Attempt to reuse signed nonce (expect failure)
- [ ] Call admin-only contract function from non-admin wallet (expect revert)
- [ ] Modify off-chain metadata after minting, verify hash check fails
- [ ] Send 25 auth requests in 10 seconds (expect rate limit after 20)
- [ ] Access sensitive field as wrong role (expect 403 or null)
- [ ] Use JWT from different IP (currently allowed, should log anomaly)

### Automated Testing (Phase 3)
- [ ] Hardhat test: Reentrancy attack blocked
- [ ] Hardhat test: AccessControl enforces role modifiers
- [ ] Hardhat test: Pausable blocks state changes
- [ ] Hardhat test: Multi-sig requires quorum before execution
- [ ] Hardhat test: Metadata hash verification detects tampering

### Static Analysis (Phase 2.6)
- [ ] Run `slither .` on all contracts
- [ ] Run `mythril analyze` on IdentityNFT.sol
- [ ] Run `npm audit` and fix high/critical vulnerabilities

---

## Cryptographic Primitives

| Primitive | Usage | Library | Key Size |
|-----------|-------|---------|----------|
| ECDSA (secp256k1) | Wallet signatures (EIP-191/EIP-712) | ethers.js | 256-bit |
| keccak256 | Metadata hashing, event hashing | Solidity native | 256-bit |
| SHA-256 | Merkle tree construction | Solidity native | 256-bit |
| AES-256-GCM | Field-level encryption (sensitive data) | Supabase/Node crypto | 256-bit |
| HMAC-SHA256 | JWT signature | jsonwebtoken | 256-bit |

---

## Compliance & Standards

| Standard | Compliance Status | Notes |
|----------|-------------------|-------|
| **OWASP Top 10 (2021)** | ⚠️ Partial | A01 (Broken Access Control) - partial; A07 (Identification & Auth) - incomplete |
| **NIST Cybersecurity Framework** | ⚠️ Partial | Identify, Protect (in progress); Detect, Respond, Recover (partial) |
| **SOC 2 Type II** | 🔴 Not Pursued | Requires 6-12 month audit engagement |
| **GDPR (if EU users)** | ⚠️ Partial | Right to erasure conflicts with immutable audit trail (document legal basis) |
| **HIPAA (if health data)** | 🔴 Not Applicable | Platform does not handle PHI |

---

## Incident Response Plan

### Severity Levels

| Severity | Response Time | Action |
|----------|---------------|--------|
| **CRITICAL** | < 1 hour | (1) Call emergency admin meeting, (2) Pause contracts if active exploit, (3) Notify all users |
| **HIGH** | < 4 hours | (1) Investigate root cause, (2) Deploy hotfix if needed, (3) Post-mortem within 24h |
| **MEDIUM** | < 24 hours | (1) Create Jira ticket, (2) Schedule fix in next sprint |
| **LOW** | < 1 week | (1) Log in backlog, (2) Fix opportunistically |

### Example Playbook: Smart Contract Vulnerability Discovered

1. **Detect** — Security researcher reports reentrancy vulnerability in `AssetNFT.transferFrom()`
2. **Assess** — Confirm exploit is possible on testnet
3. **Contain** — Call `pause()` on all contracts (requires 2-of-3 multi-sig)
4. **Eradicate** — Deploy patched contract with `ReentrancyGuard`
5. **Recover** — Unpause after 48h timelock + community review
6. **Post-Mortem** — Publish incident report, update threat model

---

## Future Work

### Phase 2.5 (Post-SIH)
- [ ] Guardian-based social recovery for key loss
- [ ] Contract upgrade governance (transparent proxy + timelock)
- [ ] ZK-STARK selective disclosure (prove clearance level without revealing record)
- [ ] Hardware security module (HSM) for admin key storage

### Phase 3 (Enterprise Readiness)
- [ ] SOC 2 Type II certification
- [ ] Penetration testing by third-party firm
- [ ] Bug bounty program (HackerOne or Immunefi)
- [ ] Formal verification of critical contract functions (Certora, K Framework)

---

## Security Contact

**Report vulnerabilities to:** security@bel-sentinel.gov  
**PGP Key:** [Link to public key]  
**Bug Bounty:** Coming soon (post-SIH)

**Do NOT disclose vulnerabilities publicly until patched.**

---

Last Updated: 2024-09-18  
Reviewed By: [Security Team Lead Name]  
Next Review: 2024-12-18
