# Part B: Feature Implementation Blueprint

**Status:** Part A Complete ✅ | Part B Blueprint Ready 📋

This document provides detailed implementation blueprints for all 10 Part B features. Each blueprint includes:
- Database schema changes
- Smart contract modifications
- API endpoints
- Frontend components
- Configuration requirements
- Testing strategy
- Security considerations

---

## B1: Guardian-Based Identity Recovery System

### Problem
In a self-custodial system, losing wallet access = permanently losing identity. We need a secure recovery mechanism.

### Solution
M-of-N guardian approval system where users nominate trusted individuals who can collectively help recover access.

### Database Schema

```sql
-- Migration: 20260917_004_add_guardian_recovery.sql

-- Guardian relationships
CREATE TABLE recovery_guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    guardian_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    removed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    UNIQUE(identity_id, guardian_profile_id, is_active)
);

-- Recovery requests
CREATE TABLE recovery_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    requested_by_profile_id UUID NOT NULL REFERENCES profiles(id),
    old_wallet_address VARCHAR(42) NOT NULL,
    new_wallet_address VARCHAR(42) NOT NULL,
    required_approvals INTEGER NOT NULL,
    approval_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED')),
    expires_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guardian approvals
CREATE TABLE guardian_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recovery_request_id UUID NOT NULL REFERENCES recovery_requests(id) ON DELETE CASCADE,
    guardian_profile_id UUID NOT NULL REFERENCES profiles(id),
    approved BOOLEAN NOT NULL,
    signature VARCHAR(132),  -- ECDSA signature
    reason TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(recovery_request_id, guardian_profile_id)
);

-- Indexes
CREATE INDEX idx_guardians_identity ON recovery_guardians(identity_id);
CREATE INDEX idx_guardians_guardian ON recovery_guardians(guardian_profile_id);
CREATE INDEX idx_recovery_identity ON recovery_requests(identity_id);
CREATE INDEX idx_recovery_status ON recovery_requests(status);
CREATE INDEX idx_approvals_request ON guardian_approvals(recovery_request_id);

-- RLS
ALTER TABLE recovery_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_approvals ENABLE ROW LEVEL SECURITY;

-- System settings
INSERT INTO system_settings (key, value, category, description) VALUES
('guardian_min_count', '3', 'recovery', 'Minimum number of guardians required'),
('guardian_max_count', '10', 'recovery', 'Maximum number of guardians allowed'),
('guardian_approval_threshold', '0.6', 'recovery', 'Percentage of guardians needed for approval (e.g., 0.6 = 60% = 3 of 5)'),
('recovery_request_expiry_hours', '72', 'recovery', 'Hours before recovery request expires');
```

### Smart Contract

```solidity
// contracts/IdentityRecovery.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IdentityNFT.sol";

contract IdentityRecovery is AccessControl, ReentrancyGuard {
    bytes32 public constant RECOVERY_EXECUTOR_ROLE = keccak256("RECOVERY_EXECUTOR_ROLE");
    
    IdentityNFT public identityNFT;
    
    struct RecoveryRequest {
        address oldWallet;
        address newWallet;
        uint256 tokenId;
        uint256 requiredApprovals;
        uint256 approvalCount;
        uint256 expiresAt;
        bool executed;
    }
    
    mapping(bytes32 => RecoveryRequest) public recoveryRequests;
    mapping(bytes32 => mapping(address => bool)) public hasApproved;
    
    event RecoveryRequested(bytes32 indexed requestId, address indexed oldWallet, address indexed newWallet, uint256 tokenId);
    event RecoveryApproved(bytes32 indexed requestId, address indexed guardian);
    event RecoveryExecuted(bytes32 indexed requestId, address indexed oldWallet, address indexed newWallet, uint256 tokenId);
    event RecoveryRejected(bytes32 indexed requestId);
    
    constructor(address _identityNFT) {
        identityNFT = IdentityNFT(_identityNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RECOVERY_EXECUTOR_ROLE, msg.sender);
    }
    
    function initiateRecovery(
        address oldWallet,
        address newWallet,
        uint256 tokenId,
        uint256 requiredApprovals,
        uint256 expiryDuration
    ) external onlyRole(RECOVERY_EXECUTOR_ROLE) returns (bytes32) {
        require(newWallet != address(0), "Invalid new wallet");
        require(requiredApprovals > 0, "Invalid approval count");
        
        bytes32 requestId = keccak256(abi.encodePacked(oldWallet, newWallet, tokenId, block.timestamp));
        
        recoveryRequests[requestId] = RecoveryRequest({
            oldWallet: oldWallet,
            newWallet: newWallet,
            tokenId: tokenId,
            requiredApprovals: requiredApprovals,
            approvalCount: 0,
            expiresAt: block.timestamp + expiryDuration,
            executed: false
        });
        
        emit RecoveryRequested(requestId, oldWallet, newWallet, tokenId);
        return requestId;
    }
    
    function approveRecovery(bytes32 requestId, address guardian) 
        external 
        onlyRole(RECOVERY_EXECUTOR_ROLE) 
        nonReentrant 
    {
        RecoveryRequest storage request = recoveryRequests[requestId];
        require(!request.executed, "Already executed");
        require(block.timestamp < request.expiresAt, "Request expired");
        require(!hasApproved[requestId][guardian], "Already approved");
        
        hasApproved[requestId][guardian] = true;
        request.approvalCount++;
        
        emit RecoveryApproved(requestId, guardian);
        
        // Auto-execute if threshold reached
        if (request.approvalCount >= request.requiredApprovals) {
            _executeRecovery(requestId);
        }
    }
    
    function _executeRecovery(bytes32 requestId) internal {
        RecoveryRequest storage request = recoveryRequests[requestId];
        require(!request.executed, "Already executed");
        require(request.approvalCount >= request.requiredApprovals, "Insufficient approvals");
        
        request.executed = true;
        
        // Note: Actual NFT transfer would need to be handled differently
        // since IdentityNFTs are soulbound. This might involve:
        // 1. Burning old NFT and minting new one
        // 2. Or updating internal mapping in IdentityNFT contract
        
        emit RecoveryExecuted(requestId, request.oldWallet, request.newWallet, request.tokenId);
    }
}
```

