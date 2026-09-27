import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hash = searchParams.get('hash');

    if (!hash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Validate hash format
    if (!hash.startsWith('0x') || hash.length !== 66) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Query transaction from database
    const { data: tx, error } = await supabase
      .from('blockchain_transactions')
      .select('*')
      .eq('tx_hash', hash)
      .single();

    if (error || !tx) {
      return NextResponse.json({
        verified: false,
        type: 'transaction',
        data: { id: hash },
        error: 'Transaction not found in registry',
      });
    }

    // Try to verify on-chain
    let onChainData;
    let verified = false;
    
    try {
      if (process.env.NEXT_PUBLIC_RPC_URL) {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const receipt = await provider.getTransactionReceipt(hash);
        
        if (receipt) {
          verified = true;
          const block = await provider.getBlock(receipt.blockNumber);
          
          onChainData = {
            txHash: hash,
            blockNumber: receipt.blockNumber,
            timestamp: block ? new Date(block.timestamp * 1000).toISOString() : new Date().toISOString(),
            gasUsed: receipt.gasUsed.toString(),
            network: process.env.NEXT_PUBLIC_CHAIN_ID === '31337' ? 'localhost' : 'sepolia',
          };
        }
      }
    } catch (err) {
      console.error('On-chain verification error:', err);
      // Transaction exists in DB but not on chain - possible orphan
      verified = false;
    }

    // Get associated resource details
    let resourceDetails;
    if (tx.resource_type && tx.resource_id) {
      if (tx.resource_type === 'ASSET') {
        const { data: asset } = await supabase
          .from('assets')
          .select('name, physical_id, status')
          .eq('id', tx.resource_id)
          .single();
        resourceDetails = asset;
      } else if (tx.resource_type === 'DOCUMENT') {
        const { data: doc } = await supabase
          .from('documents')
          .select('name, ipfs_hash')
          .eq('id', tx.resource_id)
          .single();
        resourceDetails = doc;
      } else if (tx.resource_type === 'IDENTITY') {
        const { data: identity } = await supabase
          .from('identities')
          .select('full_name, nft_token_id')
          .eq('id', tx.resource_id)
          .single();
        resourceDetails = identity;
      }
    }

    return NextResponse.json({
      verified,
      type: tx.resource_type?.toLowerCase() || 'transaction',
      data: {
        id: hash,
        name: resourceDetails?.name || resourceDetails?.full_name || tx.resource_type,
        owner: tx.wallet_address,
        status: tx.status,
        txHash: hash,
        timestamp: tx.created_at,
        metadataHash: tx.metadata_hash,
      },
      onChainData,
    });

  } catch (error) {
    console.error('Transaction verification error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Verification failed'
      },
      { status: 500 }
    );
  }
}
