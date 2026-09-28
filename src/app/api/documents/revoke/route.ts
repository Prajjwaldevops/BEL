/**
 * BEL SENTINEL — Document Revocation API
 * 
 * POST /api/documents/revoke
 * Body: { documentId, reason }
 * 
 * Only ADMIN or document issuer can revoke.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, reason } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Revocation reason is required' }, { status: 400 });
    }

    // Only ADMIN can revoke
    if (!user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Only administrators can revoke documents' }, { status: 403 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Fetch document
    const docRes = await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
    });
    const docs = await docRes.json();
    if (!Array.isArray(docs) || docs.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];
    if (doc.status === 'REVOKED' || doc.revoked_at) {
      return NextResponse.json({ error: 'Document is already revoked' }, { status: 400 });
    }

    // Update document status
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        status: 'REVOKED',
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revocation_reason: reason,
      }),
    });

    if (!updateRes.ok) {
      return NextResponse.json({ error: 'Failed to revoke document' }, { status: 500 });
    }

    // On-chain revocation if document has a minted NFT
    let onChainTxHash: string | null = null;
    if (doc.nft_token_id && doc.mint_status === 'MINTED') {
      try {
        const { ethers, Contract, JsonRpcProvider } = await import('ethers');
        const { DOCUMENT_NFT_ABI, getDocumentNFTAddress } = await import('@/lib/contracts/document-nft');
        const { getAdminWallet } = await import('@/lib/admin-wallet');

        const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545');
        const signer = await getAdminWallet(provider);
        const contract = new Contract(getDocumentNFTAddress(), DOCUMENT_NFT_ABI, signer);

        const tx = await contract.revokeDocument(doc.nft_token_id, reason);
        const receipt = await tx.wait();
        onChainTxHash = receipt?.hash || tx.hash;

        // Update document with revocation tx hash
        await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ mint_status: 'REVOKED' }),
        });
      } catch (chainErr) {
        console.error('On-chain revocation error (DB already revoked):', chainErr);
        // DB is already revoked — the on-chain call failed but the document is still inaccessible
      }
    }

    // Audit log
    await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        actor_id: user.id,
        actor_role: 'ADMIN',
        action: 'DOCUMENT_REVOKED',
        resource_id: documentId,
        resource_type: 'DOCUMENT',
        result: 'SUCCESS',
        tx_hash: onChainTxHash,
        details: `Document "${doc.name}" revoked. Reason: ${reason}${onChainTxHash ? '. On-chain TX: ' + onChainTxHash : ''}`,
        metadata: {
          documentId: doc.document_id,
          previousStatus: doc.status,
          reason,
          nftTokenId: doc.nft_token_id,
          onChainRevoked: !!onChainTxHash,
        },
      }),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      document_id: doc.document_id,
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
      revokedBy: user.username,
      reason,
      message: `Document "${doc.name}" has been revoked.`,
    });

  } catch (error) {
    console.error('Revocation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Revocation failed' },
      { status: 500 }
    );
  }
}
