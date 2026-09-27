import DashboardShell from '@/components/dashboard/DashboardShell';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Command Centre — BEL SENTINEL',
  description: 'Admin Command Centre for blockchain-based identity, access control, and digital asset management.',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Require authentication for all dashboard routes
  await requireAuth();
  
  return <DashboardShell>{children}</DashboardShell>;
}