### API Endpoints

```typescript
// src/app/api/recovery/guardians/add/route.ts
POST /api/recovery/guardians/add
Body: {
  identityId: UUID,
  guardianProfileId: UUID,
  addedBy: UUID
}
Response: { success: boolean, guardian: Guardian }

// src/app/api/recovery/guardians/list/route.ts
GET /api/recovery/guardians/list?identityId=xxx
Response: { guardians: Guardian[], minRequired: number }

// src/app/api/recovery/request/route.ts
POST /api/recovery/request
Body: {
  identityId: UUID,
  oldWalletAddress: string,
  newWalletAddress: string,
  requestedBy: UUID
}
Response: { success: boolean, requestId: UUID, requiredApprovals: number }

// src/app/api/recovery/approve/route.ts
POST /api/recovery/approve
Body: {
  requestId: UUID,
  guardianProfileId: UUID,
  approved: boolean,
  signature: string,
  reason?: string
}
Response: { success: boolean, approvalCount: number, threshold: number }

// src/app/api/recovery/status/route.ts
GET /api/recovery/status?requestId=xxx
Response: { request: RecoveryRequest, approvals: Approval[], canExecute: boolean }
```

### Service Layer

```typescript
// src/lib/recovery-service.ts
import { createClient } from '@supabase/supabase-js'

export async function addGuardian(params: {
  identityId: string
  guardianProfileId: string
  addedBy: string
}): Promise<{ success: boolean; guardian?: any; error?: string }>

export async function removeGuardian(params: {
  identityId: string
  guardianProfileId: string
  removedBy: string
}): Promise<{ success: boolean; error?: string }>

export async function listGuardians(identityId: string): Promise<{
  success: boolean
  guardians?: Guardian[]
  minRequired?: number
  error?: string
}>

export async function initiateRecovery(params: {
  identityId: string
  oldWallet: string
  newWallet: string
  requestedBy: string
}): Promise<{
  success: boolean
  requestId?: string
  requiredApprovals?: number
  error?: string
}>

export async function approveRecovery(params: {
  requestId: string
  guardianProfileId: string
  approved: boolean
  signature: string
  reason?: string
}): Promise<{
  success: boolean
  approvalCount?: number
  threshold?: number
  autoExecuted?: boolean
  error?: string
}>

export async function executeRecovery(requestId: string): Promise<{
  success: boolean
  txHash?: string
  error?: string
}>
```

### Frontend Components

```typescript
// src/components/GuardianManager.tsx
// - List current guardians
// - Add guardian (search profiles, send invitation)
// - Remove guardian (with confirmation)
// - Show guardian status (active, pending acceptance)

// src/components/RecoveryRequestForm.tsx
// - Input: new wallet address
// - Show: guardians list, required approvals
// - Submit recovery request
// - Display request ID and next steps

// src/components/GuardianApprovalPanel.tsx
// - List pending recovery requests where user is a guardian
// - Show request details (who, when, old/new wallet)
// - Approve/reject buttons
// - Sign approval with wallet

// src/components/RecoveryStatusTracker.tsx
// - Show recovery request status
// - Progress bar (approvals received / required)
// - List of guardians and their approval status
// - Countdown timer to expiry
// - Execute button when threshold reached
```

### Configuration

```typescript
// Recovery settings (from system_settings table)
interface RecoveryConfig {
  minGuardians: number        // Default: 3
  maxGuardians: number        // Default: 10
  approvalThreshold: number   // Default: 0.6 (60%)
  requestExpiryHours: number  // Default: 72
}

// M-of-N calculation
function calculateRequiredApprovals(guardianCount: number, threshold: number): number {
  return Math.ceil(guardianCount * threshold)
}

// Example: 5 guardians, 60% threshold = Math.ceil(5 * 0.6) = 3 approvals needed
```

