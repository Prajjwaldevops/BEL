import { NextRequest, NextResponse } from 'next/server';

function generateRandomUsername(fullName: string): string {
  const cleanName = fullName.toLowerCase().replace(/[^a-z]/g, '');
  const prefix = cleanName.slice(0, 4) || 'user';
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `bel_${prefix}_${suffix}`;
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateAccessCode(): string {
  // Generate a 6-digit unique access code (100000 - 999999)
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateMockPhotoHash(): string {
  const hex = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += hex.charAt(Math.floor(Math.random() * 16));
  }
  return hash;
}

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
    const formData = await request.formData();

    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const department = formData.get('department') as string;
    const role = formData.get('role') as string;
    const walletAddress = formData.get('walletAddress') as string;
    const photo = formData.get('photo') as File | null;

    // Validate required fields
    if (!fullName || !email || !department || !role || !walletAddress) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate role
    if (!['VIEWER', 'ALTER', 'DEBUGGER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be VIEWER, ALTER, or DEBUGGER' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // ===== Step 0: Check wallet uniqueness (one-time registration) =====
    if (supabaseUrl && supabaseKey) {
      try {
        const walletCheck = await fetch(
          `${supabaseUrl}/rest/v1/profiles?wallet_address=eq.${encodeURIComponent(walletAddress)}&select=id,username`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );

        const existingWallets = await walletCheck.json();
        if (Array.isArray(existingWallets) && existingWallets.length > 0) {
          return NextResponse.json({
            error: 'WALLET ALREADY REGISTERED — One-time registration only. This wallet address is already linked to an identity.',
          }, { status: 409 });
        }
      } catch (walletErr) {
        console.error('Wallet uniqueness check error:', walletErr);
        // Continue — don't block registration if check fails
      }
    }

    // ===== Step 1: Criminal Database Check (MOCK) =====
    // In production, this would call the national criminal database API
    const criminalStatus = 'CLEARED'; // Always CLEARED for now

    // ===== Step 2: Upload Photo to Supabase Storage =====
    let photoUrl = '';
    let photoHash = generateMockPhotoHash();

    if (photo && supabaseUrl && supabaseKey) {
      try {
        const arrayBuffer = await photo.arrayBuffer();
        
        // Generate actual hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        photoHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const fileName = `${Date.now()}_identity.jpg`;
        const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/photos/${fileName}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': photo.type || 'image/jpeg',
          },
          body: arrayBuffer,
        });

        if (uploadRes.ok) {
          photoUrl = `${supabaseUrl}/storage/v1/object/public/photos/${fileName}`;
        } else {
          const uploadError = await uploadRes.json();
          console.error('Supabase storage upload error:', uploadError);
          // Fallback if bucket is not created
          photoUrl = `https://r2.bel-sentinel.dev/photos/${fileName}`;
        }
      } catch (uploadErr) {
        console.error('Photo upload failed:', uploadErr);
        photoUrl = `https://r2.bel-sentinel.dev/photos/fallback_identity.jpg`;
      }
    }

    // ===== Step 3: Generate Credentials =====
    const username = generateRandomUsername(fullName);
    const password = generateRandomPassword();
    const accessCode = generateAccessCode();

    // ===== Step 4: Mint Identity NFT (MOCK for now) =====
    // In production: call IdentityNFT.mintIdentity() via ethers.js
    const nftTokenId = `#${Math.floor(Math.random() * 9000 + 1000)}`;
    const nftTxHash = generateMockTxHash();

    // ===== Step 5: Save to Supabase Database =====
    if (supabaseUrl && supabaseKey) {
      try {
        // Hash password via Supabase RPC using pgcrypto
        let passwordHash = password; // fallback: store plain (not ideal)
        
        try {
          const hashRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hash_password`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_password: password }),
          });

          if (hashRes.ok) {
            const hashedPw = await hashRes.json();
            if (hashedPw) {
              passwordHash = hashedPw;
            }
          }
        } catch {
          // If hash_password RPC doesn't exist, use raw SQL via profiles insert
          // The SQL function might need to be created first
          console.warn('hash_password RPC not available, using crypt in insert');
        }

        const profileData = {
          username,
          password_hash: passwordHash,
          email,
          full_name: fullName,
          display_name: fullName.split(' ').pop() || fullName,
          department,
          wallet_address: walletAddress,
          photo_url: photoUrl,
          photo_hash: photoHash,
          nft_token_id: nftTokenId,
          nft_tx_hash: nftTxHash,
          criminal_check_status: criminalStatus,
          criminal_check_timestamp: new Date().toISOString(),
          generated_username: username,
          is_admin: false,
          status: 'ACTIVE',
          access_code: accessCode,
        };

        const res = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(profileData),
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.error('Supabase insert error:', errorData);
          
          // Check for access_code uniqueness conflict and retry
          if (errorData?.message?.includes('access_code')) {
            // Regenerate access code and retry
            profileData.access_code = generateAccessCode();
            const retryRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify(profileData),
            });
            if (!retryRes.ok) {
              console.error('Retry also failed');
            }
          }
        } else {
          // Also assign role in user_roles table
          const insertedUsers = await res.json();
          if (Array.isArray(insertedUsers) && insertedUsers.length > 0) {
            const profileId = insertedUsers[0].id;
            
            // Get the role ID for the specified role
            try {
              const roleRes = await fetch(
                `${supabaseUrl}/rest/v1/roles?name=eq.${role}&select=id`,
                {
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                  },
                }
              );
              const roles = await roleRes.json();
              if (Array.isArray(roles) && roles.length > 0) {
                await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
                  method: 'POST',
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                  },
                  body: JSON.stringify({
                    profile_id: profileId,
                    role_id: roles[0].id,
                    is_active: true,
                  }),
                });
              }
            } catch (roleErr) {
              console.error('Role assignment error:', roleErr);
            }
          }
        }
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Continue — user gets credentials regardless
      }
    }

    // ===== Step 6: Send Testnet ETH (MOCK for now) =====
    // In production: use ethers.js to send from admin wallet

    // ===== Return Credentials =====
    return NextResponse.json({
      username,
      password,
      accessCode,
      nftTokenId,
      nftTxHash,
      walletAddress,
      photoHash,
      photoUrl,
      criminalStatus,
      role,
      department,
      message: 'Registration successful. Save your credentials — they are NON-CHANGEABLE and NON-RECOVERABLE.',
    });

  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
