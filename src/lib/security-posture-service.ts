/**
 * Security Posture Service
 * Provides security metrics, risk management, compliance tracking, and threat monitoring
 */

import { createClient } from '@/lib/supabase/server';

export interface SecurityPostureMetrics {
  metric_date: string;
  security_score: number;
  previous_score?: number;
  score_trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  critical_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  open_incidents: number;
  critical_incidents: number;
  total_users: number;
  active_users_24h: number;
  admin_users: number;
  locked_accounts: number;
  failed_login_attempts_24h: number;
  successful_logins_24h: number;
  pending_approvals: number;
  compliance_score: number;
  suspicious_activities_24h: number;
}

export interface SecurityRisk {
  id: string;
  risk_id: string;
  risk_type: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  likelihood: string;
  impact: string;
  status: string;
  mitigation_plan?: string;
  mitigation_deadline?: string;
  first_detected: string;
  last_detected: string;
}

export interface ComplianceRequirement {
  id: string;
  framework: string;
  requirement_id: string;
  requirement_name: string;
  requirement_description: string;
  category: string;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NOT_APPLICABLE' | 'NOT_ASSESSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  last_assessed?: string;
  next_assessment_due?: string;
  remediation_required: boolean;
}

export interface SecurityControl {
  id: string;
  control_id: string;
  control_name: string;
  control_type: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE' | 'DETERRENT';
  description: string;
  category: string;
  status: string;
  effectiveness_rating?: string;
  is_automated: boolean;
  last_tested?: string;
  next_review_due?: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  alert_source: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  status: string;
  affected_user?: string;
  created_at: string;
}

export interface SecurityAssessment {
  id: string;
  assessment_type: string;
  assessment_name: string;
  assessment_scope: string;
  status: string;
  overall_score?: number;
  findings_critical: number;
  findings_high: number;
  findings_medium: number;
  findings_low: number;
  completed_at?: string;
}

/**
 * Get latest security posture metrics
 */
export async function getLatestPostureMetrics(): Promise<SecurityPostureMetrics | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('security_posture_metrics')
    .select('*')
    .order('metric_date', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching posture metrics:', error);
    return null;
  }
  
  return data;
}

/**
 * Get security posture trend over time
 */
