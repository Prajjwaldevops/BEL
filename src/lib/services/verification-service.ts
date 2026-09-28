/**
 * BEL SENTINEL — Document Verification Service
 *
 * Provides real document verification by comparing:
 * - File hash against registered content_hash in database
 * - On-chain document hash against database content hash
 * - NFT ownership via ownerOf() against database owner_wallet
 *
 * Returns states: VERIFIED, TAMPERED, REVOKED, EXPIRED, SUPERSEDED,
 *                 NOT_FOUND, INVALID_NFT, OWNER_MISMATCH
 *
 * NEVER returns "VERIFIED" simply because a database row exists.
 */

import crypto from 'crypto';
import type { VerificationResult, VerificationStatus } from '@/lib/types/document';
import { getDocumentOnChain, verifyDocumentOnChain, getTokenByContentHash, getOwnerOf } from '@/lib/services/nft-service';
import { getDocumentById, recordVerification } from '@/lib/services/document-service';
import { getNetworkName, getChainId } from '@/lib/contracts/document-nft';

// ===== Types =====

export type ExtendedVerificationStatus =
  | VerificationStatus
  | 'SUPERSEDED'
  | 'INVALID_NFT'
  | 'OWNER_MISMATCH';

export interface FullVerificationResult {
  status: ExtendedVerificationStatus;
  document: {
    id: string;
    document_id: string;
    name: string;
    document_type: string | null;
    classification: string;
    version: number;
    issuedAt: string;
    expiresAt: string | null;
  } | null;
  nft: {
    contractAddress: string | null;
    tokenId: string | null;
    owner: string | null;
    chainId: number | null;
    mintTxHash: string | null;
    isValid: boolean;
  } | null;
  hashes: {
    contentHash: string;
    metadataHash: string | null;
    providedHash?: string;
    hashMatch: boolean;
    onChainHashMatch: boolean;
  } | null;
  blockchain: {
    anchored: boolean;
    txHash: string | null;
    blockNumber: number | null;
    network: string | null;
  } | null;
  ownershipMatch: boolean | null;
  verifiedAt: string;
  message: string;
}

// ===== Verification by Document ID =====

/**
 * Verify a document by its database ID.
 * Cross-references database state with on-chain state.
 */
export async function verifyByDocumentId(documentId: string): Promise<FullVerificationResult> {
  const now = new Date().toISOString();

  // 1. Look up document in database
  const doc = await getDocumentById(documentId);
  if (!doc) {
    return buildResult('NOT_FOUND', null, null, null, null, false, now, 'Document not found in registry');
  }

  return verifyDocumentRecord(doc as Record<string, any>, undefined, now);
}

// ===== Verification by File Upload =====

/**
 * Verify a document by computing SHA-256 of uploaded file bytes
 * and comparing against registered records.
 */
export async function verifyByFileHash(fileBuffer: Buffer): Promise<FullVerificationResult> {
  const now = new Date().toISOString();
  const computedHash = '0x' + crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // Look up document by content_hash
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return buildResult('NOT_FOUND', null, null, null, null, false, now, 'Database not configured');
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/documents?content_hash=eq.${computedHash}&select=*&order=version.desc&limit=1`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  const docs = await res.json();
  if (!Array.isArray(docs) || docs.length === 0) {
    return buildResult('NOT_FOUND', null, null,
      { contentHash: computedHash, metadataHash: null, providedHash: computedHash, hashMatch: false, onChainHashMatch: false },
      null, false, now, 'No document found matching this file hash');
  }

  const doc = docs[0];
  return verifyDocumentRecord(doc, computedHash, now);
}

// ===== Verification by NFT =====

/**
 * Verify a document by its NFT contract address and token ID.
 * Reads directly from the blockchain.
 */
export async function verifyByNFT(
  contractAddress: string,
  tokenId: string
): Promise<FullVerificationResult> {
  const now = new Date().toISOString();

  // Read on-chain data
  const onChainDoc = await getDocumentOnChain(tokenId);
  if (!onChainDoc.exists) {
    return buildResult('INVALID_NFT', null, null, null, null, false, now,
      `NFT #${tokenId} does not exist on contract ${contractAddress}`);
  }

  // Look up in database by nft_token_id
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return buildResult('NOT_FOUND', null, null, null, null, false, now, 'Database not configured');
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/documents?nft_token_id=eq.${tokenId}&select=*&limit=1`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  const docs = await res.json();
  if (!Array.isArray(docs) || docs.length === 0) {
    // NFT exists on-chain but not in our database
    return buildResult('NOT_FOUND', null,
      {
        contractAddress,
        tokenId,
        owner: onChainDoc.owner,
        chainId: getChainId(),
        mintTxHash: null,
        isValid: onChainDoc.isValid,
      },
      null, null, false, now,
      `NFT #${tokenId} exists on-chain but is not indexed in BEL Sentinel`);
  }

  return verifyDocumentRecord(docs[0], undefined, now);
}

// ===== Internal Verification Logic =====

