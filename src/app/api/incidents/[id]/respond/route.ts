/**
 * API Route: Execute Response Action
 * POST /api/incidents/[id]/respond
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeResponseAction, ResponseActionType } from '@/lib/incident-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(
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
        { error: 'Forbidden', message: 'Only admins can execute response actions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { actionType, targetEntityType, targetEntityId } = body;
    
    if (!actionType) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'actionType is required' },
        { status: 400 }
      );
    }
    
    const incidentId = params.id;
    
    const result = await executeResponseAction({
      incidentId,
      actionType: actionType as ResponseActionType,
      targetEntityType,
      targetEntityId,
      executedBy: user.id,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to execute action', message: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      responseId: result.responseId,
      message: 'Response action executed successfully',
    });
  } catch (error: any) {
    console.error('Error executing response action:', error);
    return NextResponse.json(
      { error: 'Failed to execute action', message: error.message },
      { status: 500 }
    );
  }
}
