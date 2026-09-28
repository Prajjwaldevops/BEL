'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  FileText, Search, Upload, CheckCircle2, AlertCircle, Download,
  Shield, Coins, XCircle, Clock, Filter, ChevronLeft, ChevronRight,
  Eye, Lock, Hash, Loader2, X, Plus, ArrowLeft, ChevronDown,
  Fingerprint, RefreshCw, Zap, ShieldAlert, FileCheck
} from 'lucide-react';
import FileRenderer from '@/components/FileRenderer';

interface DocumentRecord {
  id: string;
  document_id: string;
  name: string;
  description?: string;
  classification: string;
  status: string;
  mint_status: string;
  content_hash: string;
  metadata_hash?: string;
  owner_wallet: string | null;
  nft_token_id: string | null;
  created_at: string;
  file_size: number;
  mime_type: string;
  encryption_method: string | null;
  verification_count: number;
  expires_at: string | null;
  storage_provider?: string;
}

const CLASSIFICATION_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  UNCLASSIFIED: { text: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  CONFIDENTIAL: { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
  SECRET: { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  'TOP SECRET': { text: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  VERIFIED:  { bg: 'rgba(0,255,136,0.08)', text: '#00ff88', border: 'rgba(0,255,136,0.2)', icon: CheckCircle2 },
  ACTIVE:    { bg: 'rgba(0,255,136,0.08)', text: '#00ff88', border: 'rgba(0,255,136,0.2)', icon: CheckCircle2 },
  PENDING:   { bg: 'rgba(251,191,36,0.08)', text: '#fbbf24', border: 'rgba(251,191,36,0.2)', icon: Clock },
  STORED:    { bg: 'rgba(56,189,248,0.08)', text: '#38bdf8', border: 'rgba(56,189,248,0.2)', icon: Shield },
  MINTED:    { bg: 'rgba(124,92,252,0.08)', text: '#7c5cfc', border: 'rgba(124,92,252,0.2)', icon: Coins },
  REVOKED:   { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', border: 'rgba(239,68,68,0.2)', icon: XCircle },
  EXPIRED:   { bg: 'rgba(156,163,175,0.08)', text: '#9ca3af', border: 'rgba(156,163,175,0.2)', icon: AlertCircle },
  FAILED:    { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', border: 'rgba(239,68,68,0.2)', icon: XCircle },
};

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/png': '🖼',
  'image/jpeg': '🖼',
  'image/jpg': '🖼',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
};

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function getDocStatus(doc: DocumentRecord) {
  const key = doc.mint_status === 'MINTED' ? 'MINTED' :
               doc.status === 'REVOKED' ? 'REVOKED' :
               doc.status || doc.mint_status || 'PENDING';
  return STATUS_CONFIG[key] || STATUS_CONFIG.PENDING;
}

/* ──────────────────────────── Upload Modal ──────────────────────────── */
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState('UNCLASSIFIED');
  const [transferable, setTransferable] = useState(true);
  const [stage, setStage] = useState<'form' | 'uploading' | 'done' | 'error'>('form');
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ document: { id: string; document_id: string; name: string; contentHash: string; fileSize: number; mimeType: string; encrypted: boolean; storageProvider: string; uploadedAt: string }; } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file || !name) return;
    setStage('uploading'); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name);
      fd.append('description', description);
      fd.append('classification', classification);
      fd.append('transferable', String(transferable));
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadResult(data);
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStage('error');
    }
  };

  const progressSteps = [
    { label: 'Validating', done: ['uploading', 'done'].includes(stage) },
    { label: 'SHA-256 Hash', done: ['uploading', 'done'].includes(stage) },
    { label: 'AES-256-GCM', done: ['uploading', 'done'].includes(stage) },
    { label: 'Cloud Storage', done: stage === 'done' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-[#0a0614]/95 border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 flex items-center justify-center">
              <Upload className="w-5 h-5 text-[#7c5cfc]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Upload Document</h2>
              <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest">HASH · ENCRYPT · STORE · MINT</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Stage: Form */}
          {(stage === 'form' || stage === 'error') && (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center group ${
                  isDragging ? 'border-[#7c5cfc]/70 bg-[#7c5cfc]/10' :
                  file ? 'border-[#00ff88]/40 bg-[#00ff88]/5' :
                  'border-white/10 hover:border-[#7c5cfc]/40 bg-white/[0.01] hover:bg-[#7c5cfc]/5'
                }`}
              >
                <input ref={inputRef} type="file" className="hidden" accept=".pdf,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl">{MIME_ICONS[file.type] || '📁'}</span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">{file.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">{formatBytes(file.size)} • {file.type || 'unknown type'}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); setName(''); }}
                      className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.08] text-white/30 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 group-hover:border-[#7c5cfc]/30 transition-all">
                      <Upload className="w-6 h-6 text-white/20 group-hover:text-[#7c5cfc]/60 transition-colors" />
                    </div>
                    <p className="text-sm text-white/50">Drop file here or <span className="text-[#7c5cfc]">click to browse</span></p>
                    <p className="text-[10px] text-white/25 mt-1 font-mono">PDF, DOCX, PNG, JPG — Max 50MB</p>
                  </div>
                )}
              </div>

              {/* Preview of selected file (images) */}
              {file && file.type.startsWith('image/') && (
                <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ maxHeight: 200 }}>
                  <FileRenderer localFile={file} compact />
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Document Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter document name"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 resize-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Classification</label>
                  <select value={classification} onChange={(e) => setClassification(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#7c5cfc]/50 transition-colors">
                    {Object.keys(CLASSIFICATION_COLORS).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">NFT Type</label>
                  <select value={String(transferable)} onChange={(e) => setTransferable(e.target.value === 'true')}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#7c5cfc]/50 transition-colors">
                    <option value="true">Transferable</option>
                    <option value="false">Soulbound (Non-transferable)</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              {/* Encryption Notice */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-[10px] text-white/40 font-mono">
                  Document will be hashed (SHA-256), encrypted (AES-256-GCM), and stored securely before blockchain minting.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm hover:bg-white/[0.06] hover:text-white transition-all">
                  Cancel
                </button>
                <button onClick={handleUpload} disabled={!file || !name}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-sm font-bold tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#7c5cfc]/25 transition-all flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" /> Upload & Secure
                </button>
              </div>
            </div>
          )}

          {/* Stage: Uploading */}
          {stage === 'uploading' && (
            <div className="py-10 text-center space-y-6">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-[#7c5cfc]/20 animate-ping" />
                <div className="w-20 h-20 rounded-full bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#7c5cfc] animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Processing Document</h3>
                <p className="text-xs text-white/40 font-mono">Please wait while we secure your document...</p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                {progressSteps.map((step, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border text-[9px] font-mono transition-all ${
                    step.done ? 'border-[#00ff88]/20 bg-[#00ff88]/5 text-[#00ff88]' : 'border-white/[0.06] bg-white/[0.02] text-white/25'
                  }`}>
                    {step.done ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <div className="w-3 h-3 rounded-full border border-white/20 animate-pulse shrink-0" />}
                    {step.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage: Done */}
          {stage === 'done' && uploadResult && (
            <div className="py-4 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#00ff88]" />
                </div>
                <h3 className="text-lg font-bold text-white">Document Secured</h3>
                <p className="text-xs text-white/40 font-mono mt-1 uppercase tracking-widest">
                  {uploadResult.document.encrypted ? 'Encrypted • ' : ''}Stored • Ready to Mint
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2.5 text-[10px] font-mono">
                {[
                  { label: 'Document ID', value: uploadResult.document.document_id, color: '#00ff88' },
                  { label: 'File Size', value: formatBytes(uploadResult.document.fileSize) },
                  { label: 'Storage', value: uploadResult.document.storageProvider },
                  { label: 'Encryption', value: uploadResult.document.encrypted ? 'AES-256-GCM ✓' : 'None', color: uploadResult.document.encrypted ? '#fbbf24' : undefined },
                ].map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-white/30">{row.label}:</span>
                    <span style={{ color: row.color || '#ffffff99' }}>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-white/[0.04]">
                  <span className="text-white/30">SHA-256:</span>
                  <span className="text-white/40 break-all text-right max-w-[60%]">{uploadResult.document.contentHash.slice(0, 32)}...</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { onClose(); onSuccess(); }}
                  className="flex-1 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm hover:bg-white/[0.06] hover:text-white transition-all">
                  View Documents
                </button>
                <Link href={`/dashboard/documents/upload`}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-sm font-bold tracking-wider text-center hover:shadow-lg hover:shadow-[#7c5cfc]/25 transition-all flex items-center justify-center gap-2">
                  <Coins className="w-4 h-4" /> Mint NFT
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────── Detail Slide Panel ──────────────────────────── */
function DocumentDetailPanel({ doc, onClose, onRefresh }: {
  doc: DocumentRecord; onClose: () => void; onRefresh: () => void;
}) {
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ tokenId: string; txHash: string } | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [showRenderer, setShowRenderer] = useState(false);

  const cfg = getDocStatus(doc);
  const StatusIcon = cfg.icon;
  const classCfg = CLASSIFICATION_COLORS[doc.classification] || CLASSIFICATION_COLORS.UNCLASSIFIED;

  const handleMint = async () => {
    setMinting(true); setMintError(null);
    try {
      const res = await fetch('/api/documents/mint', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mint failed');
      setMintResult({ tokenId: data.receipt?.tokenId || '?', txHash: data.receipt?.transactionHash || '0x' });
      onRefresh();
    } catch (err) {
      setMintError(err instanceof Error ? err.message : 'Failed to mint');
    } finally {
      setMinting(false);
    }
  };

  return (
    <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-[#0a0614]/98 border-l border-white/[0.08] backdrop-blur-2xl shadow-2xl flex flex-col">

      {/* Header */}
      <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white">{doc.name}</h2>
            <p className="text-[9px] text-white/30 font-mono uppercase">{doc.document_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-mono tracking-wider uppercase border"
            style={{ color: classCfg.text, background: classCfg.bg, borderColor: classCfg.border }}>
            {doc.classification}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-mono tracking-wider uppercase border"
            style={{ color: cfg.text, background: cfg.bg, borderColor: cfg.border }}>
            <StatusIcon className="w-2.5 h-2.5" />
            {doc.mint_status === 'MINTED' ? 'MINTED' : doc.status}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* File Renderer (toggle) */}
        <div>
          <button onClick={() => setShowRenderer(v => !v)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all text-sm text-white/70 group">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#7c5cfc]" />
              {showRenderer ? 'Hide Preview' : 'Preview Document'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showRenderer ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showRenderer && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2">
                <FileRenderer
                  mimeType={doc.mime_type}
                  fileName={doc.name}
                  isEncrypted={!!doc.encryption_method}
                  allowDownload={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Metadata Grid */}
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <h3 className="text-[9px] text-white/30 font-mono uppercase tracking-widest mb-3">Document Metadata</h3>
          {[
            { label: 'Uploaded', value: new Date(doc.created_at).toLocaleString() },
            { label: 'File Size', value: formatBytes(doc.file_size) },
            { label: 'MIME Type', value: doc.mime_type },
            { label: 'Verifications', value: String(doc.verification_count || 0), color: doc.verification_count > 0 ? '#00ff88' : undefined },
            { label: 'Expires', value: doc.expires_at ? new Date(doc.expires_at).toLocaleDateString() : 'Never' },
            { label: 'Storage', value: doc.storage_provider || 'R2' },
            doc.nft_token_id ? { label: 'NFT Token', value: `#${doc.nft_token_id}`, color: '#7c5cfc' } : null,
            doc.owner_wallet ? { label: 'Owner Wallet', value: `${doc.owner_wallet.slice(0, 8)}...${doc.owner_wallet.slice(-6)}` } : null,
          ].filter(Boolean).map(row => (
            <div key={row!.label} className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-white/30">{row!.label}</span>
              <span style={{ color: row!.color || 'rgba(255,255,255,0.6)' }}>{row!.value}</span>
            </div>
          ))}
        </div>

        {/* Hashes */}
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <h3 className="text-[9px] text-white/30 font-mono uppercase tracking-widest">Cryptographic Hashes</h3>
          <div>
            <p className="text-[8px] text-white/20 mb-1 font-mono uppercase">SHA-256 Content Hash</p>
            <p className="text-[9px] text-white/50 font-mono break-all">{doc.content_hash}</p>
          </div>
          {doc.encryption_method && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[9px] text-amber-400 font-mono">{doc.encryption_method}</span>
            </div>
          )}
        </div>

        {/* Mint Action */}
        {doc.mint_status !== 'MINTED' && doc.status !== 'REVOKED' && (
          <div className="p-4 rounded-xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5 space-y-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#7c5cfc]" />
              <h3 className="text-sm font-bold text-white">Mint as NFT</h3>
            </div>
            <p className="text-xs text-white/40">
              Permanently record this document on-chain via the Sentinel relayer. Creates an immutable on-chain record.
            </p>
            {mintResult ? (
              <div className="p-3 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/20 text-[10px] font-mono space-y-1">
                <div className="flex justify-between"><span className="text-white/30">Token ID</span><span className="text-[#7c5cfc]">#{mintResult.tokenId}</span></div>
                <div className="flex justify-between"><span className="text-white/30">TX Hash</span><span className="text-[#00ff88]">{mintResult.txHash.slice(0, 12)}...{mintResult.txHash.slice(-8)}</span></div>
              </div>
            ) : (
              <>
                {mintError && <p className="text-xs text-red-400 font-mono">{mintError}</p>}
                <button onClick={handleMint} disabled={minting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-xs font-bold tracking-wider uppercase disabled:opacity-50 hover:shadow-lg hover:shadow-[#7c5cfc]/25 transition-all flex items-center justify-center gap-2">
                  {minting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Minting...</> : <><Zap className="w-3.5 h-3.5" /> Mint Document NFT</>}
                </button>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/dashboard/verification`}
            className="py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/60 text-xs font-mono uppercase tracking-wider text-center hover:bg-white/[0.06] hover:text-white transition-all flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Verify
          </Link>
          <Link href={`/dashboard/documents/upload`}
            className="py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/60 text-xs font-mono uppercase tracking-wider text-center hover:bg-white/[0.06] hover:text-white transition-all flex items-center justify-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> New Version
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────── Main Page ──────────────────────────── */
export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      setDocuments(data.documents || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchDocuments(); }, [page, statusFilter]);

  // Stats from documents
  const stats = {
    total,
    minted: documents.filter(d => d.mint_status === 'MINTED').length,
    verified: documents.filter(d => d.status === 'VERIFIED' || d.status === 'ACTIVE').length,
    encrypted: documents.filter(d => !!d.encryption_method).length,
  };

  const filteredDocs = classFilter
    ? documents.filter(d => d.classification === classFilter)
    : documents;

  return (
    <div className="space-y-5 pb-12">
      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onSuccess={() => { setShowUpload(false); fetchDocuments(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Detail Panel ── */}
      <AnimatePresence>
        {selectedDoc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedDoc(null)} />
            <DocumentDetailPanel
              doc={selectedDoc}
              onClose={() => setSelectedDoc(null)}
              onRefresh={fetchDocuments}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#7c5cfc]" />
            </div>
            Document Vault
          </h1>
          <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase mt-1 ml-[52px]">
            SECURE DOCUMENT MANAGEMENT — {total} DOCUMENTS
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-xs font-bold tracking-wider uppercase hover:shadow-lg hover:shadow-[#7c5cfc]/25 transition-all">
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Docs', value: total, icon: FileText, color: '#38bdf8' },
          { label: 'Minted NFTs', value: stats.minted, icon: Coins, color: '#7c5cfc' },
          { label: 'Verified', value: stats.verified, icon: CheckCircle2, color: '#00ff88' },
          { label: 'Encrypted', value: stats.encrypted, icon: Lock, color: '#fbbf24' },
        ].map(stat => (
          <div key={stat.label}
            className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all group">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</span>
            </div>
            <div className="text-[9px] text-white/25 font-mono uppercase tracking-widest">{stat.label}</div>
            <div className="mt-2 h-[1px] bg-gradient-to-r from-transparent to-transparent group-hover:from-transparent group-hover:via-white/10 group-hover:to-transparent transition-all" />
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-white/20 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchDocuments())}
            placeholder="Search by name, ID, or hash..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/30 font-mono transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/20" />
          {['', 'PENDING', 'ACTIVE', 'MINTED', 'REVOKED'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wider uppercase transition-all ${
                statusFilter === s
                  ? 'bg-[#7c5cfc]/20 text-[#7c5cfc] border border-[#7c5cfc]/30'
                  : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60'
              }`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {Object.entries(CLASSIFICATION_COLORS).map(([cls, clsCfg]) => (
            <button key={cls} onClick={() => setClassFilter(classFilter === cls ? '' : cls)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wider uppercase transition-all border ${
                classFilter === cls
                  ? '' : 'bg-white/[0.02] border-white/[0.06] text-white/20 hover:text-white/40 hover:border-white/[0.1]'
              }`}
              style={classFilter === cls ? { background: clsCfg.bg, borderColor: clsCfg.border, color: clsCfg.text } : {}}>
              {cls === 'TOP SECRET' ? 'TS' : cls.slice(0, 4)}
            </button>
          ))}
        </div>

        <button onClick={fetchDocuments} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white hover:bg-white/[0.08] transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Document List ── */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="relative mx-auto w-12 h-12 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#7c5cfc]/20 animate-ping" />
            <div className="w-12 h-12 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs text-white/30 font-mono">Fetching documents from vault...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white/10" />
          </div>
          <p className="text-sm text-white/40 mb-1">No documents found</p>
          <p className="text-xs text-white/20 font-mono mb-4">
            {search || statusFilter || classFilter ? 'Try adjusting your filters' : 'Upload your first document to get started'}
          </p>
          {!search && !statusFilter && !classFilter && (
            <button onClick={() => setShowUpload(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-xs font-bold tracking-wider inline-flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload First Document
            </button>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {filteredDocs.map((doc, i) => {
            const cfg = getDocStatus(doc);
            const StatusIcon = cfg.icon;
            const displayStatus = doc.mint_status === 'MINTED' ? 'MINTED' : doc.status;
            const classCfg = CLASSIFICATION_COLORS[doc.classification] || CLASSIFICATION_COLORS.UNCLASSIFIED;

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                onClick={() => setSelectedDoc(doc)}
                className="group p-4 rounded-xl border border-white/[0.05] bg-white/[0.015] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all cursor-pointer relative overflow-hidden"
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: cfg.text }} />

                <div className="flex items-center gap-4">
                  {/* File Type Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    {MIME_ICONS[doc.mime_type] || '📁'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-white truncate">{doc.name}</h3>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase shrink-0"
                        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                        <StatusIcon className="w-2.5 h-2.5" />{displayStatus}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase shrink-0"
                        style={{ background: classCfg.bg, color: classCfg.text, border: `1px solid ${classCfg.border}` }}>
                        {doc.classification}
                      </span>
                      {doc.nft_token_id && (
                        <span className="px-2 py-0.5 rounded bg-[#7c5cfc]/10 text-[#7c5cfc] text-[8px] font-mono">
                          NFT #{doc.nft_token_id}
                        </span>
                      )}
                      {doc.encryption_method && (
                        <Lock className="w-3 h-3 text-amber-400/60" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[9px] font-mono text-white/20 flex-wrap">
                      <span>{doc.document_id}</span>
                      <span>{formatBytes(doc.file_size)}</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      {doc.verification_count > 0 && (
                        <span className="text-[#00ff88]">✓ {doc.verification_count} verifications</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[9px] font-mono text-white/60">
                      <Eye className="w-3 h-3" /> View
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] disabled:opacity-20 hover:bg-white/[0.06] transition-all">
            <ChevronLeft className="w-4 h-4 text-white/50" />
          </button>
          <span className="text-[10px] font-mono text-white/40">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] disabled:opacity-20 hover:bg-white/[0.06] transition-all">
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
        </div>
      )}
    </div>
  );
}