export async function getPostureTrend(days: number = 30): Promise<SecurityPostureMetrics[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('security_posture_metrics')
    .select('*')
    .gte('metric_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('metric_date', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to get posture trend: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Update security posture metrics
 */
export async function updatePostureMetrics(): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('update_security_posture_metrics');
  
  if (error) {
    throw new Error(`Failed to update posture metrics: ${error.message}`);
  }
  
  return data;
}

/**
 * Get active security risks
 */
export async function getSecurityRisks(params?: {
  severity?: string;
  status?: string;
  limit?: number;
}): Promise<SecurityRisk[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('security_risks')
    .select('*')
    .order('risk_score', { ascending: false });
  
  if (params?.severity) {
    query = query.eq('severity', params.severity);
  }
  
  if (params?.status) {
    query = query.eq('status', params.status);
  } else {
    query = query.not('status', 'in', '(MITIGATED,CLOSED)');
  }
  
  if (params?.limit) {
    query = query.limit(params.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get security risks: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Create security risk
 */
export async function createSecurityRisk(params: {
  riskId: string;
  riskType: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  likelihood: string;
  impact: string;
  mitigationPlan?: string;
  mitigationDeadline?: string;
  mitigationOwner?: string;
}): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('security_risks')
    .insert({
      risk_id: params.riskId,
      risk_type: params.riskType,
      title: params.title,
      description: params.description,
      severity: params.severity,
      risk_score: params.riskScore,
      likelihood: params.likelihood,
      impact: params.impact,
      mitigation_plan: params.mitigationPlan,
      mitigation_deadline: params.mitigationDeadline,
      mitigation_owner: params.mitigationOwner,
      status: 'IDENTIFIED',
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create security risk: ${error.message}`);
  }
  
  return data.id;
}

/**
 * Update security risk status
 */
export async function updateRiskStatus(
  riskId: string,
  status: string,
  resolutionNotes?: string
): Promise<void> {
  const supabase = await createClient();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'MITIGATED' || status === 'CLOSED') {
    updateData.resolved_at = new Date().toISOString();
    updateData.resolution_notes = resolutionNotes;
  }
  
  const { error } = await supabase
    .from('security_risks')
    .update(updateData)
    .eq('id', riskId);
  
  if (error) {
    throw new Error(`Failed to update risk status: ${error.message}`);
  }
}

/**
 * Get compliance requirements
 */
export async function getComplianceRequirements(params?: {
  framework?: string;
  status?: string;
}): Promise<ComplianceRequirement[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('compliance_requirements')
    .select('*')
    .order('priority', { ascending: false })
    .order('framework', { ascending: true });
  
  if (params?.framework) {
    query = query.eq('framework', params.framework);
  }
  
  if (params?.status) {
    query = query.eq('compliance_status', params.status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get compliance requirements: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Update compliance status
 */
export async function updateComplianceStatus(
  requirementId: string,
  status: string,
  evidence?: string,
  assessedBy?: string
): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('compliance_requirements')
    .update({
      compliance_status: status,
      evidence_description: evidence,
      last_assessed: new Date().toISOString(),
      assessed_by: assessedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementId);
  
  if (error) {
    throw new Error(`Failed to update compliance status: ${error.message}`);
  }
}

/**
 * Get security controls
 */
export async function getSecurityControls(params?: {
  category?: string;
  status?: string;
}): Promise<SecurityControl[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('security_controls')
    .select('*')
    .order('control_id', { ascending: true });
  
  if (params?.category) {
    query = query.eq('category', params.category);
  }
  
  if (params?.status) {
    query = query.eq('status', params.status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get security controls: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get security alerts
 */
export async function getSecurityAlerts(params?: {
  severity?: string;
  status?: string;
  limit?: number;
}): Promise<SecurityAlert[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('security_alerts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (params?.severity) {
    query = query.eq('severity', params.severity);
  }
  
  if (params?.status) {
    query = query.eq('status', params.status);
  }
  
  if (params?.limit) {
    query = query.limit(params.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get security alerts: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Create security alert
 */
export async function createSecurityAlert(params: {
  alertType: string;
  alertSource: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedUser?: string;
  confidence?: number;
}): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('create_security_alert', {
    p_alert_type: params.alertType,
    p_alert_source: params.alertSource,
    p_title: params.title,
    p_description: params.description,
    p_severity: params.severity,
    p_affected_user: params.affectedUser || null,
    p_confidence: params.confidence || 95.0,
  });
  
  if (error) {
    throw new Error(`Failed to create security alert: ${error.message}`);
  }
  
  return data;
}

/**
 * Update alert status
 */
export async function updateAlertStatus(
  alertId: string,
  status: string,
  resolution?: string,
  investigatedBy?: string
): Promise<void> {
  const supabase = await createClient();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'RESOLVED' || status === 'FALSE_POSITIVE') {
    updateData.resolution = resolution;
    updateData.investigated_by = investigatedBy;
    updateData.investigated_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('security_alerts')
    .update(updateData)
    .eq('id', alertId);
  
  if (error) {
    throw new Error(`Failed to update alert status: ${error.message}`);
  }
}

/**
 * Get security assessments
 */
export async function getSecurityAssessments(params?: {
  type?: string;
  status?: string;
  limit?: number;
}): Promise<SecurityAssessment[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('security_assessments')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (params?.type) {
    query = query.eq('assessment_type', params.type);
  }
  
  if (params?.status) {
    query = query.eq('status', params.status);
  }
  
  if (params?.limit) {
    query = query.limit(params.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get security assessments: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get compliance score by framework
 */
export async function getComplianceScore(framework: string): Promise<{
  total: number;
  compliant: number;
  nonCompliant: number;
  partiallyCompliant: number;
  notAssessed: number;
  percentage: number;
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('compliance_requirements')
    .select('compliance_status')
    .eq('framework', framework)
    .neq('compliance_status', 'NOT_APPLICABLE');
  
  if (error) {
    throw new Error(`Failed to get compliance score: ${error.message}`);
  }
  
  const total = data.length;
  const compliant = data.filter((r) => r.compliance_status === 'COMPLIANT').length;
  const nonCompliant = data.filter((r) => r.compliance_status === 'NON_COMPLIANT').length;
  const partiallyCompliant = data.filter((r) => r.compliance_status === 'PARTIALLY_COMPLIANT').length;
  const notAssessed = data.filter((r) => r.compliance_status === 'NOT_ASSESSED').length;
  
  const percentage = total > 0 ? (compliant / total) * 100 : 0;
  
  return {
    total,
    compliant,
    nonCompliant,
    partiallyCompliant,
    notAssessed,
    percentage,
  };
}

/**
 * Get risk summary by severity
 */
export async function getRiskSummary(): Promise<{
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('security_risks')
    .select('severity')
    .not('status', 'in', '(MITIGATED,CLOSED)');
  
  if (error) {
    throw new Error(`Failed to get risk summary: ${error.message}`);
  }
  
  const critical = data.filter((r) => r.severity === 'CRITICAL').length;
  const high = data.filter((r) => r.severity === 'HIGH').length;
  const medium = data.filter((r) => r.severity === 'MEDIUM').length;
  const low = data.filter((r) => r.severity === 'LOW').length;
  
  return {
    critical,
    high,
    medium,
    low,
    total: data.length,
  };
}
