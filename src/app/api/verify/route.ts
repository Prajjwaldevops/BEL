/**
 * BEL SENTINEL — Document Verification API (Public)
 * 
 * POST /api/verify — Verify by file upload (hash comparison)
 * GET /api/verify?documentId=xxx — Verify by document ID
 * GET /api/verify?contractAddress=xxx&tokenId=xxx — Verify by NFT
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { VerificationResult, VerificationStatus } from '@/lib/types/document';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database not configured');
  return { url, key };
}

async function queryDocuments(url: string, key: string, filter: string) {
  const res = await fetch(`${url}/rest/v1/documents?${filter}&select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  return res.json();
}

async function logVerification(
  url: string, key: string,
  documentId: string, method: string, result: VerificationStatus,
  providedHash?: string, request?: NextRequest
) {
  try {
    await fetch(`${url}/rest/v1/document_verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        document_id: documentId,
        verification_method: method,
        provided_hash: providedHash || null,
        result,
        ip_address: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null,
        user_agent: request?.headers.get('user-agent') || null,
      }),
    });

    // Increment verification count
    await fetch(`${url}/rest/v1/rpc/increment_verification_count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ doc_id: documentId }),
    }).catch(() => { /* function may not exist yet */ });
  } catch (e) {
    console.error('Verification log error (non-fatal):', e);
  }
}

function buildVerificationResult(doc: Record<string, unknown> | null, status: VerificationStatus, message: string, providedHash?: string): VerificationResult {
  if (!doc) {
    return {
      status,
      document: null,
      nft: null,
      hashes: null,
      blockchain: null,
      verifiedAt: new Date().toISOString(),
      message,
    };
  }

  return {
    status,
    document: {
      id: doc.id as string,
      document_id: doc.document_id as string,
      name: doc.name as string,
      document_type: doc.document_type as string | null,
      classification: doc.classification as 'UNCLASSIFIED',
      version: (doc.version as number) || 1,
      issuer: null,
      issuedAt: doc.issued_at as string,
      expiresAt: doc.expires_at as string | null,
    },
    nft: {
      contractAddress: doc.nft_contract_address as string | null,
      tokenId: doc.nft_token_id as string | null,
      owner: doc.owner_wallet as string | null,
      chainId: doc.chain_id as number | null,
      mintTxHash: doc.mint_tx_hash as string | null,
    },
    hashes: {
      contentHash: doc.content_hash as string,
      metadataHash: doc.metadata_hash as string,
      providedHash,
      hashMatch: providedHash ? providedHash === doc.content_hash : true,
    },
    blockchain: {
      anchored: !!(doc.mint_tx_hash),
      txHash: doc.mint_tx_hash as string | null,
      blockNumber: doc.mint_block_number as number | null,
      network: doc.chain_id ? `Chain ${doc.chain_id}` : null,
    },
    verifiedAt: new Date().toISOString(),
    message,
  };
}

// GET — Verify by document ID or NFT
export async function GET(request: NextRequest) {
  try {
    const { url, key } = getSupabase();
    const { searchParams } = new URL(request.url);
    
    const documentId = searchParams.get('documentId');
    const contentHash = searchParams.get('contentHash');
    const contractAddress = searchParams.get('contractAddress');
    const tokenId = searchParams.get('tokenId');

    let docs: Record<string, unknown>[];
    let method: string;

    if (documentId) {
      // Try by document_id first, then by UUID id
      docs = await queryDocuments(url, key, `document_id=eq.${documentId}`);
      if (!Array.isArray(docs) || docs.length === 0) {
        docs = await queryDocuments(url, key, `id=eq.${documentId}`);
      }
      method = 'DOCUMENT_ID';
    } else if (contentHash) {
      docs = await queryDocuments(url, key, `content_hash=eq.${contentHash}`);
      method = 'FILE_HASH';
    } else if (contractAddress && tokenId) {
      docs = await queryDocuments(url, key, `nft_contract_address=eq.${contractAddress}&nft_token_id=eq.${tokenId}`);
      method = 'NFT_LOOKUP';
    } else {
      return NextResponse.json({ error: 'Provide documentId, contentHash, or contractAddress+tokenId' }, { status: 400 });
    }

    if (!Array.isArray(docs) || docs.length === 0) {
      return NextResponse.json(buildVerificationResult(null, 'NOT_FOUND', 'Document not found'));
    }

    const doc = docs[0];
    let status: VerificationStatus = 'VERIFIED';
    let message = 'Document verified successfully';

    if (doc.status === 'REVOKED' || doc.revoked_at) {
      status = 'REVOKED';
      message = 'Document has been revoked';
    } else if (doc.expires_at && new Date(doc.expires_at as string) < new Date()) {
      status = 'EXPIRED';
      message = 'Document has expired';
    }

    await logVerification(url, key, doc.id as string, method, status, undefined, request);

    return NextResponse.json(buildVerificationResult(doc, status, message));

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

// POST — Verify by file upload (hash comparison)
export async function POST(request: NextRequest) {
  try {
    const { url, key } = getSupabase();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadedHash = '0x' + crypto.createHash('sha256').update(buffer).digest('hex');

    // Look up document by content hash
    const docs = await queryDocuments(url, key, `content_hash=eq.${uploadedHash}`);

    if (!Array.isArray(docs) || docs.length === 0) {
      return NextResponse.json(
        buildVerificationResult(null, 'NOT_FOUND', 'No document matches this file hash. The document may have been modified or was never registered.')
      );
    }

    const doc = docs[0];
    let status: VerificationStatus = 'VERIFIED';
    let message = 'Document hash matches — file is authentic';

    if (doc.status === 'REVOKED' || doc.revoked_at) {
      status = 'REVOKED';
      message = 'Document hash matches but has been revoked';
    } else if (doc.expires_at && new Date(doc.expires_at as string) < new Date()) {
      status = 'EXPIRED';
      message = 'Document hash matches but has expired';
    }

    await logVerification(url, key, doc.id as string, 'FILE_HASH', status, uploadedHash, request);

    return NextResponse.json(buildVerificationResult(doc, status, message, uploadedHash));

  } catch (error) {
    console.error('File verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
