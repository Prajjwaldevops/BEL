import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revokeCredential } from '@/lib/verifiable-credentials';

export async function POST(request: NextRequest) {
  try {
    const { credentialId, issuerDID, reason } = await request.json();

    if (!credentialId || !issuerDID) {
      return NextResponse.json(
        { error: 'Credential ID and issuer DID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the credential exists and belongs to the issuer
    const { data: credential, error: fetchError } = await supabase
      .from('verifiable_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('issuer_did', issuerDID)
      .single();

    if (fetchError || !credential) {
      return NextResponse.json(
        { error: 'Credential not found or unauthorized' },
        { status: 404 }
      );
    }

    if (credential.revoked) {
      return NextResponse.json(
        { error: 'Credential already revoked' },
        { status: 400 }
      );
    }

    // Create revocation proof
    const revocationProof = await revokeCredential(
      credentialId,
      issuerDID,
      reason
    );

    // Update database
    const { error: updateError } = await supabase
      .from('verifiable_credentials')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revocation_reason: reason,
        revocation_proof: revocationProof
      })
      .eq('id', credentialId);

    if (updateError) {
      console.error('Revocation update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to revoke credential' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      credentialId,
      revokedAt: new Date().toISOString(),
      revocationProof
    });

  } catch (error) {
    console.error('Credential revocation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
