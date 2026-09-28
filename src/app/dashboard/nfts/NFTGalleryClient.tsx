'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Shield, CheckCircle2, XCircle, Clock, FileText, Hash,
  Lock, ExternalLink, Copy, AlertTriangle, Search, Filter,
  Zap, RefreshCw, BarChart3, TrendingUp, X, ChevronDown,
  Fingerprint, ShieldCheck, ArrowRightLeft, Star
} from 'lucide-react';

interface MintedDoc {
  id: string;
  document_id: string;
  name: string;
  classification: string;
  status: string;
  mint_status: string;
  nft_token_id: string;
  nft_contract_address: string;
  owner_wallet: string;
  chain_id: number;
  mint_tx_hash: string;
  mint_block_number: number;
  content_hash: string;
  transferable: boolean;
  created_at: string;
  file_size: number;
  verification_count: number;
  mint_gas_used: string | null;
  mint_gas_price: string | null;
  mime_type?: string;
}

const CLASSIFICATION_CONFIG: Record<string, { text: string; bg: string; border: string; label: string }> = {
  UNCLASSIFIED: { text: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', label: 'UNCLASS' },
  CONFIDENTIAL: { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', label: 'CONF' },
  SECRET:       { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', label: 'SECRET' },
  'TOP SECRET': { text: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', label: 'TS//SCI' },
};

const MIME_LABELS: Record<string, { label: string; emoji: string }> = {
  'application/pdf': { label: 'PDF', emoji: '📄' },
  'image/png': { label: 'PNG', emoji: '🖼' },
  'image/jpeg': { label: 'JPG', emoji: '🖼' },
  'image/jpg': { label: 'JPG', emoji: '🖼' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', emoji: '📝' },
};

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

/* ─── NFT Card ─── */
function NFTCard({ nft, walletAddress, onClick }: {
  nft: MintedDoc; walletAddress?: string; onClick: () => void;
}) {
  const isOwner = walletAddress && nft.owner_wallet?.toLowerCase() === walletAddress.toLowerCase();
  const isRevoked = nft.status === 'REVOKED';
  const classCfg = CLASSIFICATION_CONFIG[nft.classification] || CLASSIFICATION_CONFIG.UNCLASSIFIED;
  const mimeInfo = MIME_LABELS[nft.mime_type || ''] || { label: 'DOC', emoji: '📁' };
  const gasCostEth = nft.mint_gas_used && nft.mint_gas_price
    ? (Number(BigInt(nft.mint_gas_used) * BigInt(nft.mint_gas_price)) / 1e18).toFixed(6)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onClick}
      className={`relative rounded-2xl border overflow-hidden cursor-pointer group transition-shadow hover:shadow-2xl ${
        isRevoked
          ? 'border-red-500/20 hover:border-red-500/40 hover:shadow-red-500/10'
          : 'border-white/[0.08] hover:border-[#7c5cfc]/40 hover:shadow-[#7c5cfc]/10'
      }`}
      style={{ background: 'rgba(10,6,20,0.7)' }}
    >
      {/* NFT Art Header */}
      <div className="relative h-36 overflow-hidden"
        style={{
          background: isRevoked
            ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(127,29,29,0.08) 100%)'
            : 'linear-gradient(135deg, rgba(124,92,252,0.12) 0%, rgba(99,102,241,0.06) 50%, rgba(167,139,250,0.1) 100%)'
        }}>
        {/* Grid Pattern */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(124,92,252,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,252,0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />

        {/* Glow orb */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full opacity-20 blur-2xl"
          style={{ background: isRevoked ? '#ef4444' : '#7c5cfc' }} />

        {/* Token ID + File Type */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <div>
            <div className="text-3xl font-bold font-mono" style={{ color: isRevoked ? '#ef4444' : '#7c5cfc' }}>
              #{nft.nft_token_id}
            </div>
            <div className="text-[8px] text-white/30 font-mono uppercase tracking-widest mt-0.5">NFT TOKEN ID</div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-2xl">{mimeInfo.emoji}</span>
            <div className="px-2 py-0.5 rounded border text-[8px] font-mono uppercase"
              style={{ color: classCfg.text, background: classCfg.bg, borderColor: classCfg.border }}>
              {classCfg.label}
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isRevoked ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[8px] font-mono border border-red-500/20">
                <XCircle className="w-2.5 h-2.5" /> REVOKED
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00ff88]/10 text-[#00ff88] text-[8px] font-mono border border-[#00ff88]/20">
                <CheckCircle2 className="w-2.5 h-2.5" /> ON-CHAIN
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-md text-[8px] font-mono border ${
              nft.transferable
                ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20'
                : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
            }`}>
              {nft.transferable ? '⟷ TRANSFER' : '⚓ SOULBOUND'}
            </span>
          </div>
          {isOwner && (
            <span className="px-2 py-0.5 rounded-md bg-[#7c5cfc]/15 text-[#7c5cfc] text-[8px] font-mono border border-[#7c5cfc]/25">
              ★ OWNED
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-medium text-white truncate leading-tight">{nft.name}</h3>
          <p className="text-[9px] font-mono text-white/25 mt-0.5 truncate">{nft.document_id}</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <div className="text-white/25 mb-0.5">VERIFICATIONS</div>
            <div className="text-[#00ff88] font-medium">{nft.verification_count || 0}</div>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <div className="text-white/25 mb-0.5">BLOCK</div>
            <div className="text-white/60 font-medium">{nft.mint_block_number || '—'}</div>
          </div>
          {gasCostEth && (
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div className="text-white/25 mb-0.5">GAS COST</div>
              <div className="text-amber-400 font-medium">{gasCostEth} ETH</div>
            </div>
          )}
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <div className="text-white/25 mb-0.5">FILE SIZE</div>
            <div className="text-white/60">{formatBytes(nft.file_size)}</div>
          </div>
        </div>

        {/* Owner */}
        <div className="flex items-center justify-between text-[9px] font-mono">
          <span className="text-white/25">Owner</span>
          <span className={`flex items-center gap-1 ${isOwner ? 'text-[#00ff88]' : 'text-white/40'}`}>
            {isOwner && <span className="text-[7px] bg-[#00ff88]/10 border border-[#00ff88]/20 px-1.5 rounded">YOU</span>}
            {nft.owner_wallet?.slice(0, 8)}...{nft.owner_wallet?.slice(-6)}
          </span>
        </div>

        {/* Hash Preview */}
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[7px] text-white/15 mb-0.5 font-mono uppercase">SHA-256</p>
          <p className="text-[8px] text-white/25 font-mono truncate">{nft.content_hash?.slice(0, 40)}...</p>
        </div>

        {/* View Button */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[8px] text-white/20 font-mono">
            {new Date(nft.created_at).toLocaleDateString()}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] font-mono text-[#7c5cfc]">
            View details →
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Detail Modal ─── */
function NFTDetailModal({ nft, onClose }: { nft: MintedDoc; onClose: () => void }) {
  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);
  const isRevoked = nft.status === 'REVOKED';
  const classCfg = CLASSIFICATION_CONFIG[nft.classification] || CLASSIFICATION_CONFIG.UNCLASSIFIED;
  const gasCostEth = nft.mint_gas_used && nft.mint_gas_price
    ? (Number(BigInt(nft.mint_gas_used) * BigInt(nft.mint_gas_price)) / 1e18).toFixed(6)
    : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-[#0a0614]/98 border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="relative h-48 overflow-hidden"
          style={{
            background: isRevoked
              ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(127,29,29,0.1))'
              : 'linear-gradient(135deg, rgba(124,92,252,0.2), rgba(99,102,241,0.1), rgba(167,139,250,0.15))'
          }}>
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(124,92,252,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,252,0.06) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-5xl font-bold font-mono mb-1" style={{ color: isRevoked ? '#ef4444' : '#7c5cfc' }}>
                  #{nft.nft_token_id}
                </div>
                <h2 className="text-lg font-bold text-white">{nft.name}</h2>
                <p className="text-[9px] text-white/40 font-mono mt-1">{nft.document_id}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={onClose}
                  className="p-2 rounded-xl bg-black/30 border border-white/[0.1] text-white/60 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
                <span className="px-2 py-0.5 rounded border text-[8px] font-mono uppercase"
                  style={{ color: classCfg.text, background: classCfg.bg, borderColor: classCfg.border }}>
                  {nft.classification}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {isRevoked ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[9px] font-mono border border-red-500/20">
                <XCircle className="w-3 h-3" /> REVOKED
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00ff88]/10 text-[#00ff88] text-[9px] font-mono border border-[#00ff88]/20">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED ON-CHAIN
              </span>
            )}
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono border ${
              nft.transferable ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
            }`}>
              {nft.transferable ? <><ArrowRightLeft className="w-3 h-3" /> TRANSFERABLE</> : <><Lock className="w-3 h-3" /> SOULBOUND</>}
            </span>
          </div>

          {/* Chain Details */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
            <h3 className="text-[9px] text-white/30 font-mono uppercase tracking-widest">Blockchain Details</h3>
            {[
              { label: 'Contract', value: nft.nft_contract_address, canCopy: true },
              { label: 'TX Hash', value: nft.mint_tx_hash, canCopy: true },
              { label: 'Block Number', value: String(nft.mint_block_number || '—'), canCopy: false },
              { label: 'Owner', value: nft.owner_wallet, canCopy: true },
              gasCostEth ? { label: 'Gas Cost', value: `${gasCostEth} ETH`, canCopy: false, color: '#fbbf24' } : null,
              { label: 'Verifications', value: String(nft.verification_count || 0), canCopy: false, color: '#00ff88' },
            ].filter(Boolean).map(row => (
              <div key={row!.label} className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/25 shrink-0">{row!.label}</span>
                <span className="flex items-center gap-1.5 text-right max-w-[60%]" style={{ color: row!.color || 'rgba(255,255,255,0.5)' }}>
                  <span className="truncate">{row!.value?.slice(0, 28)}{row!.value && row!.value.length > 28 ? '...' : ''}</span>
                  {row!.canCopy && row!.value && (
                    <button onClick={() => copyToClipboard(row!.value!)}
                      className="shrink-0 p-1 rounded hover:bg-white/[0.08] text-white/20 hover:text-white/50 transition-all">
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Content Hash */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[9px] text-white/30 font-mono uppercase tracking-widest">SHA-256 Content Hash</h3>
              <button onClick={() => copyToClipboard(nft.content_hash)}
                className="p-1 rounded hover:bg-white/[0.08] text-white/20 hover:text-white/50 transition-all">
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[8px] text-white/40 font-mono break-all">{nft.content_hash}</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <a href="/dashboard/verification"
              className="py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-xs font-mono uppercase tracking-wider text-center hover:bg-white/[0.06] hover:text-white transition-all flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Verify
            </a>
            <button
              className="py-2.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-xs font-mono uppercase tracking-wider hover:shadow-lg hover:shadow-[#7c5cfc]/25 transition-all flex items-center justify-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Block Explorer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────── Main Gallery ──────────────────────────── */
export default function NFTGalleryClient() {
  const [nfts, setNfts] = useState<MintedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'transferable' | 'soulbound'>('all');
  const [selectedNft, setSelectedNft] = useState<MintedDoc | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | undefined>();

  useEffect(() => {
    const sessionStr = localStorage.getItem('bel_session');
    if (sessionStr) {
      try { setWalletAddress(JSON.parse(sessionStr)?.user?.walletAddress || undefined); } catch {}
    }
  }, []);

  const fetchNFTs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents?mint_status=MINTED&limit=50');
      const data = await res.json();
      setNfts(data.documents || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNFTs(); }, []);

  const filtered = nfts.filter(nft => {
    const matchSearch = !search ||
      nft.name.toLowerCase().includes(search.toLowerCase()) ||
      nft.nft_token_id?.includes(search) ||
      nft.document_id?.toLowerCase().includes(search.toLowerCase());
    const matchClass = !classFilter || nft.classification === classFilter;
    const matchType = typeFilter === 'all' ||
      (typeFilter === 'transferable' && nft.transferable) ||
      (typeFilter === 'soulbound' && !nft.transferable);
    return matchSearch && matchClass && matchType;
  });

  // Gallery stats
  const stats = {
    total: nfts.length,
    transferable: nfts.filter(n => n.transferable).length,
    soulbound: nfts.filter(n => !n.transferable).length,
    revoked: nfts.filter(n => n.status === 'REVOKED').length,
    totalVerifications: nfts.reduce((a, n) => a + (n.verification_count || 0), 0),
  };

  const classBreakdown = Object.entries(CLASSIFICATION_CONFIG).map(([key, cfg]) => ({
    label: cfg.label, count: nfts.filter(n => n.classification === key).length, color: cfg.text
  })).filter(v => v.count > 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-[#7c5cfc]/20 animate-ping w-16 h-16" />
          <div className="w-16 h-16 rounded-full bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 flex items-center justify-center">
            <Coins className="w-7 h-7 text-[#7c5cfc]" />
          </div>
        </div>
        <p className="text-sm text-white/40 font-mono">Loading NFT Gallery...</p>
        <p className="text-[10px] text-white/20 font-mono mt-1">Fetching on-chain document records</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Detail Modal */}
      <AnimatePresence>
        {selectedNft && (
          <NFTDetailModal nft={selectedNft} onClose={() => setSelectedNft(null)} />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#7c5cfc]" />
            </div>
            NFT Gallery
          </h1>
          <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase mt-1 ml-[52px]">
            ON-CHAIN DOCUMENT REGISTRY — {nfts.length} MINTED NFTs
          </p>
        </div>
        <button onClick={fetchNFTs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-xs font-mono uppercase tracking-wider hover:bg-white/[0.08] hover:text-white transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total NFTs', value: stats.total, color: '#7c5cfc', icon: Coins },
          { label: 'Transferable', value: stats.transferable, color: '#38bdf8', icon: ArrowRightLeft },
          { label: 'Soulbound', value: stats.soulbound, color: '#fbbf24', icon: Lock },
          { label: 'Revoked', value: stats.revoked, color: '#ef4444', icon: XCircle },
          { label: 'Verifications', value: stats.totalVerifications, color: '#00ff88', icon: ShieldCheck },
        ].map(stat => (
          <div key={stat.label}
            className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity">
              <stat.icon className="w-12 h-12" />
            </div>
            <div className="relative z-10">
              <stat.icon className="w-4 h-4 mb-3" style={{ color: stat.color }} />
              <div className="text-2xl font-light text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</div>
              <div className="text-[9px] text-white/25 font-mono uppercase tracking-widest">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Classification Breakdown */}
      {classBreakdown.length > 0 && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-wrap items-center gap-4">
          <span className="text-[9px] text-white/25 font-mono uppercase tracking-widest shrink-0">Classification</span>
          {classBreakdown.map(cls => (
            <div key={cls.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: cls.color }} />
              <span className="text-[9px] font-mono" style={{ color: cls.color }}>{cls.label}</span>
              <span className="text-[9px] text-white/30 font-mono">({cls.count})</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-white/20" />
            <div className="flex gap-1" style={{ width: 120 }}>
              {classBreakdown.map(cls => (
                <div key={cls.label} className="h-2 rounded-sm transition-all"
                  style={{ background: cls.color, width: `${(cls.count / stats.total) * 100}%`, opacity: 0.7 }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-white/20 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, token ID, or document ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/30 font-mono transition-colors" />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'transferable', 'soulbound'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wider uppercase transition-all border ${
                typeFilter === t
                  ? 'bg-[#7c5cfc]/20 text-[#7c5cfc] border-[#7c5cfc]/30'
                  : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/60'
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {Object.entries(CLASSIFICATION_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setClassFilter(classFilter === key ? '' : key)}
              className={`px-2.5 py-1 rounded-lg text-[8px] font-mono tracking-wider uppercase transition-all border ${
                classFilter === key ? '' : 'bg-white/[0.02] border-white/[0.06] text-white/20 hover:border-white/[0.1]'
              }`}
              style={classFilter === key ? { background: cfg.bg, borderColor: cfg.border, color: cfg.text } : {}}>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gallery Grid ── */}
      {nfts.length === 0 ? (
        <div className="py-24 text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-[#7c5cfc]/5 border border-[#7c5cfc]/10 rotate-12" />
            <div className="absolute inset-0 rounded-2xl bg-[#7c5cfc]/5 border border-[#7c5cfc]/10 -rotate-6" />
            <div className="absolute inset-0 rounded-2xl bg-[#0a0614] border border-white/[0.08] flex items-center justify-center">
              <Coins className="w-10 h-10 text-[#7c5cfc]/40" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white/60 mb-2">No Document NFTs Yet</h3>
          <p className="text-sm text-white/30 mb-6 max-w-sm mx-auto">
            Upload a document from the Doc Vault and mint it as an NFT to build your on-chain document registry.
          </p>
          <a href="/dashboard/documents"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-sm font-bold tracking-wider hover:shadow-lg hover:shadow-[#7c5cfc]/25 transition-all">
            <FileText className="w-4 h-4" /> Go to Doc Vault
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Search className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40">No NFTs match your filters</p>
          <button onClick={() => { setSearch(''); setClassFilter(''); setTypeFilter('all'); }}
            className="mt-3 text-xs text-[#7c5cfc] hover:text-[#a78bfa] font-mono transition-colors">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((nft, i) => (
            <motion.div key={nft.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}>
              <NFTCard nft={nft} walletAddress={walletAddress} onClick={() => setSelectedNft(nft)} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
