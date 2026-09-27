'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  Shield, Lock, User, Eye, EyeOff, Fingerprint, Wallet, CheckCircle2,
  Loader2, ArrowRight, Terminal, Zap, XCircle
} from 'lucide-react';

type AuthPhase = 'idle' | 'authenticating' | 'wallet_check' | 'granted' | 'denied';

interface TerminalLine {
  text: string;
  type: 'system' | 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
}

function FloatingBackgroundObjects() {
  const groupRef = useRef<THREE.Group>(null);

  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 - 5
      ] as [number, number, number],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
      scale: Math.random() * 0.3 + 0.05,
      speed: Math.random() * 0.1 + 0.05,
      color: Math.random() > 0.5 ? '#38bdf8' : '#fbbf24'
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.02;
    groupRef.current.rotation.x = Math.sin(t * 0.02) * 0.05;
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position} rotation={p.rotation} scale={p.scale}>
          {i % 2 === 0 ? <boxGeometry args={[1, 1, 1]} /> : <icosahedronGeometry args={[1, 0]} />}
          <meshBasicMaterial color={p.color} wireframe transparent opacity={0.15} />
        </mesh>
      ))}
    </group>
  );
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
  const [redirectTo, setRedirectTo] = useState('/dashboard');
  const terminalRef = useRef<HTMLDivElement>(null);

  // Get redirect parameter from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        setRedirectTo(redirect);
      }
    }
  }, []);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').slice(0, 19) + ' GMT');
    };
    tick();
    const interval = setInterval(tick, 1000);
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
          addTerminalLine(`SECURE KEY DETECTED: ${accounts[0].slice(0, 10)}...${accounts[0].slice(-8)}`, 'success');
        }
      } else {
        // Mock fallback
        const mockAddr = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setWalletAddress(mockAddr);
        setWalletConnected(true);
        addTerminalLine(`SECURE KEY DETECTED: ${mockAddr.slice(0, 10)}...${mockAddr.slice(-8)}`, 'success');
      }
    } catch {
      setError('AUTHENTICATION HARDWARE FAILED');
      addTerminalLine('ERR: HARDWARE KEY REJECTED', 'error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setPhase('authenticating');
    setTerminalLines([]);

    try {
      addTerminalLine('INITIATING SECURE HANDSHAKE...');
      await sleep(400);

      addTerminalLine('ESTABLISHING ENCRYPTED TUNNEL...', 'info');
      await sleep(300);

      addTerminalLine(`PAYLOAD: OP=[${username}] // KEY=[REDACTED]`, 'info');
      await sleep(200);

      addTerminalLine('TRANSMITTING TO CENTRAL AUTH...', 'info');

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, walletAddress: walletAddress || null }),
      });

      const data = await res.json();

      if (!res.ok) {
        addTerminalLine(`AUTH REJECTED: ${data.error || 'INVALID CREDENTIALS'}`, 'error');
        addTerminalLine('ACCESS DENIED — INCIDENT LOGGED', 'error');
        setError(data.error || 'AUTHENTICATION FAILED');
        setPhase('denied');
        setIsLoading(false);
        return;
      }

      addTerminalLine('CREDENTIALS VERIFIED ✓', 'success');
      await sleep(300);

      addTerminalLine(`CLEARANCE IDENTIFIED: ${data.user.role}`, 'success');
      addTerminalLine(`DEPT: ${data.user.department || 'CLASSIFIED'}`, 'info');
      await sleep(200);

      // Wallet verification phase
      if (walletAddress && data.user.walletAddress) {
        setPhase('wallet_check');
        addTerminalLine('VERIFYING HARDWARE IDENTITY...', 'warning');
        await sleep(500);

        if (walletAddress.toLowerCase() !== data.user.walletAddress.toLowerCase()) {
          addTerminalLine('HARDWARE KEY MISMATCH DETECTED', 'error');
          addTerminalLine('ACCESS DENIED — IDENTITY COMPROMISE', 'error');
          setError('HARDWARE KEY DOES NOT MATCH REGISTERED IDENTITY');
          setPhase('denied');
          setIsLoading(false);
          return;
        }

        addTerminalLine('HARDWARE IDENTITY CONFIRMED ✓', 'success');
        await sleep(200);
      } else if (walletAddress) {
        addTerminalLine('HARDWARE KEY LINKED (UNREGISTERED)', 'warning');
        await sleep(200);
      }

      addTerminalLine('GENERATING QUANTUM TOKEN...', 'info');
      await sleep(300);

      addTerminalLine('BLOCKCHAIN AUDIT: TX PENDING...', 'info');
      await sleep(200);

      setPhase('granted');
      addTerminalLine('═══════════════════════════════════', 'success');
      addTerminalLine('       ACCESS GRANTED — PROCEED', 'success');
      addTerminalLine('═══════════════════════════════════', 'success');

      localStorage.setItem('bel_session', JSON.stringify({
        token: data.token,
        user: data.user,
        walletAddress: walletAddress || data.user.walletAddress || null,
      }));

      await sleep(800);
      window.location.href = redirectTo;
    } catch {
      addTerminalLine('NETWORK FAILURE — CONNECTION LOST', 'error');
      setError('NETWORK ERROR — RETRY AUTHENTICATION');
      setPhase('denied');
      setIsLoading(false);
    }
  };

  const getTerminalColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'success': return '#38bdf8'; // Cyan
      case 'error': return '#ef4444'; // Red
      case 'warning': return '#fbbf24'; // Amber
      case 'info': return '#94a3b8'; // Slate
      default: return '#64748b'; // Slate darker
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#020617]">
      {/* Blurred Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat blur-[0.5px] scale-110 opacity-60"
        style={{
          backgroundImage: 'url("https://cdn.dribbble.com/userupload/48973425/file/0af8f9c2eb84552b5653bbe1fd327083.png?resize=1905x1072&vertical=center")',
        }}
      />
      {/* Dimmer */}
      <div className="absolute inset-0 z-0 bg-[#020617]/80" />

      {/* 3D Moving Objects Canvas - Cyan & Amber Cyberpunk theme */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
          <FloatingBackgroundObjects />
        </Canvas>
      </div>

      {/* Main Authentication Terminal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[480px] mx-4"
      >
        {/* Top Header accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent z-20" />

        <div className="bg-black/30 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative rounded-3xl overflow-hidden">

          {/* Top Status Bar */}
          <div className="flex items-center justify-between px-8 py-3 border-b border-[#38bdf8]/10 bg-[#38bdf8]/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#38bdf8] animate-pulse shadow-[0_0_10px_#38bdf8]" />
              <span className="text-[8px] text-[#38bdf8] tracking-[0.25em] uppercase font-mono font-medium">SECURE LINK ESTABLISHED</span>
            </div>
            <span className="text-[8px] text-[#38bdf8]/50 font-mono tracking-widest">{currentTime}</span>
          </div>

          {/* Header Section */}
          <div className="pt-12 pb-8 px-10 text-center relative border-b border-white/5">

            <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center relative bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
              <Shield className="w-8 h-8 text-white/90 stroke-[1.5]" />
              {phase === 'authenticating' && (
                <div className="absolute inset-0 border border-white/30 rounded-2xl animate-ping opacity-40" />
              )}
            </div>

            <h1 className="text-2xl font-light text-white tracking-[0.3em] uppercase mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              BEL SENTINEL
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] animate-pulse" />
              <p className="text-[9px] text-white/50 tracking-[0.25em] uppercase font-mono">
                System Node Alpha
              </p>
            </div>
          </div>

          <div className="px-10 py-10">
            {/* Hardware Security Key */}
            <div className="mb-8">
              <button
                onClick={connectWallet}
                disabled={walletConnected || isLoading}
                className={`group w-full flex items-center justify-between px-5 py-4 transition-all duration-300 rounded-2xl relative overflow-hidden ${walletConnected
                    ? 'border border-[#10b981]/40 bg-gradient-to-b from-[#10b981]/20 to-[#10b981]/5 backdrop-blur-xl text-[#10b981] shadow-[inset_0_1px_0_rgba(16,185,129,0.3),0_8px_32px_-8px_rgba(16,185,129,0.2)]'
                    : 'border border-white/20 border-t-white/40 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl text-white/90 hover:from-white/20 hover:to-white/10 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_12px_48px_-12px_rgba(255,255,255,0.2)] active:scale-[0.98] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_-8px_rgba(0,0,0,0.5)]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 stroke-[1.5]" />
                  <span className="text-[11px] font-medium tracking-[0.2em] uppercase font-mono">
                    {walletConnected ? 'Security Key Authorized' : 'Connect Hardware Key'}
                  </span>
                </div>
                {walletConnected ? (
                  <CheckCircle2 className="w-5 h-5 stroke-[1.5]" />
                ) : (
                  <ArrowRight className="w-5 h-5 stroke-[1.5] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                )}
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-7">
              {/* Operator Designation */}
              <div>
                <label className="block text-[10px] text-white/50 tracking-[0.2em] uppercase mb-2 font-mono ml-1">
                  Operator Designation
                </label>
                <div className="relative flex items-center bg-white/5 backdrop-blur-sm border border-white/10 focus-within:border-white/30 transition-all group rounded-2xl">
                  <div className="pl-5 pr-3 text-white/30 group-focus-within:text-white/80 transition-colors">
                    <User className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ENTER OPERATOR ID"
                    className="w-full bg-transparent py-4 text-[11px] text-white placeholder-white/20 focus:outline-none tracking-[0.2em] font-mono"
                    required
                  />
                </div>
              </div>

              {/* Encryption Cipher */}
              <div>
                <label className="block text-[10px] text-white/50 tracking-[0.2em] uppercase mb-2 font-mono ml-1">
                  Encryption Cipher
                </label>
                <div className="relative flex items-center bg-white/5 backdrop-blur-sm border border-white/10 focus-within:border-white/30 transition-all group rounded-2xl">
                  <div className="pl-5 pr-3 text-white/30 group-focus-within:text-white/80 transition-colors">
                    <Lock className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent py-4 text-[11px] text-white placeholder-white/20 focus:outline-none tracking-[0.3em] font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-5 text-white/30 hover:text-white/80 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 stroke-[1.5]" /> : <Eye className="w-5 h-5 stroke-[1.5]" />}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-400 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-500" />
                      <XCircle className="w-5 h-5 shrink-0 stroke-[1.5] ml-2" />
                      <span className="text-[10px] tracking-widest uppercase font-mono font-medium">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Authorization - Professional Glass Style */}
              <button
                type="submit"
                disabled={isLoading || !walletConnected}
                className={`w-full mt-10 relative overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${phase === 'denied'
                    ? 'bg-red-500/10 backdrop-blur-xl border border-red-500/30 text-red-400'
                    : !walletConnected
                      ? 'bg-white/5 backdrop-blur-xl border border-white/10 text-white/40'
                      : 'bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-xl border border-white/20 border-t-white/40 text-white hover:from-white/25 hover:to-white/10 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_12px_48px_-12px_rgba(255,255,255,0.3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_-8px_rgba(0,0,0,0.5)] active:scale-[0.98]'
                  } rounded-2xl`}
              >
                <div className="flex items-center justify-center gap-4 py-5 relative z-10">
                  {isLoading ? (
                    <Loader2 className={`w-5 h-5 animate-spin ${phase === 'denied' ? 'text-red-400' : 'text-white'}`} />
                  ) : (
                    <>
                      <Fingerprint className={`w-5 h-5 stroke-[1.5] ${phase === 'denied' ? 'text-red-400' : !walletConnected ? 'text-white/40' : 'text-white'}`} />
                      <span className="text-[12px] font-medium tracking-[0.25em] uppercase font-mono">
                        {!walletConnected ? 'Require Hardware Key' : phase === 'denied' ? 'Authorization Denied' : 'Execute Authentication'}
                      </span>
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>

          {/* System Log Terminal */}
          <div className="bg-black/30 backdrop-blur-sm border-t border-[#38bdf8]/10 relative">
            {/* Enhanced Scanline */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.15] bg-[linear-gradient(rgba(56,189,248,0.1)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(56,189,248,0.08),rgba(251,191,36,0.04),rgba(56,189,248,0.08))] bg-[length:100%_4px,3px_100%]" />

            <div className="px-8 py-3 border-b border-[#38bdf8]/10 flex items-center justify-between bg-[#38bdf8]/[0.03]">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-[#38bdf8] stroke-[1.5]" />
                <span className="text-[9px] text-[#38bdf8]/80 tracking-[0.25em] font-mono uppercase font-medium">System Event Log</span>
              </div>
              <span className="text-[8px] text-[#38bdf8]/40 font-mono tracking-widest">{currentTime}</span>
            </div>

            <div className="h-36 p-6 overflow-y-auto" ref={terminalRef}>
              {terminalLines.length === 0 && !isLoading && (
                <div className="text-[10px] text-[#38bdf8]/40 tracking-widest font-mono uppercase flex items-center gap-2">
                  <span className="text-[#38bdf8]/60">&gt;</span>
                  AWAITING AUTHENTICATION CREDENTIALS...
                </div>
              )}
              {terminalLines.map((line, i) => (
                <div key={i} className="flex gap-4 text-[10px] mb-2.5 leading-tight font-mono tracking-wide">
                  <span className="text-[#38bdf8]/30 shrink-0 font-medium">[{line.timestamp}]</span>
                  <span style={{ color: getTerminalColor(line.type) }}>{line.text}</span>
                </div>
              ))}
              {isLoading && (
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2.5 h-3.5 bg-[#38bdf8]/80 mt-2 ml-[76px]"
                />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
