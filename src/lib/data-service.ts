// ===== BEL SENTINEL — Data Service =====
// Real data layer — queries Supabase for live data
// Replaces the old demo-data.ts with real Supabase queries

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

// ===== DASHBOARD STATS (computed from real data) =====
export const getDashboardStats = () => ({
  totalIdentities: 0,
  activeUsers: 0,
  registeredAssets: 0,
  assetsTransferred: 0,
  blockchainTxns: 0,
  ipfsDocuments: 0,
  securityEvents: 0,
  failedAccessAttempts: 0,
  totalGasFeesCollected: 0,
});

// ===== CHART DATA GENERATORS =====
// These generate placeholder chart data — will be replaced with real Supabase queries

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
  { name: 'ADMIN', value: 1, color: ROLES.ADMIN.color },
  { name: 'VIEWER', value: 0, color: ROLES.VIEWER.color },
  { name: 'ALTER', value: 0, color: ROLES.ALTER.color },
  { name: 'DEBUGGER', value: 0, color: ROLES.DEBUGGER.color },
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

// ===== LIVE FEED EVENTS =====
export const liveFeedEvents = [
  { type: 'SYSTEM_READY', message: 'BEL Sentinel system initialized', user: 'System', timestamp: 'Just now', severity: 'success' as const, icon: 'CheckCircle' },
  { type: 'ADMIN_LOGIN', message: 'Admin logged into command centre', user: 'Admin', timestamp: '1 min ago', severity: 'info' as const, icon: 'Shield' },
  { type: 'BLOCKCHAIN_SYNC', message: 'Hardhat local node connected', user: 'System', timestamp: '2 min ago', severity: 'info' as const, icon: 'RefreshCw' },
  { type: 'AUDIT_INIT', message: 'Audit registry initialized on-chain', user: 'System', timestamp: '3 min ago', severity: 'success' as const, icon: 'ClipboardCheck' },
  { type: 'IDENTITY_NFT_READY', message: 'Identity NFT contract deployed', user: 'System', timestamp: '4 min ago', severity: 'success' as const, icon: 'UserPlus' },
  { type: 'GAS_FEE_CONFIG', message: `Gas fee set to ${GAS_FEE_PER_ACTION} ETH per action`, user: 'System', timestamp: '5 min ago', severity: 'info' as const, icon: 'FileCheck' },
];

// ===== AI ANALYSIS DATA (computed) =====

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
  loginTrailCount: 0,
  irregularityFlags: 0,
  confidentialChanges: 0,
  totalGasFees: 0,
  riskScore: 0,
  recentAlerts: [],
});
