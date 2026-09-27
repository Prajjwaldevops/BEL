import { requireRouteAccess } from '@/lib/auth';
import IdentityClient from './IdentityClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function IdentityPage() {
  // Require ADMIN role for identity management
  await requireRouteAccess('/dashboard/identity');
  
  return <IdentityClient />;
}
