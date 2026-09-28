/**
 * BEL SENTINEL — Wallet Authentication Service
 *
 * Secure challenge-response flow for wallet ownership verification.
 *
 * Flow:
 * 1. Server generates cryptographic nonce → stored in auth_nonces table
 * 2. User signs the nonce with their wallet (EIP-191)
 * 3. Server verifies signature using ethers.verifyMessage
 * 4. Server binds verified wallet to authenticated user profile
 *
 * SECURITY:
 * - Nonce is single-use and expires after 5 minutes
 * - Replay protection via nonce consumption
 * - Never stores or requests private keys
 * - Never trusts wallet address from browser alone
 */

import crypto from 'crypto';
import { verifyMessage } from 'ethers';

// ===== Types =====

export interface WalletNonce {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface WalletVerificationResult {
  verified: boolean;
  walletAddress: string;
  error?: string;
}

// ===== Nonce Generation =====

/**
 * Generate a cryptographic nonce for wallet authentication.
 * Store it in the auth_nonces table and return the signing message.
 */
export async function generateWalletNonce(
  walletAddress: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<WalletNonce> {
  // Validate wallet address format
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error('Invalid wallet address format');
  }

  const normalizedAddress = walletAddress.toLowerCase();
  const nonce = crypto.randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Store nonce in database
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/auth_nonces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      wallet_address: normalizedAddress,
      nonce,
      issued_at: issuedAt,
      expires_at: expiresAt,
      used: false,
    }),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    console.error('Nonce storage error:', errText);
    throw new Error('Failed to generate authentication nonce');
  }

  // Construct the message the user will sign
  const message = `Sign this message to verify wallet ownership with BEL Sentinel

Nonce: ${nonce}
Timestamp: ${issuedAt}
Address: ${walletAddress}

This request will not trigger a blockchain transaction or cost any gas fees.`;

  return { nonce, message, expiresAt };
}

// ===== Signature Verification =====

/**
 * Verify a wallet signature against a stored nonce.
 * Returns the verified wallet address if valid.
 */
export async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  nonce: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<WalletVerificationResult> {
  const normalizedAddress = walletAddress.toLowerCase();

  // 1. Retrieve nonce from database
  const nonceRes = await fetch(
    `${supabaseUrl}/rest/v1/auth_nonces?wallet_address=eq.${normalizedAddress}&nonce=eq.${nonce}&used=eq.false&select=*`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  const nonceRecords = await nonceRes.json();
  if (!Array.isArray(nonceRecords) || nonceRecords.length === 0) {
    return { verified: false, walletAddress, error: 'Invalid or expired nonce' };
  }

  const nonceRecord = nonceRecords[0];

  // 2. Check nonce expiry
  const now = new Date();
  const expiresAt = new Date(nonceRecord.expires_at);
  if (now > expiresAt) {
    return { verified: false, walletAddress, error: 'Nonce has expired' };
  }

  // 3. Reconstruct the signed message
  const message = `Sign this message to verify wallet ownership with BEL Sentinel

Nonce: ${nonce}
Timestamp: ${nonceRecord.issued_at}
Address: ${walletAddress}

This request will not trigger a blockchain transaction or cost any gas fees.`;

  // 4. Verify EIP-191 signature
  let recoveredAddress: string;
  try {
    recoveredAddress = verifyMessage(message, signature);
  } catch {
    return { verified: false, walletAddress, error: 'Invalid signature format' };
  }

  if (recoveredAddress.toLowerCase() !== normalizedAddress) {
    return {
      verified: false,
      walletAddress,
      error: 'Signature does not match wallet address',
    };
  }

  // 5. Mark nonce as used (prevent replay)
  await fetch(
    `${supabaseUrl}/rest/v1/auth_nonces?id=eq.${nonceRecord.id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ used: true, used_at: new Date().toISOString() }),
    }
  );

  return { verified: true, walletAddress: recoveredAddress };
}

/**
 * Bind a verified wallet address to a user profile.
 * Updates the profiles table with the wallet address.
 */
export async function bindWalletToProfile(
  profileId: string,
  walletAddress: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error('Invalid wallet address');
  }

  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${profileId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        wallet_address: walletAddress.toLowerCase(),
      }),
    }
  );

  if (!updateRes.ok) {
    throw new Error('Failed to bind wallet to profile');
  }
}
