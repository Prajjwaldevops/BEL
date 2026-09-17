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
      bg-gradient-to-r from-[#7c5cfc] to-[#a78bfa]
      text-white font-bold
      shadow-[0_0_30px_rgba(124,92,252,0.3)]
    `,
    secondary: `
      bg-[rgba(124,92,252,0.08)]
      text-[#e8e4f0] font-medium
      border border-[rgba(124,92,252,0.2)]
    `,
    outline: `
      bg-transparent
      text-[#a78bfa] font-medium
      border border-[rgba(167,139,250,0.3)]
    `,
    dark: `
      bg-[rgba(15,10,30,0.8)]
      text-white font-medium
      border border-[rgba(124,92,252,0.2)]
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
          ? '0 0 50px rgba(124, 92, 252, 0.5), 0 0 100px rgba(124, 92, 252, 0.2)'
          : '0 0 30px rgba(124, 92, 252, 0.2)',
      }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative inline-flex items-center justify-center gap-2
        rounded-full tracking-wide
        transition-all duration-300 cursor-pointer
        ${sizes[size]}
        ${variants[variant]}
        ${className}
      `}
    >
      {variant === 'primary' && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#7c5cfc] to-[#a78bfa] opacity-0 hover:opacity-20 transition-opacity blur-xl" />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Component>
  );
}
