'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Menu, X } from 'lucide-react';
import { NAV_LINKS, SITE_CONFIG } from '@/lib/constants';
import GlowButton from '@/components/ui/GlowButton';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeLink, setActiveLink] = useState('#hero');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[rgba(10,6,20,0.92)] backdrop-blur-xl border-b border-[rgba(124,92,252,0.1)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="relative">
            <Shield className="w-7 h-7 text-[#a78bfa] transition-all group-hover:drop-shadow-[0_0_8px_rgba(124,92,252,0.6)]" />
            <div className="absolute inset-0 bg-[#7c5cfc] opacity-20 blur-lg rounded-full group-hover:opacity-40 transition-opacity" />
          </div>
          <span className="text-sm font-bold tracking-wider text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {SITE_CONFIG.name}
          </span>
        </a>

        {/* Desktop Nav — centered links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setActiveLink(link.href)}
              className="relative text-sm font-medium transition-colors duration-300 group"
              style={{
                color: activeLink === link.href ? '#fff' : '#a09cb0',
              }}
            >
              {link.label}
              {activeLink === link.href && (
                <motion.span
                  layoutId="nav-dot"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#7c5cfc]"
                />
              )}
            </a>
          ))}
        </div>

        {/* CTA — right side */}
        <div className="hidden md:flex items-center gap-5">
          <a
            href="#"
            className="text-sm text-[#a09cb0] hover:text-white transition-colors"
          >
            Log in
          </a>
          <GlowButton size="sm" href="/dashboard">
            Try for free
          </GlowButton>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-[#a09cb0] hover:text-[#a78bfa] transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[rgba(10,6,20,0.98)] backdrop-blur-xl border-b border-[rgba(124,92,252,0.1)]"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-[#a09cb0] hover:text-[#a78bfa] transition-colors py-2"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-[rgba(124,92,252,0.1)]">
                <GlowButton size="md" className="w-full" href="/dashboard">
                  Try for free
                </GlowButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
