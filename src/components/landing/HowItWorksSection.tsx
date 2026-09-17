'use client';

import { motion } from 'framer-motion';
import { KeyRound, ScanFace, ShieldCheck, Workflow, ClipboardCheck } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { HOW_IT_WORKS_STEPS } from '@/lib/constants';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const stepIcons = [KeyRound, ScanFace, ShieldCheck, Workflow, ClipboardCheck];
const stepColors = ['#00f0ff', '#00ff88', '#3b82f6', '#a855f7', '#f59e0b'];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.15)] to-transparent" />

      <div className="section-container">
        <SectionHeading
          badge="Process Flow"
          title="How It Works"
          subtitle="A five-phase security pipeline from authentication through immutable audit record creation."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="relative"
        >
          {/* Vertical connecting line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#00f0ff] via-[#3b82f6] to-[#a855f7] opacity-20 md:-translate-x-px" />

          {HOW_IT_WORKS_STEPS.map((step, i) => {
            const Icon = stepIcons[i];
            const color = stepColors[i];
            const isEven = i % 2 === 0;

            return (
              <motion.div
                key={i}
                variants={fadeInUp}
                className={`relative flex items-center mb-12 last:mb-0 ${
                  isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                } flex-row`}
              >
                {/* Content card */}
                <div className={`flex-1 ${isEven ? 'md:pr-16 md:text-right' : 'md:pl-16 md:text-left'} pl-16 md:pl-0 text-left`}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="p-6 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,240,255,0.15)] transition-all duration-300"
                  >
                    <div className={`flex items-center gap-3 mb-3 ${isEven ? 'md:justify-end' : 'md:justify-start'} justify-start`}>
                      <span
                        className="text-xs font-bold tracking-[0.2em]"
                        style={{ color, fontFamily: 'var(--font-display)' }}
                      >
                        STEP {step.step}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-[#9aa0a8] leading-relaxed mb-3">{step.description}</p>
                    <code
                      className="text-[11px] px-3 py-1 rounded-md bg-[rgba(0,240,255,0.05)] border border-[rgba(0,240,255,0.1)]"
                      style={{ color, fontFamily: 'var(--font-mono)' }}
                    >
                      {step.detail}
                    </code>
                  </motion.div>
                </div>

                {/* Center node */}
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10">
                  <motion.div
                    whileHover={{ scale: 1.3 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: `rgba(${color === '#00f0ff' ? '0,240,255' : color === '#00ff88' ? '0,255,136' : color === '#3b82f6' ? '59,130,246' : color === '#a855f7' ? '168,85,247' : '245,158,11'}, 0.15)`,
                      border: `2px solid ${color}`,
                      boxShadow: `0 0 20px rgba(${color === '#00f0ff' ? '0,240,255' : color === '#00ff88' ? '0,255,136' : color === '#3b82f6' ? '59,130,246' : color === '#a855f7' ? '168,85,247' : '245,158,11'}, 0.3)`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </motion.div>
                </div>

                {/* Spacer for other side */}
                <div className="flex-1 hidden md:block" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
