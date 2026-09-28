// ===== BEL SENTINEL — Data Service =====
// Dashboard data layer — provides stats, charts, and live feed data.
// Populated with realistic demo data for hackathon presentation.

import { ROLES, type UserRole, GAS_FEE_PER_ACTION } from './constants';

// ===== TYPE DEFINITIONS =====

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  display_name: string;
  department: string;
  rank: string;
  clearance: string;
  wallet_address: string;
  photo_url: string | null;
  photo_hash: string | null;
  nft_token_id: string | null;
  nft_tx_hash: string | null;
  criminal_check_status: 'CLEARED' | 'FLAGGED' | 'PENDING_CHECK' | 'UNKNOWN';
  is_admin: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'PENDING';
  role?: UserRole;
  created_at: string;
  last_active_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_role: UserRole;
  action: string;
  resource_id: string;
  resource_type: string;
  result: 'SUCCESS' | 'DENIED' | 'ERROR';
  details: string;
  ip_address: string;
  tx_hash: string;
  block_number: number;
  gas_fee_eth: number;
  created_at: string;
}

export interface LoginTrail {
  id: string;
  profile_id: string | null;
  username: string;
  login_result: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  ip_address: string;
  user_agent: string;
  geo_location: string;
  anomaly_flags: string[];
  created_at: string;
}

export interface ConfidentialAccessEntry {
  id: string;
  profile_id: string;
  resource_id: string;
  resource_type: string;
  classification: string;
  access_type: 'VIEW' | 'MODIFY' | 'DELETE' | 'EXPORT';
  was_authorized: boolean;
  flagged_by_ai: boolean;
  flag_reason: string | null;
  created_at: string;
}

export interface GasFeeEntry {
  id: string;
  profile_id: string;
  action: string;
  resource_id: string;
  resource_type: string;
  gas_fee_eth: number;
  tx_hash: string;
  created_at: string;
}

export interface BlockchainTx {
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

// ===== DASHBOARD STATS =====
export const getDashboardStats = () => ({
  totalIdentities: 8,
  activeUsers: 7,
  registeredAssets: 12,
  assetsTransferred: 3,
  blockchainTxns: 1121,
  ipfsDocuments: 8,
  securityEvents: 12,
  failedAccessAttempts: 6,
  totalGasFeesCollected: 0.01121,
});

// ===== CHART DATA (realistic patterns) =====

const today = new Date();

export const assetActivityData = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(today);
  d.setDate(d.getDate() - (29 - i));
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    created: Math.floor(Math.random() * 3) + (i > 20 ? 2 : 0),
    transferred: Math.floor(Math.random() * 2),
    audited: i % 7 === 0 ? Math.floor(Math.random() * 3) + 1 : 0,
  };
});

export const accessAttemptsData = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(today);
  d.setDate(d.getDate() - (13 - i));
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    granted: Math.floor(Math.random() * 20) + 15,
    denied: Math.floor(Math.random() * 5) + (i === 8 || i === 12 ? 8 : 1),
  };
});

export const roleDistribution = [
  { name: 'ADMIN', value: 2, color: ROLES.ADMIN.color },
  { name: 'VIEWER', value: 2, color: ROLES.VIEWER.color },
  { name: 'ALTER', value: 2, color: ROLES.ALTER.color },
  { name: 'DEBUGGER', value: 2, color: ROLES.DEBUGGER.color },
];

export const blockchainTxOverTime = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(today);
  d.setDate(d.getDate() - (29 - i));
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    transactions: Math.floor(Math.random() * 25) + 10 + (i > 20 ? 15 : 0),
  };
});

export const assetDistribution = [
  { category: 'Defence Equipment', count: 3 },
  { category: 'Communications', count: 2 },
  { category: 'Aerial Systems', count: 1 },
  { category: 'Surveillance', count: 2 },
  { category: 'Cryptographic', count: 2 },
  { category: 'Support Systems', count: 2 },
];

