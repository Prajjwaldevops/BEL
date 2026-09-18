/**
 * Rate Limiting and Progressive Lockout Library
 * Implements tiered rate limiting with escalating lockout durations
 */

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export interface RateLimitResult {
  allowed: boolean;
  reason: string;
  lockoutUntil: string | null;
  failedAttempts: number;
  requiresCaptcha: boolean;
  tier: number;
}

export interface LoginAttempt {
  id: string;
  username?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  lockoutUntil?: string;
  requiresCaptcha: boolean;
  createdAt: string;
}

export interface RateLimitConfig {
  id: string;
  name: string;
  maxAttemptsTier1: number;
  maxAttemptsTier2: number;
  maxAttemptsTier3: number;
  lockoutDurationTier2Minutes: number;
  lockoutDurationTier3Minutes: number;
  windowMinutes: number;
  requiresAdminUnlock: boolean;
  isActive: boolean;
}

/**
 * Get the client IP address from request headers
 */
export async function getClientIP(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIP = headersList.get('x-real-ip');
  const cfConnectingIP = headersList.get('cf-connecting-ip'); // Cloudflare
  
  if (cfConnectingIP) return cfConnectingIP;
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  if (realIP) return realIP;
  
  return '0.0.0.0'; // Fallback
}

/**
 * Get the User-Agent from request headers
 */
export async function getUserAgent(): Promise<string | undefined> {
  const headersList = await headers();
  return headersList.get('user-agent') || undefined;
}

/**
 * Check if a username/email/IP is currently rate limited
 */
export async function checkRateLimit(params: {
  username?: string;
  email?: string;
  ipAddress?: string;
}): Promise<RateLimitResult> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_username: params.username || null,
    p_email: params.email || null,
    p_ip_address: params.ipAddress || null,
  });
  
  if (error) {
    console.error('Error checking rate limit:', error);
    // Fail open - allow login attempt but log the error
    return {
      allowed: true,
      reason: 'Rate limit check failed, proceeding with caution',
      lockoutUntil: null,
      failedAttempts: 0,
      requiresCaptcha: false,
      tier: 0,
    };
  }
  
  const result = data[0];
  
  return {
    allowed: result.allowed,
    reason: result.reason,
    lockoutUntil: result.lockout_until,
    failedAttempts: result.failed_attempts,
    requiresCaptcha: result.requires_captcha,
    tier: result.tier,
  };
}

/**
 * Record a login attempt (success or failure)
 */
export async function recordLoginAttempt(params: {
  username?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}): Promise<string | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('record_login_attempt', {
    p_username: params.username || null,
    p_email: params.email || null,
    p_ip_address: params.ipAddress,
    p_user_agent: params.userAgent || null,
    p_success: params.success,
    p_failure_reason: params.failureReason || null,
  });
  
  if (error) {
    console.error('Error recording login attempt:', error);
    return null;
  }
  
  return data;
}

/**
 * Admin function to manually unlock an account
 */
export async function adminUnlockAccount(params: {
  username: string;
  unlockedBy: string; // UUID of admin
  reason: string;
  ipAddress?: string;
}): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('admin_unlock_account', {
    p_username: params.username,
    p_unlocked_by: params.unlockedBy,
    p_reason: params.reason,
    p_ip_address: params.ipAddress || null,
  });
  
  if (error) {
    console.error('Error unlocking account:', error);
    throw new Error(`Failed to unlock account: ${error.message}`);
  }
  
  return data;
}

/**
 * Get recent login attempts for a user
 */
