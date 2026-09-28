'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Fingerprint, Users, Boxes, GitBranch,
  FileText, HardDrive, ArrowRightLeft, ShieldAlert,
  Settings, LogOut, Crosshair, Terminal, Brain,
  Activity, Menu, X, Zap, Coins, ShieldCheck
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

const ROLE_THEMES: Record<string, { accent: string; label: string }> = {
  ADMIN: { accent: '#ef4444', label: 'TACTICAL OPS' },
  VIEWER: { accent: '#38bdf8', label: 'INTEL VIEWER' },
  ALTER: { accent: '#fbbf24', label: 'FIELD OPS' },
  DEBUGGER: { accent: '#a78bfa', label: 'SYS DEBUGGER' },
};

const allNavItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard', roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'] },
  { label: 'Identity Node', icon: Fingerprint, href: '/dashboard/identity', roles: ['ADMIN'] },
  { label: 'Personnel', icon: Users, href: '/dashboard/users', roles: ['ADMIN'] },
  { label: 'Assets', icon: Boxes, href: '/dashboard/assets', roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'] },
  { label: 'Operations', icon: GitBranch, href: '/dashboard/lifecycle', roles: ['ADMIN', 'ALTER'] },
  { label: 'Doc Vault', icon: FileText, href: '/dashboard/documents', roles: ['ADMIN', 'ALTER', 'DEBUGGER', 'VIEWER'] },
  { label: 'NFT Gallery', icon: Coins, href: '/dashboard/nfts', roles: ['ADMIN', 'ALTER', 'DEBUGGER', 'VIEWER'] },
  { label: 'Verify', icon: ShieldCheck, href: '/dashboard/verification', roles: ['ADMIN', 'ALTER', 'DEBUGGER', 'VIEWER'] },
  { label: 'AI Analytics', icon: Brain, href: '/dashboard/ai-analysis', roles: ['ADMIN'] },
  { label: 'TX Logs', icon: ArrowRightLeft, href: '/dashboard/transactions', roles: ['ADMIN'] },
  { label: 'Threat Intel', icon: ShieldAlert, href: '/dashboard/security', roles: ['ADMIN'] },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['ADMIN'] },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    // Cannot use MP4 due to 403. Using standard Vimeo iframe.
    // The delay is hidden by the bg-[#020617] backdrop until it's somewhat ready.
    const timer = setTimeout(() => setIsVideoReady(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auth Guard
    const sessionStr = localStorage.getItem('bel_session');
    if (!sessionStr) {
      router.replace('/login');
      return;
    }
    
    try {
      const session = JSON.parse(sessionStr);
      if (!session || !session.token) {
        router.replace('/login');
        return;
      }
      setUser(session.user);
      setIsAuthorized(true);
    } catch {
      router.replace('/login');
    }
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

  const handleLogout = () => {
    localStorage.removeItem('bel_session');
    router.push('/login');
  };

  const userRole = user?.role || 'VIEWER';
  const theme = ROLE_THEMES[userRole] || ROLE_THEMES.VIEWER;
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="min-h-screen flex bg-transparent overflow-hidden text-white selection:bg-white/20 selection:text-white relative">
      {/* Native Video Background - Loaded instantly for zero delay */}
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
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 z-0 bg-[#020617]/75" />

      {!isAuthorized || !user ? (
        <div className="relative z-10 w-full h-screen flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="text-white/50 font-mono text-xs tracking-widest uppercase flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
            Initializing Secure Uplink...
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Nav Toggle */}
          <button 
            className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white/10 border border-white/10 rounded-xl backdrop-blur-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>

          {/* Sidebar - Premium Glassmorphic */}
          <motion.aside
            initial={false}
            animate={{ width: collapsed ? 80 : 260 }}
            className="relative z-20 hidden lg:flex flex-col border-r border-white/[0.06] bg-white/[0.03] backdrop-blur-2xl transition-all duration-300 ease-[0.16,1,0.3,1]"
          >
            <div className="h-20 flex items-center px-6 border-b border-white/[0.06] relative">
          <Crosshair className="w-6 h-6 text-white/80 shrink-0 stroke-[1.5]" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -10 }}
                className="ml-4 overflow-hidden whitespace-nowrap"
              >
                <div className="text-[14px] font-bold tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--font-display)' }}>BEL SENTINEL</div>
                <div className="text-[8px] text-white/40 tracking-[0.15em] uppercase font-mono mt-0.5">Tactical Network</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className={`p-3 rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all`}>
            <div className="w-8 h-8 shrink-0 rounded-full bg-white/10 border border-white/20 flex items-center justify-center relative">
              <span className="text-[10px] font-bold">{user.displayName.charAt(0)}</span>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#0f172a]" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white truncate font-mono uppercase">{user.displayName}</div>
                <div className="text-[9px] text-white/50 truncate font-mono tracking-wider">{userRole} // {user.department || 'HQ'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation - Glass Buttons */}
        <div className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
              const isOverviewActive = item.href === '/dashboard' && pathname === '/dashboard';
              const active = isActive || isOverviewActive;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`group relative flex items-center ${collapsed ? 'justify-center' : 'justify-start'} px-3 py-3 rounded-xl transition-all duration-300 ${
                    active 
                      ? 'bg-white/[0.12] text-white backdrop-blur-md border border-white/[0.12] shadow-[0_0_20px_rgba(255,255,255,0.04)]' 
                      : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80 border border-transparent'
                  }`}>
                    <item.icon className={`shrink-0 stroke-[1.5] transition-all duration-300 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'} ${active ? 'text-white' : 'text-white/40 group-hover:text-white/80'}`} />
                    
                    {!collapsed && (
                      <span className="ml-3 text-[10px] uppercase tracking-widest font-medium font-mono">
                        {item.label}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions - Glass Button */}
        <div className="p-4 border-t border-white/[0.06]">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-3 rounded-2xl text-white/70 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:text-white hover:bg-gradient-to-b hover:from-white/10 hover:to-white/5 transition-all duration-300 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_-8px_rgba(255,255,255,0.05)] active:scale-[0.98] group relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <LogOut className="w-4 h-4 shrink-0 stroke-[1.5] group-hover:text-red-400 transition-colors relative z-10" />
            {!collapsed && (
              <span className="text-[10px] uppercase tracking-widest font-mono font-medium relative z-10">DISCONNECT</span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header - Glass */}
        <header className="h-20 shrink-0 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl flex items-center justify-between px-8 relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-lg hover:bg-white/[0.06] text-white/50 transition-colors"
            >
              <Terminal className="w-4 h-4 stroke-[1.5]" />
            </button>
            <div className="h-4 w-[1px] bg-white/10 hidden lg:block" />
            <h2 className="text-[11px] font-mono tracking-[0.2em] uppercase text-white/60 hidden sm:block">
              {navItems.find(i => pathname === i.href || pathname.startsWith(`${i.href}/`))?.label || 'Command Node'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[9px] font-mono tracking-widest text-[#10b981] uppercase">SYSTEM ONLINE</span>
            </div>
            
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[10px] font-mono tracking-widest text-white/80">{currentTime}</span>
              <span className="text-[8px] font-mono tracking-[0.2em] text-white/40 uppercase">Global Sync</span>
            </div>

            {/* Role Icon & Logout (Top Right Corner) */}
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="flex items-center gap-2" title={`Role: ${userRole}`}>
                {userRole === 'ADMIN' ? (
                  <ShieldAlert className="w-5 h-5 text-red-400 stroke-[1.5]" />
                ) : userRole === 'DEBUGGER' ? (
                  <Terminal className="w-5 h-5 text-purple-400 stroke-[1.5]" />
                ) : userRole === 'ALTER' ? (
                  <Zap className="w-5 h-5 text-amber-400 stroke-[1.5]" />
                ) : (
                  <Activity className="w-5 h-5 text-blue-400 stroke-[1.5]" />
                )}
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-2xl text-white/60 hover:text-white hover:bg-gradient-to-b hover:from-white/15 hover:to-white/5 border border-white/10 hover:border-white/30 transition-all duration-300 bg-white/5 backdrop-blur-xl shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_32px_-8px_rgba(255,255,255,0.15)] active:scale-[0.95] group relative overflow-hidden"
                title="Disconnect Session"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-red-500/0 to-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <LogOut className="w-4 h-4 stroke-[1.5] group-hover:text-red-400 transition-colors relative z-10" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Overlay Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xl lg:hidden flex flex-col pt-20"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <div className={`flex items-center px-4 py-4 rounded-xl border backdrop-blur-md ${
                      pathname === item.href 
                        ? 'bg-white/[0.1] border-white/[0.15] text-white' 
                        : 'border-white/[0.06] bg-white/[0.03] text-white/60'
                    }`}>
                      <item.icon className="w-5 h-5 shrink-0 stroke-[1.5]" />
                      <span className="ml-4 text-xs uppercase tracking-widest font-mono">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
