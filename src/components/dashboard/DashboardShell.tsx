'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Fingerprint, Users, ShieldCheck, Boxes,
  GitBranch, Blocks, ScrollText, FileText, HardDrive,
  ArrowRightLeft, ShieldAlert, Activity, Settings,
  ChevronLeft, ChevronRight, Shield, Bell, Search, LogOut,
  Wallet, Brain, CheckCircle2, Radio, Crosshair, Zap,
  AlertTriangle,
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

// Role color schemes
const ROLE_THEMES: Record<string, { accent: string; accentLight: string; label: string; defcon: string; defconLevel: number }> = {
  ADMIN: {
    accent: '#ef4444',
    accentLight: 'rgba(239,68,68,',
    label: 'TACTICAL OPS',
    defcon: 'DEFCON 1',
    defconLevel: 1,
  },
  VIEWER: {
    accent: '#00f0ff',
    accentLight: 'rgba(0,240,255,',
    label: 'INTELLIGENCE',
    defcon: 'DEFCON 4',
    defconLevel: 4,
  },
  ALTER: {
    accent: '#f59e0b',
    accentLight: 'rgba(245,158,11,',
    label: 'FIELD OPS',
    defcon: 'DEFCON 3',
    defconLevel: 3,
  },
  DEBUGGER: {
    accent: '#a855f7',
    accentLight: 'rgba(168,85,247,',
    label: 'SPECIAL OPS',
    defcon: 'DEFCON 2',
    defconLevel: 2,
  },
};

const allNavItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard', roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'] },
  { label: 'Identity Registry', icon: Fingerprint, href: '/dashboard/identity', roles: ['ADMIN'] },
  { label: 'Users', icon: Users, href: '/dashboard/users', roles: ['ADMIN'] },
  { label: 'Roles & Permissions', icon: ShieldCheck, href: '/dashboard/roles', roles: ['ADMIN'] },
  { label: 'Digital Assets', icon: Boxes, href: '/dashboard/assets', roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'] },
  { label: 'Asset Lifecycle', icon: GitBranch, href: '/dashboard/lifecycle', roles: ['ADMIN', 'ALTER'] },
  { label: 'Blockchain Explorer', icon: Blocks, href: '/dashboard/blockchain', roles: ['ADMIN'] },
  { label: 'Audit Trail', icon: ScrollText, href: '/dashboard/audit', roles: ['ADMIN'] },
  { label: 'AI Analysis', icon: Brain, href: '/dashboard/ai-analysis', roles: ['ADMIN'] },
  { label: 'Documents', icon: FileText, href: '/dashboard/documents', roles: ['ADMIN', 'ALTER', 'DEBUGGER'] },
  { label: 'IPFS', icon: HardDrive, href: '/dashboard/ipfs', roles: ['ADMIN'] },
  { label: 'Transactions', icon: ArrowRightLeft, href: '/dashboard/transactions', roles: ['ADMIN'] },
  { label: 'Security Events', icon: ShieldAlert, href: '/dashboard/security', roles: ['ADMIN'] },
  { label: 'System Health', icon: Activity, href: '/dashboard/health', roles: ['ADMIN'] },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['ADMIN'] },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardShell({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddr, setWalletAddr] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load session from localStorage
    const session = localStorage.getItem('bel_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUser(parsed.user);
        if (parsed.walletAddress) {
          setWalletAddr(parsed.walletAddress);
          setWalletConnected(true);
        } else if (parsed.user?.walletAddress) {
          setWalletAddr(parsed.user.walletAddress);
          setWalletConnected(true);
        }
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum) {
        const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddr(accounts[0]);
          setWalletConnected(true);
          // Update session
          const session = localStorage.getItem('bel_session');
          if (session) {
            const parsed = JSON.parse(session);
            parsed.walletAddress = accounts[0];
            localStorage.setItem('bel_session', JSON.stringify(parsed));
          }
        }
      }
    } catch {
      console.error('Wallet connection failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bel_session');
    router.push('/login');
  };

  // Filter nav items based on user role
  const userRole = user?.role || 'VIEWER';
  const theme = ROLE_THEMES[userRole] || ROLE_THEMES.VIEWER;
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'OP';

  return (
    <div className="flex h-screen bg-[#020204] overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex flex-col border-r border-[rgba(255,255,255,0.06)] bg-[rgba(2,2,4,0.98)] backdrop-blur-xl z-30 flex-shrink-0"
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="relative flex-shrink-0">
            <Shield className="w-8 h-8" style={{ color: theme.accent }} />
            <div className="absolute inset-0 opacity-20 blur-lg rounded-full" style={{ background: theme.accent }} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="text-xs font-bold tracking-[0.2em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  BEL SENTINEL
                </div>
                <div className="text-[8px] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)', color: theme.accent }}>
                  {theme.label}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Role badge */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-2 border-b border-[rgba(255,255,255,0.04)]"
            >
              <div className="flex items-center gap-2 px-2.5 py-2 border"
                style={{ borderColor: theme.accentLight + '0.15)', background: theme.accentLight + '0.03)' }}
              >
                <Crosshair className="w-3 h-3" style={{ color: theme.accent }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] tracking-[0.15em] font-bold" style={{ fontFamily: 'var(--font-mono)', color: theme.accent }}>
                    {userRole} CLEARANCE
                  </div>
                  <div className="text-[7px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {user?.clearance || user?.department || 'CLASSIFIED'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs transition-all duration-200 group relative border ${
                  isActive
                    ? ''
                    : 'text-[#9aa0a8] hover:text-white hover:bg-[rgba(255,255,255,0.04)] border-transparent'
                }`}
                style={isActive ? {
                  background: theme.accentLight + '0.08)',
                  borderColor: theme.accentLight + '0.15)',
                  color: theme.accent,
                } : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6" style={{ background: theme.accent }} />
                )}
                <item.icon className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? '' : 'text-[#5a6068] group-hover:text-[#9aa0a8]'
                }`}
                  style={isActive ? { color: theme.accent } : undefined}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap tracking-[0.05em]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Wallet section in sidebar */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-2 border-t border-[rgba(255,255,255,0.06)]"
            >
              {walletConnected ? (
                <div className="flex items-center gap-2 px-2.5 py-2 border border-[rgba(0,255,136,0.12)] bg-[rgba(0,255,136,0.03)]">
                  <CheckCircle2 className="w-3 h-3 text-[#00ff88]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[7px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                      LINKED WALLET
                    </div>
                    <div className="text-[9px] text-[#00ff88] truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                      {walletAddr.slice(0, 8)}...{walletAddr.slice(-6)}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="w-full flex items-center gap-2 px-2.5 py-2 border border-[rgba(0,240,255,0.12)] bg-[rgba(0,240,255,0.03)] text-[#00f0ff] hover:bg-[rgba(0,240,255,0.06)] transition-colors"
                >
                  <Wallet className="w-3 h-3" />
                  <span className="text-[8px] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                    LINK WALLET
                  </span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse button */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 text-[#5a6068] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Threat level ticker */}
        <div className="h-6 flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.04)] overflow-hidden"
          style={{ background: theme.accentLight + '0.03)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: theme.accent }}
              />
              <span className="text-[7px] tracking-[0.2em] font-bold" style={{ fontFamily: 'var(--font-mono)', color: theme.accent }}>
                {theme.defcon}
              </span>
            </div>
            <span className="text-[7px] text-[#3a3f45]" style={{ fontFamily: 'var(--font-mono)' }}>|</span>
            <span className="text-[7px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
              {theme.label} MODE ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[7px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
              {currentTime}
            </span>
            <div className="flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-[#00ff88]" />
              <span className="text-[7px] text-[#00ff88] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Top header */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(2,2,4,0.9)] backdrop-blur-xl z-20 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search assets, users, transactions..."
                className="w-80 pl-10 pr-4 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#e8eaed] placeholder-[#5a6068] focus:outline-none transition-colors"
                style={{
                  fontFamily: 'var(--font-mono)',
                  // dynamic border color on focus
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.accentLight + '0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System status */}
            <div className="flex items-center gap-2 px-3 py-1.5 border border-[rgba(0,255,136,0.15)]"
              style={{ background: 'rgba(0,255,136,0.03)' }}
            >
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[9px] text-[#00ff88] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                LIVE
              </span>
            </div>

            {/* Gas indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.03)]">
              <Zap className="w-2.5 h-2.5 text-[#f59e0b]" />
              <span className="text-[8px] text-[#f59e0b] tracking-[0.05em]" style={{ fontFamily: 'var(--font-mono)' }}>
                0.00001 ETH
              </span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-[rgba(255,255,255,0.04)] transition-colors">
              <Bell className="w-4 h-4 text-[#9aa0a8]" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ef4444]" />
            </button>

            {/* User info */}
            <div className="flex items-center gap-3 pl-3 border-l border-[rgba(255,255,255,0.06)]">
              <div className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-white border"
                style={{
                  borderColor: theme.accentLight + '0.3)',
                  background: theme.accentLight + '0.1)',
                }}
              >
                {userInitials}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs text-white font-medium">{user?.displayName || 'Operator'}</div>
                <div className="text-[9px] tracking-[0.05em]" style={{ fontFamily: 'var(--font-mono)', color: theme.accent }}>
                  {userRole}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5 text-[#5a6068]" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 grid-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
