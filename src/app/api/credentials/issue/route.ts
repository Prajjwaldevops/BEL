import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { issueCredential, issueClearanceCredential, issueRoleCredential } from '@/lib/verifiable-credentials';
import { generatePQKeyPair } from '@/lib/post-quantum-crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issuerDID, subjectDID, credentialType, claims, expirationDays } = body;

    // Verify issuer is ADMIN
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, verify JWT and check role
    // For now, simplified check
    
    // Get or generate issuer's PQ key pair
    let issuerKeys;
    const { data: existingKeys } = await supabase
      .from('pq_keys')
      .select('private_key, public_key')
      .eq('user_did', issuerDID)
      .single();

    if (existingKeys) {
      issuerKeys = existingKeys;
    } else {
      // Generate new PQ key pair
      const keyPair = generatePQKeyPair();
      issuerKeys = {
        private_key: keyPair.privateKey,
        public_key: keyPair.publicKey,
      };

      // Store in database
      await supabase.from('pq_keys').insert({
        user_did: issuerDID,
        public_key: keyPair.publicKey,
        private_key: keyPair.privateKey, // In production, encrypt this!
        algorithm: keyPair.algorithm,
        key_size: keyPair.keySize,
        created_at: new Date().toISOString(),
      });
    }

    let credential;

    switch (credentialType) {
      case 'SecurityClearanceCredential':
        credential = issueClearanceCredential(
          issuerDID,
          subjectDID,
          claims.clearanceLevel,
          claims.department,
          issuerKeys.private_key
        );
        break;

      case 'RoleCredential':
        credential = issueRoleCredential(
          issuerDID,
          subjectDID,
          claims.role,
          claims.permissions,
          issuerKeys.private_key
        );
        break;

      default:
        credential = issueCredential(
          issuerDID,
          subjectDID,
          credentialType,
          claims,
          issuerKeys.private_key,
          expirationDays
        );
    }

    // Store credential in database
    await supabase.from('verifiable_credentials').insert({
      credential_id: credential.id,
      issuer: issuerDID,
      subject: subjectDID,
      type: credentialType,
      credential_data: credential,
      issued_at: credential.issuanceDate,
      expires_at: credential.expirationDate,
      revoked: false,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: issuerDID,
      action: 'CREDENTIAL_ISSUED',
      resource_type: 'CREDENTIAL',
      resource_id: credential.id,
      metadata: { credentialType, subjectDID },
      ip_address: request.ip,
    });

    return NextResponse.json({
      success: true,
      credential,
    });

  } catch (error) {
    console.error('Credential issuance error:', error);
    return NextResponse.json(
      { error: 'Failed to issue credential' },
      { status: 500 }
    );
  }
}
