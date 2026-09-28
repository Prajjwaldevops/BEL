import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware, getUserAgentFromRequest } from '@/middleware/rate-limit';
import { recordLoginAttempt, getClientIP } from '@/lib/rate-limit';
import crypto from 'crypto';

/**
 * Generate a proper HMAC-SHA256 signed JWT.
 * Uses JWT_SECRET from environment. Fails explicitly if not configured in production.
 */
function generateToken(payload: Record<string, unknown>): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is not set. Cannot generate tokens in production.');
  }
  const signingKey = secret || 'bel-sentinel-dev-secret-change-in-production';

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 hours
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

// ===== HARDCODED DEMO BYPASS USERS =====
// These users bypass Supabase entirely for hackathon demo purposes
const DEMO_BYPASS_USERS: Record<string, {
  password: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    display_name: string;
    email: string;
    department: string;
    role: string;
    wallet_address: string;
    photo_url: string | null;
    nft_token_id: string | null;
    is_admin: boolean;
    clearance: string;
    access_code: string;
  };
}> = {
  admin: {
    password: 'admin123',
    user: {
      id: 'demo-admin-001',
      username: 'admin',
      full_name: 'Commander Arjun Vikram',
      display_name: 'Cmdr. Vikram',
      email: 'admin@bel-sentinel.gov.in',
      department: 'Command & Control',
      role: 'ADMIN',
      wallet_address: '0xADM1N000000000000000000000000000000000001',
      photo_url: null,
      nft_token_id: '#0001',
      is_admin: true,
      clearance: 'TOP SECRET // SCI',
      access_code: 'ALPHA-7',
    },
  },
  sih: {
    password: 'admin123',
    user: {
      id: 'demo-sih-002',
      username: 'sih',
      full_name: 'Dr. Priya Sharma — SIH Judge',
      display_name: 'Dr. Sharma (SIH)',
      email: 'sih@bel-sentinel.gov.in',
      department: 'Security Operations',
      role: 'ADMIN',
      wallet_address: '0x51H00000000000000000000000000000000000002',
      photo_url: null,
      nft_token_id: '#0002',
      is_admin: true,
      clearance: 'TOP SECRET // SCI',
      access_code: 'SENTINEL-SIH',
    },
  },
};

