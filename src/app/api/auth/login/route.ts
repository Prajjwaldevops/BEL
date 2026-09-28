import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware, getUserAgentFromRequest } from '@/middleware/rate-limit';
import { recordLoginAttempt, getClientIP } from '@/lib/rate-limit';

// Simple JWT-like token generation (for demo/hackathon — use proper JWT library in production)
function generateToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 8 * 60 * 60 * 1000 }));
  const signature = btoa(JSON.stringify({ sig: 'bel-sentinel-signed' }));
  return `${header}.${body}.${signature}`;
}

export async function POST(request: NextRequest) {
  const ipAddress = await getClientIP();
  const userAgent = getUserAgentFromRequest(request);
  
  try {
    const { username, password, walletAddress } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

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
        // RPC function might not exist - try direct comparison (FALLBACK ONLY - NOT SECURE)
        console.warn('verify_password RPC failed, using fallback');
        
        // Check if password_hash exists and matches
        if (user.password_hash) {
          // For development: allow plain text comparison if hash not set
          // In production: this should NEVER be used
          if (user.password_hash === password) {
            console.warn('⚠️ INSECURE: Plain text password match - UPDATE DATABASE WITH HASHED PASSWORDS');
            passwordValid = true;
          }
        }
      }
    } catch (verifyError) {
      console.error('Password verification error:', verifyError);
      
      // Last resort fallback for development
      if (process.env.NODE_ENV === 'development' && user.password_hash === password) {
        console.warn('⚠️ DEVELOPMENT MODE: Plain text password allowed');
        passwordValid = true;
      }
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

    return NextResponse.json({
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
