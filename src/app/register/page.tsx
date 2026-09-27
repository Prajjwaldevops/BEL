import { requireRoles } from '@/lib/auth';
import RegisterClient from './RegisterClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  // CRITICAL: Only ADMIN users can access registration page
  // This is where new user accounts are created with invite tokens
  await requireRoles(['ADMIN']);
  
  return <RegisterClient />;
}