### Security Considerations

1. **Guardian Selection:**
   - Guardians must be verified profiles
   - Cannot be the identity owner themselves
   - Recommend diversity (different departments, locations)
   - Should have active status

2. **Request Validation:**
   - Verify identity ownership before request
   - Check guardian count meets minimum
   - Validate new wallet address format
   - Ensure no pending requests already exist

3. **Approval Security:**
   - Require wallet signature from guardian
   - Check guardian is still active when approving
   - Log IP address and timestamp
   - Notify identity owner of each approval

4. **Execution:**
   - Double-check threshold before execution
   - Verify request not expired
   - Create audit log entry
   - Emit security event
   - Update IdentityNFT mapping (burn old, mint new)

5. **Attack Prevention:**
   - Rate limit recovery requests (1 per 24 hours)
   - Notify owner immediately on request creation
   - Allow owner to reject request if not initiated by them
   - Time lock before execution (even after threshold met)

### Testing Strategy

```typescript
// Unit tests
describe('Recovery System', () => {
  test('Add guardians within limits', () => {})
  test('Reject guardian addition beyond max', () => {})
  test('Calculate M-of-N correctly', () => {})
  test('Initiate recovery request', () => {})
  test('Guardian approval increments count', () => {})
  test('Auto-execute when threshold reached', () => {})
  test('Expire requests after timeout', () => {})
  test('Reject approvals from non-guardians', () => {})
})

// Integration tests
describe('Recovery Flow', () => {
  test('Complete recovery flow: request → approvals → execute', async () => {})
  test('Rejection flow: guardian rejects → request canceled', async () => {})
  test('Expiry flow: request times out → marked expired', async () => {})
})

// E2E tests (Playwright)
describe('Guardian Recovery E2E', () => {
  test('User adds 5 guardians successfully', async () => {})
  test('User loses wallet and requests recovery', async () => {})
  test('3 guardians approve recovery', async () => {})
  test('Recovery executed, new wallet has identity', async () => {})
})
```

### User Flow

1. **Setup Phase:**
   - User navigates to Security Settings
   - Clicks "Add Guardians"
   - Searches for trusted colleagues
   - Sends guardian invitation
   - Guardian accepts invitation
   - Repeat until 3-5 guardians added

2. **Recovery Phase:**
   - User loses wallet access
   - Contacts platform support or uses recovery form
   - Provides identity proof (email, biometric, etc.)
   - Creates new wallet
   - Submits recovery request with new wallet address
   - System notifies all guardians

3. **Approval Phase:**
   - Guardians receive notification
   - Each guardian reviews request
   - Guardian connects wallet and signs approval
   - System tracks approval count
   - When threshold reached, recovery executes

4. **Execution Phase:**
   - Smart contract burns old identity NFT
   - Smart contract mints new identity NFT to new wallet
   - Database updates wallet_address mapping
   - User can now access with new wallet

### Future Enhancements

- [ ] Guardian rotation (suggest changing guardians annually)
- [ ] Social recovery (integrate with external identity providers)
- [ ] Biometric fallback (combine with biometric verification)
- [ ] Progressive approval (higher thresholds for suspicious requests)
- [ ] Guardian delegation (guardian can delegate to another trusted party)

---

## B2: Multi-Signature Approval for High-Impact Actions

### Problem
Single admin approval for critical actions (role escalation, high-value transfers, NFT burns) is risky.

### Solution
Require M-of-N admin approval for sensitive operations before execution.

### Database Schema

