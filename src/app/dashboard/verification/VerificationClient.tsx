'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSearch, Upload, Hash, Coins, QrCode, CheckCircle2, XCircle,
  AlertTriangle, Clock, Shield, Loader2, FileText, ExternalLink, ArrowLeft
} from 'lucide-react';
import type { VerificationResult } from '@/lib/types/document';

type VerifyMethod = 'document' | 'file' | 'nft' | null;

const statusStyles: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  VERIFIED: { color: '#00ff88', bg: 'rgba(0,255,136,0.08)', icon: CheckCircle2, label: 'VERIFIED — AUTHENTIC' },
  TAMPERED: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: XCircle, label: 'TAMPERED — HASH MISMATCH' },
  REVOKED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: AlertTriangle, label: 'REVOKED' },
  EXPIRED: { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', icon: Clock, label: 'EXPIRED' },
  NOT_FOUND: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', icon: FileSearch, label: 'NOT FOUND' },
  MISMATCH: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: XCircle, label: 'MISMATCH' },
};

export default function VerificationClient() {
  const [method, setMethod] = useState<VerifyMethod>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [documentId, setDocumentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');

  const reset = () => {
    setResult(null);
    setError(null);
    setDocumentId('');
    setFile(null);
    setContractAddress('');
    setTokenId('');
  };

  const verifyByDocumentId = async () => {
    if (!documentId.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/verify?documentId=${encodeURIComponent(documentId.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Verification failed'); }
    finally { setLoading(false); }
  };

  const verifyByFile = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/verify', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Verification failed'); }
    finally { setLoading(false); }
  };

  const verifyByNFT = async () => {
    if (!contractAddress || !tokenId) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/verify?contractAddress=${contractAddress}&tokenId=${tokenId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Verification failed'); }
    finally { setLoading(false); }
  };

  const statusCfg = result ? statusStyles[result.status] || statusStyles.NOT_FOUND : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Verification Center</h1>
        <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase mt-0.5">
          VERIFY DOCUMENT AUTHENTICITY • DETECT TAMPERING • CHECK BLOCKCHAIN PROOF
        </p>
      </div>

      {/* Method Selection */}
      {!method && !result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'document' as const, icon: Hash, title: 'Verify by Document', desc: 'Enter document ID to check status and authenticity', accent: '#00ff88' },
            { key: 'file' as const, icon: Upload, title: 'Verify by File', desc: 'Upload the original file to compare SHA-256 hash', accent: '#7c5cfc' },
            { key: 'nft' as const, icon: Coins, title: 'Verify by NFT', desc: 'Enter contract address and token ID to verify on-chain', accent: '#38bdf8' },
          ].map(m => (
            <button key={m.key} onClick={() => { setMethod(m.key); reset(); }}
              className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all text-left group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${m.accent}10`, border: `1px solid ${m.accent}30` }}>
                <m.icon className="w-6 h-6" style={{ color: m.accent }} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{m.title}</h3>
              <p className="text-[10px] text-white/30">{m.desc}</p>
            </button>
          ))}
        </motion.div>
      )}

      {/* Verify by Document ID */}
      {method === 'document' && !result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <button onClick={() => setMethod(null)} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 font-mono uppercase tracking-wider">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <div className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Hash className="w-4 h-4 text-[#00ff88]" /> Verify by Document ID</h3>
            <input type="text" value={documentId} onChange={e => setDocumentId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyByDocumentId()}
              placeholder="Enter document ID (e.g. BEL-DOC-00001)"
              className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ff88]/30 font-mono" />
            <button onClick={verifyByDocumentId} disabled={!documentId.trim() || loading}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#00ff88]/80 to-[#10b981] text-[#050508] text-sm font-bold uppercase tracking-wider disabled:opacity-30 hover:shadow-lg transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Verify
            </button>
          </div>
        </motion.div>
      )}

      {/* Verify by File */}
      {method === 'file' && !result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <button onClick={() => setMethod(null)} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 font-mono uppercase tracking-wider">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <div className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-[#7c5cfc]" /> Verify by File</h3>
            <div className="p-6 rounded-lg border-2 border-dashed border-white/10 text-center cursor-pointer hover:border-[#7c5cfc]/30 transition-all"
              onClick={() => document.getElementById('verify-file-input')?.click()}>
              <input id="verify-file-input" type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <div>
                  <FileText className="w-8 h-8 text-[#7c5cfc] mx-auto mb-2" />
                  <p className="text-sm text-white">{file.name}</p>
                  <p className="text-[10px] text-white/30 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-xs text-white/40">Drop or select the original file to verify</p>
                </div>
              )}
            </div>
            <button onClick={verifyByFile} disabled={!file || loading}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-sm font-bold uppercase tracking-wider disabled:opacity-30 hover:shadow-lg transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Verify Hash
            </button>
          </div>
        </motion.div>
      )}

      {/* Verify by NFT */}
      {method === 'nft' && !result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <button onClick={() => setMethod(null)} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 font-mono uppercase tracking-wider">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <div className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Coins className="w-4 h-4 text-[#38bdf8]" /> Verify by NFT</h3>
            <div className="space-y-3">
              <input type="text" value={contractAddress} onChange={e => setContractAddress(e.target.value)}
                placeholder="Contract address (0x...)" className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#38bdf8]/30 font-mono" />
              <input type="text" value={tokenId} onChange={e => setTokenId(e.target.value)}
                placeholder="Token ID" className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#38bdf8]/30 font-mono" />
            </div>
            <button onClick={verifyByNFT} disabled={!contractAddress || !tokenId || loading}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] text-[#050508] text-sm font-bold uppercase tracking-wider disabled:opacity-30 hover:shadow-lg transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Verify On-Chain
            </button>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Verification Result */}
      <AnimatePresence>
        {result && statusCfg && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            {/* Status Banner */}
            <div className="p-6 rounded-xl border text-center" style={{ borderColor: `${statusCfg.color}30`, background: statusCfg.bg }}>
              <statusCfg.icon className="w-16 h-16 mx-auto mb-3" style={{ color: statusCfg.color }} />
              <h2 className="text-2xl font-bold" style={{ color: statusCfg.color }}>{statusCfg.label}</h2>
              <p className="text-xs text-white/50 mt-2 font-mono">{result.message}</p>
              <p className="text-[9px] text-white/20 mt-1 font-mono">Verified at: {new Date(result.verifiedAt).toLocaleString()}</p>
            </div>

            {/* Document Details */}
            {result.document && (
              <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-white/40" /> Document Details</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div><span className="text-white/30">Document ID:</span> <span className="text-[#00ff88]">{result.document.document_id}</span></div>
                  <div><span className="text-white/30">Name:</span> <span className="text-white/70">{result.document.name}</span></div>
                  <div><span className="text-white/30">Classification:</span> <span className="text-white/70">{result.document.classification}</span></div>
                  <div><span className="text-white/30">Version:</span> <span className="text-white/70">v{result.document.version}</span></div>
                  <div><span className="text-white/30">Issued:</span> <span className="text-white/70">{new Date(result.document.issuedAt).toLocaleDateString()}</span></div>
                  {result.document.expiresAt && <div><span className="text-white/30">Expires:</span> <span className="text-amber-400">{new Date(result.document.expiresAt).toLocaleDateString()}</span></div>}
                </div>
              </div>
            )}

            {/* Hashes */}
            {result.hashes && (
              <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-white/40" /> Hash Verification</h4>
                <div className="space-y-2 text-[9px] font-mono">
                  <div><span className="text-white/30">Content Hash (SHA-256):</span><br /><span className="text-white/50 break-all">{result.hashes.contentHash}</span></div>
                  <div><span className="text-white/30">Metadata Hash:</span><br /><span className="text-white/40 break-all">{result.hashes.metadataHash}</span></div>
                  {result.hashes.providedHash && (
                    <div className={`p-2 rounded ${result.hashes.hashMatch ? 'bg-[#00ff88]/5 border border-[#00ff88]/20' : 'bg-red-500/5 border border-red-500/20'}`}>
                      <span className="text-white/30">Provided Hash:</span><br />
                      <span className="break-all" style={{ color: result.hashes.hashMatch ? '#00ff88' : '#ef4444' }}>{result.hashes.providedHash}</span>
                      <br /><span style={{ color: result.hashes.hashMatch ? '#00ff88' : '#ef4444' }}>{result.hashes.hashMatch ? '✓ Match' : '✗ Mismatch — FILE TAMPERED'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NFT Details */}
            {result.nft && result.nft.tokenId && (
              <div className="p-5 rounded-xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5">
                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Coins className="w-3.5 h-3.5 text-[#7c5cfc]" /> NFT Proof</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div><span className="text-white/30">Token ID:</span> <span className="text-[#7c5cfc] font-bold">#{result.nft.tokenId}</span></div>
                  <div><span className="text-white/30">Owner:</span> <span className="text-[#00ff88]">{result.nft.owner?.slice(0, 10)}...{result.nft.owner?.slice(-6)}</span></div>
                  <div className="col-span-2"><span className="text-white/30">Contract:</span> <span className="text-white/40 break-all">{result.nft.contractAddress}</span></div>
                  {result.nft.mintTxHash && (
                    <div className="col-span-2"><span className="text-white/30">Mint TX:</span> <span className="text-white/40 break-all">{result.nft.mintTxHash}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Blockchain Proof */}
            {result.blockchain?.anchored && (
              <div className="p-5 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5">
                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-[#00ff88]" /> Blockchain Anchored</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  {result.blockchain.txHash && <div className="col-span-2"><span className="text-white/30">TX:</span> <span className="text-white/40 break-all">{result.blockchain.txHash}</span></div>}
                  {result.blockchain.blockNumber && <div><span className="text-white/30">Block:</span> <span className="text-white/50">{result.blockchain.blockNumber}</span></div>}
                  {result.blockchain.network && <div><span className="text-white/30">Network:</span> <span className="text-white/50">{result.blockchain.network}</span></div>}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => { setResult(null); setMethod(null); reset(); }}
                className="flex-1 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white text-xs font-mono uppercase tracking-wider text-center hover:bg-white/[0.06] transition-all">
                New Verification
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
