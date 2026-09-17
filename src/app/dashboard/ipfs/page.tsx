'use client';

import { HardDrive, CheckCircle2, Globe, Hash, Upload, RefreshCw } from 'lucide-react';
import { demoDocuments } from '@/lib/demo-data';

export default function IPFSPage() {
  const pinnedCount = demoDocuments.filter(d => d.pinned).length;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IPFS Storage</h1>
          <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>DECENTRALIZED CONTENT-ADDRESSED STORAGE VIA PINATA</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Objects', value: demoDocuments.length.toString(), color: '#00f0ff', icon: HardDrive },
          { label: 'Pinned', value: pinnedCount.toString(), color: '#00ff88', icon: CheckCircle2 },
          { label: 'Gateway', value: 'Pinata', color: '#a855f7', icon: Globe },
          { label: 'Total Size', value: '13.2 MB', color: '#f59e0b', icon: Upload },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
            <stat.icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
            <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{stat.value}</div>
            <div className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
          <div className="grid grid-cols-6 text-[10px] text-[#5a6068] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
            <span>CID</span><span>Name</span><span>Size</span><span>Hash</span><span>Pinned</span><span>Status</span>
          </div>
        </div>
        {demoDocuments.map((doc) => (
          <div key={doc.id} className="px-5 py-3 border-b border-[rgba(255,255,255,0.04)] grid grid-cols-6 text-[10px] hover:bg-[rgba(255,255,255,0.02)] transition-colors" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="text-[#00ff88] truncate pr-2">{doc.ipfsCid}</span>
            <span className="text-[#e8eaed] truncate pr-2">{doc.name}</span>
            <span className="text-[#9aa0a8]">{doc.size}</span>
            <span className="text-[#5a6068] truncate pr-2">{doc.hash}</span>
            <span>{doc.pinned ? <span className="text-[#00ff88]">● Pinned</span> : <span className="text-[#5a6068]">○ No</span>}</span>
            <span className={doc.status === 'VERIFIED' ? 'text-[#00ff88]' : 'text-[#f59e0b]'}>{doc.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
