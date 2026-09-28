'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2,
  Lock, Cloud, Coins, ExternalLink, Copy, ArrowLeft, Zap, X, Plus
} from 'lucide-react';
import Link from 'next/link';
import { getNetworkName, getExplorerTxUrl } from '@/lib/contracts/document-nft';
import FileRenderer from '@/components/FileRenderer';

type UploadStage = 'select' | 'uploading' | 'stored' | 'minting' | 'minted' | 'error';

interface UploadResult {
  document: {
    id: string;
    document_id: string;
    name: string;
    contentHash: string;
    metadataHash: string;
    fileSize: number;
    mimeType: string;
    classification: string;
    storageProvider: string;
    encrypted: boolean;
    uploadedAt: string;
  };
  mintReady: boolean;
}

interface MintResult {
  tokenId: string;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  gasCostEth: string;
}

const STAGES = [
  { key: 'select',    label: 'Select',   icon: FileText },
  { key: 'uploading', label: 'Process',  icon: Loader2 },
  { key: 'stored',    label: 'Stored',   icon: Cloud },
  { key: 'minting',  label: 'Mint',     icon: Coins },
  { key: 'minted',   label: 'Complete', icon: CheckCircle2 },
];

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/png': '🖼',
  'image/jpeg': '🖼',
  'image/jpg': '🖼',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
};

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

