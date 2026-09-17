'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glowColor?: string;
  delay?: number;
}

export default function GlassCard({ children, className = '', hover = true, glowColor = 'violet', delay = 0 }: GlassCardProps) {
  const glowColors: Record<string, string> = {
    violet: 'rgba(124, 92, 252, 0.2)',
    lavender: 'rgba(167, 139, 250, 0.2)',
    indigo: 'rgba(99, 102, 241, 0.2)',
    fuchsia: 'rgba(192, 132, 252, 0.2)',
    blue: 'rgba(129, 140, 248, 0.2)',
    green: 'rgba(52, 211, 153, 0.2)',
    amber: 'rgba(251, 191, 36, 0.2)',
    red: 'rgba(248, 113, 113, 0.2)',
    // Legacy
    cyan: 'rgba(124, 92, 252, 0.2)',
    purple: 'rgba(167, 139, 250, 0.2)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover ? {
        borderColor: glowColors[glowColor],
        boxShadow: `0 0 40px ${glowColors[glowColor]}, inset 0 0 40px rgba(0,0,0,0.2)`,
        y: -4,
        transition: { duration: 0.3 },
      } : undefined}
      className={`
        relative overflow-hidden rounded-2xl
        bg-[rgba(15,10,30,0.6)] backdrop-blur-xl
        border border-[rgba(124,92,252,0.08)]
        transition-colors duration-300
        ${className}
      `}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-[rgba(124,92,252,0.15)] rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[rgba(124,92,252,0.15)] rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-[rgba(124,92,252,0.15)] rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-[rgba(124,92,252,0.15)] rounded-br-2xl" />
      {children}
    </motion.div>
  );
}
