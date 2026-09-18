/**
 * API Route: Get Approval Details with Votes
 * GET /api/approvals/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApprovalById, getApprovalVotes, cancelApproval } from '@/lib/multisig-service';
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
    
    const approvalId = params.id;
    
    const approval = await getApprovalById(approvalId);
    
    if (!approval) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Approval not found' },
        { status: 404 }
      );
    }
    
    const votes = await getApprovalVotes(approvalId);
    
    return NextResponse.json({
      approval,
      votes,
    });
  } catch (error: any) {
    console.error('Error fetching approval details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { error: 'Forbidden', message: 'Only admins can cancel approvals' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { reason } = body;
    
    if (!reason) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'reason is required' },
        { status: 400 }
      );
    }
    
    const approvalId = params.id;
    
    const result = await cancelApproval(approvalId, user.id, reason);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to cancel approval', message: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Approval canceled successfully',
    });
  } catch (error: any) {
    console.error('Error canceling approval:', error);
    return NextResponse.json(
      { error: 'Failed to cancel approval', message: error.message },
      { status: 500 }
    );
  }
}
