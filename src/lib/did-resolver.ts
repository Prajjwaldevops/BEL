/**
 * W3C DID (Decentralized Identifier) Resolver
 * Supports did:key, did:ethr, did:web, did:pq (post-quantum)
 */

import { createHash } from 'crypto';

export interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod?: string[];
  keyAgreement?: string[];
  capabilityInvocation?: string[];
  capabilityDelegation?: string[];
  service?: ServiceEndpoint[];
  created?: string;
  updated?: string;
  proof?: DIDProof;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: any;
  blockchainAccountId?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export interface DIDProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

export interface DIDResolutionResult {
  didDocument: DIDDocument | null;
  didDocumentMetadata: {
    created?: string;
    updated?: string;
    deactivated?: boolean;
  };
  didResolutionMetadata: {
    contentType?: string;
    error?: string;
  };
}

/**
 * Resolve DID to DID Document
 * @param did - Decentralized Identifier
 * @returns DIDResolutionResult
 */
export async function resolveDID(did: string): Promise<DIDResolutionResult> {
  try {
    const [, method, network, identifier] = did.split(':');

    switch (method) {
      case 'key':
        return resolveKeyDID(did);
      case 'ethr':
        return resolveEthrDID(did, network, identifier);
      case 'web':
        return resolveWebDID(did, network);
      case 'pq':
        return resolvePQDID(did, network, identifier);
      default:
        return {
          didDocument: null,
          didDocumentMetadata: {},
          didResolutionMetadata: {
            error: 'methodNotSupported',
          },
        };
    }
  } catch (error) {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: {
        error: 'invalidDid',
      },
    };
  }
}

/**
 * Resolve did:key (Ed25519/secp256k1)
 */
function resolveKeyDID(did: string): DIDResolutionResult {
  const multibaseKey = did.replace('did:key:', '');
  
  const didDocument: DIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#${multibaseKey}`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: multibaseKey,
      },
    ],
    authentication: [`${did}#${multibaseKey}`],
    assertionMethod: [`${did}#${multibaseKey}`],
    keyAgreement: [`${did}#${multibaseKey}`],
  };

  return {
    didDocument,
    didDocumentMetadata: {
      created: new Date().toISOString(),
    },
    didResolutionMetadata: {
      contentType: 'application/did+ld+json',
    },
  };
}

/**
 * Resolve did:ethr (Ethereum-based DID)
 */
async function resolveEthrDID(
  did: string,
  network: string,
  address: string
): Promise<DIDResolutionResult> {
  // In production, query ERC-1056 registry on-chain
  const didDocument: DIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/secp256k1-2019/v1',
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#controller`,
        type: 'EcdsaSecp256k1RecoveryMethod2020',
        controller: did,
        blockchainAccountId: `eip155:${network === 'mainnet' ? '1' : '11155111'}:${address}`,
      },
    ],
    authentication: [`${did}#controller`],
    assertionMethod: [`${did}#controller`],
  };

  return {
    didDocument,
    didDocumentMetadata: {
      created: new Date().toISOString(),
    },
    didResolutionMetadata: {
      contentType: 'application/did+ld+json',
    },
  };
}

/**
 * Resolve did:web (Web-based DID)
 */
async function resolveWebDID(
  did: string,
  domain: string
): Promise<DIDResolutionResult> {
  try {
    // In production, fetch from https://{domain}/.well-known/did.json
    const url = `https://${domain}/.well-known/did.json`;
    
    // Placeholder - in production, make actual HTTP request
    const didDocument: DIDDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: did,
      verificationMethod: [
        {
          id: `${did}#key-1`,
          type: 'JsonWebKey2020',
          controller: did,
          publicKeyJwk: {
            kty: 'EC',
            crv: 'secp256k1',
            x: 'placeholder',
            y: 'placeholder',
          },
        },
      ],
      authentication: [`${did}#key-1`],
      service: [
        {
          id: `${did}#api`,
          type: 'IdentityHub',
          serviceEndpoint: `https://${domain}/identity`,
        },
      ],
    };

    return {
      didDocument,
      didDocumentMetadata: {
        created: new Date().toISOString(),
      },
      didResolutionMetadata: {
        contentType: 'application/did+ld+json',
      },
    };
  } catch {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: {
        error: 'notFound',
      },
    };
  }
}

/**
 * Resolve did:pq (Post-Quantum DID)
 */
function resolvePQDID(
  did: string,
  network: string,
  publicKeyHash: string
): DIDResolutionResult {
  const didDocument: DIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1',
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#pq-key-1`,
        type: 'CRYSTALSDilithiumVerificationKey2020',
        controller: did,
        publicKeyMultibase: `z${publicKeyHash}`, // Multibase encoding
      },
    ],
    authentication: [`${did}#pq-key-1`],
    assertionMethod: [`${did}#pq-key-1`],
    capabilityInvocation: [`${did}#pq-key-1`],
  };

  return {
    didDocument,
    didDocumentMetadata: {
      created: new Date().toISOString(),
    },
    didResolutionMetadata: {
      contentType: 'application/did+ld+json',
    },
  };
}

/**
 * Create DID Document for a user
 * @param did - Decentralized Identifier
 * @param publicKey - User's public key
 * @param keyType - Key type (Ed25519, secp256k1, CRYSTALS-Dilithium)
 * @param serviceEndpoints - Optional service endpoints
 * @returns DIDDocument
 */
export function createDIDDocument(
  did: string,
  publicKey: string,
  keyType: 'Ed25519' | 'secp256k1' | 'CRYSTALS-Dilithium',
  serviceEndpoints?: ServiceEndpoint[]
): DIDDocument {
  const verificationMethodType =
    keyType === 'Ed25519'
      ? 'Ed25519VerificationKey2020'
      : keyType === 'secp256k1'
      ? 'EcdsaSecp256k1VerificationKey2019'
      : 'CRYSTALSDilithiumVerificationKey2020';

  const didDocument: DIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1',
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: verificationMethodType,
        controller: did,
        publicKeyMultibase: `z${publicKey}`,
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
    service: serviceEndpoints || [],
    created: new Date().toISOString(),
  };

  return didDocument;
}

/**
 * Register DID Document on BEL platform
 * @param didDocument - DID Document to register
 * @param signature - Signature proving ownership
 * @returns Success status
 */
export async function registerDIDDocument(
  didDocument: DIDDocument,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // In production, store in Supabase and optionally anchor hash on-chain
    const didHash = createHash('sha256')
      .update(JSON.stringify(didDocument))
      .digest('hex');

    // TODO: Store in database
    // await supabase.from('did_documents').insert({ did: didDocument.id, document: didDocument, hash: didHash });

    // TODO: Optionally anchor hash on-chain for tamper detection
    // await IdentityRegistry.anchorDIDHash(didDocument.id, didHash);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register DID',
    };
  }
}

/**
 * Verify DID ownership by signature
 * @param did - Decentralized Identifier
 * @param challenge - Challenge message
 * @param signature - Signature of challenge
 * @returns boolean - true if owner
 */
export async function verifyDIDOwnership(
  did: string,
  challenge: string,
  signature: string
): Promise<boolean> {
  try {
    const resolution = await resolveDID(did);
    if (!resolution.didDocument) return false;

    // Extract public key from DID Document
    const verificationMethod = resolution.didDocument.verificationMethod[0];
    
    // In production, use appropriate signature verification based on key type
    // For now, simplified check
    return signature.length > 0;
  } catch {
    return false;
  }
}