export async function getLoginAttempts(params: {
  username?: string;
  email?: string;
  ipAddress?: string;
  limit?: number;
}): Promise<LoginAttempt[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('login_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit || 50);
  
  if (params.username) {
    query = query.eq('username', params.username);
  }
  if (params.email) {
    query = query.eq('email', params.email);
  }
  if (params.ipAddress) {
    query = query.eq('ip_address', params.ipAddress);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching login attempts:', error);
    return [];
  }
  
  return (data || []).map(attempt => ({
    id: attempt.id,
    username: attempt.username,
    email: attempt.email,
    ipAddress: attempt.ip_address,
    userAgent: attempt.user_agent,
    success: attempt.success,
    failureReason: attempt.failure_reason,
    lockoutUntil: attempt.lockout_until,
    requiresCaptcha: attempt.requires_captcha,
    createdAt: attempt.created_at,
  }));
}

/**
 * Get account unlock history
 */
export async function getUnlockHistory(params: {
  username?: string;
  limit?: number;
}): Promise<any[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('account_unlocks')
    .select(`
      *,
      unlocker:profiles!unlocked_by(id, full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(params.limit || 50);
  
  if (params.username) {
    query = query.eq('username', params.username);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching unlock history:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get active rate limit configuration
 */
export async function getRateLimitConfig(): Promise<RateLimitConfig | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('rate_limit_config')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching rate limit config:', error);
    return null;
  }
  
  return data ? {
    id: data.id,
    name: data.name,
    maxAttemptsTier1: data.max_attempts_tier1,
    maxAttemptsTier2: data.max_attempts_tier2,
    maxAttemptsTier3: data.max_attempts_tier3,
    lockoutDurationTier2Minutes: data.lockout_duration_tier2_minutes,
    lockoutDurationTier3Minutes: data.lockout_duration_tier3_minutes,
    windowMinutes: data.window_minutes,
    requiresAdminUnlock: data.requires_admin_unlock,
    isActive: data.is_active,
  } : null;
}

/**
 * Update rate limit configuration (admin only)
 */
export async function updateRateLimitConfig(
  config: Partial<Omit<RateLimitConfig, 'id' | 'createdAt'>>
): Promise<RateLimitConfig | null> {
  const supabase = createClient();
  
  // Deactivate current config
  await supabase
    .from('rate_limit_config')
    .update({ is_active: false })
    .eq('is_active', true);
  
  // Insert new config
  const { data, error } = await supabase
    .from('rate_limit_config')
    .insert({
      name: config.name || 'custom',
      max_attempts_tier1: config.maxAttemptsTier1,
      max_attempts_tier2: config.maxAttemptsTier2,
      max_attempts_tier3: config.maxAttemptsTier3,
      lockout_duration_tier2_minutes: config.lockoutDurationTier2Minutes,
      lockout_duration_tier3_minutes: config.lockoutDurationTier3Minutes,
      window_minutes: config.windowMinutes,
      requires_admin_unlock: config.requiresAdminUnlock,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error updating rate limit config:', error);
    return null;
  }
  
  return data ? {
    id: data.id,
    name: data.name,
    maxAttemptsTier1: data.max_attempts_tier1,
    maxAttemptsTier2: data.max_attempts_tier2,
    maxAttemptsTier3: data.max_attempts_tier3,
    lockoutDurationTier2Minutes: data.lockout_duration_tier2_minutes,
    lockoutDurationTier3Minutes: data.lockout_duration_tier3_minutes,
    windowMinutes: data.window_minutes,
    requiresAdminUnlock: data.requires_admin_unlock,
    isActive: data.is_active,
  } : null;
}

/**
 * Helper to format lockout time remaining
 */
export function formatLockoutTimeRemaining(lockoutUntil: string): string {
  const now = new Date();
  const lockout = new Date(lockoutUntil);
  const diffMs = lockout.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Lockout expired';
  
  const minutes = Math.ceil(diffMs / 60000);
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get tier information for display
 */
export function getTierInfo(tier: number): {
  label: string;
  color: string;
  severity: string;
} {
  switch (tier) {
    case 0:
      return { label: 'Normal', color: 'green', severity: 'low' };
    case 1:
      return { label: 'Warning', color: 'yellow', severity: 'low' };
    case 2:
      return { label: 'Locked (Short)', color: 'orange', severity: 'medium' };
    case 3:
      return { label: 'Locked (Long)', color: 'red', severity: 'high' };
    default:
      return { label: 'Unknown', color: 'gray', severity: 'unknown' };
  }
}