```sql
-- Migration: 20260917_005_add_multisig_approvals.sql

-- Action types requiring multi-sig
CREATE TYPE approval_action_type AS ENUM (
    'ROLE_ESCALATION',
    'HIGH_VALUE_TRANSFER',
    'NFT_BURN',
    'CONTRACT_PAUSE',
    'GUARDIAN_OVERRIDE',
    'BULK_OPERATION',
    'SYSTEM_CONFIG_CHANGE'
);

-- Pending approvals
CREATE TABLE pending_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type approval_action_type NOT NULL,
    action_description TEXT NOT NULL,
    payload JSONB NOT NULL,  -- Full action parameters
    requested_by UUID NOT NULL REFERENCES profiles(id),
    required_approvals INTEGER NOT NULL,
    approval_count INTEGER DEFAULT 0,
    rejection_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED', 'CANCELED')),
    expires_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    executed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual approvals/rejections
CREATE TABLE approval_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pending_approval_id UUID NOT NULL REFERENCES pending_approvals(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES profiles(id),
    vote VARCHAR(10) NOT NULL CHECK (vote IN ('APPROVE', 'REJECT')),
    reason TEXT,
    signature VARCHAR(132),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pending_approval_id, approver_id)
);

-- Indexes
CREATE INDEX idx_pending_approvals_status ON pending_approvals(status);
CREATE INDEX idx_pending_approvals_type ON pending_approvals(action_type);
CREATE INDEX idx_pending_approvals_requested_by ON pending_approvals(requested_by);
CREATE INDEX idx_approval_votes_pending ON approval_votes(pending_approval_id);
CREATE INDEX idx_approval_votes_approver ON approval_votes(approver_id);

-- RLS
ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_votes ENABLE ROW LEVEL SECURITY;

-- Function to check if action requires approval
CREATE OR REPLACE FUNCTION requires_multisig_approval(
    p_action_type approval_action_type,
    p_payload JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Always require approval for these actions
    IF p_action_type IN ('ROLE_ESCALATION', 'NFT_BURN', 'CONTRACT_PAUSE', 'GUARDIAN_OVERRIDE') THEN
        RETURN TRUE;
    END IF;
    
    -- High value transfers (check amount)
    IF p_action_type = 'HIGH_VALUE_TRANSFER' THEN
        RETURN (p_payload->>'value')::DECIMAL > 1000.0;
    END IF;
    
    -- Bulk operations (check count)
    IF p_action_type = 'BULK_OPERATION' THEN
        RETURN (p_payload->>'count')::INTEGER > 10;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- System settings
INSERT INTO system_settings (key, value, category, description) VALUES
('multisig_admin_threshold', '0.67', 'approvals', 'Percentage of admins needed for approval (67% = 2 of 3)'),
('multisig_expiry_hours', '48', 'approvals', 'Hours before approval request expires'),
('multisig_min_admins', '2', 'approvals', 'Minimum number of admins required for multi-sig');
```

### API Endpoints

```typescript
// src/app/api/approvals/request/route.ts
POST /api/approvals/request
Body: {
  actionType: ApprovalActionType,
  actionDescription: string,
  payload: object,
  requestedBy: UUID
}
Response: { success: boolean, approvalId: UUID, requiredApprovals: number }

// src/app/api/approvals/list/route.ts
GET /api/approvals/list?status=PENDING&type=ROLE_ESCALATION
Response: { approvals: PendingApproval[], total: number }

// src/app/api/approvals/vote/route.ts
POST /api/approvals/vote
Body: {
  approvalId: UUID,
  approverId: UUID,
  vote: 'APPROVE' | 'REJECT',
  reason?: string,
  signature: string
}
Response: { success: boolean, newCount: number, threshold: number, autoExecuted: boolean }

// src/app/api/approvals/execute/route.ts
POST /api/approvals/execute
Body: {
  approvalId: UUID,
  executedBy: UUID
}
Response: { success: boolean, result: any }

// src/app/api/approvals/cancel/route.ts
POST /api/approvals/cancel
Body: {
  approvalId: UUID,
  canceledBy: UUID,
  reason: string
}
Response: { success: boolean }
```

### Service Layer

```typescript
// src/lib/multisig-service.ts

export async function requestApproval(params: {
  actionType: ApprovalActionType
  actionDescription: string
  payload: object
  requestedBy: string
}): Promise<{
  success: boolean
  approvalId?: string
  requiredApprovals?: number
  error?: string
}>

export async function voteOnApproval(params: {
  approvalId: string
  approverId: string
  vote: 'APPROVE' | 'REJECT'
  reason?: string
  signature: string
}): Promise<{
  success: boolean
  newCount?: number
  threshold?: number
  autoExecuted?: boolean
  error?: string
}>

export async function executeApproval(
  approvalId: string,
  executedBy: string
): Promise<{
  success: boolean
  result?: any
  error?: string
}>

export async function cancelApproval(
  approvalId: string,
  canceledBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }>

// Action executors for each type
async function executeRoleEscalation(payload: any): Promise<void>
async function executeHighValueTransfer(payload: any): Promise<void>
async function executeNFTBurn(payload: any): Promise<void>
async function executeContractPause(payload: any): Promise<void>
```

### Frontend Components

```typescript
// src/components/ApprovalRequestPanel.tsx
// - Show all pending approvals
// - Filter by type, status
// - Display action details
// - Show approval progress (votes received / required)
// - Approve/Reject buttons

// src/components/ApprovalRequestForm.tsx
// - Form to create new approval request
// - Action type selector
// - Dynamic form fields based on action type
// - Preview of what will be executed
// - Submit button

// src/components/ApprovalDetailsModal.tsx
// - Full details of approval request
// - Requestor information
// - Action parameters
// - List of approvers and their votes
// - Approval/rejection reasons
// - Execution status
```

### Integration Points

1. **Role Assignment:**
   ```typescript
   // Before
   await assignRole(userId, 'ADMIN')
   
   // After
   if (requires_multisig_approval('ROLE_ESCALATION', payload)) {
     const approval = await requestApproval({
       actionType: 'ROLE_ESCALATION',
       payload: { userId, role: 'ADMIN' },
       requestedBy: currentUser.id
     })
     // Wait for approvals...
   } else {
     await assignRole(userId, 'ADMIN')
   }
   ```

