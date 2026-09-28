/**
 * BEL SENTINEL — Cloudflare R2 Storage Provider
 * 
 * S3-compatible object storage for encrypted documents.
 * Private bucket — all access via signed URLs.
 * 
 * Environment variables (server-only, never NEXT_PUBLIC_):
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID  
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_ENDPOINT (optional, auto-derived from account ID)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDownloadResult,
  StorageObjectMetadata,
  SignedUrlOptions,
} from './types';

let _client: S3Client | null = null;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'bel-sentinel-documents';
  const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.'
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, endpoint };
}

function getClient(): S3Client {
  if (_client) return _client;

  const config = getR2Config();

  _client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return _client;
}

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME || 'bel-sentinel-documents';
}

export class R2StorageProvider implements StorageProvider {
  readonly name = 'cloudflare-r2';

  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const client = getClient();
    const bucket = getBucketName();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: options.key,
      Body: options.data,
      ContentType: options.contentType,
      ContentDisposition: options.contentDisposition,
      Metadata: options.metadata,
    });

    const response = await client.send(command);

    return {
      provider: this.name,
      key: options.key,
      versionId: response.VersionId,
      etag: response.ETag,
      size: options.data.length,
      uploadedAt: new Date().toISOString(),
    };
  }

  async download(key: string): Promise<StorageDownloadResult> {
    const client = getClient();
    const bucket = getBucketName();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      throw new Error(`Object not found: ${key}`);
    }

    // Convert readable stream to Buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);

    return {
      data,
      contentType: response.ContentType || 'application/octet-stream',
      metadata: response.Metadata,
      contentLength: response.ContentLength || data.length,
      lastModified: response.LastModified?.toISOString(),
      etag: response.ETag,
    };
  }

  async delete(key: string): Promise<void> {
    const client = getClient();
    const bucket = getBucketName();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.getMetadata(key);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata> {
    const client = getClient();
    const bucket = getBucketName();

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    return {
      key,
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified?.toISOString() || new Date().toISOString(),
      etag: response.ETag,
      metadata: response.Metadata,
    };
  }

  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    const client = getClient();
    const bucket = getBucketName();
    const expiresIn = options.expiresInSeconds || 3600; // 1 hour default

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: options.key,
      ResponseContentDisposition: options.contentDisposition,
    });

    return awsGetSignedUrl(client, command, { expiresIn });
  }
}
