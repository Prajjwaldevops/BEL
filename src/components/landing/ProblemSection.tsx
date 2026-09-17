'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Eye, ShieldOff } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { PROBLEMS } from '@/lib/constants';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const icons = [ShieldOff, Eye, Clock, AlertTriangle];

export default function ProblemSection() {
  return (
    <section id="problem" className="relative py-32 overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(239,68,68,0.3)] to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(239,68,68,0.02)] to-transparent pointer-events-none" />

      <div className="section-container">
        <SectionHeading
          badge="The Challenge"
          title="Critical Infrastructure Under Threat"
          subtitle="Traditional centralized systems create vulnerabilities that compromise identity integrity, access accountability, and asset traceability across defence and enterprise environments."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {PROBLEMS.map((problem, i) => {
            const Icon = icons[i];
            return (
              <GlassCard key={i} delay={i * 0.1} glowColor="amber" className="p-8">
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#ef4444]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{problem.title}</h3>
                    <p className="text-sm text-[#9aa0a8] leading-relaxed mb-4">{problem.description}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#ef4444]" style={{ fontFamily: 'var(--font-display)' }}>
                        {problem.stat.includes('$') || problem.stat.includes('%') ? (
                          problem.stat
                        ) : (
                          <AnimatedCounter end={parseInt(problem.stat)} suffix="" />
                        )}
                      </span>
                      <span className="text-xs text-[#5a6068]">{problem.statLabel}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
