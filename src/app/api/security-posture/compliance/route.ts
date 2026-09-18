import { NextRequest, NextResponse } from 'next/server';
import { getComplianceRequirements, updateComplianceStatus, getComplianceScore } from '@/lib/security-posture-service';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const { searchParams } = new URL(request.url);
    const framework = searchParams.get('framework') || undefined;
    const status = searchParams.get('status') || undefined;
    const score = searchParams.get('score') === 'true';
    
    if (score && framework) {
      const complianceScore = await getComplianceScore(framework);
      return NextResponse.json({ success: true, score: complianceScore });
    }
    
    const requirements = await getComplianceRequirements({ framework, status });
    return NextResponse.json({ success: true, requirements, count: requirements.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { requirementId, status, evidence } = await request.json();
    await updateComplianceStatus(requirementId, status, evidence, user.id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
