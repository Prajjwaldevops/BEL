/**
 * W3C Verifiable Credentials Module
 * Issue, verify, and manage verifiable credentials
 */

import { createHash, randomBytes } from 'crypto';
import { pqSign, pqVerify } from './post-quantum-crypto';

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string | { id: string; name: string };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: any;
  };
  proof?: CredentialProof;
}

export interface CredentialProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

export interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof?: CredentialProof;
}

export interface CredentialSchema {
  id: string;
  type: string;
}

export interface CredentialStatus {
  id: string;
  type: string;
  revocationListIndex?: string;
  revocationListCredential?: string;
}

/**
 * Issue a verifiable credential
 * @param issuerDID - Issuer's DID
 * @param subjectDID - Subject's DID
 * @param credentialType - Type of credential
 * @param claims - Claims to include
 * @param privateKey - Issuer's private key for signing
 * @param expirationDays - Days until expiration (optional)
 * @returns VerifiableCredential
 */
export function issueCredential(
  issuerDID: string,
  subjectDID: string,
  credentialType: string,
  claims: Record<string, any>,
  privateKey: string,
  expirationDays?: number
): VerifiableCredential {
  const credentialId = `urn:uuid:${randomBytes(16).toString('hex')}`;
  const issuanceDate = new Date().toISOString();
  const expirationDate = expirationDays
    ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const credential: VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1',
    ],
    id: credentialId,
    type: ['VerifiableCredential', credentialType],
    issuer: issuerDID,
    issuanceDate,
    expirationDate,
    credentialSubject: {
      id: subjectDID,
      ...claims,
    },
  };

  // Sign credential
  const credentialHash = createHash('sha256')
    .update(JSON.stringify(credential))
    .digest('hex');

  const signature = pqSign(credentialHash, privateKey);

  credential.proof = {
    type: 'CRYSTALSDilithiumSignature2020',
    created: new Date().toISOString(),
    verificationMethod: `${issuerDID}#pq-key-1`,
    proofPurpose: 'assertionMethod',
    proofValue: signature.signature,
  };

  return credential;
}

/**
 * Verify a verifiable credential
 * @param credential - Verifiable Credential to verify
 * @param issuerPublicKey - Issuer's public key
 * @returns {valid, error}
 */
export function verifyCredential(
  credential: VerifiableCredential,
  issuerPublicKey: string
): { valid: boolean; error?: string } {
  try {
    // Check expiration
    if (credential.expirationDate) {
      const expiration = new Date(credential.expirationDate);
      if (expiration < new Date()) {
        return { valid: false, error: 'Credential expired' };
      }
    }

    // Verify proof exists
    if (!credential.proof) {
      return { valid: false, error: 'No proof found' };
    }

    // Extract credential without proof
    const { proof, ...credentialWithoutProof } = credential;
    const credentialHash = createHash('sha256')
      .update(JSON.stringify(credentialWithoutProof))
      .digest('hex');

    // Verify signature
    const signatureObj = {
      signature: proof.proofValue,
      algorithm: 'CRYSTALS-Dilithium',
      timestamp: new Date(proof.created).getTime(),
      nonce: '',
    };

    const isValid = pqVerify(credentialHash, signatureObj, issuerPublicKey);

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Create a verifiable presentation (selective disclosure)
 * @param holderDID - Holder's DID
 * @param credentials - Array of credentials to present
 * @param privateKey - Holder's private key
 * @param challenge - Optional challenge from verifier
 * @param domain - Optional domain of verifier
 * @returns VerifiablePresentation
 */
export function createPresentation(
  holderDID: string,
  credentials: VerifiableCredential[],
  privateKey: string,
  challenge?: string,
  domain?: string
): VerifiablePresentation {
  const presentation: VerifiablePresentation = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1',
    ],
    type: ['VerifiablePresentation'],
    holder: holderDID,
    verifiableCredential: credentials,
  };

  // Sign presentation
  const presentationData = JSON.stringify({
    ...presentation,
    challenge: challenge || '',
    domain: domain || '',
  });

  const presentationHash = createHash('sha256').update(presentationData).digest('hex');
  const signature = pqSign(presentationHash, privateKey);

  presentation.proof = {
    type: 'CRYSTALSDilithiumSignature2020',
    created: new Date().toISOString(),
    verificationMethod: `${holderDID}#pq-key-1`,
    proofPurpose: 'authentication',
    proofValue: signature.signature,
  };

  return presentation;
}

