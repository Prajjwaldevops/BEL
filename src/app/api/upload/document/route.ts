import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ethers } from 'ethers';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const classification = formData.get('classification') as string || 'UNCLASSIFIED';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Document name is required' },
        { status: 400 }
      );
    }

    // Get current user from session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compute content hash (SHA-256)
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const contentHashWithPrefix = `0x${contentHash}`;

    // Upload to Pinata (IPFS)
    let ipfsCID = '';
    let pinataUrl = '';

    if (process.env.PINATA_JWT) {
      const pinataFormData = new FormData();
      pinataFormData.append('file', new Blob([buffer]), file.name);

      const metadata = JSON.stringify({
        name: name,
        keyvalues: {
          uploadedBy: user.id,
          classification: classification,
          timestamp: new Date().toISOString(),
        },
      });
      pinataFormData.append('pinataMetadata', metadata);

      const pinataOptions = JSON.stringify({
        cidVersion: 1,
      });
      pinataFormData.append('pinataOptions', pinataOptions);

      const pinataResponse = await fetch(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.PINATA_JWT}`,
          },
          body: pinataFormData,
        }
      );

      if (!pinataResponse.ok) {
        throw new Error('Failed to upload to IPFS');
      }

      const pinataData = await pinataResponse.json();
      ipfsCID = pinataData.IpfsHash;
      pinataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCID}`;
    } else {
      // Fallback: simulate IPFS CID for testing
      ipfsCID = `Qm${contentHash.substring(0, 44)}`;
      pinataUrl = `https://ipfs.io/ipfs/${ipfsCID}`;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Create metadata object
    const metadata = {
      name,
      description,
      classification,
      fileSize: buffer.length,
      mimeType: file.type,
      originalName: file.name,
      uploadedBy: profile.id,
      uploadedAt: new Date().toISOString(),
    };

    // Compute metadata hash
    const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
    const metadataHash = crypto.createHash('sha256').update(metadataString).digest('hex');
    const metadataHashWithPrefix = `0x${metadataHash}`;

    // Store document in database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name,
        description,
        ipfs_hash: ipfsCID,
        ipfs_url: pinataUrl,
        file_size: buffer.length,
        mime_type: file.type,
        classification,
        uploaded_by: profile.id,
        content_hash: contentHashWithPrefix,
        metadata_hash: metadataHashWithPrefix,
        metadata: metadata,
      })
      .select()
      .single();

    if (docError) {
      console.error('Database error:', docError);
      return NextResponse.json(
        { error: 'Failed to store document metadata' },
        { status: 500 }
      );
    }

    // Anchor to blockchain (if configured)
    let txHash = '';
    let blockNumber = 0;
    let network = 'localhost';

    try {
      if (process.env.NEXT_PUBLIC_RPC_URL && process.env.ADMIN_WALLET_PRIVATE_KEY) {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const wallet = new ethers.Wallet(process.env.ADMIN_WALLET_PRIVATE_KEY, provider);

        // Get AuditRegistry contract address
        const auditRegistryAddress = process.env.NEXT_PUBLIC_AUDIT_REGISTRY_ADDRESS;

        if (auditRegistryAddress) {
          const auditRegistry = new ethers.Contract(
            auditRegistryAddress,
            ['function recordLog(bytes32 contentHash, string memory logType) public returns (uint256)'],
            wallet
          );

          const tx = await auditRegistry.recordLog(
            metadataHashWithPrefix,
            'DOCUMENT_UPLOAD'
          );

          const receipt = await tx.wait();
          txHash = receipt.hash;
          blockNumber = receipt.blockNumber;
          network = process.env.NEXT_PUBLIC_CHAIN_ID === '31337' ? 'localhost' : 'sepolia';

          // Store transaction
          await supabase.from('blockchain_transactions').insert({
            tx_hash: txHash,
            resource_type: 'DOCUMENT',
            resource_id: document.id,
            wallet_address: wallet.address,
            gas_fee_eth: ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
            status: 'CONFIRMED',
            metadata_hash: metadataHashWithPrefix,
          });
        }
      }
    } catch (error) {
      console.error('Blockchain anchoring error:', error);
      // Continue without blockchain anchoring
    }

    // Generate verification URL
    const verificationUrl = `${request.nextUrl.origin}/verify?cid=${ipfsCID}`;

    // Return proof receipt
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        ipfsCID,
        ipfsUrl: pinataUrl,
        contentHash: contentHashWithPrefix,
        metadataHash: metadataHashWithPrefix,
        fileSize: buffer.length,
        mimeType: file.type,
        classification,
        uploadedAt: document.created_at,
      },
      proof: {
        txHash: txHash || null,
        blockNumber: blockNumber || null,
        network: network,
        verificationUrl,
        anchored: !!txHash,
      },
      message: txHash 
        ? 'Document uploaded, hashed, and anchored to blockchain'
        : 'Document uploaded and hashed (blockchain anchoring pending)',
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Upload failed'
      },
      { status: 500 }
    );
  }
}
