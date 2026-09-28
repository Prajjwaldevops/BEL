/**
 * BEL SENTINEL — Document & NFT Type Definitions
 * 
 * Shared types for the document ownership and verification system.
 * Used across API routes, components, and services.
 */

// ===== Document Status State Machine =====
export type DocumentMintStatus =
  | 'UPLOADED'        // File received and hashed
  | 'PROCESSING'      // Being encrypted/stored
  | 'STORED'          // Encrypted in cloud storage
  | 'PENDING_MINT'    // Metadata created, awaiting wallet signature
  | 'MINTING'         // Transaction submitted, awaiting confirmation
  | 'MINTED'          // NFT minted, blockchain confirmed
  | 'FAILED';         // Operation failed

export type DocumentLifecycleStatus =
  | 'ACTIVE'
  | 'VERIFIED'
  | 'TRANSFERRED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'SUPERSEDED';

export type DocumentStatus = DocumentMintStatus | DocumentLifecycleStatus;

export type DocumentClassification =
  | 'UNCLASSIFIED'
  | 'CONFIDENTIAL'
  | 'SECRET'
  | 'TOP SECRET';

// ===== Core Document Model =====
export interface Document {
  id: string;
  document_id: string;            // Human-readable ID like BEL-DOC-001
  name: string;
  description: string | null;
  document_type: string | null;   // PDF, DOCX, etc.
  classification: DocumentClassification;
  version: number;
  file_size: number;
  mime_type: string;
  content_hash: string;           // SHA-256 of original bytes, 0x-prefixed
  metadata_hash: string;          // SHA-256 of metadata JSON, 0x-prefixed
  storage_provider: string | null;
  storage_key: string | null;
  storage_version: string | null;
  encryption_method: string | null;
  encryption_iv: string | null;   // Hex-encoded IV
  encryption_tag: string | null;  // Hex-encoded auth tag
  encryption_key_id: string | null;
  uploaded_by: string;            // Profile UUID
  owner_wallet: string | null;    // 0x wallet address
  asset_id: string | null;        // FK to assets
  nft_contract_address: string | null;
  nft_token_id: string | null;
  chain_id: number | null;
  mint_tx_hash: string | null;
  mint_block_number: number | null;
  mint_gas_used: string | null;
  mint_gas_price: string | null;
  mint_status: DocumentMintStatus;
  transferable: boolean;
  status: DocumentLifecycleStatus;
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
  superseded_by: string | null;
  previous_version_id: string | null;
  verification_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ===== Verification =====
export type VerificationStatus =
  | 'VERIFIED'
  | 'TAMPERED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'NOT_FOUND'
  | 'MISMATCH';

export interface VerificationResult {
  status: VerificationStatus;
  document: {
    id: string;
    document_id: string;
    name: string;
    document_type: string | null;
    classification: DocumentClassification;
    version: number;
    issuer: string | null;
    issuedAt: string;
    expiresAt: string | null;
  } | null;
  nft: {
    contractAddress: string | null;
    tokenId: string | null;
    owner: string | null;
    chainId: number | null;
    mintTxHash: string | null;
  } | null;
  hashes: {
    contentHash: string;
    metadataHash: string;
    providedHash?: string;
    hashMatch: boolean;
  } | null;
  blockchain: {
    anchored: boolean;
    txHash: string | null;
    blockNumber: number | null;
    network: string | null;
  } | null;
  verifiedAt: string;
  message: string;
}

// ===== NFT Metadata (ERC-721 compatible) =====
export interface DocumentNFTMetadata {
  name: string;
  description: string;
  documentId: string;
  contentHash: string;
  metadataHash: string;
  mimeType: string;
  fileSize: number;
  issuedAt: string;
  expiresAt?: string;
  classification: DocumentClassification;
  version: number;
  transferable: boolean;
  issuer?: string;
}

// ===== Upload Flow =====
export interface DocumentUploadRequest {
  file: File;
  name: string;
  description?: string;
  classification?: DocumentClassification;
  transferable?: boolean;
  expiresAt?: string;
}

export interface DocumentUploadResult {
  success: boolean;
  document: {
    id: string;
    document_id: string;
    name: string;
    contentHash: string;
    metadataHash: string;
    fileSize: number;
    mimeType: string;
    classification: DocumentClassification;
    storageProvider: string;
    encrypted: boolean;
    uploadedAt: string;
  };
  mintReady: boolean;
  message: string;
}

// ===== Mint Flow =====
export interface MintRequest {
  documentId: string;
  recipientWallet: string;
}

export interface MintResult {
  success: boolean;
  tokenId: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  chainId: number;
  owner: string;
  gasUsed: string;
  gasPrice: string;
  gasCostWei: string;
  gasCostEth: string;
}

// ===== Transaction Receipt =====
export interface DocumentTransactionReceipt {
  document: {
    name: string;
    documentId: string;
    contentHash: string;
    metadataHash: string;
  };
  nft: {
    contractAddress: string;
    tokenId: string;
    owner: string;
  };
  transaction: {
    hash: string;
    blockNumber: number;
    chainId: number;
    network: string;
    gasUsed: string;
    gasPrice: string;
    gasCostEth: string;
    status: 'confirmed' | 'failed';
    explorerUrl?: string;
  };
  storage: {
    provider: string;
    encrypted: boolean;
    status: 'stored';
  };
  verification: {
    status: VerificationStatus;
    verificationUrl: string;
    qrCodeUrl?: string;
  };
  timestamp: string;
}

// ===== Audit Events =====
export type DocumentAuditAction =
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_HASHED'
  | 'DOCUMENT_ENCRYPTED'
  | 'DOCUMENT_STORED'
  | 'DOCUMENT_MINT_REQUESTED'
  | 'DOCUMENT_MINTED'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_DOWNLOADED'
  | 'DOCUMENT_TRANSFERRED'
  | 'DOCUMENT_REVOKED'
  | 'DOCUMENT_EXPIRED'
  | 'DOCUMENT_SUPERSEDED'
  | 'DOCUMENT_VERIFICATION_FAILED';

export interface DocumentAuditEvent {
  action: DocumentAuditAction;
  documentId: string;
  actorId: string;
  actorWallet?: string;
  actorRole?: string;
  txHash?: string;
  blockNumber?: number;
  details?: string;
  metadata?: Record<string, unknown>;
  result: 'SUCCESS' | 'DENIED' | 'ERROR';
  timestamp: string;
}

// ===== Error Types =====
export type DocumentErrorCode =
  | 'DOCUMENT_NOT_FOUND'
  | 'DOCUMENT_ACCESS_DENIED'
  | 'DOCUMENT_REVOKED'
  | 'DOCUMENT_EXPIRED'
  | 'DOCUMENT_HASH_MISMATCH'
  | 'DOCUMENT_ALREADY_MINTED'
  | 'STORAGE_UPLOAD_FAILED'
  | 'STORAGE_DOWNLOAD_FAILED'
  | 'STORAGE_NOT_CONFIGURED'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'NFT_MINT_FAILED'
  | 'NFT_NOT_FOUND'
  | 'WRONG_NETWORK'
  | 'WALLET_NOT_CONNECTED'
  | 'TRANSACTION_REJECTED'
  | 'TRANSACTION_FAILED'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'UNAUTHORIZED';

export class DocumentError extends Error {
  constructor(
    public code: DocumentErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'DocumentError';
  }
}

// ===== Dashboard Stats =====
export interface DocumentDashboardStats {
  totalDocuments: number;
  mintedNFTs: number;
  verifiedDocuments: number;
  revokedDocuments: number;
  pendingMint: number;
  activeDocuments: number;
  expiredDocuments: number;
  totalVerifications: number;
  totalTransfers: number;
  storageUsedBytes: number;
}