export default function UploadDocumentClient() {
  const { address, isConnected, chain } = useAccount();
  const inputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState('UNCLASSIFIED');
  const [transferable, setTransferable] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Flow state
  const [stage, setStage] = useState<UploadStage>('select');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  }, [name]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file || !name) return;
    setStage('uploading');
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name);
      fd.append('description', description);
      fd.append('classification', classification);
      fd.append('transferable', String(transferable));
      if (address) fd.append('walletAddress', address);

      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadResult(data);
      setStage('stored');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStage('error');
    }
  };

  const handleMint = async () => {
    if (!uploadResult) return;
    setIsMinting(true);
    setStage('minting');
    setError(null);

    try {
      const res = await fetch('/api/documents/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: uploadResult.document.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mint failed');

      setMintResult({
        tokenId: data.receipt?.tokenId || '0',
        txHash: data.receipt?.transactionHash || '0x0',
        blockNumber: Number(data.receipt?.blockNumber || 0),
        gasUsed: data.receipt?.gasUsed || '0',
        gasCostEth: data.receipt?.gasCostEth || '0',
      });
      setStage('minted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed');
      setStage('stored');
    } finally {
      setIsMinting(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);
  const currentStageIndex = STAGES.findIndex(s => s.key === stage);

  const resetForm = () => {
    setStage('select'); setFile(null); setName('');
    setDescription(''); setUploadResult(null); setMintResult(null); setError(null);
    setIsDragging(false); setShowPreview(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/documents"
          className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors border border-transparent hover:border-white/[0.08] text-white/40 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Upload Document</h1>
          <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase mt-0.5">
            HASH · ENCRYPT · STORE · MINT NFT
          </p>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="flex items-center justify-between px-5 py-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentStageIndex;
          const isDone = i < currentStageIndex || stage === 'minted';
          const isError = stage === 'error' && i === 1;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                isError  ? 'border-red-500/50 bg-red-500/10' :
                isDone   ? 'border-[#00ff88]/50 bg-[#00ff88]/10' :
                isActive ? 'border-[#7c5cfc]/50 bg-[#7c5cfc]/10 shadow-[0_0_16px_rgba(124,92,252,0.25)]' :
                           'border-white/10 bg-white/[0.02]'
              }`}>
                {isDone  ? <CheckCircle2 className="w-4 h-4 text-[#00ff88]" /> :
                 isError ? <X className="w-4 h-4 text-red-400" /> :
                 isActive && (stage === 'uploading' || stage === 'minting') ?
                   <Loader2 className="w-4 h-4 text-[#7c5cfc] animate-spin" /> :
                   <Icon className={`w-4 h-4 ${isActive ? 'text-[#7c5cfc]' : 'text-white/20'}`} />
                }
              </div>
              <span className={`text-[9px] font-mono tracking-wider uppercase hidden sm:block transition-colors ${
                isDone ? 'text-[#00ff88]' : isActive ? 'text-white' : 'text-white/20'
              }`}>{s.label}</span>
              {i < STAGES.length - 1 && (
                <div className={`flex-1 h-[1px] mx-2 min-w-[24px] transition-colors ${isDone ? 'bg-[#00ff88]/30' : 'bg-white/10'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button onClick={() => { setError(null); if (stage === 'error') setStage('select'); }}
              className="text-red-400/60 hover:text-red-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage: Select */}
      {stage === 'select' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center group ${
              isDragging ? 'border-[#7c5cfc]/70 bg-[#7c5cfc]/10 scale-[1.01]' :
              file ? 'border-[#00ff88]/40 bg-[#00ff88]/5' :
              'border-white/10 hover:border-[#7c5cfc]/40 bg-white/[0.01] hover:bg-[#7c5cfc]/5'
            }`}
          >
            <input ref={inputRef} id="file-input" type="file" className="hidden"
              accept=".pdf,.docx,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <span className="text-5xl">{MIME_ICONS[file.type] || '📁'}</span>
                <div>
                  <p className="text-base font-semibold text-white">{file.name}</p>
                  <p className="text-xs text-white/40 mt-1 font-mono">{formatBytes(file.size)} · {file.type || 'unknown'}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); setName(''); setShowPreview(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white text-xs font-mono transition-all">
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 group-hover:border-[#7c5cfc]/30 transition-all">
                  <Upload className="w-7 h-7 text-white/20 group-hover:text-[#7c5cfc]/60 transition-colors" />
                </div>
                <p className="text-base text-white/60 mb-1">
                  Drop file here or <span className="text-[#7c5cfc]">click to browse</span>
                </p>
                <p className="text-[10px] text-white/25 font-mono">PDF, DOCX, PNG, JPG — Max 50MB</p>
              </div>
            )}
          </div>

          {/* Inline preview for images */}
          {file && file.type.startsWith('image/') && (
            <div>
              <button onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white/70 font-mono transition-colors mb-2">
                {showPreview ? '▲ Hide Preview' : '▼ Show Preview'}
              </button>
              <AnimatePresence>
                {showPreview && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden rounded-xl border border-white/[0.08]">
                    <FileRenderer localFile={file} compact />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Form */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-4">
            <div>
              <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Document Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter document name"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 resize-none transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Classification</label>
                <select value={classification} onChange={(e) => setClassification(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#7c5cfc]/50 transition-colors">
                  <option value="UNCLASSIFIED">Unclassified</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="SECRET">Secret</option>
                  <option value="TOP SECRET">Top Secret</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">NFT Type</label>
                <select value={String(transferable)} onChange={(e) => setTransferable(e.target.value === 'true')}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#7c5cfc]/50 transition-colors">
                  <option value="true">Transferable</option>
                  <option value="false">Soulbound</option>
                </select>
              </div>
            </div>
          </div>

          {/* Wallet Status */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ff88] shadow-[0_0_6px_#00ff88]' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                {isConnected ? `Wallet: ${address?.slice(0, 8)}...${address?.slice(-6)}` : 'Wallet not connected (optional for mint)'}
              </span>
            </div>
            {chain && <span className="text-[9px] font-mono text-white/25">{chain.name}</span>}
          </div>

          {/* Security notice */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#7c5cfc]/5 border border-[#7c5cfc]/10">
            <Lock className="w-4 h-4 text-[#7c5cfc] shrink-0" />
            <p className="text-[10px] text-white/40 font-mono">
              SHA-256 hashed server-side · AES-256-GCM encrypted at rest · Stored in R2 · NFT minted via Sentinel relayer
            </p>
          </div>

          {/* Upload Button */}
          <button onClick={handleUpload} disabled={!file || !name}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-sm font-bold tracking-wider uppercase disabled:opacity-25 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-[#7c5cfc]/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" /> Upload & Secure Document
          </button>
        </motion.div>
      )}

      {/* Stage: Uploading */}
      {stage === 'uploading' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-10 rounded-2xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5 text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-[#7c5cfc]/20 animate-ping" />
            <div className="w-20 h-20 rounded-full bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#7c5cfc] animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Processing Document</h3>
            <p className="text-xs text-white/50 font-mono">Please wait while we secure your document...</p>
          </div>
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-[9px] font-mono">
            {['Validating', 'SHA-256 Hash', 'AES-256-GCM', 'Cloud Storage'].map(step => (
              <div key={step} className="flex items-center gap-1.5 p-2 rounded-lg border border-[#7c5cfc]/20 bg-[#7c5cfc]/5 text-[#7c5cfc]">
                <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                {step}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stage: Stored — Ready to Mint */}
      {stage === 'stored' && uploadResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Success card */}
          <div className="p-6 rounded-2xl border border-[#00ff88]/20 bg-[#00ff88]/5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-[#00ff88]/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#00ff88]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Document Secured</h3>
                <p className="text-[9px] text-white/40 font-mono uppercase tracking-widest">
                  {uploadResult.document.encrypted ? 'ENCRYPTED · ' : ''}STORED · READY TO MINT
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
              <div className="p-3 rounded-xl bg-black/20 border border-white/[0.06]">
                <div className="text-white/25 mb-1">Document ID</div>
                <div className="text-[#00ff88] text-[9px]">{uploadResult.document.document_id}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/[0.06]">
                <div className="text-white/25 mb-1">File Size</div>
                <div className="text-white/70">{formatBytes(uploadResult.document.fileSize)}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/[0.06]">
                <div className="text-white/25 mb-1">Storage</div>
                <div className="text-white/70">{uploadResult.document.storageProvider}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/[0.06]">
                <div className="text-white/25 mb-1">Encryption</div>
                <div className="text-[#fbbf24]">{uploadResult.document.encrypted ? '🔒 AES-256-GCM' : 'None'}</div>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-black/20 border border-white/[0.06]">
                <div className="text-white/25 mb-1">SHA-256 Hash</div>
                <div className="text-white/40 break-all text-[8px]">{uploadResult.document.contentHash}</div>
              </div>
            </div>
          </div>

          {/* Mint Section */}
          <div className="p-6 rounded-2xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#7c5cfc]" /> Mint as Document NFT
            </h4>
            <div className="space-y-2 text-[10px] font-mono mb-5">
              {[
                { label: 'Document', value: uploadResult.document.name },
                { label: 'Recipient', value: address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Server-side relayer', color: address ? '#00ff88' : undefined },
                { label: 'Network', value: chain ? chain.name : getNetworkName() },
                { label: 'NFT Type', value: transferable ? 'Transferable' : 'Soulbound (Non-transferable)' },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-white/30">{row.label}:</span>
                  <span style={{ color: row.color || 'rgba(255,255,255,0.7)' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <button onClick={handleMint} disabled={isMinting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-sm font-bold tracking-wider uppercase disabled:opacity-40 hover:shadow-lg hover:shadow-[#7c5cfc]/25 transition-all flex items-center justify-center gap-2">
              {isMinting ? <><Loader2 className="w-4 h-4 animate-spin" /> Minting via Relayer...</> : <><Zap className="w-4 h-4" /> Mint Document NFT</>}
            </button>
          </div>

          <Link href="/dashboard/documents"
            className="block text-center text-[10px] text-white/30 hover:text-white/50 font-mono uppercase tracking-wider transition-colors">
            Skip — mint later from document details →
          </Link>
        </motion.div>
      )}

      {/* Stage: Minting */}
      {stage === 'minting' && !mintResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-10 rounded-2xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5 text-center space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-[#7c5cfc]/20 animate-ping" />
            <div className="w-20 h-20 rounded-full bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#7c5cfc] animate-spin" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white">Minting Document NFT</h3>
          <p className="text-xs text-white/50 font-mono">Waiting for blockchain confirmation via Sentinel relayer...</p>
        </motion.div>
      )}

      {/* Stage: Minted — Success */}
      {stage === 'minted' && mintResult && uploadResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="p-6 rounded-2xl border border-[#00ff88]/30 bg-[#00ff88]/5">
            <div className="text-center mb-6">
              <div className="relative mx-auto w-20 h-20 mb-4">
                <div className="absolute inset-0 rounded-full bg-[#00ff88]/10 animate-ping" />
                <div className="w-20 h-20 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-[#00ff88]" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">Document NFT Minted!</h3>
              <p className="text-xs text-white/40 font-mono mt-1 uppercase tracking-widest">NFT #{mintResult.tokenId} · Permanently On-Chain</p>
            </div>

            <div className="space-y-3 text-[10px] font-mono">
              {[
                { label: 'Document', value: uploadResult.document.name },
                { label: 'Document ID', value: uploadResult.document.document_id, color: '#00ff88' },
                { label: 'NFT Token ID', value: `#${mintResult.tokenId}`, color: '#7c5cfc' },
                { label: 'Owner', value: address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Relayer', color: '#00ff88' },
                { label: 'TX Hash', value: mintResult.txHash, copyable: true },
                { label: 'Block', value: String(mintResult.blockNumber) },
                { label: 'Gas Used', value: Number(mintResult.gasUsed).toLocaleString() },
                { label: 'Gas Cost', value: `${mintResult.gasCostEth} ETH`, color: '#fbbf24' },
                { label: 'Network', value: chain?.name || getNetworkName() },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-white/30">{row.label}:</span>
                  <span className="flex items-center gap-1.5 text-right max-w-[60%]" style={{ color: row.color || 'rgba(255,255,255,0.7)' }}>
                    <span className="truncate">{row.value?.toString().slice(0, 30)}{row.value && row.value.toString().length > 30 ? '...' : ''}</span>
                    {row.copyable && (
                      <button onClick={() => copyToClipboard(row.value!.toString())}
                        className="shrink-0 p-0.5 hover:text-white/70 transition-colors"><Copy className="w-3 h-3" /></button>
                    )}
                    {row.label === 'TX Hash' && getExplorerTxUrl(mintResult.txHash, chain?.id) && (
                      <a href={getExplorerTxUrl(mintResult.txHash, chain?.id)!} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 p-0.5 hover:text-white/70 transition-colors"><ExternalLink className="w-3 h-3" /></a>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/nfts"
              className="py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-xs font-mono uppercase tracking-wider text-center hover:bg-white/[0.06] hover:text-white transition-all">
              View NFT Gallery
            </Link>
            <button onClick={resetForm}
              className="py-3.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-xs font-mono uppercase tracking-wider hover:shadow-lg hover:shadow-[#7c5cfc]/25 transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Upload Another
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
