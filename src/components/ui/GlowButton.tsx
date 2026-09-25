'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlowButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  href?: string;
  onClick?: () => void;
}

export default function GlowButton({ children, variant = 'primary', size = 'md', className = '', href, onClick }: GlowButtonProps) {
  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  const variants = {
    primary: `
      bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-2xl
      border border-white/20 border-t-white/40
      text-white font-semibold tracking-wide
      shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_-8px_rgba(255,255,255,0.15)]
    `,
    secondary: `
      bg-white/5 backdrop-blur-xl
      border border-white/10
      text-white/80 font-medium tracking-wide
      shadow-[0_8px_32px_-8px_rgba(255,255,255,0.02)]
    `,
    outline: `
      bg-transparent backdrop-blur-md
      border border-white/15
      text-white/70 font-medium tracking-wide
    `,
    dark: `
      bg-black/40 backdrop-blur-xl
      border border-white/5
      text-white/60 font-medium tracking-wide
    `,
  };

  const Component = href ? motion.a : motion.button;

  return (
    <Component
      href={href}
      onClick={onClick}
      whileHover={{
        scale: 1.03,
        boxShadow: variant === 'primary'
          ? 'inset 0 1px 0 rgba(255,255,255,0.5), 0 12px 48px -12px rgba(255,255,255,0.25)'
          : 'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 32px -8px rgba(255,255,255,0.1)',
        backgroundColor: variant === 'primary'
          ? 'rgba(255,255,255,0.15)'
          : variant === 'secondary' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'
      }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative inline-flex items-center justify-center gap-2
        rounded-full tracking-wide
        transition-all duration-300 cursor-pointer overflow-hidden group
        ${sizes[size]}
        ${variants[variant]}
        ${className}
      `}
    >
      <div 
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: variant === 'primary' 
            ? 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)' 
            : 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Component>
  );
}
