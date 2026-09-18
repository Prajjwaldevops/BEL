/**
 * API Route: Create Approval Request
 * POST /api/approvals/request
 */

import { NextRequest, NextResponse } from 'next/server';
import { requestApproval, ApprovalActionType } from '@/lib/multisig-service';
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
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can create approval requests' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { actionType, actionDescription, payload } = body;
    
    if (!actionType || !actionDescription || !payload) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'actionType, actionDescription, and payload are required' },
        { status: 400 }
      );
    }
    
    const result = await requestApproval({
      actionType: actionType as ApprovalActionType,
      actionDescription,
      payload,
      requestedBy: user.id,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to create approval request', message: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      approvalId: result.approvalId,
      requiredApprovals: result.requiredApprovals,
      message: 'Approval request created successfully',
    });
  } catch (error: any) {
    console.error('Error creating approval request:', error);
    return NextResponse.json(
      { error: 'Failed to create approval request', message: error.message },
      { status: 500 }
    );
  }
}
