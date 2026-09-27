import { requireRouteAccess } from '@/lib/auth';
import UsersClient from './UsersClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  // Require ADMIN role for user management
  await requireRouteAccess('/dashboard/users');
  
  return <UsersClient />;
}
