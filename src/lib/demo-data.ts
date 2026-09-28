// ===== BEL SENTINEL — Rich Demo Data for Hackathon =====
// This file provides fully-populated demo data for the admin/sih bypass users.
// All dashboard sub-pages import from here. Data is realistic and impressive.

import type { UserRole } from './constants';
import { ROLES, GAS_FEE_PER_ACTION } from './constants';

// ===== TYPE DEFINITIONS =====

export interface DemoUser {
  id: string;
  profileId: string;
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

// ===== DEMO USERS (8 across all 4 roles) =====

export const demoUsers: DemoUser[] = [
  {
    id: 'usr-001',
    profileId: 'demo-admin-001',
    name: 'Commander Arjun Vikram',
    email: 'admin@bel-sentinel.gov.in',
    role: 'ADMIN',
    department: 'Command & Control',
    rank: 'Commander',
    status: 'ACTIVE',
    clearance: 'TOP SECRET // SCI',
    identityDid: 'did:ethr:0xADM1N000000000000000000000000000000000001',
    walletAddress: '0xADM1N000000000000000000000000000000000001',
    createdAt: '2026-01-15T06:00:00Z',
    lastActive: '2026-09-28T18:30:00Z',
    avatar: 'AV',
  },
  {
    id: 'usr-002',
    profileId: 'demo-sih-002',
    name: 'Dr. Priya Sharma',
    email: 'sih@bel-sentinel.gov.in',
    role: 'ADMIN',
    department: 'Security Operations',
    rank: 'Director',
    status: 'ACTIVE',
    clearance: 'TOP SECRET // SCI',
    identityDid: 'did:ethr:0x51H00000000000000000000000000000000000002',
    walletAddress: '0x51H00000000000000000000000000000000000002',
    createdAt: '2026-02-10T08:00:00Z',
    lastActive: '2026-09-28T17:45:00Z',
    avatar: 'PS',
  },
  {
    id: 'usr-003',
    profileId: 'profile-003',
    name: 'Lt. Col. Rajesh Nair',
    email: 'rajesh.nair@bel.co.in',
    role: 'DEBUGGER',
    department: 'Engineering & R&D',
    rank: 'Lt. Colonel',
    status: 'ACTIVE',
    clearance: 'TOP SECRET',
    identityDid: 'did:ethr:0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    walletAddress: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    createdAt: '2026-03-05T10:30:00Z',
    lastActive: '2026-09-28T16:20:00Z',
    avatar: 'RN',
  },
  {
    id: 'usr-004',
    profileId: 'profile-004',
    name: 'Maj. Kavita Deshmukh',
    email: 'kavita.d@bel.co.in',
    role: 'ALTER',
    department: 'Compliance & Audit',
    rank: 'Major',
    status: 'ACTIVE',
    clearance: 'SECRET',
    identityDid: 'did:ethr:0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    walletAddress: '0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    createdAt: '2026-03-20T14:00:00Z',
    lastActive: '2026-09-28T15:10:00Z',
    avatar: 'KD',
  },
  {
    id: 'usr-005',
    profileId: 'profile-005',
    name: 'Capt. Suresh Pillai',
    email: 'suresh.p@bel.co.in',
    role: 'VIEWER',
    department: 'Field Operations',
    rank: 'Captain',
    status: 'ACTIVE',
    clearance: 'CONFIDENTIAL',
    identityDid: 'did:ethr:0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    walletAddress: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    createdAt: '2026-04-12T09:30:00Z',
    lastActive: '2026-09-28T14:00:00Z',
    avatar: 'SP',
  },
  {
    id: 'usr-006',
    profileId: 'profile-006',
    name: 'Sgt. Meera Iyer',
    email: 'meera.i@bel.co.in',
    role: 'VIEWER',
    department: 'Communications',
    rank: 'Sergeant',
    status: 'ACTIVE',
    clearance: 'CONFIDENTIAL',
    identityDid: 'did:ethr:0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    walletAddress: '0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    createdAt: '2026-05-01T11:00:00Z',
    lastActive: '2026-09-28T12:30:00Z',
    avatar: 'MI',
  },
  {
    id: 'usr-007',
    profileId: 'profile-007',
    name: 'Dr. Anil Bhatia',
    email: 'anil.b@bel.co.in',
    role: 'DEBUGGER',
    department: 'Security Operations',
    rank: 'Senior Analyst',
    status: 'ACTIVE',
    clearance: 'TOP SECRET',
    identityDid: 'did:ethr:0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    walletAddress: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    createdAt: '2026-05-18T08:15:00Z',
    lastActive: '2026-09-28T11:45:00Z',
    avatar: 'AB',
  },
  {
    id: 'usr-008',
    profileId: 'profile-008',
    name: 'Cpl. Vikrant Singh',
    email: 'vikrant.s@bel.co.in',
    role: 'ALTER',
    department: 'Logistics',
    rank: 'Corporal',
    status: 'SUSPENDED',
    clearance: 'CONFIDENTIAL',
    identityDid: 'did:ethr:0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    walletAddress: '0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    createdAt: '2026-06-10T13:45:00Z',
    lastActive: '2026-09-25T09:00:00Z',
    avatar: 'VS',
  },
];

// ===== DEMO ASSETS (12 realistic defence items) =====

export const demoAssets: DemoAsset[] = [
  {
    id: 'ast-001',
    name: 'Tactical Radio System TRS-400',
    category: 'Communications',
    description: 'Encrypted tactical radio system for field operations with AES-256 encryption and frequency hopping.',
    currentOwner: 'Commander Arjun Vikram',
    previousOwner: 'BEL Central Depot',
    status: 'ACTIVE',
    nftTokenId: '#1001',
    txHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
    blockNumber: 1042,
    ipfsCid: 'QmX7b2kFgHjLzR8yNv3cPqW5tA9mE6dK4sJ1uB0wY2xC3z',
    classification: 'SECRET',
    createdAt: '2026-03-20T09:30:00Z',
    lastModified: '2026-09-10T14:20:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL Central Depot', timestamp: '2026-03-20T09:30:00Z', txHash: '0xabc123...f1a2b3', blockNumber: 1040, previousState: '', newState: 'CREATED', notes: 'Asset registered — serial #TRS-400-BEL-2026' },
      { stage: 'INSPECTED', actor: 'Lt. Col. Rajesh Nair', timestamp: '2026-03-25T11:00:00Z', txHash: '0xdef456...c4d5e6', blockNumber: 1041, previousState: 'CREATED', newState: 'INSPECTED', notes: 'QA inspection passed — firmware v3.2.1' },
      { stage: 'TRANSFERRED', actor: 'Commander Arjun Vikram', timestamp: '2026-04-01T08:00:00Z', txHash: '0xghi789...d5e6f7', blockNumber: 1042, previousState: 'INSPECTED', newState: 'ACTIVE', notes: 'Deployed to Command & Control — Northern Sector' },
    ],
  },
  {
    id: 'ast-002',
    name: 'Surveillance Drone SD-Eagle MK-IV',
    category: 'Aerial Systems',
    description: 'Long-range surveillance drone with thermal imaging, LIDAR, and real-time encrypted data relay capability.',
    currentOwner: 'Lt. Col. Rajesh Nair',
    previousOwner: 'BEL Aerospace Division',
    status: 'ACTIVE',
    nftTokenId: '#1002',
    txHash: '0x789012345678901234567890abcdef1234567890abcdef1234567890abcdef12',
    blockNumber: 1055,
    ipfsCid: 'QmY8c3kGiJmMs9zOw4dQrX6uB0nF7eL5tK2vI3wZ1yD4a',
    classification: 'TOP SECRET',
    createdAt: '2026-04-05T13:45:00Z',
    lastModified: '2026-09-12T16:30:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL Aerospace Division', timestamp: '2026-04-05T13:45:00Z', txHash: '0x789012...e6f7a8', blockNumber: 1054, previousState: '', newState: 'CREATED', notes: 'Drone unit registered — S/N EAGLE-MK4-0042' },
      { stage: 'REGISTERED', actor: 'Commander Arjun Vikram', timestamp: '2026-04-06T10:00:00Z', txHash: '0xklm345...f7a8b9', blockNumber: 1055, previousState: 'CREATED', newState: 'REGISTERED', notes: 'NFT minted on-chain — identity anchored' },
      { stage: 'ACTIVE', actor: 'Lt. Col. Rajesh Nair', timestamp: '2026-04-10T08:30:00Z', txHash: '0xnop678...a8b9c0', blockNumber: 1056, previousState: 'REGISTERED', newState: 'ACTIVE', notes: 'Deployed to R&D — payload testing complete' },
    ],
  },
  {
    id: 'ast-003',
    name: 'Radar Jamming Unit RJU-200',
    category: 'Defence Equipment',
    description: 'Electronic warfare radar jamming system capable of disrupting hostile radar within 50km radius.',
    currentOwner: 'Dr. Anil Bhatia',
    previousOwner: 'Commander Arjun Vikram',
    status: 'AUDITED',
    nftTokenId: '#1003',
    txHash: '0xdef789abc012345678901234567890abcdef1234567890abcdef1234567890ab',
    blockNumber: 1063,
    ipfsCid: 'QmZ9d4lHkKnNt0aQp5eRsY7uC1oG8fM3vL6xJ2wA0zE5b',
    classification: 'TOP SECRET // SCI',
    createdAt: '2026-04-18T07:15:00Z',
    lastModified: '2026-09-20T10:00:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL EW Division', timestamp: '2026-04-18T07:15:00Z', txHash: '0xdef789...b9c0d1', blockNumber: 1060, previousState: '', newState: 'CREATED', notes: 'EW system registered — classification TS//SCI' },
      { stage: 'TRANSFERRED', actor: 'Commander Arjun Vikram', timestamp: '2026-05-01T09:00:00Z', txHash: '0xqrs012...c0d1e2', blockNumber: 1062, previousState: 'CREATED', newState: 'TRANSFERRED', notes: 'Transferred to Security Ops for field evaluation' },
      { stage: 'AUDITED', actor: 'Maj. Kavita Deshmukh', timestamp: '2026-09-20T10:00:00Z', txHash: '0xtuv345...d1e2f3', blockNumber: 1063, previousState: 'TRANSFERRED', newState: 'AUDITED', notes: 'Compliance audit completed — all parameters nominal' },
    ],
  },
  {
    id: 'ast-004',
    name: 'Secure Terminal Unit STU-X1',
    category: 'Cryptographic',
    description: 'Military-grade secure communication terminal with quantum-resistant encryption for classified comms.',
    currentOwner: 'Commander Arjun Vikram',
    previousOwner: 'BEL Crypto Division',
    status: 'ACTIVE',
    nftTokenId: '#1004',
    txHash: '0x456789abcdef012345678901234567890abcdef1234567890abcdef12345678',
    blockNumber: 1070,
    ipfsCid: 'QmA0e5bFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyY',
    classification: 'TOP SECRET',
    createdAt: '2026-05-10T11:00:00Z',
    lastModified: '2026-09-15T09:45:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL Crypto Division', timestamp: '2026-05-10T11:00:00Z', txHash: '0x456789...e2f3a4', blockNumber: 1068, previousState: '', newState: 'CREATED', notes: 'Quantum-safe terminal manufactured — S/N STU-X1-0007' },
      { stage: 'ACTIVE', actor: 'Commander Arjun Vikram', timestamp: '2026-05-15T08:00:00Z', txHash: '0xwxy678...f3a4b5', blockNumber: 1070, previousState: 'CREATED', newState: 'ACTIVE', notes: 'Installed in Command Centre — Room 7A' },
    ],
  },
  {
    id: 'ast-005',
    name: 'Night Vision Scope NVS-G3',
    category: 'Surveillance',
    description: 'Gen-3 night vision scope with digital overlay, GPS tagging, and secure image transmission.',
    currentOwner: 'Capt. Suresh Pillai',
    previousOwner: 'Lt. Col. Rajesh Nair',
    status: 'TRANSFERRED',
    nftTokenId: '#1005',
    txHash: '0x567890abcdef1234567890123456789012abcdef1234567890abcdef12345678',
    blockNumber: 1078,
    ipfsCid: 'QmB1f6cGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ',
    classification: 'CONFIDENTIAL',
    createdAt: '2026-06-01T14:30:00Z',
    lastModified: '2026-09-22T11:15:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL Optics Division', timestamp: '2026-06-01T14:30:00Z', txHash: '0x567890...a4b5c6', blockNumber: 1075, previousState: '', newState: 'CREATED', notes: 'NVS unit registered — S/N NVS-G3-0189' },
      { stage: 'ASSIGNED', actor: 'Lt. Col. Rajesh Nair', timestamp: '2026-06-10T09:00:00Z', txHash: '0xzab901...b5c6d7', blockNumber: 1076, previousState: 'CREATED', newState: 'ASSIGNED', notes: 'Assigned to R&D for calibration' },
      { stage: 'TRANSFERRED', actor: 'Capt. Suresh Pillai', timestamp: '2026-09-22T11:15:00Z', txHash: '0xcde234...c6d7e8', blockNumber: 1078, previousState: 'ASSIGNED', newState: 'TRANSFERRED', notes: 'Transferred to Field Ops — Northern Border post' },
    ],
  },
  {
    id: 'ast-006',
    name: 'Mobile Command Vehicle MCV-Bharat',
    category: 'Support Systems',
    description: 'Armored mobile command vehicle with integrated comms, power generation, and satellite uplink.',
    currentOwner: 'Commander Arjun Vikram',
    previousOwner: 'BEL Vehicle Division',
    status: 'ACTIVE',
    nftTokenId: '#1006',
    txHash: '0x678901abcdef2345678901234567890123abcdef1234567890abcdef12345678',
    blockNumber: 1082,
    ipfsCid: 'QmC2g7dHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZaA',
    classification: 'SECRET',
    createdAt: '2026-06-20T08:00:00Z',
    lastModified: '2026-09-25T16:00:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL Vehicle Division', timestamp: '2026-06-20T08:00:00Z', txHash: '0x678901...d7e8f9', blockNumber: 1080, previousState: '', newState: 'CREATED', notes: 'MCV registered — VIN MCV-BH-2026-001' },
      { stage: 'ACTIVE', actor: 'Commander Arjun Vikram', timestamp: '2026-07-01T10:00:00Z', txHash: '0xfgh567...e8f9a0', blockNumber: 1082, previousState: 'CREATED', newState: 'ACTIVE', notes: 'Deployed — Northern Command HQ' },
    ],
  },
  {
    id: 'ast-007',
    name: 'Satellite Uplink Terminal SUT-K2',
    category: 'Communications',
    description: 'Portable satellite communication terminal with AES-256 encrypted uplink and 128kbps bandwidth.',
    currentOwner: 'Sgt. Meera Iyer',
    previousOwner: 'BEL SATCOM Division',
    status: 'ACTIVE',
    nftTokenId: '#1007',
    txHash: '0x789012abcdef3456789012345678901234abcdef1234567890abcdef12345678',
    blockNumber: 1088,
    ipfsCid: 'QmD3h8eIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZaAbB',
    classification: 'SECRET',
    createdAt: '2026-07-15T13:00:00Z',
    lastModified: '2026-09-26T14:30:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL SATCOM Division', timestamp: '2026-07-15T13:00:00Z', txHash: '0x789012...f9a0b1', blockNumber: 1086, previousState: '', newState: 'CREATED', notes: 'SATCOM terminal registered' },
      { stage: 'ACTIVE', actor: 'Sgt. Meera Iyer', timestamp: '2026-07-20T09:30:00Z', txHash: '0xijk890...a0b1c2', blockNumber: 1088, previousState: 'CREATED', newState: 'ACTIVE', notes: 'Deployed to Communications — Eastern Sector' },
    ],
  },
  {
    id: 'ast-008',
    name: 'Autonomous Patrol Bot APB-Dhruv',
    category: 'Defence Equipment',
    description: 'AI-powered autonomous patrol robot with obstacle avoidance, threat detection, and perimeter monitoring.',
    currentOwner: 'Lt. Col. Rajesh Nair',
    previousOwner: 'BEL Robotics Lab',
    status: 'MAINTENANCE',
    nftTokenId: '#1008',
    txHash: '0x890123abcdef4567890123456789012345abcdef1234567890abcdef12345678',
    blockNumber: 1095,
    ipfsCid: 'QmE4i9fJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZaAbBcC',
    classification: 'SECRET',
    createdAt: '2026-08-01T10:00:00Z',
    lastModified: '2026-09-27T08:00:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL Robotics Lab', timestamp: '2026-08-01T10:00:00Z', txHash: '0x890123...b1c2d3', blockNumber: 1092, previousState: '', newState: 'CREATED', notes: 'Patrol bot registered — Model APB-D-v2' },
      { stage: 'ACTIVE', actor: 'Lt. Col. Rajesh Nair', timestamp: '2026-08-10T08:30:00Z', txHash: '0xlmn012...c2d3e4', blockNumber: 1094, previousState: 'CREATED', newState: 'ACTIVE', notes: 'Deployed to perimeter patrol sector 7' },
      { stage: 'MAINTENANCE', actor: 'Lt. Col. Rajesh Nair', timestamp: '2026-09-27T08:00:00Z', txHash: '0xopq345...d3e4f5', blockNumber: 1095, previousState: 'ACTIVE', newState: 'MAINTENANCE', notes: 'Scheduled maintenance — sensor recalibration' },
    ],
  },
  {
    id: 'ast-009',
    name: 'Laser Designator LD-5000',
    category: 'Defence Equipment',
    description: 'Man-portable laser target designator with 10km effective range and GPS integration.',
    currentOwner: 'Capt. Suresh Pillai',
    previousOwner: 'BEL Weapons Division',
    status: 'ACTIVE',
    nftTokenId: '#1009',
    txHash: '0x901234abcdef5678901234567890123456abcdef1234567890abcdef12345678',
    blockNumber: 1101,
    ipfsCid: 'QmF5j0gKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZaAbBcCdD',
    classification: 'SECRET',
    createdAt: '2026-08-15T07:00:00Z',
    lastModified: '2026-09-26T10:00:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL Weapons Division', timestamp: '2026-08-15T07:00:00Z', txHash: '0x901234...e4f5a6', blockNumber: 1100, previousState: '', newState: 'CREATED', notes: 'Laser designator registered' },
      { stage: 'ACTIVE', actor: 'Capt. Suresh Pillai', timestamp: '2026-08-20T09:00:00Z', txHash: '0xrst678...f5a6b7', blockNumber: 1101, previousState: 'CREATED', newState: 'ACTIVE', notes: 'Deployed to Field Ops — Western Sector' },
    ],
  },
  {
    id: 'ast-010',
    name: 'Cipher Machine CM-Vajra',
    category: 'Cryptographic',
    description: 'Indigenous cipher machine for secure message encoding with post-quantum cryptographic algorithms.',
    currentOwner: 'Dr. Anil Bhatia',
    previousOwner: 'BEL Crypto Division',
    status: 'ACTIVE',
    nftTokenId: '#1010',
    txHash: '0x012345abcdef6789012345678901234567abcdef1234567890abcdef12345678',
    blockNumber: 1108,
    ipfsCid: 'QmG6k1hLmMnNoOpPqQrRsStTuUvVwWxXyYzZaAbBcCdDeE',
    classification: 'TOP SECRET // SCI',
    createdAt: '2026-08-25T11:30:00Z',
    lastModified: '2026-09-27T14:00:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL Crypto Division', timestamp: '2026-08-25T11:30:00Z', txHash: '0x012345...a6b7c8', blockNumber: 1106, previousState: '', newState: 'CREATED', notes: 'Vajra cipher machine — serial CM-V-0003' },
      { stage: 'ACTIVE', actor: 'Dr. Anil Bhatia', timestamp: '2026-09-01T08:00:00Z', txHash: '0xuvw901...b7c8d9', blockNumber: 1108, previousState: 'CREATED', newState: 'ACTIVE', notes: 'Deployed to Security Ops — Crypto Lab A' },
    ],
  },
  {
    id: 'ast-011',
    name: 'Battlefield Management System BMS-Shakti',
    category: 'Support Systems',
    description: 'Integrated battlefield management system with real-time blue force tracking and threat mapping.',
    currentOwner: 'Commander Arjun Vikram',
    previousOwner: 'BEL Systems Integration',
    status: 'ACTIVE',
    nftTokenId: '#1011',
    txHash: '0x123456abcdef7890123456789012345678abcdef1234567890abcdef12345678',
    blockNumber: 1115,
    ipfsCid: 'QmH7l2iMnNoOpPqQrRsStTuUvVwWxXyYzZaAbBcCdDeEfF',
    classification: 'TOP SECRET',
    createdAt: '2026-09-01T06:00:00Z',
    lastModified: '2026-09-28T08:00:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL Systems Integration', timestamp: '2026-09-01T06:00:00Z', txHash: '0x123456...c8d9e0', blockNumber: 1112, previousState: '', newState: 'CREATED', notes: 'BMS deployed to command vehicle' },
      { stage: 'ACTIVE', actor: 'Commander Arjun Vikram', timestamp: '2026-09-05T10:00:00Z', txHash: '0xxyz234...d9e0f1', blockNumber: 1115, previousState: 'CREATED', newState: 'ACTIVE', notes: 'Operational — tracking 47 units' },
    ],
  },
  {
    id: 'ast-012',
    name: 'Signal Interceptor SI-Garuda',
    category: 'Surveillance',
    description: 'Wideband signal interception system with AI-powered pattern recognition for SIGINT operations.',
    currentOwner: 'Dr. Priya Sharma',
    previousOwner: 'BEL SIGINT Division',
    status: 'REGISTERED',
    nftTokenId: '#1012',
    txHash: '0x234567abcdef8901234567890123456789abcdef1234567890abcdef12345678',
    blockNumber: 1120,
    ipfsCid: 'QmI8m3jNoOpPqQrRsStTuUvVwWxXyYzZaAbBcCdDeEfFgG',
    classification: 'TOP SECRET // SCI',
    createdAt: '2026-09-15T09:00:00Z',
    lastModified: '2026-09-28T12:00:00Z',
    lifecycle: [
      { stage: 'CREATED', actor: 'BEL SIGINT Division', timestamp: '2026-09-15T09:00:00Z', txHash: '0x234567...e0f1a2', blockNumber: 1118, previousState: '', newState: 'CREATED', notes: 'SIGINT system manufactured' },
      { stage: 'REGISTERED', actor: 'Dr. Priya Sharma', timestamp: '2026-09-20T14:00:00Z', txHash: '0xabc567...f1a2b3', blockNumber: 1120, previousState: 'CREATED', newState: 'REGISTERED', notes: 'NFT minted — awaiting deployment clearance' },
    ],
  },
];

