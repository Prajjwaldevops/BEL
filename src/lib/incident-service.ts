/**
 * Incident Response Service
 * Handles security incident management and automated response
 */

import { createClient } from '@/lib/supabase/server';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 
  | 'OPEN' 
  | 'INVESTIGATING' 
  | 'CONTAINED' 
  | 'RESOLVED' 
  | 'CLOSED' 
  | 'FALSE_POSITIVE';

export type ResponseActionType =
  | 'SUSPEND_ACCOUNT'
  | 'REVOKE_PERMISSIONS'
  | 'LOCK_ASSET'
  | 'PAUSE_CONTRACT'
  | 'NOTIFY_ADMINS'
  | 'CREATE_APPROVAL'
  | 'ENABLE_MFA'
  | 'FORCE_PASSWORD_RESET'
  | 'QUARANTINE_DATA'
  | 'BLOCK_IP';

export interface SecurityIncident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category?: string;
  affectedEntityType?: string;
  affectedEntityId?: string;
  reporterId?: string;
  assignedTo?: string;
  rootCause?: string;
  resolution?: string;
  detectedAt: string;
  respondedAt?: string;
  containedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentEvent {
  id: string;
  incidentId: string;
  securityEventId?: string;
  eventType: string;
  description: string;
  actor?: string;
  metadata: any;
  createdAt: string;
}

export interface IncidentResponse {
  id: string;
  incidentId: string;
  actionType: ResponseActionType;
  actionDescription: string;
  targetEntityType?: string;
  targetEntityId?: string;
  automated: boolean;
  executedBy?: string;
  executionStatus: string;
  executionResult?: any;
  executionError?: string;
  createdAt: string;
}

export interface IncidentNote {
  id: string;
  incidentId: string;
  authorId: string;
  noteType: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface IncidentPlaybook {
  id: string;
  name: string;
  description?: string;
  severityTrigger: IncidentSeverity;
  categoryTrigger?: string;
  automatedActions: ResponseActionType[];
  requiresApproval: boolean;
  approvalActionType?: string;
  isActive: boolean;
}

/**
 * Create incident from security event
 */
export async function createIncidentFromEvent(params: {
  securityEventId: string;
  title: string;
  description: string;
  category?: string;
}): Promise<{ success: boolean; incidentId?: string; error?: string }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('create_incident_from_event', {
      p_security_event_id: params.securityEventId,
      p_title: params.title,
      p_description: params.description,
      p_category: params.category || null,
    });

    if (error) {
      console.error('Error creating incident:', error);
      return { success: false, error: error.message };
    }

