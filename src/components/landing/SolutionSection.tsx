'use client';

import { motion } from 'framer-motion';
import { Fingerprint, ShieldCheck, Boxes, ScrollText, FileCheck, GitBranch } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import GlassCard from '@/components/ui/GlassCard';
import { SOLUTION_FEATURES, COLOR_MAP } from '@/lib/constants';
import { staggerContainer } from '@/lib/animations';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Fingerprint, ShieldCheck, Boxes, ScrollText, FileCheck, GitBranch,
};

export default function SolutionSection() {
  return (
    <section id="solution" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.3)] to-transparent" />

      <div className="section-container">
        <SectionHeading
          badge="Our Solution"
          title="Unified Blockchain Security Platform"
          subtitle="A comprehensive platform that unifies identity management, access control, and asset lifecycle tracking through blockchain immutability and decentralized storage."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {SOLUTION_FEATURES.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            const color = COLOR_MAP[feature.color] || COLOR_MAP.cyan;
            return (
              <GlassCard key={i} delay={i * 0.08} glowColor={feature.color} className="p-8 group">
                <div className="mb-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                    style={{
                      background: `rgba(${feature.color === 'cyan' ? '0,240,255' : feature.color === 'green' ? '0,255,136' : feature.color === 'blue' ? '59,130,246' : feature.color === 'purple' ? '168,85,247' : '245,158,11'}, 0.1)`,
                      border: `1px solid rgba(${feature.color === 'cyan' ? '0,240,255' : feature.color === 'green' ? '0,255,136' : feature.color === 'blue' ? '59,130,246' : feature.color === 'purple' ? '168,85,247' : '245,158,11'}, 0.2)`,
                    }}
                  >
                    {Icon && <Icon className="w-6 h-6" style={{ color }} />}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-[#9aa0a8] leading-relaxed">{feature.description}</p>
                
                {/* Bottom accent line */}
                <div
                  className="mt-6 h-px w-0 group-hover:w-full transition-all duration-700"
                  style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
                />
              </GlassCard>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
