/**
 * Rate Limiting Middleware
 * Applies progressive rate limiting to authentication endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, getUserAgent } from '@/lib/rate-limit';

export interface RateLimitCheckParams {
  username?: string;
  email?: string;
  request?: NextRequest;
}

export interface RateLimitMiddlewareResult {
  allowed: boolean;
  response?: NextResponse;
  reason?: string;
  lockoutUntil?: string | null;
  failedAttempts?: number;
  requiresCaptcha?: boolean;
  tier?: number;
}

/**
 * Middleware to check rate limits before allowing login attempts
 * Returns a NextResponse if rate limit is exceeded, otherwise returns null
 */
export async function rateLimitMiddleware(
  params: RateLimitCheckParams
): Promise<RateLimitMiddlewareResult> {
  // Get IP address from request or from headers
  const ipAddress = params.request ? 
    getClientIPFromRequest(params.request) : 
    await getClientIP();
  
  // Check rate limit
  const rateLimitCheck = await checkRateLimit({
    username: params.username,
    email: params.email,
    ipAddress,
  });
  
  // If not allowed, return error response
  if (!rateLimitCheck.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: rateLimitCheck.reason,
          lockoutUntil: rateLimitCheck.lockoutUntil,
          failedAttempts: rateLimitCheck.failedAttempts,
          requiresCaptcha: rateLimitCheck.requiresCaptcha,
          tier: rateLimitCheck.tier,
        },
        { status: 429 } // Too Many Requests
      ),
      reason: rateLimitCheck.reason,
      lockoutUntil: rateLimitCheck.lockoutUntil,
      failedAttempts: rateLimitCheck.failedAttempts,
      requiresCaptcha: rateLimitCheck.requiresCaptcha,
      tier: rateLimitCheck.tier,
    };
  }
  
  // If CAPTCHA is required (tier 1 warning), include it in response
  if (rateLimitCheck.requiresCaptcha) {
    return {
      allowed: true,
      reason: rateLimitCheck.reason,
      failedAttempts: rateLimitCheck.failedAttempts,
      requiresCaptcha: true,
      tier: rateLimitCheck.tier,
    };
  }
  
  // All clear
  return {
    allowed: true,
    failedAttempts: rateLimitCheck.failedAttempts,
    requiresCaptcha: false,
    tier: rateLimitCheck.tier,
  };
}

/**
 * Extract client IP from NextRequest
 */
function getClientIPFromRequest(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  if (realIP) return realIP;
  
  return '0.0.0.0';
}

/**
 * Extract User-Agent from NextRequest
 */
export function getUserAgentFromRequest(request: NextRequest): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Helper to create a rate limit exceeded response
 */
export function createRateLimitResponse(params: {
  reason: string;
  lockoutUntil?: string | null;
  failedAttempts: number;
  requiresCaptcha: boolean;
  tier: number;
}): NextResponse {
  return NextResponse.json(
    {
      error: 'RATE_LIMIT_EXCEEDED',
      message: params.reason,
      lockoutUntil: params.lockoutUntil,
      failedAttempts: params.failedAttempts,
      requiresCaptcha: params.requiresCaptcha,
      tier: params.tier,
      retryAfter: params.lockoutUntil ? 
        Math.ceil((new Date(params.lockoutUntil).getTime() - Date.now()) / 1000) : 
        null,
    },
    { 
      status: 429,
      headers: {
        'Retry-After': params.lockoutUntil ? 
          String(Math.ceil((new Date(params.lockoutUntil).getTime() - Date.now()) / 1000)) : 
          '60',
      },
    }
  );
}

/**
 * Helper to create a CAPTCHA required response
 */
export function createCaptchaRequiredResponse(params: {
  reason: string;
  failedAttempts: number;
  tier: number;
}): NextResponse {
  return NextResponse.json(
    {
      error: 'CAPTCHA_REQUIRED',
      message: params.reason,
      failedAttempts: params.failedAttempts,
      tier: params.tier,
      requiresCaptcha: true,
    },
    { status: 403 } // Forbidden until CAPTCHA is solved
  );
}
