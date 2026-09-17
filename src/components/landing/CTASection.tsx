'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap } from 'lucide-react';
import GlowButton from '@/components/ui/GlowButton';
import { fadeInUp, staggerContainer } from '@/lib/animations';

export default function CTASection() {
  return (
    <section id="cta" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.3)] to-transparent" />
      
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-[rgba(0,240,255,0.03)] blur-[100px]" />
      </div>

      <div className="section-container">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] tracking-[0.3em] uppercase text-[#00f0ff] border border-[rgba(0,240,255,0.2)] bg-[rgba(0,240,255,0.05)]" style={{ fontFamily: 'var(--font-mono)' }}>
              <Zap className="w-3 h-3" />
              READY TO DEPLOY
            </span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-white">SECURE YOUR </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00f0ff] to-[#00ff88]">DIGITAL FRONTIER</span>
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-base sm:text-lg text-[#9aa0a8] leading-relaxed mb-10"
          >
            Deploy blockchain-backed identity management, granular access control, and 
            complete asset traceability across your organization. Start with the command centre.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <GlowButton size="lg" href="/dashboard">
              <Shield className="w-5 h-5" />
              Enter Secure Platform
              <ArrowRight className="w-5 h-5" />
            </GlowButton>
            <GlowButton variant="outline" size="lg" href="#architecture">
              View Full Architecture
            </GlowButton>
          </motion.div>

          {/* Tech stack badges */}
          <motion.div
            variants={fadeInUp}
            className="mt-12 flex flex-wrap justify-center gap-3"
          >
            {['Next.js', 'TypeScript', 'Go', 'Solidity', 'Supabase', 'IPFS', 'MetaMask', 'ERC-721'].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-md text-[10px] text-[#5a6068] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {tech}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
