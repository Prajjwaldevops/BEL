import { requireRouteAccess } from '@/lib/auth';
import LifecycleClient from './LifecycleClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function LifecyclePage() {
  // All authenticated roles can view asset lifecycle
  await requireRouteAccess('/dashboard/lifecycle');
  
  return <LifecycleClient />;
}
