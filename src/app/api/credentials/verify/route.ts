import { NextRequest, NextResponse } from 'next/server';
import { verifyCredential } from '@/lib/vc-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { credentialId } = await request.json();
    const verification = await verifyCredential(credentialId, user.id);
    
    return NextResponse.json({ success: true, verification });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
