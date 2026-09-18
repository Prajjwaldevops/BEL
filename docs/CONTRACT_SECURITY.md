# Smart Contract Security Documentation

## Overview

This document details the security hardening applied to BEL Secure Platform smart contracts and provides guidelines for running security analysis tools.

---

## Contracts Overview

### IdentityNFT.sol
**Purpose:** Soulbound identity tokens for verified users

**Security Features:**
- ✅ AccessControl (replaces single Ownable)
- ✅ ReentrancyGuard on `mintIdentity()`
- ✅ Pausable for emergency stops
- ✅ Soulbound enforcement via `_update()` override
- ✅ Input validation (non-zero addresses, non-empty strings)

**Roles:**
- `DEFAULT_ADMIN_ROLE`: Grant/revoke roles, pause contract
- `MINTER_ROLE`: Mint identity NFTs
- `PAUSER_ROLE`: Pause/unpause contract

**Attack Surface:**
- ❌ No reentrancy (protected)
- ❌ No unauthorized minting (role-gated)
- ❌ No transfer exploits (soulbound)
- ⚠️ Centralization: Admin controls all roles

---

### AssetNFT.sol
**Purpose:** Physical/digital asset provenance tracking

**Security Features:**
- ✅ AccessControl with granular roles
- ✅ ReentrancyGuard on minting and transfers
- ✅ Pausable for emergency stops
- ✅ Multi-layer authorization (contract roles + RoleManager)
- ✅ Input validation

**Roles:**
- `DEFAULT_ADMIN_ROLE`: Full admin capabilities
- `MINTER_ROLE`: Mint new assets
- `MANAGER_ROLE`: Update status, approve transfers
- `PAUSER_ROLE`: Emergency stop

**Attack Surface:**
- ❌ No reentrancy (protected)
- ❌ No unauthorized transfers (multi-check authorization)
- ⚠️ Depends on external RoleManager contract (trust required)

---

### AuditRegistry.sol
**Purpose:** Immutable audit log with batched anchoring

**Security Features:**
- ✅ AccessControl for role-based permissions
- ✅ ReentrancyGuard on all state changes
- ✅ Pausable for emergency stops
- ✅ Safe ETH handling (call instead of transfer)
- ✅ Merkle root uniqueness check

**Roles:**
- `DEFAULT_ADMIN_ROLE`: Admin capabilities
- `AUDITOR_ROLE`: Record logs and batch roots
- `PAUSER_ROLE`: Emergency stop

**Attack Surface:**
- ❌ No reentrancy (protected)
- ❌ No double-anchoring (root uniqueness check)
- ⚠️ Gas fee collection could be front-run (low risk, admin-controlled)

---

### RoleManager.sol
**Purpose:** On-chain RBAC coordination

**Status:** ⚠️ Needs hardening (still uses basic Ownable)

**Recommended Improvements:**
- [ ] Replace Ownable with AccessControl
- [ ] Add ReentrancyGuard
- [ ] Add Pausable
- [ ] Add role expiration timestamps
- [ ] Event emission for all state changes

---

### IdentityRegistry.sol
**Purpose:** DID management

**Status:** ⚠️ Needs hardening (still uses basic Ownable)

**Recommended Improvements:**
- [ ] Replace Ownable with AccessControl
- [ ] Add ReentrancyGuard
- [ ] Add Pausable
- [ ] Validate DID format
- [ ] Add key rotation mechanism

---

## Security Patterns Applied

### 1. AccessControl over Ownable

**Before:**
```solidity
contract IdentityNFT is Ownable {
    function mintIdentity(...) external onlyOwner { }
}
```

**After:**
```solidity
contract IdentityNFT is AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    function mintIdentity(...) external onlyRole(MINTER_ROLE) { }
}
```

**Benefits:**
- Granular permissions (separate minter, pauser, admin)
- Multi-admin support
- Role delegation without full ownership transfer
- Standard OpenZeppelin implementation (audited)

---

### 2. ReentrancyGuard

**Applied to:**
- All state-changing functions
- Functions with external calls
- Functions handling ETH

**Pattern:**
```solidity
function mintAsset(...) external nonReentrant {
    // State changes protected
}
```

**Protects Against:**
- Reentrancy attacks via callbacks
- Cross-function reentrancy
- Read-only reentrancy

---

### 3. Pausable Pattern

**Usage:**
```solidity
function mintIdentity(...) external whenNotPaused {
    // Function disabled when paused
}

function pause() external onlyRole(PAUSER_ROLE) {
    _pause();
}
```

**Use Cases:**
- Emergency response to exploits
- Scheduled maintenance
- Coordinated upgrades
- Incident investigation

---

### 4. Input Validation

**Checks Applied:**
- Non-zero addresses
- Non-empty strings
- Valid enum values
- Existence checks before updates
- Uniqueness checks where required

**Example:**
```solidity
require(_wallet != address(0), "Invalid wallet address");
require(bytes(_tokenURI).length > 0, "Token URI cannot be empty");
require(!hasMintedIdentity[_wallet], "Already minted");
```

---

### 5. Safe ETH Handling

**Before:**
```solidity
payable(owner()).transfer(balance);  // Can fail silently
```

**After:**
```solidity
(bool success, ) = payable(msg.sender).call{value: balance}("");
require(success, "Transfer failed");  // Explicit check
```

