# API Reference

Base URL: `http://localhost:3000/api` (development)

## Authentication Endpoints

### POST /api/auth/nonce

Request a nonce for wallet signature authentication.

**Request:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb27"
}
```

**Response:**
```json
{
  "nonce": "a1b2c3d4e5f6g7h8",
  "expiresAt": "2024-09-18T23:00:00Z",
  "message": "Sign this message to authenticate with BEL Sentinel\n\nNonce: a1b2c3d4e5f6g7h8\nTimestamp: 2024-09-18T22:55:00Z\nAddress: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb27"
}
```

**Rate Limit:** 20 requests / 15 minutes / IP

---

### POST /api/auth/verify

Verify wallet signature and issue JWT session token.

**Request:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb27",
  "signature": "0x123abc...",
  "nonce": "a1b2c3d4e5f6g7h8"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_abc123",
    "username": "operator_001",
    "role": "ADMIN",
    "department": "Intelligence",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb27"
  },
  "expiresAt": "2024-09-19T22:55:00Z"
}
```

**Rate Limit:** 20 requests / 15 minutes / IP

**Errors:**
- `400` - Invalid signature or expired nonce
- `404` - Wallet address not registered
- `429` - Rate limit exceeded

---

### POST /api/auth/login (Legacy - To Be Deprecated)

Username/password login (current implementation, will be replaced by wallet auth).

**Request:**
```json
{
  "username": "admin",
  "password": "securepass",
  "walletAddress": "0x742d35Cc..." // optional
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "usr_001",
    "username": "admin",
    "role": "ADMIN",
    "department": "Operations"
  }
}
```

---

### POST /api/auth/register

Register new user (ADMIN only).

**Auth Required:** Yes (Bearer token, ADMIN role)

**Request:**
```json
{
  "fullName": "John Operator",
  "email": "john@bel.gov",
  "department": "Intelligence",
  "role": "ALTER",
  "walletAddress": "0x742d35Cc...",
  "photo": "<base64 or multipart file>"
}
```

**Response:**
```json
{
  "username": "john_operator",
  "password": "generated_password",
  "accessCode": "123456",
  "nftTokenId": "42",
  "nftTxHash": "0xabc...",
  "walletAddress": "0x742d35Cc...",
  "photoHash": "QmX7s9..."
}
```

---

## Asset Management

### GET /api/stats/dashboard

Get dashboard statistics.

**Auth Required:** Yes

**Response:**
```json
{
  "totalIdentities": 125,
  "activeUsers": 89,
  "registeredAssets": 342,
  "assetsTransferred": 78,
  "ipfsDocuments": 156,
  "securityEvents": 3,
  "blockchainTxns": 524,
  "totalGasFeesCollected": "0.0234"
}
```

**Role Access:**
- ADMIN: All fields
- DEBUGGER: All except gas fees
- ALTER: Limited to department data
- VIEWER: Read-only department data

---

## Audit Endpoints

### POST /api/audit/log-action

Log an action to audit trail.

**Auth Required:** Yes

**Request:**
```json
{
  "userId": "usr_001",
  "action": "ASSET_TRANSFER",
  "resourceType": "ASSET",
  "resourceId": "ast_123",
  "metadata": {
    "from": "usr_001",
    "to": "usr_002",
    "assetId": "ast_123"
  },
  "ipAddress": "192.168.1.100"
}
```

**Response:**
```json
{
  "success": true,
  "auditId": "aud_789",
  "queuedForBlockchain": true
}
```

---

### POST /api/audit/proof

Get Merkle proof for audit event verification.

**Auth Required:** Yes (DEBUGGER or ADMIN)

**Request:**
```json
{
  "auditId": "aud_789"
}
```

**Response:**
```json
{
  "auditId": "aud_789",
  "eventHash": "0x1a2b3c...",
  "merkleRoot": "0x9f8e7d...",
  "merkleProof": ["0xabc...", "0xdef..."],
  "blockNumber": 12345678,
  "txHash": "0x456def...",
  "verified": true
}
```

---

## Access Control

### POST /api/access/grant-temporary

Grant time-bound access to a user.

