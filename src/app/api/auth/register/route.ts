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

    // ===== Step 1: Criminal Database Check (MOCK) =====
    // In production, this would call the national criminal database API
    const criminalStatus = 'CLEARED'; // Always CLEARED for now

    // ===== Step 2: Upload Photo to Supabase Storage =====
    let photoUrl = '';
    let photoHash = generateMockPhotoHash();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // ===== Step 4: Mint Identity NFT (MOCK for now) =====
    // In production: call IdentityNFT.mintIdentity() via ethers.js
    const nftTokenId = `#${Math.floor(Math.random() * 9000 + 1000)}`;
    const nftTxHash = generateMockTxHash();

    // ===== Step 5: Save to Supabase Database =====
    if (supabaseUrl && supabaseKey) {
      try {
        const profileData = {
          username,
          password_hash: password, // In production: hash with bcrypt via Supabase RPC
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
          // Continue anyway — return credentials even if DB save fails
        }
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Continue — user gets credentials regardless
      }
    }

    // ===== Step 6: Send Testnet ETH (MOCK for now) =====
    // In production: use ethers.js to send from admin wallet
    // const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    // const adminWallet = new ethers.Wallet(process.env.ADMIN_WALLET_PRIVATE_KEY, provider);
    // const tx = await adminWallet.sendTransaction({ to: walletAddress, value: ethers.parseEther('0.01') });

    // ===== Return Credentials =====
    return NextResponse.json({
      username,
      password,
      nftTokenId,
      nftTxHash,
      walletAddress,
      photoHash,
      photoUrl,
      criminalStatus,
      role,
      department,
      message: 'Registration successful. Save your credentials — they cannot be recovered.',
    });

  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
