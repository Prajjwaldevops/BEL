'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Shield, CheckCircle2, XCircle, AlertTriangle, Clock, FileSearch,
  FileText, Hash, Coins, Lock, ExternalLink, Upload, Loader2, Crosshair
} from 'lucide-react';
import type { VerificationResult } from '@/lib/types/document';

const statusConfig: Record<string, { color: string; bg: string; gradient: string; icon: typeof CheckCircle2; label: string }> = {
  VERIFIED: { color: '#00ff88', bg: 'rgba(0,255,136,0.06)', gradient: 'from-[#00ff88]/10 to-[#10b981]/5', icon: CheckCircle2, label: 'DOCUMENT VERIFIED' },
  TAMPERED: { color: '#ef4444', bg: 'rgba(239,68,68,0.06)', gradient: 'from-red-500/10 to-red-600/5', icon: XCircle, label: 'TAMPERED — INTEGRITY COMPROMISED' },
  REVOKED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', gradient: 'from-amber-500/10 to-amber-600/5', icon: AlertTriangle, label: 'DOCUMENT REVOKED' },
  EXPIRED: { color: '#9ca3af', bg: 'rgba(156,163,175,0.06)', gradient: 'from-gray-400/10 to-gray-500/5', icon: Clock, label: 'DOCUMENT EXPIRED' },
  NOT_FOUND: { color: '#6b7280', bg: 'rgba(107,114,128,0.06)', gradient: 'from-gray-500/10 to-gray-600/5', icon: FileSearch, label: 'DOCUMENT NOT FOUND' },
  MISMATCH: { color: '#ef4444', bg: 'rgba(239,68,68,0.06)', gradient: 'from-red-500/10 to-red-600/5', icon: XCircle, label: 'HASH MISMATCH' },
};

