import { NextRequest, NextResponse } from 'next/server';
import { verifyCredential } from '@/lib/verifiable-credentials';
import { resolveDID } from '@/lib/did-resolver';

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential is required' },
        { status: 400 }
      );
    }

    // Verify the credential signature
    const isValid = await verifyCredential(credential);

    if (!isValid) {
      return NextResponse.json(
        { 
          verified: false,
          error: 'Invalid credential signature'
        },
        { status: 400 }
      );
    }

    // Resolve issuer DID
    const issuerDoc = await resolveDID(credential.issuer);
    
    // Check expiration
    const isExpired = credential.expirationDate && 
                      new Date(credential.expirationDate) < new Date();

    // Check revocation status (TODO: implement revocation registry)
    const isRevoked = false; // Placeholder

    return NextResponse.json({
      verified: true,
      valid: !isExpired && !isRevoked,
      checks: {
        signatureValid: isValid,
        expired: isExpired,
        revoked: isRevoked,
        issuerResolved: !!issuerDoc
      },
      credential: {
        id: credential.id,
        type: credential.type,
        issuer: credential.issuer,
        subject: credential.credentialSubject.id,
        issuanceDate: credential.issuanceDate,
        expirationDate: credential.expirationDate
      }
    });

  } catch (error) {
    console.error('Credential verification error:', error);
    return NextResponse.json(
      { 
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      },
      { status: 500 }
    );
  }
}
