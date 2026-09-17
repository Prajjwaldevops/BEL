'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BarChart3, Users, Boxes, ArrowRightLeft, Blocks, FileCheck, ShieldAlert, XCircle, Activity, TrendingUp } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { LIVE_FEED_EVENTS } from '@/lib/constants';
import { fadeInUp } from '@/lib/animations';

const stats = [
  { label: 'Total Identities', value: 2847, icon: Users, color: '#00f0ff' },
  { label: 'Active Users', value: 1293, icon: Activity, color: '#00ff88' },
  { label: 'Registered Assets', value: 5621, icon: Boxes, color: '#3b82f6' },
  { label: 'Assets Transferred', value: 847, icon: ArrowRightLeft, color: '#a855f7' },
  { label: 'Blockchain Txns', value: 18432, icon: Blocks, color: '#00f0ff' },
  { label: 'IPFS Documents', value: 3291, icon: FileCheck, color: '#00ff88' },
  { label: 'Security Events', value: 412, icon: ShieldAlert, color: '#f59e0b' },
  { label: 'Failed Access', value: 23, icon: XCircle, color: '#ef4444' },
];

const feedColors: Record<string, string> = {
  info: '#00f0ff',
  success: '#00ff88',
  warning: '#f59e0b',
  error: '#ef4444',
};

export default function DashboardPreview() {
  const [activeEvents, setActiveEvents] = useState(LIVE_FEED_EVENTS.slice(0, 5));
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % LIVE_FEED_EVENTS.length;
        setActiveEvents((prevEvents) => {
          const newEvent = LIVE_FEED_EVENTS[next];
          return [newEvent, ...prevEvents.slice(0, 4)];
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="dashboard-preview" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.2)] to-transparent" />
      <div className="absolute inset-0 grid-bg opacity-15 pointer-events-none" />

      <div className="section-container">
        <SectionHeading
          badge="Command Centre"
          title="Admin Command Centre"
          subtitle="Real-time operational overview with comprehensive monitoring, asset tracking, and security intelligence dashboard."
        />

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="rounded-2xl border border-[rgba(0,240,255,0.1)] bg-[rgba(5,5,8,0.9)] backdrop-blur-xl overflow-hidden shadow-[0_0_80px_rgba(0,240,255,0.05)]"
        >
          {/* Dashboard header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <span className="w-3 h-3 rounded-full bg-[#00ff88]" />
              </div>
              <span className="text-[10px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                BEL SENTINEL — COMMAND CENTRE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[10px] text-[#00ff88]" style={{ fontFamily: 'var(--font-mono)' }}>SYSTEM ONLINE</span>
            </div>
          </div>

          <div className="p-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    <TrendingUp className="w-3 h-3 text-[#00ff88]" />
                  </div>
                  <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                    <AnimatedCounter end={stat.value} duration={2.5} />
                  </div>
                  <div className="text-[10px] text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Chart placeholder */}
              <div className="lg:col-span-2 p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#00f0ff]" />
                    <span className="text-xs text-[#9aa0a8]" style={{ fontFamily: 'var(--font-mono)' }}>ASSET LIFECYCLE ACTIVITY</span>
                  </div>
                  <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>LAST 30 DAYS</span>
                </div>
                {/* Simulated chart bars */}
                <div className="flex items-end gap-1.5 h-32">
                  {Array.from({ length: 24 }, (_, i) => {
                    const height = 20 + Math.random() * 80;
                    const isHighlight = i === 18 || i === 20;
                    return (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.03 }}
                        className="flex-1 rounded-t-sm"
                        style={{
                          background: isHighlight
                            ? 'linear-gradient(to top, #00f0ff, rgba(0,240,255,0.3))'
                            : 'linear-gradient(to top, rgba(0,240,255,0.4), rgba(0,240,255,0.1))',
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[9px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>Nov 14</span>
                  <span className="text-[9px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>Dec 14</span>
                </div>
              </div>

              {/* Live feed */}
              <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                  <span className="text-xs text-[#9aa0a8]" style={{ fontFamily: 'var(--font-mono)' }}>LIVE ACTIVITY FEED</span>
                </div>
                <div className="space-y-2 overflow-hidden max-h-[140px]">
                  {activeEvents.map((event, i) => (
                    <motion.div
                      key={`${event.type}-${i}-${currentIndex}`}
                      initial={i === 0 ? { opacity: 0, y: -10 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.02)]"
                    >
                      <span
                        className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: feedColors[event.severity] }}
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium truncate" style={{ color: feedColors[event.severity], fontFamily: 'var(--font-mono)' }}>
                          {event.type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[9px] text-[#5a6068] truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                          {event.user} · {event.timestamp}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
