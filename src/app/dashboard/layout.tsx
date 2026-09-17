import DashboardShell from '@/components/dashboard/DashboardShell';

export const metadata = {
  title: 'Command Centre — BEL SENTINEL',
  description: 'Admin Command Centre for blockchain-based identity, access control, and digital asset management.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
