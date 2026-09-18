/**
 * API Route: Vote on Approval
 * POST /api/approvals/vote
 */

import { NextRequest, NextResponse } from 'next/server';
import { voteOnApproval, ApprovalVoteType } from '@/lib/multisig-service';
import { createClient } from '@/lib/supabase/server';
import { getClientIP, getUserAgent } from '@/lib/rate-limit';

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
        { error: 'Forbidden', message: 'Only admins can vote on approvals' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { approvalId, vote, reason, signature } = body;
    
    if (!approvalId || !vote) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'approvalId and vote are required' },
        { status: 400 }
      );
    }
    
    if (!['APPROVE', 'REJECT', 'ABSTAIN'].includes(vote)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'vote must be APPROVE, REJECT, or ABSTAIN' },
        { status: 400 }
      );
    }
    
    const ipAddress = await getClientIP();
    
    const result = await voteOnApproval({
      approvalId,
      approverId: user.id,
      vote: vote as ApprovalVoteType,
      reason,
      signature,
      ipAddress,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to cast vote', message: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      approvalCount: result.newApprovalCount,
      rejectionCount: result.newRejectionCount,
      status: result.status,
      autoExecuted: result.autoExecuted,
      message: `Vote cast successfully: ${vote}`,
    });
  } catch (error: any) {
    console.error('Error voting on approval:', error);
    return NextResponse.json(
      { error: 'Failed to cast vote', message: error.message },
      { status: 500 }
    );
  }
}
