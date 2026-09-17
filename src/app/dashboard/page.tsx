'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Activity, Boxes, ArrowRightLeft, Blocks, FileCheck,
  ShieldAlert, XCircle, TrendingUp, TrendingDown, BarChart3,
  UserPlus, Shield as ShieldIcon, CheckCircle2, ArrowRight,
  RefreshCw, ClipboardCheck, ShieldOff, Zap, Brain,
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

const statCards = [
  { label: 'Total Identities', value: dashboardStats.totalIdentities, icon: Users, color: '#00f0ff', trend: '--', up: true },
  { label: 'Active Users', value: dashboardStats.activeUsers, icon: Activity, color: '#00ff88', trend: '--', up: true },
  { label: 'Registered Assets', value: dashboardStats.registeredAssets, icon: Boxes, color: '#3b82f6', trend: '--', up: true },
  { label: 'Assets Transferred', value: dashboardStats.assetsTransferred, icon: ArrowRightLeft, color: '#a855f7', trend: '--', up: true },
  { label: 'Blockchain Txns', value: dashboardStats.blockchainTxns, icon: Blocks, color: '#00f0ff', trend: '--', up: true },
  { label: 'IPFS Documents', value: dashboardStats.ipfsDocuments, icon: FileCheck, color: '#00ff88', trend: '--', up: true },
  { label: 'Security Events', value: dashboardStats.securityEvents, icon: ShieldAlert, color: '#f59e0b', trend: '--', up: false },
  { label: 'Gas Fees (ETH)', value: dashboardStats.totalGasFeesCollected, icon: Zap, color: '#f59e0b', trend: '--', up: true },
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
    <div className="rounded-lg bg-[rgba(10,10,20,0.95)] border border-[rgba(255,255,255,0.1)] px-3 py-2 backdrop-blur-xl">
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Command Centre</h1>
          <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            OPERATIONAL OVERVIEW — LAST UPDATED: {new Date().toLocaleTimeString()} UTC
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(0,240,255,0.1)] bg-[rgba(0,240,255,0.03)]">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[10px] text-[#00f0ff] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
              SYSTEM LIVE
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(245,158,11,0.1)] bg-[rgba(245,158,11,0.03)]">
            <Zap className="w-3 h-3 text-[#f59e0b]" />
            <span className="text-[10px] text-[#f59e0b] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
              GAS: {GAS_FEE_PER_ACTION} ETH/ACTION
            </span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            variants={fadeInUp}
            whileHover={{ y: -4, borderColor: `${stat.color}30` }}
            className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}20` }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] text-[#5a6068]`} style={{ fontFamily: 'var(--font-mono)' }}>
                {stat.trend}
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

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asset Activity Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#00f0ff]" />
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
                <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
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
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
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

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Access Attempts */}
        <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
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

        {/* Role Distribution — 4 roles now */}
        <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
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
                <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                <span className="text-[9px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>{r.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Blockchain Transactions Over Time */}
        <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
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

      {/* Asset Distribution */}
      <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
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
    </div>
  );
}
