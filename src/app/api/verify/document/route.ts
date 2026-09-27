import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cid = searchParams.get('cid');

    if (!cid) {
      return NextResponse.json(
        { error: 'IPFS CID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Query document from database
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('ipfs_hash', cid)
      .single();

    if (error || !document) {
      return NextResponse.json({
        verified: false,
        type: 'document',
        data: { id: cid },
        error: 'Document not found in registry',
      });
    }

    // Query blockchain transaction
    const { data: txData } = await supabase
      .from('blockchain_transactions')
      .select('*')
      .eq('resource_type', 'DOCUMENT')
      .eq('resource_id', document.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get uploader profile
    const { data: uploader } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', document.uploaded_by)
      .single();

    // Try to get on-chain data
    let onChainData;
    try {
      if (process.env.NEXT_PUBLIC_RPC_URL && txData?.tx_hash) {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
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
    } catch (err) {
      console.error('On-chain verification error:', err);
    }

    return NextResponse.json({
      verified: true,
      type: 'document',
      data: {
        id: cid,
        name: document.name,
        owner: uploader?.full_name || uploader?.username || 'Unknown',
        status: 'VERIFIED',
        txHash: txData?.tx_hash,
        timestamp: document.created_at,
        ipfsHash: document.ipfs_hash,
        metadataHash: document.metadata_hash,
      },
      onChainData,
    });

  } catch (error) {
    console.error('Document verification error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Verification failed'
      },
      { status: 500 }
    );
  }
}
