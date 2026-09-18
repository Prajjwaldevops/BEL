/**
 * API Route: List Incidents
 * GET /api/incidents/list
 */

import { NextRequest, NextResponse } from 'next/server';
import { listIncidents, IncidentStatus, IncidentSeverity } from '@/lib/incident-service';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can view incidents' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as IncidentStatus | undefined;
    const severity = searchParams.get('severity') as IncidentSeverity | undefined;
    const assignedTo = searchParams.get('assignedTo') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    
    const incidents = await listIncidents({
      status,
      severity,
      assignedTo,
      limit,
    });
    
    return NextResponse.json({
      incidents,
      total: incidents.length,
    });
  } catch (error: any) {
    console.error('Error listing incidents:', error);
    return NextResponse.json(
      { error: 'Failed to list incidents', message: error.message },
      { status: 500 }
    );
  }
}
