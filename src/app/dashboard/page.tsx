import { requireRouteAccess } from '@/lib/auth';
import DashboardClient from './DashboardClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Require authentication for dashboard access (all roles allowed)
  await requireRouteAccess('/dashboard');
  
  return <DashboardClient />;
}
