'use client';

import { motion } from 'framer-motion';
import { Plus, ClipboardCheck, UserPlus, Eye, ArrowRightLeft, Search, ShieldOff, CheckCircle2 } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const stages = [
  { icon: Plus, label: 'CREATED', color: '#00f0ff', desc: 'Asset registered in system' },
  { icon: ClipboardCheck, label: 'REGISTERED', color: '#0ea5e9', desc: 'Minted as NFT on-chain' },
  { icon: UserPlus, label: 'ASSIGNED', color: '#3b82f6', desc: 'Ownership assigned to user' },
  { icon: Eye, label: 'ACCESSED', color: '#a855f7', desc: 'Asset accessed/utilized' },
  { icon: ArrowRightLeft, label: 'TRANSFERRED', color: '#f59e0b', desc: 'Ownership transferred' },
  { icon: Search, label: 'AUDITED', color: '#00ff88', desc: 'Compliance audit completed' },
  { icon: ShieldOff, label: 'REVOKED', color: '#ef4444', desc: 'Asset decommissioned' },
  { icon: CheckCircle2, label: 'ACTIVE', color: '#00ff88', desc: 'Asset in active service' },
];

export default function AssetLifecycleSection() {
  return (
    <section id="asset-lifecycle" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.2)] to-transparent" />

      <div className="section-container">
        <SectionHeading
          badge="Asset Management"
          title="Digital Asset Lifecycle"
          subtitle="Complete provenance tracking from creation to decommission. Every state transition is recorded on-chain with NFT-backed ownership verification."
        />

        {/* Lifecycle Flow */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative"
        >
          {/* Desktop: Horizontal flow */}
          <div className="hidden lg:flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-12 left-12 right-12 h-px bg-gradient-to-r from-[#00f0ff] via-[#3b82f6] via-[#a855f7] via-[#f59e0b] to-[#00ff88] opacity-30" />
            
            {stages.map((stage, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="flex flex-col items-center relative z-10"
              >
                <motion.div
                  whileHover={{ scale: 1.2, y: -8 }}
                  className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                  style={{
                    background: `${stage.color}08`,
                    border: `1px solid ${stage.color}30`,
                    boxShadow: `0 0 20px ${stage.color}10`,
                  }}
                >
                  <stage.icon className="w-6 h-6 mb-1" style={{ color: stage.color }} />
                  <span className="text-[9px] font-bold tracking-[0.1em]" style={{ color: stage.color, fontFamily: 'var(--font-mono)' }}>
                    {stage.label}
                  </span>
                </motion.div>
                <span className="mt-3 text-[10px] text-[#5a6068] text-center max-w-[100px]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {stage.desc}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Mobile: Vertical flow */}
          <div className="lg:hidden space-y-4">
            {stages.map((stage, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${stage.color}10`,
                    border: `1px solid ${stage.color}30`,
                  }}
                >
                  <stage.icon className="w-5 h-5" style={{ color: stage.color }} />
                </div>
                <div>
                  <span className="text-sm font-bold" style={{ color: stage.color, fontFamily: 'var(--font-mono)' }}>
                    {stage.label}
                  </span>
                  <p className="text-xs text-[#9aa0a8] mt-0.5">{stage.desc}</p>
                </div>
                {i < stages.length - 1 && (
                  <div className="ml-auto text-[#5a6068]">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Asset card example */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 max-w-2xl mx-auto"
        >
          <div className="rounded-2xl border border-[rgba(0,240,255,0.1)] bg-[rgba(0,240,255,0.02)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>RADAR-001</span>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.2)]" style={{ fontFamily: 'var(--font-mono)' }}>
                ACTIVE
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
              <div>
                <div className="text-[#5a6068] mb-1">OWNER</div>
                <div className="text-[#e8eaed]">Col. Vikram Singh</div>
              </div>
              <div>
                <div className="text-[#5a6068] mb-1">NFT ID</div>
                <div className="text-[#00f0ff]">#1001</div>
              </div>
              <div>
                <div className="text-[#5a6068] mb-1">TX HASH</div>
                <div className="text-[#9aa0a8]">0x7a3b...f2e1</div>
              </div>
              <div>
                <div className="text-[#5a6068] mb-1">IPFS CID</div>
                <div className="text-[#9aa0a8]">QmX7h...9kLm</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
