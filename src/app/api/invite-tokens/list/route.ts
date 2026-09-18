import { NextRequest, NextResponse } from 'next/server'
import { listInviteTokens } from '@/lib/invite-tokens'

/**
 * GET /api/invite-tokens/list
 * 
 * List invite tokens (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const issuedBy = searchParams.get('issuedBy') || undefined
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // List tokens
    const result = await listInviteTokens({
      issuedBy,
      activeOnly,
      limit,
      offset,
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      tokens: result.tokens,
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in list invite tokens route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
