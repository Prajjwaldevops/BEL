'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Lock, User, Eye, EyeOff, AlertTriangle,
  Fingerprint, Wallet, CheckCircle2, Loader2, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
        }
      } else {
        // Mock fallback if MetaMask is not installed
        setWalletAddress('0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''));
        setWalletConnected(true);
      }
    } catch {
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      // Store session
      localStorage.setItem('bel_session', JSON.stringify({
        token: data.token,
        user: data.user,
        walletAddress: walletAddress || null,
      }));

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(124,92,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,252,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Animated glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#7c5cfc] rounded-full opacity-[0.04] blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00f0ff] rounded-full opacity-[0.03] blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c5cfc] to-[#00f0ff] mb-4 relative">
            <Shield className="w-8 h-8 text-white" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#7c5cfc] to-[#00f0ff] rounded-2xl opacity-40 blur-xl" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            BEL SENTINEL
          </h1>
          <p className="text-[10px] text-[#5a6068] tracking-[0.2em] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            SECURE COMMAND CENTRE — ADMIN LOGIN
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] backdrop-blur-xl p-8">
          {/* Wallet Connect */}
          <div className="mb-6">
            <button
              onClick={connectWallet}
              disabled={walletConnected}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all duration-300 ${
                walletConnected
                  ? 'bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88]'
                  : 'bg-[rgba(124,92,252,0.08)] border border-[rgba(124,92,252,0.2)] text-[#a78bfa] hover:bg-[rgba(124,92,252,0.15)] hover:border-[rgba(124,92,252,0.3)]'
              }`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {walletConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  WALLET CONNECTED: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  CONNECT METAMASK WALLET
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            <span className="text-[9px] text-[#5a6068] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)' }}>
              ADMIN CREDENTIALS
            </span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-[10px] text-[#5a6068] tracking-[0.1em] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                USERNAME
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-sm text-white placeholder-[#3a3f45] focus:outline-none focus:border-[rgba(124,92,252,0.3)] transition-colors"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  required
                  id="login-username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] text-[#5a6068] tracking-[0.1em] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-sm text-white placeholder-[#3a3f45] focus:outline-none focus:border-[rgba(124,92,252,0.3)] transition-colors"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  required
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6068] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444] flex-shrink-0" />
                  <span className="text-[10px] text-[#ef4444]" style={{ fontFamily: 'var(--font-mono)' }}>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6366f1] text-white text-xs font-semibold tracking-[0.1em] hover:from-[#6d4fef] hover:to-[#5558e6] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-mono)' }}
              id="login-submit"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  AUTHENTICATE
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 text-center">
            <span className="text-[8px] text-[#3a3f45] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
              AUTHORIZED PERSONNEL ONLY — USER REGISTRATION VIA ADMIN DASHBOARD
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[8px] text-[#3a3f45] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)' }}>
            BEL SENTINEL v2.0 — BLOCKCHAIN SECURED — ALL ACTIONS LOGGED ON-CHAIN
          </p>
        </div>
      </motion.div>
    </div>
  );
}
