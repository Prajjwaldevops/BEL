import { requireRouteAccess } from '@/lib/auth';
import TransactionsClient from './TransactionsClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  // All authenticated roles can view transactions
  await requireRouteAccess('/dashboard/transactions');
  
  return <TransactionsClient />;
}