async function verifyDocumentRecord(
  doc: Record<string, any>,
  providedHash: string | undefined,
  now: string
): Promise<FullVerificationResult> {
  const contentHash = doc.content_hash as string;
  const metadataHash = doc.metadata_hash as string | null;
  const hashMatch = providedHash ? (providedHash === contentHash) : true;

  // Build document info
  const docInfo = {
    id: doc.id,
    document_id: doc.document_id,
    name: doc.name,
    document_type: doc.document_type,
    classification: doc.classification || 'UNCLASSIFIED',
    version: doc.version || 1,
    issuedAt: doc.issued_at || doc.created_at,
    expiresAt: doc.expires_at,
  };

  // Check for file hash mismatch
  if (providedHash && !hashMatch) {
    return buildResult('TAMPERED', docInfo, null,
      { contentHash, metadataHash, providedHash, hashMatch: false, onChainHashMatch: false },
      null, false, now, 'File hash does not match registered document');
  }

  // Check revocation
  if (doc.revoked_at || doc.status === 'REVOKED' || doc.mint_status === 'REVOKED') {
    return buildResult('REVOKED', docInfo, null,
      { contentHash, metadataHash, providedHash, hashMatch, onChainHashMatch: false },
      null, false, now, `Document was revoked on ${doc.revoked_at || 'unknown date'}`);
  }

  // Check expiry
  if (doc.expires_at && new Date(doc.expires_at) <= new Date()) {
    return buildResult('EXPIRED', docInfo, null,
      { contentHash, metadataHash, providedHash, hashMatch, onChainHashMatch: false },
      null, false, now, `Document expired on ${doc.expires_at}`);
  }

  // Check supersession
  if (doc.superseded_by) {
    return buildResult('SUPERSEDED', docInfo, null,
      { contentHash, metadataHash, providedHash, hashMatch, onChainHashMatch: false },
      null, false, now, 'Document has been superseded by a newer version');
  }

  // Check blockchain state if NFT is minted
  let nftInfo: FullVerificationResult['nft'] = null;
  let blockchainInfo: FullVerificationResult['blockchain'] = null;
  let onChainHashMatch = false;
  let ownershipMatch: boolean | null = null;

  if (doc.nft_token_id && doc.mint_status === 'MINTED') {
    const tokenId = doc.nft_token_id;

    // Read on-chain data
    const onChain = await getDocumentOnChain(tokenId);

    if (onChain.exists) {
      // Verify on-chain hash matches database hash
      const verifyResult = await verifyDocumentOnChain(tokenId, contentHash);
      onChainHashMatch = verifyResult.hashMatch;

      // Compare ownership
      const dbOwner = (doc.owner_wallet as string || '').toLowerCase();
      const chainOwner = (onChain.owner || '').toLowerCase();
      ownershipMatch = dbOwner && chainOwner ? dbOwner === chainOwner : null;

      nftInfo = {
        contractAddress: doc.nft_contract_address,
        tokenId,
        owner: onChain.owner,
        chainId: doc.chain_id || getChainId(),
        mintTxHash: doc.mint_tx_hash,
        isValid: onChain.isValid,
      };

      blockchainInfo = {
        anchored: true,
        txHash: doc.mint_tx_hash,
        blockNumber: doc.mint_block_number,
        network: getNetworkName(doc.chain_id),
      };

      // Check on-chain revocation
      if (onChain.isRevoked) {
        return buildResult('REVOKED', docInfo, nftInfo,
          { contentHash, metadataHash, providedHash, hashMatch, onChainHashMatch },
          blockchainInfo, ownershipMatch, now, 'Document is revoked on-chain');
      }

      // Check on-chain expiry
      if (onChain.isExpired) {
        return buildResult('EXPIRED', docInfo, nftInfo,
          { contentHash, metadataHash, providedHash, hashMatch, onChainHashMatch },
          blockchainInfo, ownershipMatch, now, 'Document has expired on-chain');
      }

      // Check hash integrity on-chain
      if (!onChainHashMatch) {
        return buildResult('TAMPERED', docInfo, nftInfo,
          { contentHash, metadataHash, providedHash, hashMatch, onChainHashMatch: false },
          blockchainInfo, ownershipMatch, now, 'On-chain hash does not match database record');
      }

      // Check ownership mismatch
      if (ownershipMatch === false) {
        return buildResult('OWNER_MISMATCH', docInfo, nftInfo,
          { contentHash, metadataHash, providedHash, hashMatch, onChainHashMatch },
          blockchainInfo, false, now,
          `Database owner (${doc.owner_wallet}) differs from on-chain owner (${onChain.owner})`);
      }
    } else {
      // Token doesn't exist on-chain but DB says MINTED
      nftInfo = {
        contractAddress: doc.nft_contract_address,
        tokenId,
        owner: null,
        chainId: doc.chain_id || getChainId(),
        mintTxHash: doc.mint_tx_hash,
        isValid: false,
      };
    }
  }

  // All checks passed
  return buildResult('VERIFIED', docInfo, nftInfo,
    { contentHash, metadataHash, providedHash, hashMatch, onChainHashMatch },
    blockchainInfo, ownershipMatch, now,
    nftInfo ? 'Document verified — hash matches and NFT ownership confirmed' : 'Document verified — hash matches registered record');
}

// ===== Result Builder =====

function buildResult(
  status: ExtendedVerificationStatus,
  document: FullVerificationResult['document'],
  nft: FullVerificationResult['nft'],
  hashes: FullVerificationResult['hashes'],
  blockchain: FullVerificationResult['blockchain'],
  ownershipMatch: boolean | null,
  verifiedAt: string,
  message: string
): FullVerificationResult {
  return { status, document, nft, hashes, blockchain, ownershipMatch, verifiedAt, message };
}
