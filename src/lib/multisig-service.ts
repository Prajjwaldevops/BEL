/**
 * Multi-Signature Approval Service
 * Handles approval workflows for high-impact actions
 */

import { createClient } from '@/lib/supabase/server';

export type ApprovalActionType =
  | 'ROLE_ESCALATION'
  | 'HIGH_VALUE_TRANSFER'
  | 'NFT_BURN'
  | 'CONTRACT_PAUSE'
  | 'GUARDIAN_OVERRIDE'
  | 'BULK_OPERATION'
  | 'SYSTEM_CONFIG_CHANGE'
  | 'ACCOUNT_UNLOCK'
  | 'DATA_EXPORT'
  | 'EMERGENCY_ACTION';

export type ApprovalVoteType = 'APPROVE' | 'REJECT' | 'ABSTAIN';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'EXECUTED'
  | 'CANCELED'
  | 'FAILED';

export interface PendingApproval {
  id: string;
  actionType: ApprovalActionType;
  actionDescription: string;
  payload: any;
  requestedBy: string;
  requiredApprovals: number;
  approvalCount: number;
  rejectionCount: number;
  abstainCount: number;
  status: ApprovalStatus;
  expiresAt: string;
  executedAt?: string;
  executedBy?: string;
  executionResult?: any;
  executionError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalVote {
  id: string;
  pendingApprovalId: string;
  approverId: string;
  vote: ApprovalVoteType;
  reason?: string;
  signature?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface MultisigConfig {
  id: string;
  actionType: ApprovalActionType;
  requiredApprovals: number;
  approvalThresholdPercentage?: number;
  useThreshold: boolean;
  expiryHours: number;
  autoExecute: boolean;
  requiresUnanimous: boolean;
  allowedApproverRoles: string[];
  isActive: boolean;
}

/**
 * Check if an action requires multi-sig approval
 */
export async function requiresMultisigApproval(params: {
  actionType: ApprovalActionType;
  payload?: any;
}): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('requires_multisig_approval', {
    p_action_type: params.actionType,
    p_payload: params.payload || {},
  });

  if (error) {
    console.error('Error checking if multi-sig required:', error);
    // Fail safe - require approval on error
    return true;
  }

  return data;
}

/**
 * Get required approval count for an action type
 */
export async function getRequiredApprovals(
  actionType: ApprovalActionType
): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_required_approvals', {
    p_action_type: actionType,
  });

  if (error) {
    console.error('Error getting required approvals:', error);
    return 2; // Default fallback
  }

  return data;
}

/**
 * Create a new approval request
 */
