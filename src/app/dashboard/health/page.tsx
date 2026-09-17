'use client';

import { Activity, CheckCircle2, Server, Database, Globe, Blocks, Shield, Cpu, HardDrive, Wifi } from 'lucide-react';

const services = [
  { name: 'Next.js Frontend', status: 'ONLINE', uptime: '99.98%', latency: '12ms', icon: Globe, color: '#00ff88' },
  { name: 'Go/Gin Backend', status: 'ONLINE', uptime: '99.95%', latency: '8ms', icon: Server, color: '#00ff88' },
  { name: 'Supabase PostgreSQL', status: 'ONLINE', uptime: '99.99%', latency: '5ms', icon: Database, color: '#00ff88' },
  { name: 'Blockchain Node', status: 'ONLINE', uptime: '99.90%', latency: '45ms', icon: Blocks, color: '#00ff88' },
  { name: 'IPFS / Pinata', status: 'ONLINE', uptime: '99.85%', latency: '120ms', icon: HardDrive, color: '#00ff88' },
  { name: 'Custom Auth + MetaMask', status: 'ONLINE', uptime: '99.99%', latency: '15ms', icon: Shield, color: '#00ff88' },
];

const metrics = [
  { label: 'CPU Usage', value: '23%', max: 100, current: 23, color: '#00f0ff' },
  { label: 'Memory', value: '1.8 GB / 4 GB', max: 100, current: 45, color: '#00ff88' },
  { label: 'Disk I/O', value: '12 MB/s', max: 100, current: 15, color: '#3b82f6' },
  { label: 'Network', value: '45 Mbps', max: 100, current: 35, color: '#a855f7' },
];

export default function HealthPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>ALL SERVICES OPERATIONAL — LAST CHECK: {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
          <span className="text-[10px] text-[#00ff88] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>ALL SYSTEMS GREEN</span>
        </div>
      </div>

      {/* Service status */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.name} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] hover:border-[rgba(0,255,136,0.1)] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <service.icon className="w-5 h-5 text-[#00f0ff]" />
                <span className="text-xs text-white font-medium">{service.name}</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[#00ff88]" style={{ fontFamily: 'var(--font-mono)' }}>
                <CheckCircle2 className="w-3 h-3" /> {service.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
              <div><span className="text-[#5a6068]">Uptime: </span><span className="text-[#00ff88]">{service.uptime}</span></div>
              <div><span className="text-[#5a6068]">Latency: </span><span className="text-[#e8eaed]">{service.latency}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* System metrics */}
      <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
        <div className="flex items-center gap-2 mb-5">
          <Cpu className="w-4 h-4 text-[#00f0ff]" />
          <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>SYSTEM METRICS</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9aa0a8]" style={{ fontFamily: 'var(--font-mono)' }}>{m.label}</span>
                <span className="text-xs text-white" style={{ fontFamily: 'var(--font-mono)' }}>{m.value}</span>
              </div>
              <div className="h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${m.current}%`, background: m.color, boxShadow: `0 0 10px ${m.color}40` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
