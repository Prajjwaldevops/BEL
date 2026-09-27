import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, walletAddress } = body;

    console.log('=== DEBUG LOGIN START ===');
    console.log('Username:', username);
    console.log('Has password:', !!password);
    console.log('Wallet:', walletAddress);

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Supabase URL:', supabaseUrl);
    console.log('Has service key:', !!supabaseKey);

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase credentials',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      }, { status: 500 });
    }

    // Test 1: Fetch user
    console.log('Fetching user from Supabase...');
    const userRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    console.log('User fetch status:', userRes.status);
    const users = await userRes.json();
    console.log('Users found:', users.length);

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        username 
      }, { status: 404 });
    }

    const user = users[0];
    console.log('User found:', user.username);
    console.log('Has password_hash:', !!user.password_hash);
    console.log('Wallet in DB:', user.wallet_address);

    // Test 2: Verify password
    console.log('Testing password verification...');
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

      console.log('Verify status:', verifyRes.status);
      const verifyResult = await verifyRes.json();
      console.log('Verify result:', verifyResult);

      return NextResponse.json({
        success: true,
        userFound: true,
        passwordValid: verifyResult === true,
        walletMatch: user.wallet_address?.toLowerCase() === walletAddress?.toLowerCase(),
        details: {
          username: user.username,
          hasPasswordHash: !!user.password_hash,
          isAdmin: user.is_admin
        }
      });

    } catch (verifyError) {
      console.error('Password verify error:', verifyError);
      return NextResponse.json({
        error: 'Password verification failed',
        message: verifyError instanceof Error ? verifyError.message : 'Unknown'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('=== DEBUG LOGIN ERROR ===');
    console.error(error);
    return NextResponse.json({ 
      error: 'Debug login failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
