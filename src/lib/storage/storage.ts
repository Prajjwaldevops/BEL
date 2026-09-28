/**
 * BEL SENTINEL — Storage Service
 * 
 * Provider-agnostic storage service.
 * Currently uses Cloudflare R2 — swap provider without changing business logic.
 */

import type { StorageProvider } from './types';
import { R2StorageProvider } from './r2';

let _provider: StorageProvider | null = null;

/**
 * Get the configured storage provider.
 * Returns R2 by default; designed for easy provider swapping.
 */
export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider;

  // Default to R2 — add conditional logic here for other providers
  _provider = new R2StorageProvider();
  return _provider;
}

/**
 * Check if storage is configured and operational.
 */
export function isStorageConfigured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}

/**
 * Generate a storage key for a document.
 * Format: documents/{year}/{month}/{documentId}/{filename}
 */
export function generateDocumentStorageKey(
  documentId: string,
  originalFilename: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  // Sanitize filename
  const safeName = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `documents/${year}/${month}/${documentId}/${safeName}`;
}

/**
 * Generate a storage key for NFT metadata.
 * Format: metadata/{documentId}/metadata.json
 */
export function generateMetadataStorageKey(documentId: string): string {
  return `metadata/${documentId}/metadata.json`;
}

export { R2StorageProvider } from './r2';
export type { StorageProvider, StorageUploadOptions, StorageUploadResult } from './types';
