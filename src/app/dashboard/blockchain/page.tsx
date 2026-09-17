'use client';

import { motion } from 'framer-motion';
import { Blocks, CheckCircle2, Clock, Hash, ArrowRightLeft, Fuel } from 'lucide-react';
import { demoBlockchainTxs } from '@/lib/demo-data';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const statusColors: Record<string, { text: string; bg: string }> = {
  CONFIRMED: { text: '#00ff88', bg: 'rgba(0,255,136,0.08)' },
  PENDING: { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  FAILED: { text: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
};

export default function BlockchainPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Blockchain Explorer</h1>
        <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>ON-CHAIN TRANSACTIONS — IMMUTABLE LEDGER</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Latest Block', value: '#14,208,342', color: '#00f0ff' },
          { label: 'Total Transactions', value: '18,432', color: '#00ff88' },
          { label: 'Active Contracts', value: '5', color: '#a855f7' },
          { label: 'Avg Gas Used', value: '149,383', color: '#f59e0b' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
            <div className="text-[10px] text-[#5a6068] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>{stat.label}</div>
            <div className="text-xl font-bold" style={{ color: stat.color, fontFamily: 'var(--font-mono)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
        {demoBlockchainTxs.map((tx, i) => {
          const status = statusColors[tx.status] || statusColors.CONFIRMED;
          return (
            <motion.div key={tx.hash} variants={fadeInUp} className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] hover:border-[rgba(0,240,255,0.1)] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.15)] flex items-center justify-center">
                    <Blocks className="w-5 h-5 text-[#00f0ff]" />
                  </div>
                  <div>
                    <div className="text-xs text-[#00f0ff] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>{tx.hash}</div>
                    <div className="text-[10px] text-[#5a6068] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>Block #{tx.blockNumber.toLocaleString()}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: status.bg, color: status.text, fontFamily: 'var(--font-mono)' }}>{tx.status}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
                <div><span className="text-[#5a6068]">Method: </span><span className="text-[#a855f7]">{tx.method}</span></div>
                <div><span className="text-[#5a6068]">Contract: </span><span className="text-[#e8eaed]">{tx.contract}</span></div>
                <div><span className="text-[#5a6068]">From: </span><span className="text-[#9aa0a8]">{tx.from}</span></div>
                <div className="flex items-center gap-1"><Fuel className="w-3 h-3 text-[#f59e0b]" /><span className="text-[#5a6068]">Gas: </span><span className="text-[#f59e0b]">{tx.gasUsed.toLocaleString()}</span></div>
                <div><span className="text-[#5a6068]">Time: </span><span className="text-[#9aa0a8]">{new Date(tx.timestamp).toLocaleString()}</span></div>
              </div>
              {tx.events.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.04)] flex items-center gap-2">
                  <span className="text-[9px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>Events:</span>
                  {tx.events.map((e) => (
                    <span key={e} className="px-2 py-0.5 rounded bg-[rgba(0,255,136,0.06)] text-[9px] text-[#00ff88] border border-[rgba(0,255,136,0.15)]" style={{ fontFamily: 'var(--font-mono)' }}>{e}</span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
