/**
 * Verifiable Credentials Service
 * W3C-compliant credential issuance, verification, and presentation
 */

import { createClient } from '@/lib/supabase/server';
import { ethers } from 'ethers';

export interface VerifiableCredential {
  id: string;
  credential_id: string;
  credential_type: string;
  subject_did: string;
  issuer_did: string;
  credential_subject: any;
  issuance_date: string;
  expiration_date?: string;
  status: string;
  revoked: boolean;
  credential_json: any;
}

export interface CredentialSchema {
  id: string;
  schema_id: string;
  schema_name: string;
  schema_type: string;
  schema_definition: any;
  required_claims: string[];
  optional_claims: string[];
}

/**
 * Issue a verifiable credential
 */
export async function issueCredential(params: {
  credentialType: string;
  schemaId: string;
  subjectDid: string;
  subjectProfileId: string;
  issuerDid: string;
  issuerProfileId: string;
  claims: any;
  expirationDays?: number;
  privateKey: string;
}): Promise<string> {
  const supabase = await createClient();
  
  // Generate credential ID
  const credentialId = `did:bel:credential/${ethers.hexlify(ethers.randomBytes(16)).slice(2)}`;
  
  // Calculate expiration
  const expirationDate = params.expirationDays
    ? new Date(Date.now() + params.expirationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  // Build W3C VC JSON
  const vcJson = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://bel-secure.example/context/v1',
    ],
    id: credentialId,
    type: ['VerifiableCredential', params.credentialType],
    issuer: params.issuerDid,
    issuanceDate: new Date().toISOString(),
    expirationDate: expirationDate,
    credentialSubject: {
      id: params.subjectDid,
      ...params.claims,
    },
  };
  
  // Sign credential
  const wallet = new ethers.Wallet(params.privateKey);
  const message = JSON.stringify(vcJson);
  const signature = await wallet.signMessage(message);
  
  // Add proof
  const vcWithProof = {
    ...vcJson,
    proof: {
      type: 'EthereumPersonalSignature2021',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${params.issuerDid}#key-1`,
      proofValue: signature,
    },
  };
  
  // Store in database
  const { data, error } = await supabase.rpc('issue_verifiable_credential', {
    p_credential_id: credentialId,
    p_credential_type: params.credentialType,
    p_schema_id: params.schemaId,
    p_subject_did: params.subjectDid,
    p_subject_profile_id: params.subjectProfileId,
    p_issuer_did: params.issuerDid,
    p_issuer_profile_id: params.issuerProfileId,
    p_credential_subject: params.claims,
    p_expiration_date: expirationDate,
    p_proof_type: 'EthereumPersonalSignature2021',
    p_proof_value: signature,
    p_credential_json: vcWithProof,
  });
  
  if (error) {
    throw new Error(`Failed to issue credential: ${error.message}`);
  }
  
  return data;
}

/**
 * Verify a credential
 */
export async function verifyCredential(
  credentialId: string,
  verifierProfileId: string
): Promise<{
  isValid: boolean;
  result: string;
  details: any;
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('verify_credential', {
    p_credential_id: credentialId,
    p_verifier_profile_id: verifierProfileId,
  });
  
  if (error) {
    throw new Error(`Failed to verify credential: ${error.message}`);
  }
  
  const result = data[0];
  
  return {
    isValid: result.is_valid,
    result: result.result,
    details: {
      signatureValid: result.signature_valid,
      issuerTrusted: result.issuer_trusted,
      notExpired: result.not_expired,
      notRevoked: result.not_revoked,
    },
  };
}

/**
 * Revoke a credential
 */
export async function revokeCredential(
  credentialId: string,
  revokedBy: string,
  reason: string
): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase.rpc('revoke_credential', {
    p_credential_id: credentialId,
    p_revoked_by: revokedBy,
    p_reason: reason,
  });
  
  if (error) {
    throw new Error(`Failed to revoke credential: ${error.message}`);
  }
}

/**
 * Get user's credentials
 */
export async function getUserCredentials(profileId: string): Promise<VerifiableCredential[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('verifiable_credentials')
    .select('*')
    .eq('subject_profile_id', profileId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to get credentials: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get credential schemas
 */
export async function getCredentialSchemas(): Promise<CredentialSchema[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('credential_schemas')
    .select('*')
    .eq('is_active', true)
    .order('schema_name', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to get schemas: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Request a credential
 */
export async function requestCredential(params: {
  credentialType: string;
  schemaId: string;
  requesterDid: string;
  requesterProfileId: string;
  issuerProfileId?: string;
  requestedClaims: any;
}): Promise<string> {
  const supabase = await createClient();
  
  const requestId = `req:${ethers.hexlify(ethers.randomBytes(8)).slice(2)}`;
  
  const { data, error } = await supabase
    .from('credential_requests')
    .insert({
      request_id: requestId,
      credential_type: params.credentialType,
      schema_id: params.schemaId,
      requester_did: params.requesterDid,
      requester_profile_id: params.requesterProfileId,
      issuer_profile_id: params.issuerProfileId,
      requested_claims: params.requestedClaims,
      status: 'PENDING',
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to request credential: ${error.message}`);
  }
  
  return data.id;
}