export async function POST(request: NextRequest) {
  const ipAddress = await getClientIP();
  const userAgent = getUserAgentFromRequest(request);
  
  try {
    const { username, password, walletAddress, signature, messageToSign } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    // ===== DEMO BYPASS CHECK =====
    // admin / sih with password admin123 bypass ALL checks (Supabase, wallet, rate limit)
    const demoEntry = DEMO_BYPASS_USERS[username.toLowerCase()];
    if (demoEntry && password === demoEntry.password) {
      console.log(`🔓 DEMO BYPASS: User '${username}' authenticated via hardcoded bypass`);

      const token = generateToken({
        userId: demoEntry.user.id,
        username: demoEntry.user.username,
        role: demoEntry.user.role,
        department: demoEntry.user.department,
        isAdmin: true,
        isDemoBypass: true,
      });

      const response = NextResponse.json({
        token,
        user: {
          id: demoEntry.user.id,
          username: demoEntry.user.username,
          fullName: demoEntry.user.full_name,
          displayName: demoEntry.user.display_name,
          email: demoEntry.user.email,
          department: demoEntry.user.department,
          role: demoEntry.user.role,
          walletAddress: demoEntry.user.wallet_address,
          photoUrl: demoEntry.user.photo_url,
          nftTokenId: demoEntry.user.nft_token_id,
          isAdmin: demoEntry.user.is_admin,
          accessCode: demoEntry.user.access_code,
          clearance: demoEntry.user.clearance,
        },
      });

      response.cookies.set({
        name: 'bel-auth-token',
        value: token,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60,
      });

      return response;
    }

    // ===== NORMAL AUTH FLOW (Supabase) =====

    // Test users can bypass wallet requirement
    const TEST_USERS_BYPASS = ['admin', 'sih'];
    const bypassWalletCheck = TEST_USERS_BYPASS.includes(username.toLowerCase());

    if (!walletAddress && !bypassWalletCheck) {
      return NextResponse.json({ error: 'HARDWARE KEY MANDATORY FOR ACCESS' }, { status: 403 });
    }

    // RATE LIMITING CHECK
    const rateLimitCheck = await rateLimitMiddleware({
      username,
      request,
    });

    // If rate limited, return error response
    if (!rateLimitCheck.allowed && rateLimitCheck.response) {
      await recordLoginAttempt({
        username,
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'RATE_LIMIT_EXCEEDED',
      });
      
      return rateLimitCheck.response;
    }

    // If CAPTCHA is required but not provided (tier 1 warning)
    if (rateLimitCheck.requiresCaptcha) {
      // CAPTCHA validation can be added here in the future
    }

    // ===== ALL AUTH VIA SUPABASE =====
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    // Step 1: Look up user by username
    const userRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const users = await userRes.json();

    if (!Array.isArray(users) || users.length === 0) {
      await recordLoginAttempt({
        username,
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'USER_NOT_FOUND',
      });
      
      return NextResponse.json({ 
        error: 'AUTHENTICATION FAILED — CHECK CREDENTIALS',
        details: 'Operator ID not found in system'
      }, { status: 401 });
    }

    const user = users[0];

    // Step 2: Verify wallet FIRST (before password check)
    // bypassWalletCheck already defined above
    
    if (user.wallet_address && walletAddress && !bypassWalletCheck) {
      // Normal wallet verification for production users
      if (walletAddress.toLowerCase() !== user.wallet_address.toLowerCase()) {
        await recordLoginAttempt({
          username,
          email: user.email,
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'WALLET_MISMATCH',
        });

        return NextResponse.json({
          error: 'AUTHENTICATION FAILED — CHECK CREDENTIALS',
          details: 'Wallet address does not match registered identity'
        }, { status: 401 });
      }

      // Verify the cryptographic signature!
      if (!signature || !messageToSign) {
        return NextResponse.json({
          error: 'AUTHENTICATION FAILED — MISSING SIGNATURE',
          details: 'A cryptographic signature is required to prove wallet ownership'
        }, { status: 401 });
      }

      try {
        const { verifyMessage } = await import('viem');
        const isValid = await verifyMessage({
          address: walletAddress as `0x${string}`,
          message: messageToSign,
          signature: signature as `0x${string}`,
        });

        if (!isValid) {
          return NextResponse.json({
            error: 'AUTHENTICATION FAILED — INVALID SIGNATURE',
            details: 'The cryptographic signature could not be verified'
          }, { status: 401 });
        }
      } catch (err) {
        console.error('Signature verification failed:', err);
        return NextResponse.json({
          error: 'AUTHENTICATION FAILED — SIGNATURE ERROR',
          details: 'An error occurred verifying the hardware token signature'
        }, { status: 401 });
      }
    } else if (bypassWalletCheck) {
      console.log(`⚠️ WALLET BYPASS: Test user '${username}' - wallet verification skipped`);
    }

    // Step 3: Verify password via Supabase RPC (pgcrypto crypt function)
    let passwordValid = false;
    
    try {
      const verifyRes = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_password`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_username: username, p_password: password }),
      });

      if (verifyRes.ok) {
        const verifyResult = await verifyRes.json();
        passwordValid = verifyResult === true;
      } else {
        console.warn('verify_password RPC failed, password rejected');
      }
    } catch (verifyError) {
      console.error('Password verification error:', verifyError);
    }

    if (!passwordValid) {
      await recordLoginAttempt({
        username,
        email: user.email,
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'INVALID_PASSWORD',
      });
      
      return NextResponse.json({ 
        error: 'AUTHENTICATION FAILED — CHECK CREDENTIALS',
        details: 'Invalid password for operator'
      }, { status: 401 });
    }

    // Step 4: Determine role
    // Check is_admin flag first
    let userRole = 'VIEWER'; // default

    if (user.is_admin) {
      userRole = 'ADMIN';
    } else {
      // Look up role from user_roles table
      try {
        const roleRes = await fetch(
          `${supabaseUrl}/rest/v1/user_roles?profile_id=eq.${user.id}&is_active=eq.true&select=role_id,roles(name)`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );

        const roleData = await roleRes.json();
        if (Array.isArray(roleData) && roleData.length > 0) {
          // Get the role name from the joined roles table
          const roleName = roleData[0]?.roles?.name;
          if (roleName && ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'].includes(roleName)) {
            userRole = roleName;
          }
        }
      } catch (roleErr) {
        console.error('Role lookup error:', roleErr);
        // Fall through with default role
      }
    }

    // Step 5: Record successful login
    await recordLoginAttempt({
      username,
      email: user.email,
      ipAddress,
      userAgent,
      success: true,
    });

    // Update last_active_at
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ last_active_at: new Date().toISOString() }),
    });

    // Step 6: Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: userRole,
      department: user.department,
      isAdmin: user.is_admin,
    });

    // Create response with token in body and cookie
    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        displayName: user.display_name || user.full_name,
        email: user.email,
        department: user.department,
        role: userRole,
        walletAddress: user.wallet_address,
        photoUrl: user.photo_url,
        nftTokenId: user.nft_token_id,
        isAdmin: user.is_admin,
        accessCode: user.access_code,
        clearance: user.clearance || 'UNCLASSIFIED',
      },
    });

    // Set auth token in HTTP-only cookie for server-side auth
    response.cookies.set({
      name: 'bel-auth-token',
      value: token,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours (same as token expiry)
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    // Provide more detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Login error details:', {
      message: errorMessage,
      stack: errorStack,
      username,
    });
    
    return NextResponse.json({ 
      error: 'SYSTEM ERROR — AUTHENTICATION CORE FAILURE',
      debug: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
