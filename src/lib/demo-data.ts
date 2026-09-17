// ===== BEL SENTINEL — Demo Data Compatibility Layer =====
// This file provides backward-compatible exports for dashboard sub-pages
// that still reference the old demo-data module. All data is now empty/minimal
// since we removed demo mode. Sub-pages will show "No data" states.

import type { UserRole } from './constants';

// ===== TYPE RE-EXPORTS (updated to new role system) =====

export interface DemoUser {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  rank: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  clearance: string;
  identityDid: string;
  walletAddress: string;
  createdAt: string;
  lastActive: string;
  avatar: string;
}

export interface DemoAsset {
  id: string;
  name: string;
  category: string;
  description: string;
  currentOwner: string;
  previousOwner: string;
  status: 'ACTIVE' | 'TRANSFERRED' | 'AUDITED' | 'MAINTENANCE' | 'REVOKED' | 'REGISTERED';
  nftTokenId: string;
  txHash: string;
  blockNumber: number;
  ipfsCid: string;
  classification: string;
  createdAt: string;
  lastModified: string;
  lifecycle: AssetLifecycleEvent[];
}

export interface AssetLifecycleEvent {
  stage: string;
  actor: string;
  timestamp: string;
  txHash: string;
  blockNumber: number;
  previousState: string;
  newState: string;
  notes: string;
}

export interface DemoAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceType: string;
  result: 'SUCCESS' | 'DENIED' | 'ERROR';
  txHash: string;
  blockNumber: number;
  ipAddress: string;
  details: string;
}

export interface DemoBlockchainTx {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  method: string;
  contract: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
  gasUsed: number;
  timestamp: string;
  events: string[];
}

export interface DemoDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  ipfsCid: string;
  hash: string;
  uploadedBy: string;
  assetId: string;
  status: 'VERIFIED' | 'PENDING' | 'EXPIRED';
  pinned: boolean;
  createdAt: string;
}

export interface DemoSecurityEvent {
  id: string;
  timestamp: string;
  type: 'ACCESS_DENIED' | 'UNAUTHORIZED_ATTEMPT' | 'ROLE_ESCALATION' | 'ANOMALY_DETECTED' | 'BRUTE_FORCE' | 'SESSION_EXPIRED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actor: string;
  source: string;
  description: string;
  resolved: boolean;
}

// ===== DEMO DATA =====
// Minimal demo data for debugger and other roles to view

export const demoUsers: DemoUser[] = [
  {
    id: 'usr-dbg-001',
    clerkId: 'clerk_dbg',
    name: 'Debug Inspector',
    email: 'debugger@bel-sentinel.gov',
    role: 'DEBUGGER',
    department: 'Quality Assurance',
    rank: 'Inspector',
    status: 'ACTIVE',
    clearance: 'SECRET',
    identityDid: 'did:eth:0x7a3b1c9f2e4d5a6b8c0d1e2f3a4b5c6d7e8f9a0b',
    walletAddress: '0x7a3b1c9f2e4d5a6b8c0d1e2f3a4b5c6d7e8f9a0b',
    createdAt: '2026-09-01T10:00:00Z',
    lastActive: '2026-09-15T08:00:00Z',
    avatar: 'DI',
  },
];

export const demoAssets: DemoAsset[] = [
  {
    id: 'ast-001',
    name: 'Tactical Radio System TRS-400',
    category: 'Communications',
    description: 'Encrypted tactical radio system for field operations with AES-256 encryption.',
    currentOwner: 'Debug Inspector',
    previousOwner: 'System Administrator',
    status: 'ACTIVE',
    nftTokenId: '#1001',
    txHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
    blockNumber: 1042,
    ipfsCid: 'QmX7b2kFgHjLzR8yNv3cPqW5tA9mE6dK4sJ1uB0wY2xC3z',
    classification: 'CONFIDENTIAL',
    createdAt: '2026-08-20T09:30:00Z',
    lastModified: '2026-09-10T14:20:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'System Administrator', timestamp: '2026-08-20T09:30:00Z', txHash: '0xabc123...', blockNumber: 1040, previousState: '', newState: 'CREATED', notes: 'Asset registered in system' },
      { stage: 'ASSIGNED', actor: 'System Administrator', timestamp: '2026-08-25T11:00:00Z', txHash: '0xdef456...', blockNumber: 1041, previousState: 'CREATED', newState: 'ASSIGNED', notes: 'Assigned to QA department' },
      { stage: 'ACTIVE', actor: 'Debug Inspector', timestamp: '2026-09-01T08:00:00Z', txHash: '0xghi789...', blockNumber: 1042, previousState: 'ASSIGNED', newState: 'ACTIVE', notes: 'Verified and activated' },
    ],
  },
  {
    id: 'ast-002',
    name: 'Surveillance Drone SD-Eagle',
    category: 'Aerial Systems',
    description: 'Long-range surveillance drone with thermal imaging and real-time data relay.',
    currentOwner: 'Debug Inspector',
    previousOwner: 'System Administrator',
    status: 'REGISTERED',
    nftTokenId: '#1002',
    txHash: '0x789012345678901234567890abcdef1234567890abcdef1234567890abcdef12',
    blockNumber: 1055,
    ipfsCid: 'QmY8c3kGiJmMs9zOw4dQrX6uB0nF7eL5tK2vI3wZ1yD4a',
    classification: 'SECRET',
    createdAt: '2026-09-05T13:45:00Z',
    lastModified: '2026-09-12T16:30:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'System Administrator', timestamp: '2026-09-05T13:45:00Z', txHash: '0x789012...', blockNumber: 1054, previousState: '', newState: 'CREATED', notes: 'Drone unit registered' },
      { stage: 'REGISTERED', actor: 'System Administrator', timestamp: '2026-09-06T10:00:00Z', txHash: '0xklm345...', blockNumber: 1055, previousState: 'CREATED', newState: 'REGISTERED', notes: 'NFT minted on blockchain' },
    ],
  },
];

