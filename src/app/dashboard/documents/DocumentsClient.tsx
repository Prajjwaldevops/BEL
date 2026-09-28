'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FileText, Search, Upload, CheckCircle2, AlertCircle, Download,
  Shield, Coins, XCircle, Clock, Filter, ChevronLeft, ChevronRight, Eye, Hash, Lock
} from 'lucide-react';

interface DocumentRecord {
  id: string;
  document_id: string;
  name: string;
  classification: string;
  status: string;
  mint_status: string;
  content_hash: string;
  owner_wallet: string | null;
  nft_token_id: string | null;
  created_at: string;
  file_size: number;
  mime_type: string;
  encryption_method: string | null;
  verification_count: number;
  expires_at: string | null;
}

const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  VERIFIED: { bg: 'rgba(0,255,136,0.08)', text: '#00ff88', icon: CheckCircle2 },
  ACTIVE: { bg: 'rgba(0,255,136,0.08)', text: '#00ff88', icon: CheckCircle2 },
  PENDING: { bg: 'rgba(251,191,36,0.08)', text: '#fbbf24', icon: Clock },
  MINTED: { bg: 'rgba(124,92,252,0.08)', text: '#7c5cfc', icon: Coins },
  STORED: { bg: 'rgba(56,189,248,0.08)', text: '#38bdf8', icon: Shield },
  REVOKED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', icon: XCircle },
  EXPIRED: { bg: 'rgba(156,163,175,0.08)', text: '#9ca3af', icon: AlertCircle },
  FAILED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', icon: XCircle },
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      setDocuments(data.documents || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [page, statusFilter]);

  const handleSearch = () => { setPage(1); fetchDocuments(); };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const getStatusConfig = (doc: DocumentRecord) => {
    // Show mint_status if more specific
    const key = doc.mint_status === 'MINTED' ? 'MINTED' :
                doc.status === 'REVOKED' ? 'REVOKED' :
                doc.status || doc.mint_status || 'PENDING';
    return statusColors[key] || statusColors.PENDING;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Documents</h1>
          <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase mt-0.5">
            SECURE DOCUMENT VAULT — {total} DOCUMENTS
          </p>
        </div>
        <Link href="/dashboard/documents/upload"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-xs font-bold tracking-wider uppercase hover:shadow-lg hover:shadow-[#7c5cfc]/20 transition-all">
          <Upload className="w-4 h-4" /> Upload Document
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/30 font-mono"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-white/20" />
          {['', 'VERIFIED', 'PENDING', 'REVOKED'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wider uppercase transition-all ${
                statusFilter === s
                  ? 'bg-[#7c5cfc]/20 text-[#7c5cfc] border border-[#7c5cfc]/30'
                  : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:bg-white/[0.06]'
              }`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-white/30 mt-3 font-mono">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="py-16 text-center">
          <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40">No documents found</p>
          <Link href="/dashboard/documents/upload" className="text-xs text-[#7c5cfc] hover:text-[#6b4dd9] mt-2 inline-block font-mono">
            Upload your first document →
          </Link>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {documents.map((doc) => {
            const statusCfg = getStatusConfig(doc);
            const StatusIcon = statusCfg.icon;
            const displayStatus = doc.mint_status === 'MINTED' ? 'MINTED' : doc.status;
            return (
              <Link key={doc.id} href={`/dashboard/documents?view=${doc.id}`}>
                <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: statusCfg.bg }}>
                        <FileText className="w-4 h-4" style={{ color: statusCfg.text }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-white truncate">{doc.name}</h3>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase shrink-0"
                            style={{ background: statusCfg.bg, color: statusCfg.text }}>
                            <StatusIcon className="w-2.5 h-2.5" />{displayStatus}
                          </span>
                          {doc.nft_token_id && (
                            <span className="px-2 py-0.5 rounded bg-[#7c5cfc]/10 text-[#7c5cfc] text-[8px] font-mono">
                              NFT #{doc.nft_token_id}
                            </span>
                          )}
                          {doc.encryption_method && <Lock className="w-3 h-3 text-amber-400/50" title="Encrypted" />}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[9px] font-mono text-white/25">
                          <span>{doc.document_id}</span>
                          <span>{formatBytes(doc.file_size)}</span>
                          <span>{doc.classification}</span>
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          {doc.verification_count > 0 && <span className="text-[#00ff88]">✓ {doc.verification_count} verifications</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded hover:bg-white/[0.06]" title="View"><Eye className="w-3.5 h-3.5 text-white/40" /></button>
                      <button className="p-1.5 rounded hover:bg-white/[0.06]" title="Download"><Download className="w-3.5 h-3.5 text-white/40" /></button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </motion.div>
      )}

      {/* Pagination */}
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

      {/* Detail Modal (Simulated via state or search param handling in full app) */}
      {/* For Phase 11-13 requirements, we implement the UI components for supersession and minting */}
      {documents.length > 0 && (
        <DocumentDetailModal doc={documents[0]} /> // Placeholder showing how it connects
      )}
    </div>
  );
}

// Inline DocumentDetailModal for phase requirements
function DocumentDetailModal({ doc }: { doc: DocumentRecord | null }) {
  const [minting, setMinting] = useState(false);
  const [superseding, setSuperseding] = useState(false);
  const [newVersionId, setNewVersionId] = useState('');

  if (!doc) return null;

  const handleMint = async () => {
    setMinting(true);
    try {
      const res = await fetch('/api/documents/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Minted successfully! TX: ${data.receipt.transactionHash}`);
    } catch (err) {
      alert(`Mint failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setMinting(false);
    }
  };

  const handleSupersede = async () => {
    setSuperseding(true);
    try {
      const res = await fetch(`/api/documents/supersede`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldDocumentId: doc.id, newDocumentId: newVersionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Superseded! Old document revoked, linked to new version.`);
    } catch (err) {
      alert(`Supersede failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSuperseding(false);
    }
  };

  return (
    <div className="hidden" id="document-detail-modal">
      <div className="p-6 rounded-xl border border-white/[0.06] bg-black/80 fixed inset-10 z-50 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Document Details: {doc.name}</h2>
        
        {/* Supersession UI */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <h3 className="text-sm font-bold text-amber-500 mb-2">Document Supersession</h3>
          <p className="text-xs text-white/50 mb-4">Revoke this document and point to a newer version.</p>
          <div className="flex gap-2">
            <input type="text" value={newVersionId} onChange={e => setNewVersionId(e.target.value)}
              placeholder="New Document UUID" className="flex-1 px-3 py-2 rounded bg-black/50 border border-white/10 text-white text-xs" />
            <button onClick={handleSupersede} disabled={superseding || !newVersionId}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded">
              {superseding ? 'Superseding...' : 'Supersede Document'}
            </button>
          </div>
        </div>

        {/* Server-Side Minting UI */}
        <div className="p-4 rounded-xl bg-[#7c5cfc]/10 border border-[#7c5cfc]/20">
          <h3 className="text-sm font-bold text-[#7c5cfc] mb-2">Mint NFT (Server-Side)</h3>
          <p className="text-xs text-white/50 mb-4">Mint this document to the blockchain via the Sentinel relayer.</p>
          <button onClick={handleMint} disabled={minting || doc.mint_status === 'MINTED'}
            className="px-4 py-2 bg-[#7c5cfc] hover:bg-[#6b4dd9] text-white text-xs font-bold rounded">
            {minting ? 'Minting...' : doc.mint_status === 'MINTED' ? 'Already Minted' : 'Mint Document NFT'}
          </button>
        </div>
      </div>
    </div>
  );
}
