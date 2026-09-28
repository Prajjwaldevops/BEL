/**
 * BEL SENTINEL — Document Upload API
 * 
 * POST /api/documents/upload
 * 
 * Flow:
 * 1. Authenticate user
 * 2. Validate file (type, size, magic bytes)
 * 3. Calculate SHA-256 from actual bytes (server-side)
 * 4. Encrypt document (AES-256-GCM)
 * 5. Upload encrypted document to R2
 * 6. Generate metadata
 * 7. Persist to database as STORED / PENDING_MINT
 * 8. Return upload receipt
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { encryptDocument } from '@/lib/storage/encryption';
import { getStorageProvider, generateDocumentStorageKey, isStorageConfigured } from '@/lib/storage/storage';
import type { DocumentClassification, DocumentUploadResult } from '@/lib/types/document';
import { DocumentError } from '@/lib/types/document';

// Allowed MIME types
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],           // %PDF
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // PK..
  'image/png': [0x89, 0x50, 0x4E, 0x47],                   // .PNG
  'image/jpeg': [0xFF, 0xD8, 0xFF],                         // JPEG SOI
  'image/jpg': [0xFF, 0xD8, 0xFF],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function validateMagicBytes(buffer: Buffer, expectedMagic: number[]): boolean {
  if (buffer.length < expectedMagic.length) return false;
  for (let i = 0; i < expectedMagic.length; i++) {
    if (buffer[i] !== expectedMagic[i]) return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || '';
    const classification = (formData.get('classification') as string || 'UNCLASSIFIED') as DocumentClassification;
    const transferable = formData.get('transferable') !== 'false'; // Default true
    const expiresAt = formData.get('expiresAt') as string | null;
    const walletAddress = formData.get('walletAddress') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Document name is required' }, { status: 400 });
    }

    // 3. Validate file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Validate MIME type + magic bytes
    const declaredMime = file.type.toLowerCase();
    const magicBytes = ALLOWED_MIME_TYPES[declaredMime];
    if (!magicBytes) {
      return NextResponse.json(
        { error: `Unsupported file type: ${declaredMime}. Allowed: PDF, DOCX, PNG, JPG` },
        { status: 400 }
      );
    }
    if (!validateMagicBytes(buffer, magicBytes)) {
      return NextResponse.json(
        { error: 'File content does not match declared type (magic bytes mismatch)' },
        { status: 400 }
      );
    }

    // 4. Calculate SHA-256 from actual bytes
    const contentHash = '0x' + crypto.createHash('sha256').update(buffer).digest('hex');

    // 5. Create metadata
    const metadata = {
      name,
      description,
      classification,
      fileSize: buffer.length,
      mimeType: declaredMime,
      originalName: file.name,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      transferable,
    };
    const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
    const metadataHash = '0x' + crypto.createHash('sha256').update(metadataString).digest('hex');

    // 6. Encrypt document (MANDATORY)
    if (!process.env.DOCUMENT_ENCRYPTION_KEY) {
      return NextResponse.json(
        { error: 'System misconfiguration: Encryption key missing. Plaintext storage is strictly prohibited.' },
        { status: 500 }
      );
    }

    let encryptionMethod: string | null = null;
    let encryptionIv: string | null = null;
    let encryptionTag: string | null = null;
    let encryptionKeyId: string | null = null;
    let dataToStore = buffer;

    try {
      const encrypted = await encryptDocument(buffer);
      dataToStore = encrypted.encryptedData;
      encryptionMethod = encrypted.algorithm;
      encryptionIv = encrypted.iv.toString('hex');
      encryptionTag = encrypted.authTag.toString('hex');
      encryptionKeyId = encrypted.keyId;
    } catch (encErr) {
      console.error('Encryption error:', encErr);
      return NextResponse.json(
        { error: 'Failed to encrypt document' },
        { status: 500 }
      );
    }

    // 7. Upload to cloud storage
    let storageProvider: string | null = null;
    let storageKey: string | null = null;
    let storageVersion: string | null = null;

    // Generate a temporary document ID for the storage key
    const tempDocId = crypto.randomUUID();

    if (isStorageConfigured()) {
      try {
        const provider = getStorageProvider();
        const key = generateDocumentStorageKey(tempDocId, file.name);

        const uploadResult = await provider.upload({
          key,
          data: dataToStore,
          contentType: encryptionMethod ? 'application/octet-stream' : declaredMime,
          metadata: {
            'x-bel-content-hash': contentHash,
            'x-bel-encrypted': encryptionMethod ? 'true' : 'false',
            'x-bel-original-mime': declaredMime,
          },
        });

        storageProvider = uploadResult.provider;
        storageKey = uploadResult.key;
        storageVersion = uploadResult.versionId || null;
      } catch (storageErr) {
        console.error('Storage upload error:', storageErr);
        return NextResponse.json(
          { error: 'Failed to store document. Storage service unavailable.' },
          { status: 503 }
        );
      }
    } else {
      // Storage not configured — fail gracefully, do NOT fake CIDs
      return NextResponse.json(
        { error: 'Document storage is not configured. Contact administrator.' },
        { status: 503 }
      );
    }

    // 8. Insert into database
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const docRecord = {
      name,
      description: description || null,
      document_type: declaredMime.split('/').pop()?.toUpperCase() || 'UNKNOWN',
      classification,
      version: 1,
      file_size: buffer.length,
      mime_type: declaredMime,
      content_hash: contentHash,
      metadata_hash: metadataHash,
      storage_provider: storageProvider,
      storage_key: storageKey,
      storage_version: storageVersion,
      encryption_method: encryptionMethod,
      encryption_iv: encryptionIv,
      encryption_tag: encryptionTag,
      encryption_key_id: encryptionKeyId,
      uploaded_by: user.id,
      owner_wallet: walletAddress || user.walletAddress || null,
      transferable,
      mint_status: 'STORED',
      status: 'PENDING',
      issued_at: new Date().toISOString(),
      expires_at: expiresAt || null,
      metadata: metadata,
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(docRecord),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('Database insert error:', errText);
      return NextResponse.json(
        { error: 'Failed to store document record' },
        { status: 500 }
      );
    }

    const [document] = await insertRes.json();

    // 9. Write audit log
    try {
      await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          actor_id: user.id,
          actor_role: user.roles?.[0] || 'VIEWER',
          action: 'DOCUMENT_UPLOADED',
          resource_id: document.id,
          resource_type: 'DOCUMENT',
          result: 'SUCCESS',
          details: `Document "${name}" uploaded and stored securely`,
          metadata: {
            contentHash,
            metadataHash,
            fileSize: buffer.length,
            mimeType: declaredMime,
            encrypted: !!encryptionMethod,
            storageProvider,
          },
        }),
      });
    } catch (auditErr) {
      console.error('Audit log error (non-fatal):', auditErr);
    }

    // 10. Return receipt
    const result: DocumentUploadResult = {
      success: true,
      document: {
        id: document.id,
        document_id: document.document_id,
        name: document.name,
        contentHash,
        metadataHash,
        fileSize: buffer.length,
        mimeType: declaredMime,
        classification,
        storageProvider: storageProvider || 'none',
        encrypted: !!encryptionMethod,
        uploadedAt: document.created_at,
      },
      mintReady: true,
      message: `Document uploaded, hashed (SHA-256), ${encryptionMethod ? 'encrypted (AES-256-GCM), ' : ''}and stored securely.`,
    };

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Document upload error:', error);
    if (error instanceof DocumentError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