export async function requestApproval(params: {
  actionType: ApprovalActionType;
  actionDescription: string;
  payload: any;
  requestedBy: string;
}): Promise<{
  success: boolean;
  approvalId?: string;
  requiredApprovals?: number;
  error?: string;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('create_approval_request', {
      p_action_type: params.actionType,
      p_action_description: params.actionDescription,
      p_payload: params.payload,
      p_requested_by: params.requestedBy,
    });

    if (error) {
      console.error('Error creating approval request:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const approvalId = data;
    const requiredApprovals = await getRequiredApprovals(params.actionType);

    return {
      success: true,
      approvalId,
      requiredApprovals,
    };
  } catch (error: any) {
    console.error('Error requesting approval:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cast a vote on an approval request
 */
export async function voteOnApproval(params: {
  approvalId: string;
  approverId: string;
  vote: ApprovalVoteType;
  reason?: string;
  signature?: string;
  ipAddress?: string;
}): Promise<{
  success: boolean;
  newApprovalCount?: number;
  newRejectionCount?: number;
  status?: ApprovalStatus;
  autoExecuted?: boolean;
  error?: string;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('cast_approval_vote', {
      p_approval_id: params.approvalId,
      p_approver_id: params.approverId,
      p_vote: params.vote,
      p_reason: params.reason || null,
      p_signature: params.signature || null,
      p_ip_address: params.ipAddress || null,
    });

    if (error) {
      console.error('Error casting vote:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const result = data[0];

    return {
      success: result.success,
      newApprovalCount: result.new_approval_count,
      newRejectionCount: result.new_rejection_count,
      status: result.status,
      autoExecuted: result.auto_executed,
    };
  } catch (error: any) {
    console.error('Error voting on approval:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get pending approval by ID
 */
export async function getApprovalById(
  approvalId: string
): Promise<PendingApproval | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('pending_approvals')
    .select('*')
    .eq('id', approvalId)
    .single();

  if (error) {
    console.error('Error fetching approval:', error);
    return null;
  }

  return mapApprovalFromDb(data);
}

/**
 * List pending approvals with filters
 */
export async function listApprovals(params?: {
  status?: ApprovalStatus;
  actionType?: ApprovalActionType;
  requestedBy?: string;
  limit?: number;
}): Promise<PendingApproval[]> {
  const supabase = createClient();

  let query = supabase
    .from('pending_approvals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params?.limit || 50);

  if (params?.status) {
    query = query.eq('status', params.status);
  }
  if (params?.actionType) {
    query = query.eq('action_type', params.actionType);
  }
  if (params?.requestedBy) {
    query = query.eq('requested_by', params.requestedBy);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listing approvals:', error);
    return [];
  }

  return (data || []).map(mapApprovalFromDb);
}

/**
 * Get votes for an approval
 */
export async function getApprovalVotes(
  approvalId: string
): Promise<ApprovalVote[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('approval_votes')
    .select(`
      *,
      approver:profiles!approver_id(id, full_name, email, role)
    `)
    .eq('pending_approval_id', approvalId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching votes:', error);
    return [];
  }

  return (data || []).map((vote) => ({
    id: vote.id,
    pendingApprovalId: vote.pending_approval_id,
    approverId: vote.approver_id,
    vote: vote.vote,
    reason: vote.reason,
    signature: vote.signature,
    ipAddress: vote.ip_address,
    createdAt: vote.created_at,
    approver: vote.approver,
  }));
}

/**
 * Execute an approved action
 */
export async function executeApproval(
  approvalId: string,
  executedBy: string
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  const supabase = createClient();

  try {
    // Get approval details
    const approval = await getApprovalById(approvalId);

    if (!approval) {
      return {
        success: false,
        error: 'Approval not found',
      };
    }

    if (approval.status !== 'APPROVED') {
      return {
        success: false,
        error: `Cannot execute approval with status: ${approval.status}`,
      };
    }

    // Execute based on action type
    let result: any;
    let executionError: string | undefined;

    try {
      switch (approval.actionType) {
        case 'ROLE_ESCALATION':
          result = await executeRoleEscalation(approval.payload);
          break;
        case 'HIGH_VALUE_TRANSFER':
          result = await executeHighValueTransfer(approval.payload);
          break;
        case 'NFT_BURN':
          result = await executeNFTBurn(approval.payload);
          break;
        case 'CONTRACT_PAUSE':
          result = await executeContractPause(approval.payload);
          break;
        case 'ACCOUNT_UNLOCK':
          result = await executeAccountUnlock(approval.payload);
          break;
        case 'SYSTEM_CONFIG_CHANGE':
          result = await executeSystemConfigChange(approval.payload);
          break;
        default:
          throw new Error(`Unknown action type: ${approval.actionType}`);
      }
    } catch (error: any) {
      executionError = error.message;
      throw error;
    }

    // Update approval status
    const { error: updateError } = await supabase
      .from('pending_approvals')
      .update({
        status: executionError ? 'FAILED' : 'EXECUTED',
        executed_at: new Date().toISOString(),
        executed_by: executedBy,
        execution_result: result,
        execution_error: executionError,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approvalId);

    if (updateError) {
      console.error('Error updating approval status:', updateError);
    }

    // Record execution
    await supabase.from('approval_executions').insert({
      pending_approval_id: approvalId,
      executed_by: executedBy,
      execution_status: executionError ? 'FAILED' : 'SUCCESS',
      execution_result: result,
      execution_error: executionError,
    });

    return {
      success: !executionError,
      result,
      error: executionError,
    };
  } catch (error: any) {
    console.error('Error executing approval:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cancel an approval request
 */
export async function cancelApproval(
  approvalId: string,
  canceledBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('pending_approvals')
    .update({
      status: 'CANCELED',
      canceled_at: new Date().toISOString(),
      canceled_by: canceledBy,
      cancel_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('status', 'PENDING'); // Can only cancel pending approvals

  if (error) {
    console.error('Error canceling approval:', error);
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

/**
 * Get multi-sig configuration
 */
export async function getMultisigConfig(
  actionType?: ApprovalActionType
): Promise<MultisigConfig[]> {
  const supabase = createClient();

  let query = supabase
    .from('multisig_config')
    .select('*')
    .eq('is_active', true);

  if (actionType) {
    query = query.eq('action_type', actionType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching multisig config:', error);
    return [];
  }

  return (data || []).map((config) => ({
    id: config.id,
    actionType: config.action_type,
    requiredApprovals: config.required_approvals,
    approvalThresholdPercentage: config.approval_threshold_percentage,
    useThreshold: config.use_threshold,
    expiryHours: config.expiry_hours,
    autoExecute: config.auto_execute,
    requiresUnanimous: config.requires_unanimous,
    allowedApproverRoles: config.allowed_approver_roles,
    isActive: config.is_active,
  }));
}

// ============================================================================
// ACTION EXECUTORS
// ============================================================================

async function executeRoleEscalation(payload: any): Promise<any> {
  const supabase = createClient();
  
  const { userId, role } = payload;
  
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);
  
  if (error) throw error;
  
  return { userId, role, executedAt: new Date().toISOString() };
}

async function executeHighValueTransfer(payload: any): Promise<any> {
  // Implementation would interact with blockchain
  // For now, just log the intent
  console.log('Executing high value transfer:', payload);
  return { ...payload, executedAt: new Date().toISOString() };
}

async function executeNFTBurn(payload: any): Promise<any> {
  // Implementation would call smart contract
  console.log('Executing NFT burn:', payload);
  return { ...payload, executedAt: new Date().toISOString() };
}

async function executeContractPause(payload: any): Promise<any> {
  // Implementation would call smart contract pause function
  console.log('Executing contract pause:', payload);
  return { ...payload, executedAt: new Date().toISOString() };
}

async function executeAccountUnlock(payload: any): Promise<any> {
  const supabase = createClient();
  
  const { username } = payload;
  
  // Clear login attempt lockouts
  const { error } = await supabase
    .from('login_attempts')
    .update({ lockout_until: null })
    .eq('username', username);
  
  if (error) throw error;
  
  return { username, executedAt: new Date().toISOString() };
}

async function executeSystemConfigChange(payload: any): Promise<any> {
  const supabase = createClient();
  
  const { key, value } = payload;
  
  const { error } = await supabase
    .from('system_settings')
    .update({ value })
    .eq('key', key);
  
  if (error) throw error;
  
  return { key, value, executedAt: new Date().toISOString() };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapApprovalFromDb(data: any): PendingApproval {
  return {
    id: data.id,
    actionType: data.action_type,
    actionDescription: data.action_description,
    payload: data.payload,
    requestedBy: data.requested_by,
    requiredApprovals: data.required_approvals,
    approvalCount: data.approval_count,
    rejectionCount: data.rejection_count,
    abstainCount: data.abstain_count,
    status: data.status,
    expiresAt: data.expires_at,
    executedAt: data.executed_at,
    executedBy: data.executed_by,
    executionResult: data.execution_result,
    executionError: data.execution_error,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
