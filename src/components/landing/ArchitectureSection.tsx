'use client';

import { motion } from 'framer-motion';
import { Monitor, Lock, Server, Database, Blocks, HardDrive, ArrowDown, ArrowRight } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { ARCHITECTURE_LAYERS } from '@/lib/constants';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const layerIcons = [Monitor, Lock, Server, Database, Blocks, HardDrive];

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(168,85,247,0.2)] to-transparent" />
      <div className="absolute inset-0 grid-bg-dense opacity-20 pointer-events-none" />

      <div className="section-container">
        <SectionHeading
          badge="System Architecture"
          title="Multi-Layer Security Architecture"
          subtitle="A defense-in-depth architecture where each layer independently enforces security. No single component can be compromised without detection."
        />

        {/* Architecture diagram */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          {ARCHITECTURE_LAYERS.map((layer, i) => {
            const Icon = layerIcons[i];
            const colorMap: Record<string, string> = {
              cyan: '#00f0ff',
              green: '#00ff88',
              blue: '#3b82f6',
              purple: '#a855f7',
              amber: '#f59e0b',
            };
            const color = colorMap[layer.color] || '#00f0ff';

            return (
              <motion.div key={i} variants={fadeInUp}>
                {/* Layer card */}
                <div
                  className="relative p-5 rounded-xl border transition-all duration-300 hover:bg-[rgba(255,255,255,0.02)] group"
                  style={{
                    borderColor: `${color}15`,
                    background: `${color}03`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{
                        background: `${color}10`,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{layer.name}</h4>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-md"
                          style={{
                            background: `${color}10`,
                            color,
                            border: `1px solid ${color}20`,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {layer.tech}
                        </span>
                      </div>
                      <p className="text-xs text-[#9aa0a8] leading-relaxed">{layer.description}</p>
                    </div>
                  </div>
                </div>

                {/* Connector */}
                {i < ARCHITECTURE_LAYERS.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDown className="w-4 h-4 text-[rgba(255,255,255,0.15)]" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Data flow summary */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <div className="p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="text-xs text-[#5a6068] tracking-[0.15em] uppercase mb-4 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
              DATA FLOW PRINCIPLE
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
              <span className="px-3 py-1.5 rounded-lg bg-[rgba(0,240,255,0.08)] text-[#00f0ff] border border-[rgba(0,240,255,0.15)]">Searchable Data → Supabase</span>
              <ArrowRight className="w-3 h-3 text-[#5a6068] hidden sm:block" />
              <span className="px-3 py-1.5 rounded-lg bg-[rgba(168,85,247,0.08)] text-[#a855f7] border border-[rgba(168,85,247,0.15)]">Immutable Proofs → Blockchain</span>
              <ArrowRight className="w-3 h-3 text-[#5a6068] hidden sm:block" />
              <span className="px-3 py-1.5 rounded-lg bg-[rgba(0,255,136,0.08)] text-[#00ff88] border border-[rgba(0,255,136,0.15)]">Documents → IPFS</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
