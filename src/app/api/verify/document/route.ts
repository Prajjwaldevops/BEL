/**
 * BEL SENTINEL — Document Verification API
 *
 * GET  /api/verify/document?id=xxx    → verify by document UUID
 * GET  /api/verify/document?hash=0x.. → verify by content hash
 * POST /api/verify/document            → verify by file upload (multipart)
 *                                      → verify by JSON body { documentId, contentHash }
 *
 * Returns real verification result cross-referencing DB + blockchain.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyByDocumentId,
  verifyByFileHash,
} from '@/lib/services/verification-service';
import { recordVerification, getDocumentById } from '@/lib/services/document-service';

// ===== GET: Verify by query parameters =====

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const hash = searchParams.get('hash');
    const cid = searchParams.get('cid'); // Legacy IPFS CID support

    if (!id && !hash && !cid) {
      return NextResponse.json(
        { error: 'Provide id, hash, or cid query parameter' },
        { status: 400 }
      );
    }

    // Verify by document ID
    if (id) {
      const result = await verifyByDocumentId(id);

      if (result.document) {
        await recordVerification({
          documentId: result.document.id,
          method: 'DOCUMENT_ID',
          result: result.status,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        });
      }

      return NextResponse.json(result);
    }

    // Verify by content hash
    if (hash) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
      }

      const res = await fetch(
        `${supabaseUrl}/rest/v1/documents?content_hash=eq.${hash}&select=*&order=version.desc&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      const docs = await res.json();
      if (!Array.isArray(docs) || docs.length === 0) {
        return NextResponse.json({
          status: 'NOT_FOUND',
          document: null,
          nft: null,
          hashes: { contentHash: hash, hashMatch: false, onChainHashMatch: false },
          blockchain: null,
          verifiedAt: new Date().toISOString(),
          message: 'No document found matching this content hash',
        });
      }

      const result = await verifyByDocumentId(docs[0].id);

      await recordVerification({
        documentId: docs[0].id,
        method: 'FILE_HASH',
        providedHash: hash,
        result: result.status,
      });

      return NextResponse.json(result);
    }

    // Legacy CID lookup — search by ipfs_hash field
    if (cid) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
      }

      const res = await fetch(
        `${supabaseUrl}/rest/v1/documents?ipfs_hash=eq.${cid}&select=*&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      const docs = await res.json();
      if (!Array.isArray(docs) || docs.length === 0) {
        return NextResponse.json({
          verified: false,
          type: 'document',
          data: { id: cid },
          error: 'Document not found in registry',
        });
      }

      const result = await verifyByDocumentId(docs[0].id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Verification API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}

// ===== POST: Verify by file upload or JSON body =====

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // ---- File upload verification ----
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        return NextResponse.json({ error: 'File is empty' }, { status: 400 });
      }

      const result = await verifyByFileHash(buffer);

      if (result.document) {
        await recordVerification({
          documentId: result.document.id,
          method: 'FILE_HASH',
          providedHash: result.hashes?.providedHash,
          result: result.status,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        });
      }

      return NextResponse.json(result);
    }

    // ---- JSON body verification ----
    const body = await request.json();
    const { documentId, contentHash } = body;

    if (!documentId && !contentHash) {
      return NextResponse.json(
        { error: 'Provide documentId or contentHash' },
        { status: 400 }
      );
    }

    if (documentId) {
      const result = await verifyByDocumentId(documentId);

      if (result.document) {
        await recordVerification({
          documentId: result.document.id,
          method: 'DOCUMENT_ID',
          result: result.status,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        });
      }

      return NextResponse.json(result);
    }

    if (contentHash) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
      }

      const res = await fetch(
        `${supabaseUrl}/rest/v1/documents?content_hash=eq.${contentHash}&select=*&order=version.desc&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      const docs = await res.json();
      if (!Array.isArray(docs) || docs.length === 0) {
        return NextResponse.json({
          status: 'NOT_FOUND',
          document: null,
          hashes: { contentHash, hashMatch: false },
          verifiedAt: new Date().toISOString(),
          message: 'No document found matching this content hash',
        });
      }

      const result = await verifyByDocumentId(docs[0].id);

      await recordVerification({
        documentId: docs[0].id,
        method: 'FILE_HASH',
        providedHash: contentHash,
        result: result.status,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Verification API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
