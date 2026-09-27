'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Shield, AlertTriangle, Activity, TrendingUp,
  Clock, Eye, FileWarning, Lock, UserX, Search,
  BarChart3, Users, Fingerprint, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, Zap, Database,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import { staggerContainer, fadeInUp } from '@/lib/animations';

// AI Analysis mock data (will be replaced with real Supabase queries)
const loginTrailData = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  successful: Math.floor(Math.random() * 20) + 5,
  failed: Math.floor(Math.random() * 5),
  blocked: Math.floor(Math.random() * 2),
}));

const irregularityData = [
  { type: 'Off-hours Login', count: 3, severity: 'MEDIUM' as const, color: '#f59e0b' },
  { type: 'Multiple Failed Attempts', count: 7, severity: 'HIGH' as const, color: '#ef4444' },
  { type: 'Unknown IP Access', count: 2, severity: 'CRITICAL' as const, color: '#dc2626' },
  { type: 'Role Escalation Attempt', count: 1, severity: 'CRITICAL' as const, color: '#dc2626' },
  { type: 'Unusual Data Volume', count: 4, severity: 'MEDIUM' as const, color: '#f59e0b' },
  { type: 'Session Anomaly', count: 6, severity: 'LOW' as const, color: '#3b82f6' },
];

const confidentialAccessData = Array.from({ length: 14 }, (_, i) => ({
  date: `Day ${i + 1}`,
  authorized: Math.floor(Math.random() * 10) + 2,
  unauthorized: Math.floor(Math.random() * 3),
  flagged: Math.floor(Math.random() * 2),
}));

const changeTrackingData = [
  { category: 'Profile Updates', changes: 12, flagged: 1 },
  { category: 'Asset Modifications', changes: 8, flagged: 2 },
  { category: 'Permission Changes', changes: 5, flagged: 1 },
  { category: 'Document Edits', changes: 15, flagged: 0 },
  { category: 'Classification Changes', changes: 3, flagged: 3 },
];

const riskScoreHistory = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  score: Math.floor(Math.random() * 30) + 10,
}));

const recentAlerts = [
  { id: 1, type: 'BRUTE_FORCE', message: '5 failed login attempts from IP 192.168.1.254', severity: 'CRITICAL' as const, timestamp: '2 min ago', resolved: false },
  { id: 2, type: 'OFF_HOURS', message: 'Login detected at 03:45 AM from user bel_arjn_4821', severity: 'MEDIUM' as const, timestamp: '15 min ago', resolved: false },
  { id: 3, type: 'CLASSIFIED_ACCESS', message: 'TOP SECRET document accessed by ALTER role user', severity: 'HIGH' as const, timestamp: '1 hr ago', resolved: true },
  { id: 4, type: 'DATA_EXPORT', message: 'Large data export (450MB) initiated by debugger account', severity: 'MEDIUM' as const, timestamp: '2 hr ago', resolved: true },
  { id: 5, type: 'ROLE_ESCALATION', message: 'Attempted role change from VIEWER to ADMIN blocked', severity: 'CRITICAL' as const, timestamp: '3 hr ago', resolved: true },
  { id: 6, type: 'SESSION_ANOMALY', message: 'Simultaneous sessions from 2 different locations', severity: 'HIGH' as const, timestamp: '5 hr ago', resolved: true },
];

