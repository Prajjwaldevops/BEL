'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Fingerprint, Search, CheckCircle2, Plus, ShieldAlert, Loader2 } from 'lucide-react';
import { demoUsers } from '@/lib/demo-data';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import Link from 'next/link';

export default function IdentityPage() {
  const [users, setUsers] = useState<any[]>(demoUsers);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading
  const router = useRouter();

  // Check if user is admin
  useEffect(() => {
    const session = localStorage.getItem('bel_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const userRole = parsed.user?.role || '';
        const adminFlag = parsed.user?.isAdmin || false;
        if (userRole === 'ADMIN' || adminFlag) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    } else {
      // No session — DashboardShell will handle redirect to /login
      setIsAdmin(false);
    }
    
    // Load dynamically registered users
    try {
      const localUsers = JSON.parse(localStorage.getItem('bel_registered_users') || '[]');
      if (localUsers.length > 0) {
        setUsers(prev => [...prev, ...localUsers]);
      }
    } catch (e) {
      console.error('Failed to load registered users', e);
    }
  }, []);

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-[#7c5cfc] animate-spin mx-auto" />
          <p className="text-xs text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
            VERIFYING ACCESS...
          </p>
        </div>
      </div>
    );
  }

  // Access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 max-w-md"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)]">
            <ShieldAlert className="w-8 h-8 text-[#ef4444]" />
          </div>
          <h2 className="text-lg font-bold text-white">ACCESS DENIED</h2>
          <p className="text-xs text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
            IDENTITY REGISTRY IS RESTRICTED TO ADMIN USERS ONLY.
            <br />
            CONTACT YOUR SYSTEM ADMINISTRATOR FOR ACCESS.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-6 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-[#9aa0a8] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ← RETURN TO DASHBOARD
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Identity Registry</h1>
          <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>DECENTRALIZED IDENTITY MANAGEMENT — BLOCKCHAIN-ANCHORED DIDs</p>
        </div>
        <Link
          href="/register"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#7c5cfc] to-[#a78bfa] text-white text-xs font-bold tracking-wider uppercase hover:shadow-[0_0_30px_rgba(124,92,252,0.3)] transition-all"
          id="register-identity-btn"
        >
          <Plus className="w-4 h-4" /> Register Identity
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Search by DID, name, or wallet..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#e8e4f0] placeholder-[#a09cb0] focus:outline-none focus:border-[rgba(124,92,252,0.3)]" style={{ fontFamily: 'var(--font-mono)' }} />
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
        {users.map((user) => (
          <motion.div key={user.id} variants={fadeInUp} className="p-5 rounded-xl border border-[rgba(124,92,252,0.08)] bg-[rgba(15,10,30,0.6)] hover:border-[rgba(124,92,252,0.2)] transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[rgba(124,92,252,0.1)] border border-[rgba(124,92,252,0.2)] flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-[#a78bfa]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{user.name}</h3>
                    <span className="flex items-center gap-1 text-[10px] text-[#34d399]" style={{ fontFamily: 'var(--font-mono)' }}><CheckCircle2 className="w-3 h-3" /> VERIFIED</span>
                  </div>
                  <div className="text-xs text-[#a78bfa] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>{user.identityDid}</div>
                  <div className="flex items-center gap-6 text-[10px] text-[#a09cb0]" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span>Wallet: <span className="text-white">{user.walletAddress.slice(0, 10)}...{user.walletAddress.slice(-6)}</span></span>
                    <span>Clearance: <span className="text-[#a78bfa]">{user.clearance}</span></span>
                    <span>Created: <span className="text-white">{new Date(user.createdAt).toLocaleDateString()}</span></span>
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[10px] bg-[rgba(52,211,153,0.1)] text-[#34d399] border border-[rgba(52,211,153,0.2)]" style={{ fontFamily: 'var(--font-mono)' }}>ACTIVE</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