**Auth Required:** Yes (ADMIN only)

**Request:**
```json
{
  "userId": "usr_002",
  "resourceType": "DOCUMENT",
  "resourceId": "doc_456",
  "expiresInHours": 24,
  "grantedBy": "usr_001"
}
```

**Response:**
```json
{
  "accessId": "acc_999",
  "userId": "usr_002",
  "resourceType": "DOCUMENT",
  "resourceId": "doc_456",
  "expiresAt": "2024-09-19T22:55:00Z",
  "status": "ACTIVE"
}
```

---

### POST /api/access/verify-code

Verify 6-digit access code for sensitive document.

**Auth Required:** Yes

**Request:**
```json
{
  "userId": "usr_002",
  "resourceId": "doc_456",
  "accessCode": "123456"
}
```

**Response:**
```json
{
  "valid": true,
  "resourceId": "doc_456",
  "accessGranted": true
}
```

**Errors:**
- `403` - Invalid access code (3 attempts allowed)
- `423` - Account locked after 3 failed attempts

---

## Approval Workflows

### POST /api/approvals/request

Request multi-sig approval for critical action.

**Auth Required:** Yes

**Request:**
```json
{
  "actionType": "REVOKE_IDENTITY",
  "targetUserId": "usr_003",
  "reason": "Security breach",
  "requiredApprovals": 2,
  "requestedBy": "usr_001"
}
```

**Response:**
```json
{
  "approvalId": "apr_111",
  "status": "PENDING",
  "approvals": 0,
  "requiredApprovals": 2,
  "expiresAt": "2024-09-25T22:55:00Z"
}
```

---

### POST /api/approvals/vote

Vote on pending approval.

**Auth Required:** Yes (ADMIN only)

**Request:**
```json
{
  "approvalId": "apr_111",
  "vote": "APPROVE", // or "REJECT"
  "voterId": "usr_002"
}
```

**Response:**
```json
{
  "approvalId": "apr_111",
  "status": "APPROVED", // or "PENDING" or "REJECTED"
  "approvals": 2,
  "requiredApprovals": 2,
  "executedAt": "2024-09-18T23:05:00Z"
}
```

---

### POST /api/approvals/execute

Execute approved action.

**Auth Required:** System (called automatically when threshold reached)

---

## Security & Incidents

### POST /api/incidents/create

Create security incident report.

**Auth Required:** Yes (DEBUGGER or ADMIN)

**Request:**
```json
{
  "title": "Suspicious login attempt",
  "severity": "MEDIUM",
  "category": "ACCESS_ANOMALY",
  "description": "Multiple failed login attempts from unusual IP",
  "affectedUsers": ["usr_004"],
  "reportedBy": "usr_001"
}
```

**Response:**
```json
{
  "incidentId": "inc_222",
  "status": "OPEN",
  "severity": "MEDIUM",
  "createdAt": "2024-09-18T22:55:00Z"
}
```

---

### GET /api/incidents/list

List security incidents.

**Auth Required:** Yes (DEBUGGER or ADMIN)

**Query Params:**
- `status`: `OPEN` | `INVESTIGATING` | `RESOLVED` | `CLOSED`
- `severity`: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`
- `limit`: Number (default 50)

---

## Health Check

### GET /api/health

Service health check endpoint.

**Auth Required:** No

**Response:**
```json
{
  "status": "ok",
  "service": "BEL Platform API",
  "version": "1.0.0",
  "timestamp": "2024-09-18T22:55:00Z",
  "uptime": 86400,
  "database": "connected",
  "blockchain": "connected"
}
```

**Status Codes:**
- `200` - All services healthy
- `503` - Degraded (database or blockchain unavailable)

---

## Rate Limiting

All auth endpoints: **20 requests / 15 minutes / IP**  
All other endpoints: **100 requests / 15 minutes / user**

**Rate Limit Headers:**
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1695077700
```

**429 Response:**
```json
{
  "error": "Too many requests",
  "retryAfter": 300
}
```

---

## Error Responses

Standard error format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no token or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Authentication

Include JWT token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiry:** 24 hours  
**Refresh:** Re-authenticate via `/api/auth/verify` before expiry
