/**
 * API Route: Execute Approved Action
 * POST /api/approvals/execute
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeApproval } from '@/lib/multisig-service';
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
        { error: 'Forbidden', message: 'Only admins can execute approved actions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { approvalId } = body;
    
    if (!approvalId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'approvalId is required' },
        { status: 400 }
      );
    }
    
    const result = await executeApproval(approvalId, user.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to execute approval', message: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      result: result.result,
      message: 'Approval executed successfully',
    });
  } catch (error: any) {
    console.error('Error executing approval:', error);
    return NextResponse.json(
      { error: 'Failed to execute approval', message: error.message },
      { status: 500 }
    );
  }
}
