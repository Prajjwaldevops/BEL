import { NextRequest, NextResponse } from 'next/server';
import { getUserCredentials } from '@/lib/vc-service';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const credentials = await getUserCredentials(user.id);
    return NextResponse.json({ success: true, credentials, count: credentials.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
