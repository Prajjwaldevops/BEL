'use client';

import { motion } from 'framer-motion';
import { Shield, UserCog, Eye, Wrench, User, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const roles = [
  { name: 'ADMIN', icon: Shield, color: '#ef4444', count: 12, permissions: ['Full System Access', 'Identity Management', 'Role Assignment', 'Asset CRUD', 'Audit Access', 'System Config', 'Blockchain Admin', 'IPFS Admin'] },
  { name: 'MANAGER', icon: UserCog, color: '#f59e0b', count: 45, permissions: ['Identity Management', 'Role Assignment', 'Asset CRUD', 'Audit Access', 'User Management', 'Document Upload'] },
  { name: 'AUDITOR', icon: Eye, color: '#a855f7', count: 28, permissions: ['Audit Access', 'Blockchain View', 'Read-Only Reports', 'Security Events', 'Compliance Review'] },
  { name: 'OPERATOR', icon: Wrench, color: '#3b82f6', count: 156, permissions: ['Asset Operations', 'Document Upload', 'View Assigned Assets', 'Transfer Request'] },
  { name: 'USER', icon: User, color: '#00ff88', count: 1052, permissions: ['View Own Assets', 'Profile Access', 'View Own Documents'] },
];

const allPerms = ['Full System Access', 'Identity Management', 'Role Assignment', 'Asset CRUD', 'Asset Operations', 'Audit Access', 'Blockchain View', 'Blockchain Admin', 'IPFS Admin', 'System Config', 'Document Upload', 'User Management', 'Security Events', 'Read-Only Reports', 'Compliance Review', 'View Assigned Assets', 'Transfer Request', 'View Own Assets', 'View Own Documents', 'Profile Access'];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
        <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>RBAC MATRIX — ENFORCED AT BACKEND + SMART CONTRACT LEVEL</p>
      </div>

      {/* Role cards */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {roles.map((role, i) => (
          <motion.div key={role.name} variants={fadeInUp} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] hover:border-[rgba(255,255,255,0.1)] transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${role.color}12`, border: `1px solid ${role.color}25` }}>
                <role.icon className="w-5 h-5" style={{ color: role.color }} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: role.color, fontFamily: 'var(--font-mono)' }}>{role.name}</div>
                <div className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>{role.count} users</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {role.permissions.map((p) => (
                <div key={p} className="flex items-center gap-1.5 text-[10px] text-[#9aa0a8]">
                  <CheckCircle2 className="w-3 h-3 text-[#00ff88]" />
                  {p}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Permission matrix */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] overflow-hidden">
        <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>FULL PERMISSION MATRIX</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="px-4 py-3 text-left text-[10px] text-[#5a6068] tracking-[0.1em] uppercase w-48" style={{ fontFamily: 'var(--font-mono)' }}>Permission</th>
                {roles.map((r) => (
                  <th key={r.name} className="px-3 py-3 text-center text-[10px] tracking-[0.1em]" style={{ color: r.color, fontFamily: 'var(--font-mono)' }}>{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPerms.map((perm) => (
                <tr key={perm} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="px-4 py-2 text-[10px] text-[#9aa0a8]" style={{ fontFamily: 'var(--font-mono)' }}>{perm}</td>
                  {roles.map((r) => (
                    <td key={r.name} className="px-3 py-2 text-center">
                      {r.permissions.includes(perm) ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88] mx-auto" /> : <XCircle className="w-3.5 h-3.5 text-[rgba(255,255,255,0.08)] mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