// ===== DEMO AUDIT LOGS (20 entries) =====

export const demoAuditLogs: DemoAuditLog[] = [
  { id: 'aud-001', timestamp: '2026-09-28T18:30:00Z', actor: 'Commander Arjun Vikram', actorRole: 'ADMIN', action: 'USER_LOGIN', resource: 'auth_session', resourceType: 'SESSION', result: 'SUCCESS', txHash: '0xA1B2C3...789012', blockNumber: 1121, ipAddress: '10.0.1.1', details: 'Admin login from secure terminal — Command Centre' },
  { id: 'aud-002', timestamp: '2026-09-28T17:45:00Z', actor: 'Dr. Priya Sharma', actorRole: 'ADMIN', action: 'ASSET_REGISTER', resource: 'ast-012', resourceType: 'ASSET', result: 'SUCCESS', txHash: '0xD4E5F6...345678', blockNumber: 1120, ipAddress: '10.0.2.5', details: 'Signal Interceptor SI-Garuda registered — NFT #1012 minted' },
  { id: 'aud-003', timestamp: '2026-09-28T16:20:00Z', actor: 'Lt. Col. Rajesh Nair', actorRole: 'DEBUGGER', action: 'ASSET_INSPECT', resource: 'ast-008', resourceType: 'ASSET', result: 'SUCCESS', txHash: '0xG7H8I9...901234', blockNumber: 1119, ipAddress: '10.0.3.12', details: 'APB-Dhruv maintenance inspection — sensor firmware updated' },
  { id: 'aud-004', timestamp: '2026-09-28T15:10:00Z', actor: 'Maj. Kavita Deshmukh', actorRole: 'ALTER', action: 'DOCUMENT_UPLOAD', resource: 'doc-007', resourceType: 'DOCUMENT', result: 'SUCCESS', txHash: '0xJ0K1L2...567890', blockNumber: 1118, ipAddress: '10.0.4.8', details: 'Compliance report uploaded to IPFS — hash verified' },
  { id: 'aud-005', timestamp: '2026-09-28T14:00:00Z', actor: 'Capt. Suresh Pillai', actorRole: 'VIEWER', action: 'ASSET_VIEW', resource: 'ast-009', resourceType: 'ASSET', result: 'SUCCESS', txHash: '0xM3N4O5...123456', blockNumber: 1117, ipAddress: '10.0.5.3', details: 'Laser Designator LD-5000 status viewed' },
  { id: 'aud-006', timestamp: '2026-09-28T12:30:00Z', actor: 'Sgt. Meera Iyer', actorRole: 'VIEWER', action: 'DOCUMENT_VIEW', resource: 'doc-004', resourceType: 'DOCUMENT', result: 'SUCCESS', txHash: '0xP6Q7R8...789012', blockNumber: 1116, ipAddress: '10.0.6.15', details: 'SUT-K2 user manual accessed' },
  { id: 'aud-007', timestamp: '2026-09-28T11:45:00Z', actor: 'Dr. Anil Bhatia', actorRole: 'DEBUGGER', action: 'SECURITY_SCAN', resource: 'system-wide', resourceType: 'SYSTEM', result: 'SUCCESS', txHash: '0xS9T0U1...345678', blockNumber: 1115, ipAddress: '10.0.7.22', details: 'Full system security audit — 0 vulnerabilities found' },
  { id: 'aud-008', timestamp: '2026-09-28T10:00:00Z', actor: 'Cpl. Vikrant Singh', actorRole: 'ALTER', action: 'ASSET_EDIT', resource: 'ast-006', resourceType: 'ASSET', result: 'DENIED', txHash: '0xV2W3X4...901234', blockNumber: 1114, ipAddress: '10.0.8.30', details: 'Attempted to modify MCV-Bharat metadata — INSUFFICIENT CLEARANCE' },
  { id: 'aud-009', timestamp: '2026-09-27T22:15:00Z', actor: 'UNKNOWN', actorRole: 'NONE', action: 'BRUTE_FORCE', resource: 'auth_endpoint', resourceType: 'SESSION', result: 'DENIED', txHash: '0xY5Z6A7...567890', blockNumber: 1113, ipAddress: '203.0.113.42', details: 'Multiple failed login attempts from external IP — rate limited' },
  { id: 'aud-010', timestamp: '2026-09-27T18:00:00Z', actor: 'Commander Arjun Vikram', actorRole: 'ADMIN', action: 'ROLE_ASSIGN', resource: 'usr-008', resourceType: 'USER', result: 'SUCCESS', txHash: '0xB8C9D0...123456', blockNumber: 1112, ipAddress: '10.0.1.1', details: 'Cpl. Vikrant Singh suspended — clearance review pending' },
  { id: 'aud-011', timestamp: '2026-09-27T15:30:00Z', actor: 'Dr. Priya Sharma', actorRole: 'ADMIN', action: 'IDENTITY_VERIFY', resource: 'usr-003', resourceType: 'USER', result: 'SUCCESS', txHash: '0xE1F2G3...789012', blockNumber: 1111, ipAddress: '10.0.2.5', details: 'Lt. Col. Rajesh Nair — DID verified against on-chain registry' },
  { id: 'aud-012', timestamp: '2026-09-27T12:00:00Z', actor: 'Maj. Kavita Deshmukh', actorRole: 'ALTER', action: 'ASSET_AUDIT', resource: 'ast-003', resourceType: 'ASSET', result: 'SUCCESS', txHash: '0xH4I5J6...345678', blockNumber: 1110, ipAddress: '10.0.4.8', details: 'RJU-200 compliance audit — all parameters within tolerance' },
  { id: 'aud-013', timestamp: '2026-09-26T20:00:00Z', actor: 'System', actorRole: 'SYSTEM', action: 'AUTO_BACKUP', resource: 'blockchain_state', resourceType: 'SYSTEM', result: 'SUCCESS', txHash: '0xK7L8M9...901234', blockNumber: 1109, ipAddress: '10.0.0.1', details: 'Automated blockchain state backup — 1,109 blocks archived' },
  { id: 'aud-014', timestamp: '2026-09-26T16:45:00Z', actor: 'Lt. Col. Rajesh Nair', actorRole: 'DEBUGGER', action: 'CLASSIFIED_ACCESS', resource: 'ast-003', resourceType: 'ASSET', result: 'SUCCESS', txHash: '0xN0O1P2...567890', blockNumber: 1108, ipAddress: '10.0.3.12', details: 'Accessed TOP SECRET // SCI classified asset — RJU-200' },
  { id: 'aud-015', timestamp: '2026-09-26T14:30:00Z', actor: 'Sgt. Meera Iyer', actorRole: 'VIEWER', action: 'CLASSIFIED_ACCESS', resource: 'ast-010', resourceType: 'ASSET', result: 'DENIED', txHash: '0xQ3R4S5...123456', blockNumber: 1107, ipAddress: '10.0.6.15', details: 'Attempted to access TS//SCI Cipher Machine — CLEARANCE INSUFFICIENT' },
  { id: 'aud-016', timestamp: '2026-09-26T10:00:00Z', actor: 'Commander Arjun Vikram', actorRole: 'ADMIN', action: 'CONTRACT_DEPLOY', resource: 'DocumentNFT', resourceType: 'CONTRACT', result: 'SUCCESS', txHash: '0xT6U7V8...789012', blockNumber: 1106, ipAddress: '10.0.1.1', details: 'DocumentNFT smart contract deployed — address 0x5FC8d3...' },
  { id: 'aud-017', timestamp: '2026-09-25T22:00:00Z', actor: 'System', actorRole: 'SYSTEM', action: 'ANOMALY_DETECTED', resource: 'network_traffic', resourceType: 'SYSTEM', result: 'SUCCESS', txHash: '0xW9X0Y1...345678', blockNumber: 1105, ipAddress: '10.0.0.1', details: 'Unusual outbound traffic spike detected — resolved: scheduled update' },
  { id: 'aud-018', timestamp: '2026-09-25T16:00:00Z', actor: 'Dr. Anil Bhatia', actorRole: 'DEBUGGER', action: 'CROSS_DEPT_ACCESS', resource: 'logistics_inventory', resourceType: 'SYSTEM', result: 'SUCCESS', txHash: '0xZ2A3B4...901234', blockNumber: 1104, ipAddress: '10.0.7.22', details: 'Cross-department inventory audit — Logistics → Security Ops' },
  { id: 'aud-019', timestamp: '2026-09-25T11:30:00Z', actor: 'Capt. Suresh Pillai', actorRole: 'VIEWER', action: 'REPORT_GENERATE', resource: 'field_report_sep25', resourceType: 'DOCUMENT', result: 'DENIED', txHash: '0xC5D6E7...567890', blockNumber: 1103, ipAddress: '10.0.5.3', details: 'Report generation denied — VIEWER role cannot generate reports' },
  { id: 'aud-020', timestamp: '2026-09-25T09:00:00Z', actor: 'Commander Arjun Vikram', actorRole: 'ADMIN', action: 'GAS_FEE_CONFIG', resource: 'gas_registry', resourceType: 'CONTRACT', result: 'SUCCESS', txHash: '0xF8G9H0...123456', blockNumber: 1102, ipAddress: '10.0.1.1', details: 'Gas fee updated to 0.00001 ETH per action — effective immediately' },
];

