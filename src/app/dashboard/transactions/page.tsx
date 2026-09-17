'use client';

import { ArrowRightLeft } from 'lucide-react';
import { demoBlockchainTxs } from '@/lib/demo-data';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>ALL BLOCKCHAIN TRANSACTIONS — {demoBlockchainTxs.length} RECORDS</p>
      </div>
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
          <div className="grid grid-cols-7 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="col-span-2">Tx Hash</span><span>Block</span><span>Method</span><span>Contract</span><span>Gas</span><span>Status</span>
          </div>
        </div>
        {demoBlockchainTxs.map((tx) => (
          <div key={tx.hash} className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.04)] grid grid-cols-7 text-[10px] hover:bg-[rgba(255,255,255,0.02)] transition-colors items-center" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="col-span-2 text-[#00f0ff] truncate pr-2">{tx.hash}</span>
            <span className="text-[#3b82f6]">#{tx.blockNumber.toLocaleString()}</span>
            <span className="text-[#a855f7]">{tx.method}</span>
            <span className="text-[#e8eaed]">{tx.contract}</span>
            <span className="text-[#f59e0b]">{tx.gasUsed.toLocaleString()}</span>
            <span className={tx.status === 'CONFIRMED' ? 'text-[#00ff88]' : tx.status === 'PENDING' ? 'text-[#f59e0b]' : 'text-[#ef4444]'}>{tx.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
