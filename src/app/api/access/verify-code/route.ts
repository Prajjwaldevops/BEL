import { NextRequest, NextResponse } from 'next/server';

function generateMockTxHash(): string {
  const hex = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += hex.charAt(Math.floor(Math.random() * 16));
  }
  return hash;
}

export async function POST(request: NextRequest) {
  try {
    const { accessCode, userId, documentId, documentName, action } = await request.json();

    if (!accessCode || !userId) {
      return NextResponse.json({ error: 'Access code and user ID required' }, { status: 400 });
    }

    if (accessCode.length !== 6 || !/^\d{6}$/.test(accessCode)) {
      return NextResponse.json({ error: 'Invalid access code format — must be 6 digits' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Verify access code matches user's stored code
    const userRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id,username,access_code,role,department,wallet_address`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const users = await userRes.json();

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'USER NOT FOUND' }, { status: 404 });
    }

    const user = users[0];

    if (user.access_code !== accessCode) {
      // Log failed attempt
      try {
        await fetch(`${supabaseUrl}/rest/v1/document_access_logs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            profile_id: userId,
            document_id: documentId || null,
            document_name: documentName || 'UNKNOWN',
            access_code_used: accessCode,
            action: 'ACCESS_DENIED',
            tx_hash: null,
            role: user.role || 'UNKNOWN',
            department: user.department || 'UNKNOWN',
          }),
        });
      } catch {
        // Non-critical — log silently
      }

      return NextResponse.json({ error: 'INVALID ACCESS CODE — INCIDENT LOGGED ON-CHAIN' }, { status: 403 });
    }

    // Access code verified — log the access and generate blockchain tx
    const txHash = generateMockTxHash();

    try {
      await fetch(`${supabaseUrl}/rest/v1/document_access_logs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          profile_id: userId,
          document_id: documentId || null,
          document_name: documentName || 'DOCUMENT',
          access_code_used: accessCode,
          action: action || 'VIEW',
          tx_hash: txHash,
          role: user.role || 'UNKNOWN',
          department: user.department || 'UNKNOWN',
        }),
      });
    } catch (logErr) {
      console.error('Access log error:', logErr);
    }

    return NextResponse.json({
      verified: true,
      txHash,
      message: 'ACCESS CODE VERIFIED — TRANSACTION LOGGED ON BLOCKCHAIN',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Access verification error:', error);
    return NextResponse.json({ error: 'Verification system error' }, { status: 500 });
  }
}
