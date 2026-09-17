'use client';

import { Shield, Globe, ExternalLink } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="relative border-t border-[rgba(255,255,255,0.06)] bg-[rgba(5,5,8,0.9)]">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Main footer */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-7 h-7 text-[#00f0ff]" />
              <span className="text-sm font-bold tracking-[0.2em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {SITE_CONFIG.name}
              </span>
            </div>
            <p className="text-xs text-[#5a6068] leading-relaxed mb-4">
              Blockchain-Based Secure Platform for Identity, Access Control & Digital Asset Management.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center hover:border-[rgba(0,240,255,0.2)] transition-colors">
                <Globe className="w-4 h-4 text-[#5a6068]" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center hover:border-[rgba(0,240,255,0.2)] transition-colors">
                <ExternalLink className="w-4 h-4 text-[#5a6068]" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-[#5a6068] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Platform
            </h4>
            <ul className="space-y-2">
              {['Dashboard', 'Identity Registry', 'Asset Management', 'Blockchain Explorer', 'Audit Trail'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-xs text-[#9aa0a8] hover:text-[#00f0ff] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-[#5a6068] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Technology
            </h4>
            <ul className="space-y-2">
              {['Architecture', 'Smart Contracts', 'IPFS Storage', 'Security Model', 'API Reference'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-xs text-[#9aa0a8] hover:text-[#00f0ff] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-[#5a6068] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Documentation
            </h4>
            <ul className="space-y-2">
              {['Getting Started', 'Deployment Guide', 'Security Policy', 'Contributing', 'License'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-xs text-[#9aa0a8] hover:text-[#00f0ff] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-[rgba(255,255,255,0.04)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
              © 2024 BEL SENTINEL. ALL RIGHTS RESERVED.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
              HACKATHON PROTOTYPE — {SITE_CONFIG.classification}
            </span>
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
          </div>
        </div>
      </div>
    </footer>
  );
}
