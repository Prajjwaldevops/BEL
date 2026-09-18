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
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    // RATE LIMITING CHECK
    const rateLimitCheck = await rateLimitMiddleware({
      username,
      request,
    });

    // If rate limited, return error response
    if (!rateLimitCheck.allowed && rateLimitCheck.response) {
      // Record the blocked attempt
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
      // You can add CAPTCHA validation here in the future
      // For now, just log the warning in the response
    }

    // For the admin account — hardcoded check (admin/admin123)
    // In production, this would verify against Supabase with bcrypt
    const isAdmin = username === 'admin' && password === 'admin123';

    // Demo debugger account (debugger/debug123)
    const isDebugger = username === 'debugger' && password === 'debug123';

    if (isDebugger) {
      // Record successful login
      await recordLoginAttempt({
        username,
        ipAddress,
        userAgent,
        success: true,
      });
      
      const token = generateToken({
        userId: 'debugger-001',
        username: 'debugger',
        role: 'DEBUGGER',
        department: 'Quality Assurance',
        isAdmin: false,
      });

      return NextResponse.json({
        token,
        user: {
          id: 'debugger-001',
          username: 'debugger',
          fullName: 'Debug Inspector',
          displayName: 'Debugger',
          email: 'debugger@bel-sentinel.gov',
          department: 'Quality Assurance',
          role: 'DEBUGGER',
          walletAddress: null,
          photoUrl: null,
          nftTokenId: null,
          isAdmin: false,
        },
      });
    }

    if (!isAdmin) {
      // Check Supabase for registered users
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          const res = await fetch(`${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=*`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          });

          const users = await res.json();

          if (!Array.isArray(users) || users.length === 0) {
            // Record failed login
            await recordLoginAttempt({
              username,
              ipAddress,
              userAgent,
              success: false,
              failureReason: 'USER_NOT_FOUND',
            });
            
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
          }

          const user = users[0];

          // Verify password via Supabase RPC (pgcrypto crypt function)
          const verifyRes = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_password`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_username: username, p_password: password }),
          });

          const verifyResult = await verifyRes.json();

          if (!verifyResult) {
            // Record failed login
            await recordLoginAttempt({
              username,
              email: user.email,
              ipAddress,
              userAgent,
              success: false,
              failureReason: 'INVALID_PASSWORD',
            });
            
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
          }

          // Record successful login
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

          const token = generateToken({
            userId: user.id,
            username: user.username,
            role: user.is_admin ? 'ADMIN' : 'USER',
            department: user.department,
          });

          return NextResponse.json({
            token,
            user: {
              id: user.id,
              username: user.username,
              fullName: user.full_name,
              displayName: user.display_name,
              email: user.email,
              department: user.department,
              role: user.is_admin ? 'ADMIN' : 'VIEWER',
              walletAddress: user.wallet_address,
              photoUrl: user.photo_url,
              nftTokenId: user.nft_token_id,
              isAdmin: user.is_admin,
            },
          });
        } catch {
          // If Supabase fails, fall through to credential check
        }
      }

      // Record failed login - no Supabase user found
      await recordLoginAttempt({
        username,
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'INVALID_CREDENTIALS',
      });

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Admin login success
    await recordLoginAttempt({
      username,
      ipAddress,
      userAgent,
      success: true,
    });
    const token = generateToken({
      userId: 'admin-001',
      username: 'admin',
      role: 'ADMIN',
      department: 'Command & Control',
      isAdmin: true,
    });

    return NextResponse.json({
      token,
      user: {
        id: 'admin-001',
        username: 'admin',
        fullName: 'System Administrator',
        displayName: 'Admin',
        email: 'admin@bel-sentinel.gov',
        department: 'Command & Control',
        role: 'ADMIN',
        walletAddress: null,
        photoUrl: null,
        nftTokenId: null,
        isAdmin: true,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
