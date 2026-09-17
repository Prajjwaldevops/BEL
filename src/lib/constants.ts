// ===== BEL SENTINEL — CONSTANTS =====

export const SITE_CONFIG = {
  name: 'BEL SENTINEL',
  tagline: 'Blockchain-Based Secure Platform for Identity, Access Control & Digital Asset Management',
  version: '2.0.0',
  classification: 'SECURE PLATFORM',
};

export const NAV_LINKS = [
  { label: 'Home', href: '#hero' },
  { label: 'Features', href: '#solution' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'About', href: '#security' },
] as const;

export const TRUST_INDICATORS = [
  { label: 'DECENTRALIZED IDENTITY', icon: 'Fingerprint' },
  { label: 'ROLE-BASED ACCESS', icon: 'Shield' },
  { label: 'BLOCKCHAIN TRACEABILITY', icon: 'Link' },
  { label: 'IPFS STORAGE', icon: 'Database' },
  { label: 'IMMUTABLE AUDIT TRAIL', icon: 'FileCheck' },
] as const;

// ===== ROLE SYSTEM (4 levels) =====
export type UserRole = 'ADMIN' | 'VIEWER' | 'ALTER' | 'DEBUGGER';

export const ROLES = {
  ADMIN: {
    name: 'ADMIN',
    label: 'Administrator',
    description: 'Full platform access, user registration, wallet management',
    level: 1,
    color: '#ef4444',
    permissions: ['system:admin', 'identity:manage', 'role:assign', 'asset:crud', 'audit:read', 'audit:write', 'blockchain:admin', 'classified:full_access', 'ai_analysis:view'],
  },
  VIEWER: {
    name: 'VIEWER',
    label: 'Viewer',
    description: 'View-only access within assigned department — cannot modify data',
    level: 2,
    color: '#3b82f6',
    permissions: ['asset:view_department', 'profile:view_own', 'document:view_department'],
  },
  ALTER: {
    name: 'ALTER',
    label: 'Alter',
    description: 'View and minor edits within department — no classified info access',
    level: 3,
    color: '#f59e0b',
    permissions: ['asset:view_department', 'asset:edit_minor', 'profile:manage', 'document:view_department', 'document:upload'],
  },
  DEBUGGER: {
    name: 'DEBUGGER',
    label: 'Debugger',
    description: 'Cross-department access, modify, view classified, report irregularities',
    level: 4,
    color: '#a855f7',
    permissions: ['asset:view_all', 'asset:edit_all', 'classified:view', 'report:generate', 'security:view', 'cross_department:access'],
  },
} as const;

// ===== REGISTRATION =====
export const REGISTRATION_SECRET_KEY = '34567890';
export const GAS_FEE_PER_ACTION = 0.00001; // ETH
export const GAS_FEE_WEI = '10000000000000'; // 0.00001 ETH in wei
export const TESTNET_ETH_SEND_AMOUNT = '0.01'; // ETH sent to new users

// ===== DEPARTMENTS =====
export const DEPARTMENTS = [
  'Command & Control',
  'Security Operations',
  'Engineering & R&D',
  'Compliance & Audit',
  'Field Operations',
  'Communications',
  'Logistics',
] as const;

// ===== CLEARANCE LEVELS =====
export const CLEARANCE_LEVELS = [
  'UNCLASSIFIED',
  'CONFIDENTIAL',
  'SECRET',
  'TOP SECRET',
  'TOP SECRET // SCI',
] as const;

export const PROBLEMS = [
  {
    title: 'Centralized Identity Silos',
    description: 'Traditional identity systems create single points of failure and are vulnerable to breaches, leaving critical infrastructure exposed.',
    stat: '83%',
    statLabel: 'of breaches involve identity compromise',
  },
  {
    title: 'Opaque Access Trails',
    description: 'Without immutable audit trails, unauthorized access goes undetected and accountability is impossible to enforce.',
    stat: '277',
    statLabel: 'days average breach detection time',
  },
  {
    title: 'Untraceable Asset Lifecycle',
    description: 'Physical and digital assets change hands without verifiable provenance, enabling fraud and loss of accountability.',
    stat: '45%',
    statLabel: 'of organizations lack asset traceability',
  },
  {
    title: 'Mutable Records',
    description: 'Centralized databases can be silently altered, destroying evidence integrity and compliance audit trails.',
    stat: '$4.5M',
    statLabel: 'average cost of data breach',
  },
];

