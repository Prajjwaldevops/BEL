'use client';

import { motion } from 'framer-motion';
import { FileText, Search, Upload, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { demoDocuments } from '@/lib/demo-data';
import { staggerContainer, fadeInUp } from '@/lib/animations';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>IPFS-BACKED DOCUMENT MANAGEMENT — CONTENT-ADDRESSED INTEGRITY</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#00f0ff] to-[#0ea5e9] text-[#050508] text-xs font-bold tracking-wider uppercase">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Search documents..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#e8eaed] placeholder-[#5a6068] focus:outline-none focus:border-[rgba(0,240,255,0.2)]" style={{ fontFamily: 'var(--font-mono)' }} />
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
        {demoDocuments.map((doc, i) => (
          <motion.div key={doc.id} variants={fadeInUp} className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] hover:border-[rgba(0,255,136,0.1)] transition-all group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.15)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#00ff88]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-white">{doc.name}</h3>
                    {doc.status === 'VERIFIED' ? (
                      <span className="flex items-center gap-1 text-[10px] text-[#00ff88]" style={{ fontFamily: 'var(--font-mono)' }}><CheckCircle2 className="w-3 h-3" /> VERIFIED</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-[#f59e0b]" style={{ fontFamily: 'var(--font-mono)' }}><AlertCircle className="w-3 h-3" /> PENDING</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span><span className="text-[#5a6068]">Type: </span><span className="text-[#9aa0a8]">{doc.type}</span></span>
                    <span><span className="text-[#5a6068]">Size: </span><span className="text-[#9aa0a8]">{doc.size}</span></span>
                    <span><span className="text-[#5a6068]">Asset: </span><span className="text-[#00f0ff]">{doc.assetId}</span></span>
                    <span><span className="text-[#5a6068]">By: </span><span className="text-[#9aa0a8]">{doc.uploadedBy}</span></span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-[9px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span>CID: <span className="text-[#00ff88]">{doc.ipfsCid}</span></span>
                    <span>Hash: <span className="text-[#9aa0a8]">{doc.hash}</span></span>
                    <span>{doc.pinned ? '📌 Pinned' : 'Unpinned'}</span>
                  </div>
                </div>
              </div>
              <button className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[rgba(255,255,255,0.04)] transition-all">
                <Download className="w-4 h-4 text-[#5a6068]" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