/**
 * Verify a verifiable presentation
 * @param presentation - Verifiable Presentation
 * @param holderPublicKey - Holder's public key
 * @param challenge - Expected challenge (if any)
 * @param domain - Expected domain (if any)
 * @returns {valid, error}
 */
export function verifyPresentation(
  presentation: VerifiablePresentation,
  holderPublicKey: string,
  challenge?: string,
  domain?: string
): { valid: boolean; error?: string } {
  try {
    if (!presentation.proof) {
      return { valid: false, error: 'No proof found' };
    }

    // Extract presentation without proof
    const { proof, ...presentationWithoutProof } = presentation;
    const presentationData = JSON.stringify({
      ...presentationWithoutProof,
      challenge: challenge || '',
      domain: domain || '',
    });

    const presentationHash = createHash('sha256').update(presentationData).digest('hex');

    const signatureObj = {
      signature: proof.proofValue,
      algorithm: 'CRYSTALS-Dilithium',
      timestamp: new Date(proof.created).getTime(),
      nonce: '',
    };

    const isValid = pqVerify(presentationHash, signatureObj, holderPublicKey);

    if (!isValid) {
      return { valid: false, error: 'Invalid presentation signature' };
    }

    // Verify all credentials in the presentation
    // In production, fetch issuer public keys and verify each credential
    for (const credential of presentation.verifiableCredential) {
      if (!credential.proof) {
        return { valid: false, error: 'Credential missing proof' };
      }
      // Additional verification would happen here
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Revoke a credential
 * @param credentialId - Credential ID to revoke
 * @param issuerDID - Issuer's DID
 * @param reason - Revocation reason
 * @returns Success status
 */
export async function revokeCredential(
  credentialId: string,
  issuerDID: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // In production, add to revocation list or update status on-chain
    const revocationEntry = {
      credentialId,
      issuerDID,
      revokedAt: new Date().toISOString(),
      reason,
    };

    // TODO: Store in revocation list
    // await supabase.from('credential_revocations').insert(revocationEntry);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Revocation failed',
    };
  }
}

/**
 * Check if credential is revoked
 * @param credentialId - Credential ID
 * @returns boolean - true if revoked
 */
export async function isCredentialRevoked(credentialId: string): Promise<boolean> {
  try {
    // In production, check revocation list
    // const { data } = await supabase
    //   .from('credential_revocations')
    //   .select('*')
    //   .eq('credentialId', credentialId)
    //   .single();
    
    // return !!data;
    return false; // Placeholder
  } catch {
    return false;
  }
}

/**
 * Create clearance credential
 * @param issuerDID - Issuer's DID (ADMIN)
 * @param subjectDID - Subject's DID
 * @param clearanceLevel - Clearance level (CONFIDENTIAL, SECRET, TOP_SECRET)
 * @param department - Department
 * @param privateKey - Issuer's private key
 * @returns VerifiableCredential
 */
export function issueClearanceCredential(
  issuerDID: string,
  subjectDID: string,
  clearanceLevel: 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET',
  department: string,
  privateKey: string
): VerifiableCredential {
  return issueCredential(
    issuerDID,
    subjectDID,
    'SecurityClearanceCredential',
    {
      clearanceLevel,
      department,
      grantedDate: new Date().toISOString(),
    },
    privateKey,
    365 // Valid for 1 year
  );
}

/**
 * Create role credential
 * @param issuerDID - Issuer's DID
 * @param subjectDID - Subject's DID
 * @param role - Role (ADMIN, VIEWER, ALTER, DEBUGGER)
 * @param permissions - Array of permissions
 * @param privateKey - Issuer's private key
 * @returns VerifiableCredential
 */
export function issueRoleCredential(
  issuerDID: string,
  subjectDID: string,
  role: 'ADMIN' | 'VIEWER' | 'ALTER' | 'DEBUGGER',
  permissions: string[],
  privateKey: string
): VerifiableCredential {
  return issueCredential(
    issuerDID,
    subjectDID,
    'RoleCredential',
    {
      role,
      permissions,
      assignedAt: new Date().toISOString(),
    },
    privateKey,
    90 // Valid for 90 days
  );
}
