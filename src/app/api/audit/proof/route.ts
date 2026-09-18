import { NextRequest, NextResponse } from 'next/server'
import { getEventProof } from '@/lib/audit-batching'
import { verifyMerkleProof } from '@/lib/merkle-tree'

/**
 * GET /api/audit/proof?eventId=xxx
 * 
 * Get Merkle proof for an audit event
 * Allows independent verification of event inclusion in anchored batch
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      )
    }

    // Get proof
    const result = await getEventProof(eventId)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      )
    }

    if (!result.proof) {
      return NextResponse.json(
        { error: 'Proof not found' },
        { status: 404 }
      )
    }

    // Verify proof locally
    const isValid = verifyMerkleProof(
      result.proof.event.event_hash,
      result.proof.proof_path,
      result.proof.merkle_root,
      result.proof.leaf_index
    )

    return NextResponse.json({
      success: true,
      proof: result.proof,
      verified: isValid,
      message: isValid ? 'Proof is valid' : 'Proof verification failed',
    })
  } catch (error) {
    console.error('Error in get event proof route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
