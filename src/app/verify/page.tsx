import { requireAuth } from '@/lib/auth';
import VerifyClient from './VerifyClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function VerifyPage() {
  // Verification page requires authentication
  // All authenticated users can verify blockchain records
  await requireAuth();
  
  return <VerifyClient />;
}
