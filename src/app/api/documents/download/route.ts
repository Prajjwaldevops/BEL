/**
 * BEL SENTINEL — Document Download API
 * 
 * GET /api/documents/download?id=xxx
 * 
 * Authorization flow:
 * 1. Authenticate user
 * 2. Check document permissions
 * 3. Check document state (not revoked)
 * 4. Decrypt if encrypted
 * 5. Return short-lived signed URL or stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStorageProvider } from '@/lib/storage/storage';
import { decryptDocument } from '@/lib/storage/encryption';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');
    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Fetch document
    const res = await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${docId}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
    });
    const docs = await res.json();
    if (!Array.isArray(docs) || docs.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];

    // Check revocation
    if (doc.status === 'REVOKED' || doc.revoked_at) {
      return NextResponse.json({ error: 'Document has been revoked' }, { status: 403 });
    }

    // Check expiry
    if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Document has expired' }, { status: 403 });
    }

    // Authorization: owner, admin, or debugger
    const isOwner = doc.uploaded_by === user.id || doc.owner_wallet === user.walletAddress;
    const isPrivileged = user.roles.includes('ADMIN') || user.roles.includes('DEBUGGER');
    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!doc.storage_key) {
      return NextResponse.json({ error: 'Document not stored in cloud storage' }, { status: 404 });
    }

    // If encrypted, we need to download, decrypt, and stream
    if (doc.encryption_method) {
      const provider = getStorageProvider();
      const downloadResult = await provider.download(doc.storage_key);

      const decrypted = await decryptDocument({
        encryptedData: downloadResult.data,
        iv: Buffer.from(doc.encryption_iv, 'hex'),
        authTag: Buffer.from(doc.encryption_tag, 'hex'),
        keyId: doc.encryption_key_id,
      });

      // Audit log
      try {
        await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            actor_id: user.id,
            actor_role: user.roles?.[0] || 'VIEWER',
            action: 'DOCUMENT_DOWNLOADED',
            resource_id: doc.id,
            resource_type: 'DOCUMENT',
            result: 'SUCCESS',
            details: `Document "${doc.name}" downloaded by ${user.username}`,
          }),
        });
      } catch { /* non-fatal */ }

      return new NextResponse(decrypted, {
        status: 200,
        headers: {
          'Content-Type': doc.mime_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${doc.name}"`,
          'Content-Length': decrypted.length.toString(),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // Not encrypted — generate signed URL (short-lived)
    const provider = getStorageProvider();
    const signedUrl = await provider.getSignedUrl({
      key: doc.storage_key,
      expiresInSeconds: 300, // 5 minutes
      contentDisposition: `attachment; filename="${doc.name}"`,
    });

    // Audit log
    try {
      await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          actor_id: user.id,
          actor_role: user.roles?.[0] || 'VIEWER',
          action: 'DOCUMENT_DOWNLOADED',
          resource_id: doc.id,
          resource_type: 'DOCUMENT',
          result: 'SUCCESS',
          details: `Signed URL generated for "${doc.name}"`,
        }),
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ downloadUrl: signedUrl, expiresIn: 300 });

  } catch (error) {
    console.error('Document download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}
