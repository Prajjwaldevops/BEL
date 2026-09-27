import { requireRouteAccess } from '@/lib/auth';
import SecurityClient from './SecurityClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  // Require ADMIN or DEBUGGER role for security monitoring
  await requireRouteAccess('/dashboard/security');
  
  return <SecurityClient />;
}
