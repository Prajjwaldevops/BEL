import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Query asset from database
    const { data: asset, error } = await supabase
      .from('assets')
      .select('*')
      .eq('nft_token_id', tokenId)
      .single();

    if (error || !asset) {
      return NextResponse.json({
        verified: false,
        type: 'asset',
        data: { id: tokenId },
        error: 'Asset not found in registry',
      });
    }

    // Query blockchain transaction
    const { data: txData } = await supabase
      .from('blockchain_transactions')
      .select('*')
      .eq('resource_type', 'ASSET')
      .eq('resource_id', asset.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Try to get on-chain data if we have a provider
    let onChainData;
    try {
      if (process.env.NEXT_PUBLIC_RPC_URL) {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        
        if (txData?.tx_hash) {
          const tx = await provider.getTransaction(txData.tx_hash);
          const receipt = await provider.getTransactionReceipt(txData.tx_hash);
          
          if (tx && receipt) {
            const block = await provider.getBlock(receipt.blockNumber);
            
            onChainData = {
              txHash: txData.tx_hash,
              blockNumber: receipt.blockNumber,
              timestamp: block ? new Date(block.timestamp * 1000).toISOString() : new Date().toISOString(),
              gasUsed: receipt.gasUsed.toString(),
              network: process.env.NEXT_PUBLIC_CHAIN_ID === '31337' ? 'localhost' : 'sepolia',
            };
          }
        }
      }
    } catch (err) {
      console.error('On-chain verification error:', err);
      // Continue without on-chain data
    }

    return NextResponse.json({
      verified: true,
      type: 'asset',
      data: {
        id: tokenId,
        name: asset.name || asset.physical_id,
        owner: asset.current_owner,
        status: asset.status,
        txHash: txData?.tx_hash,
        timestamp: asset.created_at,
        metadataHash: asset.metadata_hash,
      },
      onChainData,
    });

  } catch (error) {
    console.error('Asset verification error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Verification failed'
      },
      { status: 500 }
    );
  }
}
