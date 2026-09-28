/**
 * BEL SENTINEL — Document Mint Confirmation API
 * 
 * POST /api/documents/mint-confirm
 * 
 * Called AFTER the user's wallet has signed and the transaction is confirmed.
 * Updates the database with the real on-chain token ID, tx hash, gas data.
 * 
 * This does NOT mint — the actual minting happens client-side via Wagmi.
 * This endpoint records the result.
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
    const {
      documentId,
      tokenId,
      contractAddress,
      transactionHash,
      blockNumber,
      chainId,
      ownerWallet,
      gasUsed,
      gasPrice,
    } = body;

    if (!documentId || !tokenId || !transactionHash || !ownerWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, tokenId, transactionHash, ownerWallet' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify document exists and is in STORED/PENDING_MINT state
    const docRes = await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
    });
    const docs = await docRes.json();
    if (!Array.isArray(docs) || docs.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];
    if (doc.mint_status === 'MINTED' && doc.nft_token_id) {
      return NextResponse.json({ error: 'Document already minted', code: 'DOCUMENT_ALREADY_MINTED' }, { status: 400 });
    }

    // Calculate gas cost
    const gasCostWei = gasUsed && gasPrice ? (BigInt(gasUsed) * BigInt(gasPrice)).toString() : '0';
    const gasCostEth = gasUsed && gasPrice
      ? (Number(BigInt(gasUsed) * BigInt(gasPrice)) / 1e18).toFixed(8)
      : '0';

    // Update document with NFT data
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        nft_contract_address: contractAddress,
        nft_token_id: tokenId.toString(),
        chain_id: chainId || parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337', 10),
        mint_tx_hash: transactionHash,
        mint_block_number: blockNumber || null,
        mint_gas_used: gasUsed?.toString() || null,
        mint_gas_price: gasPrice?.toString() || null,
        mint_status: 'MINTED',
        status: 'VERIFIED',
        owner_wallet: ownerWallet,
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Mint confirmation update error:', errText);
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    // Record blockchain transaction
    await fetch(`${supabaseUrl}/rest/v1/blockchain_transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tx_hash: transactionHash,
        block_number: blockNumber || null,
        from_address: ownerWallet,
        to_address: contractAddress,
        method_name: 'mintDocument',
        contract_name: 'DocumentNFT',
        status: 'CONFIRMED',
        gas_used: gasUsed ? parseInt(gasUsed, 10) : null,
        gas_price: gasPrice ? parseInt(gasPrice, 10) : null,
        related_profile_id: user.id,
        confirmed_at: new Date().toISOString(),
      }),
    }).catch((e) => console.error('TX record error:', e));

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
        actor_role: user.roles?.[0] || 'VIEWER',
        action: 'DOCUMENT_MINTED',
        resource_id: documentId,
        resource_type: 'DOCUMENT',
        result: 'SUCCESS',
        tx_hash: transactionHash,
        block_number: blockNumber,
        gas_fee_eth: parseFloat(gasCostEth),
        details: `Document NFT minted. Token #${tokenId} on ${contractAddress}. Owner: ${ownerWallet}`,
        metadata: {
          tokenId,
          contractAddress,
          chainId,
          gasUsed,
          gasPrice,
          gasCostEth,
        },
      }),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        document_id: doc.document_id,
        name: doc.name,
      },
      nft: {
        tokenId: tokenId.toString(),
        contractAddress,
        owner: ownerWallet,
      },
      transaction: {
        hash: transactionHash,
        blockNumber,
        chainId,
        gasUsed: gasUsed?.toString(),
        gasPrice: gasPrice?.toString(),
        gasCostWei,
        gasCostEth,
      },
      message: `Document NFT #${tokenId} minted successfully and assigned to ${ownerWallet}`,
    });

  } catch (error) {
    console.error('Mint confirmation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Mint confirmation failed' },
      { status: 500 }
    );
  }
}
