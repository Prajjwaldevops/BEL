/**
 * BEL SENTINEL — AES-256-GCM Document Encryption
 * 
 * Provides authenticated encryption for confidential documents.
 * Uses environment-backed master key for MVP.
 * Designed so KMS/HSM can replace the key source later.
 * 
 * SECURITY:
 * - AES-256-GCM provides both confidentiality and integrity
 * - Random IV per encryption (never reused)
 * - Authentication tag prevents tampering
 * - Master key loaded from env, never from DB or client
 */

import crypto from 'crypto';
import type { EncryptionResult, DecryptionInput, EncryptionProvider } from './types';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_ID = 'bel-master-v1'; // Identifier for the current key

/**
 * Derive the encryption key from the environment.
 * In production, replace this with KMS.getKey(keyId).
 */
function getEncryptionKey(): Buffer {
  const masterKey = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error(
      'DOCUMENT_ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Key must be exactly 32 bytes (64 hex chars) for AES-256
  const keyBuffer = Buffer.from(masterKey, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error(
      `DOCUMENT_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got ${keyBuffer.length} bytes.`
    );
  }

  return keyBuffer;
}

/**
 * Encrypt document data using AES-256-GCM.
 */
export async function encryptDocument(data: Buffer): Promise<EncryptionResult> {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv,
    authTag,
    algorithm: ALGORITHM,
    keyId: KEY_ID,
  };
}

/**
 * Decrypt document data using AES-256-GCM.
 */
export async function decryptDocument(input: DecryptionInput): Promise<Buffer> {
  if (input.keyId !== KEY_ID) {
    throw new Error(
      `Unknown encryption key ID: ${input.keyId}. ` +
      `This document was encrypted with a different key version.`
    );
  }

  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, input.iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(input.authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(input.encryptedData),
      decipher.final(),
    ]);
    return decrypted;
  } catch (error) {
    throw new Error(
      'Decryption failed: document may have been tampered with or wrong key used.'
    );
  }
}

/**
 * EncryptionProvider implementation for the storage abstraction.
 */
export class AES256GCMProvider implements EncryptionProvider {
  async encrypt(data: Buffer): Promise<EncryptionResult> {
    return encryptDocument(data);
  }

  async decrypt(input: DecryptionInput): Promise<Buffer> {
    return decryptDocument(input);
  }
}