**Benefits:**
- Works with smart contract recipients
- Doesn't run out of gas
- Explicit failure handling

---

## Running Slither Analysis

### Installation

```bash
pip install slither-analyzer
```

### Basic Analysis

```bash
# Analyze all contracts
slither .

# Analyze specific contract
slither contracts/IdentityNFT.sol

# With custom config
slither . --config-file slither.config.json
```

### Generate Reports

```bash
# Markdown report
slither . --checklist --markdown-root slither-report.md

# JSON report
slither . --json slither-report.json

# Human-readable text
slither . --print human-summary
```

### Focus on Specific Issues

```bash
# High/Medium only
slither . --exclude-low --exclude-informational

# Specific detectors
slither . --detect reentrancy-eth,uninitialized-state

# Exclude false positives
slither . --exclude-dependencies --filter-paths "node_modules|test"
```

### Expected Issues (False Positives)

1. **"Function could be external"**
   - False positive if overriding virtual function
   - Can be ignored if visibility matches base contract

2. **"State variable could be constant"**
   - False positive for role constants already marked constant
   - Check each case individually

3. **"Assembly usage"**
   - OpenZeppelin uses assembly for gas optimization
   - Safe if from audited libraries

4. **"Low-level calls"**
   - Our safe ETH transfer pattern uses call
   - Validated with success check

---

## Automated Testing

### Hardhat Tests

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test file
npx hardhat test test/IdentityNFT.test.ts
```

### Coverage

```bash
npx hardhat coverage
```

**Target:** >90% line coverage, >85% branch coverage

---

## Manual Review Checklist

### Before Deployment

- [ ] All contracts compiled without warnings
- [ ] Slither analysis run and reviewed
- [ ] Unit tests passing with >90% coverage
- [ ] Integration tests passing
- [ ] Gas optimization reviewed
- [ ] Access control verified for all functions
- [ ] Event emissions verified
- [ ] NatSpec documentation complete
- [ ] Deployment script tested on testnet
- [ ] Multi-signature wallet setup (mainnet)

### Access Control Review

For each function:
- [ ] Correct modifier applied
- [ ] Role checked matches intent
- [ ] No bypasses possible
- [ ] Owner cannot brick contract

### Reentrancy Review

For each external call:
- [ ] State updated before call (checks-effects-interactions)
- [ ] ReentrancyGuard applied
- [ ] No cross-function reentrancy

### Input Validation Review

For each parameter:
- [ ] Address: checked for zero
- [ ] String: checked for empty (where required)
- [ ] Uint: checked for zero/overflow
- [ ] Enum: checked for valid value
- [ ] Array: checked for length

---

## Upgrade Strategy

### Current: Immutable Contracts

**Status:** Contracts are NOT upgradeable

**Pros:**
- ✅ Maximum security (no proxy risk)
- ✅ Tamper-proof
- ✅ Simpler architecture

**Cons:**
- ❌ Cannot fix bugs without migration
- ❌ Cannot add features
- ❌ Migration is expensive

### Migration Path (If Bugs Found)

1. Deploy new contract versions
2. Pause old contracts
3. Migrate data off-chain or via script
4. Update frontend to use new addresses
5. Retain old contracts for historical verification

### Future: Consider Upgradeability

If upgradeability needed:
- Use OpenZeppelin's UUPS pattern
- Require multi-sig for upgrades
- Add timelock (24-48 hours)
- Emit events on upgrades
- Maintain audit trail of versions

---

## Known Limitations

### 1. Centralization

**Issue:** Admin roles have significant power

**Mitigation:**
- Use multi-signature wallet for admin
- Implement timelock for critical operations (future)
- Multi-admin approvals for high-impact actions (Part B2)
- Public transparency via events

### 2. External Dependencies

**Issue:** AssetNFT depends on RoleManager contract

**Mitigation:**
- RoleManager should also be hardened
- Consider making RoleManager immutable
- Add circuit breakers if RoleManager fails

### 3. Gas Costs

**Issue:** AccessControl adds overhead vs Ownable

**Impact:** ~5-10% increase in gas per transaction

**Justification:** Security > gas savings

### 4. No Formal Verification

**Status:** Contracts not formally verified

**Future:** Consider formal verification for critical functions

---

## Incident Response

### If Vulnerability Discovered

1. **Immediate:**
   - Call `pause()` on affected contract(s)
   - Assess impact and exploit potential
   - Notify all admins via secure channel

2. **Short-term:**
   - Deploy patched contract
   - Migrate state if necessary
   - Update frontend to use new contract
   - Monitor for exploit attempts

3. **Long-term:**
   - Post-mortem analysis
   - Update security practices
   - Consider additional audits
   - Improve testing

### Emergency Contacts

- Smart Contract Team: [contact info]
- Security Team: [contact info]
- Multi-sig Signers: [list]

---

## Audit History

| Date | Auditor | Scope | Findings | Status |
|------|---------|-------|----------|--------|
| 2026-09-17 | Internal | Slither static analysis | TBD | Pending |
| TBD | External | Full audit | - | Not started |

---

## References

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Slither Documentation](https://github.com/crytic/slither)
- [Consensys Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [SWC Registry](https://swcregistry.io/)

---

**Last Updated:** 2026-09-17  
**Version:** 1.0  
**Status:** Hardening Complete, Slither Analysis Pending
