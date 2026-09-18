import { NextRequest, NextResponse } from 'next/server'
import { createInviteToken } from '@/lib/invite-tokens'

/**
 * POST /api/invite-tokens/create
 * 
 * Create a new invite token (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      issuedBy,
      roleId,
      intendedEmail,
      intendedDepartment,
      expiresInHours,
      metadata,
    } = body

    // Validation
    if (!issuedBy) {
      return NextResponse.json(
        { error: 'issuedBy is required' },
        { status: 400 }
      )
    }

    // Create token
    const result = await createInviteToken({
      issuedBy,
      roleId,
      intendedEmail,
      intendedDepartment,
      expiresInHours: expiresInHours || 168, // Default 7 days
      metadata,
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      message: 'Invite token created successfully',
    })
  } catch (error) {
    console.error('Error in create invite token route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
