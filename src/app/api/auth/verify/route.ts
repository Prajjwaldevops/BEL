import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyMessage } from 'ethers';
import * as jwt from 'jsonwebtoken';
import { rateLimit } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-real-secret-in-production';

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per 15 minutes per IP
  const identifier = request.ip || 'anonymous';
  const { success } = await rateLimit(identifier, 20, 15 * 60 * 1000);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: 900 },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { walletAddress, signature, nonce } = body;

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, signature, nonce' },
        { status: 400 }
      );
    }

    // Retrieve nonce from database
    const { data: nonceRecord, error: nonceError } = await supabase
      .from('auth_nonces')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('nonce', nonce)
      .eq('used', false)
      .single();

    if (nonceError || !nonceRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 400 }
      );
    }

    // Check nonce expiry (5 minutes)
    const now = new Date();
    const expiresAt = new Date(nonceRecord.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Nonce has expired' },
        { status: 400 }
      );
    }

    // Construct the message that should have been signed
    const message = `Sign this message to authenticate with BEL Sentinel

Nonce: ${nonce}
Timestamp: ${nonceRecord.issued_at}
Address: ${walletAddress}

This request will not trigger a blockchain transaction or cost any gas fees.`;

    // Verify signature using ethers.js
    let recoveredAddress: string;
    try {
      recoveredAddress = verifyMessage(message, signature);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Check if recovered address matches claimed address
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Signature does not match wallet address' },
        { status: 400 }
      );
    }

    // Mark nonce as used (single-use)
    await supabase
      .from('auth_nonces')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', nonceRecord.id);

    // Retrieve user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, full_name, role, department, wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate JWT token (24-hour expiry)
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      department: user.department,
      walletAddress: user.wallet_address,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '24h',
      algorithm: 'HS256',
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Log authentication event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'WALLET_AUTH_SUCCESS',
      resource_type: 'USER',
      resource_id: user.id,
      metadata: {
        walletAddress: user.wallet_address,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      },
      ip_address: request.ip,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.full_name,
        role: user.role,
        department: user.department,
        walletAddress: user.wallet_address,
      },
      expiresAt,
    });

  } catch (error) {
    console.error('Signature verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
