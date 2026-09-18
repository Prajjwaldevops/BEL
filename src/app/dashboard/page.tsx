'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Activity, Boxes, ArrowRightLeft, Blocks, FileCheck,
  ShieldAlert, XCircle, BarChart3,
  Shield as ShieldIcon, CheckCircle2, ArrowRight,
  RefreshCw, ClipboardCheck, ShieldOff, Zap, Brain,
  Crosshair, Radio, Lock, FileText, Eye, AlertTriangle,
  Fingerprint, UserPlus, Terminal,
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
import { staggerContainer, fadeInUp } from '@/lib/animations';
import { GAS_FEE_PER_ACTION } from '@/lib/constants';

const dashboardStats = getDashboardStats();

// Role-specific theme config
const ROLE_THEMES: Record<string, { accent: string; accentBg: string; label: string }> = {
  ADMIN: { accent: '#ef4444', accentBg: 'rgba(239,68,68,', label: 'TACTICAL COMMAND CENTRE' },
  VIEWER: { accent: '#00f0ff', accentBg: 'rgba(0,240,255,', label: 'INTELLIGENCE BRIEFING' },
  ALTER: { accent: '#f59e0b', accentBg: 'rgba(245,158,11,', label: 'FIELD OPERATIONS CONSOLE' },
  DEBUGGER: { accent: '#a855f7', accentBg: 'rgba(168,85,247,', label: 'SPECIAL OPERATIONS CONSOLE' },
};

const statCards = [
  { label: 'Total Identities', value: dashboardStats.totalIdentities, icon: Users, color: '#00f0ff', roles: ['ADMIN'] },
  { label: 'Active Users', value: dashboardStats.activeUsers, icon: Activity, color: '#00ff88', roles: ['ADMIN'] },
  { label: 'Registered Assets', value: dashboardStats.registeredAssets, icon: Boxes, color: '#3b82f6', roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'] },
  { label: 'Assets Transferred', value: dashboardStats.assetsTransferred, icon: ArrowRightLeft, color: '#a855f7', roles: ['ADMIN', 'ALTER'] },
  { label: 'Blockchain Txns', value: dashboardStats.blockchainTxns, icon: Blocks, color: '#00f0ff', roles: ['ADMIN'] },
  { label: 'IPFS Documents', value: dashboardStats.ipfsDocuments, icon: FileCheck, color: '#00ff88', roles: ['ADMIN', 'ALTER', 'DEBUGGER'] },
  { label: 'Security Events', value: dashboardStats.securityEvents, icon: ShieldAlert, color: '#f59e0b', roles: ['ADMIN', 'DEBUGGER'] },
  { label: 'Gas Fees (ETH)', value: dashboardStats.totalGasFeesCollected, icon: Zap, color: '#f59e0b', roles: ['ADMIN'] },
];

const feedIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  UserPlus, Shield: ShieldIcon, Boxes, CheckCircle: CheckCircle2, XCircle,
  ArrowRightLeft, FileCheck, ShieldOff, RefreshCw, ClipboardCheck,
};

