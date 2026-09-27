import { requireRouteAccess } from '@/lib/auth';
import AssetsClient from './AssetsClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  // Require ADMIN, ALTER, or DEBUGGER role for asset management
  await requireRouteAccess('/dashboard/assets');
  
  return <AssetsClient />;
}
