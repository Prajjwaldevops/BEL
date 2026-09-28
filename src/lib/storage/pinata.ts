/**
 * BEL SENTINEL — Pinata IPFS Storage Provider
 * 
 * Implements the StorageProvider interface for Pinata.
 * Used for decentralized storage of document metadata.
 */

import type { 
  StorageProvider, 
  StorageUploadOptions, 
  StorageUploadResult, 
  StorageDownloadResult, 
  StorageObjectMetadata, 
  SignedUrlOptions 
} from './types';

export class PinataStorageProvider implements StorageProvider {
  readonly name = 'pinata';
  private readonly jwt: string;

  constructor() {
    this.jwt = process.env.PINATA_JWT || '';
  }

  private isConfigured(): boolean {
    return !!this.jwt;
  }

  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    if (!this.isConfigured()) {
      throw new Error('Pinata JWT not configured');
    }

    const formData = new FormData();
    const blob = new Blob([options.data], { type: options.contentType });
    
    // We append the file itself
    formData.append('file', blob, options.key.split('/').pop() || 'file');

    // Pinata metadata
    const pinataMetadata = JSON.stringify({
      name: options.key,
      keyvalues: options.metadata || {}
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 1
    });
    formData.append('pinataOptions', pinataOptions);

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.jwt}`
      },
      body: formData
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pinata upload failed: ${res.statusText} - ${text}`);
    }

    const data = await res.json();

    return {
      provider: this.name,
      key: data.IpfsHash,
      size: data.PinSize || options.data.length,
      uploadedAt: data.Timestamp || new Date().toISOString(),
    };
  }

  async download(key: string): Promise<StorageDownloadResult> {
    throw new Error('Not implemented: Use public IPFS gateway to download CIDs directly');
  }

  async delete(key: string): Promise<void> {
    if (!this.isConfigured()) return;
    
    // Pinata unpin API
    const res = await fetch(`https://api.pinata.cloud/pinning/unpin/${key}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.jwt}`
      }
    });

    if (!res.ok) {
      throw new Error(`Pinata delete failed: ${res.statusText}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    return true; // Difficult to accurately check via API without listing, assuming IPFS means it exists if we have CID
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata> {
    throw new Error('Not implemented for IPFS');
  }

  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    throw new Error('Not implemented for IPFS - CIDs are public');
  }
}
