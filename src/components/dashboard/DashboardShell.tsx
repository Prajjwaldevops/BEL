'use client';

import { useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Fingerprint, Users, Boxes, GitBranch,
  FileText, ArrowRightLeft, ShieldAlert,
  Settings, LogOut, Brain,
  Menu, X, Coins, ShieldCheck,
  ChevronLeft, ChevronRight, Search,
  Crosshair, Cpu, Wifi, Lock
} from 'lucide-react';

/* ── Types ── */
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

/* ── Role Visual System ── */
const ROLE_THEMES: Record<string, { accent: string; label: string }> = {
  ADMIN:    { accent: '#ef4444', label: 'ADMIN OPS' },
  VIEWER:   { accent: '#00d4ff', label: 'INTEL VIEWER' },
  ALTER:    { accent: '#ff9f43', label: 'FIELD OPS' },
  DEBUGGER: { accent: '#818cf8', label: 'SYS DEBUG' },
};

/* ── Navigation Configuration ── */
const allNavItems = [
  { label: 'Overview',     icon: LayoutDashboard, href: '/dashboard',              roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'], group: 'CORE' },
  { label: 'Identity',     icon: Fingerprint,     href: '/dashboard/identity',      roles: ['ADMIN'],                               group: 'CORE' },
  { label: 'Personnel',    icon: Users,           href: '/dashboard/users',         roles: ['ADMIN'],                               group: 'CORE' },
  { label: 'Assets',       icon: Boxes,           href: '/dashboard/assets',        roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'], group: 'OPERATIONS' },
  { label: 'Operations',   icon: GitBranch,       href: '/dashboard/lifecycle',     roles: ['ADMIN', 'ALTER'],                      group: 'OPERATIONS' },
  { label: 'Doc Vault',    icon: FileText,        href: '/dashboard/documents',     roles: ['ADMIN', 'ALTER', 'DEBUGGER', 'VIEWER'], group: 'DOCUMENTS' },
  { label: 'NFT Gallery',  icon: Coins,           href: '/dashboard/nfts',          roles: ['ADMIN', 'ALTER', 'DEBUGGER', 'VIEWER'], group: 'DOCUMENTS' },
  { label: 'Verify',       icon: ShieldCheck,     href: '/dashboard/verification',  roles: ['ADMIN', 'ALTER', 'DEBUGGER', 'VIEWER'], group: 'DOCUMENTS' },
  { label: 'AI Analytics', icon: Brain,           href: '/dashboard/ai-analysis',   roles: ['ADMIN'],                               group: 'INTELLIGENCE' },
  { label: 'TX Logs',      icon: ArrowRightLeft,  href: '/dashboard/transactions',  roles: ['ADMIN'],                               group: 'INTELLIGENCE' },
  { label: 'Threat Intel', icon: ShieldAlert,     href: '/dashboard/security',      roles: ['ADMIN'],                               group: 'INTELLIGENCE' },
  { label: 'Settings',     icon: Settings,        href: '/dashboard/settings',      roles: ['ADMIN'],                               group: 'SYSTEM' },
];

const NAV_GROUPS = ['CORE', 'OPERATIONS', 'DOCUMENTS', 'INTELLIGENCE', 'SYSTEM'];

/* ── Motion Variants ── */
const sidebarVariants = {
  expanded: { width: 256 },
  collapsed: { width: 72 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

/* ═══════════════════════════════════════════════════════
   DASHBOARD SHELL — Premium Layout Wrapper
   ═══════════════════════════════════════════════════════ */

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
  const searchRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ── Auth ── */
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

  /* ── Clock ── */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ── Search Shortcut ── */
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

  /* ── Close mobile menu on route change ── */
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('bel_session');
    router.push('/login');
  }, [router]);

  const userRole = user?.role || 'VIEWER';
  const theme = ROLE_THEMES[userRole] || ROLE_THEMES.VIEWER;
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(`${href}/`);
  const currentPage = navItems.find(i => isActive(i.href));
  const searchResults = searchQuery
    ? navItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  const groupedNav = NAV_GROUPS.map(group => ({
    group,
    items: navItems.filter(i => i.group === group),
  })).filter(g => g.items.length > 0);

  /* ═══════ RENDER ═══════ */
  return (
    <div className="min-h-screen flex bg-transparent overflow-hidden text-white selection:bg-[rgba(0,212,255,0.25)] selection:text-white relative">

      {/* ══════════════ VIDEO BACKGROUND ══════════════ */}
      <div className="video-bg-container">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{ opacity: 0.65 }}
        >
          <source src="https://cdn.dribbble.com/userupload/49148290/file/d8fac213421343bd48b14b7ede97778e.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Cinematic overlays */}
      <div className="video-overlay video-overlay--vignette" />
      <div className="video-overlay video-overlay--gradient" />
      <div className="video-overlay video-overlay--sidebar" />

      {/* ══════════════ COMMAND PALETTE ══════════════ */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh]"
            style={{ background: 'rgba(3, 3, 8, 0.75)', backdropFilter: 'blur(20px)' }}
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ y: -16, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ y: -12, opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(10, 10, 26, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: '0 32px 80px -16px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.04) inset',
              }}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: 'rgba(255, 255, 255, 0.25)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search navigation..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/20 focus:outline-none"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
                <kbd className="text-caption px-2 py-0.5 rounded-md" style={{ border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.2)' }}>ESC</kbd>
              </div>

              {/* Results */}
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map(item => (
                    <Link key={item.href} href={item.href} onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all" style={{ '--tw-transition-duration': 'var(--duration-fast)' } as React.CSSProperties}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <item.icon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                        </div>
                        <div>
                          <div className="text-[13px] text-white/90">{item.label}</div>
                          <div className="text-caption" style={{ color: 'rgba(255,255,255,0.2)' }}>{item.href}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="px-5 py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No results for &ldquo;{searchQuery}&rdquo;</div>
              ) : (
                <div className="p-3 space-y-0.5">
                  <p className="text-caption px-3 py-2" style={{ color: 'rgba(255,255,255,0.15)' }}>Quick navigate</p>
                  {navItems.slice(0, 7).map(item => (
                    <Link key={item.href} href={item.href} onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
                      <div className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <item.icon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
                        <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.50)' }}>{item.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ LOADING STATE ══════════════ */}
      {!isAuthorized || !user ? (
        <div className="relative z-10 w-full h-screen flex items-center justify-center">
          <div className="flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(0, 212, 255, 0.4)', borderTopColor: 'transparent' }} />
            <span className="text-label">Initializing secure session...</span>
          </div>
        </div>
      ) : (
        <>
          {/* ══════════════ MOBILE TOGGLE ══════════════ */}
          <button
            className="lg:hidden fixed top-4 right-4 z-50 p-2.5 rounded-xl transition-all duration-200"
            style={{
              background: 'rgba(8, 8, 20, 0.70)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
            }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
          </button>

          {/* ══════════════ SIDEBAR ══════════════ */}
          <motion.aside
            initial={false}
            variants={sidebarVariants}
            animate={collapsed ? 'collapsed' : 'expanded'}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="relative z-20 hidden lg:flex flex-col glass--sidebar h-screen"
          >
            {/* ── Logo Region ── */}
            <div className="h-[72px] flex items-center px-5 shrink-0" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                    style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.20)' }}>
                    <Crosshair className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: 'var(--success)', borderColor: 'var(--bg-void)' }} />
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div {...fadeIn} transition={{ duration: 0.2, delay: 0.05 }} className="overflow-hidden whitespace-nowrap">
                      <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-white/90" style={{ fontFamily: 'var(--font-display)' }}>
                        BEL SENTINEL
                      </div>
                      <div className="text-caption mt-0.5" style={{ color: 'rgba(255,255,255,0.20)' }}>
                        Tactical Network v3.0
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── User Card ── */}
            <div className="px-3 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <div
                className={`flex items-center rounded-xl transition-all duration-300 ${collapsed ? 'justify-center p-2.5' : 'gap-3 p-3'}`}
                style={{
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center relative text-sm font-semibold"
                  style={{
                    background: `${theme.accent}12`,
                    border: `1px solid ${theme.accent}30`,
                    color: theme.accent,
                  }}>
                  {user.displayName.charAt(0)}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: 'var(--success)', borderColor: 'rgba(6, 6, 16, 0.9)' }} />
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div {...fadeIn} transition={{ duration: 0.2 }} className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-white/85 truncate" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                        {user.displayName}
                      </div>
                      <div className="text-[8px] truncate mt-0.5" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', color: theme.accent }}>
                        {theme.label} · {user.department || 'HQ'}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Navigation ── */}
            <div className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide">
              <nav className="space-y-5">
                {groupedNav.map(({ group, items }) => (
                  <div key={group}>
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.div {...fadeIn} transition={{ duration: 0.15 }} className="px-3 mb-2">
                          <span className="text-caption">{group}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link key={item.href} href={item.href}
                            onMouseEnter={() => setHoveredItem(item.href)}
                            onMouseLeave={() => setHoveredItem(null)}>
                            <div className={`nav-item ${active ? 'nav-item--active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}>
                              {/* Active indicator bar */}
                              {active && <div className="nav-indicator" />}

                              <item.icon
                                className={`shrink-0 stroke-[1.5] transition-colors duration-200 ${collapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`}
                                style={{
                                  color: active
                                    ? theme.accent
                                    : hoveredItem === item.href
                                    ? 'rgba(255, 255, 255, 0.6)'
                                    : 'rgba(255, 255, 255, 0.25)',
                                }}
                              />

                              <AnimatePresence>
                                {!collapsed && (
                                  <motion.span {...fadeIn} transition={{ duration: 0.15 }}
                                    className={`text-[10px] uppercase tracking-[0.12em] font-medium transition-colors duration-200 ${
                                      active ? 'text-white/90' : 'text-white/35'
                                    }`}
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                  >
                                    {item.label}
                                  </motion.span>
                                )}
                              </AnimatePresence>

                              {/* Collapsed tooltip */}
                              {collapsed && hoveredItem === item.href && (
                                <div className="absolute left-full ml-3 z-50 px-3 py-1.5 rounded-lg whitespace-nowrap text-[10px] text-white/90"
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    background: 'rgba(10, 10, 26, 0.95)',
                                    border: '1px solid rgba(255, 255, 255, 0.10)',
                                    boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.5)',
                                  }}>
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

            {/* ── System Indicators (expanded only) ── */}
            <AnimatePresence>
              {!collapsed && (
                <motion.div {...fadeIn} transition={{ duration: 0.2 }} className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { icon: Wifi, label: 'NET', color: 'var(--success)' },
                      { icon: Cpu, label: 'SYS', color: 'var(--accent)' },
                      { icon: Lock, label: 'ENC', color: 'var(--secondary)' },
                    ].map(({ icon: Icon, label, color }) => (
                      <div key={label} className="flex flex-col items-center gap-1 py-2 rounded-lg transition-colors duration-200"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <Icon className="w-3 h-3" style={{ color }} />
                        <div className="text-[7px] tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)', color }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Footer Actions ── */}
            <div className="px-2 py-3 space-y-1 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button onClick={() => setShowSearch(true)}
                className={`w-full btn-ghost ${collapsed ? 'justify-center' : ''}`}>
                <Search className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span>Search</span>
                    <kbd className="text-[8px] px-1.5 py-0.5 rounded-md"
                      style={{ color: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)' }}>⌘K</kbd>
                  </div>
                )}
              </button>

              <button onClick={handleLogout}
                className={`w-full btn-ghost group ${collapsed ? 'justify-center' : ''}`}
                style={{ '--hover-bg': 'rgba(239, 68, 68, 0.06)' } as React.CSSProperties}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239, 68, 68, 0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
              >
                <LogOut className="w-4 h-4 shrink-0 transition-colors duration-200 group-hover:text-red-400" />
                {!collapsed && <span className="group-hover:text-red-400 transition-colors duration-200">Disconnect</span>}
              </button>
            </div>
          </motion.aside>

          {/* ══════════════ MAIN CONTENT AREA ══════════════ */}
          <main className="flex-1 relative z-10 flex flex-col min-w-0 h-screen overflow-hidden">

            {/* ── Top Header ── */}
            <header className="h-[64px] shrink-0 glass--header flex items-center justify-between px-5 lg:px-6">
              {/* Left */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="hidden lg:flex btn-ghost p-2"
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                <div className="hidden lg:block h-4 w-px" style={{ background: 'rgba(255, 255, 255, 0.08)' }} />
                <div className="hidden sm:flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  <span className="text-[10px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255, 255, 255, 0.18)' }}>SENTINEL</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.08)' }}>/</span>
                  <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                    {currentPage?.label || 'Dashboard'}
                  </span>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3">
                {/* Search trigger */}
                <button onClick={() => setShowSearch(true)}
                  className="hidden md:flex items-center gap-2 btn-ghost px-3 py-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>Search</span>
                  <kbd className="text-[8px] ml-1 px-1.5 py-0.5 rounded-md"
                    style={{ color: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)' }}>⌘K</kbd>
                </button>

                {/* System status pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <span className="status-dot status-dot--online" />
                  <span className="text-[9px] tracking-[0.15em] uppercase hidden sm:block"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>ONLINE</span>
                </div>

                {/* Time */}
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] tracking-[0.1em]"
                    style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.55)' }}>{currentTime}</span>
                  <span className="text-caption" style={{ color: 'rgba(255,255,255,0.15)' }}>Global Sync</span>
                </div>

                {/* Divider + Role + Logout */}
                <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div className="px-2.5 py-1.5 rounded-[10px] flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: theme.accent,
                      background: `${theme.accent}0a`,
                      border: `1px solid ${theme.accent}18`,
                    }}>
                    {userRole === 'ADMIN' ? <ShieldAlert className="w-3 h-3" /> :
                     userRole === 'DEBUGGER' ? <Cpu className="w-3 h-3" /> :
                     userRole === 'ALTER' ? <GitBranch className="w-3 h-3" /> :
                     <LayoutDashboard className="w-3 h-3" />}
                    <span className="hidden sm:inline font-medium">{userRole}</span>
                  </div>

                  <button onClick={handleLogout}
                    className="btn-ghost p-2 group"
                    title="Disconnect Session"
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.08)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <LogOut className="w-4 h-4 transition-colors duration-200 group-hover:text-red-400" />
                  </button>
                </div>
              </div>
            </header>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-[1600px] mx-auto"
              >
                {children}
              </motion.div>
            </div>
          </main>

          {/* ══════════════ MOBILE MENU ══════════════ */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.25 } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="fixed inset-0 z-40 lg:hidden flex flex-col pt-16"
                style={{
                  background: 'rgba(3, 3, 8, 0.92)',
                  backdropFilter: 'blur(32px)',
                }}
              >
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {/* Mobile user card */}
                  <div className="p-4 rounded-xl mb-4 flex items-center gap-3"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-base"
                      style={{ background: `${theme.accent}12`, color: theme.accent, border: `1px solid ${theme.accent}25` }}>
                      {user.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white/90 uppercase" style={{ fontFamily: 'var(--font-mono)' }}>{user.displayName}</div>
                      <div className="text-[9px] mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: theme.accent, letterSpacing: '0.1em' }}>{theme.label}</div>
                    </div>
                  </div>

                  {/* Mobile nav */}
                  <nav className="space-y-1">
                    {navItems.map((item, i) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
                      >
                        <Link href={item.href} onClick={() => setMobileMenuOpen(false)}>
                          <div className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 ${
                            isActive(item.href)
                              ? 'text-white/90'
                              : 'text-white/40'
                          }`}
                            style={{
                              background: isActive(item.href) ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                              border: `1px solid ${isActive(item.href) ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}`,
                            }}
                          >
                            <item.icon className="w-5 h-5 shrink-0 stroke-[1.5]"
                              style={{ color: isActive(item.href) ? theme.accent : undefined }} />
                            <span className="ml-4 text-xs uppercase tracking-[0.12em]" style={{ fontFamily: 'var(--font-mono)' }}>{item.label}</span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </nav>
                </div>

                <div className="p-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <button onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl text-red-400 text-xs uppercase tracking-[0.12em]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                    }}>
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
