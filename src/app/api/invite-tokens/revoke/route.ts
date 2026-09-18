import { NextRequest, NextResponse } from 'next/server'
import { revokeInviteToken } from '@/lib/invite-tokens'

/**
 * POST /api/invite-tokens/revoke
 * 
 * Revoke an invite token (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { tokenId, revokedBy } = body

    if (!tokenId || !revokedBy) {
      return NextResponse.json(
        { error: 'tokenId and revokedBy are required' },
        { status: 400 }
      )
    }

    // Revoke token
    const result = await revokeInviteToken(tokenId, revokedBy)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invite token revoked successfully',
    })
  } catch (error) {
    console.error('Error in revoke invite token route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
