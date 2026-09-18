/**
 * API Route: List Approval Requests
 * GET /api/approvals/list
 */

import { NextRequest, NextResponse } from 'next/server';
import { listApprovals, ApprovalActionType, ApprovalStatus } from '@/lib/multisig-service';
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
        { error: 'Forbidden', message: 'Only admins can view approval requests' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ApprovalStatus | undefined;
    const actionType = searchParams.get('actionType') as ApprovalActionType | undefined;
    const requestedBy = searchParams.get('requestedBy') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    
    const approvals = await listApprovals({
      status,
      actionType,
      requestedBy,
      limit,
    });
    
    return NextResponse.json({
      approvals,
      total: approvals.length,
    });
  } catch (error: any) {
    console.error('Error listing approvals:', error);
    return NextResponse.json(
      { error: 'Failed to list approvals', message: error.message },
      { status: 500 }
    );
  }
}
