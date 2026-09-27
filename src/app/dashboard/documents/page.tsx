import { requireRouteAccess } from '@/lib/auth';
import DocumentsClient from './DocumentsClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  // Require ADMIN, ALTER, or DEBUGGER role for document management
  await requireRouteAccess('/dashboard/documents');
  
  return <DocumentsClient />;
}