// ===== DEMO BLOCKCHAIN TRANSACTIONS (15 entries) =====

export const demoBlockchainTxs: DemoBlockchainTx[] = [
  { hash: '0xA1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF123456', blockNumber: 1121, from: '0xADM1N...0001', to: '0x5FC8d3...AuthContract', method: 'recordLogin', contract: 'AuditRegistry', status: 'CONFIRMED', gasUsed: 42150, timestamp: '2026-09-28T18:30:00Z', events: ['LoginRecorded', 'GasFeePaid'] },
  { hash: '0xD4E5F6A7B8C9012345678901234567890ABCDEF1234567890ABCDEF12345678', blockNumber: 1120, from: '0x51H0...0002', to: '0x8A2e...AssetNFT', method: 'mintAsset', contract: 'AssetNFT', status: 'CONFIRMED', gasUsed: 185230, timestamp: '2026-09-28T17:45:00Z', events: ['Transfer', 'AssetMinted', 'MetadataSet'] },
  { hash: '0xG7H8I9J0K1L2345678901234567890ABCDEF1234567890ABCDEF1234567890AB', blockNumber: 1119, from: '0x3a4b...1a2b', to: '0x8A2e...AssetNFT', method: 'updateAssetStatus', contract: 'AssetNFT', status: 'CONFIRMED', gasUsed: 65420, timestamp: '2026-09-28T16:20:00Z', events: ['StatusChanged', 'AuditTrailUpdated'] },
  { hash: '0xJ0K1L2M3N4O5678901234567890ABCDEF1234567890ABCDEF1234567890ABCD', blockNumber: 1118, from: '0x4b5c...2b3c', to: '0x9B3f...DocumentNFT', method: 'mintDocument', contract: 'DocumentNFT', status: 'CONFIRMED', gasUsed: 156780, timestamp: '2026-09-28T15:10:00Z', events: ['Transfer', 'DocumentMinted', 'IPFSLinked'] },
  { hash: '0xM3N4O5P6Q7R8901234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12', blockNumber: 1117, from: '0x5c6d...3c4d', to: '0x5FC8d3...AuditRegistry', method: 'logAction', contract: 'AuditRegistry', status: 'CONFIRMED', gasUsed: 38900, timestamp: '2026-09-28T14:00:00Z', events: ['ActionLogged'] },
  { hash: '0xP6Q7R8S9T0U1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234', blockNumber: 1116, from: '0x6d7e...4d5e', to: '0x9B3f...DocumentNFT', method: 'verifyDocument', contract: 'DocumentNFT', status: 'CONFIRMED', gasUsed: 28350, timestamp: '2026-09-28T12:30:00Z', events: ['DocumentVerified'] },
  { hash: '0xS9T0U1V2W3X4567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456', blockNumber: 1115, from: '0x7e8f...5e6f', to: '0x5FC8d3...AuditRegistry', method: 'securityAudit', contract: 'AuditRegistry', status: 'CONFIRMED', gasUsed: 95600, timestamp: '2026-09-28T11:45:00Z', events: ['SecurityAuditCompleted', 'ReportGenerated'] },
  { hash: '0xV2W3X4Y5Z6A7890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', blockNumber: 1114, from: '0x8f9a...6f7a', to: '0x8A2e...AssetNFT', method: 'updateAsset', contract: 'AssetNFT', status: 'FAILED', gasUsed: 21000, timestamp: '2026-09-28T10:00:00Z', events: ['AccessDenied'] },
  { hash: '0xY5Z6A7B8C9D0123ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', blockNumber: 1113, from: '0x0000...EXTERNAL', to: '0x5FC8d3...AuditRegistry', method: 'recordLogin', contract: 'AuditRegistry', status: 'CONFIRMED', gasUsed: 42150, timestamp: '2026-09-27T22:15:00Z', events: ['LoginFailed', 'RateLimited'] },
  { hash: '0xB8C9D0E1F2G3456ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', blockNumber: 1112, from: '0xADM1N...0001', to: '0x7D4a...RoleManager', method: 'suspendRole', contract: 'RoleManager', status: 'CONFIRMED', gasUsed: 78400, timestamp: '2026-09-27T18:00:00Z', events: ['RoleSuspended', 'UserStatusChanged'] },
  { hash: '0xE1F2G3H4I5J6789ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', blockNumber: 1111, from: '0x51H0...0002', to: '0x6C3b...IdentityRegistry', method: 'verifyIdentity', contract: 'IdentityRegistry', status: 'CONFIRMED', gasUsed: 55200, timestamp: '2026-09-27T15:30:00Z', events: ['IdentityVerified', 'DIDResolved'] },
  { hash: '0xH4I5J6K7L8M9012ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', blockNumber: 1110, from: '0x4b5c...2b3c', to: '0x8A2e...AssetNFT', method: 'auditAsset', contract: 'AssetNFT', status: 'CONFIRMED', gasUsed: 72100, timestamp: '2026-09-27T12:00:00Z', events: ['AssetAudited', 'ComplianceVerified'] },
  { hash: '0xK7L8M9N0O1P2345ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', blockNumber: 1109, from: '0x0000...SYSTEM', to: '0x5FC8d3...AuditRegistry', method: 'backupState', contract: 'AuditRegistry', status: 'CONFIRMED', gasUsed: 125000, timestamp: '2026-09-26T20:00:00Z', events: ['StateBackup', 'BlockchainSnapshot'] },
  { hash: '0xN0O1P2Q3R4S5678ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', blockNumber: 1108, from: '0x7e8f...5e6f', to: '0x9B3f...DocumentNFT', method: 'mintDocument', contract: 'DocumentNFT', status: 'CONFIRMED', gasUsed: 156780, timestamp: '2026-09-26T16:45:00Z', events: ['Transfer', 'DocumentMinted'] },
  { hash: '0xT6U7V8W9X0Y1234ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', blockNumber: 1106, from: '0xADM1N...0001', to: '0x0000...CREATE', method: 'deploy', contract: 'DocumentNFT', status: 'CONFIRMED', gasUsed: 2450000, timestamp: '2026-09-26T10:00:00Z', events: ['ContractDeployed', 'OwnershipSet'] },
];

