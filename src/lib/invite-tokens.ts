/**
 * Invite Token Management
 * 
 * Secure, single-use, time-limited tokens for user registration.
 * Replaces the static registration_secret_key with a proper invitation system.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface InviteToken {
  id: string
  token: string
  issued_by: string
  role_id?: string
  intended_email?: string
  intended_department?: string
  expires_at: string
  used_at?: string
  used_by?: string
  is_active: boolean
  metadata: Record<string, any>
  created_at: string
}

export interface CreateInviteTokenParams {
  issuedBy: string
  roleId?: string
  intendedEmail?: string
  intendedDepartment?: string
  expiresInHours?: number
  metadata?: Record<string, any>
}

export interface ValidateTokenResult {
  valid: boolean
  token?: InviteToken
  error?: string
  reason?: string
}

/**
 * Generate a secure random token (server-side only)
 */
function generateSecureToken(): string {
  // Use Web Crypto API for secure randomness
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a new invite token
 * 
 * @param params Token creation parameters
 * @returns Created token or error
 */
export async function createInviteToken(
  params: CreateInviteTokenParams
): Promise<{ token?: InviteToken; error?: string }> {
  try {
    // Validate issuer is an admin
    const { data: issuer, error: issuerError } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('id', params.issuedBy)
      .single()

    if (issuerError || !issuer || !issuer.is_admin) {
      return { error: 'Only admins can create invite tokens' }
    }

    // Generate secure token
    const token = generateSecureToken()

    // Calculate expiration (default: 7 days)
    const expiresInHours = params.expiresInHours || 168 // 7 days
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

    // Insert token
    const { data, error } = await supabase
      .from('invite_tokens')
      .insert({
        token,
        issued_by: params.issuedBy,
        role_id: params.roleId,
        intended_email: params.intendedEmail,
        intended_department: params.intendedDepartment,
        expires_at: expiresAt.toISOString(),
        metadata: params.metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invite token:', error)
      return { error: 'Failed to create invite token' }
    }

    // Log the token creation
    await supabase.from('audit_logs').insert({
      actor_id: params.issuedBy,
      action: 'INVITE_TOKEN_CREATED',
      resource_type: 'invite_token',
      resource_id: data.id,
      result: 'SUCCESS',
      details: `Created invite token${params.intendedEmail ? ` for ${params.intendedEmail}` : ''}`,
      metadata: {
        intended_email: params.intendedEmail,
        intended_department: params.intendedDepartment,
        expires_at: expiresAt.toISOString(),
      },
    })

    return { token: data }
  } catch (error) {
    console.error('Exception creating invite token:', error)
    return { error: 'Internal error creating invite token' }
  }
}

/**
 * Validate an invite token for registration
 * 
 * @param token Token string to validate
 * @param email Email of user attempting to register (optional, for intent matching)
 * @returns Validation result
 */
export async function validateInviteToken(
  token: string,
  email?: string
): Promise<ValidateTokenResult> {
  try {
    // Fetch token
    const { data, error } = await supabase
      .from('invite_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !data) {
      return {
        valid: false,
        reason: 'Token not found',
        error: 'Invalid invite token',
      }
    }

    // Check if already used
    if (data.used_at) {
      return {
        valid: false,
        token: data,
        reason: 'Token already used',
        error: 'This invite token has already been used',
      }
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      // Auto-deactivate expired token
      await supabase
        .from('invite_tokens')
        .update({ is_active: false })
        .eq('id', data.id)

      return {
        valid: false,
        token: data,
        reason: 'Token expired',
        error: 'This invite token has expired',
      }
    }

    // Check if active
    if (!data.is_active) {
      return {
        valid: false,
        token: data,
        reason: 'Token deactivated',
        error: 'This invite token has been deactivated',
      }
    }

    // Optional: Check intended email match
    if (data.intended_email && email && data.intended_email.toLowerCase() !== email.toLowerCase()) {
      return {
        valid: false,
        token: data,
        reason: 'Email mismatch',
        error: 'This invite token was issued for a different email address',
      }
    }

    return {
      valid: true,
      token: data,
    }
  } catch (error) {
    console.error('Exception validating invite token:', error)
    return {
      valid: false,
      error: 'Internal error validating invite token',
    }
  }
}

/**
 * Mark an invite token as used
 * 
 * @param token Token string
 * @param usedBy Profile ID of the user who used it
 * @returns Success status
 */
export async function markTokenAsUsed(
  token: string,
  usedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('invite_tokens')
      .update({
        used_at: new Date().toISOString(),
        used_by: usedBy,
        is_active: false,
      })
      .eq('token', token)

    if (error) {
      console.error('Error marking token as used:', error)
      return { success: false, error: 'Failed to mark token as used' }
    }

    // Log token usage
    await supabase.from('audit_logs').insert({
      actor_id: usedBy,
      action: 'INVITE_TOKEN_USED',
      resource_type: 'invite_token',
      resource_id: token,
      result: 'SUCCESS',
      details: 'Invite token used for registration',
    })

    return { success: true }
  } catch (error) {
    console.error('Exception marking token as used:', error)
    return { success: false, error: 'Internal error' }
  }
}

/**
 * Revoke (deactivate) an invite token
 * 
 * @param tokenId Token ID to revoke
 * @param revokedBy Profile ID of admin revoking the token
 * @returns Success status
 */
export async function revokeInviteToken(
  tokenId: string,
  revokedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin
    const { data: admin, error: adminError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', revokedBy)
      .single()

    if (adminError || !admin || !admin.is_admin) {
      return { success: false, error: 'Only admins can revoke tokens' }
    }

    const { error } = await supabase
      .from('invite_tokens')
      .update({ is_active: false })
      .eq('id', tokenId)

    if (error) {
      console.error('Error revoking token:', error)
      return { success: false, error: 'Failed to revoke token' }
    }

    // Log revocation
    await supabase.from('audit_logs').insert({
      actor_id: revokedBy,
      action: 'INVITE_TOKEN_REVOKED',
      resource_type: 'invite_token',
      resource_id: tokenId,
      result: 'SUCCESS',
      details: 'Invite token revoked by admin',
    })

    return { success: true }
  } catch (error) {
    console.error('Exception revoking token:', error)
    return { success: false, error: 'Internal error' }
  }
}

/**
 * List all invite tokens (admin only)
 * 
 * @param params Query parameters
 * @returns List of tokens or error
 */
export async function listInviteTokens(params: {
  issuedBy?: string
  activeOnly?: boolean
  limit?: number
  offset?: number
}): Promise<{ tokens?: InviteToken[]; error?: string; total?: number }> {
  try {
    let query = supabase
      .from('invite_tokens')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (params.issuedBy) {
      query = query.eq('issued_by', params.issuedBy)
    }

    if (params.activeOnly) {
      query = query.eq('is_active', true)
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error listing tokens:', error)
      return { error: 'Failed to list invite tokens' }
    }

    return { tokens: data || [], total: count || 0 }
  } catch (error) {
    console.error('Exception listing tokens:', error)
    return { error: 'Internal error listing tokens' }
  }
}

/**
 * Clean up expired tokens (run via cron)
 */
export async function cleanupExpiredTokens(): Promise<{
  success: boolean
  deactivatedCount?: number
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('invite_tokens')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .select('id')

    if (error) {
      console.error('Error cleaning up expired tokens:', error)
      return { success: false, error: 'Failed to cleanup expired tokens' }
    }

    const deactivatedCount = data?.length || 0

    if (deactivatedCount > 0) {
      await supabase.from('audit_logs').insert({
        action: 'INVITE_TOKENS_CLEANUP',
        resource_type: 'invite_token',
        result: 'SUCCESS',
        details: `Deactivated ${deactivatedCount} expired invite tokens`,
        metadata: { deactivated_count: deactivatedCount },
      })
    }

    return { success: true, deactivatedCount }
  } catch (error) {
    console.error('Exception during token cleanup:', error)
    return { success: false, error: 'Internal error during cleanup' }
  }
}
