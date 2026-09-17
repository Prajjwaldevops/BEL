'use client';

import { motion } from 'framer-motion';
import { Fingerprint, UserCheck, ShieldCheck, KeyRound, BadgeCheck, Network } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import GlassCard from '@/components/ui/GlassCard';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const features = [
  { icon: Fingerprint, title: 'Decentralized Identifiers (DIDs)', desc: 'Self-sovereign identities anchored on blockchain. Users own their credentials without relying on centralized authorities.' },
  { icon: UserCheck, title: 'Identity Verification', desc: 'Cryptographic proof of identity. Verify credentials against on-chain registry without exposing personal data.' },
  { icon: ShieldCheck, title: 'Credential Management', desc: 'Issue, hold, and verify verifiable credentials. Support for organizational attestations and qualifications.' },
  { icon: KeyRound, title: 'Key Pair Management', desc: 'Secure key generation and management. Public keys registered on-chain, private keys never leave the device.' },
  { icon: BadgeCheck, title: 'Identity Lifecycle', desc: 'Full lifecycle management — creation, activation, suspension, revocation. Every state change recorded immutably.' },
  { icon: Network, title: 'Trust Framework', desc: 'Hierarchical trust relationships. Organizations can endorse, attest, and delegate identity verification.' },
];

export default function IdentitySection() {
  return (
    <section id="identity" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.2)] to-transparent" />
      
      <div className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Visual */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-square max-w-md mx-auto relative">
              {/* DID Card mockup */}
              <div className="absolute inset-8 rounded-3xl bg-gradient-to-br from-[rgba(0,240,255,0.08)] to-[rgba(0,255,136,0.04)] border border-[rgba(0,240,255,0.15)] p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(0,240,255,0.15)] flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-[#00f0ff]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#5a6068] tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
                        DIGITAL IDENTITY
                      </div>
                      <div className="text-sm font-semibold text-white">DID:ETH:0x7a3b...f2e1</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] text-[#5a6068] tracking-[0.15em] uppercase mb-1" style={{ fontFamily: 'var(--font-mono)' }}>HOLDER</div>
                      <div className="text-sm text-[#e8eaed]">Col. Vikram Singh</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#5a6068] tracking-[0.15em] uppercase mb-1" style={{ fontFamily: 'var(--font-mono)' }}>ORGANIZATION</div>
                      <div className="text-sm text-[#e8eaed]">BEL Defence Division</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#5a6068] tracking-[0.15em] uppercase mb-1" style={{ fontFamily: 'var(--font-mono)' }}>CLEARANCE</div>
                      <div className="text-sm text-[#00ff88]">● TOP SECRET // SCI</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.06)]">
                  <div className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>VERIFIED ON-CHAIN</div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                    <span className="text-[10px] text-[#00ff88]" style={{ fontFamily: 'var(--font-mono)' }}>ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full border border-[rgba(0,240,255,0.05)] animate-rotate-slow" />
              <div className="absolute inset-4 rounded-full border border-dashed border-[rgba(0,240,255,0.08)]" style={{ animationDirection: 'reverse', animation: 'rotate-slow 30s linear infinite reverse' }} />
            </div>
          </motion.div>

          {/* Right: Content */}
          <div>
            <SectionHeading
              badge="Identity Layer"
              title="Decentralized Identity Management"
              subtitle="Self-sovereign identity built on blockchain immutability. Every identity is cryptographically verifiable and tamper-evident."
              align="left"
            />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="flex items-start gap-3 p-4 rounded-xl hover:bg-[rgba(0,240,255,0.03)] transition-colors"
                >
                  <f.icon className="w-5 h-5 text-[#00f0ff] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">{f.title}</h4>
                    <p className="text-xs text-[#9aa0a8] leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
