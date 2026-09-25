/**
 * GET /api/stats/dashboard
 * Returns real-time dashboard statistics from Supabase
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Run all queries in parallel
    const [
      identitiesResult,
      activeUsersResult,
      assetsResult,
      transfersResult,
      txnsResult,
      docsResult,
      eventsResult,
      failedLoginsResult,
      gasFeesResult
    ] = await Promise.all([
      // Total identities (profiles with identity NFTs)
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .not('nft_token_id', 'is', null),
      
      // Active users (logged in within last 30 days)
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_active_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'ACTIVE'),
      
      // Registered assets
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true }),
      
      // Assets transferred
      supabase
        .from('asset_ownership_history')
        .select('id', { count: 'exact', head: true })
        .eq('transfer_type', 'TRANSFERRED'),
      
      // Blockchain transactions
      supabase
        .from('blockchain_transactions')
        .select('id', { count: 'exact', head: true }),
      
      // IPFS documents
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .not('ipfs_hash', 'is', null),
      
      // Security events
      supabase
        .from('security_events')
        .select('id', { count: 'exact', head: true }),
      
      // Failed access attempts
      supabase
        .from('login_trails')
        .select('id', { count: 'exact', head: true })
        .eq('result', 'FAILED'),
      
      // Total gas fees
      supabase
        .from('blockchain_transactions')
        .select('gas_fee_eth')
    ]);

    // Calculate total gas fees
    const totalGasFeesCollected = (gasFeesResult.data || [])
      .reduce((sum, tx) => sum + (parseFloat(tx.gas_fee_eth) || 0), 0);

    const stats = {
      totalIdentities: identitiesResult.count || 0,
      activeUsers: activeUsersResult.count || 0,
      registeredAssets: assetsResult.count || 0,
      assetsTransferred: transfersResult.count || 0,
      blockchainTxns: txnsResult.count || 0,
      ipfsDocuments: docsResult.count || 0,
      securityEvents: eventsResult.count || 0,
      failedAccessAttempts: failedLoginsResult.count || 0,
      totalGasFeesCollected: parseFloat(totalGasFeesCollected.toFixed(6)),
    };

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
