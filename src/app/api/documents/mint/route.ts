/**
 * BEL SENTINEL — Document Mint API (Server-Side)
 *
 * POST /api/documents/mint
 *
 * Mints a Document NFT using the server's admin wallet (MINTER_ROLE).
 * The NFT is assigned TO the user's verified wallet address.
 *
 * Flow:
 * 1. Authenticate user
 * 2. Verify document exists and is in STORED status
 * 3. Build NFT metadata JSON
 * 4. Upload metadata to storage (R2 or Pinata if configured)
 * 5. Mint NFT on-chain via admin wallet
 * 6. Update database with on-chain data
 * 7. Write audit log
 * 8. Return transaction receipt
 *
 * The user does NOT sign the transaction — the admin wallet
 * executes it with MINTER_ROLE and assigns ownership to the user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { mintDocumentNFT } from '@/lib/services/nft-service';
import {
  buildNFTMetadata,
  getDocumentById,
  updateDocumentStatus,
  writeAuditLog,
} from '@/lib/services/document-service';
import {
  getStorageProvider,
  generateMetadataStorageKey,
  isStorageConfigured,
} from '@/lib/storage/storage';
import { getExplorerTxUrl, getNetworkName, getChainId } from '@/lib/contracts/document-nft';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, recipientWallet } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    // Determine recipient wallet
    const wallet = recipientWallet || user.walletAddress;
    if (!wallet) {
      return NextResponse.json(
        { error: 'No wallet address. Connect a wallet or provide recipientWallet.' },
        { status: 400 }
      );
    }

    // 2. Verify document exists and is in STORED/PENDING_MINT state
    const doc = await getDocumentById(documentId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const mintStatus = doc.mint_status as string;
    if (mintStatus === 'MINTED' && doc.nft_token_id) {
      return NextResponse.json(
        { error: 'Document already minted', code: 'DOCUMENT_ALREADY_MINTED' },
        { status: 400 }
      );
    }

    if (!['STORED', 'PENDING_MINT', 'FAILED'].includes(mintStatus)) {
      return NextResponse.json(
        { error: `Cannot mint document in ${mintStatus} state` },
        { status: 400 }
      );
    }

    // Permission check: only owner, admin, or uploader can mint
    const isOwner = user.walletAddress && user.walletAddress.toLowerCase() === (doc.owner_wallet as string || '').toLowerCase();
    const isUploader = user.id === doc.uploaded_by;
    const isAdmin = user.roles?.includes('ADMIN');
    if (!isOwner && !isUploader && !isAdmin) {
      return NextResponse.json({ error: 'You do not have permission to mint this document' }, { status: 403 });
    }

    // 3. Update status to PENDING_MINT
    await updateDocumentStatus(documentId, { mint_status: 'PENDING_MINT' });

    // 4. Build NFT metadata
    const nftMetadata = buildNFTMetadata({
      documentId: doc.document_id as string,
      name: doc.name as string,
      contentHash: doc.content_hash as string,
      metadataHash: doc.metadata_hash as string || doc.content_hash as string,
      mimeType: doc.mime_type as string,
      fileSize: doc.file_size as number,
      classification: (doc.classification as string || 'UNCLASSIFIED') as any,
      version: doc.version as number || 1,
      transferable: doc.transferable as boolean,
      issuedAt: doc.issued_at as string || doc.created_at as string,
      expiresAt: doc.expires_at as string || undefined,
    });

    // 5. Upload metadata to storage
    let tokenURI: string;

    if (process.env.PINATA_JWT) {
      try {
        const { PinataStorageProvider } = require('@/lib/storage/pinata');
        const provider = new PinataStorageProvider();
        const metaKey = generateMetadataStorageKey(doc.document_id as string || documentId);
        const metaBuffer = Buffer.from(JSON.stringify(nftMetadata, null, 2));

        const result = await provider.upload({
          key: metaKey,
          data: metaBuffer,
          contentType: 'application/json',
          metadata: {
            'x-bel-document-id': documentId,
            'x-bel-type': 'nft-metadata',
          },
        });

        // Pinata returns the CID as the key, prefix it with ipfs://
        tokenURI = `ipfs://${result.key}`;
      } catch (pinataErr) {
        console.error('Pinata metadata storage error:', pinataErr);
        await updateDocumentStatus(documentId, { mint_status: 'STORED' }); // Rollback
        return NextResponse.json(
          { error: 'Failed to store NFT metadata on IPFS. Storage service unavailable.' },
          { status: 503 }
        );
      }
    } else if (isStorageConfigured()) {
      try {
        const provider = getStorageProvider();
        const metaKey = generateMetadataStorageKey(doc.document_id as string || documentId);
        const metaBuffer = Buffer.from(JSON.stringify(nftMetadata, null, 2));

        const result = await provider.upload({
          key: metaKey,
          data: metaBuffer,
          contentType: 'application/json',
          metadata: {
            'x-bel-document-id': documentId,
            'x-bel-type': 'nft-metadata',
          },
        });

        // Use signed URL as token URI (or construct a direct URL)
        const signedUrl = await provider.getSignedUrl({ key: metaKey, expiresInSeconds: 31536000 }); // 1 year
        tokenURI = signedUrl;
      } catch (storageErr) {
        console.error('Metadata storage error:', storageErr);
        await updateDocumentStatus(documentId, { mint_status: 'STORED' }); // Rollback
        return NextResponse.json(
          { error: 'Failed to store NFT metadata. Storage service unavailable.' },
          { status: 503 }
        );
      }
    } else {
      // Fallback: Use a data URI with the metadata (not ideal for production)
      // Production should have Pinata or R2 configured
      tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(nftMetadata)).toString('base64')}`;
    }

    // 6. Update status to MINTING
    await updateDocumentStatus(documentId, { mint_status: 'MINTING' });

    // 7. Mint on-chain
    let mintResult;
    try {
      mintResult = await mintDocumentNFT({
        recipientWallet: wallet,
        contentHash: doc.content_hash as string,
        metadataHash: doc.metadata_hash as string || doc.content_hash as string,
        tokenURI,
        transferable: doc.transferable as boolean ?? true,
        expiresAt: doc.expires_at ? Math.floor(new Date(doc.expires_at as string).getTime() / 1000) : 0,
      });
    } catch (mintErr) {
      console.error('Mint error:', mintErr);
      await updateDocumentStatus(documentId, { mint_status: 'FAILED' });
      return NextResponse.json(
        { error: `Mint transaction failed: ${mintErr instanceof Error ? mintErr.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // 8. Update database with on-chain data
    await updateDocumentStatus(documentId, {
      nft_contract_address: mintResult.contractAddress,
      nft_token_id: mintResult.tokenId,
      chain_id: mintResult.chainId,
      mint_tx_hash: mintResult.transactionHash,
      mint_block_number: mintResult.blockNumber,
      mint_gas_used: mintResult.gasUsed,
      mint_gas_price: mintResult.gasPrice,
      mint_status: 'MINTED',
      status: 'VERIFIED',
      owner_wallet: wallet,
    });

    // Record blockchain transaction
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      fetch(`${supabaseUrl}/rest/v1/blockchain_transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tx_hash: mintResult.transactionHash,
          block_number: mintResult.blockNumber,
          from_address: wallet,
          to_address: mintResult.contractAddress,
          method_name: 'mintDocument',
          contract_name: 'DocumentNFT',
          status: 'CONFIRMED',
          gas_used: parseInt(mintResult.gasUsed, 10) || null,
          gas_price: parseInt(mintResult.gasPrice, 10) || null,
          related_profile_id: user.id,
          confirmed_at: new Date().toISOString(),
        }),
      }).catch((e) => console.error('TX record error:', e));
    }

    // 9. Write audit log
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.roles?.[0] || 'VIEWER',
      action: 'DOCUMENT_MINTED',
      resourceId: documentId,
      resourceType: 'DOCUMENT',
      result: 'SUCCESS',
      txHash: mintResult.transactionHash,
      blockNumber: mintResult.blockNumber,
      gasFeeEth: parseFloat(mintResult.gasCostEth),
      details: `Document NFT #${mintResult.tokenId} minted. Owner: ${wallet}`,
      metadata: {
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress,
        chainId: mintResult.chainId,
        gasUsed: mintResult.gasUsed,
        gasCostEth: mintResult.gasCostEth,
      },
    });

    // 10. Return receipt
    const explorerUrl = getExplorerTxUrl(mintResult.transactionHash) || undefined;

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        document_id: doc.document_id,
        name: doc.name,
      },
      nft: {
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress,
        owner: wallet,
      },
      transaction: {
        hash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        chainId: mintResult.chainId,
        network: getNetworkName(mintResult.chainId),
        gasUsed: mintResult.gasUsed,
        gasPrice: mintResult.gasPrice,
        gasCostEth: mintResult.gasCostEth,
        explorerUrl,
      },
      message: `Document NFT #${mintResult.tokenId} minted and assigned to ${wallet}`,
    });

  } catch (error) {
    console.error('Mint API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Mint operation failed' },
      { status: 500 }
    );
  }
}
