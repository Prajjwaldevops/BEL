/**
 * API Route: Get/Update Incident
 * GET/PATCH /api/incidents/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getIncidentById,
  getIncidentTimeline,
  getIncidentResponses,
  getIncidentNotes,
  updateIncidentStatus,
  assignIncident,
  IncidentStatus,
} from '@/lib/incident-service';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const incidentId = params.id;
    
    const incident = await getIncidentById(incidentId);
    
    if (!incident) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Incident not found' },
        { status: 404 }
      );
    }
    
    const timeline = await getIncidentTimeline(incidentId);
    const responses = await getIncidentResponses(incidentId);
    const notes = await getIncidentNotes(incidentId);
    
    return NextResponse.json({
      incident,
      timeline,
      responses,
      notes,
    });
  } catch (error: any) {
    console.error('Error fetching incident:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incident', message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { error: 'Forbidden', message: 'Only admins can update incidents' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { status, assignedTo, note } = body;
    
    const incidentId = params.id;
    
    // Update status if provided
    if (status) {
      const result = await updateIncidentStatus({
        incidentId,
        newStatus: status as IncidentStatus,
        updatedBy: user.id,
        note,
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to update status', message: result.error },
          { status: 400 }
        );
      }
    }
    
    // Assign incident if provided
    if (assignedTo) {
      const result = await assignIncident(incidentId, assignedTo);
      
      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to assign incident', message: result.error },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Incident updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating incident:', error);
    return NextResponse.json(
      { error: 'Failed to update incident', message: error.message },
      { status: 500 }
    );
  }
}
