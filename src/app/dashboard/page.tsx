'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Activity, Boxes, ArrowRightLeft, FileCheck,
  ShieldAlert, Shield as ShieldIcon, Brain,
  Crosshair, Lock, FileText, Eye, AlertTriangle,
  Fingerprint, Zap, Terminal, Blocks, TrendingUp, Radio
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import {
  getDashboardStats, assetActivityData, accessAttemptsData,
  roleDistribution, blockchainTxOverTime, assetDistribution,
  liveFeedEvents,
} from '@/lib/data-service';

const dashboardStats = getDashboardStats();

const statCards = [
  { label: 'Identities', value: dashboardStats.totalIdentities, icon: Users, roles: ['ADMIN'], accent: '#38bdf8' },
  { label: 'Active Links', value: dashboardStats.activeUsers, icon: Activity, roles: ['ADMIN'], accent: '#10b981' },
  { label: 'Secure Assets', value: dashboardStats.registeredAssets, icon: Boxes, roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'], accent: '#a78bfa' },
  { label: 'Transfers', value: dashboardStats.assetsTransferred, icon: ArrowRightLeft, roles: ['ADMIN', 'ALTER'], accent: '#fbbf24' },
  { label: 'IPFS Records', value: dashboardStats.ipfsDocuments, icon: FileCheck, roles: ['ADMIN', 'ALTER', 'DEBUGGER'], accent: '#38bdf8' },
  { label: 'Threats', value: dashboardStats.securityEvents, icon: ShieldAlert, roles: ['ADMIN', 'DEBUGGER'], accent: '#ef4444' },
  { label: 'Network Txns', value: dashboardStats.blockchainTxns, icon: Blocks, roles: ['ADMIN'], accent: '#38bdf8' },
  { label: 'Gas (ETH)', value: dashboardStats.totalGasFeesCollected, icon: Zap, roles: ['ADMIN'], accent: '#fbbf24' },
];

const feedColors: Record<string, string> = {
  info: '#94a3b8',
  success: '#10b981',
  warning: '#fbbf24',
  error: '#ef4444',
};

/* ───── Glass Card wrapper ───── */
const GlassCard = ({ children, className = '', hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) => (
  <div className={`
    relative rounded-2xl overflow-hidden
    bg-white/[0.04] backdrop-blur-2xl
    border border-white/[0.08]
    shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_32px_-8px_rgba(0,0,0,0.5)]
    ${hover ? 'transition-all duration-500 hover:bg-white/[0.07] hover:border-white/[0.14] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_64px_-16px_rgba(0,0,0,0.6)]' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-black/80 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-2xl shadow-2xl">
      <p className="text-[9px] text-white/40 mb-2 font-mono uppercase tracking-widest">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-medium font-mono uppercase tracking-wider" style={{ color: entry.color || '#38bdf8' }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function DashboardOverview() {
  const [activeEvents, setActiveEvents] = useState(liveFeedEvents.slice(0, 5));
  const [feedIndex, setFeedIndex] = useState(0);
  const [userRole, setUserRole] = useState('VIEWER');
  const [userName, setUserName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sessionStr = localStorage.getItem('bel_session');
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        setUserRole(parsed.user?.role || 'VIEWER');
        setUserName(parsed.user?.displayName || parsed.user?.username || 'Operator');
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeedIndex((prev) => {
        const next = (prev + 1) % liveFeedEvents.length;
        setActiveEvents((prevEvents) => [liveFeedEvents[next], ...prevEvents.slice(0, 4)]);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const visibleStats = statCards.filter(s => s.roles.includes(userRole));

  return (
    <div className="relative z-10 space-y-6 pb-12">

      {/* ═══════ Command Header ═══════ */}
      <GlassCard className="p-8 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-8 pb-8 border-b border-white/[0.06]">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <Radio className="w-5 h-5 text-white/80 stroke-[1.5]" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10b981] border-2 border-black/50 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-white tracking-[0.2em] uppercase mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {userName}
              </h1>
              <div className="flex items-center gap-3 text-[9px] text-white/40 tracking-[0.15em] uppercase font-mono">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08]">{userRole}</span>
                <span className="text-white/15">•</span>
                <span>NODE ALPHA-7</span>
                <span className="text-white/15">•</span>
                <span>QR-256</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
              <div className="text-[7px] text-white/30 uppercase tracking-widest font-mono mb-1">STATUS</div>
              <div className="text-[11px] text-[#10b981] uppercase tracking-widest font-mono font-medium flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                SECURED
              </div>
            </div>
            {userRole === 'ADMIN' && (
              <div className="px-5 py-3 rounded-2xl bg-white/[0.04] border border-[#fbbf24]/10 backdrop-blur-xl">
                <div className="text-[7px] text-white/30 uppercase tracking-widest font-mono mb-1">OVERRIDE</div>
                <div className="text-[11px] text-[#fbbf24] uppercase tracking-widest font-mono font-medium flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]" />
                  ACTIVE
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mission Status Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Threat Level', value: 'LOW', icon: Crosshair, color: '#38bdf8' },
            { label: 'Defense', value: 'OPTIMAL', icon: ShieldIcon, color: '#10b981' },
            { label: 'Network', value: 'STABLE', icon: Zap, color: '#fbbf24' },
            { label: 'Systems', value: 'ONLINE', icon: Terminal, color: '#a78bfa' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all duration-300">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08]" style={{ boxShadow: `0 0 20px ${item.color}08` }}>
                <item.icon className="w-4 h-4 stroke-[1.5]" style={{ color: item.color }} />
              </div>
              <div>
                <div className="text-[8px] text-white/30 uppercase tracking-widest font-mono">{item.label}</div>
                <div className="text-sm text-white font-medium font-mono tracking-wider">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ═══════ Metric Cards Grid ═══════ */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-4 md:gap-5 grid-cols-2 lg:grid-cols-4"
      >
        {visibleStats.map((stat, i) => (
          <motion.div key={i} variants={fadeInUp}>
            <GlassCard className="p-6 group">
              {/* Background watermark icon */}
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500">
                <stat.icon className="w-20 h-20" />
              </div>

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08] mb-5 group-hover:bg-white/[0.1] group-hover:border-white/[0.15] transition-all duration-300">
                  <stat.icon className="w-5 h-5 stroke-[1.5]" style={{ color: stat.accent }} />
                </div>
                <div className="text-3xl font-light text-white tracking-wider mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
                <div className="text-[9px] text-white/30 tracking-[0.15em] font-mono uppercase">
                  {stat.label}
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════ Analytics Row (ADMIN / DEBUGGER) ═══════ */}
      {(userRole === 'ADMIN' || userRole === 'DEBUGGER') && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Telemetry Chart */}
          <div className="xl:col-span-2">
            <GlassCard className="p-7">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08]">
                    <Activity className="w-5 h-5 text-[#38bdf8] stroke-[1.5]" />
                  </div>
                  <div>
                    <div className="text-[11px] text-white/80 font-mono uppercase tracking-[0.2em] mb-0.5">Network Telemetry</div>
                    <div className="text-[8px] text-white/25 font-mono uppercase tracking-widest">REAL-TIME SURVEILLANCE</div>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20">
                  <span className="text-[8px] text-[#10b981] font-mono tracking-widest uppercase font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={assetActivityData}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="created" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" />
                  <Area type="monotone" dataKey="transferred" stroke="#fbbf24" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          {/* Audit Feed */}
          <GlassCard className="p-7 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08]">
                  <Terminal className="w-5 h-5 text-white/60 stroke-[1.5]" />
                </div>
                <div>
                  <div className="text-[11px] text-white/80 font-mono uppercase tracking-[0.2em] mb-0.5">Audit Feed</div>
                  <div className="text-[8px] text-white/25 font-mono uppercase tracking-widest">SYSTEM EVENTS</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-hidden">
              <AnimatePresence initial={false}>
                {activeEvents.map((event, i) => (
                  <motion.div
                    key={`${event.type}-${i}-${feedIndex}`}
                    initial={{ opacity: 0, x: -10, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="relative pl-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all duration-300">
                      <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ backgroundColor: feedColors[event.severity] || '#fff', opacity: 0.5 }} />
                      <div className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: feedColors[event.severity] || '#fff' }}>
                        {event.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-white/60 font-light leading-relaxed mb-2">
                        {event.message}
                      </div>
                      <div className="text-[7px] text-white/20 font-mono uppercase tracking-widest flex items-center justify-between">
                        <span>{event.user}</span>
                        <span>{event.timestamp}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ═══════ Intelligence Grid (ADMIN) ═══════ */}
      {userRole === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Access Logs */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08]">
                <ShieldIcon className="w-4 h-4 text-[#38bdf8] stroke-[1.5]" />
              </div>
              <span className="text-[10px] text-white/70 font-mono uppercase tracking-[0.2em]">Access Logs</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={accessAttemptsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="granted" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={10} />
                <Bar dataKey="denied" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Identity Distribution */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08]">
                <Fingerprint className="w-4 h-4 text-[#a78bfa] stroke-[1.5]" />
              </div>
              <span className="text-[10px] text-white/70 font-mono uppercase tracking-[0.2em]">Identities</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={2}
                >
                  {roleDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
              {roleDistribution.map((r) => (
                <div key={r.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                  <span className="text-[8px] text-white/40 font-mono uppercase tracking-widest">{r.name}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Chain Volume */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08]">
                <Blocks className="w-4 h-4 text-[#38bdf8] stroke-[1.5]" />
              </div>
              <span className="text-[10px] text-white/70 font-mono uppercase tracking-[0.2em]">Chain Volume</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={blockchainTxOverTime} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Line type="monotone" dataKey="transactions" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#38bdf8', stroke: 'rgba(0,0,0,0.5)', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      )}

      {/* ═══════ Field Ops (VIEWER / ALTER) ═══════ */}
      {(userRole === 'ALTER' || userRole === 'VIEWER') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-7">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08]">
                <Lock className="w-5 h-5 text-white/60 stroke-[1.5]" />
              </div>
              <div>
                <div className="text-[11px] text-white/80 font-mono uppercase tracking-[0.2em] mb-0.5">Security Protocol</div>
                <div className="text-[8px] text-white/25 font-mono uppercase tracking-widest">ENCRYPTION LAYERS</div>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Data Access', desc: 'Secure 6-digit cryptographic PIN required', status: 'LOCKED', icon: FileText, color: '#ef4444' },
                { label: 'Asset Transfers', desc: 'Hardware wallet signature mandatory', status: 'ACTIVE', icon: ArrowRightLeft, color: '#10b981' },
                { label: 'Network Audit', desc: 'Immutable logging enabled', status: 'ONLINE', icon: Blocks, color: '#38bdf8' },
              ].map((item, i) => (
                <div key={i} className="relative group">
                  <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ backgroundColor: item.color, opacity: 0.5 }} />
                  <div className="flex items-start gap-4 pl-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
                    <item.icon className="w-5 h-5 shrink-0 stroke-[1.5] mt-0.5" style={{ color: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-white/80 uppercase font-mono tracking-[0.15em]">{item.label}</span>
                        <span
                          className="text-[8px] uppercase font-mono tracking-widest px-2.5 py-1 rounded-lg border"
                          style={{
                            color: item.color,
                            borderColor: `${item.color}25`,
                            backgroundColor: `${item.color}08`
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 font-light leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-7 flex items-center justify-center">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.015]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M20 0v40M0 20h40' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
            }} />

            <div className="text-center relative z-10 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <Eye className="w-7 h-7 text-white/40" />
              </div>
              <h3 className="text-sm text-white/80 uppercase tracking-[0.2em] font-mono mb-4 font-medium">Restricted Zone</h3>
              <p className="text-[11px] text-white/40 font-light leading-relaxed mb-4">
                Operating in classified sector. All actions, queries, and file access are monitored and recorded.
              </p>
              <div className="flex items-center justify-center gap-2 text-[9px] text-white/25 font-mono uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                <span>BLOCKCHAIN AUDIT ACTIVE</span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