export default function PublicVerifyPage() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId') || searchParams.get('id') || searchParams.get('cid');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [manualId, setManualId] = useState('');

  // Auto-verify if documentId in URL
  useEffect(() => {
    if (documentId) {
      verifyById(documentId);
    }
  }, [documentId]);

  const verifyById = async (id: string) => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`/api/verify?documentId=${encodeURIComponent(id)}`);
      setResult(await res.json());
    } catch { setResult(null); }
    finally { setLoading(false); }
  };

  const verifyByFile = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/verify', { method: 'POST', body: fd });
      setResult(await res.json());
    } catch { setResult(null); }
    finally { setLoading(false); }
  };

  const cfg = result ? statusConfig[result.status] || statusConfig.NOT_FOUND : null;

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Crosshair className="w-6 h-6 text-white/80" />
            <div>
              <span className="text-sm font-bold tracking-[0.15em] uppercase">BEL SENTINEL</span>
              <span className="text-[8px] text-white/30 ml-2 font-mono tracking-widest">VERIFICATION</span>
            </div>
          </Link>
          <Link href="/login" className="text-[10px] text-white/30 hover:text-white/60 font-mono uppercase tracking-wider">
            Sign In
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-6">
          {/* Title */}
          {!result && (
            <div className="text-center mb-8">
              <Shield className="w-12 h-12 text-[#7c5cfc] mx-auto mb-4" />
              <h1 className="text-2xl font-bold">Document Verification</h1>
              <p className="text-xs text-white/30 mt-2 font-mono">
                Verify the authenticity and integrity of any BEL SENTINEL document
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-[#7c5cfc] animate-spin mx-auto mb-3" />
              <p className="text-xs text-white/40 font-mono">Verifying...</p>
            </div>
          )}

          {/* Input Form (shown when no result) */}
          {!loading && !result && (
            <div className="space-y-4">
              {/* By ID */}
              <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-[#00ff88]" /> Verify by Document ID</h3>
                <div className="flex gap-2">
                  <input type="text" value={manualId} onChange={e => setManualId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && manualId && verifyById(manualId)}
                    placeholder="BEL-DOC-00001"
                    className="flex-1 px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00ff88]/30 font-mono" />
                  <button onClick={() => manualId && verifyById(manualId)} disabled={!manualId}
                    className="px-5 py-2.5 rounded-lg bg-[#00ff88]/10 text-[#00ff88] text-xs font-bold uppercase disabled:opacity-30 hover:bg-[#00ff88]/20 transition-all">
                    Verify
                  </button>
                </div>
              </div>

              {/* By File */}
              <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Upload className="w-3.5 h-3.5 text-[#7c5cfc]" /> Verify by File Upload</h3>
                <div className="p-4 rounded-lg border-2 border-dashed border-white/10 text-center cursor-pointer hover:border-[#7c5cfc]/30 transition-all"
                  onClick={() => document.getElementById('public-verify-file')?.click()}>
                  <input id="public-verify-file" type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                  {file ? (
                    <p className="text-sm text-white">{file.name} <span className="text-white/30">({(file.size / 1024).toFixed(1)} KB)</span></p>
                  ) : (
                    <p className="text-xs text-white/30">Drop or select the original file to compare hashes</p>
                  )}
                </div>
                {file && (
                  <button onClick={verifyByFile}
                    className="mt-3 w-full py-2.5 rounded-lg bg-[#7c5cfc]/10 text-[#7c5cfc] text-xs font-bold uppercase hover:bg-[#7c5cfc]/20 transition-all">
                    Verify File Hash
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {!loading && result && cfg && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Status */}
              <div className={`p-8 rounded-2xl border text-center bg-gradient-to-b ${cfg.gradient}`} style={{ borderColor: `${cfg.color}30` }}>
                <cfg.icon className="w-20 h-20 mx-auto mb-4" style={{ color: cfg.color }} />
                <h2 className="text-2xl font-bold tracking-wider" style={{ color: cfg.color }}>{cfg.label}</h2>
                <p className="text-xs text-white/40 mt-2 max-w-md mx-auto">{result.message}</p>
                <p className="text-[8px] text-white/15 mt-2 font-mono">{new Date(result.verifiedAt).toLocaleString()}</p>
              </div>

              {/* Details */}
              {result.document && (
                <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <h4 className="text-xs font-bold text-white mb-3">Document Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div><span className="text-white/25">ID:</span> <span className="text-[#00ff88]">{result.document.document_id}</span></div>
                    <div><span className="text-white/25">Name:</span> <span className="text-white/60">{result.document.name}</span></div>
                    <div><span className="text-white/25">Class:</span> <span className="text-white/60">{result.document.classification}</span></div>
                    <div><span className="text-white/25">Version:</span> <span className="text-white/60">v{result.document.version}</span></div>
                    <div><span className="text-white/25">Issued:</span> <span className="text-white/60">{new Date(result.document.issuedAt).toLocaleDateString()}</span></div>
                    {result.document.expiresAt && <div><span className="text-white/25">Expires:</span> <span className="text-amber-400">{new Date(result.document.expiresAt).toLocaleDateString()}</span></div>}
                  </div>
                </div>
              )}

              {result.hashes && (
                <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <h4 className="text-xs font-bold text-white mb-3">Cryptographic Proof</h4>
                  <div className="space-y-2 text-[9px] font-mono">
                    <div><span className="text-white/25">SHA-256:</span><br /><span className="text-white/40 break-all">{result.hashes.contentHash}</span></div>
                    {result.hashes.providedHash && (
                      <div className={`p-2 rounded ${result.hashes.hashMatch ? 'bg-[#00ff88]/5 border border-[#00ff88]/20' : 'bg-red-500/5 border border-red-500/20'}`}>
                        <span className="text-white/25">Your file:</span><br />
                        <span className="break-all" style={{ color: result.hashes.hashMatch ? '#00ff88' : '#ef4444' }}>{result.hashes.providedHash}</span>
                        <br /><span style={{ color: result.hashes.hashMatch ? '#00ff88' : '#ef4444' }}>{result.hashes.hashMatch ? '✓ Hashes match — authentic' : '✗ Hashes differ — file modified'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.nft?.tokenId && (
                <div className="p-5 rounded-xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5">
                  <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Coins className="w-3.5 h-3.5 text-[#7c5cfc]" /> On-Chain NFT Proof</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div><span className="text-white/25">Token:</span> <span className="text-[#7c5cfc] font-bold">#{result.nft.tokenId}</span></div>
                    <div><span className="text-white/25">Owner:</span> <span className="text-[#00ff88]">{result.nft.owner?.slice(0, 10)}...{result.nft.owner?.slice(-4)}</span></div>
                  </div>
                </div>
              )}

              <button onClick={() => { setResult(null); setManualId(''); setFile(null); }}
                className="w-full py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white text-xs font-mono uppercase tracking-wider hover:bg-white/[0.06] transition-all">
                Verify Another Document
              </button>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-4">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-[9px] text-white/20 font-mono">
          <span>BEL SENTINEL — Secure Document Verification Platform</span>
          <span>SHA-256 • AES-256-GCM • ERC-721 • Blockchain Anchored</span>
        </div>
      </footer>
    </div>
  );
}
