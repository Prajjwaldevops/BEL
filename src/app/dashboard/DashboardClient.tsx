'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
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

/* ── Stat card configuration ── */
const statCards = [
  { label: 'Identities',   value: dashboardStats.totalIdentities, icon: Users,          roles: ['ADMIN'], accent: '#00d4ff' },
  { label: 'Active Links',  value: dashboardStats.activeUsers,     icon: Activity,       roles: ['ADMIN'], accent: '#22c55e' },
  { label: 'Secure Assets', value: dashboardStats.registeredAssets, icon: Boxes,          roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'], accent: '#818cf8' },
  { label: 'Transfers',     value: dashboardStats.assetsTransferred,icon: ArrowRightLeft, roles: ['ADMIN', 'ALTER'], accent: '#ff9f43' },
  { label: 'IPFS Records',  value: dashboardStats.ipfsDocuments,    icon: FileCheck,      roles: ['ADMIN', 'ALTER', 'DEBUGGER'], accent: '#00d4ff' },
  { label: 'Threats',       value: dashboardStats.securityEvents,   icon: ShieldAlert,    roles: ['ADMIN', 'DEBUGGER'], accent: '#ef4444' },
  { label: 'Network Txns',  value: dashboardStats.blockchainTxns,   icon: Blocks,         roles: ['ADMIN'], accent: '#00d4ff' },
  { label: 'Gas (ETH)',     value: dashboardStats.totalGasFeesCollected, icon: Zap,        roles: ['ADMIN'], accent: '#ff9f43' },
];

const feedSeverityColors: Record<string, string> = {
  info:    'rgba(255, 255, 255, 0.35)',
  success: '#22c55e',
  warning: '#eab308',
  error:   '#ef4444',
};

/* ── Animated Counter ── */
function AnimatedValue({ value, duration = 1.8 }: { value: number | string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref as React.RefObject<Element>, { once: true, margin: '-40px' });
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isInView || hasRun.current || typeof value !== 'number') return;
    hasRun.current = true;
    const start = performance.now();
    const end = start + duration * 1000;

    const step = (now: number) => {
      const progress = Math.min((now - start) / (end - start), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * (value as number)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value, duration]);

  if (typeof value === 'string') return <span ref={ref}>{value}</span>;
  return <span ref={ref}>{display.toLocaleString()}</span>;
}

