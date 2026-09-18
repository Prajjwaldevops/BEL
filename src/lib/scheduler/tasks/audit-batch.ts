/**
 * Audit Batch Processing Task
 * Processes audit logs in batches for analytics and alerting
 */

import { createServiceClient } from '@/lib/supabase/service';

export async function processAuditBatch() {
  const supabase = createServiceClient();

  // Get unprocessed audit logs (last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[AuditBatch] Failed to fetch logs:', error);
    throw error;
  }

  if (!logs || logs.length === 0) {
    console.log('[AuditBatch] No logs to process');
    return;
  }

  console.log(`[AuditBatch] Processing ${logs.length} audit logs`);

  // Analyze for suspicious patterns
  const suspiciousEvents = logs.filter(log => {
    // Check for failed login attempts
    if (log.action === 'user.login' && log.status === 'failure') {
      return true;
    }
    
    // Check for multiple rapid actions from same user
    const userLogs = logs.filter(l => l.user_id === log.user_id);
    if (userLogs.length > 20) {
      return true;
    }

    return false;
  });

  // Create security alerts for suspicious activity
  if (suspiciousEvents.length > 0) {
    const alerts = suspiciousEvents.map(log => ({
      type: 'suspicious_activity',
      severity: 'medium',
      title: `Suspicious ${log.action} detected`,
      description: `Multiple ${log.action} events detected from user ${log.user_id}`,
      metadata: { audit_log_id: log.id },
      status: 'active',
      created_at: new Date().toISOString()
    }));

    const { error: alertError } = await supabase
      .from('security_alerts')
      .insert(alerts);

    if (alertError) {
      console.error('[AuditBatch] Failed to create alerts:', alertError);
    } else {
      console.log(`[AuditBatch] Created ${alerts.length} security alerts`);
    }
  }

  // Update analytics metrics
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('[AuditBatch] Action summary:', actionCounts);

  return {
    processed: logs.length,
    alerts: suspiciousEvents.length,
    actionCounts
  };
}
