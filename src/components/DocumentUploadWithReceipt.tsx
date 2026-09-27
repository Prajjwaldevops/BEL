'use client';

import { useState } from 'react';
import { Upload, Check, ExternalLink, FileText, Hash, Shield, Clock, AlertCircle } from 'lucide-react';

interface UploadReceipt {
  document: {
    id: string;
    name: string;
    ipfsCID: string;
    ipfsUrl: string;
    contentHash: string;
    metadataHash: string;
    fileSize: number;
    mimeType: string;
    classification: string;
    uploadedAt: string;
  };
  proof: {
    txHash: string | null;
    blockNumber: number | null;
    network: string;
    verificationUrl: string;
    anchored: boolean;
  };
  message: string;
}

export default function DocumentUploadWithReceipt() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState('UNCLASSIFIED');
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState<UploadReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !name) {
      setError('Please select a file and provide a name');
      return;
    }

    setUploading(true);
    setError(null);
    setReceipt(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('classification', classification);

      const response = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setReceipt(data);
      setFile(null);
      setName('');
      setDescription('');
      setClassification('UNCLASSIFIED');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      {!receipt && (
        <div className="p-6 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#7c5cfc]" />
            Upload Document
          </h3>

          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm text-[#9aa0a8] mb-2">File</label>
              <input
                type="file"
                onChange={handleFileSelect}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#7c5cfc] file:text-white file:cursor-pointer hover:file:bg-[#6b4dd9]"
              />
              {file && (
                <p className="text-xs text-[#5a6068] mt-1">
                  {file.name} ({formatBytes(file.size)})
                </p>
              )}
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm text-[#9aa0a8] mb-2">Document Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter document name"
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white placeholder-[#5a6068] focus:outline-none focus:border-[#7c5cfc]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-[#9aa0a8] mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white placeholder-[#5a6068] focus:outline-none focus:border-[#7c5cfc] resize-none"
              />
            </div>

            {/* Classification */}
            <div>
              <label className="block text-sm text-[#9aa0a8] mb-2">Classification</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#7c5cfc]"
              >
                <option value="UNCLASSIFIED">Unclassified</option>
                <option value="CONFIDENTIAL">Confidential</option>
                <option value="SECRET">Secret</option>
                <option value="TOP SECRET">Top Secret</option>
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[#ef4444]/30 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#ef4444]" />
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !name}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#7c5cfc]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Anchor
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Proof Receipt */}
      {receipt && (
        <div className="space-y-4">
          {/* Success Header */}
          <div className="p-6 rounded-xl border border-[#00ff88]/30 bg-[rgba(0,255,136,0.05)]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#00ff88]/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-[#00ff88]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Upload Successful</h3>
                <p className="text-sm text-[#9aa0a8]">{receipt.message}</p>
              </div>
            </div>
          </div>

          {/* Document Details */}
          <div className="p-6 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#7c5cfc]" />
              Document Details
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-[#5a6068] mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#5a6068] mb-1">Name</p>
                  <p className="text-sm font-medium">{receipt.document.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#5a6068] mb-1">IPFS CID</p>
                  <a
                    href={receipt.document.ipfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-[#00ff88] hover:text-[#00cc6a] flex items-center gap-1 break-all"
                  >
                    {receipt.document.ipfsCID}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#5a6068] mb-1">Content Hash (SHA-256)</p>
                  <p className="text-sm font-mono break-all text-[#9aa0a8]">{receipt.document.contentHash}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#5a6068] mb-1">Metadata Hash</p>
                  <p className="text-sm font-mono break-all text-[#9aa0a8]">{receipt.document.metadataHash}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#5a6068] mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#5a6068] mb-1">Uploaded At</p>
                  <p className="text-sm">{new Date(receipt.document.uploadedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Proof */}
          {receipt.proof.anchored && receipt.proof.txHash && (
            <div className="p-6 rounded-xl border border-[#00ff88]/30 bg-[rgba(0,255,136,0.02)]">
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#00ff88]" />
                Blockchain Proof
              </h4>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-[#5a6068] mb-1">Transaction Hash</p>
                    <p className="text-sm font-mono text-[#00ff88] break-all">{receipt.proof.txHash}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-[#5a6068] mb-1">Block Number</p>
                    <p className="text-sm font-mono">{receipt.proof.blockNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-[#5a6068] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-[#5a6068] mb-1">Network</p>
                    <p className="text-sm capitalize">{receipt.proof.network}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <p className="text-xs text-[#5a6068] mb-2">
                  ✅ This document has been permanently anchored to the blockchain and cannot be altered or deleted.
                </p>
              </div>
            </div>
          )}

          {/* Verification Link */}
          <div className="p-4 rounded-lg bg-[rgba(124,92,252,0.05)] border border-[#7c5cfc]/30">
            <a
              href={receipt.proof.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-[#7c5cfc] hover:text-[#6b4dd9] transition-colors"
            >
              <span className="text-sm font-medium">Verify this document publicly</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Upload Another */}
          <button
            onClick={() => setReceipt(null)}
            className="w-full px-6 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white font-semibold rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors"
          >
            Upload Another Document
          </button>
        </div>
      )}
    </div>
  );
}
