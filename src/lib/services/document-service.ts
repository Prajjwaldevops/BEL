/**
 * BEL SENTINEL — Document Service
 *
 * Central orchestrator for the document lifecycle.
 * Coordinates hashing, encryption, storage, minting, and database operations.
 *
 * This service is consumed by API routes — business logic lives here,
 * not scattered across route handlers.
 */

import crypto from 'crypto';
import type { AuthUser } from '@/lib/auth';
import type {
  DocumentClassification,
  DocumentNFTMetadata,
  DocumentUploadResult,
} from '@/lib/types/document';
import { encryptDocument } from '@/lib/storage/encryption';
import {
  getStorageProvider,
  generateDocumentStorageKey,
  isStorageConfigured,
} from '@/lib/storage/storage';

// ===== Types =====

export interface DocumentUploadParams {
  file: Buffer;
  fileName: string;
  mimeType: string;
  name: string;
  description?: string;
  classification: DocumentClassification;
  transferable: boolean;
  expiresAt?: string | null;
  walletAddress?: string | null;
}

export interface StoredDocumentRecord {
  id: string;
  document_id: string;
  name: string;
  contentHash: string;
  metadataHash: string;
  fileSize: number;
  mimeType: string;
  classification: DocumentClassification;
  storageProvider: string;
  storageKey: string;
  encrypted: boolean;
  uploadedAt: string;
}

// ===== Hashing =====

/**
 * Compute SHA-256 hash of raw bytes, returned as 0x-prefixed hex.
 * MUST be computed server-side — never trust a hash from the browser.
 */
export function computeContentHash(data: Buffer): string {
  return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compute SHA-256 hash of a canonical metadata JSON string.
 */
export function computeMetadataHash(metadata: Record<string, unknown>): string {
  const canonical = JSON.stringify(metadata, Object.keys(metadata).sort());
  return '0x' + crypto.createHash('sha256').update(canonical).digest('hex');
}

// ===== NFT Metadata =====

/**
 * Build the ERC-721 compatible metadata JSON for IPFS/Pinata.
 * Contains ONLY safe, public metadata — no encryption keys, no R2 URLs.
 */
export function buildNFTMetadata(params: {
  documentId: string;
  name: string;
  contentHash: string;
  metadataHash: string;
  mimeType: string;
  fileSize: number;
  classification: DocumentClassification;
  version: number;
  transferable: boolean;
  issuedAt: string;
  expiresAt?: string;
}): DocumentNFTMetadata {
  return {
    name: `BEL Document #${params.documentId}`,
    description: 'Blockchain-verified document on BEL Sentinel',
    documentId: params.documentId,
    contentHash: params.contentHash,
    metadataHash: params.metadataHash,
    mimeType: params.mimeType,
    fileSize: params.fileSize,
    classification: params.classification,
    version: params.version,
    transferable: params.transferable,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
  };
}

// ===== Audit Helper =====

/**
 * Write an audit log entry. Non-fatal — errors are logged but don't fail the operation.
 */
export async function writeAuditLog(params: {
  actorId: string;
  actorRole: string;
  action: string;
  resourceId: string;
  resourceType: string;
  result: 'SUCCESS' | 'DENIED' | 'ERROR';
  details?: string;
  txHash?: string;
  blockNumber?: number;
  gasFeeEth?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        actor_id: params.actorId,
        actor_role: params.actorRole,
        action: params.action,
        resource_id: params.resourceId,
        resource_type: 'DOCUMENT',
        result: params.result,
        details: params.details,
        tx_hash: params.txHash || null,
        block_number: params.blockNumber || null,
        gas_fee_eth: params.gasFeeEth || 0,
        metadata: params.metadata || {},
      }),
    });
  } catch (err) {
    console.error('Audit log error (non-fatal):', err);
  }
}

// ===== Database Helper =====

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }
  return { supabaseUrl, supabaseKey };
}

/**
 * Update document status in the database.
 */
export async function updateDocumentStatus(
  documentId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  const res = await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update document: ${errText}`);
  }
}

/**
 * Fetch a document by ID.
 */
export async function getDocumentById(documentId: string): Promise<Record<string, unknown> | null> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  const res = await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}&select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
  });

  const docs = await res.json();
  if (!Array.isArray(docs) || docs.length === 0) return null;
  return docs[0];
}

/**
 * Record a document verification attempt.
 */
export async function recordVerification(params: {
  documentId: string;
  verifierId?: string;
  verifierWallet?: string;
  method: 'FILE_HASH' | 'DOCUMENT_ID' | 'NFT_LOOKUP' | 'QR_CODE';
  providedHash?: string;
  result: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  try {
    await fetch(`${supabaseUrl}/rest/v1/document_verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        document_id: params.documentId,
        verifier_id: params.verifierId || null,
        verifier_wallet: params.verifierWallet || null,
        verification_method: params.method,
        provided_hash: params.providedHash || null,
        result: params.result,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      }),
    });

    // Increment verification count
    // Note: Using raw SQL update via RPC would be ideal; this is a simple increment
    const doc = await getDocumentById(params.documentId);
    if (doc) {
      await updateDocumentStatus(params.documentId, {
        verification_count: ((doc.verification_count as number) || 0) + 1,
      });
    }
  } catch (err) {
    console.error('Verification record error:', err);
  }
}
