'use client';

import { motion } from 'framer-motion';
import { ShieldAlert, Lock, Code, BookOpen, Users, Key } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import GlassCard from '@/components/ui/GlassCard';
import { SECURITY_FEATURES } from '@/lib/constants';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldAlert, Lock, Code, BookOpen, Users, Key,
};

export default function SecuritySection() {
  return (
    <section id="security" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.2)] to-transparent" />

      <div className="section-container">
        <SectionHeading
          badge="Security Framework"
          title="Defence-Grade Security"
          subtitle="Zero-trust architecture with multi-layer security enforcement. Every component independently validates, authorizes, and audits."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {SECURITY_FEATURES.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <GlassCard key={i} delay={i * 0.08} glowColor="cyan" className="p-6 group">
                <div className="w-12 h-12 rounded-xl bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.15)] flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  {Icon && <Icon className="w-5 h-5 text-[#00f0ff]" />}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-[#9aa0a8] leading-relaxed">{feature.description}</p>
              </GlassCard>
            );
          })}
        </motion.div>

        {/* Security principles */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            { title: 'NEVER', items: ['Store plaintext passwords', 'Expose private keys', 'Put secrets in Git', 'Trust frontend roles'] },
            { title: 'ALWAYS', items: ['Verify authorization on backend', 'Enforce smart contract perms', 'Log security events', 'Encrypt in transit & at rest'] },
            { title: 'DESIGN', items: ['Defense in depth', 'Least privilege access', 'Fail securely', 'Audit everything'] },
          ].map((col, i) => (
            <div key={i} className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
              <div
                className={`text-xs font-bold tracking-[0.2em] mb-3 ${
                  i === 0 ? 'text-[#ef4444]' : i === 1 ? 'text-[#00ff88]' : 'text-[#00f0ff]'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {col.title}
              </div>
              <ul className="space-y-2">
                {col.items.map((item, j) => (
                  <li key={j} className="text-xs text-[#9aa0a8] flex items-center gap-2">
                    <span className={`w-1 h-1 rounded-full ${
                      i === 0 ? 'bg-[#ef4444]' : i === 1 ? 'bg-[#00ff88]' : 'bg-[#00f0ff]'
                    }`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
