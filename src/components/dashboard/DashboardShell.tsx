'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Fingerprint, Users, Boxes, GitBranch,
  FileText, HardDrive, ArrowRightLeft, ShieldAlert,
  Settings, LogOut, Crosshair, Terminal, Brain,
  Activity, Menu, X, Zap, Coins, ShieldCheck,
  ChevronLeft, ChevronRight, Bell, Search,
  Radio, Lock, Cpu, Wifi
} from 'lucide-react';

interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  displayName: string;
  email: string;
  department: string;
  role: string;
  walletAddress: string | null;
  photoUrl: string | null;
  nftTokenId: string | null;
  isAdmin: boolean;
  clearance?: string;
}

const ROLE_THEMES: Record<string, { accent: string; glow: string; label: string; bg: string }> = {
  ADMIN:    { accent: '#ef4444', glow: 'rgba(239,68,68,0.15)', label: 'TACTICAL OPS', bg: 'rgba(239,68,68,0.06)' },
  VIEWER:   { accent: '#38bdf8', glow: 'rgba(56,189,248,0.15)', label: 'INTEL VIEWER', bg: 'rgba(56,189,248,0.06)' },
  ALTER:    { accent: '#fbbf24', glow: 'rgba(251,191,36,0.15)', label: 'FIELD OPS', bg: 'rgba(251,191,36,0.06)' },
  DEBUGGER: { accent: '#a78bfa', glow: 'rgba(167,139,250,0.15)', label: 'SYS DEBUGGER', bg: 'rgba(167,139,250,0.06)' },
};

