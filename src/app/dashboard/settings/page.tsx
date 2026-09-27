import { requireRouteAccess } from '@/lib/auth';
import SettingsClient from './SettingsClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  // Require ADMIN role for system settings
  await requireRouteAccess('/dashboard/settings');
  
  return <SettingsClient />;
}
