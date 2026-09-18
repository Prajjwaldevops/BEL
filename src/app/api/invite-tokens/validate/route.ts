import { NextRequest, NextResponse } from 'next/server'
import { validateInviteToken } from '@/lib/invite-tokens'

/**
 * POST /api/invite-tokens/validate
 * 
 * Validate an invite token before registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { token, email } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Validate token
    const result = await validateInviteToken(token, email)

    if (!result.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: result.error,
          reason: result.reason,
        },
        { status: 400 }
      )
    }

    // Return token details (without exposing sensitive info)
    return NextResponse.json({
      valid: true,
      token: {
        id: result.token?.id,
        intended_email: result.token?.intended_email,
        intended_department: result.token?.intended_department,
        expires_at: result.token?.expires_at,
        role_id: result.token?.role_id,
      },
    })
  } catch (error) {
    console.error('Error in validate invite token route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
