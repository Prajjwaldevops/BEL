import { requireRouteAccess } from '@/lib/auth';
import AuditClient from './AuditClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  // Require ADMIN or DEBUGGER role for audit trail
  await requireRouteAccess('/dashboard/audit');
  
  return <AuditClient />;
}
