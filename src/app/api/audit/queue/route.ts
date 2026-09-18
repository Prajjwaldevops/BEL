import { NextRequest, NextResponse } from 'next/server'
import { queueAuditEvent } from '@/lib/audit-batching'

/**
 * POST /api/audit/queue
 * 
 * Queue an audit event for batched anchoring
 * Replaces direct on-chain logging for gas efficiency
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      actor_id,
      actor_role,
      action,
      resource_id,
      resource_type,
      result,
      details,
      metadata,
    } = body

    // Validation
    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      )
    }

    // Get IP and user agent from request
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') ||
                      'unknown'
    const user_agent = request.headers.get('user-agent') || undefined

    // Queue event
    const result_data = await queueAuditEvent({
      actor_id,
      actor_role,
      action,
      resource_id,
      resource_type,
      result: result || 'SUCCESS',
      details,
      metadata,
      ip_address,
      user_agent,
    })

    if (result_data.error) {
      return NextResponse.json(
        { error: result_data.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      event: result_data.event,
      message: 'Audit event queued successfully',
    })
  } catch (error) {
    console.error('Error in queue audit event route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
