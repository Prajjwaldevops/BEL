'use client';

import { motion } from 'framer-motion';
import { ScrollText, CheckCircle2, XCircle, AlertCircle, Search, Filter, Download } from 'lucide-react';
import { demoAuditLogs } from '@/lib/demo-data';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const resultColors: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  SUCCESS: { bg: 'rgba(0,255,136,0.08)', text: '#00ff88', icon: CheckCircle2 },
  DENIED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', icon: XCircle },
  ERROR: { bg: 'rgba(245,158,11,0.08)', text: '#f59e0b', icon: AlertCircle },
};

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
          <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            IMMUTABLE AUDIT LOG — {demoAuditLogs.length} RECORDS
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] text-xs text-[#9aa0a8] hover:text-white hover:border-[rgba(0,240,255,0.2)] transition-all">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search audit logs..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#e8eaed] placeholder-[#5a6068] focus:outline-none focus:border-[rgba(0,240,255,0.2)]" style={{ fontFamily: 'var(--font-mono)' }} />
        </div>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
        {demoAuditLogs.map((log, i) => {
          const result = resultColors[log.result] || resultColors.SUCCESS;
          const ResultIcon = result.icon;
          return (
            <motion.div key={log.id} variants={fadeInUp} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mt-0.5" style={{ background: result.bg }}>
                    <ResultIcon className="w-4 h-4" style={{ color: result.text }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-white">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: result.bg, color: result.text, fontFamily: 'var(--font-mono)' }}>{log.result}</span>
                    </div>
                    <p className="text-xs text-[#9aa0a8] mb-2">{log.details}</p>
                    <div className="flex items-center gap-4 flex-wrap text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
                      <span>Actor: <span className="text-[#e8eaed]">{log.actor}</span></span>
                      <span>Role: <span className="text-[#a855f7]">{log.actorRole}</span></span>
                      <span>Resource: <span className="text-[#00f0ff]">{log.resource}</span></span>
                      {log.txHash && <span>Tx: <span className="text-[#00f0ff]">{log.txHash}</span></span>}
                      <span>IP: {log.ipAddress}</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-[#5a6068] whitespace-nowrap" style={{ fontFamily: 'var(--font-mono)' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
