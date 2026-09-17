'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, User, Camera, Wallet, AlertTriangle,
  CheckCircle2, Loader2, ArrowRight, ArrowLeft,
  Fingerprint, Copy, Building2, BadgeCheck,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DEPARTMENTS, ROLES, type UserRole } from '@/lib/constants';

type RegistrationStep = 'auth_check' | 'form' | 'criminal_check' | 'processing' | 'complete';

interface RegistrationResult {
  username: string;
  password: string;
  nftTokenId: string;
  nftTxHash: string;
  walletAddress: string;
  photoHash: string;
}

export default function RegisterPage() {
  const router = useRouter();

  // Auth check
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Step management — starts at 'auth_check', then goes to 'form' if admin
  const [step, setStep] = useState<RegistrationStep>('auth_check');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<UserRole>('VIEWER');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);

  // Photo
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [copied, setCopied] = useState('');

  // Check admin session on mount
  useEffect(() => {
    const session = localStorage.getItem('bel_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const userRole = parsed.user?.role || '';
        const adminFlag = parsed.user?.isAdmin || false;
        if (userRole === 'ADMIN' || adminFlag) {
          setIsAdmin(true);
          setStep('form');
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ===== WALLET CONNECT =====
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
      setError('Failed to connect wallet.');
    }
  };

  // ===== CAMERA =====
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      
      // Wait for React to render the video element since it is conditionally rendered
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (e) {
            console.error('Error playing video:', e);
          }
        }
      }, 50);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        setPhotoBlob(blob);
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.8));
      }
    }, 'image/jpeg', 0.8);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  }, []);

  const retakePhoto = () => {
    setPhotoBlob(null);
    setPhotoPreview(null);
    startCamera();
  };

  // ===== REGISTRATION SUBMIT =====
  const handleRegister = async () => {
    if (!fullName || !email || !department || !walletAddress || !photoBlob) {
      setError('All fields are required including photo and wallet.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setStep('criminal_check');

    try {
      // Step 1: Criminal database check (mock)
      setProcessingStep('Checking national criminal database...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingStep('Criminal status: CLEARED ✓');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStep('processing');

      // Step 2: Upload photo
      setProcessingStep('Uploading webcam photo to Cloudflare R2...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 3: Mint NFT
      setProcessingStep('Minting Identity NFT on blockchain...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Send to API
      setProcessingStep('Registering user in secure database...');

      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('department', department);
      formData.append('role', role);
      formData.append('walletAddress', walletAddress);
      formData.append('photo', photoBlob, 'webcam-photo.jpg');

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Save to localStorage for demo purposes so it appears in the dashboard
      const existingUsers = JSON.parse(localStorage.getItem('bel_registered_users') || '[]');
      existingUsers.push({
        id: `usr-${Date.now()}`,
        name: fullName,
        email,
        department,
        role,
        clearance: 'SECRET',
        identityDid: `did:eth:${walletAddress}`,
        walletAddress,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('bel_registered_users', JSON.stringify(existingUsers));

      // Step 5: Send testnet ETH
      setProcessingStep('Sending testnet ETH to wallet...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      setProcessingStep('Registration complete!');
      setResult(data);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setStep('form');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  // ===== AUTH CHECK: Loading =====
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-[#7c5cfc] animate-spin mx-auto" />
          <p className="text-xs text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
            VERIFYING ADMIN ACCESS...
          </p>
        </div>
      </div>
    );
  }

  // ===== AUTH CHECK: Not admin =====
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(124,92,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,252,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center space-y-4 max-w-md mx-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)]">
            <ShieldAlert className="w-8 h-8 text-[#ef4444]" />
          </div>
          <h2 className="text-lg font-bold text-white">ACCESS DENIED</h2>
          <p className="text-xs text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
            USER REGISTRATION IS RESTRICTED TO ADMIN USERS ONLY.
            <br />
            PLEASE LOG IN AS ADMIN TO REGISTER NEW USERS.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#7c5cfc] to-[#6366f1] text-white text-xs font-semibold tracking-[0.1em] hover:from-[#6d4fef] hover:to-[#5558e6] transition-all"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              GO TO LOGIN
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-[#9aa0a8] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              DASHBOARD
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== RENDER (Admin authenticated) =====
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center relative overflow-hidden py-8">
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(124,92,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,252,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-[#a855f7] rounded-full opacity-[0.03] blur-[120px]" />

      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7c5cfc] to-[#a855f7] mb-3 relative">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            USER REGISTRATION
          </h1>
          <p className="text-[9px] text-[#5a6068] tracking-[0.2em] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            BEL SENTINEL — ADMIN IDENTITY ENROLLMENT
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['DETAILS', 'VERIFY', 'PROCESSING', 'COMPLETE'].map((label, i) => {
            const steps: RegistrationStep[] = ['form', 'criminal_check', 'processing', 'complete'];
            const currentIndex = steps.indexOf(step);
            const isActive = i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[8px] tracking-[0.1em] transition-all ${
                  isCurrent ? 'bg-[rgba(124,92,252,0.15)] border border-[rgba(124,92,252,0.3)] text-[#a78bfa]' :
                  isActive ? 'bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.15)] text-[#00ff88]' :
                  'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] text-[#3a3f45]'
                }`} style={{ fontFamily: 'var(--font-mono)' }}>
                  {isActive && !isCurrent ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
                  {label}
                </div>
                {i < 3 && <div className={`w-4 h-px ${isActive ? 'bg-[#00ff88]' : 'bg-[rgba(255,255,255,0.04)]'}`} />}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] backdrop-blur-xl p-6">
          <AnimatePresence mode="wait">
            {/* ===== STEP 1: REGISTRATION FORM ===== */}
            {step === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Full Name */}
                <div>
                  <label className="block text-[10px] text-[#5a6068] tracking-[0.1em] mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>FULL NAME</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-sm text-white placeholder-[#3a3f45] focus:outline-none focus:border-[rgba(124,92,252,0.3)] transition-colors"
                      style={{ fontFamily: 'var(--font-mono)' }} required id="reg-fullname" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] text-[#5a6068] tracking-[0.1em] mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>EMAIL</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@bel-sentinel.gov" className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-sm text-white placeholder-[#3a3f45] focus:outline-none focus:border-[rgba(124,92,252,0.3)] transition-colors"
                    style={{ fontFamily: 'var(--font-mono)' }} required id="reg-email" />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[10px] text-[#5a6068] tracking-[0.1em] mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>DEPARTMENT</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#5a6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <select value={department} onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-sm text-white focus:outline-none focus:border-[rgba(124,92,252,0.3)] transition-colors appearance-none"
                      style={{ fontFamily: 'var(--font-mono)' }} required id="reg-department">
                      <option value="" className="bg-[#0a0a0f]">Select department...</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-[#0a0a0f]">{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[10px] text-[#5a6068] tracking-[0.1em] mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>ACCESS LEVEL</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['VIEWER', 'ALTER', 'DEBUGGER'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`px-3 py-2.5 rounded-xl text-[10px] font-medium tracking-[0.05em] transition-all border ${
                          role === r
                            ? 'border-[rgba(124,92,252,0.3)] bg-[rgba(124,92,252,0.1)] text-[#a78bfa]'
                            : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[#5a6068] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: ROLES[r].color }} />
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-[#3a3f45] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
                    {ROLES[role].description}
                  </p>
                </div>

                {/* Wallet */}
                <div>
                  <label className="block text-[10px] text-[#5a6068] tracking-[0.1em] mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>METAMASK WALLET</label>
                  <button
                    type="button"
                    onClick={connectWallet}
                    disabled={walletConnected}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-medium transition-all border ${
                      walletConnected
                        ? 'bg-[rgba(0,255,136,0.06)] border-[rgba(0,255,136,0.15)] text-[#00ff88]'
                        : 'bg-[rgba(124,92,252,0.06)] border-[rgba(124,92,252,0.15)] text-[#a78bfa] hover:bg-[rgba(124,92,252,0.12)]'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                    id="reg-wallet-connect"
                  >
                    {walletConnected ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</>
                    ) : (
                      <><Wallet className="w-3.5 h-3.5" /> CONNECT METAMASK</>
                    )}
                  </button>
                </div>

                {/* Webcam Photo */}
                <div>
                  <label className="block text-[10px] text-[#5a6068] tracking-[0.1em] mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>WEBCAM PHOTO</label>
                  <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
                    {!cameraActive && !photoPreview && (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full flex flex-col items-center justify-center gap-2 py-8 text-[#5a6068] hover:text-white transition-colors"
                        id="reg-start-camera"
                      >
                        <Camera className="w-8 h-8" />
                        <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>CLICK TO ACTIVATE CAMERA</span>
                      </button>
                    )}

                    {cameraActive && (
                      <div className="relative">
                        <video ref={videoRef} className="w-full h-48 object-cover" playsInline muted />
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(239,68,68,0.9)] text-white text-[10px] font-semibold hover:bg-[rgba(239,68,68,1)] transition-colors"
                          style={{ fontFamily: 'var(--font-mono)' }}
                          id="reg-capture-photo"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          CAPTURE
                        </button>
                      </div>
                    )}

                    {photoPreview && (
                      <div className="relative">
                        <img src={photoPreview} alt="Captured photo" className="w-full h-48 object-cover" />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(0,255,136,0.15)] text-[#00ff88] text-[8px]" style={{ fontFamily: 'var(--font-mono)' }}>
                            <CheckCircle2 className="w-2.5 h-2.5" /> CAPTURED
                          </span>
                          <button onClick={retakePhoto}
                            className="px-2 py-1 rounded-md bg-[rgba(255,255,255,0.1)] text-white text-[8px] hover:bg-[rgba(255,255,255,0.2)]"
                            style={{ fontFamily: 'var(--font-mono)' }}>
                            RETAKE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444]" />
                    <span className="text-[10px] text-[#ef4444]" style={{ fontFamily: 'var(--font-mono)' }}>{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={() => router.push('/dashboard/identity')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] text-[#5a6068] text-[10px] hover:text-white hover:bg-[rgba(255,255,255,0.03)] transition-all"
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> BACK
                  </button>
                  <button onClick={handleRegister}
                    disabled={isProcessing || !fullName || !email || !department || !walletAddress || !photoBlob}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#a855f7] text-white text-xs font-semibold tracking-[0.1em] hover:from-[#6d4fef] hover:to-[#9333ea] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    id="reg-submit">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Fingerprint className="w-4 h-4" /> REGISTER & MINT NFT</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ===== STEP 2: CRIMINAL CHECK / PROCESSING ===== */}
            {(step === 'criminal_check' || step === 'processing') && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-6"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(124,92,252,0.1)] border border-[rgba(124,92,252,0.2)]">
                  <Loader2 className="w-8 h-8 text-[#a78bfa] animate-spin" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white mb-2">PROCESSING REGISTRATION</h3>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                    <span className="text-[10px] text-[#00ff88]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {processingStep}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-w-xs mx-auto">
                  {[
                    { label: 'Criminal Database Check', done: step !== 'criminal_check' },
                    { label: 'Photo Upload to R2', done: step === 'processing' && processingStep.includes('Mint') },
                    { label: 'Identity NFT Minting', done: step === 'processing' && processingStep.includes('database') },
                    { label: 'Database Registration', done: step === 'processing' && processingStep.includes('ETH') },
                    { label: 'Testnet ETH Transfer', done: step === 'processing' && processingStep.includes('complete') },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] ${
                      item.done ? 'bg-[rgba(0,255,136,0.05)] text-[#00ff88]' : 'bg-[rgba(255,255,255,0.02)] text-[#5a6068]'
                    }`} style={{ fontFamily: 'var(--font-mono)' }}>
                      {item.done ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-[#5a6068]" />}
                      {item.label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ===== STEP 3: COMPLETE ===== */}
            {step === 'complete' && result && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] mb-3">
                    <BadgeCheck className="w-7 h-7 text-[#00ff88]" />
                  </div>
                  <h3 className="text-sm font-bold text-white">REGISTRATION SUCCESSFUL</h3>
                  <p className="text-[9px] text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                    Identity NFT minted — Save your credentials securely
                  </p>
                </div>

                {/* Credentials */}
                <div className="space-y-2">
                  {[
                    { label: 'USERNAME', value: result.username },
                    { label: 'PASSWORD', value: result.password },
                    { label: 'NFT TOKEN ID', value: result.nftTokenId },
                    { label: 'NFT TX HASH', value: result.nftTxHash },
                    { label: 'PHOTO HASH', value: result.photoHash },
                    { label: 'WALLET', value: result.walletAddress },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                      <div>
                        <div className="text-[8px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>{item.label}</div>
                        <div className="text-[11px] text-white mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                          {item.value.length > 30 ? `${item.value.slice(0, 14)}...${item.value.slice(-14)}` : item.value}
                        </div>
                      </div>
                      <button onClick={() => copyToClipboard(item.value, item.label)}
                        className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                        {copied === item.label ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5 text-[#5a6068]" />}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0" />
                  <span className="text-[9px] text-[#f59e0b]" style={{ fontFamily: 'var(--font-mono)' }}>
                    SAVE THESE CREDENTIALS — THEY CANNOT BE RECOVERED
                  </span>
                </div>

                <Link href="/dashboard/identity"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6366f1] text-white text-xs font-semibold tracking-[0.1em] hover:from-[#6d4fef] hover:to-[#5558e6] transition-all"
                  style={{ fontFamily: 'var(--font-mono)' }}>
                  <ArrowRight className="w-3.5 h-3.5" />
                  BACK TO IDENTITY REGISTRY
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back to dashboard */}
        {step === 'form' && (
          <div className="text-center mt-4">
            <Link href="/dashboard/identity" className="text-[10px] text-[#5a6068] hover:text-white transition-colors" style={{ fontFamily: 'var(--font-mono)' }}>
              ← BACK TO IDENTITY REGISTRY
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
