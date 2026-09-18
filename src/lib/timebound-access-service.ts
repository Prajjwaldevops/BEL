/**
 * Time-Bound Access Service
 * Manages temporary access grants with auto-expiration
 */

import { createClient } from '@/lib/supabase/server';

export type GrantType = 'ROLE' | 'ASSET_PERMISSION';
export type ActionType = 'GRANTED' | 'EXTENDED' | 'REVOKED_EARLY' | 'AUTO_EXPIRED';

export interface AccessGrant {
  id: string;
  profileId: string;
  grantType: GrantType;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  isActive: boolean;
}

export interface AccessGrantHistory {
  id: string;
  grantType: GrantType;
  grantId: string;
  profileId: string;
  actionType: ActionType;
  performedBy?: string;
  reason?: string;
  originalExpiresAt?: string;
  newExpiresAt?: string;
  createdAt: string;
}

/**
 * Grant temporary role access
 */
export async function grantTemporaryRole(params: {
  profileId: string;
  roleName: string;
  expiresInHours: number;
  grantedBy: string;
  reason: string;
}): Promise<{ success: boolean; grantId?: string; error?: string }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('grant_temporary_role', {
      p_profile_id: params.profileId,
      p_role_name: params.roleName,
      p_expires_in_hours: params.expiresInHours,
      p_granted_by: params.grantedBy,
      p_reason: params.reason,
    });

    if (error) {
      console.error('Error granting temporary role:', error);
      return { success: false, error: error.message };
    }

    return { success: true, grantId: data };
  } catch (error: any) {
    console.error('Error granting temporary role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Grant temporary asset permission
 */
export async function grantTemporaryPermission(params: {
  assetId: string;
  profileId: string;
  permissionType: string;
  expiresInHours: number;
  grantedBy: string;
  reason: string;
}): Promise<{ success: boolean; grantId?: string; error?: string }> {
  const supabase = createClient();

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + params.expiresInHours);

    const { data, error } = await supabase
      .from('asset_permissions')
      .insert({
        asset_id: params.assetId,
        profile_id: params.profileId,
        permission_type: params.permissionType,
        granted_by: params.grantedBy,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error granting temporary permission:', error);
      return { success: false, error: error.message };
    }

    // Log grant
    await supabase.from('access_grant_history').insert({
      grant_type: 'ASSET_PERMISSION',
      grant_id: data.id,
      profile_id: params.profileId,
      action_type: 'GRANTED',
      performed_by: params.grantedBy,
      reason: params.reason,
      new_expires_at: expiresAt.toISOString(),
    });

    return { success: true, grantId: data.id };
  } catch (error: any) {
    console.error('Error granting temporary permission:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extend access grant expiration
 */
export async function extendAccessGrant(params: {
  grantType: GrantType;
  grantId: string;
  additionalHours: number;
  extendedBy: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.rpc('extend_access_grant', {
      p_grant_type: params.grantType,
      p_grant_id: params.grantId,
      p_additional_hours: params.additionalHours,
      p_extended_by: params.extendedBy,
      p_reason: params.reason,
    });

    if (error) {
      console.error('Error extending access grant:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error extending access grant:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Revoke access grant early
 */
export async function revokeAccessGrantEarly(params: {
  grantType: GrantType;
  grantId: string;
  revokedBy: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.rpc('revoke_access_grant_early', {
      p_grant_type: params.grantType,
      p_grant_id: params.grantId,
      p_revoked_by: params.revokedBy,
      p_reason: params.reason,
    });

    if (error) {
      console.error('Error revoking access grant:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error revoking access grant:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get active grants for a profile
 */
export async function getActiveGrants(
  profileId: string
): Promise<{
  roles: any[];
  permissions: any[];
}> {
  const supabase = createClient();

  // Get active roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true);

  // Get active permissions
  const { data: permissions } = await supabase
    .from('asset_permissions')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true);

  return {
    roles: roles || [],
    permissions: permissions || [],
  };
}

/**
 * Get expiring grants (within next N hours)
 */
export async function getExpiringGrants(
  hoursAhead: number = 24
): Promise<{
  roles: any[];
  permissions: any[];
}> {
  const supabase = createClient();
  const futureTime = new Date();
  futureTime.setHours(futureTime.getHours() + hoursAhead);

  // Get expiring roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select(`
      *,
      profile:profiles(id, full_name, email)
    `)
    .eq('is_active', true)
    .not('expires_at', 'is', null)
    .lte('expires_at', futureTime.toISOString())
    .gte('expires_at', new Date().toISOString());

  // Get expiring permissions
  const { data: permissions } = await supabase
    .from('asset_permissions')
    .select(`
      *,
      profile:profiles(id, full_name, email)
    `)
    .eq('is_active', true)
    .not('expires_at', 'is', null)
    .lte('expires_at', futureTime.toISOString())
    .gte('expires_at', new Date().toISOString());

  return {
    roles: roles || [],
    permissions: permissions || [],
  };
}

/**
 * Get grant history for a profile
 */
export async function getGrantHistory(params: {
  profileId?: string;
  grantType?: GrantType;
  limit?: number;
}): Promise<AccessGrantHistory[]> {
  const supabase = createClient();

  let query = supabase
    .from('access_grant_history')
    .select(`
      *,
      performer:profiles!performed_by(id, full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(params.limit || 50);

  if (params.profileId) {
    query = query.eq('profile_id', params.profileId);
  }
  if (params.grantType) {
    query = query.eq('grant_type', params.grantType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching grant history:', error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    grantType: item.grant_type,
    grantId: item.grant_id,
    profileId: item.profile_id,
    actionType: item.action_type,
    performedBy: item.performed_by,
    reason: item.reason,
    originalExpiresAt: item.original_expires_at,
    newExpiresAt: item.new_expires_at,
    createdAt: item.created_at,
    performer: item.performer,
  }));
}

/**
 * Trigger manual expiration check
 */
export async function checkExpiredAccess(): Promise<{
  success: boolean;
  expiredRoles: number;
  expiredPermissions: number;
  expiredDelegations: number;
  error?: string;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('revoke_expired_access');

    if (error) {
      console.error('Error checking expired access:', error);
      return {
        success: false,
        expiredRoles: 0,
        expiredPermissions: 0,
        expiredDelegations: 0,
        error: error.message,
      };
    }

    const result = data[0];

    return {
      success: true,
      expiredRoles: result.expired_roles || 0,
      expiredPermissions: result.expired_permissions || 0,
      expiredDelegations: result.expired_delegations || 0,
    };
  } catch (error: any) {
    console.error('Error checking expired access:', error);
    return {
      success: false,
      expiredRoles: 0,
      expiredPermissions: 0,
      expiredDelegations: 0,
      error: error.message,
    };
  }
}

/**
 * Calculate time remaining until expiration
 */
export function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Check if grant is expiring soon
 */
export function isExpiringSoon(expiresAt: string, thresholdHours: number = 24): boolean {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffHours = (expiry.getTime() - now.getTime()) / 3600000;

  return diffHours > 0 && diffHours <= thresholdHours;
}
