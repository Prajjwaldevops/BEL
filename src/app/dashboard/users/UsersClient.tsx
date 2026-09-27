'use client';

import { motion } from 'framer-motion';
import { Users as UsersIcon, Search, Shield, UserCog, Eye, Wrench, User } from 'lucide-react';
import { demoUsers } from '@/lib/demo-data';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = { ADMIN: Shield, MANAGER: UserCog, AUDITOR: Eye, OPERATOR: Wrench, USER: User };
const roleColors: Record<string, string> = { ADMIN: '#ef4444', MANAGER: '#f59e0b', AUDITOR: '#a855f7', OPERATOR: '#3b82f6', USER: '#00ff88' };

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{demoUsers.length} REGISTERED USERS</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Search users..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#e8eaed] placeholder-[#5a6068] focus:outline-none focus:border-[rgba(0,240,255,0.2)]" style={{ fontFamily: 'var(--font-mono)' }} />
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {demoUsers.map((user, i) => {
          const RoleIcon = roleIcons[user.role] || User;
          const color = roleColors[user.role] || '#00ff88';
          return (
            <motion.div key={user.id} variants={fadeInUp} className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(0,240,255,0.1)] transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgba(0,240,255,0.2)] to-[rgba(0,255,136,0.1)] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white truncate">{user.name}</h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium" style={{ background: `${color}12`, color, border: `1px solid ${color}25`, fontFamily: 'var(--font-mono)' }}>
                      <RoleIcon className="w-3 h-3" />
                      {user.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#5a6068] mb-3" style={{ fontFamily: 'var(--font-mono)' }}>{user.email}</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    <div><span className="text-[#5a6068]">Dept: </span><span className="text-[#9aa0a8]">{user.department}</span></div>
                    <div><span className="text-[#5a6068]">Rank: </span><span className="text-[#9aa0a8]">{user.rank}</span></div>
                    <div><span className="text-[#5a6068]">Clearance: </span><span className="text-[#00ff88]">{user.clearance}</span></div>
                    <div><span className="text-[#5a6068]">Status: </span><span className="text-[#00ff88]">● {user.status}</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.04)] text-[9px] text-[#5a6068] truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                    DID: {user.identityDid}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
