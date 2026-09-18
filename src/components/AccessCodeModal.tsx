'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Lock, CheckCircle2, XCircle, Loader2,
  AlertTriangle, Crosshair, Terminal,
} from 'lucide-react';

interface AccessCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (txHash: string) => void;
  documentName?: string;
  documentId?: string;
}

export default function AccessCodeModal({
  isOpen,
  onClose,
  onVerified,
  documentName = 'CLASSIFIED DOCUMENT',
  documentId,
}: AccessCodeModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [txHash, setTxHash] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setError('');
      setVerified(false);
      setTxHash('');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5) {
      const code = newDigits.join('');
      if (code.length === 6) {
        handleVerify(code);
      }
    }
  }, [digits]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [digits, onClose]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newDigits[i] = pastedData[i];
      }
      setDigits(newDigits);
      if (pastedData.length === 6) {
        handleVerify(pastedData);
      } else {
        inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
      }
    }
  }, [digits]);

  const handleVerify = async (code: string) => {
    setIsVerifying(true);
    setError('');

    try {
      // Get user session
      const session = localStorage.getItem('bel_session');
      if (!session) {
        setError('SESSION EXPIRED — RE-AUTHENTICATE');
        setIsVerifying(false);
        return;
      }

      const parsed = JSON.parse(session);
      const userId = parsed.user?.id;

      if (!userId) {
        setError('INVALID SESSION — OPERATOR ID MISSING');
        setIsVerifying(false);
        return;
      }

      const res = await fetch('/api/access/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode: code,
          userId,
          documentId: documentId || null,
          documentName,
          action: 'VIEW',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'ACCESS CODE REJECTED');
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        setIsVerifying(false);
        return;
      }

      setVerified(true);
      setTxHash(data.txHash);

      // Wait for animation then callback
      setTimeout(() => {
        onVerified(data.txHash);
      }, 1500);

    } catch {
      setError('VERIFICATION SYSTEM ERROR — RETRY');
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-md" onClick={onClose} />

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.1) 2px, rgba(0,255,136,0.1) 4px)',
          }}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          {/* Classification banner */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex-1 h-px bg-[rgba(239,68,68,0.3)]" />
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[8px] text-[#ef4444] tracking-[0.3em] font-bold"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              DOCUMENT ACCESS AUTHORIZATION
            </motion.span>
            <div className="flex-1 h-px bg-[rgba(239,68,68,0.3)]" />
          </div>

          <div className="border border-[rgba(255,255,255,0.08)] bg-[rgba(5,5,10,0.95)] backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
              <div className="flex items-center gap-2">
                <Lock className="w-3 h-3 text-[#ef4444]" />
                <span className="text-[8px] text-[#ef4444] tracking-[0.15em] font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                  ACCESS CODE REQUIRED
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: verified ? '#00ff88' : error ? '#ef4444' : '#f59e0b' }} />
                <span className="text-[8px] tracking-[0.1em]"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: verified ? '#00ff88' : error ? '#ef4444' : '#f59e0b',
                  }}
                >
                  {verified ? 'AUTHORIZED' : error ? 'DENIED' : isVerifying ? 'VERIFYING' : 'AWAITING'}
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Document info */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 border-2 border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)] mb-3">
                  {verified ? (
                    <CheckCircle2 className="w-7 h-7 text-[#00ff88]" />
                  ) : (
                    <Crosshair className="w-7 h-7 text-[#ef4444]" />
                  )}
                </div>
                <p className="text-[10px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                  ACCESSING
                </p>
                <p className="text-xs text-white font-bold mt-1 tracking-[0.05em]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {documentName}
                </p>
              </div>

              {!verified ? (
                <>
                  {/* 6-digit input */}
                  <div className="flex justify-center gap-2 mb-4">
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        disabled={isVerifying}
                        className={`w-12 h-14 text-center text-xl font-bold border-2 bg-[rgba(0,0,0,0.5)] transition-all duration-200 focus:outline-none ${
                          error
                            ? 'border-[rgba(239,68,68,0.5)] text-[#ef4444]'
                            : digit
                              ? 'border-[rgba(0,255,136,0.4)] text-[#00ff88]'
                              : 'border-[rgba(255,255,255,0.1)] text-white focus:border-[rgba(0,240,255,0.5)]'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                        id={`access-digit-${i}`}
                      />
                    ))}
                  </div>

                  <p className="text-center text-[8px] text-[#3a3f45] tracking-[0.1em] mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                    ENTER YOUR 6-DIGIT ACCESS CODE TO PROCEED
                  </p>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex items-center gap-2 px-3 py-2.5 mb-4 border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)]"
                      >
                        <XCircle className="w-3.5 h-3.5 text-[#ef4444] flex-shrink-0" />
                        <span className="text-[9px] text-[#ef4444]" style={{ fontFamily: 'var(--font-mono)' }}>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Verifying spinner */}
                  {isVerifying && (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 text-[#f59e0b] animate-spin" />
                      <span className="text-[9px] text-[#f59e0b] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                        VERIFYING ACCESS CODE...
                      </span>
                    </div>
                  )}

                  {/* Warning */}
                  <div className="flex items-start gap-2 px-3 py-2 border border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.03)]">
                    <AlertTriangle className="w-3 h-3 text-[#f59e0b] mt-0.5 flex-shrink-0" />
                    <span className="text-[7px] text-[#f59e0b] leading-relaxed" style={{ fontFamily: 'var(--font-mono)' }}>
                      THIS ACCESS ATTEMPT WILL BE RECORDED ON THE BLOCKCHAIN. UNAUTHORIZED ACCESS ATTEMPTS ARE MONITORED AND LOGGED.
                    </span>
                  </div>
                </>
              ) : (
                /* Verified state */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-3"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
                    <span className="text-xs text-[#00ff88] font-bold tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                      ACCESS AUTHORIZED
                    </span>
                  </div>

                  {txHash && (
                    <div className="px-3 py-2 border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.03)]">
                      <div className="text-[7px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                        BLOCKCHAIN TX HASH
                      </div>
                      <div className="text-[9px] text-[#00ff88] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                        {txHash.slice(0, 22)}...{txHash.slice(-16)}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 text-[#00f0ff] animate-spin" />
                    <span className="text-[8px] text-[#00f0ff] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                      LOADING DOCUMENT...
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)]">
              <div className="flex items-center gap-1.5">
                <Shield className="w-2.5 h-2.5 text-[#3a3f45]" />
                <span className="text-[7px] text-[#3a3f45] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                  BLOCKCHAIN AUDIT ACTIVE
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-[8px] text-[#5a6068] hover:text-white tracking-[0.1em] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
