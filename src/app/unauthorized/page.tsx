'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white flex items-center justify-center">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ef4444] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7c5cfc] rounded-full mix-blend-screen filter blur-[128px] opacity-10" />
      </div>

      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-[rgba(239,68,68,0.1)] border border-[#ef4444]/30 flex items-center justify-center">
              <ShieldAlert className="w-12 h-12 text-[#ef4444]" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#ef4444] to-[#f87171] bg-clip-text text-transparent">
              Access Denied
            </h1>
            <p className="text-xl text-[#9aa0a8] mb-2">
              You don't have permission to access this resource
            </p>
            <p className="text-sm text-[#5a6068]">
              Your current role does not grant access to this page
            </p>
          </div>

          {/* Details */}
          <div className="max-w-md mx-auto p-6 rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)]">
            <div className="flex items-start gap-3 text-left">
              <Lock className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#9aa0a8] space-y-2">
                <p>
                  <strong className="text-white">Role-Based Access Control (RBAC)</strong> is enforced at all levels.
                </p>
                <p>
                  If you believe you should have access to this resource, please contact your system administrator to request the appropriate role or permission.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white rounded-lg hover:shadow-lg hover:shadow-[#7c5cfc]/20 transition-all"
            >
              Go to Dashboard
            </button>
          </div>

          {/* Footer Note */}
          <div className="text-xs text-[#5a6068] mt-8">
            <p>Security Event ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
            <p className="mt-1">This access attempt has been logged for security auditing</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
