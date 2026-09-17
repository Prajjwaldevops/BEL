'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Boxes, Search, Filter, Plus, Eye, ArrowRightLeft, ShieldOff,
  CheckCircle2, Clock, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { demoAssets } from '@/lib/demo-data';
import Link from 'next/link';

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: 'rgba(0,255,136,0.08)', text: '#00ff88', border: 'rgba(0,255,136,0.2)' },
  TRANSFERRED: { bg: 'rgba(245,158,11,0.08)', text: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  AUDITED: { bg: 'rgba(0,240,255,0.08)', text: '#00f0ff', border: 'rgba(0,240,255,0.2)' },
  MAINTENANCE: { bg: 'rgba(168,85,247,0.08)', text: '#a855f7', border: 'rgba(168,85,247,0.2)' },
  REVOKED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  REGISTERED: { bg: 'rgba(59,130,246,0.08)', text: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  ACTIVE: CheckCircle2,
  TRANSFERRED: ArrowRightLeft,
  AUDITED: Eye,
  MAINTENANCE: Clock,
  REVOKED: ShieldOff,
  REGISTERED: Boxes,
};

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredAssets = demoAssets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || asset.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Digital Assets</h1>
          <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            {demoAssets.length} ASSETS REGISTERED — NFT-BACKED OWNERSHIP
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#00f0ff] to-[#0ea5e9] text-[#050508] text-xs font-bold tracking-wider uppercase hover:shadow-[0_0_30px_rgba(0,240,255,0.3)] transition-all">
          <Plus className="w-4 h-4" />
          Register Asset
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by asset ID, name, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#e8eaed] placeholder-[#5a6068] focus:outline-none focus:border-[rgba(0,240,255,0.2)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#5a6068]" />
          {['ALL', 'ACTIVE', 'TRANSFERRED', 'AUDITED', 'REVOKED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-[10px] tracking-[0.1em] uppercase transition-all ${
                filterStatus === status
                  ? 'bg-[rgba(0,240,255,0.1)] text-[#00f0ff] border border-[rgba(0,240,255,0.2)]'
                  : 'text-[#5a6068] hover:text-[#9aa0a8] border border-transparent'
              }`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Asset table */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
          <div className="col-span-1 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>ID</div>
          <div className="col-span-3 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Asset</div>
          <div className="col-span-1 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Category</div>
          <div className="col-span-2 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Owner</div>
          <div className="col-span-1 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Status</div>
          <div className="col-span-1 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>NFT</div>
          <div className="col-span-2 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Tx Hash</div>
          <div className="col-span-1 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase text-right" style={{ fontFamily: 'var(--font-mono)' }}>Actions</div>
        </div>

        {/* Table rows */}
        {filteredAssets.map((asset, i) => {
          const statusColor = statusColors[asset.status] || statusColors.ACTIVE;
          const StatusIcon = statusIcons[asset.status] || CheckCircle2;
          return (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
            >
              <div className="col-span-1 text-xs text-[#00f0ff] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
                {asset.id}
              </div>
              <div className="col-span-3">
                <div className="text-xs text-white font-medium truncate">{asset.name}</div>
                <div className="text-[10px] text-[#5a6068] truncate mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                  {asset.classification}
                </div>
              </div>
              <div className="col-span-1 text-[10px] text-[#9aa0a8]" style={{ fontFamily: 'var(--font-mono)' }}>
                {asset.category}
              </div>
              <div className="col-span-2">
                <div className="text-xs text-[#e8eaed]">{asset.currentOwner}</div>
                <div className="text-[10px] text-[#5a6068] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                  prev: {asset.previousOwner}
                </div>
              </div>
              <div className="col-span-1">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]"
                  style={{
                    background: statusColor.bg,
                    color: statusColor.text,
                    border: `1px solid ${statusColor.border}`,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {asset.status}
                </span>
              </div>
              <div className="col-span-1 text-xs text-[#a855f7]" style={{ fontFamily: 'var(--font-mono)' }}>
                {asset.nftTokenId}
              </div>
              <div className="col-span-2 text-[10px] text-[#5a6068] truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                {asset.txHash.slice(0, 20)}...
              </div>
              <div className="col-span-1 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/dashboard/lifecycle?asset=${asset.id}`}
                  className="p-1.5 rounded-lg hover:bg-[rgba(0,240,255,0.1)] transition-colors"
                  title="View Lifecycle"
                >
                  <Eye className="w-3.5 h-3.5 text-[#00f0ff]" />
                </Link>
                <button className="p-1.5 rounded-lg hover:bg-[rgba(168,85,247,0.1)] transition-colors" title="Transfer">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#a855f7]" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors" title="View on Chain">
                  <ExternalLink className="w-3.5 h-3.5 text-[#5a6068]" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
