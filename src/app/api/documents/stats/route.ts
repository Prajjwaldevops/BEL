/**
 * BEL SENTINEL — Dashboard Stats API
 * GET /api/documents/stats
 * Returns real aggregated data from the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'count=exact' };

    // Parallel queries for all stats
    const [
      totalDocsRes, mintedRes, verifiedRes, revokedRes,
      pendingRes, activeRes, expiredRes,
      verificationsRes, transfersRes, usersRes,
      txRes, auditRes
    ] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/documents?select=id&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/documents?select=id&mint_status=eq.MINTED&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/documents?select=id&status=eq.VERIFIED&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/documents?select=id&status=eq.REVOKED&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/documents?select=id&mint_status=in.(STORED,PENDING_MINT)&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/documents?select=id&status=in.(PENDING,VERIFIED,ACTIVE)&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/documents?select=id&expires_at=lt.${new Date().toISOString()}&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/document_verifications?select=id&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/document_transfers?select=id&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/profiles?select=id&status=eq.ACTIVE&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/blockchain_transactions?select=id&limit=0`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/audit_logs?select=id&limit=0`, { headers }),
    ]);

    const extractCount = (res: Response) => {
      const range = res.headers.get('content-range');
      if (range) {
        const total = range.split('/')[1];
        return total === '*' ? 0 : parseInt(total, 10);
      }
      return 0;
    };

    // Get total storage used
    let storageUsedBytes = 0;
    try {
      const storageRes = await fetch(
        `${supabaseUrl}/rest/v1/documents?select=file_size&limit=1000`,
        { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
      );
      const storageDocs = await storageRes.json();
      if (Array.isArray(storageDocs)) {
        storageUsedBytes = storageDocs.reduce((sum: number, d: { file_size: number }) => sum + (d.file_size || 0), 0);
      }
    } catch { /* non-fatal */ }

    // Get recent activity
    let recentDocuments: unknown[] = [];
    try {
      const recentRes = await fetch(
        `${supabaseUrl}/rest/v1/documents?select=id,document_id,name,classification,status,mint_status,content_hash,owner_wallet,nft_token_id,created_at,file_size,mime_type&order=created_at.desc&limit=10`,
        { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
      );
      recentDocuments = await recentRes.json();
    } catch { /* non-fatal */ }

    // Get recent audit events
    let recentAuditEvents: unknown[] = [];
    try {
      const auditEventsRes = await fetch(
        `${supabaseUrl}/rest/v1/audit_logs?select=id,action,resource_type,result,details,tx_hash,created_at&resource_type=eq.DOCUMENT&order=created_at.desc&limit=10`,
        { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
      );
      recentAuditEvents = await auditEventsRes.json();
    } catch { /* non-fatal */ }

    return NextResponse.json({
      stats: {
        totalDocuments: extractCount(totalDocsRes),
        mintedNFTs: extractCount(mintedRes),
        verifiedDocuments: extractCount(verifiedRes),
        revokedDocuments: extractCount(revokedRes),
        pendingMint: extractCount(pendingRes),
        activeDocuments: extractCount(activeRes),
        expiredDocuments: extractCount(expiredRes),
        totalVerifications: extractCount(verificationsRes),
        totalTransfers: extractCount(transfersRes),
        activeUsers: extractCount(usersRes),
        blockchainTransactions: extractCount(txRes),
        totalAuditEvents: extractCount(auditRes),
        storageUsedBytes,
      },
      recentDocuments: Array.isArray(recentDocuments) ? recentDocuments : [],
      recentAuditEvents: Array.isArray(recentAuditEvents) ? recentAuditEvents : [],
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