export const demoAuditLogs: DemoAuditLog[] = [];
export const demoBlockchainTxs: DemoBlockchainTx[] = [];

export const demoDocuments: DemoDocument[] = [
  {
    id: 'doc-001',
    name: 'TRS-400 Technical Manual',
    type: 'PDF',
    size: '4.2 MB',
    ipfsCid: 'QmX7b2kFgHjLzR8yNv3cPqW5tA9mE6dK4sJ1uB0wY2xC3z',
    hash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
    uploadedBy: 'System Administrator',
    assetId: 'ast-001',
    status: 'VERIFIED',
    pinned: true,
    createdAt: '2026-08-22T11:15:00Z',
  },
  {
    id: 'doc-002',
    name: 'SD-Eagle Certification Report',
    type: 'PDF',
    size: '2.8 MB',
    ipfsCid: 'QmY8c3kGiJmMs9zOw4dQrX6uB0nF7eL5tK2vI3wZ1yD4a',
    hash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    uploadedBy: 'System Administrator',
    assetId: 'ast-002',
    status: 'PENDING',
    pinned: false,
    createdAt: '2026-09-07T09:30:00Z',
  },
];

export const demoSecurityEvents: DemoSecurityEvent[] = [];

// ===== DASHBOARD STATS =====
export const dashboardStats = {
  totalIdentities: 2,
  activeUsers: 2,
  registeredAssets: 2,
  assetsTransferred: 0,
  blockchainTxns: 5,
  ipfsDocuments: 2,
  securityEvents: 0,
  failedAccessAttempts: 0,
};

// ===== CHART DATA =====
export const assetActivityData = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  created: 0,
  transferred: 0,
  audited: 0,
}));

export const accessAttemptsData = Array.from({ length: 14 }, (_, i) => ({
  date: `Day ${i + 1}`,
  granted: 0,
  denied: 0,
}));

export const roleDistribution = [
  { name: 'ADMIN', value: 1, color: '#ef4444' },
  { name: 'VIEWER', value: 0, color: '#3b82f6' },
  { name: 'ALTER', value: 0, color: '#f59e0b' },
  { name: 'DEBUGGER', value: 0, color: '#a855f7' },
];

export const blockchainTxOverTime = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  transactions: 0,
}));

export const assetDistribution = [
  { category: 'Defence Equipment', count: 0 },
  { category: 'Communications', count: 0 },
  { category: 'Aerial Systems', count: 0 },
  { category: 'Surveillance', count: 0 },
  { category: 'Cryptographic', count: 0 },
  { category: 'Support Systems', count: 0 },
];

export const liveFeedEvents = [
  { type: 'SYSTEM_READY', message: 'BEL Sentinel system initialized', user: 'System', timestamp: 'Just now', severity: 'success' as const, icon: 'CheckCircle' },
  { type: 'ADMIN_LOGIN', message: 'Admin logged into command centre', user: 'Admin', timestamp: '1 min ago', severity: 'info' as const, icon: 'Shield' },
  { type: 'BLOCKCHAIN_SYNC', message: 'Hardhat local node connected', user: 'System', timestamp: '2 min ago', severity: 'info' as const, icon: 'RefreshCw' },
  { type: 'AUDIT_INIT', message: 'Audit registry initialized on-chain', user: 'System', timestamp: '3 min ago', severity: 'success' as const, icon: 'ClipboardCheck' },
  { type: 'IDENTITY_NFT_READY', message: 'Identity NFT contract deployed', user: 'System', timestamp: '4 min ago', severity: 'success' as const, icon: 'UserPlus' },
  { type: 'GAS_FEE_CONFIG', message: 'Gas fee set to 0.00001 ETH per action', user: 'System', timestamp: '5 min ago', severity: 'info' as const, icon: 'FileCheck' },
];