export const SOLUTION_FEATURES = [
  {
    title: 'Decentralized Identity',
    description: 'Self-sovereign identity management with blockchain-anchored DIDs. Users control their credentials while organizations verify without centralized databases.',
    icon: 'Fingerprint',
    color: 'violet',
  },
  {
    title: 'Role-Based Access Control',
    description: 'Granular, blockchain-enforced permissions with 4-tier role hierarchy: Admin, Viewer, Alter, Debugger. Every access decision is logged immutably.',
    icon: 'ShieldCheck',
    color: 'lavender',
  },
  {
    title: 'Asset Lifecycle Management',
    description: 'Full provenance tracking from creation to decommission. NFT-backed ownership with tamper-proof transfer history.',
    icon: 'Boxes',
    color: 'indigo',
  },
  {
    title: 'Immutable Audit Trail',
    description: 'Every action recorded on-chain with micro gas fees. WHO did WHAT, WHEN, to WHICH resource — cryptographically verifiable and permanent.',
    icon: 'ScrollText',
    color: 'fuchsia',
  },
  {
    title: 'IPFS Document Integrity',
    description: 'Documents stored on decentralized IPFS. Content-addressed hashes ensure any tampering is immediately detectable.',
    icon: 'FileCheck',
    color: 'blue',
  },
  {
    title: 'AI-Powered Analysis',
    description: 'Real-time anomaly detection, login trail monitoring, irregularity flagging, and confidential access tracking powered by AI.',
    icon: 'Brain',
    color: 'violet',
  },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Authenticate',
    description: 'Secure sign-in via custom auth. Admin registers users with webcam verification and criminal database check.',
    detail: 'Admin Auth → Secret Key → Registration',
  },
  {
    step: '02',
    title: 'Verify Identity',
    description: 'Blockchain-anchored identity verification. NFT minted with photo hash. DID resolution against on-chain registry.',
    detail: 'Identity NFT → Photo Hash → R2 Storage',
  },
  {
    step: '03',
    title: 'Authorize Access',
    description: '4-tier RBAC engine evaluates permissions. Role hierarchy enforced at smart contract level. Every action incurs a micro gas fee.',
    detail: 'RBAC → Smart Contract → Gas Fee Audit',
  },
  {
    step: '04',
    title: 'Execute & Record',
    description: 'Action executed with full audit trail. State changes recorded on blockchain with 0.00001 ETH gas fee. Documents stored on IPFS.',
    detail: 'Action → Supabase + Blockchain + IPFS',
  },
  {
    step: '05',
    title: 'AI Analysis',
    description: 'Continuous monitoring of login trails, access patterns, and confidential data changes. AI flags irregularities in real-time.',
    detail: 'AI Monitor → Anomaly Detection → Alerts',
  },
];

export const ARCHITECTURE_LAYERS = [
  {
    name: 'Presentation Layer',
    tech: 'Next.js + TypeScript + Tailwind CSS',
    description: 'Responsive, accessible frontend with real-time data visualization and 3D security overview.',
    color: 'violet',
  },
  {
    name: 'Authentication Layer',
    tech: 'Custom Auth + MetaMask',
    description: 'Custom admin-gated registration with secret key, webcam verification, and wallet integration.',
    color: 'lavender',
  },
  {
    name: 'Application Layer',
    tech: 'Next.js API Routes + Go Backend',
    description: 'Business logic, RBAC enforcement, request validation, and service orchestration.',
    color: 'indigo',
  },
  {
    name: 'Data Layer',
    tech: 'Supabase PostgreSQL',
    description: 'Relational data storage with RLS policies, full-text search, and real-time subscriptions.',
    color: 'fuchsia',
  },
  {
    name: 'Blockchain Layer',
    tech: 'Solidity + EVM (Hardhat)',
    description: 'Immutable identity NFTs, role management, asset NFTs, and audit events with gas fee tracking.',
    color: 'blue',
  },
  {
    name: 'Storage Layer',
    tech: 'Cloudflare R2 + IPFS',
    description: 'User photos on R2. Documents on IPFS. Content-addressed decentralized storage.',
    color: 'violet',
  },
];

export const SECURITY_FEATURES = [
  {
    title: 'Zero Trust Architecture',
    description: 'Every request is authenticated and authorized independently. No implicit trust.',
    icon: 'ShieldAlert',
  },
  {
    title: 'End-to-End Encryption',
    description: 'TLS 1.3 in transit. AES-256 at rest. Sensitive data never exposed in plaintext.',
    icon: 'Lock',
  },
  {
    title: 'Smart Contract Security',
    description: 'OpenZeppelin audited patterns. ReentrancyGuard. Pausable. AccessControl.',
    icon: 'Code',
  },
  {
    title: 'Immutable Audit Logs',
    description: 'Every state change is recorded on blockchain with gas fee. Tamper-evident by design.',
    icon: 'BookOpen',
  },
  {
    title: '4-Tier RBAC Enforcement',
    description: 'Admin, Viewer, Alter, Debugger — role hierarchy enforced at smart contract level.',
    icon: 'Users',
  },
  {
    title: 'AI Anomaly Detection',
    description: 'Real-time monitoring of login trails, access patterns, and confidential data changes.',
    icon: 'Brain',
  },
];

export const COLOR_MAP: Record<string, string> = {
  violet: '#7c5cfc',
  lavender: '#a78bfa',
  indigo: '#6366f1',
  fuchsia: '#c084fc',
  blue: '#818cf8',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  cyan: '#7c5cfc',
  purple: '#a78bfa',
};

// Used by landing page DashboardPreview component
export const LIVE_FEED_EVENTS = [
  { type: 'SYSTEM_READY', message: 'BEL Sentinel platform initialized', user: 'System', timestamp: 'Just now', severity: 'success' },
  { type: 'ADMIN_LOGIN', message: 'Admin authenticated via secure login', user: 'Admin', timestamp: '1 min ago', severity: 'info' },
  { type: 'IDENTITY_NFT', message: 'Identity NFT contract deployed', user: 'System', timestamp: '2 min ago', severity: 'success' },
  { type: 'BLOCKCHAIN_SYNC', message: 'Hardhat local node connected', user: 'System', timestamp: '3 min ago', severity: 'info' },
  { type: 'AUDIT_INIT', message: 'Audit registry initialized on-chain', user: 'System', timestamp: '4 min ago', severity: 'success' },
  { type: 'GAS_FEE_SET', message: 'Gas fee set to 0.00001 ETH per action', user: 'System', timestamp: '5 min ago', severity: 'info' },
  { type: 'REGISTRATION_GATE', message: 'Secret key registration gate active', user: 'System', timestamp: '6 min ago', severity: 'warning' },
  { type: 'WALLET_READY', message: 'MetaMask wallet integration ready', user: 'System', timestamp: '7 min ago', severity: 'success' },
];
