import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCredential } from '@/lib/verifiable-credentials';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const did = searchParams.get('did');

    if (!did) {
      return NextResponse.json(
        { error: 'DID is required' },
        { status: 400 }
      );
    }

    if (!did.startsWith('did:')) {
      return NextResponse.json(
        { error: 'Invalid DID format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Query credentials for this DID
    const { data: credentials, error } = await supabase
      .from('verifiable_credentials')
      .select('*')
      .eq('holder_did', did)
      .eq('revoked', false)
      .order('issuance_date', { ascending: false });

    if (error || !credentials || credentials.length === 0) {
      return NextResponse.json({
        verified: false,
        type: 'credential',
        data: { id: did },
        error: 'No verified credentials found for this DID',
      });
    }

    // Verify the first (most recent) credential
    const latestCredential = credentials[0];
    const isValid = await verifyCredential(latestCredential.credential_data);

    if (!isValid) {
      return NextResponse.json({
        verified: false,
        type: 'credential',
        data: { id: did },
        error: 'Credential signature verification failed',
      });
    }

    // Check expiration
    const now = new Date();
    const isExpired = latestCredential.expiration_date && 
                      new Date(latestCredential.expiration_date) < now;

    return NextResponse.json({
      verified: !isExpired,
      type: 'credential',
      data: {
        id: did,
        name: latestCredential.types.join(', '),
        owner: latestCredential.holder_did,
        status: isExpired ? 'EXPIRED' : 'ACTIVE',
        issuer: latestCredential.issuer_did,
        issuanceDate: latestCredential.issuance_date,
        expirationDate: latestCredential.expiration_date,
        timestamp: latestCredential.created_at,
      },
      onChainData: undefined, // VCs are off-chain by default
    });

  } catch (error) {
    console.error('Credential verification error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Verification failed'
      },
      { status: 500 }
    );
  }
}
