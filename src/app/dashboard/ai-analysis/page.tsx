import { requireRouteAccess } from '@/lib/auth';
import AiAnalysisClient from './AiAnalysisClient';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function AiAnalysisPage() {
  // Require ADMIN or DEBUGGER role for AI security analysis
  await requireRouteAccess('/dashboard/ai-analysis');
  
  return <AiAnalysisClient />;
}
