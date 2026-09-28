/**
 * BEL SENTINEL — Storage Abstraction Types
 * Provider-agnostic interfaces for document storage operations.
 * Supports Cloudflare R2, S3-compatible stores, and future providers.
 */

export interface StorageUploadOptions {
  /** Unique storage key (path) for the object */
  key: string;
  /** Raw bytes to store */
  data: Buffer;
  /** MIME content type */
  contentType: string;
  /** Optional metadata key-value pairs */
  metadata?: Record<string, string>;
  /** Optional content disposition */
  contentDisposition?: string;
}

export interface StorageUploadResult {
  /** Storage provider name */
  provider: string;
  /** Object key in storage */
  key: string;
  /** Object version ID if versioning enabled */
  versionId?: string;
  /** ETag of the uploaded object */
  etag?: string;
  /** Size in bytes */
  size: number;
  /** Upload timestamp */
  uploadedAt: string;
}

export interface StorageDownloadResult {
  /** Raw bytes */
  data: Buffer;
  /** MIME content type */
  contentType: string;
  /** Object metadata */
  metadata?: Record<string, string>;
  /** Content length in bytes */
  contentLength: number;
  /** Last modified timestamp */
  lastModified?: string;
  /** ETag */
  etag?: string;
}

export interface StorageObjectMetadata {
  /** Object key */
  key: string;
  /** Size in bytes */
  size: number;
  /** MIME content type */
  contentType: string;
  /** Last modified timestamp */
  lastModified: string;
  /** ETag */
  etag?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

export interface SignedUrlOptions {
  /** Object key */
  key: string;
  /** URL expiration in seconds (default: 3600 = 1 hour) */
  expiresInSeconds?: number;
  /** Content disposition override */
  contentDisposition?: string;
}

export interface StorageProvider {
  /** Provider identifier */
  readonly name: string;

  /** Upload an object to storage */
  upload(options: StorageUploadOptions): Promise<StorageUploadResult>;

  /** Download an object from storage */
  download(key: string): Promise<StorageDownloadResult>;

  /** Delete an object from storage */
  delete(key: string): Promise<void>;

  /** Check if an object exists */
  exists(key: string): Promise<boolean>;

  /** Get object metadata without downloading */
  getMetadata(key: string): Promise<StorageObjectMetadata>;

  /** Generate a short-lived signed URL for private access */
  getSignedUrl(options: SignedUrlOptions): Promise<string>;
}

// ===== Encryption Types =====

export interface EncryptionResult {
  /** Encrypted data bytes */
  encryptedData: Buffer;
  /** Initialization vector (nonce) */
  iv: Buffer;
  /** Authentication tag for GCM */
  authTag: Buffer;
  /** Encryption algorithm used */
  algorithm: string;
  /** Key identifier (NOT the key itself) */
  keyId: string;
}

export interface DecryptionInput {
  /** Encrypted data bytes */
  encryptedData: Buffer;
  /** Initialization vector used during encryption */
  iv: Buffer;
  /** Authentication tag */
  authTag: Buffer;
  /** Key identifier to look up the key */
  keyId: string;
}

export interface EncryptionProvider {
  /** Encrypt raw data */
  encrypt(data: Buffer): Promise<EncryptionResult>;
  /** Decrypt encrypted data */
  decrypt(input: DecryptionInput): Promise<Buffer>;
}