// ===== LIVE FEED EVENTS =====
export const liveFeedEvents = [
  { type: 'ADMIN_LOGIN', message: 'Commander Vikram authenticated via secure terminal', user: 'Cmdr. Vikram', timestamp: 'Just now', severity: 'success' as const, icon: 'Shield' },
  { type: 'ASSET_MINTED', message: 'Signal Interceptor SI-Garuda NFT #1012 minted on-chain', user: 'Dr. Sharma', timestamp: '1 min ago', severity: 'success' as const, icon: 'CheckCircle' },
  { type: 'MAINTENANCE_ALERT', message: 'APB-Dhruv patrol bot entering maintenance cycle', user: 'Lt. Col. Nair', timestamp: '3 min ago', severity: 'warning' as const, icon: 'AlertTriangle' },
  { type: 'AUDIT_COMPLETE', message: 'RJU-200 compliance audit passed — all parameters nominal', user: 'Maj. Deshmukh', timestamp: '8 min ago', severity: 'success' as const, icon: 'ClipboardCheck' },
  { type: 'THREAT_BLOCKED', message: 'Brute force attempt blocked — IP 203.0.113.42 rate limited', user: 'System', timestamp: '12 min ago', severity: 'error' as const, icon: 'ShieldAlert' },
  { type: 'DOC_UPLOADED', message: 'BMS-Shakti integration test results uploaded to IPFS', user: 'Cmdr. Vikram', timestamp: '15 min ago', severity: 'info' as const, icon: 'FileCheck' },
  { type: 'IDENTITY_VERIFIED', message: 'DID verification completed for Lt. Col. Rajesh Nair', user: 'Dr. Sharma', timestamp: '20 min ago', severity: 'success' as const, icon: 'UserPlus' },
  { type: 'GAS_FEE_COLLECTED', message: `Gas fee ${GAS_FEE_PER_ACTION} ETH collected — TX #1121 confirmed`, user: 'System', timestamp: '25 min ago', severity: 'info' as const, icon: 'Zap' },
  { type: 'CLASSIFIED_ACCESS', message: 'TS//SCI access to RJU-200 by Lt. Col. Nair — AUTHORIZED', user: 'System', timestamp: '30 min ago', severity: 'warning' as const, icon: 'Lock' },
  { type: 'BLOCKCHAIN_SYNC', message: 'Block #1121 confirmed — 15 transactions in last hour', user: 'System', timestamp: '35 min ago', severity: 'info' as const, icon: 'RefreshCw' },
  { type: 'SUSPENSION', message: 'Cpl. Vikrant Singh account suspended — clearance review', user: 'Cmdr. Vikram', timestamp: '1 hour ago', severity: 'error' as const, icon: 'UserMinus' },
  { type: 'CONTRACT_DEPLOYED', message: 'DocumentNFT contract deployed — v2.1 with versioning', user: 'Cmdr. Vikram', timestamp: '2 hours ago', severity: 'success' as const, icon: 'Blocks' },
];

// ===== AI ANALYSIS DATA =====

export interface AIAnalysisData {
  loginTrailCount: number;
  irregularityFlags: number;
  confidentialChanges: number;
  totalGasFees: number;
  riskScore: number;
  recentAlerts: Array<{
    type: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: string;
  }>;
}

export const getDefaultAIAnalysis = (): AIAnalysisData => ({
  loginTrailCount: 247,
  irregularityFlags: 4,
  confidentialChanges: 18,
  totalGasFees: 0.01121,
  riskScore: 23,
  recentAlerts: [
    { type: 'BRUTE_FORCE', message: 'Distributed brute force attack blocked — 8 IPs', severity: 'CRITICAL', timestamp: '2026-09-27T22:15:00Z' },
    { type: 'ROLE_ESCALATION', message: 'JWT manipulation attempt detected and blocked', severity: 'HIGH', timestamp: '2026-09-23T14:00:00Z' },
    { type: 'ACCESS_DENIED', message: 'Unauthorized access to TS//SCI asset blocked', severity: 'HIGH', timestamp: '2026-09-26T14:30:00Z' },
    { type: 'ANOMALY', message: 'Unusual outbound traffic spike at 03:00 — resolved', severity: 'MEDIUM', timestamp: '2026-09-26T03:00:00Z' },
    { type: 'SESSION', message: 'Multiple expired sessions cleaned up', severity: 'LOW', timestamp: '2026-09-25T19:45:00Z' },
  ],
});
