'use client';

import { motion } from 'framer-motion';
import { staggerContainer, letterAnimation } from '@/lib/animations';

interface SectionHeadingProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export default function SectionHeading({ badge, title, subtitle, align = 'center', className = '' }: SectionHeadingProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      className={`mb-16 ${align === 'center' ? 'text-center' : 'text-left'} ${className}`}
    >
      {badge && (
        <motion.div variants={letterAnimation} className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase bg-[rgba(124,92,252,0.1)] text-[#a78bfa] border border-[rgba(124,92,252,0.2)] font-[family-name:var(--font-mono)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cfc] animate-pulse" />
            {badge}
          </span>
        </motion.div>
      )}
      <motion.h2
        variants={letterAnimation}
        className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-[#e8e4f0] to-[#a09cb0]">
          {title}
        </span>
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={letterAnimation}
          className={`text-[#a09cb0] text-base sm:text-lg leading-relaxed max-w-3xl ${align === 'center' ? 'mx-auto' : ''}`}
        >
          {subtitle}
        </motion.p>
      )}
      <motion.div
        variants={letterAnimation}
        className={`mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[#7c5cfc] to-transparent ${align === 'center' ? 'mx-auto' : ''}`}
      />
    </motion.div>
  );
}