2. **Asset Transfer:**
   ```typescript
   if (assetValue > HIGH_VALUE_THRESHOLD) {
     await requestApproval({
       actionType: 'HIGH_VALUE_TRANSFER',
       payload: { assetId, from, to, value },
       requestedBy: currentUser.id
     })
   }
   ```

### Notification System

```typescript
// When approval requested
- Email all admins
- In-app notification
- Slack/Discord webhook (optional)

// When vote cast
- Notify requestor of progress
- If rejected, notify immediately

// When threshold reached
- Notify requestor approval is ready
- Auto-execute or require manual execution

// When executed
- Notify all participants
- Create audit log entry
```

---

## B3: Time-Bound Auto-Expiring Access Grants

### Database Schema

```sql
-- Migration: 20260917_006_add_expiring_access.sql

-- Add expires_at to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE INDEX idx_user_roles_expires ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- Add expires_at to asset_permissions
ALTER TABLE asset_permissions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE INDEX idx_asset_permissions_expires ON asset_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- Function to auto-revoke expired grants
CREATE OR REPLACE FUNCTION revoke_expired_access()
RETURNS TABLE(
    expired_roles INTEGER,
    expired_permissions INTEGER
) AS $$
DECLARE
    v_expired_roles INTEGER;
    v_expired_permissions INTEGER;
BEGIN
    -- Revoke expired roles
    UPDATE user_roles
    SET is_active = FALSE,
        revoked_at = NOW()
    WHERE is_active = TRUE
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
    
    GET DIAGNOSTICS v_expired_roles = ROW_COUNT;
    
    -- Log each revocation as security event
    INSERT INTO security_events (
        event_type,
        severity,
        description,
        metadata
    )
    SELECT
        'PERMISSION_EXPIRED',
        'LOW',
        format('Role %s expired for user %s', r.name, p.username),
        jsonb_build_object(
            'profile_id', ur.profile_id,
            'role_id', ur.role_id,
            'expired_at', ur.expires_at
        )
    FROM user_roles ur
    JOIN profiles p ON ur.profile_id = p.id
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.revoked_at >= NOW() - INTERVAL '1 second';
    
    -- Revoke expired asset permissions
    UPDATE asset_permissions
    SET is_active = FALSE,
        revoked_at = NOW()
    WHERE is_active = TRUE
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
    
    GET DIAGNOSTICS v_expired_permissions = ROW_COUNT;
    
    RETURN QUERY SELECT v_expired_roles, v_expired_permissions;
END;
$$ LANGUAGE plpgsql;
```

### API Endpoints

```typescript
// src/app/api/access/grant-temporary/route.ts
POST /api/access/grant-temporary
Body: {
  type: 'ROLE' | 'ASSET_PERMISSION',
  targetId: UUID,  // profile_id or asset_id
  grantType: string,  // role name or permission type
  expiresInHours: number,
  grantedBy: UUID,
  reason: string
}

// src/app/api/access/extend/route.ts
POST /api/access/extend
Body: {
  grantId: UUID,
  additionalHours: number,
  extendedBy: UUID,
  reason: string
}

// src/app/api/access/revoke-early/route.ts
POST /api/access/revoke-early
Body: {
  grantId: UUID,
  revokedBy: UUID,
  reason: string
}
```

### Cron Job

```typescript
// src/app/api/cron/revoke-expired-access/route.ts
GET /api/cron/revoke-expired-access
// Runs every 15 minutes
// Calls revoke_expired_access() function
// Logs results
```

---

## B4: ZK Selective Disclosure for Clearance Levels

### Overview
Instead of exposing full clearance level, generate ZK proof that `clearance >= required_level`.

### Technology Stack
- **circom**: Circuit definition language
- **snarkjs**: Proof generation/verification
- **Solidity verifier**: On-chain verification

### Circuit Definition

```circom
// circuits/clearance_check.circom
pragma circom 2.0.0;

template ClearanceCheck() {
    signal input clearance_level;      // User's actual clearance (private)
    signal input required_level;        // Required clearance (public)
    signal output is_sufficient;        // 1 if sufficient, 0 otherwise
    
    component gte = GreaterEqThan(8);
    gte.in[0] <== clearance_level;
    gte.in[1] <== required_level;
    
    is_sufficient <== gte.out;
}

component main = ClearanceCheck();
```

### Implementation Files

```typescript
// src/lib/zk-clearance.ts
import { groth16 } from 'snarkjs'

export async function generateClearanceProof(params: {
  userClearance: number
  requiredClearance: number
}): Promise<{
  proof: any
  publicSignals: string[]
}>

export async function verifyClearanceProof(params: {
  proof: any
  publicSignals: string[]
  requiredClearance: number
}): Promise<boolean>
```

### Database Changes

