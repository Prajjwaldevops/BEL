'use client';

import { motion } from 'framer-motion';
import { Shield, UserCog, Eye, Wrench, User, Lock, CheckCircle2, XCircle } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const roles = [
  { name: 'ADMIN', icon: Shield, color: '#ef4444', permissions: ['Full System Access', 'Identity Management', 'Role Assignment', 'Asset Control', 'Audit Access', 'System Config'] },
  { name: 'MANAGER', icon: UserCog, color: '#f59e0b', permissions: ['Identity Management', 'Role Assignment', 'Asset Control', 'Audit Access', '', ''] },
  { name: 'AUDITOR', icon: Eye, color: '#a855f7', permissions: ['', '', '', 'Audit Access', 'Blockchain View', 'Read-Only Reports'] },
  { name: 'OPERATOR', icon: Wrench, color: '#3b82f6', permissions: ['', '', 'Asset Operations', '', 'Document Upload', ''] },
  { name: 'USER', icon: User, color: '#00ff88', permissions: ['', '', '', '', 'View Own Assets', 'Profile Access'] },
];

const permissionLabels = ['System Config', 'Identity Mgmt', 'Asset Control', 'Audit Access', 'Documents', 'Profile'];

export default function AccessControlSection() {
  return (
    <section id="access-control" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,255,136,0.2)] to-transparent" />

      <div className="section-container">
        <SectionHeading
          badge="Access Control"
          title="Role-Based Permission Architecture"
          subtitle="Granular, blockchain-enforced access control with hierarchical role management. Every permission decision is auditable and tamper-evident."
        />

        {/* Permission Matrix */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="overflow-x-auto"
        >
          <motion.div variants={fadeInUp} className="min-w-[700px]">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden bg-[rgba(255,255,255,0.01)]">
              {/* Header */}
              <div className="grid grid-cols-7 border-b border-[rgba(255,255,255,0.06)]">
                <div className="p-4 text-xs text-[#5a6068] tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
                  Role
                </div>
                {permissionLabels.map((label) => (
                  <div key={label} className="p-4 text-xs text-[#5a6068] tracking-[0.1em] uppercase text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                    {label}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {roles.map((role, i) => (
                <motion.div
                  key={role.name}
                  variants={fadeInUp}
                  className="grid grid-cols-7 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <div className="p-4 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${role.color}15`, border: `1px solid ${role.color}30` }}
                    >
                      <role.icon className="w-4 h-4" style={{ color: role.color }} />
                    </div>
                    <span className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                      {role.name}
                    </span>
                  </div>
                  {role.permissions.map((perm, j) => (
                    <div key={j} className="p-4 flex items-center justify-center">
                      {perm ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
                          <span className="text-[10px] text-[#9aa0a8] hidden xl:inline">{perm}</span>
                        </div>
                      ) : (
                        <XCircle className="w-4 h-4 text-[rgba(255,255,255,0.1)]" />
                      )}
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Enforcement note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <Lock className="w-4 h-4 text-[#00f0ff]" />
          <span className="text-xs text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
            PERMISSIONS ENFORCED AT BACKEND + SMART CONTRACT LEVEL — NEVER TRUST FRONTEND
          </span>
        </motion.div>
      </div>
    </section>
  );
}
