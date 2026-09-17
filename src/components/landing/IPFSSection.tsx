'use client';

import { motion } from 'framer-motion';
import { FileCheck, Upload, Shield, Hash, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import GlassCard from '@/components/ui/GlassCard';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const documents = [
  { name: 'RADAR-001_maintenance_log.pdf', cid: 'QmX7hK9...3nLm', size: '2.4 MB', status: 'verified', hash: 'sha256:a7b3c9...', pinned: true },
  { name: 'UAV-027_transfer_cert.pdf', cid: 'QmZ9jP1...1mOo', size: '1.1 MB', status: 'verified', hash: 'sha256:d4e5f6...', pinned: true },
  { name: 'COMMS-014_calibration.pdf', cid: 'QmY8iN0...0lNn', size: '3.7 MB', status: 'verified', hash: 'sha256:g7h8i9...', pinned: true },
  { name: 'crypto_module_spec.pdf', cid: 'QmB1lR3...3oQq', size: '890 KB', status: 'pending', hash: 'sha256:j0k1l2...', pinned: false },
];

const features = [
  { icon: Globe, title: 'Decentralized Storage', desc: 'Documents stored across the IPFS network. No single point of failure.' },
  { icon: Hash, title: 'Content Addressing', desc: 'Files identified by content hash (CID). Any modification changes the address.' },
  { icon: Shield, title: 'Tamper Detection', desc: 'On-chain CID references allow instant verification of document integrity.' },
  { icon: Upload, title: 'Pinata Pinning', desc: 'Documents pinned via Pinata for reliable availability and retrieval.' },
];

export default function IPFSSection() {
  return (
    <section id="ipfs" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,255,136,0.2)] to-transparent" />

      <div className="section-container">
        <SectionHeading
          badge="Decentralized Storage"
          title="IPFS Document Integrity"
          subtitle="Documents and certificates stored on IPFS with content-addressed hashes. On-chain references ensure any tampering is immediately detectable."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Document list */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="text-xs text-[#5a6068] tracking-[0.15em] uppercase mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
              PINNED DOCUMENTS
            </div>
            <div className="space-y-3">
              {documents.map((doc, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,255,136,0.15)] transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-4 h-4 text-[#00ff88]" />
                      <span className="text-sm text-white font-medium">{doc.name}</span>
                    </div>
                    {doc.status === 'verified' ? (
                      <span className="flex items-center gap-1 text-[10px] text-[#00ff88]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-[#f59e0b]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <AlertCircle className="w-3 h-3" /> PENDING
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    <div>
                      <span className="text-[#5a6068]">CID: </span>
                      <span className="text-[#9aa0a8]">{doc.cid}</span>
                    </div>
                    <div>
                      <span className="text-[#5a6068]">Size: </span>
                      <span className="text-[#9aa0a8]">{doc.size}</span>
                    </div>
                    <div>
                      <span className="text-[#5a6068]">Hash: </span>
                      <span className="text-[#9aa0a8]">{doc.hash}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Features */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="text-xs text-[#5a6068] tracking-[0.15em] uppercase mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
              STORAGE ARCHITECTURE
            </div>
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <GlassCard hover glowColor="green" className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] flex items-center justify-center flex-shrink-0">
                      <f.icon className="w-5 h-5 text-[#00ff88]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">{f.title}</h4>
                      <p className="text-xs text-[#9aa0a8] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}

            {/* Storage principle */}
            <div className="p-4 rounded-xl border border-dashed border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.03)]">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-[#f59e0b] mb-1">Storage Principle</div>
                  <p className="text-[11px] text-[#9aa0a8] leading-relaxed">
                    Only CID/hash references stored on-chain. Documents remain on IPFS. 
                    Sensitive data is never placed on public blockchain or unencrypted IPFS.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