// ===== DEMO IPFS DOCUMENTS (8 entries) =====

export const demoDocuments: DemoDocument[] = [
  { id: 'doc-001', name: 'TRS-400 Technical Manual v3.2', type: 'PDF', size: '4.2 MB', ipfsCid: 'QmX7b2kFgHjLzR8yNv3cPqW5tA9mE6dK4sJ1uB0wY2xC3z', hash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b', uploadedBy: 'Commander Arjun Vikram', assetId: 'ast-001', status: 'VERIFIED', pinned: true, createdAt: '2026-04-01T08:15:00Z' },
  { id: 'doc-002', name: 'SD-Eagle MK-IV Certification Report', type: 'PDF', size: '2.8 MB', ipfsCid: 'QmY8c3kGiJmMs9zOw4dQrX6uB0nF7eL5tK2vI3wZ1yD4a', hash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f', uploadedBy: 'Lt. Col. Rajesh Nair', assetId: 'ast-002', status: 'VERIFIED', pinned: true, createdAt: '2026-04-10T11:30:00Z' },
  { id: 'doc-003', name: 'RJU-200 Compliance Audit — Sep 2026', type: 'PDF', size: '1.5 MB', ipfsCid: 'QmZ9d4lHkKnNt0aQp5eRsY7uC1oG8fM3vL6xJ2wA0zE5b', hash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b', uploadedBy: 'Maj. Kavita Deshmukh', assetId: 'ast-003', status: 'VERIFIED', pinned: true, createdAt: '2026-09-20T10:30:00Z' },
  { id: 'doc-004', name: 'STU-X1 User Operations Guide', type: 'PDF', size: '6.1 MB', ipfsCid: 'QmA0e5bFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyY', hash: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d', uploadedBy: 'Commander Arjun Vikram', assetId: 'ast-004', status: 'VERIFIED', pinned: true, createdAt: '2026-05-15T09:00:00Z' },
  { id: 'doc-005', name: 'NVS-G3 Calibration Certificate', type: 'PDF', size: '890 KB', ipfsCid: 'QmB1f6cGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ', hash: '0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2', uploadedBy: 'Lt. Col. Rajesh Nair', assetId: 'ast-005', status: 'VERIFIED', pinned: false, createdAt: '2026-06-10T14:00:00Z' },
  { id: 'doc-006', name: 'APB-Dhruv Maintenance Log — Q3 2026', type: 'PDF', size: '3.4 MB', ipfsCid: 'QmE4i9fJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZaAbBcC', hash: '0xd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4', uploadedBy: 'Lt. Col. Rajesh Nair', assetId: 'ast-008', status: 'VERIFIED', pinned: true, createdAt: '2026-09-27T09:00:00Z' },
  { id: 'doc-007', name: 'CM-Vajra Crypto Compliance Report', type: 'PDF', size: '2.1 MB', ipfsCid: 'QmG6k1hLmMnNoOpPqQrRsStTuUvVwWxXyYzZaAbBcCdDeE', hash: '0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6', uploadedBy: 'Dr. Anil Bhatia', assetId: 'ast-010', status: 'PENDING', pinned: false, createdAt: '2026-09-28T10:00:00Z' },
  { id: 'doc-008', name: 'BMS-Shakti Integration Test Results', type: 'PDF', size: '5.7 MB', ipfsCid: 'QmH7l2iMnNoOpPqQrRsStTuUvVwWxXyYzZaAbBcCdDeEfF', hash: '0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8', uploadedBy: 'Commander Arjun Vikram', assetId: 'ast-011', status: 'VERIFIED', pinned: true, createdAt: '2026-09-28T08:30:00Z' },
];

// ===== DEMO SECURITY EVENTS (12 entries) =====

export const demoSecurityEvents: DemoSecurityEvent[] = [
  { id: 'sec-001', timestamp: '2026-09-28T10:00:00Z', type: 'ACCESS_DENIED', severity: 'MEDIUM', actor: 'Cpl. Vikrant Singh', source: '10.0.8.30', description: 'Attempted to modify MCV-Bharat metadata without sufficient clearance — ALTER role denied for SECRET asset', resolved: true },
  { id: 'sec-002', timestamp: '2026-09-27T22:15:00Z', type: 'BRUTE_FORCE', severity: 'CRITICAL', actor: 'Unknown (External)', source: '203.0.113.42', description: '14 failed login attempts in 2 minutes from external IP — rate limiter engaged, IP blocked for 24h', resolved: true },
  { id: 'sec-003', timestamp: '2026-09-27T18:30:00Z', type: 'ROLE_ESCALATION', severity: 'HIGH', actor: 'Cpl. Vikrant Singh', source: '10.0.8.30', description: 'Attempted to access ADMIN panel via direct URL — role escalation blocked by middleware', resolved: true },
  { id: 'sec-004', timestamp: '2026-09-26T14:30:00Z', type: 'ACCESS_DENIED', severity: 'HIGH', actor: 'Sgt. Meera Iyer', source: '10.0.6.15', description: 'Attempted to access TS//SCI classified Cipher Machine CM-Vajra — CONFIDENTIAL clearance insufficient', resolved: true },
  { id: 'sec-005', timestamp: '2026-09-26T03:00:00Z', type: 'ANOMALY_DETECTED', severity: 'MEDIUM', actor: 'System AI', source: '10.0.0.1', description: 'Unusual outbound traffic spike at 03:00 — 450% above baseline — resolved: scheduled security update download', resolved: true },
  { id: 'sec-006', timestamp: '2026-09-25T19:45:00Z', type: 'SESSION_EXPIRED', severity: 'LOW', actor: 'Capt. Suresh Pillai', source: '10.0.5.3', description: 'Session expired after 8h inactivity — re-authentication required', resolved: true },
  { id: 'sec-007', timestamp: '2026-09-25T11:30:00Z', type: 'ACCESS_DENIED', severity: 'MEDIUM', actor: 'Capt. Suresh Pillai', source: '10.0.5.3', description: 'Report generation denied — VIEWER role cannot generate classified reports', resolved: true },
  { id: 'sec-008', timestamp: '2026-09-24T16:00:00Z', type: 'UNAUTHORIZED_ATTEMPT', severity: 'HIGH', actor: 'Unknown', source: '198.51.100.77', description: 'API probe detected — /api/auth/register endpoint accessed without invite token', resolved: true },
  { id: 'sec-009', timestamp: '2026-09-24T08:00:00Z', type: 'ANOMALY_DETECTED', severity: 'MEDIUM', actor: 'System AI', source: '10.0.0.1', description: 'Login from new device detected for Dr. Anil Bhatia — verified via 2FA challenge', resolved: true },
  { id: 'sec-010', timestamp: '2026-09-23T21:00:00Z', type: 'BRUTE_FORCE', severity: 'CRITICAL', actor: 'Unknown (External)', source: '192.0.2.100', description: 'Distributed brute force attempt — 8 IPs targeting admin account — all blocked and reported', resolved: true },
  { id: 'sec-011', timestamp: '2026-09-23T14:00:00Z', type: 'ROLE_ESCALATION', severity: 'HIGH', actor: 'Unknown', source: '10.0.9.50', description: 'JWT token manipulation detected — signature verification failed — request rejected', resolved: true },
  { id: 'sec-012', timestamp: '2026-09-22T10:00:00Z', type: 'ANOMALY_DETECTED', severity: 'LOW', actor: 'System AI', source: '10.0.0.1', description: 'Database query pattern anomaly — 3x normal SELECT count on audit_logs — investigation: legitimate report generation', resolved: true },
];

// ===== DASHBOARD STATS =====

export const dashboardStats = {
  totalIdentities: 8,
  activeUsers: 7,
  registeredAssets: 12,
  assetsTransferred: 3,
  blockchainTxns: 1121,
  ipfsDocuments: 8,
  securityEvents: 12,
  failedAccessAttempts: 6,
};

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

// ===== LIVE FEED EVENTS (realistic real-time events) =====

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
