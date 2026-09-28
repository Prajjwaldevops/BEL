import { Suspense } from 'react';
import PublicVerifyPage from './PublicVerifyPage';

// Public page — no authentication required for document verification
export const metadata = {
  title: 'Verify Document — BEL SENTINEL',
  description: 'Verify the authenticity and integrity of any BEL SENTINEL document using its document ID or by uploading the original file.',
};

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PublicVerifyPage />
    </Suspense>
  );
}
