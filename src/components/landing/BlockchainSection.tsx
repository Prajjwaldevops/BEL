'use client';

import { motion } from 'framer-motion';
import { Blocks, Hash, ArrowRightLeft, Clock, CheckCircle2 } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import GlassCard from '@/components/ui/GlassCard';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const blocks = [
  {
    number: '#14,208,337',
    hash: '0x7a3b9c...f2e1d4',
    prevHash: '0x6f2a8b...e1d0c3',
    transactions: 3,
    timestamp: '2024-12-14 09:23:41 UTC',
    events: [
      { type: 'IdentityRegistered', actor: 'Col. Vikram Singh', color: '#00f0ff' },
      { type: 'AssetCreated', actor: 'RADAR-001', color: '#00ff88' },
      { type: 'RoleAssigned', actor: 'ADMIN → Col. Singh', color: '#a855f7' },
    ],
  },
  {
    number: '#14,208,338',
    hash: '0x8b4c0d...a3d2e5',
    prevHash: '0x7a3b9c...f2e1d4',
    transactions: 2,
    timestamp: '2024-12-14 09:24:12 UTC',
    events: [
      { type: 'AssetTransferred', actor: 'UAV-027 → Sgt. Malhotra', color: '#f59e0b' },
      { type: 'AuditEventRecorded', actor: 'Transfer audit log', color: '#3b82f6' },
    ],
  },
  {
    number: '#14,208,339',
    hash: '0x9c5d1e...b4e3f6',
    prevHash: '0x8b4c0d...a3d2e5',
    transactions: 1,
    timestamp: '2024-12-14 09:24:45 UTC',
    events: [
      { type: 'AccessGranted', actor: 'Maj. Sharma → COMMS-014', color: '#00ff88' },
    ],
  },
];

export default function BlockchainSection() {
  return (
    <section id="blockchain" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.2)] to-transparent" />

      <div className="section-container">
        <SectionHeading
          badge="Blockchain Layer"
          title="Immutable Blockchain Traceability"
          subtitle="Every critical operation is recorded as an immutable blockchain event. Full transaction history with block-level provenance for complete auditability."
        />

        {/* Block chain visualization */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-6"
        >
          {blocks.map((block, i) => (
            <motion.div key={i} variants={fadeInUp} className="relative">
              {/* Connector */}
              {i > 0 && (
                <div className="absolute -top-6 left-8 w-px h-6 bg-gradient-to-b from-transparent to-[rgba(0,240,255,0.3)]" />
              )}
              
              <GlassCard hover glowColor="cyan" className="p-0 overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                  {/* Block info */}
                  <div className="lg:w-80 p-6 border-b lg:border-b-0 lg:border-r border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[rgba(0,240,255,0.1)] border border-[rgba(0,240,255,0.2)] flex items-center justify-center">
                        <Blocks className="w-5 h-5 text-[#00f0ff]" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#00f0ff]" style={{ fontFamily: 'var(--font-mono)' }}>
                          Block {block.number}
                        </div>
                        <div className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {block.transactions} transaction{block.transactions > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                      <div className="flex items-center gap-2">
                        <Hash className="w-3 h-3 text-[#5a6068]" />
                        <span className="text-[#5a6068]">Hash:</span>
                        <span className="text-[#9aa0a8]">{block.hash}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-3 h-3 text-[#5a6068]" />
                        <span className="text-[#5a6068]">Prev:</span>
                        <span className="text-[#9aa0a8]">{block.prevHash}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-[#5a6068]" />
                        <span className="text-[#9aa0a8]">{block.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="flex-1 p-6">
                    <div className="text-[10px] text-[#5a6068] tracking-[0.15em] uppercase mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
                      EVENTS
                    </div>
                    <div className="space-y-3">
                      {block.events.map((event, j) => (
                        <div key={j} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: event.color }} />
                          <span className="text-xs font-medium" style={{ color: event.color, fontFamily: 'var(--font-mono)' }}>
                            {event.type}
                          </span>
                          <span className="text-xs text-[#5a6068] ml-auto">{event.actor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