```sql
-- Store ZK proofs
CREATE TABLE clearance_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    resource_id UUID NOT NULL,
    proof JSONB NOT NULL,
    public_signals JSONB NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
```

---

## B5: Automated Incident Response for CRITICAL Events

### Trigger System

```sql
-- Trigger on CRITICAL security_events
CREATE OR REPLACE FUNCTION handle_critical_security_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.severity = 'CRITICAL' THEN
        -- Suspend affected profile
        UPDATE profiles
        SET status = 'SUSPENDED'
        WHERE username = NEW.actor;
        
        -- Create pending_approval for reinstatement
        INSERT INTO pending_approvals (
            action_type,
            action_description,
            payload,
            requested_by,
            required_approvals,
            expires_at
        ) VALUES (
            'ACCOUNT_REINSTATEMENT',
            format('Reinstate account after CRITICAL event: %s', NEW.description),
            jsonb_build_object('profile_username', NEW.actor, 'event_id', NEW.id),
            (SELECT id FROM profiles WHERE is_admin = TRUE LIMIT 1),
            2,  -- Require 2 admin approvals
            NOW() + INTERVAL '7 days'
        );
        
        -- Send alert (webhook)
        PERFORM pg_notify('critical_security_event', NEW.id::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_critical_security_event
    AFTER INSERT ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION handle_critical_security_event();
```

### Webhook Handler

```typescript
// src/app/api/webhooks/security-alert/route.ts
POST /api/webhooks/security-alert
// Called by database trigger via pg_notify
// Sends email, Slack, SMS alerts
```

---

## B6: One-Click Compliance/Chain-of-Custody Export

### Export API

```typescript
// src/app/api/export/compliance/route.ts
POST /api/export/compliance
Body: {
  exportType: 'ASSET' | 'PROFILE',
  targetId: UUID,
  format: 'PDF' | 'CSV' | 'JSON',
  includeProofs: boolean
}
Response: {
  success: boolean,
  downloadUrl: string,
  expiresAt: string
}
```

### Export Service

```typescript
// src/lib/export-service.ts
export async function generateComplianceReport(params: {
  type: 'ASSET' | 'PROFILE'
  id: string
}): Promise<{
  metadata: object
  events: AuditEvent[]
  ownership: OwnershipHistory[]
  permissions: Permission[]
  proofs: MerkleProof[]
}>

export async function generatePDF(data: ComplianceReport): Promise<Buffer>
export async function signReport(pdf: Buffer, signerKey: string): Promise<Buffer>
```

### Report Structure

```
COMPLIANCE REPORT
Asset ID: RADAR-001
Generated: 2026-09-17 14:30:00 UTC

SUMMARY
- Current Owner: John Doe (john.doe@gov.mil)
- Classification: TOP SECRET
- Status: ACTIVE
- Created: 2024-01-15
- Total Transfers: 3
- Total Access Grants: 12

OWNERSHIP HISTORY
1. 2024-01-15: Created → Assigned to Jane Smith
   TX: 0xabc123...
   Block: 15234567
   
2. 2024-06-20: Transferred → John Doe
   TX: 0xdef456...
   Block: 16789012
   Approver: Admin (alice@gov.mil)

AUDIT TRAIL
[Table of all audit events with Merkle proofs]

MERKLE VERIFICATION
Batch ID: batch-2024-09-15-001
Root: 0x789abc...
Proof Path: [0xdef123..., 0xabc789...]
Verified: ✓

SIGNATURE
Signed by: BEL Secure Platform
Signature: 0x123abc...
Timestamp: 2026-09-17 14:30:00 UTC
```

---

## B7: Gas Cost Dashboard + L2 Migration Path

### Database Views

```sql
-- Aggregated gas costs
CREATE OR REPLACE VIEW gas_cost_summary AS
SELECT
    DATE_TRUNC('day', created_at) as day,
    action,
    COUNT(*) as transaction_count,
    SUM(gas_fee_eth) as total_gas_eth,
    AVG(gas_fee_eth) as avg_gas_eth,
    MAX(gas_fee_eth) as max_gas_eth
FROM activity_gas_fees
GROUP BY DATE_TRUNC('day', created_at), action
ORDER BY day DESC;

-- Monthly costs
CREATE OR REPLACE VIEW gas_cost_monthly AS
SELECT
    DATE_TRUNC('month', created_at) as month,
    SUM(gas_fee_eth) as total_gas_eth,
    COUNT(*) as transaction_count,
    AVG(gas_fee_eth) as avg_gas_eth
FROM activity_gas_fees
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

### Dashboard API

```typescript
// src/app/api/analytics/gas-costs/route.ts
GET /api/analytics/gas-costs?period=7d&groupBy=day
Response: {
  summary: {
    totalGasEth: number,
    transactionCount: number,
    avgGasPerTx: number,
    projectedMonthly: number
  },
  breakdown: GasCostData[],
  topActions: { action: string, cost: number }[]
}
```

### L2 Configuration

```typescript
// hardhat.config.ts
networks: {
  polygonAmoy: {
    url: process.env.POLYGON_AMOY_RPC,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 80002
  },
  optimismSepolia: {
    url: process.env.OPTIMISM_SEPOLIA_RPC,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 11155420
  }
}

