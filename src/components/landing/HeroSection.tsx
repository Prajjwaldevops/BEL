'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ArrowRight, Play } from 'lucide-react';
import GlowButton from '@/components/ui/GlowButton';
import { staggerContainer, fadeInUp, slideInLeft, slideInRight } from '@/lib/animations';

const HeroScene = dynamic(() => import('@/components/three/HeroScene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 z-0 flex items-center justify-center">
      <div className="w-32 h-32 rounded-full border border-[rgba(124,92,252,0.2)] animate-pulse" />
    </div>
  ),
});

export default function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0614] via-[#1a1040] to-[#0f0a1e] z-0" />
      
      {/* Subtle purple glow orbs */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[rgba(124,92,252,0.06)] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-[rgba(99,102,241,0.04)] blur-[100px] pointer-events-none" />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-bg opacity-20 z-[1]" />

      {/* 3D Scene — positioned for right side */}
      <HeroScene />

      {/* Content — split layout */}
      <div className="relative z-20 max-w-[1400px] mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen py-24">
          {/* Left side — Text content */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col"
          >
            {/* Main headline */}
            <motion.h1
              variants={slideInLeft}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="block text-white">The new</span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#a78bfa] to-[#7c5cfc]">Security</span>
              <span className="block text-white">Platform</span>
            </motion.h1>

            {/* Sub-badge */}
            <motion.div variants={fadeInUp} className="mb-4">
              <span className="text-sm font-bold tracking-wider uppercase text-[#a78bfa]" style={{ fontFamily: 'var(--font-display)' }}>
                BLOCKCHAIN-POWERED PROTECTION
              </span>
            </motion.div>

            {/* Subheading */}
            <motion.p
              variants={fadeInUp}
              className="max-w-lg text-base text-[#a09cb0] leading-relaxed mb-8"
            >
              A next-generation platform whose decentralized architecture empowers 
              secure identity management, verifiable access control, and complete 
              digital asset traceability.
            </motion.p>

            {/* CTAs — matching reference style */}
            <motion.div variants={fadeInUp} className="flex flex-row items-center gap-4">
              <GlowButton variant="dark" size="lg" href="/dashboard">
                Enter Platform
              </GlowButton>
              <a
                href="#architecture"
                className="inline-flex items-center gap-2 text-sm text-[#a09cb0] hover:text-white transition-colors group"
              >
                <span className="w-10 h-10 rounded-full border border-[rgba(167,139,250,0.3)] flex items-center justify-center group-hover:border-[rgba(167,139,250,0.6)] transition-colors">
                  <Play className="w-3.5 h-3.5 text-[#a78bfa] ml-0.5" />
                </span>
                <span>Watch Demo</span>
              </a>
            </motion.div>
          </motion.div>

          {/* Right side — 3D scene occupies this space */}
          <motion.div
            variants={slideInRight}
            initial="hidden"
            animate="visible"
            className="hidden lg:block"
          >
            {/* The 3D scene renders behind via absolute positioning */}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
