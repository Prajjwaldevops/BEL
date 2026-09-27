import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { checkRateLimit, getClientIP, getUserAgent, recordLoginAttempt } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Rate limiting check
  const ipAddress = await getClientIP();
  const rateLimitCheck = await checkRateLimit({ ipAddress });
  
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        reason: rateLimitCheck.reason,
        lockoutUntil: rateLimitCheck.lockoutUntil,
        retryAfter: 900 
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Check if wallet is registered
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, role, wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Wallet address not registered in the system' },
        { status: 404 }
      );
    }

    // Generate cryptographically random 16-byte nonce
    const nonce = randomBytes(16).toString('hex');
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store nonce with expiry
    const { error: nonceError } = await supabase
      .from('auth_nonces')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        nonce,
        issued_at: issuedAt,
        expires_at: expiresAt,
        used: false,
      });

    if (nonceError) {
      console.error('Nonce storage error:', nonceError);
      return NextResponse.json(
        { error: 'Failed to generate nonce' },
        { status: 500 }
      );
    }

    // Construct message for user to sign
    const message = `Sign this message to authenticate with BEL Sentinel

Nonce: ${nonce}
Timestamp: ${issuedAt}
Address: ${walletAddress}

This request will not trigger a blockchain transaction or cost any gas fees.`;

    return NextResponse.json({
      nonce,
      expiresAt,
      message,
    });

  } catch (error) {
    console.error('Nonce generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
