/**
 * API Route: Create Incident
 * POST /api/incidents/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { createIncident, IncidentSeverity } from '@/lib/incident-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { title, description, severity, category, affectedEntityType, affectedEntityId } = body;
    
    if (!title || !description || !severity) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'title, description, and severity are required' },
        { status: 400 }
      );
    }
    
    const result = await createIncident({
      title,
      description,
      severity: severity as IncidentSeverity,
      category,
      affectedEntityType,
      affectedEntityId,
      reporterId: user.id,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to create incident', message: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      incidentId: result.incidentId,
      message: 'Incident created successfully',
    });
  } catch (error: any) {
    console.error('Error creating incident:', error);
    return NextResponse.json(
      { error: 'Failed to create incident', message: error.message },
      { status: 500 }
    );
  }
}