// Deploy script
async function deployToL2(network: string) {
  // Deploy contracts to L2
  // Configure bridge if needed
  // Update frontend to use L2 endpoints
}
```

---

## B8: W3C Verifiable Credentials

### Credential Structure

```typescript
// src/lib/verifiable-credentials.ts
interface VerifiableCredential {
  '@context': string[]
  type: string[]
  issuer: {
    id: string
    name: string
  }
  issuanceDate: string
  expirationDate?: string
  credentialSubject: {
    id: string  // DID
    clearanceLevel?: string
    department?: string
    role?: string
    criminalCheckStatus?: string
  }
  proof: {
    type: string
    created: string
    proofPurpose: string
    verificationMethod: string
    jws: string  // JSON Web Signature
  }
}

export async function issueCredential(params: {
  subjectDID: string
  claims: object
  issuerKey: string
}): Promise<VerifiableCredential>

export async function verifyCredential(
  credential: VerifiableCredential
): Promise<{ verified: boolean; reason?: string }>
```

### API Endpoints

```typescript
// src/app/api/credentials/issue/route.ts
POST /api/credentials/issue
Body: { profileId: UUID, claims: object }
Response: { credential: VerifiableCredential }

// src/app/api/credentials/verify/route.ts
POST /api/credentials/verify
Body: { credential: VerifiableCredential }
Response: { verified: boolean, details: object }

// src/app/api/credentials/revoke/route.ts
POST /api/credentials/revoke
Body: { credentialId: string, reason: string }
```

---

## B9: Real-Time Anomaly/Security Dashboard

### Data Sources

```sql
-- Real-time security metrics
CREATE OR REPLACE VIEW security_dashboard_data AS
SELECT
    -- Login metrics
    (SELECT COUNT(*) FROM login_trails WHERE created_at > NOW() - INTERVAL '1 hour') as logins_last_hour,
    (SELECT COUNT(*) FROM login_trails WHERE login_result = 'FAILED' AND created_at > NOW() - INTERVAL '1 hour') as failed_logins_last_hour,
    
    -- Access metrics
    (SELECT COUNT(*) FROM confidential_access_log WHERE created_at > NOW() - INTERVAL '1 hour') as classified_accesses_last_hour,
    (SELECT COUNT(*) FROM confidential_access_log WHERE flagged_by_ai = TRUE AND created_at > NOW() - INTERVAL '24 hours') as flagged_accesses_24h,
    
    -- Security events
    (SELECT COUNT(*) FROM security_events WHERE severity = 'CRITICAL' AND resolved = FALSE) as critical_events_open,
    (SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h,
    
    -- Unauthorized attempts
    (SELECT COUNT(*) FROM sensitive_field_access_log WHERE was_authorized = FALSE AND created_at > NOW() - INTERVAL '24 hours') as unauthorized_attempts_24h;
```

### Dashboard Components

```typescript
// src/components/SecurityDashboard.tsx
// - Real-time metrics cards
// - Login geo-map (IP addresses plotted)
// - Access frequency heatmap by resource
// - Flagged events list
// - Threat level indicator
// - Recent activity timeline

// src/components/AnomalyDetectionPanel.tsx
// - ML-based anomaly scores
// - Unusual login patterns
// - Access pattern deviations
// - Behavioral analysis
```

### WebSocket Updates

```typescript
// src/lib/realtime-security.ts
import { createClient } from '@supabase/supabase-js'

export function subscribeToSecurityEvents(callback: (event: SecurityEvent) => void) {
  const supabase = createClient(url, key)
  
  return supabase
    .channel('security_events')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'security_events'
    }, callback)
    .subscribe()
}
```

---

## B10: Progressive Lockout + Rate Limiting on Login

### Database Schema

```sql
-- Migration: 20260917_007_add_rate_limiting.sql

-- Track failed login attempts
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100),
    ip_address INET NOT NULL,
    success BOOLEAN NOT NULL,
    lockout_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at DESC);

-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_username VARCHAR,
    p_ip_address INET
)
RETURNS TABLE(
    allowed BOOLEAN,
    reason TEXT,
    lockout_until TIMESTAMPTZ,
    failed_attempts INTEGER
) AS $$
DECLARE
    v_failed_count INTEGER;
    v_lockout_until TIMESTAMPTZ;