/* ── Custom Chart Tooltip ── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: 'rgba(6, 6, 16, 0.92)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 16px 48px -12px rgba(0, 0, 0, 0.6)',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'rgba(255, 255, 255, 0.30)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        marginBottom: '8px',
      }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 500,
          color: entry.color || '#00d4ff',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
        }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

/* ── Motion Variants ── */
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/* ══════════════════════════════════════════════
   DASHBOARD OVERVIEW — Premium Redesign
   ══════════════════════════════════════════════ */

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
    <div className="relative z-10 space-y-6 lg:space-y-8 pb-12">

      {/* ═══════════════ COMMAND HEADER ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="chart-container">
          {/* Top section: identity + status */}
          <div className="flex flex-wrap items-center justify-between gap-6 mb-8 pb-8"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Radio className="w-5 h-5 stroke-[1.5]" style={{ color: 'rgba(255, 255, 255, 0.65)' }} />
                </div>
                <div className="status-dot status-dot--online absolute -bottom-0.5 -right-0.5" style={{ width: '10px', height: '10px', borderWidth: '2px', borderStyle: 'solid', borderColor: 'rgba(8, 8, 20, 0.8)' }} />
              </div>
              <div>
                <h1 className="text-display text-xl md:text-2xl text-white/90 tracking-[0.12em] uppercase mb-1">
                  {userName}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-caption px-2 py-0.5 rounded-md"
                    style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>{userRole}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.10)' }}>·</span>
                  <span className="text-caption">NODE ALPHA-7</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.10)' }}>·</span>
                  <span className="text-caption">QR-256</span>
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl"
                style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div className="text-caption mb-1">STATUS</div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] font-medium"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                  <span className="status-dot status-dot--online" />
                  SECURED
                </div>
              </div>
              {userRole === 'ADMIN' && (
                <div className="px-4 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255, 159, 67, 0.03)', border: '1px solid rgba(255, 159, 67, 0.10)' }}>
                  <div className="text-caption mb-1">OVERRIDE</div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] font-medium"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--secondary)' }}>
                    <span className="status-dot status-dot--warning" />
                    ACTIVE
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mission status row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Threat Level', value: 'LOW',     icon: Crosshair,  color: '#00d4ff' },
              { label: 'Defense',      value: 'OPTIMAL', icon: ShieldIcon, color: '#22c55e' },
              { label: 'Network',      value: 'STABLE',  icon: Zap,        color: '#ff9f43' },
              { label: 'Systems',      value: 'ONLINE',  icon: Terminal,   color: '#818cf8' },
            ].map((item) => (
              <div key={item.label}
                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.07)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.02)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}08`, border: `1px solid ${item.color}15` }}>
                  <item.icon className="w-4 h-4 stroke-[1.5]" style={{ color: item.color }} />
                </div>
                <div>
                  <div className="text-caption">{item.label}</div>
                  <div className="text-sm text-white/90 font-medium tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══════════════ METRIC CARDS ═══════════════ */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4"
      >
        {visibleStats.map((stat, i) => (
          <motion.div key={i} variants={fadeUp}>
            <div className="metric-card group">
              {/* Watermark icon */}
              <div className="absolute top-0 right-0 p-4 transition-opacity duration-500"
                style={{ opacity: 0.025 }}>
                <stat.icon className="w-20 h-20" style={{ color: stat.accent }} />
              </div>

              <div className="relative z-10">
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
                  style={{
                    background: `${stat.accent}08`,
                    border: `1px solid ${stat.accent}15`,
                  }}>
                  <stat.icon className="w-4 h-4 stroke-[1.5]" style={{ color: stat.accent }} />
                </div>

                {/* Value */}
                <div className="text-metric mb-2">
                  <AnimatedValue value={stat.value} />
                </div>

                {/* Label */}
                <div className="text-label">{stat.label}</div>
              </div>

              {/* Bottom accent (on hover) */}
              <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${stat.accent}30, transparent)` }} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════════ ANALYTICS ROW (ADMIN / DEBUGGER) ═══════════════ */}
      {(userRole === 'ADMIN' || userRole === 'DEBUGGER') && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6"
        >
          {/* ── Network Telemetry Chart ── */}
          <motion.div variants={fadeUp} className="xl:col-span-2">
            <div className="chart-container">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.12)' }}>
                    <Activity className="w-4 h-4 stroke-[1.5]" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <div className="text-[11px] text-white/75 tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Network Telemetry</div>
                    <div className="text-caption mt-0.5">Real-time surveillance</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.12)' }}>
                  <span className="status-dot status-dot--online" />
                  <span className="text-[8px] uppercase tracking-[0.15em] font-medium"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>LIVE</span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={assetActivityData}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.18)' }} axisLine={{ stroke: 'rgba(255,255,255,0.04)' }} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.18)' }} axisLine={{ stroke: 'rgba(255,255,255,0.04)' }} tickLine={false} dx={-10} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="created" stroke="#00d4ff" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" />
                  <Area type="monotone" dataKey="transferred" stroke="#ff9f43" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* ── Audit Feed ── */}
          <motion.div variants={fadeUp}>
            <div className="chart-container flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <Terminal className="w-4 h-4 stroke-[1.5]" style={{ color: 'rgba(255, 255, 255, 0.50)' }} />
                  </div>
                  <div>
                    <div className="text-[11px] text-white/75 tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Audit Feed</div>
                    <div className="text-caption mt-0.5">System events</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-2.5 overflow-hidden">
                <AnimatePresence initial={false}>
                  {activeEvents.map((event, i) => (
                    <motion.div
                      key={`${event.type}-${i}-${feedIndex}`}
                      initial={{ opacity: 0, x: -8, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="relative pl-4 p-3 rounded-xl transition-all duration-300"
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.07)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.02)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.04)';
                        }}
                      >
                        {/* Severity bar */}
                        <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ backgroundColor: feedSeverityColors[event.severity] || '#fff', opacity: 0.6 }} />
                        <div className="text-[9px] tracking-[0.15em] uppercase mb-1.5"
                          style={{ fontFamily: 'var(--font-mono)', color: feedSeverityColors[event.severity] || '#fff' }}>
                          {event.type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[10px] leading-relaxed mb-2" style={{ color: 'rgba(255, 255, 255, 0.50)', fontWeight: 300 }}>
                          {event.message}
                        </div>
                        <div className="flex items-center justify-between text-caption">
                          <span>{event.user}</span>
                          <span>{event.timestamp}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ═══════════════ INTELLIGENCE GRID (ADMIN) ═══════════════ */}
      {userRole === 'ADMIN' && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6"
        >
          {/* ── Access Logs ── */}
          <motion.div variants={fadeUp}>
            <div className="chart-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.12)' }}>
                  <ShieldIcon className="w-4 h-4 stroke-[1.5]" style={{ color: 'var(--accent)' }} />
                </div>
                <span className="text-[10px] tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.55)' }}>Access Logs</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={accessAttemptsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.18)' }} axisLine={{ stroke: 'rgba(255,255,255,0.04)' }} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.18)' }} axisLine={{ stroke: 'rgba(255,255,255,0.04)' }} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="granted" fill="#00d4ff" radius={[4, 4, 0, 0]} barSize={10} opacity={0.8} />
                  <Bar dataKey="denied" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={10} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* ── Identity Distribution ── */}
          <motion.div variants={fadeUp}>
            <div className="chart-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(129, 140, 248, 0.06)', border: '1px solid rgba(129, 140, 248, 0.12)' }}>
                  <Fingerprint className="w-4 h-4 stroke-[1.5]" style={{ color: 'var(--info)' }} />
                </div>
                <span className="text-[10px] tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.55)' }}>Identities</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    dataKey="value"
                    stroke="rgba(3, 3, 8, 0.5)"
                    strokeWidth={2}
                  >
                    {roleDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.75} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                {roleDistribution.map((r) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: r.color, opacity: 0.75 }} />
                    <span className="text-caption">{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Chain Volume ── */}
          <motion.div variants={fadeUp}>
            <div className="chart-container">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.12)' }}>
                  <Blocks className="w-4 h-4 stroke-[1.5]" style={{ color: 'var(--accent)' }} />
                </div>
                <span className="text-[10px] tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.55)' }}>Chain Volume</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={blockchainTxOverTime} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.18)' }} axisLine={{ stroke: 'rgba(255,255,255,0.04)' }} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.18)' }} axisLine={{ stroke: 'rgba(255,255,255,0.04)' }} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                  <Line type="monotone" dataKey="transactions" stroke="#00d4ff" strokeWidth={2} dot={false}
                    activeDot={{ r: 4, fill: '#00d4ff', stroke: 'rgba(3, 3, 8, 0.6)', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ═══════════════ FIELD OPS (VIEWER / ALTER) ═══════════════ */}
      {(userRole === 'ALTER' || userRole === 'VIEWER') && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
        >
          {/* Security Protocol */}
          <motion.div variants={fadeUp}>
            <div className="chart-container">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <Lock className="w-5 h-5 stroke-[1.5]" style={{ color: 'rgba(255, 255, 255, 0.50)' }} />
                </div>
                <div>
                  <div className="text-[11px] text-white/75 tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Security Protocol</div>
                  <div className="text-caption mt-0.5">Encryption layers</div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Data Access',     desc: 'Secure 6-digit cryptographic PIN required', status: 'LOCKED', icon: FileText,       color: '#ef4444' },
                  { label: 'Asset Transfers',  desc: 'Hardware wallet signature mandatory',       status: 'ACTIVE', icon: ArrowRightLeft, color: '#22c55e' },
                  { label: 'Network Audit',    desc: 'Immutable logging enabled',                status: 'ONLINE', icon: Blocks,          color: '#00d4ff' },
                ].map((item, i) => (
                  <div key={i} className="relative group">
                    <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ backgroundColor: item.color, opacity: 0.5 }} />
                    <div className="flex items-start gap-4 pl-4 p-4 rounded-xl transition-all duration-300"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.07)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.02)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.04)';
                      }}
                    >
                      <item.icon className="w-5 h-5 shrink-0 stroke-[1.5] mt-0.5" style={{ color: item.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] text-white/75 uppercase tracking-[0.12em]" style={{ fontFamily: 'var(--font-mono)' }}>{item.label}</span>
                          <span className="text-[8px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-lg"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color: item.color,
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: `${item.color}20`,
                              backgroundColor: `${item.color}08`,
                            }}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.35)', fontWeight: 300 }}>{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Restricted Zone */}
          <motion.div variants={fadeUp}>
            <div className="chart-container flex items-center justify-center relative" style={{ minHeight: '360px' }}>
              {/* Subtle grid pattern */}
              <div className="absolute inset-0 opacity-[0.015]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M20 0v40M0 20h40' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
              }} />

              <div className="text-center relative z-10 max-w-sm">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: '0 1px 0 rgba(255, 255, 255, 0.03) inset',
                  }}>
                  <Eye className="w-6 h-6" style={{ color: 'rgba(255, 255, 255, 0.30)' }} />
                </div>
                <h3 className="text-sm text-white/70 uppercase tracking-[0.18em] mb-4 font-medium" style={{ fontFamily: 'var(--font-mono)' }}>Restricted Zone</h3>
                <p className="text-[11px] leading-relaxed mb-5" style={{ color: 'rgba(255, 255, 255, 0.30)', fontWeight: 300 }}>
                  Operating in classified sector. All actions, queries, and file access are monitored and recorded.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="status-dot status-dot--online" />
                  <span className="text-caption" style={{ color: 'var(--success)' }}>BLOCKCHAIN AUDIT ACTIVE</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
