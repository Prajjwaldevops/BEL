import { requireRouteAccess } from '@/lib/auth';
import IpfsClient from './IpfsClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function IpfsPage() {
  // Require ADMIN, ALTER, or DEBUGGER role for IPFS document storage
  await requireRouteAccess('/dashboard/ipfs');
  
  return <IpfsClient />;
}