BEGIN
    -- Count recent failed attempts
    SELECT COUNT(*) INTO v_failed_count
    FROM login_attempts
    WHERE (username = p_username OR ip_address = p_ip_address)
      AND success = FALSE
      AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Check for active lockout
    SELECT MAX(lockout_until) INTO v_lockout_until
    FROM login_attempts
    WHERE (username = p_username OR ip_address = p_ip_address)
      AND lockout_until > NOW();
    
    -- If locked out
    IF v_lockout_until IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, 'Account temporarily locked', v_lockout_until, v_failed_count;
        RETURN;
    END IF;
    
    -- Progressive lockout logic
    IF v_failed_count >= 10 THEN
        -- 10+ failures: 1 hour lockout + require admin unlock
        UPDATE login_attempts
        SET lockout_until = NOW() + INTERVAL '1 hour'
        WHERE (username = p_username OR ip_address = p_ip_address)
          AND created_at > NOW() - INTERVAL '1 hour';
        
        INSERT INTO security_events (event_type, severity, actor, description)
        VALUES ('BRUTE_FORCE', 'HIGH', p_username, format('Account locked after %s failed attempts', v_failed_count));
        
        RETURN QUERY SELECT FALSE, 'Too many failed attempts. Account locked for 1 hour.', NOW() + INTERVAL '1 hour', v_failed_count;
    ELSIF v_failed_count >= 5 THEN
        -- 5-9 failures: 15 minute lockout + CAPTCHA required
        UPDATE login_attempts
        SET lockout_until = NOW() + INTERVAL '15 minutes'
        WHERE (username = p_username OR ip_address = p_ip_address)
          AND created_at > NOW() - INTERVAL '1 hour';
        
        RETURN QUERY SELECT FALSE, 'Multiple failed attempts. Account locked for 15 minutes.', NOW() + INTERVAL '15 minutes', v_failed_count;
    ELSE
        -- < 5 failures: allowed
        RETURN QUERY SELECT TRUE, 'Login allowed', NULL, v_failed_count;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### Middleware

```typescript
// src/middleware/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server'

export async function rateLimitMiddleware(
  request: NextRequest,
  username: string
): Promise<{ allowed: boolean; reason?: string; lockoutUntil?: string }> {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  
  const result = await checkRateLimit(username, ip)
  
  if (!result.allowed && result.failed_attempts >= 5) {
    // Require CAPTCHA
    return { allowed: false, reason: 'CAPTCHA required', ...result }
  }
  
  return result
}
```

### API Integration

```typescript
// src/app/api/auth/login/route.ts
export async function POST(request: NextRequest) {
  const { username, password } = await request.json()
  
  // Check rate limit
  const rateCheck = await rateLimitMiddleware(request, username)
  if (!rateCheck.allowed) {
    return NextResponse.json({
      error: rateCheck.reason,
      lockoutUntil: rateCheck.lockoutUntil
    }, { status: 429 })
  }
  
  // Proceed with login...
}
```

---

## Implementation Priority

**Recommended order based on dependencies and impact:**

1. **B10** (Rate Limiting) - Security critical, quick implementation
2. **B3** (Time-Bound Access) - Foundation for other features
3. **B5** (Incident Response) - Leverages existing security_events
4. **B2** (Multi-Sig) - High security value
5. **B1** (Guardian Recovery) - User-facing, high value
6. **B7** (Gas Dashboard) - Analytics, relatively independent
7. **B6** (Compliance Export) - Builds on audit system
8. **B9** (Security Dashboard) - Visualization layer
9. **B8** (Verifiable Credentials) - Interoperability
10. **B4** (ZK Proofs) - Most complex, optional for MVP

---

## Testing Matrix

| Feature | Unit Tests | Integration Tests | E2E Tests | Security Review |
|---------|------------|-------------------|-----------|-----------------|
| B1 | ✅ | ✅ | ✅ | ✅ |
| B2 | ✅ | ✅ | ✅ | ✅ |
| B3 | ✅ | ✅ | ⚠️ | ✅ |
| B4 | ✅ | ✅ | ❌ | ✅ |
| B5 | ✅ | ✅ | ⚠️ | ✅ |
| B6 | ✅ | ✅ | ⚠️ | ⚠️ |
| B7 | ✅ | ⚠️ | ❌ | ⚠️ |
| B8 | ✅ | ✅ | ❌ | ✅ |
| B9 | ⚠️ | ⚠️ | ❌ | ⚠️ |
| B10 | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ Required
- ⚠️ Recommended
- ❌ Optional

---

## Deployment Checklist

For each feature:
- [ ] Database migration tested on staging
- [ ] API endpoints documented in OpenAPI/Swagger
- [ ] Frontend components implemented and tested
- [ ] Integration tests passing
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] User guides created
- [ ] Admin training completed
- [ ] Monitoring/alerts configured
- [ ] Rollback plan documented

---

**Last Updated:** 2026-09-17  
**Version:** 1.0  
**Status:** Blueprint Complete - Ready for Implementation

**Estimated Implementation Time:**
- Per feature: 3-5 days (developer)
- Total Part B: 6-8 weeks (1-2 developers)
- With Part A complete: Platform is production-ready with additional features enhancing security and usability
