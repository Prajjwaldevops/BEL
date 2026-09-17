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
  Wallet, Brain, CheckCircle2,
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
}

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
  const pathname = usePathname();
  const router = useRouter();

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
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="flex h-screen bg-[#050508] overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex flex-col border-r border-[rgba(255,255,255,0.06)] bg-[rgba(5,5,10,0.95)] backdrop-blur-xl z-30 flex-shrink-0"
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="relative flex-shrink-0">
            <Shield className="w-8 h-8 text-[#00f0ff]" />
            <div className="absolute inset-0 bg-[#00f0ff] opacity-20 blur-lg rounded-full" />
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
                <div className="text-[8px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                  COMMAND CENTRE
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const isAI = item.href === '/dashboard/ai-analysis';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all duration-200 group relative ${
                  isActive
                    ? isAI
                      ? 'bg-[rgba(168,85,247,0.08)] text-[#a855f7] border border-[rgba(168,85,247,0.15)]'
                      : 'bg-[rgba(0,240,255,0.08)] text-[#00f0ff] border border-[rgba(0,240,255,0.15)]'
                    : 'text-[#9aa0a8] hover:text-white hover:bg-[rgba(255,255,255,0.04)] border border-transparent'
                }`}
              >
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r ${isAI ? 'bg-[#a855f7]' : 'bg-[#00f0ff]'}`} />
                )}
                <item.icon className={`w-4 h-4 flex-shrink-0 ${
                  isActive
                    ? isAI ? 'text-[#a855f7]' : 'text-[#00f0ff]'
                    : 'text-[#5a6068] group-hover:text-[#9aa0a8]'
                }`} />
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

        {/* Collapse button */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-[#5a6068] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(5,5,10,0.8)] backdrop-blur-xl z-20 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search assets, users, transactions..."
                className="w-80 pl-10 pr-4 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#e8eaed] placeholder-[#5a6068] focus:outline-none focus:border-[rgba(0,240,255,0.2)] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connect Wallet (Admin) */}
            {user?.isAdmin && (
              <button
                onClick={connectWallet}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] tracking-[0.05em] transition-all ${
                  walletConnected
                    ? 'bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.15)] text-[#00ff88]'
                    : 'bg-[rgba(124,92,252,0.05)] border border-[rgba(124,92,252,0.15)] text-[#a78bfa] hover:bg-[rgba(124,92,252,0.1)]'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {walletConnected ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    {walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}
                  </>
                ) : (
                  <>
                    <Wallet className="w-3.5 h-3.5" />
                    CONNECT WALLET
                  </>
                )}
              </button>
            )}

            {/* System status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.15)]">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[10px] text-[#00ff88] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                LIVE
              </span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors">
              <Bell className="w-4 h-4 text-[#9aa0a8]" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ef4444]" />
            </button>

            {/* User info */}
            <div className="flex items-center gap-3 pl-3 border-l border-[rgba(255,255,255,0.06)]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c5cfc] to-[#a855f7] flex items-center justify-center text-[10px] font-bold text-white">
                {userInitials}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs text-white font-medium">{user?.displayName || 'Admin'}</div>
                <div className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {userRole}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.04)] transition-colors"
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