const feedColors: Record<string, string> = {
  info: '#00f0ff',
  success: '#00ff88',
  warning: '#f59e0b',
  error: '#ef4444',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[rgba(2,2,4,0.95)] border border-[rgba(255,255,255,0.1)] px-3 py-2 backdrop-blur-xl">
      <p className="text-[10px] text-[#5a6068] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: entry.color, fontFamily: 'var(--font-mono)' }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function DashboardOverview() {
  const [activeEvents, setActiveEvents] = useState(liveFeedEvents.slice(0, 6));
  const [feedIndex, setFeedIndex] = useState(0);
  const [userRole, setUserRole] = useState('ADMIN');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('bel_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUserRole(parsed.user?.role || 'VIEWER');
        setUserName(parsed.user?.displayName || parsed.user?.username || 'Operator');
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeedIndex((prev) => {
        const next = (prev + 1) % liveFeedEvents.length;
        setActiveEvents((prevEvents) => {
          return [liveFeedEvents[next], ...prevEvents.slice(0, 5)];
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const theme = ROLE_THEMES[userRole] || ROLE_THEMES.VIEWER;
  const visibleStats = statCards.filter(s => s.roles.includes(userRole));

  return (
    <div className="space-y-6">
      {/* Page header — Role-specific */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Crosshair className="w-5 h-5" style={{ color: theme.accent }} />
            <h1 className="text-xl font-bold text-white tracking-[0.05em]" style={{ fontFamily: 'var(--font-display)' }}>
              {theme.label}
            </h1>
          </div>
          <p className="text-[10px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
            OPERATOR: {userName.toUpperCase()} // LAST SYNC: {new Date().toLocaleTimeString()} UTC // STATUS: OPERATIONAL
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 border"
            style={{ borderColor: theme.accentBg + '0.15)', background: theme.accentBg + '0.03)' }}
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: theme.accent }}
            />
            <span className="text-[10px] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)', color: theme.accent }}>
              {userRole} MODE
            </span>
          </div>
          {userRole === 'ADMIN' && (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-[rgba(245,158,11,0.1)] bg-[rgba(245,158,11,0.03)]">
              <Zap className="w-3 h-3 text-[#f59e0b]" />
              <span className="text-[10px] text-[#f59e0b] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                GAS: {GAS_FEE_PER_ACTION} ETH/ACTION
              </span>
            </div>
          )}
        </div>
      </div>

      {/* VIEWER-specific briefing banner */}
      {userRole === 'VIEWER' && (
        <div className="flex items-start gap-3 px-4 py-3 border border-[rgba(0,240,255,0.15)] bg-[rgba(0,240,255,0.03)]">
          <Eye className="w-4 h-4 text-[#00f0ff] mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-[#00f0ff] font-bold tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
              INTELLIGENCE OBSERVER MODE
            </div>
            <div className="text-[9px] text-[#5a6068] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
              View-only access within your assigned department. Document access requires 6-digit access code. All viewing activity is logged on-chain.
            </div>
          </div>
        </div>
      )}

      {/* ALTER-specific ops banner */}
      {userRole === 'ALTER' && (
        <div className="flex items-start gap-3 px-4 py-3 border border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.03)]">
          <FileText className="w-4 h-4 text-[#f59e0b] mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-[#f59e0b] font-bold tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
              FIELD OPERATIONS MODE
            </div>
            <div className="text-[9px] text-[#5a6068] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
              Minor edits within department scope. Document access requires 6-digit access code. All modifications logged on-chain with gas fee.
            </div>
          </div>
        </div>
      )}

      {/* DEBUGGER-specific ops banner */}
      {userRole === 'DEBUGGER' && (
        <div className="flex items-start gap-3 px-4 py-3 border border-[rgba(168,85,247,0.15)] bg-[rgba(168,85,247,0.03)]">
          <Terminal className="w-4 h-4 text-[#a855f7] mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-[#a855f7] font-bold tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
              SPECIAL OPERATIONS MODE — CROSS-DEPARTMENT ACCESS
            </div>
            <div className="text-[9px] text-[#5a6068] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
              Full cross-department access. Classified data viewing enabled. Document access requires 6-digit access code. All activity monitored and logged.
            </div>
          </div>
        </div>
      )}

      {/* Stat cards — filtered by role */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={`grid gap-4 ${
          visibleStats.length <= 4 ? 'grid-cols-2 md:grid-cols-4' :
          visibleStats.length <= 6 ? 'grid-cols-2 md:grid-cols-3' :
          'grid-cols-2 md:grid-cols-4'
        }`}
      >
        {visibleStats.map((stat, i) => (
          <motion.div
            key={i}
            variants={fadeInUp}
            whileHover={{ y: -4, borderColor: `${stat.color}30` }}
            className="p-4 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 flex items-center justify-center"
                style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}20` }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
            <div className="text-[10px] text-[#5a6068] mt-1 tracking-[0.05em]" style={{ fontFamily: 'var(--font-mono)' }}>
              {stat.label}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row 1 — visible for ADMIN and DEBUGGER */}
      {(userRole === 'ADMIN' || userRole === 'DEBUGGER') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Asset Activity Chart */}
          <div className="lg:col-span-2 p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: theme.accent }} />
                <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>ASSET LIFECYCLE ACTIVITY</span>
              </div>
              <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>LAST 30 DAYS</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={assetActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="created" stackId="1" stroke="#00f0ff" fill="rgba(0,240,255,0.15)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="transferred" stackId="1" stroke="#a855f7" fill="rgba(168,85,247,0.15)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="audited" stackId="1" stroke="#00ff88" fill="rgba(0,255,136,0.15)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-3">
              {[{ label: 'Created', color: '#00f0ff' }, { label: 'Transferred', color: '#a855f7' }, { label: 'Audited', color: '#00ff88' }].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2" style={{ background: item.color }} />
                  <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>LIVE ACTIVITY</span>
              </div>
            </div>
            <div className="space-y-2 overflow-hidden">
              {activeEvents.map((event, i) => {
                const FeedIcon = feedIcons[event.icon] || Activity;
                return (
                  <motion.div
                    key={`${event.type}-${i}-${feedIndex}`}
                    initial={i === 0 ? { opacity: 0, x: -20 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2.5 p-2.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
                  >
                    <FeedIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: feedColors[event.severity] }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium truncate" style={{ color: feedColors[event.severity], fontFamily: 'var(--font-mono)' }}>
                        {event.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[9px] text-[#5a6068] truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                        {event.message}
                      </div>
                      <div className="text-[8px] text-[#3a3f45] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                        {event.user} · {event.timestamp}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Charts row 2 — ADMIN-only full analytics */}
      {userRole === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Access Attempts */}
          <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <ShieldIcon className="w-4 h-4 text-[#00ff88]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>ACCESS REQUESTS</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={accessAttemptsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="granted" fill="rgba(0,255,136,0.6)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="denied" fill="rgba(239,68,68,0.6)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Role Distribution */}
          <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[#a855f7]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>ROLE DISTRIBUTION</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  stroke="none"
                >
                  {roleDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.8} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {roleDistribution.map((r) => (
                <div key={r.name} className="flex items-center gap-1">
                  <span className="w-2 h-2" style={{ background: r.color }} />
                  <span className="text-[9px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>{r.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Blockchain Transactions */}
          <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <Blocks className="w-4 h-4 text-[#00f0ff]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>BLOCKCHAIN TXNS</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={blockchainTxOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="transactions" stroke="#00f0ff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Asset Distribution — ADMIN + ALTER */}
      {(userRole === 'ADMIN' || userRole === 'ALTER') && (
        <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
          <div className="flex items-center gap-2 mb-4">
            <Boxes className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>ASSET DISTRIBUTION BY CATEGORY</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={assetDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#5a6068' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 9, fill: '#9aa0a8' }} axisLine={false} tickLine={false} width={130} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="rgba(59,130,246,0.6)" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* VIEWER — Department access summary */}
      {userRole === 'VIEWER' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 border border-[rgba(0,240,255,0.1)] bg-[rgba(0,240,255,0.02)]">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-[#00f0ff]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>ACCESS PROTOCOL</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Document Access', desc: '6-digit code required for each document', icon: FileText, status: 'RESTRICTED' },
                { label: 'Asset Viewing', desc: 'Department-scoped read-only access', icon: Eye, status: 'ACTIVE' },
                { label: 'Blockchain Audit', desc: 'All access logged on-chain with tx hash', icon: Blocks, status: 'MONITORING' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 px-3 py-2 border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)]">
                  <item.icon className="w-3.5 h-3.5 text-[#00f0ff] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white font-medium" style={{ fontFamily: 'var(--font-mono)' }}>{item.label}</span>
                      <span className="text-[8px] text-[#00f0ff]" style={{ fontFamily: 'var(--font-mono)' }}>{item.status}</span>
                    </div>
                    <span className="text-[9px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-4 h-4 text-[#00f0ff]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>YOUR IDENTITY</span>
            </div>
            <div className="space-y-2 text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
              <div className="flex justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
                <span className="text-[#5a6068]">ROLE</span>
                <span className="text-[#00f0ff]">{userRole}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
                <span className="text-[#5a6068]">CLEARANCE</span>
                <span className="text-white">RESTRICTED</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
                <span className="text-[#5a6068]">ACCESS</span>
                <span className="text-[#f59e0b]">VIEW ONLY</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#5a6068]">BLOCKCHAIN</span>
                <span className="text-[#00ff88]">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEBUGGER — Security analysis */}
      {userRole === 'DEBUGGER' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Security Events */}
          <div className="p-5 border border-[rgba(168,85,247,0.1)] bg-[rgba(168,85,247,0.02)]">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-[#a855f7]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>ANOMALY DETECTION</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Unauthorized access attempts', count: 3, severity: 'HIGH', color: '#ef4444' },
                { label: 'Role escalation requests', count: 1, severity: 'MEDIUM', color: '#f59e0b' },
                { label: 'Cross-dept access logs', count: 12, severity: 'LOW', color: '#00f0ff' },
                { label: 'Classified data accesses', count: 7, severity: 'MONITOR', color: '#a855f7' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between px-3 py-2 border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" style={{ color: item.color }} />
                    <span className="text-[10px] text-[#9aa0a8]" style={{ fontFamily: 'var(--font-mono)' }}>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{item.count}</span>
                    <span className="text-[7px] px-1.5 py-0.5 border" style={{
                      fontFamily: 'var(--font-mono)',
                      color: item.color,
                      borderColor: item.color + '30',
                      background: item.color + '08',
                    }}>{item.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-department access */}
          <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-[#a855f7]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>CROSS-DEPARTMENT INTEL</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={accessAttemptsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="granted" fill="rgba(168,85,247,0.6)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="denied" fill="rgba(239,68,68,0.4)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
