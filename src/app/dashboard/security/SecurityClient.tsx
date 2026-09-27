'use client';

import { motion } from 'framer-motion';
import { ShieldAlert, AlertTriangle, CheckCircle2, XOctagon, Clock, Wifi } from 'lucide-react';
import { demoSecurityEvents } from '@/lib/demo-data';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const severityConfig: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  LOW: { color: '#00ff88', bg: 'rgba(0,255,136,0.08)', icon: CheckCircle2 },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: AlertTriangle },
  HIGH: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: ShieldAlert },
  CRITICAL: { color: '#ff0040', bg: 'rgba(255,0,64,0.08)', icon: XOctagon },
};

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Security Events</h1>
        <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>THREAT MONITORING — {demoSecurityEvents.filter(e => !e.resolved).length} UNRESOLVED</p>
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
          const config = severityConfig[sev];
          const count = demoSecurityEvents.filter(e => e.severity === sev).length;
          return (
            <div key={sev} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
              <div className="flex items-center gap-2 mb-2">
                <config.icon className="w-4 h-4" style={{ color: config.color }} />
                <span className="text-[10px] tracking-[0.1em]" style={{ color: config.color, fontFamily: 'var(--font-mono)' }}>{sev}</span>
              </div>
              <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{count}</div>
            </div>
          );
        })}
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
        {demoSecurityEvents.map((event, i) => {
          const config = severityConfig[event.severity] || severityConfig.LOW;
          const SevIcon = config.icon;
          return (
            <motion.div key={event.id} variants={fadeInUp} className="p-5 rounded-xl border bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.02)] transition-all" style={{ borderColor: event.resolved ? 'rgba(255,255,255,0.06)' : `${config.color}25` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: config.bg }}>
                    <SevIcon className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium" style={{ color: config.color, fontFamily: 'var(--font-mono)' }}>{event.type.replace(/_/g, ' ')}</span>
                      <span className="px-2 py-0.5 rounded text-[9px]" style={{ background: config.bg, color: config.color, fontFamily: 'var(--font-mono)' }}>{event.severity}</span>
                      {event.resolved ? (
                        <span className="text-[9px] text-[#00ff88]" style={{ fontFamily: 'var(--font-mono)' }}>✓ RESOLVED</span>
                      ) : (
                        <span className="text-[9px] text-[#ef4444] animate-pulse" style={{ fontFamily: 'var(--font-mono)' }}>● ACTIVE</span>
                      )}
                    </div>
                    <p className="text-xs text-[#9aa0a8] mb-2">{event.description}</p>
                    <div className="flex items-center gap-4 text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
                      <span>Actor: <span className="text-[#e8eaed]">{event.actor}</span></span>
                      <span>Source: <span className="text-[#9aa0a8]">{event.source}</span></span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-[#5a6068] whitespace-nowrap" style={{ fontFamily: 'var(--font-mono)' }}>{new Date(event.timestamp).toLocaleString()}</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
