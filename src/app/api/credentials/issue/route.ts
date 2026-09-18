import { NextRequest, NextResponse } from 'next/server';
import { issueCredential } from '@/lib/vc-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const { credentialType, schemaId, subjectDid, subjectProfileId, issuerDid, claims, expirationDays, privateKey } = body;
    
    const credentialId = await issueCredential({
      credentialType,
      schemaId,
      subjectDid,
      subjectProfileId,
      issuerDid,
      issuerProfileId: user.id,
      claims,
      expirationDays,
      privateKey,
    });
    
    return NextResponse.json({ success: true, credential_id: credentialId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