    return { success: true, incidentId: data };
  } catch (error: any) {
    console.error('Error creating incident:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create incident manually
 */
export async function createIncident(params: {
  title: string;
  description: string;
  severity: IncidentSeverity;
  category?: string;
  affectedEntityType?: string;
  affectedEntityId?: string;
  reporterId?: string;
}): Promise<{ success: boolean; incidentId?: string; error?: string }> {
  const supabase = createClient();

  try {
    // Generate incident number
    const { data: incidentNumber } = await supabase.rpc('generate_incident_number');

    const { data, error } = await supabase
      .from('security_incidents')
      .insert({
        incident_number: incidentNumber,
        title: params.title,
        description: params.description,
        severity: params.severity,
        category: params.category,
        affected_entity_type: params.affectedEntityType,
        affected_entity_id: params.affectedEntityId,
        reporter_id: params.reporterId,
        detected_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating incident:', error);
      return { success: false, error: error.message };
    }

    return { success: true, incidentId: data.id };
  } catch (error: any) {
    console.error('Error creating incident:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get incident by ID
 */
export async function getIncidentById(
  incidentId: string
): Promise<SecurityIncident | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('security_incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  if (error) {
    console.error('Error fetching incident:', error);
    return null;
  }

  return mapIncidentFromDb(data);
}

/**
 * List incidents with filters
 */
export async function listIncidents(params?: {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  assignedTo?: string;
  limit?: number;
}): Promise<SecurityIncident[]> {
  const supabase = createClient();

  let query = supabase
    .from('security_incidents')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(params?.limit || 50);

  if (params?.status) {
    query = query.eq('status', params.status);
  }
  if (params?.severity) {
    query = query.eq('severity', params.severity);
  }
  if (params?.assignedTo) {
    query = query.eq('assigned_to', params.assignedTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listing incidents:', error);
    return [];
  }

  return (data || []).map(mapIncidentFromDb);
}

/**
 * Update incident status
 */
export async function updateIncidentStatus(params: {
  incidentId: string;
  newStatus: IncidentStatus;
  updatedBy: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.rpc('update_incident_status', {
      p_incident_id: params.incidentId,
      p_new_status: params.newStatus,
      p_updated_by: params.updatedBy,
      p_note: params.note || null,
    });

    if (error) {
      console.error('Error updating incident status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating incident status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign incident to admin
 */
export async function assignIncident(
  incidentId: string,
  assignedTo: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('security_incidents')
    .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
    .eq('id', incidentId);

  if (error) {
    console.error('Error assigning incident:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get incident timeline (events)
 */
export async function getIncidentTimeline(
  incidentId: string
): Promise<IncidentEvent[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('incident_events')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching incident timeline:', error);
    return [];
  }

  return (data || []).map((event) => ({
    id: event.id,
    incidentId: event.incident_id,
    securityEventId: event.security_event_id,
    eventType: event.event_type,
    description: event.description,
    actor: event.actor,
    metadata: event.metadata,
    createdAt: event.created_at,
  }));
}

/**
 * Get incident responses
 */
export async function getIncidentResponses(
  incidentId: string
): Promise<IncidentResponse[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('incident_responses')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching incident responses:', error);
    return [];
  }

  return (data || []).map((response) => ({
    id: response.id,
    incidentId: response.incident_id,
    actionType: response.action_type,
    actionDescription: response.action_description,
    targetEntityType: response.target_entity_type,
    targetEntityId: response.target_entity_id,
    automated: response.automated,
    executedBy: response.executed_by,
    executionStatus: response.execution_status,
    executionResult: response.execution_result,
    executionError: response.execution_error,
    createdAt: response.created_at,
  }));
}

/**
 * Get incident notes
 */
export async function getIncidentNotes(
  incidentId: string,
  includeInternal: boolean = true
): Promise<IncidentNote[]> {
  const supabase = createClient();

  let query = supabase
    .from('incident_notes')
    .select(`
      *,
      author:profiles!author_id(id, full_name, email)
    `)
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  if (!includeInternal) {
    query = query.eq('is_internal', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching incident notes:', error);
    return [];
  }

  return (data || []).map((note) => ({
    id: note.id,
    incidentId: note.incident_id,
    authorId: note.author_id,
    noteType: note.note_type,
    content: note.content,
    isInternal: note.is_internal,
    createdAt: note.created_at,
    author: note.author,
  }));
}

/**
 * Add note to incident
 */
export async function addIncidentNote(params: {
  incidentId: string;
  authorId: string;
  noteType: string;
  content: string;
  isInternal?: boolean;
}): Promise<{ success: boolean; noteId?: string; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('incident_notes')
    .insert({
      incident_id: params.incidentId,
      author_id: params.authorId,
      note_type: params.noteType,
      content: params.content,
      is_internal: params.isInternal || false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding incident note:', error);
    return { success: false, error: error.message };
  }

  return { success: true, noteId: data.id };
}

/**
 * Execute response action
 */
export async function executeResponseAction(params: {
  incidentId: string;
  actionType: ResponseActionType;
  targetEntityType?: string;
  targetEntityId?: string;
  executedBy?: string;
}): Promise<{ success: boolean; responseId?: string; error?: string }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('execute_incident_response', {
      p_incident_id: params.incidentId,
      p_action_type: params.actionType,
      p_target_entity_type: params.targetEntityType || null,
      p_target_entity_id: params.targetEntityId || null,
      p_executed_by: params.executedBy || null,
    });

    if (error) {
      console.error('Error executing response action:', error);
      return { success: false, error: error.message };
    }

    return { success: true, responseId: data };
  } catch (error: any) {
    console.error('Error executing response action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get playbooks
 */
export async function getPlaybooks(params?: {
  isActive?: boolean;
  severityTrigger?: IncidentSeverity;
}): Promise<IncidentPlaybook[]> {
  const supabase = createClient();

  let query = supabase.from('incident_playbooks').select('*');

  if (params?.isActive !== undefined) {
    query = query.eq('is_active', params.isActive);
  }
  if (params?.severityTrigger) {
    query = query.eq('severity_trigger', params.severityTrigger);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching playbooks:', error);
    return [];
  }

  return (data || []).map((playbook) => ({
    id: playbook.id,
    name: playbook.name,
    description: playbook.description,
    severityTrigger: playbook.severity_trigger,
    categoryTrigger: playbook.category_trigger,
    automatedActions: playbook.automated_actions,
    requiresApproval: playbook.requires_approval,
    approvalActionType: playbook.approval_action_type,
    isActive: playbook.is_active,
  }));
}

/**
 * Get incident statistics
 */
export async function getIncidentStatistics(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  total: number;
  byStatus: Record<IncidentStatus, number>;
  bySeverity: Record<IncidentSeverity, number>;
  avgResponseTime: number; // hours
  avgResolutionTime: number; // hours
}> {
  const supabase = createClient();

  let query = supabase.from('security_incidents').select('*');

  if (params?.startDate) {
    query = query.gte('detected_at', params.startDate);
  }
  if (params?.endDate) {
    query = query.lte('detected_at', params.endDate);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching statistics:', error);
    return {
      total: 0,
      byStatus: {} as any,
      bySeverity: {} as any,
      avgResponseTime: 0,
      avgResolutionTime: 0,
    };
  }

  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let totalResponseTime = 0;
  let totalResolutionTime = 0;
  let respondedCount = 0;
  let resolvedCount = 0;

  data.forEach((incident) => {
    // Count by status
    byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;

    // Count by severity
    bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;

    // Calculate response time
    if (incident.responded_at) {
      const detected = new Date(incident.detected_at).getTime();
      const responded = new Date(incident.responded_at).getTime();
      totalResponseTime += (responded - detected) / 3600000; // Convert to hours
      respondedCount++;
    }

    // Calculate resolution time
    if (incident.resolved_at) {
      const detected = new Date(incident.detected_at).getTime();
      const resolved = new Date(incident.resolved_at).getTime();
      totalResolutionTime += (resolved - detected) / 3600000;
      resolvedCount++;
    }
  });

  return {
    total: data.length,
    byStatus: byStatus as any,
    bySeverity: bySeverity as any,
    avgResponseTime: respondedCount > 0 ? totalResponseTime / respondedCount : 0,
    avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapIncidentFromDb(data: any): SecurityIncident {
  return {
    id: data.id,
    incidentNumber: data.incident_number,
    title: data.title,
    description: data.description,
    severity: data.severity,
    status: data.status,
    category: data.category,
    affectedEntityType: data.affected_entity_type,
    affectedEntityId: data.affected_entity_id,
    reporterId: data.reporter_id,
    assignedTo: data.assigned_to,
    rootCause: data.root_cause,
    resolution: data.resolution,
    detectedAt: data.detected_at,
    respondedAt: data.responded_at,
    containedAt: data.contained_at,
    resolvedAt: data.resolved_at,
    closedAt: data.closed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Format severity for display
 */
export function getSeverityColor(severity: IncidentSeverity): string {
  const colors = {
    LOW: 'text-gray-600',
    MEDIUM: 'text-yellow-600',
    HIGH: 'text-orange-600',
    CRITICAL: 'text-red-600',
  };
  return colors[severity];
}

/**
 * Format status for display
 */
export function getStatusColor(status: IncidentStatus): string {
  const colors = {
    OPEN: 'text-blue-600',
    INVESTIGATING: 'text-purple-600',
    CONTAINED: 'text-orange-600',
    RESOLVED: 'text-green-600',
    CLOSED: 'text-gray-600',
    FALSE_POSITIVE: 'text-gray-500',
  };
  return colors[status];
}
