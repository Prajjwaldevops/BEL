import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredTokens } from '@/lib/invite-tokens'

/**
 * GET /api/cron/cleanup-expired-tokens
 * 
 * Cron job to deactivate expired invite tokens
 * 
 * Configure in Vercel:
 * - Add to vercel.json:
 *   {
 *     "crons": [{
 *       "path": "/api/cron/cleanup-expired-tokens",
 *       "schedule": "0 0 * * *"
 *     }]
 *   }
 * 
 * Or use Supabase Edge Function cron
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (Vercel sets this)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await cleanupExpiredTokens()

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deactivatedCount: result.deactivatedCount,
      message: `Deactivated ${result.deactivatedCount} expired tokens`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in cleanup expired tokens cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