const severityColors: Record<string, string> = {
  LOW: '#3b82f6',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#dc2626',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg bg-[rgba(10,10,20,0.95)] border border-[rgba(255,255,255,0.1)] px-3 py-2 backdrop-blur-xl">
      <p className="text-[10px] text-[#5a6068] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: entry.color, fontFamily: 'var(--font-mono)' }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function AIAnalysisPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'logins' | 'changes' | 'classified'>('overview');
  const [riskScore, setRiskScore] = useState(0);

  useEffect(() => {
    // Animate risk score
    let current = 0;
    const target = 24;
    const interval = setInterval(() => {
      current += 1;
      setRiskScore(current);
      if (current >= target) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'Login Trails', value: '847', icon: Fingerprint, color: '#00f0ff', trend: '+12', up: true },
    { label: 'Irregularities', value: '23', icon: AlertTriangle, color: '#ef4444', trend: '-5', up: false },
    { label: 'Classified Access', value: '156', icon: Lock, color: '#a855f7', trend: '+8', up: true },
    { label: 'Gas Fees Collected', value: '0.0847', icon: Zap, color: '#f59e0b', trend: '+0.012', up: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#7c5cfc] flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Analysis</h1>
            <p className="text-[10px] text-[#5a6068] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
              INTELLIGENT SECURITY MONITORING — ANOMALY DETECTION — AUDIT INTELLIGENCE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
            riskScore < 30 ? 'bg-[rgba(0,255,136,0.05)] border-[rgba(0,255,136,0.15)]' :
            riskScore < 60 ? 'bg-[rgba(245,158,11,0.05)] border-[rgba(245,158,11,0.15)]' :
            'bg-[rgba(239,68,68,0.05)] border-[rgba(239,68,68,0.15)]'
          }`}>
            <Shield className={`w-4 h-4 ${
              riskScore < 30 ? 'text-[#00ff88]' : riskScore < 60 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
            }`} />
            <div>
              <div className="text-[8px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>RISK SCORE</div>
              <div className={`text-lg font-bold ${
                riskScore < 30 ? 'text-[#00ff88]' : riskScore < 60 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
              }`} style={{ fontFamily: 'var(--font-mono)' }}>{riskScore}/100</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
        {[
          { id: 'overview' as const, label: 'OVERVIEW', icon: BarChart3 },
          { id: 'logins' as const, label: 'LOGIN TRAILS', icon: Fingerprint },
          { id: 'changes' as const, label: 'CHANGE TRACKING', icon: Activity },
          { id: 'classified' as const, label: 'CLASSIFIED ACCESS', icon: Lock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] tracking-[0.05em] transition-all ${
              activeTab === tab.id
                ? 'bg-[rgba(168,85,247,0.1)] text-[#a855f7] border border-[rgba(168,85,247,0.2)]'
                : 'text-[#5a6068] hover:text-white hover:bg-[rgba(255,255,255,0.03)]'
            }`}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            variants={fadeInUp}
            className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}20` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] ${stat.up ? 'text-[#00ff88]' : 'text-[#ef4444]'}`}
                style={{ fontFamily: 'var(--font-mono)' }}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{stat.value}</div>
            <div className="text-[10px] text-[#5a6068] mt-1 tracking-[0.05em]" style={{ fontFamily: 'var(--font-mono)' }}>{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Login Trail Chart */}
          <div className="lg:col-span-2 p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-4 h-4 text-[#00f0ff]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>LOGIN TRAIL ANALYSIS</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={loginTrailData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="successful" stroke="#00ff88" fill="rgba(0,255,136,0.1)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="blocked" stroke="#f59e0b" fill="rgba(245,158,11,0.1)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3">
              {[{ label: 'Successful', color: '#00ff88' }, { label: 'Failed', color: '#ef4444' }, { label: 'Blocked', color: '#f59e0b' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Irregularity Flags */}
          <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>IRREGULARITY FLAGS</span>
            </div>
            <div className="space-y-2">
              {irregularityData.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-[10px] text-[#e8eaed]" style={{ fontFamily: 'var(--font-mono)' }}>{item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{item.count}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded tracking-[0.05em]`}
                      style={{ background: `${item.color}15`, color: item.color, fontFamily: 'var(--font-mono)' }}>
                      {item.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logins' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#00f0ff]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>LOGIN FREQUENCY OVER TIME</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={loginTrailData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="successful" stroke="#00ff88" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#a855f7]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>RISK SCORE TREND</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={riskScoreHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" stroke="#a855f7" fill="rgba(168,85,247,0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'changes' && (
        <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>DATA MODIFICATION TRACKING</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={changeTrackingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="category" tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="changes" fill="rgba(59,130,246,0.6)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="flagged" fill="rgba(239,68,68,0.6)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>Total Changes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>Flagged by AI</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'classified' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-[#a855f7]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>CONFIDENTIAL ACCESS OVER TIME</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={confidentialAccessData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#5a6068' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="authorized" stroke="#00ff88" fill="rgba(0,255,136,0.1)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="unauthorized" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="flagged" stroke="#f59e0b" fill="rgba(245,158,11,0.1)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-[#ef4444]" />
              <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>ACCESS BY CLASSIFICATION</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'UNCLASSIFIED', value: 45, color: '#3b82f6' },
                    { name: 'CONFIDENTIAL', value: 28, color: '#00ff88' },
                    { name: 'SECRET', value: 18, color: '#f59e0b' },
                    { name: 'TOP SECRET', value: 8, color: '#ef4444' },
                    { name: 'TS//SCI', value: 3, color: '#dc2626' },
                  ]}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none"
                >
                  {[
                    { color: '#3b82f6' }, { color: '#00ff88' }, { color: '#f59e0b' },
                    { color: '#ef4444' }, { color: '#dc2626' },
                  ].map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.8} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent AI Alerts */}
      <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-[#ef4444]" />
            <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>RECENT AI ALERTS</span>
          </div>
          <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
            {recentAlerts.filter(a => !a.resolved).length} UNRESOLVED
          </span>
        </div>
        <div className="space-y-2">
          {recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                !alert.resolved
                  ? 'bg-[rgba(239,68,68,0.03)] border-[rgba(239,68,68,0.1)]'
                  : 'bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.04)]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: severityColors[alert.severity] }} />
                <div className="min-w-0">
                  <div className="text-[10px] text-white font-medium truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                    {alert.type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[9px] text-[#5a6068] truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                    {alert.message}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className="text-[8px] px-1.5 py-0.5 rounded" style={{
                  background: `${severityColors[alert.severity]}15`,
                  color: severityColors[alert.severity],
                  fontFamily: 'var(--font-mono)',
                }}>
                  {alert.severity}
                </span>
                <span className="text-[9px] text-[#3a3f45]" style={{ fontFamily: 'var(--font-mono)' }}>{alert.timestamp}</span>
                {alert.resolved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88]" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
