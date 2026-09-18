'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Lock, User, Eye, EyeOff, AlertTriangle,
  Fingerprint, Wallet, CheckCircle2, Loader2, ArrowRight,
  Radio, Crosshair, Terminal, Zap, XCircle,
} from 'lucide-react';

type AuthPhase = 'idle' | 'authenticating' | 'wallet_check' | 'granted' | 'denied';

interface TerminalLine {
  text: string;
  type: 'system' | 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [phase, setPhase] = useState<AuthPhase>('idle');
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [scanlineOffset, setScanlineOffset] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' // ').slice(0, 22) + ' UTC');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scanline animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanlineOffset(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const addTerminalLine = (text: string, type: TerminalLine['type'] = 'system') => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setTerminalLines(prev => [...prev, { text, type, timestamp }]);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          addTerminalLine(`WALLET LINKED: ${accounts[0].slice(0, 10)}...${accounts[0].slice(-8)}`, 'success');
        }
      } else {
        // Mock fallback
        const mockAddr = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setWalletAddress(mockAddr);
        setWalletConnected(true);
        addTerminalLine(`WALLET LINKED: ${mockAddr.slice(0, 10)}...${mockAddr.slice(-8)}`, 'success');
      }
    } catch {
      setError('WALLET LINK FAILED — RETRY');
      addTerminalLine('ERR: WALLET CONNECTION REJECTED', 'error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setPhase('authenticating');
    setTerminalLines([]);

    try {
      addTerminalLine('INITIATING SECURE AUTHENTICATION PROTOCOL...');
      await sleep(400);

      addTerminalLine('ESTABLISHING ENCRYPTED CHANNEL...', 'info');
      await sleep(300);

      addTerminalLine(`CREDENTIAL PAYLOAD: USR=[${username}] // PWD=[REDACTED]`, 'info');
      await sleep(200);

      addTerminalLine('TRANSMITTING TO SUPABASE AUTH CORE...', 'info');

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, walletAddress: walletAddress || null }),
      });

      const data = await res.json();

      if (!res.ok) {
        addTerminalLine(`AUTH FAILURE: ${data.error || 'INVALID CREDENTIALS'}`, 'error');
        addTerminalLine('ACCESS DENIED — INCIDENT LOGGED', 'error');
        setError(data.error || 'AUTHENTICATION FAILED');
        setPhase('denied');
        setIsLoading(false);
        return;
      }

      addTerminalLine('CREDENTIALS VERIFIED ✓', 'success');
      await sleep(300);

      addTerminalLine(`ROLE IDENTIFIED: ${data.user.role}`, 'success');
      addTerminalLine(`CLEARANCE: ${data.user.department || 'CLASSIFIED'}`, 'info');
      await sleep(200);

      // Wallet verification phase
      if (walletAddress && data.user.walletAddress) {
        setPhase('wallet_check');
        addTerminalLine('INITIATING WALLET IDENTITY VERIFICATION...', 'warning');
        await sleep(500);

        if (walletAddress.toLowerCase() !== data.user.walletAddress.toLowerCase()) {
          addTerminalLine('WALLET MISMATCH DETECTED', 'error');
          addTerminalLine(`EXPECTED: ${data.user.walletAddress.slice(0, 10)}...`, 'error');
          addTerminalLine(`RECEIVED: ${walletAddress.slice(0, 10)}...`, 'error');
          addTerminalLine('ACCESS DENIED — WALLET IDENTITY FAILURE', 'error');
          setError('WALLET ADDRESS DOES NOT MATCH REGISTERED IDENTITY');
          setPhase('denied');
          setIsLoading(false);
          return;
        }

        addTerminalLine('WALLET IDENTITY CONFIRMED ✓', 'success');
        await sleep(200);
      } else if (walletAddress) {
        addTerminalLine('WALLET LINKED — NO REGISTERED WALLET ON FILE', 'warning');
        await sleep(200);
      }

      addTerminalLine('GENERATING SESSION TOKEN...', 'info');
      await sleep(300);

      addTerminalLine('BLOCKCHAIN AUDIT LOG: TX PENDING...', 'info');
      await sleep(200);

      setPhase('granted');
      addTerminalLine('═══════════════════════════════════', 'success');
      addTerminalLine('   ACCESS GRANTED — WELCOME OPERATOR', 'success');
      addTerminalLine('═══════════════════════════════════', 'success');

      // Store session
      localStorage.setItem('bel_session', JSON.stringify({
        token: data.token,
        user: data.user,
        walletAddress: walletAddress || data.user.walletAddress || null,
      }));

      await sleep(800);

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch {
      addTerminalLine('NETWORK FAILURE — SECURE CHANNEL LOST', 'error');
      setError('NETWORK ERROR — RETRY AUTHENTICATION');
      setPhase('denied');
      setIsLoading(false);
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'authenticating': return '#f59e0b';
      case 'wallet_check': return '#00f0ff';
      case 'granted': return '#00ff88';
      case 'denied': return '#ef4444';
      default: return '#7c5cfc';
    }
  };

  const getTerminalColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'success': return '#00ff88';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#00f0ff';
      default: return '#5a6068';
    }
  };

  return (
    <div className="min-h-screen bg-[#020204] flex items-center justify-center relative overflow-hidden">
      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.1) 2px, rgba(0,255,136,0.1) 4px)`,
          transform: `translateY(${scanlineOffset}px)`,
        }}
      />

      {/* Background grid — military tactical */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `
          linear-gradient(rgba(0,255,136,0.2) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.2) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Radar sweep */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border border-[rgba(0,255,136,0.03)]" />
        <div className="absolute inset-[15%] rounded-full border border-[rgba(0,255,136,0.04)]" />
        <div className="absolute inset-[30%] rounded-full border border-[rgba(0,255,136,0.05)]" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
          style={{ transformOrigin: '50% 50%' }}
        >
          <div className="absolute top-1/2 left-1/2 w-1/2 h-px"
            style={{
              background: 'linear-gradient(90deg, rgba(0,255,136,0.15), transparent)',
              transformOrigin: 'left center',
            }}
          />
        </motion.div>
      </div>

      {/* Corner brackets */}
      <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-[rgba(0,255,136,0.15)]" />
      <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-[rgba(0,255,136,0.15)]" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-l-2 border-b-2 border-[rgba(0,255,136,0.15)]" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-r-2 border-b-2 border-[rgba(0,255,136,0.15)]" />

      {/* Top status bar */}
      <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-6 border-b border-[rgba(0,255,136,0.08)] bg-[rgba(0,0,0,0.5)] z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[8px] text-[#00ff88] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)' }}>
              SECURE CHANNEL
            </span>
          </div>
          <span className="text-[8px] text-[#3a3f45]" style={{ fontFamily: 'var(--font-mono)' }}>|</span>
          <span className="text-[8px] text-[#5a6068] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)' }}>
            TLS 1.3 // AES-256-GCM
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[8px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
            {currentTime}
          </span>
          <div className="flex items-center gap-1.5">
            <Radio className="w-2.5 h-2.5 text-[#00ff88]" />
            <span className="text-[8px] text-[#00ff88] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)' }}>
              ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-lg mx-4 mt-8"
      >
        {/* Classification banner */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[rgba(239,68,68,0.3)]" />
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[9px] text-[#ef4444] tracking-[0.3em] font-bold"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ■ CLASSIFIED // RESTRICTED ACCESS ■
          </motion.span>
          <div className="flex-1 h-px bg-[rgba(239,68,68,0.3)]" />
        </div>

        {/* Logo header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-none border-2 mb-3 relative"
            style={{ borderColor: getPhaseColor() + '40', background: getPhaseColor() + '08' }}
          >
            <Crosshair className="w-8 h-8" style={{ color: getPhaseColor() }} />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ background: getPhaseColor() }} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-[0.15em]" style={{ fontFamily: 'var(--font-display)' }}>
            BEL SENTINEL
          </h1>
          <p className="text-[9px] text-[#5a6068] tracking-[0.2em] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            SECURE COMMAND CENTRE
          </p>
        </div>

        {/* Phase indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {['IDLE', 'AUTH', 'WALLET', 'ACCESS'].map((label, i) => {
            const phases: AuthPhase[] = ['idle', 'authenticating', 'wallet_check', 'granted'];
            const currentIndex = phases.indexOf(phase === 'denied' ? 'idle' : phase);
            const isActive = i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-0.5 text-[7px] tracking-[0.15em] border transition-all`}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    borderColor: isCurrent ? getPhaseColor() + '60' : isActive ? '#00ff8830' : 'rgba(255,255,255,0.06)',
                    background: isCurrent ? getPhaseColor() + '10' : isActive ? 'rgba(0,255,136,0.05)' : 'transparent',
                    color: isCurrent ? getPhaseColor() : isActive ? '#00ff88' : '#3a3f45',
                  }}
                >
                  {isActive && !isCurrent && <CheckCircle2 className="w-2 h-2" />}
                  {isCurrent && phase !== 'idle' && <Loader2 className="w-2 h-2 animate-spin" />}
                  {label}
                </div>
                {i < 3 && <div className="w-3 h-px" style={{ background: isActive ? '#00ff8840' : 'rgba(255,255,255,0.04)' }} />}
              </div>
            );
          })}
        </div>

        {/* Login Card */}
        <div className="border border-[rgba(255,255,255,0.06)] bg-[rgba(5,5,10,0.9)] backdrop-blur-xl">
          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3 text-[#5a6068]" />
              <span className="text-[8px] text-[#5a6068] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)' }}>
                AUTH_TERMINAL v2.0
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: getPhaseColor() }} />
              <span className="text-[8px] tracking-[0.1em]" style={{ color: getPhaseColor(), fontFamily: 'var(--font-mono)' }}>
                {phase === 'idle' ? 'STANDBY' : phase === 'authenticating' ? 'PROCESSING' : phase === 'wallet_check' ? 'VERIFYING' : phase === 'granted' ? 'GRANTED' : 'DENIED'}
              </span>
            </div>
          </div>

          <div className="p-6">
            {/* Wallet Connect */}
            <div className="mb-5">
              <button
                onClick={connectWallet}
                disabled={walletConnected}
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 text-[10px] font-medium transition-all duration-300 border ${
                  walletConnected
                    ? 'bg-[rgba(0,255,136,0.05)] border-[rgba(0,255,136,0.2)] text-[#00ff88]'
                    : 'bg-[rgba(0,240,255,0.03)] border-[rgba(0,240,255,0.15)] text-[#00f0ff] hover:bg-[rgba(0,240,255,0.08)] hover:border-[rgba(0,240,255,0.3)]'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {walletConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    WALLET LINKED: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </>
                ) : (
                  <>
                    <Wallet className="w-3.5 h-3.5" />
                    LINK METAMASK WALLET
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
              <span className="text-[8px] text-[#3a3f45] tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)' }}>
                ENTER LAUNCH CREDENTIALS
              </span>
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label className="flex items-center gap-2 text-[9px] text-[#5a6068] tracking-[0.15em] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  <Zap className="w-2.5 h-2.5" />
                  OPERATOR ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#3a3f45] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ENTER OPERATOR ID"
                    className="w-full pl-10 pr-4 py-3 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.06)] text-xs text-[#00ff88] placeholder-[#1a2a1a] focus:outline-none focus:border-[rgba(0,255,136,0.3)] transition-colors tracking-wider"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    required
                    id="login-username"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="flex items-center gap-2 text-[9px] text-[#5a6068] tracking-[0.15em] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  <Lock className="w-2.5 h-2.5" />
                  LAUNCH CODE
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#3a3f45] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-12 py-3 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.06)] text-xs text-[#00ff88] placeholder-[#1a2a1a] focus:outline-none focus:border-[rgba(0,255,136,0.3)] transition-colors tracking-[0.3em]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    required
                    id="login-password"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a3f45] hover:text-[#00ff88] transition-colors"
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
                    className="flex items-center gap-2 px-3 py-2.5 border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)]"
                  >
                    <XCircle className="w-3.5 h-3.5 text-[#ef4444] flex-shrink-0" />
                    <span className="text-[10px] text-[#ef4444] tracking-[0.05em]" style={{ fontFamily: 'var(--font-mono)' }}>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border-2 text-xs font-bold tracking-[0.2em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontFamily: 'var(--font-mono)',
                  borderColor: phase === 'denied' ? '#ef4444' : '#00ff8860',
                  background: phase === 'denied' ? 'rgba(239,68,68,0.08)' : 'rgba(0,255,136,0.05)',
                  color: phase === 'denied' ? '#ef4444' : '#00ff88',
                }}
                id="login-submit"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    INITIATE AUTHENTICATION
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Terminal output */}
            <AnimatePresence>
              {terminalLines.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 border border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.6)]"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)]">
                    <Terminal className="w-2.5 h-2.5 text-[#3a3f45]" />
                    <span className="text-[7px] text-[#3a3f45] tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)' }}>
                      SYSTEM LOG
                    </span>
                  </div>
                  <div ref={terminalRef} className="p-3 max-h-40 overflow-y-auto space-y-1">
                    {terminalLines.map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2"
                      >
                        <span className="text-[7px] text-[#3a3f45] flex-shrink-0 mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                          [{line.timestamp}]
                        </span>
                        <span className="text-[9px] leading-tight" style={{ color: getTerminalColor(line.type), fontFamily: 'var(--font-mono)' }}>
                          {line.text}
                        </span>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="text-[9px] text-[#00ff88]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        █
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom status */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-[#3a3f45]" />
            <span className="text-[7px] text-[#3a3f45] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
              AUTHORIZED PERSONNEL ONLY
            </span>
          </div>
          <span className="text-[7px] text-[#3a3f45] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
            SESSION: ENCRYPTED
          </span>
        </div>
      </motion.div>
    </div>
  );
}