const allNavItems = [
  { label: 'Overview',    icon: LayoutDashboard, href: '/dashboard',              roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'], group: 'MAIN' },
  { label: 'Identity',    icon: Fingerprint,     href: '/dashboard/identity',      roles: ['ADMIN'],                               group: 'MAIN' },
  { label: 'Personnel',   icon: Users,           href: '/dashboard/users',         roles: ['ADMIN'],                               group: 'MAIN' },
  { label: 'Assets',      icon: Boxes,           href: '/dashboard/assets',        roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'], group: 'OPERATIONS' },
  { label: 'Operations',  icon: GitBranch,       href: '/dashboard/lifecycle',     roles: ['ADMIN', 'ALTER'],                      group: 'OPERATIONS' },
  { label: 'Doc Vault',   icon: FileText,        href: '/dashboard/documents',     roles: ['ADMIN', 'ALTER', 'DEBUGGER', 'VIEWER'], group: 'DOCUMENTS' },
  { label: 'NFT Gallery', icon: Coins,           href: '/dashboard/nfts',          roles: ['ADMIN', 'ALTER', 'DEBUGGER', 'VIEWER'], group: 'DOCUMENTS' },
  { label: 'Verify',      icon: ShieldCheck,     href: '/dashboard/verification',  roles: ['ADMIN', 'ALTER', 'DEBUGGER', 'VIEWER'], group: 'DOCUMENTS' },
  { label: 'AI Analytics',icon: Brain,           href: '/dashboard/ai-analysis',   roles: ['ADMIN'],                               group: 'INTELLIGENCE' },
  { label: 'TX Logs',     icon: ArrowRightLeft,  href: '/dashboard/transactions',  roles: ['ADMIN'],                               group: 'INTELLIGENCE' },
  { label: 'Threat Intel',icon: ShieldAlert,     href: '/dashboard/security',      roles: ['ADMIN'],                               group: 'INTELLIGENCE' },
  { label: 'Settings',    icon: Settings,        href: '/dashboard/settings',      roles: ['ADMIN'],                               group: 'SYSTEM' },
];

const NAV_GROUPS = ['MAIN', 'OPERATIONS', 'DOCUMENTS', 'INTELLIGENCE', 'SYSTEM'];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVideoReady(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sessionStr = localStorage.getItem('bel_session');
    if (!sessionStr) { router.replace('/login'); return; }
    try {
      const session = JSON.parse(sessionStr);
      if (!session?.token) { router.replace('/login'); return; }
      setUser(session.user);
      setIsAuthorized(true);
    } catch { router.replace('/login'); }
  }, [router]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').slice(0, 19) + ' GMT');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Focus search on shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(v => !v);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 100);
  }, [showSearch]);

  const handleLogout = () => {
    localStorage.removeItem('bel_session');
    router.push('/login');
  };

  const userRole = user?.role || 'VIEWER';
  const theme = ROLE_THEMES[userRole] || ROLE_THEMES.VIEWER;
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(`${href}/`);

  const currentPage = navItems.find(i => isActive(i.href));

  // Search results
  const searchResults = searchQuery
    ? navItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const groupedNav = NAV_GROUPS.map(group => ({
    group,
    items: navItems.filter(i => i.group === group),
  })).filter(g => g.items.length > 0);

  return (
    <div className="min-h-screen flex bg-transparent overflow-hidden text-white selection:bg-white/20 selection:text-white relative">

      {/* ── Video Background ── */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-[#020617]">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isVideoReady ? 'opacity-80' : 'opacity-0'}`}>
          <iframe
            ref={iframeRef}
            src="https://player.vimeo.com/video/1193028519?h=060f9f2d4e&autoplay=1&muted=1&background=1&controls=0&title=0&byline=0&portrait=0&dnt=1#t=10s"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-[2px] scale-[1.3] pointer-events-none"
            style={{ width: '120vw', height: '120vh', minWidth: '120vw', minHeight: '120vh', border: 'none' }}
            allow="autoplay; fullscreen"
            loading="eager"
          />
        </div>
      </div>
      <div className="fixed inset-0 z-0 bg-[#020617]/75" />

      {/* ── Command Search Overlay ── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xl flex items-start justify-center pt-[20vh]"
            onClick={() => setShowSearch(false)}>
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg mx-4 bg-[#0a0614]/95 border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
                <Search className="w-4 h-4 text-white/30" />
                <input ref={searchRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search navigation..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/25 focus:outline-none font-mono" />
                <kbd className="text-[9px] text-white/20 font-mono px-2 py-0.5 rounded border border-white/[0.08]">ESC</kbd>
              </div>
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setShowSearch(false)}>
                      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] transition-all">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                          <item.icon className="w-4 h-4 text-white/40" />
                        </div>
                        <div>
                          <div className="text-sm text-white">{item.label}</div>
                          <div className="text-[9px] text-white/25 font-mono">{item.href}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="p-8 text-center text-sm text-white/30">No results for "{searchQuery}"</div>
              ) : (
                <div className="p-4 space-y-1">
                  <p className="text-[9px] text-white/20 font-mono uppercase tracking-widest px-2 py-1">Quick Navigate</p>
                  {navItems.slice(0, 6).map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setShowSearch(false)}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] transition-all">
                        <item.icon className="w-4 h-4 text-white/30" />
                        <span className="text-sm text-white/60">{item.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAuthorized || !user ? (
        <div className="relative z-10 w-full h-screen flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="text-white/50 font-mono text-xs tracking-widest uppercase flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
            Initializing Secure Uplink...
          </div>
        </div>
      ) : (
        <>
          {/* ── Mobile Nav Toggle ── */}
          <button
            className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white/10 border border-white/10 rounded-xl backdrop-blur-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>

          {/* ── Sidebar ── */}
          <motion.aside
            initial={false}
            animate={{ width: collapsed ? 72 : 260 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-20 hidden lg:flex flex-col border-r border-white/[0.06] bg-white/[0.025] backdrop-blur-2xl"
          >
            {/* Logo */}
            <div className="h-20 flex items-center px-5 border-b border-white/[0.06] relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.015]"
                style={{ backgroundImage: 'linear-gradient(45deg, rgba(124,92,252,0.5) 25%, transparent 25%, transparent 75%, rgba(124,92,252,0.5) 75%)', backgroundSize: '8px 8px' }} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 flex items-center justify-center">
                    <Crosshair className="w-4 h-4 text-[#7c5cfc]" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-[#020617] animate-pulse" />
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                      className="overflow-hidden whitespace-nowrap">
                      <div className="text-[13px] font-bold tracking-[0.2em] uppercase text-white" style={{ fontFamily: 'var(--font-display)' }}>
                        BEL SENTINEL
                      </div>
                      <div className="text-[8px] text-white/30 tracking-[0.15em] uppercase font-mono mt-0.5">
                        Tactical Network v2.1
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* User Card */}
            <div className="p-3 border-b border-white/[0.06]">
              <div className={`p-3 rounded-xl border border-white/[0.07] bg-white/[0.03] flex items-center transition-all duration-300 ${collapsed ? 'justify-center' : 'gap-3'}`}
                style={{ boxShadow: `0 0 20px ${theme.glow}` }}>
                <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center relative font-bold text-sm"
                  style={{ background: theme.bg, border: `1px solid ${theme.accent}30`, color: theme.accent }}>
                  {user.displayName.charAt(0)}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#020617]" />
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-white truncate font-mono uppercase">{user.displayName}</div>
                    <div className="text-[8px] truncate font-mono tracking-wider mt-0.5" style={{ color: theme.accent }}>
                      {theme.label} · {user.department || 'HQ'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide">
              <nav className="space-y-4">
                {groupedNav.map(({ group, items }) => (
                  <div key={group}>
                    {!collapsed && (
                      <div className="px-3 mb-1.5">
                        <span className="text-[7px] text-white/20 font-mono tracking-[0.2em] uppercase">{group}</span>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link key={item.href} href={item.href}
                            onMouseEnter={() => setHoveredItem(item.href)}
                            onMouseLeave={() => setHoveredItem(null)}>
                            <div className={`group relative flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all duration-200 ${
                              active
                                ? 'bg-white/[0.1] border border-white/[0.1] shadow-[0_0_20px_rgba(255,255,255,0.03)]'
                                : 'border border-transparent hover:bg-white/[0.05] hover:border-white/[0.06]'
                            }`}>
                              {/* Active indicator */}
                              {active && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                                  style={{ background: theme.accent, boxShadow: `0 0 8px ${theme.accent}` }} />
                              )}

                              <item.icon className={`shrink-0 stroke-[1.5] transition-all duration-200 ${collapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`}
                                style={{ color: active ? theme.accent : hoveredItem === item.href ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }} />

                              {!collapsed && (
                                <span className={`ml-3 text-[10px] uppercase tracking-widest font-medium font-mono transition-colors ${
                                  active ? 'text-white' : 'text-white/40 group-hover:text-white/70'
                                }`}>
                                  {item.label}
                                </span>
                              )}

                              {/* Tooltip for collapsed */}
                              {collapsed && hoveredItem === item.href && (
                                <div className="absolute left-full ml-3 z-50 px-3 py-1.5 rounded-lg bg-[#0a0614]/95 border border-white/[0.1] text-[10px] text-white font-mono whitespace-nowrap shadow-xl">
                                  {item.label}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            {/* System Status (non-collapsed) */}
            {!collapsed && (
              <div className="px-3 py-3 border-t border-b border-white/[0.06]">
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { icon: Wifi, label: 'NET', color: '#10b981' },
                    { icon: Cpu, label: 'SYS', color: '#38bdf8' },
                    { icon: Lock, label: 'ENC', color: '#fbbf24' },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <Icon className="w-3 h-3" style={{ color }} />
                      <div className="text-[7px] font-mono" style={{ color }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-3 space-y-1.5">
              <button onClick={() => setShowSearch(true)}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-white/40 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70 transition-all`}>
                <Search className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-wider">Search</span>
                    <kbd className="text-[8px] text-white/15 font-mono px-1.5 py-0.5 rounded border border-white/[0.06]">⌘K</kbd>
                  </div>
                )}
              </button>

              <button onClick={handleLogout}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-white/40 border border-transparent hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400 transition-all group`}>
                <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-400 transition-colors" />
                {!collapsed && <span className="text-[10px] font-mono uppercase tracking-widest">Disconnect</span>}
              </button>
            </div>
          </motion.aside>

          {/* ── Main Content ── */}
          <main className="flex-1 relative z-10 flex flex-col min-w-0 h-screen overflow-hidden">

            {/* ── Top Header ── */}
            <header className="h-20 shrink-0 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl flex items-center justify-between px-6 relative">
              {/* Left: Collapse + Breadcrumb */}
              <div className="flex items-center gap-4">
                <button onClick={() => setCollapsed(!collapsed)}
                  className="hidden lg:flex p-2 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white transition-all border border-transparent hover:border-white/[0.08]">
                  {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                <div className="h-4 w-[1px] bg-white/10 hidden lg:block" />
                <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono tracking-[0.15em] uppercase">
                  <span className="text-white/20">BEL SENTINEL</span>
                  <span className="text-white/10">/</span>
                  <span className="text-white/60">{currentPage?.label || 'Command Node'}</span>
                </div>
              </div>

              {/* Right: Status + Controls */}
              <div className="flex items-center gap-4">
                {/* Search Trigger */}
                <button onClick={() => setShowSearch(true)}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 transition-all text-[10px] font-mono">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search...</span>
                  <kbd className="text-[8px] text-white/15 ml-2 px-1.5 py-0.5 rounded border border-white/[0.06]">⌘K</kbd>
                </button>

                {/* System Online Pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="text-[9px] font-mono tracking-widest text-[#10b981] uppercase hidden sm:block">ONLINE</span>
                </div>

                {/* Clock */}
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-mono tracking-widest text-white/70">{currentTime}</span>
                  <span className="text-[7px] font-mono tracking-[0.2em] text-white/25 uppercase">Global Sync</span>
                </div>

                {/* Role Indicator + Logout */}
                <div className="flex items-center gap-2 pl-4 border-l border-white/[0.08]">
                  <div className="px-2.5 py-1.5 rounded-xl border text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: theme.accent, background: theme.bg, borderColor: `${theme.accent}20` }}>
                    {userRole === 'ADMIN' ? <ShieldAlert className="w-3 h-3" /> :
                     userRole === 'DEBUGGER' ? <Terminal className="w-3 h-3" /> :
                     userRole === 'ALTER' ? <Zap className="w-3 h-3" /> :
                     <Activity className="w-3 h-3" />}
                    <span className="hidden sm:inline">{userRole}</span>
                  </div>
                  <button onClick={handleLogout}
                    className="p-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 transition-all group"
                    title="Disconnect Session">
                    <LogOut className="w-4 h-4 transition-colors" />
                  </button>
                </div>
              </div>
            </header>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <div className="max-w-[1600px] mx-auto">
                {children}
              </div>
            </div>
          </main>

          {/* ── Mobile Overlay Menu ── */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/90 backdrop-blur-xl lg:hidden flex flex-col pt-20">
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {/* User card mobile */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center gap-3 mb-4"
                    style={{ boxShadow: `0 0 20px ${theme.glow}` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base"
                      style={{ background: theme.bg, color: theme.accent, border: `1px solid ${theme.accent}30` }}>
                      {user.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white font-mono uppercase">{user.displayName}</div>
                      <div className="text-[9px] font-mono mt-0.5" style={{ color: theme.accent }}>{theme.label}</div>
                    </div>
                  </div>

                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                        <div className={`flex items-center px-4 py-3.5 rounded-xl border backdrop-blur-md transition-all ${
                          pathname === item.href
                            ? 'bg-white/[0.08] border-white/[0.12] text-white'
                            : 'border-white/[0.06] bg-white/[0.02] text-white/50'
                        }`}>
                          <item.icon className="w-5 h-5 shrink-0 stroke-[1.5]"
                            style={{ color: pathname === item.href ? theme.accent : undefined }} />
                          <span className="ml-4 text-xs uppercase tracking-widest font-mono">{item.label}</span>
                        </div>
                      </Link>
                    ))}
                  </nav>
                </div>

                <div className="p-4 border-t border-white/[0.06]">
                  <button onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 font-mono text-xs uppercase tracking-widest">
                    <LogOut className="w-4 h-4" /> Disconnect
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
