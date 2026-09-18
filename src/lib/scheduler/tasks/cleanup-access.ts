/**
 * Cleanup Expired Access Task
 * Revokes time-bound access tokens that have expired
 */

import { createServiceClient } from '@/lib/supabase/service';

export async function cleanupExpiredAccess() {
  const supabase = createServiceClient();

  const now = new Date().toISOString();

  // Find expired active grants
  const { data: expiredGrants, error: fetchError } = await supabase
    .from('time_bound_access')
    .select('*')
    .eq('status', 'active')
    .lte('expires_at', now);

  if (fetchError) {
    console.error('[CleanupAccess] Failed to fetch expired grants:', fetchError);
    throw fetchError;
  }

  if (!expiredGrants || expiredGrants.length === 0) {
    console.log('[CleanupAccess] No expired grants to clean up');
    return { expired: 0 };
  }

  console.log(`[CleanupAccess] Found ${expiredGrants.length} expired grants`);

  // Update status to expired
  const { error: updateError } = await supabase
    .from('time_bound_access')
    .update({ 
      status: 'expired',
      updated_at: now 
    })
    .eq('status', 'active')
    .lte('expires_at', now);

  if (updateError) {
    console.error('[CleanupAccess] Failed to update expired grants:', updateError);
    throw updateError;
  }

  // Create audit logs for expired access
  const auditLogs = expiredGrants.map(grant => ({
    user_id: grant.user_id,
    action: 'access.expired',
    resource: grant.resource_type,
    status: 'success',
    ip_address: null,
    user_agent: null,
    metadata: {
      grant_id: grant.id,
      resource_id: grant.resource_id,
      expired_at: grant.expires_at
    }
  }));

  const { error: auditError } = await supabase
    .from('audit_logs')
    .insert(auditLogs);

  if (auditError) {
    console.error('[CleanupAccess] Failed to create audit logs:', auditError);
  }

  console.log(`[CleanupAccess] Cleaned up ${expiredGrants.length} expired grants`);

  return {
    expired: expiredGrants.length,
    grants: expiredGrants.map(g => g.id)
  };
}
