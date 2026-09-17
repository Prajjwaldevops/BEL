'use client';

import { Settings as SettingsIcon, Shield, Globe, Database, Key, Bell, Palette } from 'lucide-react';

const settingsGroups = [
  {
    title: 'Authentication',
    icon: Shield,
    settings: [
      { label: 'Auth Provider', value: 'Custom (Secret Key + Admin)', type: 'status' },
      { label: 'Registration Gate', value: 'Secret Key Required', type: 'text' },
      { label: 'Session Timeout', value: '30 minutes', type: 'text' },
      { label: 'JWT Verification', value: 'Enabled', type: 'status' },
    ],
  },
  {
    title: 'Blockchain',
    icon: Globe,
    settings: [
      { label: 'Network', value: 'Hardhat Local (Chain ID: 31337)', type: 'text' },
      { label: 'RPC Endpoint', value: 'http://localhost:8545', type: 'text' },
      { label: 'Auto-Sync Events', value: 'Enabled', type: 'status' },
      { label: 'Gas Price Strategy', value: 'Auto', type: 'text' },
    ],
  },
  {
    title: 'Database',
    icon: Database,
    settings: [
      { label: 'Provider', value: 'Supabase PostgreSQL', type: 'text' },
      { label: 'RLS Policies', value: 'Enabled', type: 'status' },
      { label: 'Connection Pool', value: '20 connections', type: 'text' },
      { label: 'Auto Backups', value: 'Daily', type: 'text' },
    ],
  },
  {
    title: 'Security',
    icon: Key,
    settings: [
      { label: 'CORS Origins', value: 'http://localhost:3000', type: 'text' },
      { label: 'Rate Limiting', value: '100 req/min', type: 'text' },
      { label: 'Security Headers', value: 'Enabled', type: 'status' },
      { label: 'Audit Logging', value: 'All Actions', type: 'text' },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>SYSTEM CONFIGURATION — ADMIN ONLY</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsGroups.map((group) => (
          <div key={group.title} className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
              <group.icon className="w-5 h-5 text-[#00f0ff]" />
              <h3 className="text-sm font-semibold text-white">{group.title}</h3>
            </div>
            <div className="space-y-3">
              {group.settings.map((setting) => (
                <div key={setting.label} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.03)] last:border-0">
                  <span className="text-xs text-[#9aa0a8]">{setting.label}</span>
                  {setting.type === 'status' ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-[#00ff88]" style={{ fontFamily: 'var(--font-mono)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                      {setting.value}
                    </span>
                  ) : (
                    <span className="text-xs text-[#e8eaed]" style={{ fontFamily: 'var(--font-mono)' }}>{setting.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Gas fee info */}
      <div className="p-4 rounded-xl border border-dashed border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.03)]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b] animate-pulse" />
          <div>
            <div className="text-xs font-semibold text-[#f59e0b]" style={{ fontFamily: 'var(--font-mono)' }}>GAS FEE ACTIVE</div>
            <p className="text-[10px] text-[#9aa0a8] mt-0.5">Every user action (view, modify, access) incurs a gas fee of 0.00001 ETH, logged immutably on the blockchain audit trail.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
